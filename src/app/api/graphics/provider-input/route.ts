import {NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";
import {prepareGraphicsJob,type GraphicsReviewDraft} from "@/lib/graphics/prepare-job";
import {prepareProviderImageInput} from "@/lib/graphics/provider-image-input";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Checks an approved run's reference readiness; never sends image bytes to the browser. */
export async function POST(request:Request){
 const s=await createServerSupabaseClient();if(!s)return NextResponse.json({ok:false,reason:"Supabase unavailable"},{status:503});
 const {data:{user}}=await s.auth.getUser();if(!user)return NextResponse.json({ok:false,reason:"Sign in required"},{status:401});
 let runId:unknown;try{runId=(await request.json() as {runId?:unknown}).runId;}catch{return NextResponse.json({ok:false,reason:"Invalid JSON"},{status:400});}
 if(typeof runId!=="string"||!uuid.test(runId))return NextResponse.json({ok:false,reason:"Invalid run"},{status:400});
 const run=await s.from("runs").select("id,tasks!inner(user_id)").eq("id",runId).eq("tasks.user_id",user.id).maybeSingle();
 if(run.error)return NextResponse.json({ok:false,reason:"Run lookup failed"},{status:500});
 if(!run.data)return NextResponse.json({ok:false,reason:"Run not found"},{status:404});
 const logs=await s.from("activity_logs").select("metadata").eq("run_id",runId).eq("event_type","graphics.review_draft_saved").order("created_at",{ascending:false}).limit(1);
 if(logs.error)return NextResponse.json({ok:false,reason:"Review draft lookup failed"},{status:500});
 const metadata=logs.data?.[0]?.metadata as Record<string,unknown>|undefined;
 if(metadata?.userId!==user.id||!metadata.brief||typeof metadata.brief!=="object")return NextResponse.json({ok:false,reason:"Save a review draft first"},{status:409});
 const draft=metadata.brief as GraphicsReviewDraft;
 const proposal=prepareGraphicsJob(draft);
 if(proposal.status!=="prepared")return NextResponse.json({ok:false,reason:"Preflight blocked",blockers:proposal.blockers},{status:409});
 const input=await prepareProviderImageInput(draft);
 return NextResponse.json({ok:true,status:input.status,reason:input.reason,imageReady:input.status==="ready",imageGenerated:false,publicationAuthorized:false});
}
