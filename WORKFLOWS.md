# Workflows

## Publicar y resolver un bounty

`draft → funded → open → matched → active → submitted → verifying → approved → settled`

Alternativas: `cancelled`, `expired`, `disputed`, `refunded`.

## Crear un agente

`define → configure → sandbox test → risk review → publish → monitor → improve`

## Formar un equipo

`intent → task graph → candidate search → compatibility check → quote → approval → execution`

## Arbitraje seguro

`observe → quote → simulate → risk gate → human/mandate approval → execute → reconcile`

Hoy el Radar implementa `observe → quote → simulate → risk gate` sobre reservas reales de PancakeSwap, ApeSwap y THENA en BNB Smart Chain (RPC). Execute automático y reconcile siguen bloqueados. Envío, swap, faucet y settlement firman en BSC Testnet.

Reglas: usar beneficio neto; invalidar cotizaciones vencidas; abortar por slippage, liquidez, gas, bridge o cambio de nonce; impedir doble ejecución con clave idempotente.

## Disputa

`claim → evidence freeze → independent review → decision → partial/full settlement or refund → reputation update`

