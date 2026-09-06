# NEXUS Shadow Engine v1

Low-latency EVM telemetry and shadow-decision runtime for BinanceFF2.

## Safety boundary

v1 is **SHADOW_NO_BROADCAST only**:

- it does not load a wallet or private key;
- it does not sign transactions;
- it does not broadcast transactions;
- it can subscribe to real chain WebSocket feeds;
- it can evaluate opportunity candidates and record whether NEXUS *would* execute them.

This makes the first experiment measurable without putting capital at risk.

## What is real in v1

- WebSocket connection to configured EVM chains using Alloy.
- Live new-block subscriptions.
- Reconnection loop per chain sentinel.
- Normalized event stream over Server-Sent Events (`/events`).
- Runtime metrics (`/metrics`).
- Deterministic shadow risk gate (`/shadow/candidates`).
- Hypothetical net P&L accumulation for approved shadow candidates.

`blockAgeMs` is intentionally named as an approximate freshness indicator. EVM block timestamps are second-resolution chain timestamps, so it must not be interpreted as precise wire/network latency.

## What is NOT claimed yet

v1 does not yet discover DEX routes on its own. The next vertical slice is the DEX adapter / quoter layer that produces candidates from live pools. Until that exists, `/shadow/candidates` is an explicit ingestion boundary for adapters and test fixtures; do not present submitted fixtures as discovered live profit.

## Run locally

Requirements:

- Rust stable (`rustup` recommended)
- WebSocket RPC endpoints for the chains you want to observe

```bash
cd nexus-engine
cp .env.example .env
# Edit NEXUS_CHAINS with your own WS endpoints.
cargo run --release
```

The service listens on `127.0.0.1:8788` by default.

### Health

```bash
curl http://127.0.0.1:8788/health
```

### Live event stream

```bash
curl -N http://127.0.0.1:8788/events
```

With valid BNB/Base WebSocket endpoints you should see events such as:

```text
event: chain.connected
event: chain.block.observed
```

### Metrics

```bash
curl http://127.0.0.1:8788/metrics
```

### Submit a shadow candidate

This endpoint is for the upcoming DEX/quoter adapter and for explicit tests. It never broadcasts a transaction.

```bash
curl -X POST http://127.0.0.1:8788/shadow/candidates \
  -H 'content-type: application/json' \
  -d '{
    "chain":"base",
    "route":"USDC > WETH > USDC",
    "expectedGrossProfitUsd":42.50,
    "dexFeesUsd":5.00,
    "slippageUsd":3.25,
    "gasUsd":0.80,
    "flashFeeUsd":2.10,
    "mevBufferUsd":4.00,
    "confidence":0.93
  }'
```

With the default $10 minimum-profit policy, this example has an expected net of $27.35 and returns `approved: true` in shadow mode.

## Tests

```bash
cargo test
```

The initial tests verify that profitable candidates pass and low-profit / low-confidence candidates are rejected.

## Next slices

1. BNB PancakeSwap and Base Aerodrome/Uniswap pool adapters.
2. Pool-state cache and pair normalization.
3. Cross-DEX and triangular route graph.
4. Trade-size optimizer.
5. Local/fork transaction simulation.
6. Compare `wouldExecute` against next-block realized state.
7. Feed real events into NEXUS OPS WebGL.
8. Only after measured capture rate: add a separately gated flash-liquidity executor.

The execution contract and live signer must remain outside the v1 process until the shadow metrics justify enabling them.
