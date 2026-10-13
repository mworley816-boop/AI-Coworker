"use client";
import {useState} from "react";
import {requestRunExecution} from "@/lib/execution/request-run";
export default function RunControls({runId,onChanged}:{runId:string;onChanged?:()=>void}){
 const [state,setState]=useState("");
 const [busy,setBusy]=useState(false);
 async function start(){
  if(busy)return;
  setBusy(true);setState("Sending execution request…");
  try{
   const result=await requestRunExecution(runId);
   if(result.status==="waiting_approval")setState("Paused for approval.");
   else if(result.status==="completed")setState("Run completed.");
   else if(result.status==="cancelled")setState("Run cancelled.");
   else setState("Execution request accepted. Check run details for progress.");
  }catch(error){
   const detail=error instanceof Error?error.message:"Execution request could not be confirmed.";
   setState(`Execution request: ${detail}. Check run details for the actual status.`);
  }finally{setBusy(false);onChanged?.();}
 }
 return <div className="run-controls"><button type="button" disabled={busy} onClick={()=>void start()}>{busy?"Sending…":"Start run"}</button>{state&&<small role="status">{state} <a href={`/runs/${runId}`}>Open run details →</a></small>}</div>;
}
