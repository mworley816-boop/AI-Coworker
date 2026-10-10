import {NextRequest,NextResponse} from "next/server";
import {createServiceSupabaseClient} from "@/lib/supabase/service";
import {runtimeEnv} from "@/lib/runtime-env";

type WebsiteEvent={type:"outage"|"recovery";at:string;detail:string};
export async function POST(request:NextRequest){
 const env=await runtimeEnv();
 const secret=env.ATLAS_MAINTENANCE_CRON_SECRET;
 if(!secret)return NextResponse.json({error:"Scheduled maintenance secret is not configured."},{status:503});
 if(request.headers.get("authorization")!==`Bearer ${secret}`)return NextResponse.json({error:"Unauthorized"},{status:401});
 const supabase=await createServiceSupabaseClient();
 if(!supabase)return NextResponse.json({error:"Maintenance database service unavailable."},{status:503});
 const {data:workspaces,error}=await supabase.from("workspaces").select("id,user_id,resources").eq("slug","scentmarked").limit(100);
 if(error)return NextResponse.json({error:"Could not load maintenance workspaces."},{status:500});
 if(!workspaces?.length)return NextResponse.json({error:"No Scentmarked workspaces were found; no website checks ran.",checked:0,results:[]},{status:503});
 const results=[];
 for(const workspace of workspaces??[]){
  const resources=(workspace.resources??{}) as Record<string,unknown>;
  const prior=(resources.maintenance??{}) as {websiteFailureStreak?:number;websiteEvents?:WebsiteEvent[];checks?:Array<{id:string;label:string;status:string;detail:string}>};
  let status="warning",detail="";
  try{
   const start=Date.now();
   const response=await fetch("https://scentmarked.m-worley816.workers.dev/",{cache:"no-store",signal:AbortSignal.timeout(10000),headers:{"User-Agent":"Atlas-Scentmarked-Scheduled-Healthcheck"}});
   status=response.ok?"healthy":"warning";
   detail=`Production homepage returned HTTP ${response.status} in ${Date.now()-start} ms.`;
  }catch(error){detail=error instanceof Error&&error.name==="TimeoutError"?"Production homepage request timed out after 10 seconds.":"Production homepage request failed before receiving an HTTP response.";}
  const previousStreak=prior.websiteFailureStreak??0;
  const streak=status==="healthy"?0:previousStreak+1;
  const now=new Date().toISOString();
  const events=[...(prior.websiteEvents??[])].slice(-49);
  if(streak===3)events.push({type:"outage",at:now,detail});
  if(status==="healthy"&&previousStreak>=3)events.push({type:"recovery",at:now,detail});
  const checks=[...(prior.checks??[]).filter(c=>c.id!=="website"),{id:"website",label:"Scentmarked website",status,detail:status==="warning"?`${detail} Consecutive failures: ${streak}.`:detail}];
  const maintenance={...prior,checks,checkedAt:now,lastScheduledCheck:now,websiteFailureStreak:streak,websiteEvents:events};
  const health=checks.every(c=>c.status==="healthy")?"healthy":"attention";
  const {error:updateError}=await supabase.from("workspaces").update({resources:{...resources,maintenance},health,last_checked_at:now,updated_at:now}).eq("id",workspace.id).eq("user_id",workspace.user_id);
  results.push({workspaceId:workspace.id,ok:!updateError,websiteStatus:status,repeatedOutage:streak>=3,newOutage:!updateError&&streak===3,recovered:!updateError&&status==="healthy"&&previousStreak>=3});
 }
 if(results.some(result=>!result.ok))return NextResponse.json({error:"Some workspace health updates failed.",checked:results.length,results},{status:500});
 return NextResponse.json({checked:results.length,results});
}
