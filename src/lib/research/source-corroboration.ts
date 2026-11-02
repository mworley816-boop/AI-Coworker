/** Evidence-host accounting for research review, not factual verification. */
export type ResearchSource={url:string;note:string};
export function summarizeSourceCorroboration(sources:readonly ResearchSource[]){
 const hosts=new Set<string>();
 const invalidSources:number[]=[];
 sources.forEach((source,index)=>{
  try{
   const url=new URL(source.url);
   if(url.protocol!=="https:"||!url.hostname||url.username||url.password||!source.note.trim()){invalidSources.push(index);return;}
   hosts.add(url.hostname.toLowerCase().replace(/^www\./,""));
  }catch{invalidSources.push(index);}
 });
 return {
  submittedSourceCount:sources.length,
  validSourceCount:sources.length-invalidSources.length,
  distinctHostCount:hosts.size,
  invalidSourceIndices:invalidSources,
  hasMultipleHosts:hosts.size>=2,
  manualReviewRequired:true as const
 };
}
