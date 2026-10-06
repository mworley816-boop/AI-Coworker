import {NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";

export async function GET(){
  const supabase=await createServerSupabaseClient();
  if(!supabase)return NextResponse.json({error:"Supabase is not configured."},{status:503});
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:"Sign in to load your workspace."},{status:401});
  const start=new Date();start.setUTCHours(0,0,0,0);
  const [coworkers,tasks,approvals,runs,atlas,scentmarked]=await Promise.all([
    supabase.from("coworkers").select("id",{count:"exact",head:true}),
    supabase.from("tasks").select("id",{count:"exact",head:true}).in("status",["queued","running","waiting_approval"]),
    supabase.from("approvals").select("id",{count:"exact",head:true}).eq("status","pending"),
    supabase.from("runs").select("id",{count:"exact",head:true}).gte("created_at",start.toISOString()),
    supabase.from("coworkers").select("status").eq("name","Atlas").maybeSingle(),
    supabase.from("workspaces").select("id,name,priority,status,health,last_checked_at,resources").eq("slug","scentmarked").maybeSingle()
  ]);
  const error=coworkers.error??tasks.error??approvals.error??runs.error??atlas.error??scentmarked.error;
  if(error)return NextResponse.json({error:error.message},{status:500});
  return NextResponse.json({
    coworkers:coworkers.count??0,
    active:tasks.count??0,
    approvals:approvals.count??0,
    runsToday:runs.count??0,
    atlasStatus:atlas.data?.status??"Not created yet",
    scentmarked:scentmarked.data??null
  });
}
