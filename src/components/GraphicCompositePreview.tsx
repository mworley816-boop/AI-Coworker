"use client";
import {useEffect,useRef,useState} from "react";

/** Local-only composite. Both files stay in the browser; no generation or publishing. */
export default function GraphicCompositePreview({referenceId,backgroundJobId}:{referenceId?:string;backgroundJobId?:string}){
 const canvas=useRef<HTMLCanvasElement>(null);
 const [background,setBackground]=useState<File|null>(null);
 const [bottle,setBottle]=useState<File|null>(null);
 const [referenceBusy,setReferenceBusy]=useState(false);
 const [backgroundBusy,setBackgroundBusy]=useState(false);
 const [scale,setScale]=useState(58);
 const [vertical,setVertical]=useState(55);
 const [message,setMessage]=useState("Select a background and an authorized transparent PNG bottle cutout.");
 useEffect(()=>{
  if(!background||!bottle)return;
  let cancelled=false;const urls:string[]=[];
  async function load(file:File){const url=URL.createObjectURL(file);urls.push(url);const img=new Image();img.src=url;await img.decode();return img}
  (async()=>{try{
   if(!background||!bottle)return;
   const [bg,product]=await Promise.all([load(background),load(bottle)]);
   if(cancelled)return;
   const c=canvas.current;if(!c)return;
   c.width=1024;c.height=1024;const ctx=c.getContext("2d");if(!ctx)throw Error("Canvas unavailable");
   const crop=Math.max(1024/bg.width,1024/bg.height),bw=bg.width*crop,bh=bg.height*crop;
   ctx.clearRect(0,0,1024,1024);ctx.drawImage(bg,(1024-bw)/2,(1024-bh)/2,bw,bh);
   const maxW=1024*scale/100,maxH=1024*.82,ratio=Math.min(maxW/product.width,maxH/product.height);
   const w=product.width*ratio,h=product.height*ratio;
   ctx.drawImage(product,(1024-w)/2,(1024-h)*vertical/100,w,h);
   setMessage("Private composite ready. Check edges, background transparency, and bottle accuracy before using.");
  }catch{if(!cancelled)setMessage("Could not composite these images. Use valid PNG/JPEG files and a transparent bottle cutout.")}})();
  return()=>{cancelled=true;urls.forEach(u=>URL.revokeObjectURL(u))}
 },[background,bottle,scale,vertical]);
 async function loadGeneratedBackground(){if(!backgroundJobId)return;setBackgroundBusy(true);try{const r=await fetch("/api/scentmarked-content/graphics/preview?id="+encodeURIComponent(backgroundJobId),{cache:"no-store"});const data=await r.json();if(!r.ok||!data.ok||typeof data.url!=="string")throw Error("Generated background is unavailable");const imageResponse=await fetch(data.url,{cache:"no-store"});if(!imageResponse.ok)throw Error("Could not download private background");const blob=await imageResponse.blob();if(blob.type!=="image/png"&&blob.type!=="image/jpeg")throw Error("Unexpected background format");if(blob.size>5_000_000)throw Error("Background is too large");setBackground(new File([blob],"atlas-background.png",{type:blob.type}));setMessage("Generated background loaded privately. Check that it contains no invented perfume bottle.")}catch(e){setMessage(e instanceof Error?e.message:"Could not load generated background")}finally{setBackgroundBusy(false)}}
 async function loadStoredBottle(){if(!referenceId)return;setReferenceBusy(true);try{const response=await fetch("/api/scentmarked-content/graphics/photo-references/private-image?referenceId="+encodeURIComponent(referenceId),{cache:"no-store"});if(!response.ok)throw Error("Unable to load saved photo");const blob=await response.blob();if(blob.type!=="image/png")throw Error("Saved image must be a transparent PNG cutout for compositing. JPEG originals need background removal first.");setBottle(new File([blob],"approved-bottle.png",{type:"image/png"}));setMessage("Saved original loaded privately. Confirm it has a transparent background.")}catch(e){setMessage(e instanceof Error?e.message:"Unable to load saved photo")}finally{setReferenceBusy(false)}}
 function save(){const c=canvas.current;if(!c||!background||!bottle)return;const a=document.createElement("a");a.download="atlas-private-product-composite.png";a.href=c.toDataURL("image/png");a.click()}
 return <section style={{border:"1px solid #888",padding:12,marginTop:16}}><h3>Authentic bottle composite — private preview</h3><p>Use a real, rights-cleared bottle cutout with transparent background. Atlas will not invent bottle details.</p>{backgroundJobId&&<button type="button" disabled={backgroundBusy} onClick={()=>void loadGeneratedBackground()}>{backgroundBusy?"Loading background…":"Use selected generated background"}</button>}<label style={{display:"block"}}>Background PNG/JPEG <input type="file" accept="image/png,image/jpeg" onChange={e=>setBackground(e.target.files?.[0]??null)}/></label>{referenceId&&<button type="button" disabled={referenceBusy} onClick={()=>void loadStoredBottle()}>{referenceBusy?"Loading saved bottle…":"Use saved approved bottle"}</button>}<label style={{display:"block"}}>Authentic transparent bottle PNG <input type="file" accept="image/png" onChange={e=>setBottle(e.target.files?.[0]??null)}/></label><label style={{display:"block"}}>Bottle width: {scale}% <input type="range" min="20" max="90" value={scale} onChange={e=>setScale(Number(e.target.value))}/></label><label style={{display:"block"}}>Bottle vertical position: {vertical}% <input type="range" min="0" max="100" value={vertical} onChange={e=>setVertical(Number(e.target.value))}/></label><canvas ref={canvas} aria-label="Private composite preview" style={{display:background&&bottle?"block":"none",width:"100%",maxWidth:480,height:"auto",marginTop:12}}/><p role="status">{message}</p><button type="button" disabled={!background||!bottle} onClick={save}>Download private composite PNG</button><p>No automatic upload, publication, or paid generation.</p></section>
}
