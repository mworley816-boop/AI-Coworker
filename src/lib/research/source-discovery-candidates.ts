import {planPerfumeSourceRetrieval} from "../scentmarked-perfume-source-retrieval-policy.ts";
/** Pure screening of externally discovered links. No network access or publishing. */
export function screenDiscoveredManufacturerUrls(house:string,urls:readonly string[]){
 const seen=new Set<string>();
 const accepted:{url:string;sourceVerified:false;manualReviewRequired:true}[]=[];
 const rejected:{url:string;reason:string}[]=[];
 for(const raw of urls.slice(0,30)){
  if(typeof raw!=="string"||raw.length>1500){rejected.push({url:String(raw).slice(0,1500),reason:"INVALID_URL"});continue;}
  const plan=planPerfumeSourceRetrieval(house,raw);
  if(!plan.ok){rejected.push({url:raw,reason:plan.reason});continue;}
  if(seen.has(plan.url))continue;
  seen.add(plan.url);
  accepted.push({url:plan.url,sourceVerified:false,manualReviewRequired:true});
 }
 return {accepted,rejected,manualReviewRequired:true as const};
}
