"use client";
import {useEffect,useState} from "react";
type Readiness={ready:boolean;workerEnabled:boolean;generationEnabled:boolean;providerConfigured:boolean;queueReady:boolean;privateStorageReady:boolean};
type Job={id:string;brand:string;perfume_name:string;graphic_format:string;status:string;error_code:string|null;created_at:string};
export default function GraphicQueueDashboard(){
 const [perfumeId,setPerfumeId]=useState("");const [brand,setBrand]=useState("");const [name,setName]=useState("");const [format,setFormat]=useState<"product-card"|"editorial-banner">("product-card");
 const [readiness,setReadiness]=useState<Readiness|null>(null);const [readinessError,setReadinessError]=useState("");
 const [running,setRunning]=useState(false);
 const [preview,setPreview]=useState<{jobId:string;url:string}|null>(null);const [previewBusy,setPreviewBusy]=useState<string|null>(null);
 const [jobs,setJobs]=useState<Job[]>([]);const [message,setMessage]=useState("");const [busy,setBusy]=useState(false);
 async function refresh(){try{const r=await fetch("/api/scentmarked-content/graphic-jobs",{cache:"no-store"});const x=await r.json();if(!r.ok)throw Error(x.error??"Unable to load jobs");setJobs(x.jobs??[])}catch(e){setMessage(e instanceof Error?e.message:"Unable to load jobs")}}
 async function checkReadiness(){try{const r=await fetch("/api/scentmarked-content/graphics/readiness",{cache:"no-store"});const x=await r.json();if(!r.ok)throw Error(x.status??"Unable to check readiness");setReadiness(x as Readiness);setReadinessError("")}catch(e){setReadiness(null);setReadinessError(e instanceof Error?e.message:"Unable to check readiness")}}
 useEffect(()=>{void refresh();void checkReadiness()},[]);
 async function runOne(){
  if(!readiness?.ready||running)return;
  if(!window.confirm("Generate ONE queued graphic using the configured paid image provider? The result stays in private Atlas storage and will not be published."))return;
  setRunning(true);setMessage("");
  try{
   const r=await fetch("/api/scentmarked-content/graphics/run-one",{method:"POST",headers:{"content-type":"application/json"}});
   const x=await r.json();
   setMessage(x.status==="QUEUE_EMPTY"?"No queued graphics jobs.":x.ok?"Worker result: "+x.status:"Generation did not complete: "+(x.status??"Unknown error"));
   await refresh();await checkReadiness();
  }catch(e){setMessage(e instanceof Error?e.message:"Unable to run graphic worker")}
  finally{setRunning(false)}
 }
 async function openPreview(jobId:string){
  setPreview(null);setPreviewBusy(jobId);setMessage("");
  try{
   const r=await fetch("/api/scentmarked-content/graphics/preview?id="+encodeURIComponent(jobId),{cache:"no-store"});
   const x=await r.json();
   if(!r.ok||!x.ok)throw Error(x.error??"Preview unavailable");
   setPreview({jobId,url:x.url});
  }catch(e){setMessage(e instanceof Error?e.message:"Preview unavailable")}
  finally{setPreviewBusy(null)}
 }
 async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setMessage("");try{const r=await fetch("/api/scentmarked-content/graphic-jobs",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({jobs:[{perfumeId,brand,perfumeName:name,format}]})});const x=await r.json();if(!r.ok||!x.ok)throw Error(x.reason??x.error??"Unable to queue job");setMessage("Queued "+x.queued+" graphic job(s). Generation is not started automatically.");setPerfumeId("");setBrand("");setName("");await refresh()}catch(e){setMessage(e instanceof Error?e.message:"Unable to queue job")}finally{setBusy(false)}}
 return <section style={{maxWidth:850,margin:"2rem auto",padding:"1rem"}}>
  <h1>Scentmarked graphics queue</h1><p>Request original fragrance-inspired artwork. Jobs are held for verification before publication; submitting a job does not generate or upload an image.</p>
  <section aria-label="Graphics worker readiness"><h2>Generation readiness</h2><p>{readiness?readiness.ready?"Ready for a manually authorized test":"Not ready for generation":readinessError||"Checking configuration…"}</p>{readiness&&<ul><li>Queue: {readiness.queueReady?"Ready":"Needs attention"}</li><li>Private storage: {readiness.privateStorageReady?"Ready":"Needs attention"}</li><li>Worker: {readiness.workerEnabled?"Enabled":"Disabled"}</li><li>Generation: {readiness.generationEnabled?"Enabled":"Disabled"}</li><li>Image provider: {readiness.providerConfigured?"Configured":"Not configured"}</li></ul>}<button type="button" onClick={()=>void checkReadiness()}>Check readiness again</button><p>Checking readiness never starts image generation or publishing.</p><button type="button" disabled={!readiness?.ready||running} onClick={()=>void runOne()}>{running?"Generating one graphic…":"Generate one queued graphic (manual)"}</button><p>Requires confirmation and may incur image-provider charges. Results stay private pending review.</p></section>
  <form onSubmit={submit} style={{display:"grid",gap:12,maxWidth:520}}>
   <label>Perfume ID<input required maxLength={120} value={perfumeId} onChange={e=>setPerfumeId(e.target.value)} /></label>
   <label>Brand<input required maxLength={120} value={brand} onChange={e=>setBrand(e.target.value)}/></label>
   <label>Perfume name<input required maxLength={160} value={name} onChange={e=>setName(e.target.value)}/></label>
   <label>Artwork type<select value={format} onChange={e=>setFormat(e.target.value as typeof format)}><option value="product-card">Product card</option><option value="editorial-banner">Editorial banner</option></select></label>
   <button type="submit" disabled={busy}>{busy?"Submitting…":"Add to graphics queue"}</button>
  </form>
  <p role="status" aria-live="polite">{message}</p>
  <h2>Recent jobs</h2><button type="button" onClick={()=>void refresh()}>Refresh jobs</button>
  {jobs.length===0?<p>No jobs available.</p>:<ul>{jobs.map(j=><li key={j.id}><strong>{j.brand} {j.perfume_name}</strong> — {j.graphic_format} — {j.status}{j.error_code?" ("+j.error_code+")":""} {["generated","approved","uploaded"].includes(j.status)&&<button type="button" disabled={previewBusy===j.id} onClick={()=>void openPreview(j.id)}>{previewBusy===j.id?"Loading preview…":"View private preview"}</button>}</li>)}</ul>}
  {preview&&<section aria-label="Private artwork preview"><h2>Private artwork preview</h2><p>Temporary access expires after 60 seconds. This image is not published.</p><img src={preview.url} alt="Generated fragrance artwork awaiting review" style={{maxWidth:"100%",maxHeight:500,objectFit:"contain"}}/><p><button type="button" onClick={()=>setPreview(null)}>Close preview</button></p></section>}
 </section>;
}
