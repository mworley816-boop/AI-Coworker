import {createClient} from "@supabase/supabase-js";
import {runtimeEnv} from "@/lib/runtime-env";

export async function createServiceSupabaseClient(){
  const env=await runtimeEnv();
  const url=env.NEXT_PUBLIC_SUPABASE_URL;
  const key=env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)return null;
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
