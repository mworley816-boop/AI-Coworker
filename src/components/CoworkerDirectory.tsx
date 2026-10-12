"use client";
import {useCallback,useEffect,useState} from "react";
import {createClient} from "@/lib/supabase/client";
type Coworker={id:string;name:string;role:string|null;status:string};
export default function CoworkerDirectory(){
 const [items,setItems]=useState<Coworker[]>([]);
 const [message,setMessage]=useState("Loading coworkers…");
 const [creating,setCreating]=useState(false);
 const [signedIn,setSignedIn]=useState(false);
 const load=useCallback(async()=>{
  const client=createClient();
  if(!client){setSignedIn(false);setItems([]);setMessage("Workspace connection is not configured.");return;}
  const {data:{user},error:authError}=await client.auth.getUser();
  if(authError||!user){setSignedIn(false);setItems([]);setMessage("Sign in to see your coworkers.");return;}
  setSignedIn(true);
  const {data,error}=await client.from("coworkers").select("id,name,role,status").eq("user_id",user.id).order("name",{ascending:true}).limit(50);
  if(error){setItems([]);setMessage("Could not load coworkers.");return;}
  setItems((data??[]) as Coworker[]);setMessage(data?.length?"":"No coworkers yet. You can create Atlas below.");
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
   <div><h2>{item.name}</h2><p>{item.role||"AI coworker"}</p><span className="pill">Status: {item.status.replaceAll("_"," ")}</span></div>
  </article>)}
  {message?<p role="status">{message}</p>:null}
  {signedIn&&!items.some(item=>item.name==="Atlas")?<button type="button" disabled={creating} onClick={()=>void createAtlas()}>{creating?"Creating…":"Create Atlas"}</button>:null}
  <button type="button" className="secondary" onClick={()=>void load()}>Refresh</button>
  <p><a href="/tools">Manage tool permissions →</a></p>
 </div>;
}
