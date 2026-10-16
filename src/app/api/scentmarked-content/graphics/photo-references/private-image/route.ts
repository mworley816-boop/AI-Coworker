import {NextRequest,NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";
import {createServiceSupabaseClient} from "@/lib/supabase/service";
import {runtimeEnv} from "@/lib/runtime-env";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Streams only the signed-in owner's reviewed original; never exposes public storage URLs. */
export async function GET(request:NextRequest){
 const db=await createServerSupabaseClient();const service=await createServiceSupabaseClient();
 if(!db||!service)return NextResponse.json({ok:false,error:"STORAGE_UNAVAILABLE"},{status:503});
 const {data:{user}}=await db.auth.getUser();if(!user)return NextResponse.json({ok:false,error:"SIGN_IN_REQUIRED"},{status:401});
 const env=await runtimeEnv();const admins=(env.SCENTMARKED_ATLAS_ADMIN_EMAILS??"").split(",").map(s=>s.trim().toLowerCase());
 if(!user.email||!admins.includes(user.email.toLowerCase()))return NextResponse.json({ok:false,error:"ADMIN_REQUIRED"},{status:403});
 const id=request.nextUrl.searchParams.get("referenceId")??"";if(!uuid.test(id))return NextResponse.json({ok:false,error:"INVALID_REFERENCE_ID"},{status:400});
 const {data:ref,error}=await db.from("atlas_product_photo_references").select("private_storage_path,cutout_storage_path,identity_verified,rights_cleared").eq("id",id).eq("owner_user_id",user.id).single();
 if(error||!ref||!ref.identity_verified||!ref.rights_cleared)return NextResponse.json({ok:false,error:"REFERENCE_NOT_AVAILABLE"},{status:404});
 const wantsCutout=request.nextUrl.searchParams.get("variant")==="cutout";
 const path=wantsCutout?ref.cutout_storage_path:ref.private_storage_path;
 if(!path)return NextResponse.json({ok:false,error:"REFERENCE_IMAGE_NOT_AVAILABLE"},{status:404});
 if(![ "references/"+user.id+"/"+id+".png", "references/"+user.id+"/"+id+".jpg", ...(wantsCutout?["references/"+user.id+"/"+id+"-cutout.png"]:[]) ].includes(path))return NextResponse.json({ok:false,error:"INVALID_STORAGE_PATH"},{status:400});
 const {data,error:downloadError}=await service.storage.from("atlas-graphic-artifacts").download(path);
 if(downloadError||!data)return NextResponse.json({ok:false,error:"REFERENCE_DOWNLOAD_FAILED"},{status:502});
 if(data.size>4_000_000)return NextResponse.json({ok:false,error:"REFERENCE_TOO_LARGE"},{status:413});
 const type=path.endsWith(".png")?"image/png":"image/jpeg";
 return new NextResponse(await data.arrayBuffer(),{headers:{"content-type":type,"cache-control":"private, no-store","x-content-type-options":"nosniff","content-security-policy":"default-src 'none'; sandbox"}});
}
