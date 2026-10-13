/** Provenance metadata for AI-generated or licensed perfume artwork. No writes performed. */
export type GraphicProvenance={
 perfumeId:string;brand:string;perfumeName:string;
 origin:"generated"|"licensed";
 sourceUrl?:string;licenseReference?:string;generationJobId?:string;
 reviewedIdentity:boolean;rightsCleared:boolean;
};
export function validateGraphicProvenance(value:GraphicProvenance):{ok:boolean;reasons:string[]}{
 const reasons:string[]=[];
 if(!value.perfumeId.trim()||!value.brand.trim()||!value.perfumeName.trim())reasons.push("MISSING_PERFUME_IDENTITY");
 if(value.origin==="generated"){
  if(!value.generationJobId?.trim())reasons.push("MISSING_GENERATION_JOB");
 }else if(value.origin==="licensed"){
  if(!value.sourceUrl?.trim()||!value.licenseReference?.trim())reasons.push("MISSING_LICENSE_EVIDENCE");
  else{try{const url=new URL(value.sourceUrl);if(url.protocol!=="https:")reasons.push("INVALID_SOURCE_URL")}catch{reasons.push("INVALID_SOURCE_URL")}}
 }else reasons.push("UNSUPPORTED_IMAGE_ORIGIN");
 if(!value.reviewedIdentity)reasons.push("PERFUME_IDENTITY_UNVERIFIED");
 if(!value.rightsCleared)reasons.push("IMAGE_RIGHTS_UNVERIFIED");
 return {ok:reasons.length===0,reasons};
}
