"use client";
import {useCallback,useEffect,useState} from "react";
type Summary={approvals:number;active:number;scentmarked:{health?:string}|null};
export default function AttentionHub(){
 const [data,setData]=useState<Summary|null>(null);
 const [error,setError]=useState("");
 const [loading,setLoading]=useState(true);
 const refresh=useCallback(async()=>{
  setLoading(true);
  try{
   const response=await fetch("/api/workspace/summary",{cache:"no-store"});
   if(!response.ok)throw new Error(response.status===401?"Sign in to see your priorities.":"Priorities unavailable right now.");
   const result=await response.json() as Summary;
   setData(result);setError("");
  }catch(e){setData(null);setError(e instanceof Error?e.message:"Priorities unavailable right now.");}
  finally{setLoading(false);}
 },[]);
 useEffect(()=>{void refresh();},[refresh]);
 return <section className="attention-hub" aria-labelledby="attention-title">
  <div className="attention-head"><h2 id="attention-title">Needs your attention</h2><p>Choose one thing to focus on.</p></div>
  {loading?<p role="status">Checking your workspace…</p>:error?<p role="status">{error}</p>:data?<p role="status" className="attention-status">{data.approvals>0?`${data.approvals} approval${data.approvals===1?"":"s"} waiting for you.`:"No pending approvals."} {data.active>0?`${data.active} active task${data.active===1?"":"s"}.`:"No active tasks."}</p>:null}
  <div className="calm-actions" aria-label="Quick actions">
   <a href="/tasks">Review pending work {data?<strong className="action-count">{data.approvals}</strong>:null}<span aria-hidden="true">→</span></a>
   <a href="/tasks">Continue tasks {data?<strong className="action-count">{data.active}</strong>:null}<span aria-hidden="true">→</span></a>
   <a href="/scentmarked-content">Manage Scentmarked <span aria-hidden="true">→</span></a>
  </div>
 </section>;
}
