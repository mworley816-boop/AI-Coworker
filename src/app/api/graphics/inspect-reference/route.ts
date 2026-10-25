import {NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";
import {inspectReferenceImage} from "@/lib/graphics/reference-image-inspection";
export async function POST(request:Request){
 const s=await createServerSupabaseClient();if(!s)return NextResponse.json({ok:false,reason:"Supabase unavailable"},{status:503});
 const {data:{user}}=await s.auth.getUser();if(!user)return NextResponse.json({ok:false,reason:"Sign in required"},{status:401});
 let body:unknown;try{body=await request.json();}catch{return NextResponse.json({ok:false,reason:"Invalid JSON"},{status:400});}
 const referenceUrl=body&&typeof body==="object"&&!Array.isArray(body)?(body as Record<string,unknown>).referenceUrl:undefined;
 if(typeof referenceUrl!=="string")return NextResponse.json({ok:false,reason:"Reference URL required"},{status:400});
 const inspection=await inspectReferenceImage(referenceUrl);
 return NextResponse.json({ok:true,inspection});
}
