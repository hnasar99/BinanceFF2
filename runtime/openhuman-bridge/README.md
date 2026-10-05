# OpenHuman bridge spike

One Rust process owns one OpenHuman Runtime. A mission creates six actual agent instances matching the existing avatar IDs: ORION/commander, KAI/scout, NOVA/strategist, AEGIS/guardian, LYRA/analyst, REX/executor. The host passes replies to the next agent explicitly: OpenHuman embedded agents cannot delegate to one another through its built-in delegation catalogue.

This first slice runs **analysis only**: named tool scope is empty; no wallet, signer, RPC, shell or MCP tools are exposed. Replies are model output, not verified VECTOR simulations or live market observations. No approval button can turn these replies into a trade. Existing BNB radar remains a separate source.

## Status and validation

The web projection and bridge contract have tests. This Rust spike has **not been compiled in the authoring environment**, which has no Cargo toolchain. Compile and run the commands below before connecting a public endpoint. The upstream revision is pinned to cbde5069dec828c117131ee75f9d2bbeb5bda02b; upstream APIs and vendored dependencies may require their documented source/submodule build setup. Do not call this production-ready.

## Configure and run

Requires upstream's Rust toolchain (currently Rust 1.96.1), native build prerequisites and an OpenAI-compatible model endpoint. Run with environment variables set in the shell or a protected service configuration; Cargo does not load .env automatically.

- `BINANCEFF_RUNTIME_DIR`: absolute, private writable state directory. Protect with mode 0700.
- `AGENT_RUNTIME_TOKEN`: random shared bearer of at least 32 characters.
- `AGENT_RUNTIME_USER_ID`: the single allowed signed-in ChatGPT user ID.
- `AGENT_MODEL_URL`: OpenAI-compatible base URL; Ollama, LM Studio, NVIDIA NIM or BYOK supported by the core.
- `AGENT_MODEL_KEY`: provider secret; a placeholder only if the local provider genuinely needs no key.
- `AGENT_MODEL`: model identifier.
- `AGENT_RUNTIME_BIND`: defaults to 127.0.0.1:8789. Place behind an authenticated HTTPS reverse proxy to reach it from the hosted Site. Keep the bearer secret.

```bash
cargo check
cargo run --release
```

In Sites server secrets configure `AGENT_RUNTIME_URL` (HTTPS origin) and the same `AGENT_RUNTIME_TOKEN`. Never put provider keys or runtime tokens in frontend code.

`GET /health` requires the bearer. `POST /missions` additionally requires `x-runtime-user` matching the allowlisted user, and JSON `{title, brief, locale}`. It returns immediately with a mission snapshot. `GET /missions/{uuid}` reads that user's snapshot; `GET /missions/latest` restores the latest mission. All responses set execute=false.

A single concurrent mission bounds model spend and avoids runtime agent/session conflicts. At most 64 missions are retained; archive old state offline before increasing this limit. Journal snapshots are atomically saved in missions.json. Interrupted turns become ERROR on restart; they are not silently rerun. OpenHuman stores its transcripts in its own workspace. MemoryBinding namespaces agents by tenant; semantic recall/learnings are off unless a supported memory engine is explicitly configured. This slice does not configure one.

## License boundary

This experimental Rust bridge links GPL OpenHuman and is marked GPL-3.0-only. It runs as a separate service and the Site uses its JSON protocol. This layout does not establish a legal exemption for the overall product; review licensing before distributing a proprietary bundle. No upstream source is copied into the Site's JavaScript.

## Next integration

After compilation and a real provider smoke test: add allowlisted radar/ClawPump read-only tools, attach verified VECTOR/AEGIS results, and validate per-instance progress callbacks. Current THINKING means a real turn is in flight; it does not reveal hidden reasoning or claim a specific tool call. Add financial execution only as a separate, explicitly authorized capability.
