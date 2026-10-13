import {extractExplicitMetaNotes} from "./scentmarked-perfume-html-meta-notes";
/** Conservative extraction of fragrance fields from source HTML.
 * No script execution, remote fetching, or automatic approval.
 */
export type ExtractedPerfumeFacts={name:string|null;notes:string[];evidence:"jsonld"|"jsonld+meta"|"none"};
export function extractPerfumeFacts(html:string):ExtractedPerfumeFacts{
 if(typeof html!=="string"||html.length>250_000)return {name:null,notes:[],evidence:"none"};
 const blocks=[...html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script\s*>/gi)].slice(0,20);
 for(const block of blocks){
  let parsed:unknown;
  try{parsed=JSON.parse(block[1])}catch{continue}
  const roots=Array.isArray(parsed)?parsed:[parsed];
  for(const root of roots){
   if(!root||typeof root!=="object")continue;
   const graph=(root as Record<string,unknown>)["@graph"];
   const items=Array.isArray(graph)?graph:[root];
   for(const item of items){
    if(!item||typeof item!=="object")continue;
    const obj=item as Record<string,unknown>;
    const types=Array.isArray(obj["@type"])?obj["@type"]:[obj["@type"]];
    if(!types.includes("Product"))continue;
    const name=typeof obj.name==="string"?obj.name.trim().slice(0,180):null;
    if(!name)continue;
    const notes: string[]=[];
    const additional=Array.isArray(obj.additionalProperty)?obj.additionalProperty:[];
    for(const property of additional){
     if(!property||typeof property!=="object")continue;
     const p=property as Record<string,unknown>;
     if(typeof p.name!=="string"||!/(fragrance|scent|top|middle|heart|base).*notes?/i.test(p.name))continue;
     const values=typeof p.value==="string"?p.value.split(/[,;]+/):[];
     for(const value of values){const v=value.trim();if(v&&v.length<=100&&!notes.includes(v))notes.push(v);if(notes.length>=40)break}
    }
    if(!notes.length){const metaNotes=extractExplicitMetaNotes(html);if(metaNotes.length)return {name,notes:metaNotes,evidence:"jsonld+meta"}}
    return {name,notes,evidence:"jsonld"};
   }
  }
 }
 return {name:null,notes:[],evidence:"none"};
}
