import {NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";

const resources={
  github:{repository:"mworley816-boop/Scentmarked"},
  supabase:{projectRef:"qnlqdkctfmfagsvbwiis"},
  cloudflare:{role:"production hosting"}
};

export async function POST(){
  const supabase=await createServerSupabaseClient();
  if(!supabase)return NextResponse.json({error:"Supabase is not configured."},{status:503});
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const {data,error}=await supabase.from("workspaces").upsert({
    user_id:user.id,
    name:"Scentmarked",
    slug:"scentmarked",
    kind:"business",
    priority:100,
    status:"active",
    health:"unknown",
    description:"Primary Atlas workspace for Scentmarked website, data, content, campaigns, CRM, customer operations, and maintenance.",
    resources,
    updated_at:new Date().toISOString()
  },{onConflict:"user_id,slug"}).select("id,name,slug,priority,status,health,resources").single();
  if(error)return NextResponse.json({error:error.message},{status:500});
  return NextResponse.json({workspace:data});
}
