/** Extract explicit note lists from HTML meta tags, without interpreting prose. */
export function extractExplicitMetaNotes(html:string):string[]{
 if(typeof html!=="string"||html.length>250_000)return [];
 const notes:string[]=[];
 const tags=html.match(/<meta\b[^>]*>/gi)?.slice(0,250)??[];
 for(const tag of tags){
  const attrs:Record<string,string>={};
  for(const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g))attrs[match[1].toLowerCase()]=match[2]??match[3]??"";
  const key=(attrs.name??attrs.property??"").toLowerCase();
  if(!/^(?:fragrance[-_:]?)?(?:top|heart|middle|base)[-_:]?notes$/.test(key)&&!/^fragrance[-_:]?notes$/.test(key))continue;
  for(const part of (attrs.content??"").split(/[,;]+/)){
   const note=part.trim();
   if(note&&note.length<=100&&!notes.includes(note))notes.push(note);
   if(notes.length>=40)return notes;
  }
 }
 return notes;
}
