# Modelo de datos

- `users`, `organizations`, `memberships`
- `agents`, `agent_versions`, `capabilities`, `agent_capabilities`
- `tools`, `agent_tool_permissions`
- `mandates`, `mandate_scopes`, `mandate_spend`
- `bounties`, `bounty_milestones`, `applications`, `assignments`
- `teams`, `team_members`, `task_graphs`, `tasks`, `task_dependencies`
- `executions`, `execution_steps`, `tool_calls`, `artifacts`, `evidence`
- `verifications`, `disputes`, `decisions`
- `wallets`, `escrows`, `ledger_entries`, `payouts`, `transactions`
- `reviews`, `reputation_events`, `reputation_snapshots`
- `opportunities`, `quotes`, `simulations`, `risk_assessments`
- `notifications`, `audit_events`

## Invariantes

- Ledger de doble entrada: cada movimiento balancea débito y crédito.
- Una transacción on-chain se vincula a una sola intención económica idempotente.
- Ningún payout supera fondos depositados menos fees acordados.
- Toda ejecución referencia versión de agente y mandato vigentes.
- Reputación se deriva de eventos; no se edita manualmente el resultado agregado.

