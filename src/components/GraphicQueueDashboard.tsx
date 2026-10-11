"use client";
import {useEffect,useState} from "react";
type Job={id:string;brand:string;perfume_name:string;graphic_format:string;status:string;error_code:string|null;created_at:string};
export default function GraphicQueueDashboard(){
 const [perfumeId,setPerfumeId]=useState("");const [brand,setBrand]=useState("");const [name,setName]=useState("");const [format,setFormat]=useState<"product-card"|"editorial-banner">("product-card");
 const [jobs,setJobs]=useState<Job[]>([]);const [message,setMessage]=useState("");const [busy,setBusy]=useState(false);
 async function refresh(){try{const r=await fetch("/api/scentmarked-content/graphic-jobs",{cache:"no-store"});const x=await r.json();if(!r.ok)throw Error(x.error??"Unable to load jobs");setJobs(x.jobs??[])}catch(e){setMessage(e instanceof Error?e.message:"Unable to load jobs")}}
 useEffect(()=>{void refresh()},[]);
 async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setMessage("");try{const r=await fetch("/api/scentmarked-content/graphic-jobs",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({jobs:[{perfumeId,brand,perfumeName:name,format}]})});const x=await r.json();if(!r.ok||!x.ok)throw Error(x.reason??x.error??"Unable to queue job");setMessage("Queued "+x.queued+" graphic job(s). Generation is not started automatically.");setPerfumeId("");setBrand("");setName("");await refresh()}catch(e){setMessage(e instanceof Error?e.message:"Unable to queue job")}finally{setBusy(false)}}
 return <section style={{maxWidth:850,margin:"2rem auto",padding:"1rem"}}>
  <h1>Scentmarked graphics queue</h1><p>Request original fragrance-inspired artwork. Jobs are held for verification before publication; submitting a job does not generate or upload an image.</p>
  <form onSubmit={submit} style={{display:"grid",gap:12,maxWidth:520}}>
   <label>Perfume ID<input required maxLength={120} value={perfumeId} onChange={e=>setPerfumeId(e.target.value)} /></label>
   <label>Brand<input required maxLength={120} value={brand} onChange={e=>setBrand(e.target.value)}/></label>
   <label>Perfume name<input required maxLength={160} value={name} onChange={e=>setName(e.target.value)}/></label>
   <label>Artwork type<select value={format} onChange={e=>setFormat(e.target.value as typeof format)}><option value="product-card">Product card</option><option value="editorial-banner">Editorial banner</option></select></label>
   <button type="submit" disabled={busy}>{busy?"Submitting…":"Add to graphics queue"}</button>
  </form>
  <p role="status" aria-live="polite">{message}</p>
  <h2>Recent jobs</h2><button type="button" onClick={()=>void refresh()}>Refresh jobs</button>
  {jobs.length===0?<p>No jobs available.</p>:<ul>{jobs.map(j=><li key={j.id}><strong>{j.brand} {j.perfume_name}</strong> — {j.graphic_format} — {j.status}{j.error_code?" ("+j.error_code+")":""}</li>)}</ul>}
 </section>;
}
