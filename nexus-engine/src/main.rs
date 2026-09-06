use std::{collections::HashMap, env, net::SocketAddr, sync::Arc};

use alloy::providers::{Provider, ProviderBuilder, WsConnect};
use anyhow::{Context, Result};
use axum::{
    extract::State,
    http::StatusCode,
    response::{sse::Event as SseEvent, IntoResponse, Sse},
    routing::{get, post},
    Json, Router,
};
use chrono::{DateTime, Utc};
use futures_util::{Stream, StreamExt};
use serde::{Deserialize, Serialize};
use tokio::sync::{broadcast, RwLock};
use tokio_stream::wrappers::BroadcastStream;
use tower_http::cors::CorsLayer;
use tracing::{error, info, warn};
use tracing_subscriber::EnvFilter;
use uuid::Uuid;

#[derive(Clone)]
struct AppState {
    events: broadcast::Sender<NexusEvent>,
    metrics: Arc<RwLock<Metrics>>,
    policy: ShadowPolicy,
}

#[derive(Clone, Debug)]
struct ChainConfig {
    name: String,
    ws_url: String,
}

#[derive(Clone, Debug)]
struct ShadowPolicy {
    min_net_profit_usd: f64,
    min_confidence: f64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct NexusEvent {
    id: Uuid,
    ts: DateTime<Utc>,
    kind: String,
    mode: String,
    chain: Option<String>,
    payload: serde_json::Value,
}

#[derive(Debug, Default, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct Metrics {
    started_at: Option<DateTime<Utc>>,
    chains_configured: usize,
    chains_connected: usize,
    blocks_observed: u64,
    candidates_received: u64,
    candidates_approved: u64,
    candidates_rejected: u64,
    hypothetical_net_profit_usd: f64,
    last_block_by_chain: HashMap<String, u64>,
    last_block_age_ms_by_chain: HashMap<String, i64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ShadowCandidateInput {
    chain: String,
    route: String,
    expected_gross_profit_usd: f64,
    dex_fees_usd: f64,
    slippage_usd: f64,
    gas_usd: f64,
    flash_fee_usd: f64,
    mev_buffer_usd: f64,
    confidence: f64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ShadowDecision {
    approved: bool,
    reason: String,
    chain: String,
    route: String,
    expected_net_profit_usd: f64,
    confidence: f64,
    mode: &'static str,
}

fn decide(candidate: &ShadowCandidateInput, policy: &ShadowPolicy) -> ShadowDecision {
    let expected_net_profit_usd = candidate.expected_gross_profit_usd
        - candidate.dex_fees_usd
        - candidate.slippage_usd
        - candidate.gas_usd
        - candidate.flash_fee_usd
        - candidate.mev_buffer_usd;

    let (approved, reason) = if candidate.confidence < policy.min_confidence {
        (
            false,
            format!(
                "confidence {:.3} below minimum {:.3}",
                candidate.confidence, policy.min_confidence
            ),
        )
    } else if expected_net_profit_usd < policy.min_net_profit_usd {
        (
            false,
            format!(
                "net profit ${:.2} below minimum ${:.2}",
                expected_net_profit_usd, policy.min_net_profit_usd
            ),
        )
    } else {
        (true, "shadow policy passed".to_string())
    };

    ShadowDecision {
        approved,
        reason,
        chain: candidate.chain.clone(),
        route: candidate.route.clone(),
        expected_net_profit_usd,
        confidence: candidate.confidence,
        mode: "SHADOW_NO_BROADCAST",
    }
}

fn parse_chain_configs() -> Vec<ChainConfig> {
    env::var("NEXUS_CHAINS")
        .unwrap_or_default()
        .split(';')
        .filter_map(|entry| {
            let entry = entry.trim();
            if entry.is_empty() {
                return None;
            }
            let (name, ws_url) = entry.split_once('=')?;
            Some(ChainConfig {
                name: name.trim().to_string(),
                ws_url: ws_url.trim().to_string(),
            })
        })
        .collect()
}

fn emit(state: &AppState, kind: &str, chain: Option<&str>, payload: serde_json::Value) {
    let _ = state.events.send(NexusEvent {
        id: Uuid::new_v4(),
        ts: Utc::now(),
        kind: kind.to_string(),
        mode: "SHADOW_NO_BROADCAST".to_string(),
        chain: chain.map(str::to_string),
        payload,
    });
}

async fn run_chain_sentinel(config: ChainConfig, state: AppState) {
    loop {
        emit(
            &state,
            "chain.connecting",
            Some(&config.name),
            serde_json::json!({"transport":"websocket"}),
        );

        let result = async {
            let provider = ProviderBuilder::new()
                .connect_ws(WsConnect::new(config.ws_url.clone()))
                .await
                .context("websocket provider connection failed")?;
            let subscription = provider
                .subscribe_blocks()
                .await
                .context("block subscription failed")?;
            let mut stream = subscription.into_stream();

            {
                let mut metrics = state.metrics.write().await;
                metrics.chains_connected += 1;
            }
            emit(
                &state,
                "chain.connected",
                Some(&config.name),
                serde_json::json!({"transport":"websocket"}),
            );
            info!(chain = %config.name, "sentinel connected");

            while let Some(header) = stream.next().await {
                let now = Utc::now();
                let block_number = header.number;
                let block_age_ms = now
                    .timestamp_millis()
                    .saturating_sub((header.timestamp as i64).saturating_mul(1000))
                    .max(0);
                {
                    let mut metrics = state.metrics.write().await;
                    metrics.blocks_observed += 1;
                    metrics
                        .last_block_by_chain
                        .insert(config.name.clone(), block_number);
                    metrics
                        .last_block_age_ms_by_chain
                        .insert(config.name.clone(), block_age_ms);
                }
                emit(
                    &state,
                    "chain.block.observed",
                    Some(&config.name),
                    serde_json::json!({
                        "blockNumber": block_number,
                        "blockTimestamp": header.timestamp,
                        "observedAt": now,
                        "blockAgeMs": block_age_ms,
                        "note": "coarse wall-clock freshness indicator, not wire latency"
                    }),
                );
            }
            anyhow::Ok(())
        }
        .await;

        {
            let mut metrics = state.metrics.write().await;
            metrics.chains_connected = metrics.chains_connected.saturating_sub(1);
        }
        match result {
            Ok(()) => warn!(chain = %config.name, "sentinel stream ended; reconnecting"),
            Err(err) => {
                error!(chain = %config.name, error = %err, "sentinel error; reconnecting");
                emit(
                    &state,
                    "chain.error",
                    Some(&config.name),
                    serde_json::json!({"error":err.to_string(),"retryInMs":2000}),
                );
            }
        }
        tokio::time::sleep(std::time::Duration::from_secs(2)).await;
    }
}

async fn health(State(state): State<AppState>) -> impl IntoResponse {
    Json(serde_json::json!({
        "status":"ok",
        "service":"nexus-engine",
        "mode":"SHADOW_NO_BROADCAST",
        "policy":{
            "minNetProfitUsd":state.policy.min_net_profit_usd,
            "minConfidence":state.policy.min_confidence
        },
        "metrics":state.metrics.read().await.clone()
    }))
}

async fn metrics_handler(State(state): State<AppState>) -> impl IntoResponse {
    Json(state.metrics.read().await.clone())
}

async fn submit_shadow_candidate(
    State(state): State<AppState>,
    Json(candidate): Json<ShadowCandidateInput>,
) -> impl IntoResponse {
    if !candidate.confidence.is_finite()
        || candidate.confidence < 0.0
        || candidate.confidence > 1.0
        || !candidate.expected_gross_profit_usd.is_finite()
    {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error":"invalid candidate"})),
        )
            .into_response();
    }

    let decision = decide(&candidate, &state.policy);
    {
        let mut metrics = state.metrics.write().await;
        metrics.candidates_received += 1;
        if decision.approved {
            metrics.candidates_approved += 1;
            metrics.hypothetical_net_profit_usd += decision.expected_net_profit_usd;
        } else {
            metrics.candidates_rejected += 1;
        }
    }

    emit(
        &state,
        "market.opportunity.detected",
        Some(&candidate.chain),
        serde_json::json!({
            "route":candidate.route,
            "grossProfitUsd":candidate.expected_gross_profit_usd,
            "confidence":candidate.confidence
        }),
    );
    emit(
        &state,
        if decision.approved {
            "shadow.execution.would_execute"
        } else {
            "shadow.execution.rejected"
        },
        Some(&decision.chain),
        serde_json::to_value(&decision).unwrap_or_else(|_| serde_json::json!({})),
    );

    (
        StatusCode::OK,
        Json(serde_json::to_value(decision).unwrap()),
    )
        .into_response()
}

async fn events(
    State(state): State<AppState>,
) -> Sse<impl Stream<Item = Result<SseEvent, std::convert::Infallible>>> {
    let stream = BroadcastStream::new(state.events.subscribe()).filter_map(|message| async move {
        match message {
            Ok(event) => Some(Ok(SseEvent::default()
                .event(event.kind.clone())
                .json_data(event)
                .unwrap_or_else(|_| SseEvent::default().event("serialization.error")))),
            Err(_) => None,
        }
    });
    Sse::new(stream).keep_alive(axum::response::sse::KeepAlive::default())
}

#[tokio::main]
async fn main() -> Result<()> {
    dotenvy::dotenv().ok();
    tracing_subscriber::fmt()
        .with_env_filter(
            EnvFilter::try_from_default_env().unwrap_or_else(|_| "nexus_engine=info,info".into()),
        )
        .init();

    let chains = parse_chain_configs();
    let policy = ShadowPolicy {
        min_net_profit_usd: env::var("NEXUS_MIN_NET_PROFIT_USD")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(10.0),
        min_confidence: env::var("NEXUS_MIN_CONFIDENCE")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(0.80),
    };
    let (events_tx, _) = broadcast::channel(4096);
    let runtime_metrics = Arc::new(RwLock::new(Metrics {
        started_at: Some(Utc::now()),
        chains_configured: chains.len(),
        ..Metrics::default()
    }));
    let state = AppState {
        events: events_tx,
        metrics: runtime_metrics,
        policy,
    };

    emit(
        &state,
        "engine.started",
        None,
        serde_json::json!({
            "chains":chains.iter().map(|c| c.name.clone()).collect::<Vec<_>>(),
            "liveExecution":false,
            "broadcastEnabled":false
        }),
    );
    for chain in chains {
        tokio::spawn(run_chain_sentinel(chain, state.clone()));
    }

    let app = Router::new()
        .route("/health", get(health))
        .route("/metrics", get(metrics_handler))
        .route("/events", get(events))
        .route("/shadow/candidates", post(submit_shadow_candidate))
        .layer(CorsLayer::permissive())
        .with_state(state);

    let host = env::var("NEXUS_HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let port = env::var("NEXUS_PORT")
        .ok()
        .and_then(|v| v.parse::<u16>().ok())
        .unwrap_or(8788);
    let addr: SocketAddr = format!("{host}:{port}").parse()?;
    let listener = tokio::net::TcpListener::bind(addr).await?;
    info!(%addr, "NEXUS shadow engine online");
    axum::serve(listener, app).await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn candidate(gross: f64, confidence: f64) -> ShadowCandidateInput {
        ShadowCandidateInput {
            chain: "base".to_string(),
            route: "USDC>WETH>USDC".to_string(),
            expected_gross_profit_usd: gross,
            dex_fees_usd: 5.0,
            slippage_usd: 3.0,
            gas_usd: 1.0,
            flash_fee_usd: 2.0,
            mev_buffer_usd: 4.0,
            confidence,
        }
    }

    #[test]
    fn approves_profitable_candidate() {
        let policy = ShadowPolicy {
            min_net_profit_usd: 10.0,
            min_confidence: 0.8,
        };
        let decision = decide(&candidate(40.0, 0.95), &policy);
        assert!(decision.approved);
        assert!((decision.expected_net_profit_usd - 25.0).abs() < f64::EPSILON);
    }

    #[test]
    fn rejects_low_profit_candidate() {
        let policy = ShadowPolicy {
            min_net_profit_usd: 10.0,
            min_confidence: 0.8,
        };
        let decision = decide(&candidate(20.0, 0.95), &policy);
        assert!(!decision.approved);
        assert!((decision.expected_net_profit_usd - 5.0).abs() < f64::EPSILON);
    }

    #[test]
    fn rejects_low_confidence_candidate() {
        let policy = ShadowPolicy {
            min_net_profit_usd: 10.0,
            min_confidence: 0.8,
        };
        let decision = decide(&candidate(100.0, 0.4), &policy);
        assert!(!decision.approved);
        assert!(decision.reason.contains("confidence"));
    }
}
