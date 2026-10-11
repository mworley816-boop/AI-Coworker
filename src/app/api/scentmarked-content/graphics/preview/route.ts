import {NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";
import {createServiceSupabaseClient} from "@/lib/supabase/service";
import {runtimeEnv} from "@/lib/runtime-env";
import {ATLAS_GRAPHIC_ARTIFACT_BUCKET} from "@/lib/scentmarked-graphic-artifact-storage";
/** Returns a short-lived signed URL for a reviewed-by-admin private preview. */
export async function GET(request:Request){
 const session=await createServerSupabaseClient();
 if(!session)return NextResponse.json({ok:false,error:"WORKSPACE_NOT_CONFIGURED"},{status:503});
 const {data:{user}}=await session.auth.getUser();
 if(!user)return NextResponse.json({ok:false,error:"SIGN_IN_REQUIRED"},{status:401});
 const env=await runtimeEnv();
 const admins=(env.SCENTMARKED_ATLAS_ADMIN_EMAILS??"").split(",").map(s=>s.trim().toLowerCase()).filter(Boolean);
 if(!user.email||!admins.includes(user.email.toLowerCase()))return NextResponse.json({ok:false,error:"ADMIN_REQUIRED"},{status:403});
 const id=new URL(request.url).searchParams.get("id")??"";
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))return NextResponse.json({ok:false,error:"INVALID_JOB_ID"},{status:400});
 const service=await createServiceSupabaseClient();
 if(!service)return NextResponse.json({ok:false,error:"STORAGE_NOT_CONFIGURED"},{status:503});
 const {data:job,error}=await service.from("scentmarked_graphic_jobs").select("owner_user_id,status,output_storage_path").eq("id",id).maybeSingle();
 if(error||!job||job.owner_user_id!==user.id)return NextResponse.json({ok:false,error:"JOB_NOT_FOUND"},{status:404});
 if(!["generated","approved","uploaded"].includes(job.status)||job.output_storage_path!=="generated/"+id+".png")return NextResponse.json({ok:false,error:"PREVIEW_NOT_AVAILABLE"},{status:409});
 const {data:bucket,error:bucketError}=await service.storage.getBucket(ATLAS_GRAPHIC_ARTIFACT_BUCKET);
 if(bucketError||!bucket||bucket.public!==false)return NextResponse.json({ok:false,error:"PRIVATE_STORAGE_NOT_READY"},{status:503});
 const {data,error:signError}=await service.storage.from(ATLAS_GRAPHIC_ARTIFACT_BUCKET).createSignedUrl(job.output_storage_path,60);
 if(signError||!data?.signedUrl)return NextResponse.json({ok:false,error:"PREVIEW_SIGNING_FAILED"},{status:502});
 return NextResponse.json({ok:true,url:data.signedUrl,expiresInSeconds:60},{headers:{"cache-control":"no-store"}});
}
