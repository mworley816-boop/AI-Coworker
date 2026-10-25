/**
 * Bottle variant metadata triage, not visual recognition.
 * Search text is never enough to authenticate a bottle or approve artwork.
 */
export type BottleVariantRequest={brand:string;perfumeName:string;sizeMl?:number;concentration?:string;edition?:string};
export type BottleVariantAssessment={status:"candidate"|"mismatch"|"insufficient";matchedFields:string[];missingFields:string[];conflicts:string[];requiresVisualVerification:true;usageRights:"unknown";safeToGenerate:false;reason:string};
const words=(s:string)=>new Set((s.toLowerCase().replace(/[^a-z0-9]+/g," ").trim().split(/\s+/)).filter(Boolean));
const contains=(text:Set<string>,value:string)=>value.toLowerCase().replace(/[^a-z0-9]+/g," ").trim().split(/\s+/).filter(Boolean).every(t=>text.has(t));
const normalizeConcentration=(s:string)=>s.toLowerCase().replace(/\beau de parfum\b/g,"edp").replace(/\beau de toilette\b/g,"edt").replace(/\bextrait de parfum\b/g,"extrait").trim();
export function assessBottleVariant(reference:{title:string;url:string;snippet?:string},request:BottleVariantRequest):BottleVariantAssessment{
 const metadata=[reference.title,reference.url,reference.snippet??""].join(" ");
 const tokens=words(metadata);
 const matchedFields:string[]=[],missingFields:string[]=[],conflicts:string[]=[];
 for(const [field,value] of [["brand",request.brand],["perfumeName",request.perfumeName]] as const){
  if(!value.trim()){missingFields.push(field);continue;}
  if(contains(tokens,value))matchedFields.push(field);else missingFields.push(field);
 }
 if(request.sizeMl!==undefined){
  if(!Number.isFinite(request.sizeMl)||request.sizeMl<=0){conflicts.push("invalid requested size");}
  else {
   const size=String(request.sizeMl).replace(".","\\.");
   const match=new RegExp("(?:^|[^0-9])"+size+"\\s*(?:ml|millilit(?:er|re)s?)(?![a-z])","i").test(metadata);
   const sizes=[...metadata.matchAll(/\b(\d+(?:\.\d+)?)\s*(?:ml|millilit(?:er|re)s?)\b/gi)].map(x=>Number(x[1]));
   if(match)matchedFields.push("sizeMl");
   else if(sizes.length>0)conflicts.push("size mismatch in metadata");
   else missingFields.push("sizeMl");
  }
 }
 if(request.concentration?.trim()){
  const target=normalizeConcentration(request.concentration);
  const normalized=normalizeConcentration(metadata);
  const forms=["edp","edt","extrait","cologne"];
  if(contains(words(normalized),target))matchedFields.push("concentration");
  else if(forms.some(f=>words(normalized).has(f)))conflicts.push("concentration mismatch in metadata");
  else missingFields.push("concentration");
 }
 if(request.edition?.trim()){
  if(contains(tokens,request.edition))matchedFields.push("edition");else missingFields.push("edition");
 }
 const required=["brand","perfumeName",...(request.sizeMl!==undefined?["sizeMl"]:[]),...(request.concentration?.trim()?["concentration"]:[]),...(request.edition?.trim()?["edition"]:[])];
 const status=conflicts.length?"mismatch":required.every(f=>matchedFields.includes(f))?"candidate":"insufficient";
 return {status,matchedFields,missingFields,conflicts,requiresVisualVerification:true,usageRights:"unknown",safeToGenerate:false,reason:status==="candidate"?"Requested variant metadata appears in search text; verify bottle image, authenticity and image rights manually.":status==="mismatch"?"Potential variant conflict in search text; do not use without investigation.":"Insufficient metadata to establish the requested bottle variant."};
}
