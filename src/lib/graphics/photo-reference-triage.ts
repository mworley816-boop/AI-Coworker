/**
 * Conservative photo-reference triage for fragrance artwork.
 * Search snippets are leads, not image verification or reuse permission.
 */
export type PhotoReference={url:string;title:string;sourceHost:string;productMatch:"candidate"|"insufficient";reason:string;usageRights:"unknown";manualReviewRequired:true};
const generic=new Set(["the","and","for","with","perfume","fragrance","eau","de","parfum","edp","edt","spray","by"]);
export function triagePhotoReferences(sources:{url:string;title:string;sourceHost:string;snippet?:string}[],brand:string,perfume:string):PhotoReference[]{
 const tokens=(value:string)=>[...new Set((value.toLowerCase().match(/[a-z0-9]+/g)??[]).filter(t=>t.length>2&&!generic.has(t)))];
 const brandTokens=tokens(brand),productTokens=tokens(perfume);
 return sources.map(source=>{
  const haystack=(source.title+" "+source.url+" "+(source.snippet??"")).toLowerCase().replace(/[^a-z0-9]+/g," ");
  const words=new Set(haystack.split(/\s+/));
  const brandMatch=brandTokens.length>0&&brandTokens.every(t=>words.has(t));
  const productMatch=productTokens.length>0&&productTokens.every(t=>words.has(t));
  const candidate=brandMatch&&productMatch;
  return {url:source.url,title:source.title,sourceHost:source.sourceHost,productMatch:candidate?"candidate":"insufficient",reason:candidate?"Brand and fragrance name occur in search metadata; inspect original page and bottle photograph.":"Brand or fragrance name not fully matched in search metadata.",usageRights:"unknown",manualReviewRequired:true};
 });
}
