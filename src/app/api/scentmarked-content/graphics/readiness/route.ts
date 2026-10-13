import {NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";
import {createServiceSupabaseClient} from "@/lib/supabase/service";
import {runtimeEnv} from "@/lib/runtime-env";
/** Read-only readiness diagnostics; never returns credentials or performs generation. */
export async function GET(){
 const session=await createServerSupabaseClient();
 if(!session)return NextResponse.json({ok:false,status:"WORKSPACE_NOT_CONFIGURED"},{status:503});
 const {data:{user}}=await session.auth.getUser();
 if(!user)return NextResponse.json({ok:false,status:"SIGN_IN_REQUIRED"},{status:401});
 const env=await runtimeEnv();
 const admins=(env.SCENTMARKED_ATLAS_ADMIN_EMAILS??"").split(",").map(s=>s.trim().toLowerCase()).filter(Boolean);
 if(!user.email||!admins.includes(user.email.toLowerCase()))return NextResponse.json({ok:false,status:"ADMIN_REQUIRED"},{status:403});
 const flags={workerEnabled:env.SCENTMARKED_GRAPHIC_WORKER_ENABLED==="true",generationEnabled:env.SCENTMARKED_IMAGE_GENERATION_ENABLED==="true",providerConfigured:Boolean(env.OPENAI_API_KEY)};
 const service=await createServiceSupabaseClient();
 let queueReady=false;let storageReady=false;
 if(service){
  const queue=await service.from("scentmarked_graphic_jobs").select("id",{head:true,count:"exact"}).limit(1);
  queueReady=!queue.error;
  const bucket=await service.storage.getBucket("atlas-graphic-artifacts");
  storageReady=!bucket.error&&bucket.data?.public===false;
 }
 const ready=Object.values(flags).every(Boolean)&&queueReady&&storageReady;
 return NextResponse.json({ok:true,ready,...flags,queueReady,privateStorageReady:storageReady},{headers:{"cache-control":"no-store"}});
}
