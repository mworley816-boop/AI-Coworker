import type {MediaUploadTransport} from "./scentmarked-media-upload-service";

/** Construct only on the server. Never expose the service role key to browser clients. */
export function createScentmarkedStorageTransport(config:{supabaseUrl:string;serviceRoleKey:string}):MediaUploadTransport{
 const base=new URL(config.supabaseUrl);
 if(base.protocol!=="https:"||!base.hostname||base.username||base.password||base.search||base.hash||base.pathname!=="/")throw new Error("Invalid Supabase storage URL");
 if(!config.serviceRoleKey)throw new Error("Missing Supabase service credential");
 return async ({bucket,path,contentType,bytes})=>{
  // No overwrite: a duplicate path must be resolved as a separate reviewed update.
  const url=new URL("/storage/v1/object/"+encodeURIComponent(bucket)+"/"+path.split("/").map(encodeURIComponent).join("/"),base);
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),10000);
  try{
   const response=await fetch(url,{method:"POST",headers:{apikey:config.serviceRoleKey,Authorization:"Bearer "+config.serviceRoleKey,"Content-Type":contentType,"x-upsert":"false"},body:new Uint8Array(bytes),signal:controller.signal,cache:"no-store"});
   if(!response.ok)throw new Error("Storage upload failed");
   return {path};
  }finally{clearTimeout(timeout);}
 };
}
