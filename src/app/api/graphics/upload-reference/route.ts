import {NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";
import {referenceBucket,R2_PREFIX} from "@/lib/graphics/private-r2";
import {inspectImageResponse} from "@/lib/graphics/reference-image-inspection";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function POST(request:Request){
 const s=await createServerSupabaseClient();if(!s)return NextResponse.json({ok:false,reason:"Supabase unavailable"},{status:503});
 const {data:{user}}=await s.auth.getUser();if(!user)return NextResponse.json({ok:false,reason:"Sign in required"},{status:401});
 const declared=Number(request.headers.get("content-length")??"0");
 if(declared>9*1024*1024)return NextResponse.json({ok:false,reason:"Upload too large"},{status:413});
 let form:FormData;try{form=await request.formData();}catch{return NextResponse.json({ok:false,reason:"Invalid upload"},{status:400});}
 const runId=form.get("runId"),file=form.get("image");
 if(typeof runId!=="string"||!uuid.test(runId)||!(file instanceof File))return NextResponse.json({ok:false,reason:"Run and image required"},{status:400});
 if(file.size===0||file.size>8*1024*1024)return NextResponse.json({ok:false,reason:"Image must be 1 byte to 8 MiB"},{status:413});
 const owned=await s.from("runs").select("id,tasks!inner(user_id)").eq("id",runId).eq("tasks.user_id",user.id).maybeSingle();
 if(owned.error)return NextResponse.json({ok:false,reason:"Run lookup failed"},{status:500});
 if(!owned.data)return NextResponse.json({ok:false,reason:"Run not found"},{status:404});
 const bytes=new Uint8Array(await file.arrayBuffer());
 const inspection=inspectImageResponse(file.type,String(bytes.byteLength),bytes);
 if(!inspection.ok)return NextResponse.json({ok:false,reason:inspection.reason},{status:415});
 const bucket=await referenceBucket();
 if(!bucket)return NextResponse.json({ok:false,reason:"Private reference storage is not bound to Atlas Worker"},{status:503});
 const key=user.id+"/"+runId+"/"+crypto.randomUUID();
 try{await bucket.put(key,bytes,{httpMetadata:{contentType:inspection.contentType}});}
 catch{return NextResponse.json({ok:false,reason:"Reference could not be stored"},{status:500});}
 return NextResponse.json({ok:true,referenceUrl:R2_PREFIX+key,reason:"Reference stored privately. Verify bottle identity and image rights before approving."},{headers:{"Cache-Control":"no-store"}});
}
