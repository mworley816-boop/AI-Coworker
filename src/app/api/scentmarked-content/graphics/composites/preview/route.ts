import {NextRequest,NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";
import {createServiceSupabaseClient} from "@/lib/supabase/service";
import {runtimeEnv} from "@/lib/runtime-env";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Owner-only private composite image. No public bucket or durable signed URL. */
export async function GET(request:NextRequest){
 const db=await createServerSupabaseClient(),service=await createServiceSupabaseClient();
 if(!db||!service)return NextResponse.json({ok:false,error:"STORAGE_NOT_CONFIGURED"},{status:503});
 const {data:{user}}=await db.auth.getUser();if(!user)return NextResponse.json({ok:false,error:"SIGN_IN_REQUIRED"},{status:401});
 const env=await runtimeEnv();const admins=(env.SCENTMARKED_ATLAS_ADMIN_EMAILS??"").split(",").map(s=>s.trim().toLowerCase());
 if(!user.email||!admins.includes(user.email.toLowerCase()))return NextResponse.json({ok:false,error:"ADMIN_REQUIRED"},{status:403});
 const id=request.nextUrl.searchParams.get("id")??"";if(!uuid.test(id))return NextResponse.json({ok:false,error:"INVALID_COMPOSITE_ID"},{status:400});
 const {data,error}=await db.from("atlas_product_composites").select("private_storage_path").eq("id",id).eq("owner_user_id",user.id).maybeSingle();
 if(error||!data||data.private_storage_path!=="composites/"+user.id+"/"+id+".png")return NextResponse.json({ok:false,error:"COMPOSITE_NOT_FOUND"},{status:404});
 const {data:bucket,error:bucketError}=await service.storage.getBucket("atlas-graphic-artifacts");
 if(bucketError||!bucket||bucket.public!==false)return NextResponse.json({ok:false,error:"PRIVATE_STORAGE_NOT_READY"},{status:503});
 const {data:image,error:downloadError}=await service.storage.from("atlas-graphic-artifacts").download(data.private_storage_path);
 if(downloadError||!image)return NextResponse.json({ok:false,error:"PREVIEW_UNAVAILABLE"},{status:502});
 if(image.size>4_000_000)return NextResponse.json({ok:false,error:"IMAGE_TOO_LARGE"},{status:413});
 return new NextResponse(await image.arrayBuffer(),{headers:{"content-type":"image/png","cache-control":"private, no-store","x-content-type-options":"nosniff","content-security-policy":"default-src 'none'; sandbox"}});
}
