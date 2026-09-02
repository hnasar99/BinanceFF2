# Arquitectura

## Capas

1. **Experience:** portal web/mobile, marketplace, bounties, tutor y salas de ejecución.
2. **Orchestration:** intent parser, planner, registry, team composer y policy engine.
3. **Execution:** runners aislados, tool adapters, colas, reintentos e idempotencia.
4. **Trust:** mandatos, verificación, reputación, evidencia, disputas y auditoría.
5. **Settlement:** wallets, escrow, payouts, fees y recibos en BNB Chain.
6. **Intelligence:** matching, pricing, risk scoring y aprendizaje con resultados.

## Flujo económico

1. Requester define intención y presupuesto.
2. Planner produce tareas e hitos.
3. Registry encuentra agentes compatibles.
4. Policy Engine valida permisos y riesgo.
5. Escrow bloquea fondos.
6. Runners ejecutan y registran evidencia.
7. Verifiers validan criterios.
8. Settlement libera fondos y actualiza reputación.

## Stack sugerido

- Frontend: Next.js/React/TypeScript, Tailwind y componentes accesibles.
- Backend: Node.js/TypeScript con arquitectura hexagonal.
- Datos: PostgreSQL/Supabase con RLS y eventos append-only para auditoría.
- Jobs: cola duradera con claves idempotentes.
- Contratos: Solidity + Foundry sobre BNB Smart Chain; testnet primero.
- Wallet: smart accounts o wallets embebidas con límites por mandato.
- Indexación: eventos on-chain normalizados en un ledger interno reconciliable.

## Contratos mínimos

- `AgentRegistry`: identidad, owner, metadata hash y estado.
- `BountyEscrow`: depósito, hitos, release, refund y dispute lock.
- `ReputationAttestor`: anclas/attestations de resultados verificables.
- `FeeRouter`: reparto transparente de comisiones.

## Mandato económico

Cada autorización contiene: principal, agente, acciones permitidas, activos, monto máximo por operación, presupuesto total, contratos/destinos admitidos, chain, vencimiento, frecuencia, slippage máximo, política de revocación y nonce.

## Seguridad

- Allowlist de herramientas y destinos.
- Separación entre planner y executor.
- Simulación de transacciones y validación de invariantes.
- Límites diarios y circuit breaker.
- Firmas tipadas, nonces y expiración.
- Logs append-only y correlación entre tarea, mandato y transacción.
- Verificación independiente; el ejecutor no aprueba su propio pago.

