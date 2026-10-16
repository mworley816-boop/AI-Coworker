import {NextRequest,NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";
import {createServiceSupabaseClient} from "@/lib/supabase/service";
import {runtimeEnv} from "@/lib/runtime-env";

export async function POST(request:NextRequest){
 const db=await createServerSupabaseClient();const service=await createServiceSupabaseClient();
 if(!db||!service)return NextResponse.json({ok:false,error:"STORAGE_UNAVAILABLE"},{status:503});
 const {data:{user}}=await db.auth.getUser();if(!user)return NextResponse.json({ok:false,error:"SIGN_IN_REQUIRED"},{status:401});
 const env=await runtimeEnv();const admins=(env.SCENTMARKED_ATLAS_ADMIN_EMAILS??"").split(",").map(s=>s.trim().toLowerCase());
 if(!user.email||!admins.includes(user.email.toLowerCase()))return NextResponse.json({ok:false,error:"ADMIN_REQUIRED"},{status:403});
 if(request.headers.get("origin")&&request.headers.get("origin")!==request.nextUrl.origin)return NextResponse.json({ok:false,error:"INVALID_ORIGIN"},{status:403});
 const size=Number(request.headers.get("content-length")??"0");if(size>5_000_000)return NextResponse.json({ok:false,error:"FILE_TOO_LARGE"},{status:413});
 let form:FormData;try{form=await request.formData()}catch{return NextResponse.json({ok:false,error:"INVALID_UPLOAD"},{status:400})}
 const id=form.get("referenceId");const file=form.get("file");
 if(typeof id!=="string"||!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(id)||!(file instanceof File)||file.size>4_000_000||file.size<100)return NextResponse.json({ok:false,error:"INVALID_REFERENCE_OR_FILE"},{status:400});
 const {data:ref,error:lookupError}=await db.from("atlas_product_photo_references").select("id,private_storage_path,identity_verified,rights_cleared").eq("id",id).eq("owner_user_id",user.id).single();
 if(lookupError||!ref||!ref.identity_verified||!ref.rights_cleared)return NextResponse.json({ok:false,error:"REVIEWED_REFERENCE_REQUIRED"},{status:403});
 if(ref.private_storage_path)return NextResponse.json({ok:false,error:"REFERENCE_ALREADY_STORED"},{status:409});
 const bytes=new Uint8Array(await file.arrayBuffer());
 const png=bytes.length>8&&[137,80,78,71,13,10,26,10].every((n,i)=>bytes[i]===n);
 const jpg=bytes.length>4&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255&&bytes[bytes.length-2]===255&&bytes[bytes.length-1]===217;
 if(!png&&!jpg)return NextResponse.json({ok:false,error:"PNG_OR_JPEG_REQUIRED"},{status:415});
 const extension=png?"png":"jpg",path="references/"+user.id+"/"+id+"."+extension;
 const {error:uploadError}=await service.storage.from("atlas-graphic-artifacts").upload(path,bytes,{contentType:png?"image/png":"image/jpeg",upsert:false});
 if(uploadError)return NextResponse.json({ok:false,error:"PRIVATE_UPLOAD_FAILED"},{status:500});
 const {data:linked,error:saveError}=await db.from("atlas_product_photo_references").update({private_storage_path:path}).eq("id",id).eq("owner_user_id",user.id).is("private_storage_path",null).select("id").maybeSingle();
 if(saveError||!linked){await service.storage.from("atlas-graphic-artifacts").remove([path]);return NextResponse.json({ok:false,error:"REFERENCE_LINK_FAILED"},{status:500})}
 return NextResponse.json({ok:true,stored:true,notice:"Original image stored privately in Atlas. Not published or used for generation."},{headers:{"cache-control":"no-store"}});
}
