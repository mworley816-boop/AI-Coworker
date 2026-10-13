import {getCloudflareContext} from "@opennextjs/cloudflare";

export type RuntimeEnv=Record<string,string|undefined>;

export async function runtimeEnv():Promise<RuntimeEnv>{
  try{
    const {env}=await getCloudflareContext({async:true});
    return env as RuntimeEnv;
  }catch{
    return process.env as RuntimeEnv;
  }
}
