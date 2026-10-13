import {createServiceSupabaseClient} from "@/lib/supabase/service";
import {decryptCredential} from "@/lib/connections/crypto";
import {runtimeEnv} from "@/lib/runtime-env";

export async function getConnectedCredential(userId:string,provider:string){
  const env=await runtimeEnv();
  const encryptionKey=env.CONNECTION_ENCRYPTION_KEY;
  if(!encryptionKey)return {ok:false as const,message:"Connection encryption is not configured"};
  const service=await createServiceSupabaseClient();
  if(!service)return {ok:false as const,message:"Secure credential service is not configured"};
  const {data:connection,error:connectionError}=await service.from("connections").select("id,status").eq("user_id",userId).eq("provider",provider).eq("status","connected").order("connected_at",{ascending:false}).limit(1).maybeSingle();
  if(connectionError)return {ok:false as const,message:"Could not resolve connected account"};
  if(!connection)return {ok:false as const,message:`No connected ${provider} account is available`};
  const {data:credential,error:credentialError}=await service.from("connection_credentials").select("ciphertext,iv,auth_tag,key_version").eq("connection_id",connection.id).maybeSingle();
  if(credentialError||!credential)return {ok:false as const,message:`Connected ${provider} credential is unavailable`};
  try{
    return {ok:true as const,connectionId:connection.id,credential:decryptCredential({ciphertext:credential.ciphertext,iv:credential.iv,authTag:credential.auth_tag,keyVersion:credential.key_version},encryptionKey)};
  }catch{
    return {ok:false as const,message:`Connected ${provider} credential could not be decrypted`};
  }
}
