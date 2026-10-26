import {NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";
import {inspectReferenceImage} from "@/lib/graphics/reference-image-inspection";
import {parsePrivateReference} from "@/lib/graphics/private-r2";
export async function POST(request:Request){
 const s=await createServerSupabaseClient();if(!s)return NextResponse.json({ok:false,reason:"Supabase unavailable"},{status:503});
 const {data:{user}}=await s.auth.getUser();if(!user)return NextResponse.json({ok:false,reason:"Sign in required"},{status:401});
 let body:unknown;try{body=await request.json();}catch{return NextResponse.json({ok:false,reason:"Invalid JSON"},{status:400});}
 const referenceUrl=body&&typeof body==="object"&&!Array.isArray(body)?(body as Record<string,unknown>).referenceUrl:undefined;
 if(typeof referenceUrl!=="string")return NextResponse.json({ok:false,reason:"Reference URL required"},{status:400});
 if(referenceUrl.startsWith("r2://")){
  const runId=body&&typeof body==="object"&&!Array.isArray(body)?(body as Record<string,unknown>).runId:undefined;
  const key=parsePrivateReference(referenceUrl);
  if(typeof runId!=="string"||!key||!key.startsWith(user.id+"/"+runId+"/"))return NextResponse.json({ok:false,reason:"Private reference access denied"},{status:403});
  const owned=await s.from("runs").select("id,tasks!inner(user_id)").eq("id",runId).eq("tasks.user_id",user.id).maybeSingle();
  if(owned.error||!owned.data)return NextResponse.json({ok:false,reason:"Run access denied"},{status:403});
 }
 const inspection=await inspectReferenceImage(referenceUrl);
 return NextResponse.json({ok:true,inspection});
}
