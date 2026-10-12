"use client";
import {useCallback,useEffect,useState} from "react";
import {createClient} from "@/lib/supabase/client";
type Approval={id:string;action:string;reason:string|null;run_id:string;created_at:string};
export default function ApprovalInbox(){
 const [items,setItems]=useState<Approval[]>([]);
 const [message,setMessage]=useState("Loading pending approvals…");
 const load=useCallback(async()=>{
  const client=createClient();
  if(!client){setMessage("Workspace connection is not configured.");return;}
  const {data:{user},error:authError}=await client.auth.getUser();
  if(authError||!user){setItems([]);setMessage("Sign in to see pending approvals.");return;}
  const {data,error}=await client.from("approvals").select("id,action,reason,run_id,created_at").eq("status","pending").order("created_at",{ascending:false}).limit(50);
  if(error){setItems([]);setMessage("Could not load pending approvals.");return;}
  setItems((data??[]) as Approval[]);setMessage(data?.length?"":"No pending approvals. You're all caught up.");
 },[]);
 useEffect(()=>{void load();},[load]);
 return <div className="task-list">
  {items.map(a=><article className="task-card" key={a.id}><div><span className="pill">Needs review</span><h3>{a.action}</h3>{a.reason?<p>{a.reason}</p>:null}<small>{new Date(a.created_at).toLocaleDateString()}</small></div><a href={`/runs/${a.run_id}`}>Review action →</a></article>)}
  {message?<p role="status">{message}</p>:null}
  <button type="button" className="secondary" onClick={()=>void load()}>Refresh approvals</button>
  <p><small>Review each action in its run before approving or rejecting it. Showing up to 50 pending approvals.</small></p>
 </div>;
}
