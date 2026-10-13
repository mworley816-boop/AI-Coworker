import {createServerClient} from "@supabase/ssr";
import {getCloudflareContext} from "@opennextjs/cloudflare";
import {cookies} from "next/headers";

async function runtimeEnv(){
  try{
    const {env}=await getCloudflareContext({async:true});
    return env as Record<string,string|undefined>;
  }catch{
    return process.env as Record<string,string|undefined>;
  }
}

export async function createServerSupabaseClient(){
  const env=await runtimeEnv();
  const url=env.NEXT_PUBLIC_SUPABASE_URL??process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??env.NEXT_PUBLIC_SUPABASE_ANON_KEY??process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if(!url||!key)return null;
  const store=await cookies();
  return createServerClient(url,key,{cookies:{getAll(){return store.getAll();},setAll(items){try{items.forEach(({name,value,options})=>store.set(name,value,options));}catch{}}}});
}
