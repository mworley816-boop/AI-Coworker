import {NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";
import {runtimeEnv} from "@/lib/runtime-env";
import {enqueueScentmarkedGraphicJobs} from "@/lib/scentmarked-graphic-job-queue";
import type {GraphicJobInput} from "@/lib/scentmarked-graphic-generation-jobs";

async function authenticate(){
 const db=await createServerSupabaseClient();
 if(!db)return {code:503 as const};
 const {data:{user}}=await db.auth.getUser();
 if(!user)return {code:401 as const};
 const env=await runtimeEnv();
 const allowed=(env.SCENTMARKED_ATLAS_ADMIN_EMAILS??"").split(",").map(s=>s.trim().toLowerCase()).filter(Boolean);
 if(!user.email||!allowed.includes(user.email.toLowerCase()))return {code:403 as const};
 return {code:200 as const,db,user};
}
function reject(code:number){return NextResponse.json({ok:false,error:code===401?"SIGN_IN_REQUIRED":code===403?"ADMIN_REQUIRED":"DATABASE_UNAVAILABLE"},{status:code});}
export async function GET(){
 const auth=await authenticate();if(auth.code!==200)return reject(auth.code);
 const {data,error}=await auth.db.from("scentmarked_graphic_jobs").select("id,perfume_id,brand,perfume_name,graphic_format,status,error_code,created_at").eq("owner_user_id",auth.user.id).order("created_at",{ascending:false}).limit(50);
 return NextResponse.json(error?{ok:false,error:"QUEUE_READ_FAILED"}:{ok:true,jobs:data??[]},{status:error?500:200,headers:{"cache-control":"no-store"}});
}
export async function POST(request:Request){
 const auth=await authenticate();if(auth.code!==200)return reject(auth.code);
 const origin=request.headers.get("origin");
 if(origin&&origin!==new URL(request.url).origin)return NextResponse.json({ok:false,error:"INVALID_ORIGIN"},{status:403});
 const raw=await request.text();
 if(raw.length>16000)return NextResponse.json({ok:false,error:"REQUEST_TOO_LARGE"},{status:413});
 let payload:unknown;try{payload=JSON.parse(raw)}catch{return NextResponse.json({ok:false,error:"INVALID_JSON"},{status:400})}
 const jobs=(payload&&typeof payload==="object"&&!Array.isArray(payload))?(payload as {jobs?:unknown}).jobs:undefined;
 if(!Array.isArray(jobs)||jobs.length<1||jobs.length>25)return NextResponse.json({ok:false,error:"INVALID_JOB_COUNT"},{status:400});
 if(!jobs.every((j:unknown)=>{if(!j||typeof j!=="object"||Array.isArray(j))return false;const x=j as Record<string,unknown>;return typeof x.perfumeId==="string"&&x.perfumeId.length<=120&&typeof x.brand==="string"&&x.brand.length<=120&&typeof x.perfumeName==="string"&&x.perfumeName.length<=160&&(x.format==="product-card"||x.format==="editorial-banner");}))return NextResponse.json({ok:false,error:"INVALID_JOB_INPUT"},{status:400});
 const result=await enqueueScentmarkedGraphicJobs(auth.db,auth.user.id,jobs as GraphicJobInput[],25);
 return NextResponse.json(result,{status:result.ok?201:500,headers:{"cache-control":"no-store"}});
}
