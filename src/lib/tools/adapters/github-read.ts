import {decryptCredential} from "@/lib/connections/crypto";
import {runtimeEnv} from "@/lib/runtime-env";
import {createServiceSupabaseClient} from "@/lib/supabase/service";
import type {ToolAdapter,ToolExecutionResult} from "@/lib/tools/executor";

const toolId="github.read";
function failure(message:string):ToolExecutionResult{return {ok:false,toolId,message};}
export const githubReadAdapter:ToolAdapter={
 id:toolId,
 async execute(input,context):Promise<ToolExecutionResult>{
  const repository=typeof input.repository==="string"?input.repository.trim():"";
  const resource=typeof input.resource==="string"?input.resource.trim():"";
  if(!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository))return failure("A valid owner/repository is required");
  // Limit reads to repository contents. Never accept arbitrary URLs or API paths.
  if(!resource||resource.startsWith("/")||resource.includes("\\")||resource.split("/").some(part=>part===".."||part==="."||!part))return failure("A safe repository file path is required");
  const env=await runtimeEnv();
  if(!env.CONNECTION_ENCRYPTION_KEY)return failure("Connection encryption is not configured");
  const {data:coworker,error:ownerError}=await context.supabase.from("coworkers").select("user_id").eq("id",context.coworkerId).maybeSingle();
  if(ownerError||!coworker?.user_id)return failure("Coworker owner could not be verified");
  const {data:connection,error:connectionError}=await context.supabase.from("connections").select("id").eq("user_id",coworker.user_id).eq("provider","github").eq("status","connected").order("connected_at",{ascending:false}).limit(1).maybeSingle();
  if(connectionError||!connection?.id)return failure("Connect GitHub before reading repositories");
  // Credentials have no user-facing SELECT policy; access them only through the server-side service client.
  const service=await createServiceSupabaseClient();
  if(!service)return failure("GitHub credential service is not configured");
  const {data:credential,error:credentialError}=await service.from("connection_credentials").select("ciphertext,iv,auth_tag,key_version").eq("connection_id",connection.id).maybeSingle();
  if(credentialError||!credential)return failure("GitHub credential is unavailable");
  let token:string;
  try{token=decryptCredential({ciphertext:credential.ciphertext,iv:credential.iv,authTag:credential.auth_tag,keyVersion:credential.key_version},env.CONNECTION_ENCRYPTION_KEY);}
  catch{return failure("GitHub credential could not be decrypted");}
  const [owner,name]=repository.split("/");
  const path=resource.split("/").map(encodeURIComponent).join("/");
  const url=`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/contents/${path}`;
  let response:Response;
  try{response=await fetch(url,{headers:{accept:"application/vnd.github.raw+json",authorization:`Bearer ${token}`,"x-github-api-version":"2022-11-28","user-agent":"Atlas-AI-Coworker"},signal:AbortSignal.timeout(15000),cache:"no-store"});}
  catch{return failure("GitHub file request failed");}
  if(!response.ok)return failure(response.status===404?"Repository file not found or inaccessible":`GitHub returned HTTP ${response.status}`);
  const text=await response.text();
  if(!text.trim())return failure("GitHub returned an empty file");
  return {ok:true,toolId,message:"GitHub repository file read successfully.",data:{repository,resource,content:text.slice(0,24000),truncated:text.length>24000}};
 }
};
