"use client";
import {useEffect,useState} from "react";
import {discoverReferenceSources} from "@/lib/graphics/reference-source-discovery";
import {evaluateGraphicsPreflight} from "@/lib/graphics/generation-preflight";
import type {GraphicsBrief} from "@/lib/graphics/generation-preflight";
import type {BottleVariantAssessment} from "@/lib/graphics/bottle-variant-matching";
const candidate: BottleVariantAssessment={status:"candidate",matchedFields:["brand","perfumeName"],missingFields:[],conflicts:[],requiresVisualVerification:true,usageRights:"unknown",safeToGenerate:false,reason:"User must confirm reference and variant."};
export default function ArtworkPreflightPanel({runId}:{runId:string}){
 const [brand,setBrand]=useState("");const [perfumeName,setPerfumeName]=useState("");
 const [referenceUrl,setReferenceUrl]=useState("");
 const [sourcePage,setSourcePage]=useState("");
 const [referenceUse,setReferenceUse]=useState<"research_only"|"licensed_generation">("research_only");
 const [rightsEvidence,setRightsEvidence]=useState("");
 const [uploadFile,setUploadFile]=useState<File|null>(null);
 const [uploadStatus,setUploadStatus]=useState("");
 const [artworkType,setArtworkType]=useState<GraphicsBrief["artworkType"]>("catalog_card");
 const [referenceApproved,setReferenceApproved]=useState(false);
 const [rightsConfirmed,setRightsConfirmed]=useState(false);
 const [bottleVisuallyVerified,setBottleVisuallyVerified]=useState(false);
 const [variantConfirmed,setVariantConfirmed]=useState(false);
 const [draftStatus,setDraftStatus]=useState("");
 const [proposalStatus,setProposalStatus]=useState("");
 const [requestStatus,setRequestStatus]=useState("");
 const [providerStatus,setProviderStatus]=useState("");
 const [providerChecks,setProviderChecks]=useState<{name:string;ready:boolean;detail:string}[]>([]);
 const [inspectionStatus,setInspectionStatus]=useState("");
 const [generationStatus,setGenerationStatus]=useState("");
 const [previewUrl,setPreviewUrl]=useState("");
 const [generating,setGenerating]=useState(false);
 const [requestCount,setRequestCount]=useState<number|null>(null);
 const [proposalPrompt,setProposalPrompt]=useState("");
 useEffect(()=>{let active=true;(async()=>{try{const response=await fetch("/api/graphics/review-draft?runId="+encodeURIComponent(runId));const result=await response.json() as {ok?:boolean;draft?:Record<string,unknown>;savedAt?:string};if(!active)return;if(!response.ok||!result.ok){setDraftStatus("Could not load saved draft.");return;}const d=result.draft;if(!d)return;
 if(typeof d.brand==="string")setBrand(d.brand);
 if(typeof d.perfumeName==="string")setPerfumeName(d.perfumeName);
 if(typeof d.referenceUrl==="string")setReferenceUrl(d.referenceUrl);
 if(typeof d.sourcePage==="string")setSourcePage(d.sourcePage);
 if(d.referenceUse==="licensed_generation")setReferenceUse("licensed_generation");
 if(typeof d.rightsEvidence==="string")setRightsEvidence(d.rightsEvidence);
 if(["catalog_card","social_square","banner"].includes(String(d.artworkType)))setArtworkType(d.artworkType as GraphicsBrief["artworkType"]);
 setReferenceApproved(d.referenceApproved===true);setRightsConfirmed(d.rightsConfirmed===true);setBottleVisuallyVerified(d.bottleVisuallyVerified===true);setVariantConfirmed(d.variantConfirmed===true);
 setDraftStatus("Saved draft restored. Recheck all attestations before use.");
 }catch{if(active)setDraftStatus("Could not load saved draft.");}})();return()=>{active=false;};},[runId]);
 async function uploadReference(){
  if(!uploadFile)return;
  setUploadStatus("Uploading private reference…");
  const form=new FormData();form.set("runId",runId);form.set("image",uploadFile);
  try{
   const response=await fetch("/api/graphics/upload-reference",{method:"POST",body:form});
   const result=await response.json() as {ok?:boolean;reason?:string;referenceUrl?:string};
   if(response.ok&&result.ok&&result.referenceUrl){
    setReferenceUrl(result.referenceUrl);setReferenceApproved(false);setRightsConfirmed(false);setBottleVisuallyVerified(false);setVariantConfirmed(false);
    setUploadStatus("Private image saved. Inspect the original and confirm rights and bottle identity before approving.");
   }else setUploadStatus(result.reason??"Upload failed.");
  }catch{setUploadStatus("Upload failed.");}
 }
 async function inspectReference(){setInspectionStatus("Checking reference…");try{const response=await fetch("/api/graphics/inspect-reference",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({referenceUrl,runId})});const result=await response.json() as {ok?:boolean;reason?:string;inspection?:{ok:boolean;reason:string}};setInspectionStatus(result.inspection?.reason??result.reason??"Inspection failed.");}catch{setInspectionStatus("Inspection request failed.");}}
 async function checkProvider(){setProviderStatus("Checking provider configuration…");try{const response=await fetch("/api/graphics/provider-status");const result=await response.json() as {ok?:boolean;reason?:string;readiness?:{provider:string;configured:boolean;generationEnabled:boolean;missing:string[];message:string;checks?:{name:string;ready:boolean;detail:string}[]}};if(!response.ok||!result.ok){setProviderStatus(result.reason??"Provider check failed.");return;}const r=result.readiness;if(r){setProviderStatus(r.message);setProviderChecks(r.checks??[]);}}catch{setProviderStatus("Provider check failed.");}}
 async function generatePreview(){
  if(!window.confirm("Generate a new private graphics preview using your saved review draft? This sends the reference image to OpenAI and may incur API charges. It does not approve or publish artwork."))return;
  setGenerating(true);setGenerationStatus("Generating preview…");setPreviewUrl("");
  try{const response=await fetch("/api/graphics/generate-preview",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({runId})});const result=await response.json() as {ok:boolean;reason:string;imageDataUrl?:string};setGenerationStatus(result.reason??"Generation failed.");if(response.ok&&result.ok&&result.imageDataUrl)setPreviewUrl(result.imageDataUrl);}catch{setGenerationStatus("Generation request failed.");}finally{setGenerating(false);}
 }
 async function recordRequest(){setRequestStatus("Recording request…");try{const response=await fetch("/api/graphics/requests",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({runId})});const result=await response.json() as {ok?:boolean;reason?:string;blockers?:string[]};setRequestStatus(response.ok&&result.ok?"Request recorded — awaiting image-generation provider.":(result.reason??"Request failed.")+(result.blockers?.length?" "+result.blockers.join(" "):""));if(response.ok&&result.ok)void loadRequests();}catch{setRequestStatus("Request failed.");}}
 async function loadRequests(){try{const response=await fetch("/api/graphics/requests?runId="+encodeURIComponent(runId));const result=await response.json() as {ok?:boolean;requests?:unknown[]};if(response.ok&&result.ok)setRequestCount(result.requests?.length??0);}catch{setRequestStatus("Could not load request history.");}}
 async function prepareJob(){setProposalStatus("Preparing proposal…");setProposalPrompt("");try{const response=await fetch("/api/graphics/prepare-job",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({runId})});const result=await response.json() as {ok?:boolean;reason?:string;proposal?:{status:string;blockers:string[];prompt:string|null}};if(!response.ok||!result.ok){setProposalStatus(result.reason??"Preparation failed.");return;}const proposal=result.proposal;if(!proposal){setProposalStatus("No proposal returned.");return;}if(proposal.status==="blocked"){setProposalStatus("Blocked: "+proposal.blockers.join(" "));return;}setProposalPrompt(proposal.prompt??"");setProposalStatus("Proposal prepared from your last saved draft. No image has been generated.");}catch{setProposalStatus("Preparation failed.");}}
 async function saveDraft(){setDraftStatus("Saving draft…");try{const response=await fetch("/api/graphics/review-draft",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({runId,brief:{brand,perfumeName,referenceUrl,artworkType,referenceApproved,rightsConfirmed:referenceUse==="licensed_generation"&&rightsConfirmed&&Boolean(rightsEvidence.trim()),bottleVisuallyVerified,variantConfirmed,sourcePage,referenceUse,rightsEvidence}})});const result=await response.json() as {ok?:boolean;reason?:string};setDraftStatus(response.ok&&result.ok?"Draft saved. This does not authorize image generation or publishing.":result.reason??"Draft save failed.");}catch{setDraftStatus("Draft save failed.");}}
 const brief:GraphicsBrief={brand,perfumeName,referenceUrl,artworkType,referenceApproved,rightsConfirmed:referenceUse==="licensed_generation"&&rightsConfirmed&&Boolean(rightsEvidence.trim()),bottleVisuallyVerified,variant:variantConfirmed?candidate:undefined};
 const preflight=evaluateGraphicsPreflight(brief);
 const sourceLeads=discoverReferenceSources(brand,perfumeName);
 return <section className="approval-panel" aria-label="Graphics preparation checklist">
  <h4>Graphics preparation</h4>
  <p>Prepare a bottle-faithful artwork brief. This checklist does not create, approve, upload or publish an image. Verify the actual reference before checking confirmations.</p>
  <div><label>Brand <input value={brand} onChange={e=>setBrand(e.target.value)} placeholder="Perfume brand"/></label></div>
  <div><label>Perfume name <input value={perfumeName} onChange={e=>setPerfumeName(e.target.value)} placeholder="Exact fragrance and edition"/></label></div>
  <details><summary>Research product photo sources (no image download)</summary><p>Curated research leads only. These pages are not verified manufacturer sources, image licenses, or proof of bottle identity. Never assume their images are cleared for reuse.</p>{sourceLeads.leads.length? <ul>{sourceLeads.leads.map(lead=><li key={lead.url}><a href={lead.url} target="_blank" rel="noopener noreferrer">{lead.name}</a> — rights and bottle identity unverified</li>)}</ul>:<p>No curated leads for this product yet. Manual source research required.</p>}</details>
  <div><label>Artwork type <select value={artworkType} onChange={e=>setArtworkType(e.target.value as GraphicsBrief["artworkType"])}><option value="catalog_card">Catalog card</option><option value="social_square">Social square</option><option value="banner">Banner</option></select></label></div>
  <div><label>Upload private bottle reference (PNG, JPG, or WebP, up to 8 MiB) <input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>setUploadFile(e.target.files?.[0]??null)}/></label><button type="button" disabled={!uploadFile} onClick={()=>void uploadReference()}>Upload reference to private R2</button>{uploadStatus&&<p role="status">{uploadStatus}</p>}</div>
  <div><label>Reference image URL <input type="url" value={referenceUrl} onChange={e=>setReferenceUrl(e.target.value)} placeholder="https://..." /></label></div>
  <fieldset><legend>Reference use and rights (choose one)</legend>
   <label><input type="radio" name="referenceUse" checked={referenceUse==="research_only"} onChange={()=>{setReferenceUse("research_only");setRightsConfirmed(false);}}/> Internal visual research only — do not send this image to an AI provider, reproduce, or publish it.</label>
   <label><input type="radio" name="referenceUse" checked={referenceUse==="licensed_generation"} onChange={()=>{setReferenceUse("licensed_generation");setRightsConfirmed(false);}}/> Licensed/permission-verified generation — may use the image as a generation input after review.</label>
   <label>Original source page <input type="url" value={sourcePage} onChange={e=>setSourcePage(e.target.value)} placeholder="https://source.example/product"/></label>
   <label>Rights evidence / permission details <textarea value={rightsEvidence} onChange={e=>{setRightsEvidence(e.target.value);setRightsConfirmed(false);}} placeholder="License, rights holder authorization, and permitted AI/commercial uses"/></label>
   {referenceUse==="research_only"&&<p role="status">Research-only reference: generation using this image is blocked. Obtain permission or use a separately licensed reference before generating. Independent designs must not reproduce protected photo composition or branding inaccurately.</p>}
  </fieldset>
  <div><label><input type="checkbox" checked={referenceApproved} onChange={e=>setReferenceApproved(e.target.checked)}/> I inspected and approved the actual reference image</label></div>
  <div><label><input type="checkbox" checked={rightsConfirmed} disabled={referenceUse!=="licensed_generation"||!rightsEvidence.trim()} onChange={e=>setRightsConfirmed(e.target.checked)}/> I confirmed permission or licensing for intended image use</label></div>
  <div><label><input type="checkbox" checked={bottleVisuallyVerified} onChange={e=>setBottleVisuallyVerified(e.target.checked)}/> I verified the bottle shape, cap, label and logo visually</label></div>
  <div><label><input type="checkbox" checked={variantConfirmed} onChange={e=>setVariantConfirmed(e.target.checked)}/> I verified the exact product variant</label></div>
  <p role="status"><strong>{preflight.ready?"Preflight complete — generation requires saved draft and enabled provider":"Preflight blocked"}</strong></p>
  {preflight.blockers.length>0&&<ul>{preflight.blockers.map(item=><li key={item}>{item}</li>)}</ul>}
  {preflight.ready&&<div><h5>Generation instructions</h5><ul>{preflight.instructions.map(item=><li key={item}>{item}</li>)}</ul></div>}
  <button type="button" onClick={()=>void saveDraft()}>Save review draft</button>
  {draftStatus&&<p role="status">{draftStatus}</p>}
  <button type="button" onClick={()=>void prepareJob()}>Prepare generation proposal from saved draft</button>
  {proposalStatus&&<p role="status">{proposalStatus}</p>}
  {proposalPrompt&&<pre style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{proposalPrompt}</pre>}
  <button type="button" onClick={()=>void inspectReference()}>Inspect reference image</button>
  {inspectionStatus&&<p role="status">{inspectionStatus}</p>}
  <button type="button" onClick={()=>void checkProvider()}>Check graphics provider</button>
  {providerStatus&&<p role="status">{providerStatus}</p>}
  {providerChecks.length>0&&<ul>{providerChecks.map(check=><li key={check.name}>{check.ready?"Ready":"Needs attention"} — {check.name}: {check.detail}</li>)}</ul>}
  <button type="button" disabled={generating} onClick={()=>void generatePreview()}>{generating?"Generating…":"Generate private preview (OpenAI)"}</button>
  {generationStatus&&<p role="status">{generationStatus}</p>}
  {previewUrl&&<div><p>Unapproved generated preview — inspect bottle accuracy before use. Not saved or published.</p><img src={previewUrl} alt="Unapproved generated perfume graphics preview" style={{maxWidth:"100%",height:"auto"}}/></div>}
  <button type="button" onClick={()=>void recordRequest()}>Record generation request</button>
  <button type="button" onClick={()=>void loadRequests()}>Refresh request history</button>
  {requestStatus&&<p role="status">{requestStatus}</p>}
  {requestCount!==null&&<p>{requestCount} recorded request(s), awaiting provider integration. No images generated.</p>}
  <small>Saved confirmations are review notes only, not authorization to generate or publish artwork.</small>
 </section>;
}
