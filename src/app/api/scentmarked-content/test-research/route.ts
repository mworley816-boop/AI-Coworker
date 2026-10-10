import {NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";
import {executeTool} from "@/lib/tools/executor";
const attempts=new Map<string,{at:number}>();
const MIN_INTERVAL_MS=60_000;

export async function POST(){
 const supabase=await createServerSupabaseClient();
 if(!supabase)return NextResponse.json({ok:false,reason:"Atlas workspace is not configured"},{status:503});
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)return NextResponse.json({ok:false,reason:"Sign in is required"},{status:401});
 const {data:coworker,error}=await supabase.from("coworkers").select("id").eq("user_id",user.id).eq("name","Atlas").maybeSingle();
 if(error)return NextResponse.json({ok:false,reason:"Coworker lookup failed"},{status:500});
 if(!coworker)return NextResponse.json({ok:false,reason:"Atlas coworker has not been initialized"},{status:409});
 const now=Date.now();
 const previous=attempts.get(user.id);
 if(previous&&now-previous.at<MIN_INTERVAL_MS)return NextResponse.json({ok:false,message:"Please wait one minute before testing again."},{status:429,headers:{"cache-control":"no-store","retry-after":"60"}});
 attempts.set(user.id,{at:now});
 if(attempts.size>1000){for(const [id,entry] of attempts)if(now-entry.at>MIN_INTERVAL_MS)attempts.delete(id);}
 const result=await executeTool("web.research",{goal:"Lattafa Nebras official perfume manufacturer fragrance notes"}, {coworkerId:coworker.id,supabase});
 const diagnostic=!result.ok?(result.message==="Tool is disabled"?"permission_disabled":result.message.includes("not configured")?"provider_not_configured":result.message.includes("timed out")?"provider_timeout":result.message.includes("returned 401")||result.message.includes("returned 403")?"provider_auth_failed":result.message.includes("no usable sources")?"no_usable_sources":"research_failed"):"source_leads_returned";
 return NextResponse.json({ok:result.ok,diagnostic,message:result.message,sourceCount:Array.isArray(result.data?.sources)?result.data.sources.length:0,sourceHosts:Array.isArray(result.data?.sources)?result.data.sources.map((s:unknown)=>typeof s==="object"&&s!==null&&"sourceHost" in s?String(s.sourceHost):"unknown").slice(0,8):[]},{status:result.ok?200:result.message==="Tool is disabled"?403:503,headers:{"cache-control":"no-store"}});
}
