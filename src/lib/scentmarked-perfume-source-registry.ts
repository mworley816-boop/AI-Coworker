/** Curated starting points for research. Registry membership is not proof that a page is authentic. */
export type PerfumeSourceEntry={house:string;host:string;type:"manufacturer";reviewed:boolean};
export const PERFUME_SOURCE_REGISTRY:readonly PerfumeSourceEntry[]=[
 {house:"Lattafa",host:"lattafa.com",type:"manufacturer",reviewed:false},
 {house:"Arabiyat",host:"arabiyat.com",type:"manufacturer",reviewed:false}
];
export function classifyPerfumeSource(house:string,rawUrl:string):{type:"manufacturer";host:string;verified:false}|null{
 let url:URL;try{url=new URL(rawUrl)}catch{return null}
 if(url.protocol!=="https:"||url.username||url.password)return null;
 const host=url.hostname.toLowerCase().replace(/\.$/,"");
 const entry=PERFUME_SOURCE_REGISTRY.find(x=>x.house.toLowerCase()===house.trim().toLowerCase()&&(host===x.host||host.endsWith("."+x.host)));
 if(!entry)return null;
 return {type:entry.type,host,verified:false};
}
