import {NextRequest,NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";
import {createServiceSupabaseClient} from "@/lib/supabase/service";
import {runtimeEnv} from "@/lib/runtime-env";

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Stores a separate transparent PNG derivative; the reviewed original remains immutable. */
export async function POST(request:NextRequest){
 const db=await createServerSupabaseClient(),service=await createServiceSupabaseClient();
 if(!db||!service)return NextResponse.json({ok:false,error:"STORAGE_UNAVAILABLE"},{status:503});
 const {data:{user}}=await db.auth.getUser();
 if(!user)return NextResponse.json({ok:false,error:"SIGN_IN_REQUIRED"},{status:401});
 const env=await runtimeEnv();
 const admins=(env.SCENTMARKED_ATLAS_ADMIN_EMAILS??"").split(",").map(s=>s.trim().toLowerCase());
 if(!user.email||!admins.includes(user.email.toLowerCase()))return NextResponse.json({ok:false,error:"ADMIN_REQUIRED"},{status:403});
 if(request.headers.get("origin")&&request.headers.get("origin")!==request.nextUrl.origin)return NextResponse.json({ok:false,error:"INVALID_ORIGIN"},{status:403});
 if(Number(request.headers.get("content-length")??0)>5_000_000)return NextResponse.json({ok:false,error:"FILE_TOO_LARGE"},{status:413});
 let form:FormData;
 try{form=await request.formData()}catch{return NextResponse.json({ok:false,error:"INVALID_UPLOAD"},{status:400})}
 const id=form.get("referenceId"),file=form.get("file");
 if(typeof id!=="string"||!uuid.test(id)||!(file instanceof File)||file.size<100||file.size>4_000_000)return NextResponse.json({ok:false,error:"INVALID_REFERENCE_OR_FILE"},{status:400});
 const {data:ref,error}=await db.from("atlas_product_photo_references").select("id,private_storage_path,cutout_storage_path,identity_verified,rights_cleared").eq("id",id).eq("owner_user_id",user.id).single();
 if(error||!ref||!ref.private_storage_path||!ref.identity_verified||!ref.rights_cleared)return NextResponse.json({ok:false,error:"REVIEWED_ORIGINAL_REQUIRED"},{status:403});
 if(ref.cutout_storage_path)return NextResponse.json({ok:false,error:"CUTOUT_ALREADY_STORED"},{status:409});
 const bytes=new Uint8Array(await file.arrayBuffer());
 if(![137,80,78,71,13,10,26,10].every((n,i)=>bytes[i]===n))return NextResponse.json({ok:false,error:"PNG_REQUIRED"},{status:415});
 const path="references/"+user.id+"/"+id+"-cutout.png";
 const {error:uploadError}=await service.storage.from("atlas-graphic-artifacts").upload(path,bytes,{contentType:"image/png",upsert:false});
 if(uploadError)return NextResponse.json({ok:false,error:"PRIVATE_UPLOAD_FAILED"},{status:500});
 const {data:linked,error:linkError}=await db.from("atlas_product_photo_references").update({cutout_storage_path:path}).eq("id",id).eq("owner_user_id",user.id).is("cutout_storage_path",null).select("id").maybeSingle();
 if(linkError||!linked){await service.storage.from("atlas-graphic-artifacts").remove([path]);return NextResponse.json({ok:false,error:"CUTOUT_LINK_FAILED"},{status:500})}
 return NextResponse.json({ok:true,stored:true,notice:"Cutout saved privately beside the original; nothing published."},{headers:{"cache-control":"no-store"}});
}
