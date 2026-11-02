/** Pure source-validation gate for proposed perfume research records.
 * No network requests, database writes, or automatic publishing.
 */
export type PerfumeResearchCandidate={
 house:string;name:string;sourceUrl:string;sourceType:"manufacturer"|"retailer"|"community";notes:string[];evidenceSources?:{url:string;note:string}[];
};
export type PerfumeResearchValidation={ok:true;candidate:PerfumeResearchCandidate}|{ok:false;reason:string};
export function validatePerfumeResearchCandidate(input:PerfumeResearchCandidate):PerfumeResearchValidation{
 if(!input||typeof input.house!=="string"||typeof input.name!=="string"||!input.house.trim()||!input.name.trim()||input.house.length>120||input.name.length>180)return {ok:false,reason:"INVALID_IDENTITY"};
 if(input.sourceType!=="manufacturer"&&input.sourceType!=="retailer"&&input.sourceType!=="community")return {ok:false,reason:"INVALID_SOURCE_TYPE"};
 let url:URL;
 try{url=new URL(input.sourceUrl)}catch{return {ok:false,reason:"INVALID_SOURCE_URL"}}
 if(url.protocol!=="https:"||!url.hostname||url.username||url.password||url.hash||url.hostname==="localhost"||url.hostname.endsWith(".local")||url.hostname.endsWith(".internal")||/^\d+\.\d+\.\d+\.\d+$/.test(url.hostname))return {ok:false,reason:"INVALID_SOURCE_URL"};
 if(!Array.isArray(input.notes)||input.notes.length>40||input.notes.some(n=>typeof n!=="string"||!n.trim()||n.length>100))return {ok:false,reason:"INVALID_NOTES"};
 if(input.evidenceSources!==undefined){
  if(!Array.isArray(input.evidenceSources)||input.evidenceSources.length>12)return {ok:false,reason:"INVALID_EVIDENCE_SOURCES"};
  for(const source of input.evidenceSources){
   if(!source||typeof source.url!=="string"||typeof source.note!=="string"||!source.note.trim()||source.note.length>200||source.url.length>1500)return {ok:false,reason:"INVALID_EVIDENCE_SOURCES"};
   let evidenceUrl:URL;
   try{evidenceUrl=new URL(source.url)}catch{return {ok:false,reason:"INVALID_EVIDENCE_SOURCES"}}
   if(evidenceUrl.protocol!=="https:"||!evidenceUrl.hostname||evidenceUrl.username||evidenceUrl.password||evidenceUrl.hash||evidenceUrl.hostname==="localhost"||evidenceUrl.hostname.endsWith(".local")||evidenceUrl.hostname.endsWith(".internal")||evidenceUrl.hostname.split(".").every(part=>part.length>0&&part.split("").every(ch=>ch>="0"&&ch<="9")))return {ok:false,reason:"INVALID_EVIDENCE_SOURCES"};
  }
 }
 return {ok:true,candidate:{house:input.house.trim(),name:input.name.trim(),sourceUrl:url.toString(),sourceType:input.sourceType,notes:[...new Set(input.notes.map(n=>n.trim()))],...(input.evidenceSources?{evidenceSources:input.evidenceSources.map(s=>({url:new URL(s.url).toString(),note:s.note.trim()}))}:{})}};
}
