"use client";
import {useCallback,useEffect,useState} from "react";
type DashboardData={coworkers:number;active:number;approvals:number;runsToday:number;atlasStatus:string};
const empty:DashboardData={coworkers:0,active:0,approvals:0,runsToday:0,atlasStatus:"Not created yet"};
export default function WorkspaceSummary(){
 const [data,setData]=useState(empty);const [message,setMessage]=useState("Loading workspace…");const [creating,setCreating]=useState(false);
 const load=useCallback(async()=>{try{const response=await fetch("/api/workspace/summary",{cache:"no-store"});const result=await response.json();if(!response.ok){setData(empty);setMessage(result.error||"Could not load workspace.");return;}setData(result);setMessage("Live workspace data");}catch{setMessage("Could not load workspace.");}},[]);
 useEffect(()=>{void load();},[load]);
 const createAtlas=async()=>{setCreating(true);setMessage("Creating Atlas…");try{const response=await fetch("/api/coworkers/atlas",{method:"POST"});const result=await response.json();if(!response.ok)throw new Error(result.error||"Could not create Atlas.");setMessage("Atlas is ready.");await load();}catch(error){setMessage(error instanceof Error?error.message:"Could not create Atlas.");}finally{setCreating(false);}};
 const stats=[["Coworkers",data.coworkers],["Active tasks",data.active],["Awaiting approval",data.approvals],["Runs today",data.runsToday]];
 return <><div className="stats">{stats.map(([a,b])=><article key={a}><span>{a}</span><strong>{b}</strong></article>)}</div><article className="worker"><div className="avatar">A</div><div><h3>Atlas</h3><p>General autonomous coworker</p><span className="status">● {data.atlasStatus}</span></div>{data.atlasStatus==="Not created yet"?<button className="secondary" disabled={creating} onClick={()=>void createAtlas()}>{creating?"Creating…":"Create Atlas"}</button>:<button className="secondary" onClick={()=>void load()}>Refresh</button>}</article><small>{message} <span data-build="workspace-server-v2">• build workspace-server-v2</span></small></>;
}