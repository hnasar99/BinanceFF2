# ClawPump integration

BinanceFF2 integrates ClawPump as an execution-provider boundary rather than vendoring the whole Hermes/ClawPump runtime into the web app.

## Why

BinanceFF2 is a Next/Vinext TypeScript application with a clear planner / policy / execution split. ClawPump's claw-agent is a Python-heavy Hermes runtime with its own tool loop, skills, MCP configuration and lifecycle. Copying that runtime into the frontend would couple two applications unnecessarily.

## Current vertical slice

- `lib/clawpump.ts` defines the provider boundary.
- `GET /api/clawpump` reports provider status.
- `POST /api/clawpump { action: "swap_quote", ... }` can request a read-only swap quote through a configured ClawPump MCP bridge.
- Any action that looks fund-moving is denied in this cut.
- No private keys or wallet secrets are stored in BinanceFF2.

## Required environment

```bash
CLAWPUMP_MCP_URL=https://<your-clawpump-mcp-bridge>
CLAWPUMP_API_KEY=<optional bridge credential>
```

The bridge must expose ClawPump MCP tool calls server-side. The official claw-agent skill documents `swap_quote` as the quote step before `swap_execute`.

## Execution progression

1. READ: status, balances, market signals, swap quotes.
2. SIMULATE: feed quotes into BinanceFF VECTOR/AEGIS risk calculations.
3. PROPOSE: surface a proposed transaction plus exact cost/slippage.
4. APPROVE: require explicit user approval and a BinanceFF economic mandate.
5. EXECUTE: only then enable the exact ClawPump fund-moving tool.
6. VERIFY: persist transaction signature and reconcile expected vs executed result.

Production execution remains deliberately disabled until wallet ownership, spend limits, idempotency and audit persistence are wired.
