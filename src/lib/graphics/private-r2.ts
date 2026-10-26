import {getCloudflareContext} from "@opennextjs/cloudflare";
export const R2_PREFIX="r2://atlas-perfume-references/";
const keyPattern=/^[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f-]{36}$/i;
export function parsePrivateReference(url:string):string|null{
 if(!url.startsWith(R2_PREFIX))return null;
 const key=url.slice(R2_PREFIX.length);
 return keyPattern.test(key)?key:null;
}
export type AtlasR2Bucket={
 put(key:string,value:ArrayBuffer|Uint8Array,options?:{httpMetadata?:{contentType?:string}}):Promise<unknown>;
 get(key:string):Promise<{arrayBuffer():Promise<ArrayBuffer>;httpMetadata?:{contentType?:string}}|null>;
};
export async function referenceBucket():Promise<AtlasR2Bucket|null>{
 try{
  const {env}=await getCloudflareContext({async:true});
  const bucket=(env as unknown as Record<string,unknown>).ATLAS_PERFUME_REFERENCES;
  if(bucket&&typeof bucket==="object"&&"get" in bucket&&"put" in bucket)return bucket as AtlasR2Bucket;
 }catch{/* not deployed to Workers */}
 return null;
}
