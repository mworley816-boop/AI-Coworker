"use client";
import {useState} from "react";
import {evaluateGraphicsPreflight} from "@/lib/graphics/generation-preflight";
import type {GraphicsBrief} from "@/lib/graphics/generation-preflight";
import type {BottleVariantAssessment} from "@/lib/graphics/bottle-variant-matching";
const candidate: BottleVariantAssessment={status:"candidate",matchedFields:["brand","perfumeName"],missingFields:[],conflicts:[],requiresVisualVerification:true,usageRights:"unknown",safeToGenerate:false,reason:"User must confirm reference and variant."};
export default function ArtworkPreflightPanel(){
 const [brand,setBrand]=useState("");const [perfumeName,setPerfumeName]=useState("");
 const [referenceUrl,setReferenceUrl]=useState("");
 const [artworkType,setArtworkType]=useState<GraphicsBrief["artworkType"]>("catalog_card");
 const [referenceApproved,setReferenceApproved]=useState(false);
 const [rightsConfirmed,setRightsConfirmed]=useState(false);
 const [bottleVisuallyVerified,setBottleVisuallyVerified]=useState(false);
 const [variantConfirmed,setVariantConfirmed]=useState(false);
 const brief:GraphicsBrief={brand,perfumeName,referenceUrl,artworkType,referenceApproved,rightsConfirmed,bottleVisuallyVerified,variant:variantConfirmed?candidate:undefined};
 const preflight=evaluateGraphicsPreflight(brief);
 return <section className="approval-panel" aria-label="Graphics preparation checklist">
  <h4>Graphics preparation</h4>
  <p>Prepare a bottle-faithful artwork brief. This checklist does not create, approve, upload or publish an image. Verify the actual reference before checking confirmations.</p>
  <div><label>Brand <input value={brand} onChange={e=>setBrand(e.target.value)} placeholder="Perfume brand"/></label></div>
  <div><label>Perfume name <input value={perfumeName} onChange={e=>setPerfumeName(e.target.value)} placeholder="Exact fragrance and edition"/></label></div>
  <div><label>Artwork type <select value={artworkType} onChange={e=>setArtworkType(e.target.value as GraphicsBrief["artworkType"])}><option value="catalog_card">Catalog card</option><option value="social_square">Social square</option><option value="banner">Banner</option></select></label></div>
  <div><label>Reference image URL <input type="url" value={referenceUrl} onChange={e=>setReferenceUrl(e.target.value)} placeholder="https://..." /></label></div>
  <div><label><input type="checkbox" checked={referenceApproved} onChange={e=>setReferenceApproved(e.target.checked)}/> I inspected and approved the actual reference image</label></div>
  <div><label><input type="checkbox" checked={rightsConfirmed} onChange={e=>setRightsConfirmed(e.target.checked)}/> I confirmed permission or licensing for intended image use</label></div>
  <div><label><input type="checkbox" checked={bottleVisuallyVerified} onChange={e=>setBottleVisuallyVerified(e.target.checked)}/> I verified the bottle shape, cap, label and logo visually</label></div>
  <div><label><input type="checkbox" checked={variantConfirmed} onChange={e=>setVariantConfirmed(e.target.checked)}/> I verified the exact product variant</label></div>
  <p role="status"><strong>{preflight.ready?"Preflight complete — generation remains a separate, unavailable step":"Preflight blocked"}</strong></p>
  {preflight.blockers.length>0&&<ul>{preflight.blockers.map(item=><li key={item}>{item}</li>)}</ul>}
  {preflight.ready&&<div><h5>Generation instructions</h5><ul>{preflight.instructions.map(item=><li key={item}>{item}</li>)}</ul></div>}
  <small>Confirmations are local to this page; they are not saved as approvals.</small>
 </section>;
}
