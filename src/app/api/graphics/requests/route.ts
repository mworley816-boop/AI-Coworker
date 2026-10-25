import {NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";
import {prepareGraphicsJob,type GraphicsReviewDraft} from "@/lib/graphics/prepare-job";
const idPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function context(request:Request){
 const s=await createServerSupabaseClient();if(!s)return {error:NextResponse.json({ok:false,reason:"Supabase unavailable"},{status:503})};
 const {data:{user}}=await s.auth.getUser();if(!user)return {error:NextResponse.json({ok:false,reason:"Sign in required"},{status:401})};
 let runId="";
 if(request.method==="GET")runId=new URL(request.url).searchParams.get("runId")??"";
 else {try{const body=await request.json() as {runId?:unknown};runId=typeof body.runId==="string"?body.runId:"";}catch{return {error:NextResponse.json({ok:false,reason:"Invalid JSON"},{status:400})};}}
 if(!idPattern.test(runId))return {error:NextResponse.json({ok:false,reason:"Invalid run"},{status:400})};
 const run=await s.from("runs").select("id,tasks!inner(user_id)").eq("id",runId).eq("tasks.user_id",user.id).maybeSingle();
 if(run.error)return {error:NextResponse.json({ok:false,reason:"Run lookup failed"},{status:500})};
 if(!run.data)return {error:NextResponse.json({ok:false,reason:"Run not found"},{status:404})};
 return {s,user,runId};
}
export async function GET(request:Request){
 const c=await context(request);if(c.error)return c.error;
 const rows=await c.s!.from("activity_logs").select("id,created_at,event_type,message,metadata").eq("run_id",c.runId!).eq("event_type","graphics.generation_requested").order("created_at",{ascending:false}).limit(20);
 if(rows.error)return NextResponse.json({ok:false,reason:"Request lookup failed"},{status:500});
 return NextResponse.json({ok:true,requests:(rows.data??[]).filter(row=>(row.metadata as Record<string,unknown>|null)?.userId===c.user!.id).map(row=>({id:row.id,createdAt:row.created_at,status:"awaiting_provider",message:row.message,brand:(row.metadata as Record<string,unknown>).brand,perfumeName:(row.metadata as Record<string,unknown>).perfumeName,artworkType:(row.metadata as Record<string,unknown>).artworkType}))});
}
export async function POST(request:Request){
 const c=await context(request);if(c.error)return c.error;
 const logs=await c.s!.from("activity_logs").select("metadata").eq("run_id",c.runId!).eq("event_type","graphics.review_draft_saved").order("created_at",{ascending:false}).limit(1);
 if(logs.error)return NextResponse.json({ok:false,reason:"Draft lookup failed"},{status:500});
 const metadata=logs.data?.[0]?.metadata as Record<string,unknown>|undefined;
 if(metadata?.userId!==c.user!.id||!metadata.brief||typeof metadata.brief!=="object")return NextResponse.json({ok:false,reason:"Save a review draft first"},{status:409});
 const draft=metadata.brief as GraphicsReviewDraft;
 const proposal=prepareGraphicsJob(draft);
 if(proposal.status!=="prepared")return NextResponse.json({ok:false,reason:"Graphics preflight blocked",blockers:proposal.blockers},{status:409});
 const insert=await c.s!.from("activity_logs").insert({run_id:c.runId!,event_type:"graphics.generation_requested",message:"Graphics request recorded; waiting for a configured generation provider.",metadata:{userId:c.user!.id,brand:draft.brand,perfumeName:draft.perfumeName,artworkType:draft.artworkType,referenceUrl:draft.referenceUrl,status:"awaiting_provider",mayPublish:false}});
 if(insert.error)return NextResponse.json({ok:false,reason:"Request could not be recorded"},{status:500});
 return NextResponse.json({ok:true,status:"awaiting_provider",imageGenerated:false,publicationAuthorized:false});
}
