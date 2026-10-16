"use client";
import {useEffect,useState} from "react";
type Readiness={ready:boolean;workerEnabled:boolean;generationEnabled:boolean;providerConfigured:boolean;queueReady:boolean;privateStorageReady:boolean};
type Job={id:string;brand:string;perfume_name:string;graphic_format:string;status:string;error_code:string|null;created_at:string};
export default function GraphicQueueDashboard(){
 const [perfumeId,setPerfumeId]=useState("");const [brand,setBrand]=useState("");const [name,setName]=useState("");const [format,setFormat]=useState<"product-card"|"editorial-banner">("product-card");
 const [referenceUrl,setReferenceUrl]=useState("");const [referenceApproved,setReferenceApproved]=useState(false);const [referenceRights,setReferenceRights]=useState(false);const [photoSearchLinks,setPhotoSearchLinks]=useState<Array<{label:string;url:string}>>([]);const [photoSearchBusy,setPhotoSearchBusy]=useState(false);const [photoSearchMessage,setPhotoSearchMessage]=useState("");const [catalogMatches,setCatalogMatches]=useState<Array<{id:string;name:string;brandName:string|null}>>([]);const [catalogMessage,setCatalogMessage]=useState("");const [catalogBusy,setCatalogBusy]=useState(false);const [selectedCatalogId,setSelectedCatalogId]=useState("");const [readiness,setReadiness]=useState<Readiness|null>(null);const [readinessError,setReadinessError]=useState("");const [checkingReadiness,setCheckingReadiness]=useState(false);const [readinessCheckedAt,setReadinessCheckedAt]=useState("");
 const [running,setRunning]=useState(false);
 const [batchSize,setBatchSize]=useState(2);const [batchRunning,setBatchRunning]=useState(false);
 const [recovering,setRecovering]=useState(false);
 const [reviewBusy,setReviewBusy]=useState(false);const [identityVerified,setIdentityVerified]=useState(false);const [rightsCleared,setRightsCleared]=useState(false);
 const [preview,setPreview]=useState<{jobId:string;url:string}|null>(null);const [previewBusy,setPreviewBusy]=useState<string|null>(null);
 const [photoCandidate,setPhotoCandidate]=useState<{name:string;brand:string|null;imageUrl:string|null}|null>(null);const [photoResearchMessage,setPhotoResearchMessage]=useState("");const [photoResearchBusy,setPhotoResearchBusy]=useState(false);const [jobs,setJobs]=useState<Job[]>([]);const [message,setMessage]=useState("");const [busy,setBusy]=useState(false);
 async function refresh(){try{const r=await fetch("/api/scentmarked-content/graphic-jobs",{cache:"no-store"});const x=await r.json();if(!r.ok)throw Error(x.error??"Unable to load jobs");setJobs(x.jobs??[])}catch(e){setMessage(e instanceof Error?e.message:"Unable to load jobs")}}
 async function checkReadiness(){if(checkingReadiness)return;setCheckingReadiness(true);setReadinessError("");const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),15000);try{const r=await fetch("/api/scentmarked-content/graphics/readiness?refresh="+Date.now(),{cache:"no-store",signal:controller.signal});const x=await r.json();if(!r.ok)throw Error(x.status??"Unable to check readiness");setReadiness(x as Readiness);setReadinessCheckedAt(new Date().toLocaleTimeString());}catch(e){setReadiness(null);setReadinessError(e instanceof Error&&e.name==="AbortError"?"Readiness check timed out. Please retry.":e instanceof Error?e.message:"Unable to check readiness")}finally{clearTimeout(timeout);setCheckingReadiness(false)}}
 useEffect(()=>{void refresh();void checkReadiness()},[]);
 useEffect(()=>{if(selectedCatalogId&&selectedCatalogId===perfumeId)return;const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;const byId=uuid.test(perfumeId.trim());if(!byId&&name.trim().length<2){setCatalogMatches([]);setCatalogMessage("");return;}const controller=new AbortController();const timer=setTimeout(async()=>{setCatalogBusy(true);setCatalogMessage("");try{const url=byId?"/api/scentmarked-content/graphics/product-reference?perfumeId="+encodeURIComponent(perfumeId.trim()):"/api/scentmarked-content/catalog-lookup?name="+encodeURIComponent(name.trim())+"&brand="+encodeURIComponent(brand.trim());const r=await fetch(url,{signal:controller.signal,cache:"no-store"});const x=await r.json();if(!r.ok||!x.ok)throw Error(x.error??x.message??"Catalog lookup failed");const matches=byId?(x.perfume?[{id:x.perfume.id,name:x.perfume.name,brandName:x.perfume.brand}]:[]):(x.matches??[]) as Array<{id:string;name:string;brandName:string|null}>;setCatalogMatches(matches);setCatalogMessage(matches.length?"Select the matching perfume to fill in all fields.":"No matching perfume found. Check the spelling.");if(byId&&matches.length===1&&matches[0].brandName){setName(matches[0].name);setBrand(matches[0].brandName);setSelectedCatalogId(matches[0].id);void researchPhotoForId(matches[0].id);void discoverManufacturerPhotos(matches[0].brandName??"",matches[0].name);}}catch(e){if(!controller.signal.aborted)setCatalogMessage(e instanceof Error?e.message:"Catalog lookup unavailable")}finally{if(!controller.signal.aborted)setCatalogBusy(false)}},450);return()=>{clearTimeout(timer);controller.abort()}},[perfumeId,name,brand,selectedCatalogId]);
 function chooseCatalogMatch(m:{id:string;name:string;brandName:string|null}){setPerfumeId(m.id);setName(m.name);setBrand(m.brandName??"");setSelectedCatalogId(m.id);setCatalogMatches([]);setCatalogMessage("Matched to Scentmarked catalog.");setReferenceUrl("");setReferenceApproved(false);setReferenceRights(false);void researchPhotoForId(m.id);void discoverManufacturerPhotos(m.brandName??"",m.name);}
 async function discoverManufacturerPhotos(targetBrand=brand,targetName=name){if(!targetBrand.trim()||!targetName.trim())return;setPhotoSearchBusy(true);setPhotoSearchLinks([]);setPhotoSearchMessage("");try{const r=await fetch("/api/scentmarked-content/graphics/photo-research?brand="+encodeURIComponent(targetBrand)+"&name="+encodeURIComponent(targetName),{cache:"no-store"});const x=await r.json();if(!r.ok||!x.ok)throw Error(x.error??"Photo research unavailable");setPhotoSearchLinks(x.searches??[]);setPhotoSearchMessage("Research links ready. These are not verified product photographs; review manufacturer identity and image rights.");}catch(e){setPhotoSearchMessage(e instanceof Error?e.message:"Photo research unavailable")}finally{setPhotoSearchBusy(false)}}
 async function researchPhotoForId(id:string){setPhotoResearchBusy(true);setPhotoCandidate(null);setPhotoResearchMessage("");try{const r=await fetch("/api/scentmarked-content/graphics/product-reference?perfumeId="+encodeURIComponent(id),{cache:"no-store"});const x=await r.json();if(!r.ok||!x.ok)throw Error(x.error??"Unable to find product image");setPhotoCandidate(x.perfume);setPhotoResearchMessage(x.perfume.imageUrl?"Catalog photo candidate found. Verify the exact bottle and image usage rights before using it.":"No catalog photo found. An official manufacturer reference is required.");}catch(e){setPhotoResearchMessage(e instanceof Error?e.message:"Photo lookup failed")}finally{setPhotoResearchBusy(false)}}
 async function researchPhoto(){await researchPhotoForId(perfumeId.trim())}
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
 async function runBatch(){
  if(!readiness?.ready||batchRunning||running)return;
  if(!window.confirm("Generate up to "+batchSize+" queued graphics using the configured paid image provider? This may incur charges. Generated images stay private and are NOT published."))return;
  setBatchRunning(true);setMessage("");
  try{
   const r=await fetch("/api/scentmarked-content/graphics/run-batch",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({requestedJobs:batchSize,confirm:true})});
   const x=await r.json();
   if(!r.ok||!x.ok)throw Error(x.status??"Batch failed");
   const statuses=(x.results??[]).map((v:{status:string})=>v.status).join(", ");
   setMessage("Manual batch completed: "+x.attempted+" worker iteration(s). "+statuses+". Images remain private.");
   await refresh();await checkReadiness();
  }catch(e){setMessage(e instanceof Error?e.message:"Batch failed")}
  finally{setBatchRunning(false)}
 }
 async function recoverStale(){
  if(recovering||!window.confirm("Hold up to 10 graphics jobs stuck in generating for over 30 minutes? This will not regenerate images or publish anything."))return;
  setRecovering(true);setMessage("");
  try{
   const r=await fetch("/api/scentmarked-content/graphics/recover-stale",{method:"POST",headers:{"content-type":"application/json"}});
   const x=await r.json();
   if(!r.ok||!x.ok)throw Error(x.status??"Recovery failed");
   setMessage("Recovery completed: "+x.held+" stale job(s) held for manual inspection. No images regenerated.");
   await refresh();
  }catch(e){setMessage(e instanceof Error?e.message:"Recovery failed")}
  finally{setRecovering(false)}
 }
 async function openPreview(jobId:string){
  setPreview(null);setPreviewBusy(jobId);setMessage("");
  try{
   const r=await fetch("/api/scentmarked-content/graphics/preview?id="+encodeURIComponent(jobId),{cache:"no-store"});
   const x=await r.json();
   if(!r.ok||!x.ok)throw Error(x.error??"Preview unavailable");
   setPreview({jobId,url:x.url});setIdentityVerified(false);setRightsCleared(false);
  }catch(e){setMessage(e instanceof Error?e.message:"Preview unavailable")}
  finally{setPreviewBusy(null)}
 }
 async function review(decision:"approve"|"reject"){
  if(!preview||reviewBusy)return;
  if(decision==="approve"&&(!identityVerified||!rightsCleared))return;
  if(!window.confirm(decision==="approve"?"Approve this artwork for later publishing review? This will NOT publish it.":"Reject this artwork and hold the job?"))return;
  setReviewBusy(true);setMessage("");
  try{
   const r=await fetch("/api/scentmarked-content/graphics/review",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({id:preview.jobId,decision,identityVerified:decision==="approve"&&identityVerified,rightsCleared:decision==="approve"&&rightsCleared})});
   const x=await r.json();
   if(!r.ok||!x.ok)throw Error(x.error??"Review failed");
   setMessage("Artwork review saved: "+x.status+". No image was published.");
   setPreview(null);setIdentityVerified(false);setRightsCleared(false);await refresh();
  }catch(e){setMessage(e instanceof Error?e.message:"Review failed")}
  finally{setReviewBusy(false)}
 }
 async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setMessage("");try{const r=await fetch("/api/scentmarked-content/graphic-jobs",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({jobs:[{perfumeId,brand,perfumeName:name,format}]})});const x=await r.json();if(!r.ok||!x.ok)throw Error(x.reason??x.error??"Unable to queue job");setMessage("Queued "+x.queued+" graphic job(s). Generation is not started automatically.");setPerfumeId("");setBrand("");setName("");setSelectedCatalogId("");setCatalogMatches([]);setCatalogMessage("");await refresh()}catch(e){setMessage(e instanceof Error?e.message:"Unable to queue job")}finally{setBusy(false)}}
 return <section style={{maxWidth:850,margin:"2rem auto",padding:"1rem"}}>
  <h1>Scentmarked graphics queue</h1><p>Request original fragrance-inspired artwork. Jobs are held for verification before publication; submitting a job does not generate or upload an image.</p>
  <section aria-label="Graphics worker readiness"><h2>Generation readiness</h2><p>{readiness?readiness.ready?"Ready for a manually authorized test":"Not ready for generation":readinessError||"Checking configuration…"}</p>{readiness&&<ul><li>Queue: {readiness.queueReady?"Ready":"Needs attention"}</li><li>Private storage: {readiness.privateStorageReady?"Ready":"Needs attention"}</li><li>Worker: {readiness.workerEnabled?"Enabled":"Disabled"}</li><li>Generation: {readiness.generationEnabled?"Enabled":"Disabled"}</li><li>Image provider: {readiness.providerConfigured?"Configured":"Not configured"}</li></ul>}<button type="button" disabled={checkingReadiness} onClick={()=>void checkReadiness()}>{checkingReadiness?"Checking readiness…":"Check readiness again"}</button>{readinessCheckedAt&&<p role="status" aria-live="polite">Last checked: {readinessCheckedAt}</p>}{readinessError&&<p role="alert">{readinessError}</p>}<p>Checking readiness never starts image generation or publishing.</p><button type="button" disabled={!readiness?.ready||running} onClick={()=>void runOne()}>{running?"Generating one graphic…":"Generate one queued graphic (manual)"}</button><p>Requires confirmation and may incur image-provider charges. Results stay private pending review.</p><div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}><label>Manual batch size <select value={batchSize} disabled={batchRunning} onChange={e=>setBatchSize(Number(e.target.value))}>{[1,2,3,4,5].map(n=><option key={n} value={n}>{n} graphic{n===1?"":"s"}</option>)}</select></label><button type="button" disabled={!readiness?.ready||batchRunning||running} onClick={()=>void runBatch()}>{batchRunning?"Generating batch…":"Generate confirmed batch"}</button></div><p>Each batch requires your confirmation. Up to five images; no automatic scheduling or publishing.</p></section>
  <p><strong>Product-card generation creates background artwork only.</strong> Atlas does not yet composite verified bottle photographs. Research the existing catalog photo before using any image as a product listing.</p>
  <form onSubmit={submit} style={{display:"grid",gap:12,maxWidth:520}}>
   <label>Perfume ID<input required maxLength={120} value={perfumeId} onChange={e=>{setSelectedCatalogId("");setPhotoCandidate(null);setPhotoResearchMessage("");setReferenceUrl("");setReferenceApproved(false);setReferenceRights(false);setPerfumeId(e.target.value)}} /></label>
   <label>Brand<input required maxLength={120} value={brand} onChange={e=>{setSelectedCatalogId("");setPhotoCandidate(null);setPhotoResearchMessage("");setReferenceUrl("");setReferenceApproved(false);setReferenceRights(false);setBrand(e.target.value)}}/></label>
   <label>Perfume name<input required maxLength={160} value={name} onChange={e=>{setSelectedCatalogId("");setPhotoCandidate(null);setPhotoResearchMessage("");setReferenceUrl("");setReferenceApproved(false);setReferenceRights(false);setName(e.target.value)}}/></label>
   {catalogBusy&&<p>Searching Scentmarked catalog…</p>}{catalogMessage&&<p role="status">{catalogMessage}</p>}{catalogMatches.length>0&&<div aria-label="Matching perfumes"><strong>Matching perfumes</strong><ul>{catalogMatches.map(m=><li key={m.id}><button type="button" onClick={()=>chooseCatalogMatch(m)}>{m.brandName??"Unknown brand"} — {m.name}</button></li>)}</ul></div>}
   <label>Artwork type<select value={format} onChange={e=>setFormat(e.target.value as typeof format)}><option value="product-card">Product card</option><option value="editorial-banner">Editorial banner</option></select></label>
   <div><button type="button" disabled={photoSearchBusy||!brand.trim()||!name.trim()} onClick={()=>void discoverManufacturerPhotos()}>{photoSearchBusy?"Preparing photo research…":"Find manufacturer photo sources"}</button></div>{photoSearchMessage&&<p role="status">{photoSearchMessage}</p>}{photoSearchLinks.length>0&&<ul>{photoSearchLinks.map(link=><li key={link.url}><a href={link.url} target="_blank" rel="noopener noreferrer">{link.label}</a></li>)}</ul>}
   <fieldset style={{border:"1px solid #888",padding:12}}><legend>Authentic product photo reference (manual review)</legend><label>Direct HTTPS image URL<input type="url" value={referenceUrl} placeholder="https://manufacturer.example/product.jpg" onChange={e=>{setReferenceUrl(e.target.value);setReferenceApproved(false);setReferenceRights(false)}} style={{width:"100%"}} /></label>{/^https:\/\//i.test(referenceUrl)&&<div><p><a href={referenceUrl} target="_blank" rel="noopener noreferrer">Open original reference</a></p><img src={referenceUrl} alt="Unverified product reference candidate" referrerPolicy="no-referrer" style={{maxWidth:240,maxHeight:260,objectFit:"contain"}} onError={e=>{e.currentTarget.style.display="none"}} /></div>}<label style={{display:"block"}}><input type="checkbox" checked={referenceApproved} onChange={e=>setReferenceApproved(e.target.checked)} /> I checked that this is the exact perfume bottle and packaging.</label><label style={{display:"block"}}><input type="checkbox" checked={referenceRights} onChange={e=>setReferenceRights(e.target.checked)} /> I verified that I have permission to use this image.</label><p>{referenceApproved&&referenceRights&&/^https:\/\//i.test(referenceUrl)?"Reference reviewed locally. Compositing and persistent reference storage are not yet enabled.":"Research candidate only. No reference is saved, generated into artwork, or published."}</p></fieldset>
   <div><button type="button" disabled={photoResearchBusy||!perfumeId.trim()} onClick={()=>void researchPhoto()}>{photoResearchBusy?"Researching catalog photo…":"Research existing product photo"}</button></div>{photoResearchMessage&&<p role="status">{photoResearchMessage}</p>}{photoCandidate&&<div><p>Catalog match: {photoCandidate.brand} — {photoCandidate.name}</p>{photoCandidate.imageUrl&&<><a href={photoCandidate.imageUrl} target="_blank" rel="noopener noreferrer">Open catalog image source</a><p><img src={photoCandidate.imageUrl} alt={"Unverified catalog photo candidate for "+photoCandidate.name} style={{maxWidth:220,maxHeight:220,objectFit:"contain"}}/></p></>}<p>Image identity and reuse rights are not verified. No photo is automatically used or published.</p></div>}
   <button type="submit" disabled={busy||!selectedCatalogId||selectedCatalogId!==perfumeId}>{busy?"Submitting…":"Add to graphics queue"}</button><p>Choose a catalog match before queueing to prevent incorrect perfume IDs.</p>
  </form>
  <p role="status" aria-live="polite">{message}</p>
  <h2>Recent jobs</h2><button type="button" onClick={()=>void refresh()}>Refresh jobs</button> <button type="button" disabled={recovering} onClick={()=>void recoverStale()}>{recovering?"Checking stale jobs…":"Hold stale generating jobs"}</button><p>Manual recovery holds jobs older than 30 minutes for investigation. It never retries paid generation.</p>
  {jobs.length===0?<p>No jobs available.</p>:<ul>{jobs.map(j=><li key={j.id}><strong>{j.brand} {j.perfume_name}</strong> — {j.graphic_format} — {j.status}{j.error_code?" ("+j.error_code+")":""} {["generated","approved","uploaded"].includes(j.status)&&<button type="button" disabled={previewBusy===j.id} onClick={()=>void openPreview(j.id)}>{previewBusy===j.id?"Loading preview…":"View private preview"}</button>}</li>)}</ul>}
  {preview&&<section aria-label="Private artwork preview"><h2>Private artwork preview</h2><p>Temporary access expires after 60 seconds. This image is not published.</p><img src={preview.url} alt="Generated fragrance artwork awaiting review" style={{maxWidth:"100%",maxHeight:500,objectFit:"contain"}}/>{jobs.find(j=>j.id===preview.jobId)?.status==="generated"&&<div style={{display:"grid",gap:8,maxWidth:520}}><label><input type="checkbox" checked={identityVerified} onChange={e=>setIdentityVerified(e.target.checked)}/> I verified the perfume identity and artwork representation.</label><label><input type="checkbox" checked={rightsCleared} onChange={e=>setRightsCleared(e.target.checked)}/> I verified usage rights for this artwork.</label><div><button type="button" disabled={reviewBusy||!identityVerified||!rightsCleared} onClick={()=>void review("approve")}>Approve for later publishing review</button> <button type="button" disabled={reviewBusy} onClick={()=>void review("reject")}>Reject artwork</button></div><p>Approval records a review decision only. Nothing is published automatically.</p></div>}<p><button type="button" onClick={()=>{setPreview(null);setIdentityVerified(false);setRightsCleared(false)}}>Close preview</button></p></section>}
 </section>;
}
