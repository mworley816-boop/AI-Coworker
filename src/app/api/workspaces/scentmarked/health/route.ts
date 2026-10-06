import {NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";

type Check={id:string;label:string;status:"healthy"|"warning"|"unconfigured";detail:string};

export async function POST(){
  const supabase=await createServerSupabaseClient();
  if(!supabase)return NextResponse.json({error:"Supabase is not configured."},{status:503});
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const {data:workspace,error}=await supabase.from("workspaces").select("id,resources").eq("slug","scentmarked").maybeSingle();
  if(error)return NextResponse.json({error:error.message},{status:500});
  if(!workspace)return NextResponse.json({error:"Set up the Scentmarked workspace first."},{status:404});

  const resources=(workspace.resources??{}) as Record<string,unknown>;
  const checks:Check[]=[
    {id:"workspace",label:"Atlas workspace",status:"healthy",detail:"Scentmarked is configured as Atlas's priority workspace."},
    {id:"github",label:"GitHub maintenance",status:resources.github?"warning":"unconfigured",detail:resources.github?"Repository identified; Atlas GitHub runtime authorization is still required for autonomous checks.":"Repository is not configured."},
    {id:"supabase",label:"Scentmarked database",status:resources.supabase?"warning":"unconfigured",detail:resources.supabase?"Project identified; Atlas still needs a controlled Scentmarked database connection.":"Supabase project is not configured."},
    {id:"cloudflare",label:"Cloudflare hosting",status:resources.cloudflare?"warning":"unconfigured",detail:resources.cloudflare?"Hosting identified; Atlas still needs a Cloudflare runtime connection for deployment health.":"Cloudflare hosting is not configured."}
  ];
  const health=checks.every(c=>c.status==="healthy")?"healthy":checks.some(c=>c.status==="healthy")?"attention":"unknown";
  const now=new Date().toISOString();
  const {error:updateError}=await supabase.from("workspaces").update({health,last_checked_at:now,updated_at:now}).eq("id",workspace.id);
  if(updateError)return NextResponse.json({error:updateError.message},{status:500});
  return NextResponse.json({health,checkedAt:now,checks});
}
