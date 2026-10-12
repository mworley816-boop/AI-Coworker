"use client";
import {useCallback,useEffect,useMemo,useState} from "react";
import {createClient} from "@/lib/supabase/client";
type Task={id:string;goal:string;status:string;created_at:string;runs:{id:string;status:string;created_at:string}[]|null};
type Filter="attention"|"all"|"completed";
const attentionStatuses=new Set(["queued","running","waiting_approval","paused","failed"]);
export default function TaskList(){
 const [items,setItems]=useState<Task[]>([]);
 const [message,setMessage]=useState("Loading tasks…");
 const [filter,setFilter]=useState<Filter>("attention");
 const load=useCallback(async()=>{
  const s=createClient();
  if(!s){setItems([]);setMessage("Supabase is not configured.");return;}
  const {data:{user},error:authError}=await s.auth.getUser();
  if(authError||!user){setItems([]);setMessage("Sign in to browse tasks.");return;}
  const {data,error}=await s.from("tasks").select("id,goal,status,created_at,runs(id,status,created_at)").order("created_at",{ascending:false}).limit(50);
  if(error){setItems([]);setMessage("Tasks could not be loaded.");return;}
  setItems((data??[]) as Task[]);setMessage(data?.length?"":"No tasks yet. Give Atlas a goal from the dashboard.");
 },[]);
 useEffect(()=>{void load();},[load]);
 const shown=useMemo(()=>items.filter(t=>filter==="all"|| (filter==="completed"?!attentionStatuses.has(t.status):attentionStatuses.has(t.status))),[items,filter]);
 return <div className="task-list">
  <div className="task-filters" role="group" aria-label="Filter tasks">
   <button type="button" aria-pressed={filter==="attention"} onClick={()=>setFilter("attention")}>Needs attention</button>
   <button type="button" aria-pressed={filter==="all"} onClick={()=>setFilter("all")}>All tasks</button>
   <button type="button" aria-pressed={filter==="completed"} onClick={()=>setFilter("completed")}>Other tasks</button>
  </div>
  {shown.map(t=>{const latest=[...(t.runs??[])].sort((a,b)=>b.created_at.localeCompare(a.created_at))[0];return <article className="task-card" key={t.id}>
   <div><span className="pill">{t.status.replaceAll("_"," ")}</span><h3>{t.goal}</h3><small>{new Date(t.created_at).toLocaleDateString()}</small></div>
   {latest?<a href={`/runs/${latest.id}`}>Open latest run →</a>:<span>No run yet</span>}
  </article>})}
  {!message&&shown.length===0?<p role="status">{filter==="attention"?"Nothing needs attention in the most recent 50 tasks.":"No tasks in this view."}</p>:null}
  {message?<p role="status">{message}</p>:null}
  <button className="secondary" onClick={()=>void load()}>Refresh tasks</button>
  <small>Showing up to 50 most recent tasks.</small>
 </div>;
}
