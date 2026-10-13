import {NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";
import {toolRegistry} from "@/lib/tools/registry";

export async function POST(){
  const supabase=await createServerSupabaseClient();
  if(!supabase)return NextResponse.json({error:"Supabase is not configured."},{status:503});
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:"Sign in first."},{status:401});

  let {data:coworker,error}=await supabase.from("coworkers").select("id,name,status").eq("user_id",user.id).eq("name","Atlas").maybeSingle();
  if(error)return NextResponse.json({error:error.message},{status:500});
  if(!coworker){
    const created=await supabase.from("coworkers").insert({user_id:user.id,name:"Atlas",role:"General autonomous coworker",instructions:"Help manage personal operations and connected work while respecting tool permissions and approval requirements.",status:"ready"}).select("id,name,status").single();
    if(created.error)return NextResponse.json({error:created.error.message},{status:500});
    coworker=created.data;
  }

  const permissions=toolRegistry.map(t=>({coworker_id:coworker!.id,tool_id:t.id,enabled:false,access:t.access,approval_mode:t.requiresApproval?"always":"never"}));
  const permissionResult=await supabase.from("coworker_tool_permissions").upsert(permissions,{onConflict:"coworker_id,tool_id",ignoreDuplicates:true});
  if(permissionResult.error)return NextResponse.json({error:permissionResult.error.message},{status:500});
  return NextResponse.json({ok:true,coworker});
}
