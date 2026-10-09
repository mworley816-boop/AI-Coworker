import {NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";

export async function GET(){
 const supabase=await createServerSupabaseClient();
 if(!supabase)return NextResponse.json({ok:false,reason:"Atlas workspace is not configured"},{status:503});
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)return NextResponse.json({ok:false,reason:"Sign in is required"},{status:401});
 const endpoint=process.env.WEB_RESEARCH_API_URL;
 const key=process.env.WEB_RESEARCH_API_KEY;
 let endpointValid=false;
 if(endpoint){try{const url=new URL(endpoint);endpointValid=url.protocol==="https:";}catch{endpointValid=false;}}
 return NextResponse.json({ok:true,researchConfigured:Boolean(endpointValid&&key),researchStatus:endpointValid&&key?"configured_not_tested":"configuration_missing",note:"Configuration alone does not confirm provider connectivity, tool authorization, or source quality."},{headers:{"cache-control":"no-store"}});
}
