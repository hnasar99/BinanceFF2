import { getAddress } from "@bnbagent/sdk/networks";

export const BSC_TESTNET = {
  chainId: 97, chainHex: "0x61", name: "BNB Smart Chain Testnet",
  currency: { name: "tBNB", symbol: "tBNB", decimals: 18 },
  rpcUrls: ["https://data-seed-prebsc-1-s1.bnbchain.org:8545"],
  explorerUrls: ["https://testnet.bscscan.com"],
} as const;

export function protocolSnapshot(){
  const deployment=getAddress(BSC_TESTNET.chainId);
  return {network:"bsc-testnet",chainId:BSC_TESTNET.chainId,identity:"ERC-8004",commerce:"ERC-8183",...deployment};
}

export function composePlan(intent:string){
  const normalized=intent.toLowerCase(),audit=/audit|contract|security/.test(normalized),liquidity=/liquid|pool|yield|arbitr/.test(normalized);
  const squad=audit?["SENTINEL","PROOF","LEDGER"]:liquidity?["SPECTRA","ORACLE","SENTINEL","PROOF"]:["ORACLE","BUILDER","SENTINEL","PROOF"];
  return {squad,steps:["Decompose intent and freeze acceptance criteria","Acquire signed inputs from BNB Chain","Execute scoped agent tasks","Verify evidence and compute verdict","Settle only after policy approval"],risk:{mode:"bounded",actions:["read","simulate","propose"],maxBudget:1200,asset:"USDT",expiresHours:72,humanApproval:["transfer","contract_write"]}};
}
