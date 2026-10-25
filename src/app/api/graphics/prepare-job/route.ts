import {NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";
import {prepareGraphicsJob,type GraphicsReviewDraft} from "@/lib/graphics/prepare-job";
const idPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function POST(request:Request){
 const s=await createServerSupabaseClient();if(!s)return NextResponse.json({ok:false,reason:"Supabase unavailable"},{status:503});
 const {data:{user}}=await s.auth.getUser();if(!user)return NextResponse.json({ok:false,reason:"Sign in required"},{status:401});
 let body:unknown;try{body=await request.json();}catch{return NextResponse.json({ok:false,reason:"Invalid JSON"},{status:400});}
 const runId=body&&typeof body==="object"&&!Array.isArray(body)?(body as Record<string,unknown>).runId:null;
 if(typeof runId!=="string"||!idPattern.test(runId))return NextResponse.json({ok:false,reason:"Invalid run"},{status:400});
 const run=await s.from("runs").select("id,tasks!inner(user_id)").eq("id",runId).eq("tasks.user_id",user.id).maybeSingle();
 if(run.error)return NextResponse.json({ok:false,reason:"Run lookup failed"},{status:500});
 if(!run.data)return NextResponse.json({ok:false,reason:"Run not found"},{status:404});
 const logs=await s.from("activity_logs").select("metadata").eq("run_id",runId).eq("event_type","graphics.review_draft_saved").order("created_at",{ascending:false}).limit(1);
 if(logs.error)return NextResponse.json({ok:false,reason:"Draft lookup failed"},{status:500});
 const metadata=logs.data?.[0]?.metadata as Record<string,unknown>|undefined;
 if(metadata?.userId!==user.id||!metadata.brief||typeof metadata.brief!=="object")return NextResponse.json({ok:false,reason:"Save a review draft first"},{status:409});
 const draft=metadata.brief as GraphicsReviewDraft;
 const proposal=prepareGraphicsJob(draft);
 return NextResponse.json({ok:true,proposal,note:"This only prepares a proposal. No image was generated, saved or published."});
}
