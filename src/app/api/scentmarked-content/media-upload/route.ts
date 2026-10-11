import {NextRequest,NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";
import {uploadValidatedScentmarkedMedia} from "@/lib/scentmarked-media-upload-service";
import {createScentmarkedStorageTransport} from "@/lib/scentmarked-supabase-media-transport";
import {MAX_MEDIA_BYTES} from "@/lib/scentmarked-media-preflight";

/** Admin-only media upload endpoint. Live writes require explicit environment opt-in. */
export async function POST(request:NextRequest){
 const supabase=await createServerSupabaseClient();
 if(!supabase)return NextResponse.json({ok:false,reason:"WORKSPACE_NOT_CONFIGURED"},{status:503});
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)return NextResponse.json({ok:false,reason:"SIGN_IN_REQUIRED"},{status:401});
 const admins=(process.env.SCENTMARKED_ATLAS_ADMIN_EMAILS??"").split(",").map(s=>s.trim().toLowerCase()).filter(Boolean);
 if(!user.email||!admins.includes(user.email.toLowerCase()))return NextResponse.json({ok:false,reason:"ADMIN_REQUIRED"},{status:403});
 if(request.headers.get("content-type")?.split(";")[0]!=="application/json")return NextResponse.json({ok:false,reason:"JSON_REQUIRED"},{status:415});
 const maxEncoded=Math.ceil(MAX_MEDIA_BYTES*4/3)+8;
 const declaredLength=Number(request.headers.get("content-length")??"0");
 if(declaredLength>maxEncoded+8192)return NextResponse.json({ok:false,reason:"REQUEST_TOO_LARGE"},{status:413});
 let body:Record<string,unknown>;
 try{const raw=await request.text();if(raw.length>maxEncoded+8192)return NextResponse.json({ok:false,reason:"REQUEST_TOO_LARGE"},{status:413});body=JSON.parse(raw) as Record<string,unknown>;}catch{return NextResponse.json({ok:false,reason:"INVALID_JSON"},{status:400});}
 if(!body||typeof body!=="object"||Array.isArray(body))return NextResponse.json({ok:false,reason:"INVALID_BODY"},{status:400});
 const enabled=process.env.SCENTMARKED_MEDIA_UPLOAD_ENABLED==="true";
 const dryRun=process.env.SCENTMARKED_MEDIA_UPLOAD_LIVE!=="true";
 if(!enabled)return NextResponse.json({ok:false,reason:"MEDIA_AUTOMATION_DISABLED"},{status:503});
 if(typeof body.base64!=="string"||body.base64.length>maxEncoded||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(body.base64))return NextResponse.json({ok:false,reason:"INVALID_MEDIA_ENCODING"},{status:400});
 const bytes=new Uint8Array(Buffer.from(body.base64,"base64"));
 const upload={bucket:typeof body.bucket==="string"?body.bucket:"",path:typeof body.path==="string"?body.path:"",contentType:typeof body.contentType==="string"?body.contentType:"",byteLength:bytes.byteLength,rightsCleared:body.rightsCleared===true,identityVerified:body.identityVerified===true};
 if(dryRun)return NextResponse.json({ok:false,reason:"DRY_RUN_NO_UPLOAD"},{headers:{"cache-control":"no-store"}});
 const base=process.env.SCENTMARKED_SUPABASE_URL,key=process.env.SCENTMARKED_SUPABASE_SERVICE_ROLE_KEY;
 if(!base||!key)return NextResponse.json({ok:false,reason:"STORAGE_NOT_CONFIGURED"},{status:503});
 try{const transport=createScentmarkedStorageTransport({supabaseUrl:base,serviceRoleKey:key});const result=await uploadValidatedScentmarkedMedia(upload,bytes,transport,{enabled,dryRun});return NextResponse.json(result,{status:result.ok?200:422,headers:{"cache-control":"no-store"}})}
 catch{return NextResponse.json({ok:false,reason:"STORAGE_CONFIGURATION_ERROR"},{status:503})}
}
