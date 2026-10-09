import {NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";

export async function GET(){
 const supabase=await createServerSupabaseClient();
 if(!supabase)return NextResponse.json({ok:false,reason:"Atlas workspace is not configured"},{status:503});
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)return NextResponse.json({ok:false,reason:"Sign in is required"},{status:401});
 const {data:coworker,error:coworkerError}=await supabase.from("coworkers").select("id").eq("user_id",user.id).eq("name","Atlas").maybeSingle();
 if(coworkerError)return NextResponse.json({ok:false,reason:"Coworker lookup failed"},{status:500});
 let researchPermission:"enabled"|"disabled"|"not_initialized"="not_initialized";
 if(coworker){const {data:permission,error:permissionError}=await supabase.from("coworker_tool_permissions").select("enabled,access,approval_mode").eq("coworker_id",coworker.id).eq("tool_id","web.research").maybeSingle();if(permissionError)return NextResponse.json({ok:false,reason:"Research permission lookup failed"},{status:500});researchPermission=permission?.enabled&&permission.access==="read"?"enabled":"disabled";}
 const catalogBase=process.env.SCENTMARKED_SUPABASE_URL;
 const catalogKey=process.env.SCENTMARKED_SUPABASE_ANON_KEY;
 let catalogUrlValid=false;
 if(catalogBase){try{const url=new URL(catalogBase);catalogUrlValid=url.protocol==="https:";}catch{catalogUrlValid=false;}}
 const catalogConfigured=Boolean(catalogUrlValid&&catalogKey);
 const endpoint=process.env.WEB_RESEARCH_API_URL;
 const key=process.env.WEB_RESEARCH_API_KEY;
 let endpointValid=false;
 if(endpoint){try{const url=new URL(endpoint);endpointValid=url.protocol==="https:";}catch{endpointValid=false;}}
 return NextResponse.json({ok:true,catalogConfigured,catalogStatus:catalogConfigured?"configured_not_tested":"configuration_missing",catalogScope:"public_visible_only",catalogSafeToCreate:false,researchConfigured:Boolean(endpointValid&&key),researchPermission,researchReadyForAttempt:Boolean(endpointValid&&key&&researchPermission==="enabled"),researchStatus:endpointValid&&key?"configured_not_tested":"configuration_missing",note:"Configuration alone does not confirm provider connectivity, tool authorization, or source quality."},{headers:{"cache-control":"no-store"}});
}
