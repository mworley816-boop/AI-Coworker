import {createServiceSupabaseClient} from "@/lib/supabase/service";
import {decryptCredential} from "@/lib/connections/crypto";

export async function getConnectedCredential(userId:string,provider:string){
  const service=createServiceSupabaseClient();
  if(!service)return {ok:false as const,message:"Secure credential service is not configured"};
  const {data:connection,error:connectionError}=await service.from("connections").select("id,status").eq("user_id",userId).eq("provider",provider).eq("status","connected").order("connected_at",{ascending:false}).limit(1).maybeSingle();
  if(connectionError)return {ok:false as const,message:"Could not resolve connected account"};
  if(!connection)return {ok:false as const,message:`No connected ${provider} account is available`};
  const {data:credential,error:credentialError}=await service.from("connection_credentials").select("ciphertext,iv,auth_tag,key_version").eq("connection_id",connection.id).maybeSingle();
  if(credentialError||!credential)return {ok:false as const,message:`Connected ${provider} credential is unavailable`};
  try{
    return {ok:true as const,connectionId:connection.id,credential:decryptCredential({ciphertext:credential.ciphertext,iv:credential.iv,authTag:credential.auth_tag,keyVersion:credential.key_version})};
  }catch{
    return {ok:false as const,message:`Connected ${provider} credential could not be decrypted`};
  }
}
