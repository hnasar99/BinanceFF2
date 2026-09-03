"use client";

import { useEffect, useState } from "react";

type AppState={agents:Array<{id:number}>;bounties:Array<{id:number}>;missions:Array<{id:number}>;mandates:Array<{id:number;revokedAt:string|null}>};

export function RuntimeBridge(){
  const[state,setState]=useState<AppState|null>(null);const[notice,setNotice]=useState("");const[error,setError]=useState(false);
  const refresh=async()=>{const response=await fetch("/api/state",{cache:"no-store"});if(!response.ok)throw new Error("Persistent service unavailable");setState(await response.json())};
  const post=async(payload:Record<string,unknown>)=>{const response=await fetch("/api/state",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});const data=await response.json();if(!response.ok)throw new Error(data.error||"Action failed");await refresh();return data};
  useEffect(()=>{refresh().catch(()=>undefined)},[]);
  useEffect(()=>{const handler=async(event:MouseEvent)=>{const button=(event.target as HTMLElement).closest("button");if(!button)return;const label=(button.textContent||"").trim().toUpperCase();let payload:Record<string,unknown>|null=null;let success="";
    if(label.includes("FUND & PUBLISH")){const dialog=button.closest("[role=dialog]");const textarea=dialog?.querySelector("textarea") as HTMLTextAreaElement|null;const inputs=dialog?.querySelectorAll("input");payload={action:"create_bounty",title:textarea?.value||"BNB liquidity intelligence bounty",rewardAmount:Number(inputs?.[0]?.value.replace(/,/g,"")||2500),rewardAsset:"USDT",acceptanceCriteria:inputs?.[1]?.value||"Verified evidence and reproducible calculation",skills:["DeFi","Risk","Evidence"]};success="Bounty persisted and audit event recorded"}
    else if(label.includes("PUBLISH AGENT")){payload={action:"create_agent",name:"SPECTRA",role:"Liquidity Intelligence Agent",skills:["Market data","Simulation","BNB RPC","Evidence"],color:"cyan"};success="Agent published to the persistent registry"}
    else if(label.includes("DEPLOY SQUAD")){payload={action:"deploy_mission",name:"Liquidity intelligence squad"};success="Mission and 72-hour economic mandate deployed"}
    else if(label.includes("REVOKE AUTHORITY")){const current=state||await (await fetch("/api/state",{cache:"no-store"})).json();const mandate=current.mandates?.find((item:{revokedAt:string|null})=>!item.revokedAt);if(mandate){payload={action:"revoke_mandate",id:mandate.id};success="Economic authority revoked and audited"}}
    if(!payload)return;try{await post(payload);setError(false);setNotice(success)}catch(reason){setError(true);setNotice(reason instanceof Error?reason.message:"Action failed")}setTimeout(()=>setNotice(""),4200)};document.addEventListener("click",handler);return()=>document.removeEventListener("click",handler)},[state]);
  return <><div className={`runtime-badge ${state?"connected":"connecting"}`}><i/>{state?`PERSISTENT · ${state.agents.length} AGENTS · ${state.bounties.length} BOUNTIES`:"CONNECTING DATA LAYER"}</div>{notice&&<div className={`runtime-toast ${error?"error":""}`}>{notice}</div>}</>;
}
