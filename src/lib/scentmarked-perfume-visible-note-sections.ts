/** Extracts only labeled top/heart/base lists inside an explicit Fragrance Notes section.
 * Input is plain visible text from a trusted product page, not arbitrary marketing prose.
 */
export function extractVisibleFragranceNotes(text:string):string[]{
 if(typeof text!=="string"||text.length>250_000)return [];
 const marker=/\bfragrance\s+notes\s*:/i.exec(text);
 if(!marker)return [];
 const section=text.slice(marker.index+marker[0].length,marker.index+marker[0].length+1800);
 const lines=section.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
 const notes:string[]=[];
 let groups=0;
 for(const line of lines.slice(0,25)){
  if(/^(?:product information|description|customer reviews|reviews|ingredients|upc barcode)\b/i.test(line))break;
  const match=/^(?:top|heart|middle|base)\s*(?:notes?)?\s*:\s*(.+)$/i.exec(line);
  if(!match){if(groups>0)break;continue}
  groups++;
  for(const part of match[1].split(/[,;]+/)){
   const note=part.trim().replace(/\.$/,"");
   if(note&&note.length<=100&&!notes.includes(note))notes.push(note);
   if(notes.length>=40)return notes;
  }
 }
 return groups>=2?notes:[];
}
