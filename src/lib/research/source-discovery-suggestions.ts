import {PERFUME_SOURCE_REGISTRY} from "../scentmarked-perfume-source-registry.ts";

/** Read-only discovery hints; never fetches, verifies or publishes a product. */
export function suggestManufacturerResearchSearches(house:string,perfumeName:string){
 const normalizedHouse=house.trim();
 const normalizedName=perfumeName.trim();
 if(!normalizedHouse||!normalizedName||normalizedHouse.length>120||normalizedName.length>180)return [];
 return PERFUME_SOURCE_REGISTRY.filter(entry=>entry.reviewed&&entry.house.toLowerCase()===normalizedHouse.toLowerCase()).map(entry=>({
  host:entry.host,
  query:`site:${entry.host} "${normalizedHouse.replaceAll('"',"")}" "${normalizedName.replaceAll('"',"")}"`,
  sourceVerified:false as const,
  manualReviewRequired:true as const
 }));
}
