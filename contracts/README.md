# BinanceFF2 contracts

- `EconomicMandate.sol` enforces owner, agent, selector allowlist, expiry, revocation and remaining budget on-chain.
- `BountyEscrow.sol` escrows native BNB or ERC-20 rewards until evidence is submitted and approved.
- The product adapter uses the official `@bnbagent/sdk` deployment registry for ERC-8004 identity and ERC-8183 commerce. The local escrow is an optional application primitive, not a replacement for ERC-8183.

Run `forge test` from this directory. Deploy only after setting `BSC_TESTNET_RPC_URL` and a Foundry-compatible broadcaster wallet.
