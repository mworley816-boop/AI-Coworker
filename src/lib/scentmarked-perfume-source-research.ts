import {fetchPerfumeSourcePage} from "./scentmarked-perfume-source-fetch";
import {extractPerfumeFacts} from "./scentmarked-perfume-source-extract";
import {extractVisibleFragranceNotes} from "./scentmarked-perfume-visible-note-sections";
import {validatePerfumeResearchCandidate,type PerfumeResearchCandidate} from "./scentmarked-perfume-research-policy";
/** On-demand research pipeline. Returns a proposed draft; never writes or publishes. */
export async function researchPerfumeSource(house:string,expectedName:string,url:string,fetcher:typeof fetch=fetch):
 Promise<{ok:true;candidate:PerfumeResearchCandidate}|{ok:false;reason:string}>{
 if(!house.trim()||!expectedName.trim())return {ok:false,reason:"INVALID_IDENTITY"};
 const fetched=await fetchPerfumeSourcePage(house,url,fetcher);
 if(!fetched.ok)return fetched;
 const facts=extractPerfumeFacts(fetched.html);
 if(!facts.name)return {ok:false,reason:"NO_STRUCTURED_PRODUCT"};
 const normalized=(s:string)=>s.normalize("NFKC").trim().toLowerCase().replace(/\s+/g," ");
 if(normalized(facts.name)!==normalized(expectedName))return {ok:false,reason:"PRODUCT_NAME_MISMATCH"};
 const visibleText=fetched.html.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi," ").replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi," ").replace(/<\/(?:p|div|section|li|h[1-6]|br)\s*>/gi,"\n").replace(/<br\b[^>]*>/gi,"\n").replace(/<[^>]+>/g," ").replace(/&nbsp;|&#160;/gi," ").replace(/&amp;/gi,"&");
 const notes=facts.notes.length?facts.notes:extractVisibleFragranceNotes(visibleText);
 if(notes.length===0)return {ok:false,reason:"NO_EXPLICIT_FRAGRANCE_NOTES"};
 const validated=validatePerfumeResearchCandidate({house,name:expectedName,sourceUrl:fetched.url,sourceType:"manufacturer",notes});
 if(!validated.ok)return {ok:false,reason:validated.reason};
 return {ok:true,candidate:validated.candidate};
}
