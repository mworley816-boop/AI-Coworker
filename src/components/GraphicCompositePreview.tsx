"use client";
import {useEffect,useRef,useState} from "react";

/** Local-only composite. Both files stay in the browser; no generation or publishing. */
export default function GraphicCompositePreview({referenceId,backgroundJobId}:{referenceId?:string;backgroundJobId?:string}){
 const canvas=useRef<HTMLCanvasElement>(null);
 const [background,setBackground]=useState<File|null>(null);
 const [bottle,setBottle]=useState<File|null>(null);
 const [referenceBusy,setReferenceBusy]=useState(false);
 const [backgroundBusy,setBackgroundBusy]=useState(false);
 const [saving,setSaving]=useState(false);
 const [verifiedBottleId,setVerifiedBottleId]=useState<string|null>(null);
 const [verifiedBackgroundId,setVerifiedBackgroundId]=useState<string|null>(null);
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
 async function prepareSimpleCutout(){if(!cutoutFile)return;setCutoutBusy(true);try{
 const url=URL.createObjectURL(cutoutFile);try{
 const img=new Image();img.src=url;await img.decode();
 if(img.width*img.height>12_000_000)throw Error("Photo too large; use a smaller source image");
 const c=document.createElement("canvas");c.width=img.width;c.height=img.height;const ctx=c.getContext("2d",{willReadFrequently:true});if(!ctx)throw Error("Canvas unavailable");ctx.drawImage(img,0,0);
 const frame=ctx.getImageData(0,0,c.width,c.height),d=frame.data,w=c.width,h=c.height;
 const corners=[[0,0],[w-1,0],[0,h-1],[w-1,h-1]];const rgb=[0,1,2].map(k=>Math.round(corners.reduce((sum,[x,y])=>sum+d[(y*w+x)*4+k],0)/4));
 const threshold=cutoutTolerance*cutoutTolerance*3,visited=new Uint8Array(w*h),queue=new Int32Array(w*h);let head=0,tail=0;
 function add(x:number,y:number){const i=y*w+x;if(visited[i])return;visited[i]=1;const j=i*4;const distance=(d[j]-rgb[0])**2+(d[j+1]-rgb[1])**2+(d[j+2]-rgb[2])**2;if(distance<=threshold){d[j+3]=0;queue[tail++]=i}}
 for(let x=0;x<w;x++){add(x,0);add(x,h-1)}for(let y=0;y<h;y++){add(0,y);add(w-1,y)}
 while(head<tail){const i=queue[head++],x=i%w,y=(i-x)/w;if(x>0)add(x-1,y);if(x<w-1)add(x+1,y);if(y>0)add(x,y-1);if(y<h-1)add(x,y+1)}
 if(tail<w*h*.01)throw Error("Background not uniform enough for automatic edge removal. Use a manually prepared transparent PNG.");
 ctx.putImageData(frame,0,0);const blob=await new Promise<Blob|null>(resolve=>c.toBlob(resolve,"image/png"));if(!blob)throw Error("Could not export cutout");
 setBottle(new File([blob],"local-bottle-cutout.png",{type:"image/png"}));setVerifiedBottleId(null);setMessage("Local edge-background removal complete. Inspect bottle edges and transparent areas. This cutout is not automatically rights-cleared or saved as an approved reference.");
 }finally{URL.revokeObjectURL(url)}
 }catch(e){setMessage(e instanceof Error?e.message:"Could not prepare cutout")}finally{setCutoutBusy(false)}}
 async function loadGeneratedBackground(){if(!backgroundJobId)return;setBackgroundBusy(true);try{const r=await fetch("/api/scentmarked-content/graphics/preview?id="+encodeURIComponent(backgroundJobId),{cache:"no-store"});const data=await r.json();if(!r.ok||!data.ok||typeof data.url!=="string")throw Error("Generated background is unavailable");const imageResponse=await fetch(data.url,{cache:"no-store"});if(!imageResponse.ok)throw Error("Could not download private background");const blob=await imageResponse.blob();if(blob.type!=="image/png"&&blob.type!=="image/jpeg")throw Error("Unexpected background format");if(blob.size>5_000_000)throw Error("Background is too large");setBackground(new File([blob],"atlas-background.png",{type:blob.type}));setVerifiedBackgroundId(backgroundJobId);setMessage("Generated background loaded privately. Check that it contains no invented perfume bottle.")}catch(e){setMessage(e instanceof Error?e.message:"Could not load generated background")}finally{setBackgroundBusy(false)}}
 async function loadStoredBottle(){if(!referenceId)return;setReferenceBusy(true);try{const response=await fetch("/api/scentmarked-content/graphics/photo-references/private-image?referenceId="+encodeURIComponent(referenceId),{cache:"no-store"});if(!response.ok)throw Error("Unable to load saved photo");const blob=await response.blob();if(blob.type!=="image/png")throw Error("Saved image must be a transparent PNG cutout for compositing. JPEG originals need background removal first.");setBottle(new File([blob],"approved-bottle.png",{type:"image/png"}));setVerifiedBottleId(referenceId);setMessage("Saved original loaded privately. Confirm it has a transparent background.")}catch(e){setMessage(e instanceof Error?e.message:"Unable to load saved photo")}finally{setReferenceBusy(false)}}
 async function savePrivate(){const c=canvas.current;if(!c||!background||!bottle||!referenceId||!backgroundJobId||verifiedBottleId!==referenceId||verifiedBackgroundId!==backgroundJobId){setMessage("Private review requires the saved approved bottle and selected Atlas-generated background. Local files can be downloaded but not linked to those records.");return;}setSaving(true);try{const blob=await new Promise<Blob|null>(resolve=>c.toBlob(resolve,"image/png"));if(!blob)throw Error("Could not encode composite");const form=new FormData();form.set("referenceId",referenceId);form.set("backgroundJobId",backgroundJobId);form.set("file",new File([blob],"composite.png",{type:"image/png"}));const r=await fetch("/api/scentmarked-content/graphics/composites",{method:"POST",body:form});const x=await r.json();if(!r.ok||!x.ok)throw Error(x.error??"Save failed");setMessage("Composite saved privately for review. Nothing published.")}catch(e){setMessage(e instanceof Error?e.message:"Could not save composite")}finally{setSaving(false)}}
 function save(){const c=canvas.current;if(!c||!background||!bottle)return;const a=document.createElement("a");a.download="atlas-private-product-composite.png";a.href=c.toDataURL("image/png");a.click()}
 return <section style={{border:"1px solid #888",padding:12,marginTop:16}}><h3>Authentic bottle composite — private preview</h3><p>Use a real, rights-cleared bottle cutout with transparent background. Atlas will not invent bottle details.</p>{backgroundJobId&&<button type="button" disabled={backgroundBusy} onClick={()=>void loadGeneratedBackground()}>{backgroundBusy?"Loading background…":"Use selected generated background"}</button>}<label style={{display:"block"}}>Background PNG/JPEG <input type="file" accept="image/png,image/jpeg" onChange={e=>{setBackground(e.target.files?.[0]??null);setVerifiedBackgroundId(null)}}/></label>{referenceId&&<button type="button" disabled={referenceBusy} onClick={()=>void loadStoredBottle()}>{referenceBusy?"Loading saved bottle…":"Use saved approved bottle"}</button>}<label style={{display:"block"}}>Authentic transparent bottle PNG <input type="file" accept="image/png" onChange={e=>{setBottle(e.target.files?.[0]??null);setVerifiedBottleId(null)}}/></label><fieldset><legend>Prepare a local bottle cutout (simple uniform backgrounds)</legend><label>Real bottle photo <input type="file" accept="image/png,image/jpeg" onChange={e=>setCutoutFile(e.target.files?.[0]??null)}/></label><label style={{display:"block"}}>Background color tolerance: {cutoutTolerance} <input type="range" min="5" max="90" value={cutoutTolerance} onChange={e=>setCutoutTolerance(Number(e.target.value))}/></label><button type="button" disabled={!cutoutFile||cutoutBusy} onClick={()=>void prepareSimpleCutout()}>{cutoutBusy?"Preparing…":"Remove simple background locally"}</button><p>Works best with plain, evenly lit backgrounds. Complex backgrounds and transparent glass need manual refinement. This does not certify image rights.</p></fieldset><label style={{display:"block"}}>Bottle width: {scale}% <input type="range" min="20" max="90" value={scale} onChange={e=>setScale(Number(e.target.value))}/></label><label style={{display:"block"}}>Bottle vertical position: {vertical}% <input type="range" min="0" max="100" value={vertical} onChange={e=>setVertical(Number(e.target.value))}/></label><canvas ref={canvas} aria-label="Private composite preview" style={{display:background&&bottle?"block":"none",width:"100%",maxWidth:480,height:"auto",marginTop:12}}/><p role="status">{message}</p><button type="button" disabled={!background||!bottle} onClick={save}>Download private composite PNG</button>{referenceId&&backgroundJobId&&<button type="button" disabled={!background||!bottle||saving||verifiedBottleId!==referenceId||verifiedBackgroundId!==backgroundJobId} onClick={()=>void savePrivate()}>{saving?"Saving privately…":"Save composite for review"}</button>}<p>Private saving requires images loaded from the linked Atlas records; manually selected files can only be downloaded. Saving a composite keeps it in private Atlas storage. No production publication or paid generation.</p></section>
}
