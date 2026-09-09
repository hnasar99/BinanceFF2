"use client";

import { useEffect, useState } from "react";
import {
  compactAddress,
  connectWallet,
  formatEther,
  getNativeBalance,
} from "@/lib/wallet-client";

type AppState={agents:Array<{id:number}>;bounties:Array<{id:number}>;missions:Array<{id:number}>;mandates:Array<{id:number;revokedAt:string|null}>};
export function RuntimeBridge(){
  const[state,setState]=useState<AppState|null>(null),[notice,setNotice]=useState(""),[error,setError]=useState(false),[wallet,setWallet]=useState(""),[balance,setBalance]=useState("");
  const refresh=async()=>{const response=await fetch("/api/state",{cache:"no-store"});if(!response.ok)throw new Error("Persistent service unavailable");setState(await response.json())};
  const post=async(payload:Record<string,unknown>)=>{const response=await fetch("/api/state",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});const data=await response.json() as {error?:string}&Record<string,unknown>;if(!response.ok)throw new Error(data.error||"Action failed");await refresh();return data};
  const show=(message:string,isError=false)=>{setError(isError);setNotice(message);setTimeout(()=>setNotice(""),4600)};
  const loadBalance=async(address:string)=>{try{setBalance(`${formatEther(await getNativeBalance(address))} tBNB`)}catch{setBalance("BSC TESTNET · CHAIN 97")}};
  const connect=async()=>{const {address}=await connectWallet();setWallet(address);await loadBalance(address);show(`Wallet ${compactAddress(address)} connected to BSC Testnet`)};
  useEffect(()=>{queueMicrotask(()=>{refresh().catch(()=>undefined);window.ethereum?.request({method:"eth_accounts"}).then(async(value)=>{const address=(value as string[])[0]||"";setWallet(address);if(address)await loadBalance(address)}).catch(()=>undefined)})},[]);
  useEffect(()=>{const handler=async(event:MouseEvent)=>{const button=(event.target as HTMLElement).closest("button");if(!button)return;const label=(button.textContent||"").trim().toUpperCase();if(button.classList.contains("wallet-pill")){event.preventDefault();try{await connect()}catch(reason){show(reason instanceof Error?reason.message:"Wallet connection failed",true)}return}let payload:Record<string,unknown>|null=null,success="";
    if(label.includes("FUND & PUBLISH")){const dialog=button.closest("[role=dialog]"),textarea=dialog?.querySelector("textarea") as HTMLTextAreaElement|null,inputs=dialog?.querySelectorAll("input");payload={action:"create_bounty",title:textarea?.value||"BNB liquidity intelligence bounty",rewardAmount:Number(inputs?.[0]?.value.replace(/,/g,"")||2500),rewardAsset:"USDT",acceptanceCriteria:inputs?.[1]?.value||"Verified evidence and reproducible calculation",skills:["DeFi","Risk","Evidence"]};success="Bounty persisted and audit event recorded"}
    else if(label.includes("PUBLISH AGENT")){payload={action:"create_agent",name:"SPECTRA",role:"Liquidity Intelligence Agent",skills:["Market data","Simulation","BNB RPC","Evidence"],color:"cyan"};success="Agent published to the persistent registry"}
    else if(label.includes("DEPLOY SQUAD")){payload={action:"deploy_mission",name:"Liquidity intelligence squad",intent:"Scan BNB liquidity, simulate routes and produce verifiable evidence"};success="Mission composed with ERC-8183 settlement and a 72-hour mandate"}
    else if(label.includes("REVOKE AUTHORITY")){const current=state||await (await fetch("/api/state",{cache:"no-store"})).json() as AppState;const mandate=current?.mandates?.find((item:{revokedAt:string|null})=>!item.revokedAt);if(mandate){payload={action:"revoke_mandate",id:mandate.id};success="Economic authority revoked and audited"}}
    if(!payload)return;try{await post(payload);show(success)}catch(reason){show(reason instanceof Error?reason.message:"Action failed",true)}};document.addEventListener("click",handler);return()=>document.removeEventListener("click",handler)},[state]);
  useEffect(()=>{const button=document.querySelector(".wallet-pill"),title=button?.querySelector("b"),subtitle=button?.querySelector("small");if(title)title.textContent=wallet?compactAddress(wallet):"CONNECT WALLET";if(subtitle)subtitle.textContent=wallet?balance||"BSC TESTNET · CHAIN 97":"BINANCE / METAMASK"},[wallet,balance]);
  return <><div className={`runtime-badge ${state?"connected":"connecting"}`}><i/>{state?`D1 LIVE · ERC-8004/8183 · RADAR BSC-RPC · ${state.agents.length} AGENTS · ${state.bounties.length} BOUNTIES`:"CONNECTING DATA LAYER"}</div>{notice&&<div className={`runtime-toast ${error?"error":""}`}>{notice}</div>}</>;
}
