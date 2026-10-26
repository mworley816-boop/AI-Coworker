"use client";
import {useCallback,useEffect,useMemo,useState} from "react";
import {createClient} from "@/lib/supabase/client";
type Task={id:string;goal:string;status:string;created_at:string;coworkers:{name:string}|null;runs:{id:string;status:string;created_at:string}[]|null};
type Filter="attention"|"active"|"completed"|"all";
const reviewStatuses=new Set(["waiting_approval","failed","paused"]);
const activeStatuses=new Set(["queued","running"]);
const completedStatuses=new Set(["completed","cancelled","canceled"]);
const labelFor=(status:string)=>({waiting_approval:"Awaiting approval",queued:"Queued",running:"Running",failed:"Failed",paused:"Paused",completed:"Completed",cancelled:"Cancelled",canceled:"Cancelled"} as Record<string,string>)[status]??status.replaceAll("_"," ");
export default function TaskList(){
 const [items,setItems]=useState<Task[]>([]);
 const [message,setMessage]=useState("Loading tasks…");
 const [filter,setFilter]=useState<Filter>("attention");
 const [loading,setLoading]=useState(true);
 const [busyRun,setBusyRun]=useState<string|null>(null);
 const [actionMessage,setActionMessage]=useState("");
 const load=useCallback(async()=>{
  setLoading(true);
  try{
  const s=createClient();
  if(!s){setItems([]);setMessage("Supabase is not configured.");return;}
  const {data:{user},error:authError}=await s.auth.getUser();
  if(authError||!user){setItems([]);setMessage("Sign in to browse tasks.");return;}
  const {data,error}=await s.from("tasks").select("id,goal,status,created_at,coworkers(name),runs(id,status,created_at)").order("created_at",{ascending:false}).limit(50);
  if(error){setItems([]);setMessage("Tasks could not be loaded.");return;}
  setItems((data??[]) as Task[]);setMessage(data?.length?"":"No tasks yet. Give Atlas a goal from the dashboard.");
  }catch{setItems([]);setMessage("Tasks could not be loaded.");}
  finally{setLoading(false);}
 },[]);
 useEffect(()=>{void load();},[load]);
 const runAction=async(runId:string,action:"start"|"resume"|"retry")=>{
  setBusyRun(runId);setActionMessage("");
  try{
   const response=await fetch(action==="start"?"/api/runs/execute":"/api/runs/control",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(action==="start"?{runId}:{runId,action})});
   const result=await response.json() as {ok?:boolean;reason?:string};
   if(!response.ok||result.ok===false)throw new Error(result.reason??"Action was not accepted.");
   setActionMessage(action==="start"?"Execution request accepted; check run details for progress.":action==="retry"?"Run queued for retry. Select Start to request execution.":"Run resumed and queued. Select Start to request execution.");
   await load();
  }catch(error){setActionMessage(error instanceof Error?error.message:"Could not complete action.");await load();}
  finally{setBusyRun(null);}
 };
 const counts=useMemo(()=>({attention:items.filter(t=>reviewStatuses.has(t.status)).length,active:items.filter(t=>activeStatuses.has(t.status)).length,completed:items.filter(t=>completedStatuses.has(t.status)).length,all:items.length}),[items]);
 const shown=useMemo(()=>items.filter(t=>filter==="all"||(filter==="attention"?reviewStatuses.has(t.status):filter==="active"?activeStatuses.has(t.status):completedStatuses.has(t.status))),[items,filter]);
 return <div className="task-list">
  <p className="task-view-intro">Review blockers first, then check work in progress. Counts cover the 50 most recent tasks.</p>
  <div className="task-filters" role="group" aria-label="Filter tasks">
   <button type="button" aria-pressed={filter==="attention"} onClick={()=>setFilter("attention")}>Needs review ({counts.attention})</button>
   <button type="button" aria-pressed={filter==="active"} onClick={()=>setFilter("active")}>In progress ({counts.active})</button>
   <button type="button" aria-pressed={filter==="completed"} onClick={()=>setFilter("completed")}>Finished ({counts.completed})</button>
   <button type="button" aria-pressed={filter==="all"} onClick={()=>setFilter("all")}>All ({counts.all})</button>
  </div>
  {shown.map(t=>{const latest=[...(t.runs??[])].sort((a,b)=>b.created_at.localeCompare(a.created_at))[0];return <article className="task-card" key={t.id}>
   <div><span className="pill">{labelFor(t.status)}</span><h3>{t.goal}</h3><small>Assigned to: {t.coworkers?.name??"Unassigned"}</small><small>{new Date(t.created_at).toLocaleDateString()}</small></div>
   <div className="task-run-actions">{latest?<><a href={`/runs/${latest.id}`}>Open latest run →</a>{latest.status==="queued"?<button type="button" disabled={busyRun!==null} onClick={()=>void runAction(latest.id,"start")}>{busyRun===latest.id?"Working…":"Start run"}</button>:latest.status==="paused"?<button type="button" disabled={busyRun!==null} onClick={()=>void runAction(latest.id,"resume")}>{busyRun===latest.id?"Working…":"Resume run"}</button>:latest.status==="failed"?<button type="button" disabled={busyRun!==null} onClick={()=>void runAction(latest.id,"retry")}>{busyRun===latest.id?"Working…":"Retry run"}</button>:null}<small>Latest run: {labelFor(latest.status)}</small></>:<span>No run yet</span>}</div>
  </article>})}
  {!message&&shown.length===0?<p role="status">{filter==="attention"?"No blocked or approval-waiting tasks among the most recent 50.":filter==="active"?"No queued or running tasks among the most recent 50.":filter==="completed"?"No finished tasks among the most recent 50.":"No tasks in this view."}</p>:null}
  {message?<p role="status">{message}</p>:null}
  {actionMessage?<p role="status">{actionMessage}</p>:null}
  <button type="button" className="secondary" disabled={loading} onClick={()=>void load()}>{loading?"Loading…":"Refresh tasks"}</button>
  <small>Showing up to 50 most recent tasks.</small>
 </div>;
}
