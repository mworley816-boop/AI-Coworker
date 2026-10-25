import {NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";
import {evaluateGraphicsPreflight,type GraphicsBrief} from "@/lib/graphics/generation-preflight";
const idPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function ownedRun(s:NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>,runId:string,userId:string){
 const found=await s.from("runs").select("id,tasks!inner(user_id)").eq("id",runId).eq("tasks.user_id",userId).maybeSingle();
 return found.error?{error:true,found:false}:{error:false,found:Boolean(found.data)};
}
export async function GET(request:Request){
 const s=await createServerSupabaseClient();if(!s)return NextResponse.json({ok:false,reason:"Supabase unavailable"},{status:503});
 const {data:{user}}=await s.auth.getUser();if(!user)return NextResponse.json({ok:false,reason:"Sign in required"},{status:401});
 const runId=new URL(request.url).searchParams.get("runId")??"";
 if(!idPattern.test(runId))return NextResponse.json({ok:false,reason:"Invalid run"},{status:400});
 const owner=await ownedRun(s,runId,user.id);if(owner.error)return NextResponse.json({ok:false,reason:"Run lookup failed"},{status:500});if(!owner.found)return NextResponse.json({ok:false,reason:"Run not found"},{status:404});
 const row=await s.from("activity_logs").select("metadata,created_at").eq("run_id",runId).eq("event_type","graphics.review_draft_saved").order("created_at",{ascending:false}).limit(1);
 if(row.error)return NextResponse.json({ok:false,reason:"Draft lookup failed"},{status:500});
 const metadata=row.data?.[0]?.metadata as Record<string,unknown>|undefined;
 return NextResponse.json({ok:true,draft:metadata?.userId===user.id?metadata?.brief??null:null,savedAt:metadata?.userId===user.id?row.data?.[0]?.created_at??null:null});
}
export async function POST(request:Request){
 const s=await createServerSupabaseClient();if(!s)return NextResponse.json({ok:false,reason:"Supabase unavailable"},{status:503});
 const {data:{user}}=await s.auth.getUser();if(!user)return NextResponse.json({ok:false,reason:"Sign in required"},{status:401});
 let body:unknown;try{body=await request.json();}catch{return NextResponse.json({ok:false,reason:"Invalid JSON"},{status:400});}
 if(!body||typeof body!=="object"||Array.isArray(body))return NextResponse.json({ok:false,reason:"Invalid request"},{status:400});
 const data=body as Record<string,unknown>,runId=data.runId,raw=data.brief;
 if(typeof runId!=="string"||!idPattern.test(runId)||!raw||typeof raw!=="object"||Array.isArray(raw))return NextResponse.json({ok:false,reason:"Invalid draft"},{status:400});
 const b=raw as Record<string,unknown>;
 if(typeof b.brand!=="string"||b.brand.length>150||typeof b.perfumeName!=="string"||b.perfumeName.length>200||typeof b.referenceUrl!=="string"||b.referenceUrl.length>1500||!["catalog_card","social_square","banner"].includes(String(b.artworkType))||typeof b.referenceApproved!=="boolean"||typeof b.rightsConfirmed!=="boolean"||typeof b.bottleVisuallyVerified!=="boolean"||typeof b.variantConfirmed!=="boolean")return NextResponse.json({ok:false,reason:"Invalid review fields"},{status:400});
 const owner=await ownedRun(s,runId,user.id);if(owner.error)return NextResponse.json({ok:false,reason:"Run lookup failed"},{status:500});if(!owner.found)return NextResponse.json({ok:false,reason:"Run not found"},{status:404});
 // Save user attestations as a draft, not as an authorized approval to generate or publish.
 const brief={brand:b.brand,perfumeName:b.perfumeName,referenceUrl:b.referenceUrl,artworkType:b.artworkType,referenceApproved:b.referenceApproved,rightsConfirmed:b.rightsConfirmed,bottleVisuallyVerified:b.bottleVisuallyVerified,variantConfirmed:b.variantConfirmed};
 const result=await s.from("activity_logs").insert({run_id:runId,event_type:"graphics.review_draft_saved",message:"User saved a graphics review draft; no generation or publication authorized.",metadata:{userId:user.id,brief}});
 if(result.error)return NextResponse.json({ok:false,reason:"Draft could not be saved"},{status:500});
 return NextResponse.json({ok:true,saved:true,authorizationGranted:false});
}
