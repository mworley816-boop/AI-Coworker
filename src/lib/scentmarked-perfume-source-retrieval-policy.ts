import {classifyPerfumeSource} from "./scentmarked-perfume-source-registry";
/** Gate for future server-side retrieval; this module performs no network requests. */
export function planPerfumeSourceRetrieval(house:string,rawUrl:string):
 {ok:true;url:string;maxBytes:number;redirect:"error"}|{ok:false;reason:string}{
 const source=classifyPerfumeSource(house,rawUrl);
 if(!source)return {ok:false,reason:"UNLISTED_SOURCE"};
 let url:URL;
 try{url=new URL(rawUrl)}catch{return {ok:false,reason:"INVALID_URL"}}
 if(url.port&&url.port!=="443")return {ok:false,reason:"UNSAFE_PORT"};
 if(url.hash||url.searchParams.toString().length>1024)return {ok:false,reason:"UNSAFE_URL"};
 return {ok:true,url:url.toString(),maxBytes:250_000,redirect:"error"};
}
