/** Pure job planner. Does not call an image provider or persist jobs. */
export type GraphicJob={id:string;perfumeId:string;brand:string;perfumeName:string;format:"product-card"|"editorial-banner";prompt:string;status:"queued";requiresIdentityReview:true;requiresRightsReview:true};
export type GraphicJobInput={perfumeId:string;brand:string;perfumeName:string;format:"product-card"|"editorial-banner"};
export function planGraphicGenerationJobs(inputs:GraphicJobInput[],limit=10):{queued:GraphicJob[];held:{index:number;reason:string}[]}{
 const queued:GraphicJob[]=[];const held:{index:number;reason:string}[]=[];const seen=new Set<string>();
 const cap=Number.isSafeInteger(limit)&&limit>0?Math.min(limit,25):10;
 inputs.forEach((item,index)=>{
  const id=item.perfumeId.trim(),brand=item.brand.trim(),name=item.perfumeName.trim();
  if(!id||!brand||!name){held.push({index,reason:"MISSING_PERFUME_IDENTITY"});return;}
  if(item.format!=="product-card"&&item.format!=="editorial-banner"){held.push({index,reason:"INVALID_GRAPHIC_FORMAT"});return;}
  const key=id+"|"+item.format;
  if(seen.has(key)){held.push({index,reason:"DUPLICATE_GRAPHIC_JOB"});return;}seen.add(key);
  if(queued.length>=cap){held.push({index,reason:"BATCH_LIMIT_REACHED"});return;}
  queued.push({id:"graphic-"+index+"-"+id,perfumeId:id,brand,perfumeName:name,format:item.format,status:"queued",requiresIdentityReview:true,requiresRightsReview:true,prompt:item.format==="product-card"?
   "Create original editorial perfume-inspired artwork for "+brand+" "+name+". Do not invent brand logos, bottle labels, or packaging. Do not imply the illustration is an official product photograph.":
   "Create an original fragrance-themed editorial banner inspired by "+brand+" "+name+". Avoid trademarked logos, counterfeit bottle imagery, and misleading official branding."});
 });
 return {queued,held};
}
