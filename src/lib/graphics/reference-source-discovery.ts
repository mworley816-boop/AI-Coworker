/** Curated research leads, not scraped photographs or license grants. */
export type SourceLead={name:string;url:string;kind:"manufacturer_candidate"|"retailer"|"community";rights:"unverified";identity:"unverified"};
export type DiscoveryResult={status:"leads_found"|"no_curated_leads";product:string;leads:SourceLead[];requiresHumanReview:true;mayDownloadImages:false;mayGenerate:false;mayPublish:false};
const strawberry:SourceLead[]=[
 {name:"Arabian Scent product catalog (retailer; affiliation not verified)",url:"https://arabianscent.us/collections/all",kind:"retailer",rights:"unverified",identity:"unverified"},
 {name:"Auroud Perfumes product listing (retailer)",url:"https://auroudperfumes.com/products/arabiyat-sugar-strawberry-tred-leches-eau-de-parfum-3-4fl-oz",kind:"retailer",rights:"unverified",identity:"unverified"},
 {name:"Parfumo product profile (community)",url:"https://www.parfumo.com/Perfumes/arabiyat-sugar/strawberry-tres-leches",kind:"community",rights:"unverified",identity:"unverified"}
];
export function discoverReferenceSources(brand:string,perfumeName:string):DiscoveryResult{
 const b=brand.trim().toLowerCase().replace(/[^a-z0-9]/g,"");
 const p=perfumeName.trim().toLowerCase().replace(/[^a-z0-9]/g,"");
 const matched=(b==="arabiyat"||b==="arabiyatsugar")&&p.includes("strawberrytresleche");
 return {status:matched?"leads_found":"no_curated_leads",product:brand.trim()+" — "+perfumeName.trim(),leads:matched?strawberry:[],requiresHumanReview:true,mayDownloadImages:false,mayGenerate:false,mayPublish:false};
}
