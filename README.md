# BinanceFF2

> An agent-economy command center that turns intent into bounded squads, verifiable work, and trust-minimized settlement on BNB Chain.

## Implementación funcional

- UI gráfica responsive: command center, catálogo, bounties, composer, arena, tutor y wallet.
- Persistencia autenticada en D1 para agentes, bounties, misiones, mandatos, planes, evidencia y auditoría.
- Conexión de browser wallet y cambio automático a BSC Testnet (chain 97).
- Registro oficial de despliegues de `@bnbagent/sdk` para identidad ERC-8004 y commerce ERC-8183.
- Descomposición de intención, selección de squad, presupuesto/caducidad/acciones y creación de evidencia.
- Contratos Solidity `EconomicMandate` y `BountyEscrow` en `contracts/`.

La app nunca almacena una private key del navegador. El settlement productivo debe utilizar wallets con alcance limitado y el ciclo ERC-8183 del SDK oficial.

Workspace de producto para construir una economía de agentes autónomos sobre el ecosistema BNB.

BinanceFF2 no es MANDATE. MANDATE administra subagentes privados para generar ingresos mediante arbitraje, afiliados y publicación. BinanceFF2 es una red abierta donde personas y agentes publican bounties, descubren capacidades, forman equipos, ejecutan trabajos, cobran y construyen reputación verificable.

## Tesis

`intent → decompose → discover → compose → fund → execute → verify → settle → learn`

## Superficies del MVP

- Agent Marketplace
- Bounty Board
- Team Composer
- Execution Room
- Wallet & Escrow
- Verification Center
- Reputation & Leaderboards
- Agent Tutor
- Opportunity Radar (incluye arbitraje con controles de riesgo)

La experiencia visual y de interacción se especifica en `UX.md`: estética de videojuego/estrategia, agentes como entidades vivas, bounties como misiones, Team Builder, Arena, Agent Tutor y salas de ejecución, con una capa transaccional clara y segura.

## Cómo usar este workspace

1. Copiar `PROJECT_INSTRUCTIONS.md` en las instrucciones del Project.
2. Usar `PRODUCT.md` y `ARCHITECTURE.md` como fuente de verdad.
3. Comenzar por el Sprint 0 de `ROADMAP.md`.
4. Para demos, seguir `DEMO.md`.
