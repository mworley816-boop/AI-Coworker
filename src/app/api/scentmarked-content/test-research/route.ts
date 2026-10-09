import {NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";
import {executeTool} from "@/lib/tools/executor";

export async function POST(){
 const supabase=await createServerSupabaseClient();
 if(!supabase)return NextResponse.json({ok:false,reason:"Atlas workspace is not configured"},{status:503});
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)return NextResponse.json({ok:false,reason:"Sign in is required"},{status:401});
 const {data:coworker,error}=await supabase.from("coworkers").select("id").eq("user_id",user.id).eq("name","Atlas").maybeSingle();
 if(error)return NextResponse.json({ok:false,reason:"Coworker lookup failed"},{status:500});
 if(!coworker)return NextResponse.json({ok:false,reason:"Atlas coworker has not been initialized"},{status:409});
 const result=await executeTool("web.research",{goal:"Lattafa Nebras official perfume manufacturer fragrance notes"}, {coworkerId:coworker.id,supabase});
 return NextResponse.json({ok:result.ok,message:result.message,sourceCount:Array.isArray(result.data?.sources)?result.data.sources.length:0,sourceHosts:Array.isArray(result.data?.sources)?result.data.sources.map((s:unknown)=>typeof s==="object"&&s!==null&&"sourceHost" in s?String(s.sourceHost):"unknown").slice(0,8):[]},{status:result.ok?200:result.message==="Tool is disabled"?403:503,headers:{"cache-control":"no-store"}});
}
