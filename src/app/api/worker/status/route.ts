import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";

export const runtime="nodejs";

export async function GET(request:Request){
  const secret=process.env.WORKER_SECRET;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  if(!secret||!key||!url)return NextResponse.json({ok:false,reason:"Worker is not configured"},{status:503});
  if(request.headers.get("authorization")!==`Bearer ${secret}`)return NextResponse.json({ok:false,reason:"Unauthorized"},{status:401});
  const supabase=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const queued=await supabase.from("runs").select("id",{count:"exact",head:true}).eq("status","queued");
  const running=await supabase.from("runs").select("id",{count:"exact",head:true}).eq("status","running");
  const waiting=await supabase.from("runs").select("id",{count:"exact",head:true}).eq("status","waiting_approval");
  const now=new Date().toISOString();
  const expired=await supabase.from("runs").select("id",{count:"exact",head:true}).not("lease_expires_at","is",null).lte("lease_expires_at",now);
  const stalled=await supabase.from("runs").select("id",{count:"exact",head:true}).eq("status","running").not("lease_expires_at","is",null).lte("lease_expires_at",now);
  const uncertain=await supabase.from("approvals").select("id",{count:"exact",head:true}).eq("status","uncertain");
  if(queued.error||running.error||waiting.error||expired.error||stalled.error||uncertain.error)return NextResponse.json({ok:false,reason:"Worker queue status could not be loaded"},{status:500});
  return NextResponse.json({ok:true,queued:queued.count??0,running:running.count??0,waitingApproval:waiting.count??0,expiredLeases:expired.count??0,stalledRuns:stalled.count??0,uncertainApprovals:uncertain.count??0,time:new Date().toISOString()});
}
