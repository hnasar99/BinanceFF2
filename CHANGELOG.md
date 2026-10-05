# Changelog

## 2026-10-04

Added OpenHuman agent operations map, stable mission/agent selection and authenticated runtime relay. Demo dialogue is isolated from runtime activity; follow-speaker camera jumps removed. Included a pinned GPL Rust bridge spike with six actual agent instances, tenant memory bindings and durable journal. Web contract/projection tests pass; Rust compilation and real provider smoke test remain pending. Analysis-only, empty tool scope, no wallet or financial execution.


## 2026-09-08

La experiencia gamificada (`/spatial-next`) es una cabina de comandante con escenario de squad (List/Cards/Single), foto + avatar 3D con headset, y un dock de bounties/squads. Execute automático sigue bloqueado.

Las acciones de cadena dejan de ser mock. El Radar lee reservas V2/Solidly por RPC en BSC mainnet (PancakeSwap, ApeSwap, THENA). Wallet y Review & Settle firman transacciones reales en BSC Testnet. Biswap se omitió porque su factory ya no resuelve pares. Execute automático sigue bloqueado.

## 2026-09-05

Opportunity Radar cierra el corte simulado de arbitraje: tres venues mock de BNB Smart Chain, quotes con TTL, beneficio neto (fees + gas + slippage) y un risk gate APPROVE/KILL. El schema de `opportunities`, `quotes`, `simulations` y `risk_assessments` ya lleva `chain` para sumar otro adapter. Execute sigue bloqueado.
