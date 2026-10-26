"use client";
import {useCallback,useEffect,useState} from "react";
import {createClient} from "@/lib/supabase/client";
type Coworker={id:string;name:string;role:string|null;status:string};
type Workload={queued:number;running:number;needsReview:number;finished:number};
const emptyWorkload=():Workload=>({queued:0,running:0,needsReview:0,finished:0});
export default function CoworkerDirectory(){
 const [items,setItems]=useState<Coworker[]>([]);
 const [workloads,setWorkloads]=useState<Record<string,Workload>>({});
 const [workloadMessage,setWorkloadMessage]=useState("");
 const [message,setMessage]=useState("Loading coworkers…");
 const [creating,setCreating]=useState(false);
 const [signedIn,setSignedIn]=useState(false);
 const [loading,setLoading]=useState(true);
 const load=useCallback(async()=>{
  setLoading(true);
  try{
  const client=createClient();
  if(!client){setSignedIn(false);setItems([]);setMessage("Workspace connection is not configured.");return;}
  const {data:{user},error:authError}=await client.auth.getUser();
  if(authError||!user){setSignedIn(false);setItems([]);setMessage("Sign in to see your coworkers.");return;}
  setSignedIn(true);
  const {data,error}=await client.from("coworkers").select("id,name,role,status").eq("user_id",user.id).order("name",{ascending:true}).limit(50);
  if(error){setItems([]);setMessage("Could not load coworkers.");return;}
  setItems((data??[]) as Coworker[]);setMessage(data?.length?"":"No coworkers yet. You can create Atlas below.");
  const {data:tasks,error:taskError}=await client.from("tasks").select("coworker_id,status").eq("user_id",user.id).order("created_at",{ascending:false}).limit(500);
  if(taskError){setWorkloads({});setWorkloadMessage("Workload counts unavailable.");}
  else{const next:Record<string,Workload>={};for(const t of tasks??[]){if(!t.coworker_id)continue;const count=next[t.coworker_id]??(next[t.coworker_id]=emptyWorkload());if(t.status==="queued")count.queued++;else if(t.status==="running")count.running++;else if(["waiting_approval","failed","paused"].includes(t.status))count.needsReview++;else if(["completed","cancelled","canceled"].includes(t.status))count.finished++;}setWorkloads(next);setWorkloadMessage((tasks?.length??0)===500?"Counts cover only the 500 most recent tasks.":"");}
  }catch{setSignedIn(false);setItems([]);setMessage("Could not load coworkers.");}
  finally{setLoading(false);}
 },[]);
 useEffect(()=>{void load();},[load]);
 const createAtlas=async()=>{
  setCreating(true);
  try{
   const response=await fetch("/api/coworkers/atlas",{method:"POST"});
   if(!response.ok)throw new Error("Could not create Atlas.");
   await load();
  }catch(e){setMessage(e instanceof Error?e.message:"Could not create Atlas.");}
  finally{setCreating(false);}
 };
 return <div className="coworker-directory">
  {items.map(item=><article className="coworker-directory-card" key={item.id}>
   <div className="avatar" aria-hidden="true">{item.name.slice(0,1).toUpperCase()}</div>
   <div><h2>{item.name}</h2><p>{item.role||"AI coworker"}</p><span className="pill">Status: {item.status.replaceAll("_"," ")}</span><p><strong>{workloads[item.id]?.running??0}</strong> running · <strong>{workloads[item.id]?.queued??0}</strong> queued · <strong>{workloads[item.id]?.needsReview??0}</strong> need review · <strong>{workloads[item.id]?.finished??0}</strong> finished</p><a href="/tasks">View tasks →</a></div>
  </article>)}
  {message?<p role="status">{message}</p>:null}
  {workloadMessage?<p role="status">{workloadMessage}</p>:null}
  {signedIn&&!loading&&!items.some(item=>item.name==="Atlas")?<button type="button" disabled={creating} onClick={()=>void createAtlas()}>{creating?"Creating…":"Create Atlas"}</button>:null}
  <button type="button" className="secondary" disabled={loading||creating} onClick={()=>void load()}>{loading?"Loading…":"Refresh"}</button>
  <p><a href="/tools">Manage tool permissions →</a></p>
 </div>;
}
