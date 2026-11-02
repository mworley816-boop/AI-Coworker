import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {processQueuedRunBatch} from "@/lib/execution/worker-batch";
import {runtimeEnv} from "@/lib/runtime-env";
import {workerAdmission} from "@/lib/execution/worker-admission";

export const runtime="nodejs";

export async function POST(request:Request){
  const env=await runtimeEnv();
  const secret=env.WORKER_SECRET;
  const serviceRoleKey=env.SUPABASE_SERVICE_ROLE_KEY;
  const url=env.NEXT_PUBLIC_SUPABASE_URL;
  const admission=workerAdmission({
    secret,serviceRoleKey,url,
    authorization:request.headers.get("authorization"),
    maintenanceFlag:env.ATLAS_WORKER_MAINTENANCE_MODE
  });
  if(admission)return NextResponse.json(admission.body,{status:admission.status});
  // Admission only returns null when required configuration is present.
  if(!url||!serviceRoleKey)return NextResponse.json({ok:false,reason:"Worker is not configured"},{status:503});
  const supabase=createClient(url,serviceRoleKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const requestedBatch=Number(request.headers.get("x-worker-batch-size")??"5");
  const batchSize=Number.isFinite(requestedBatch)?Math.max(1,Math.min(Math.floor(requestedBatch),20)):5;
  const workerId=`worker:${crypto.randomUUID()}`;
  const startedAt=Date.now();
  try{
    const result=await processQueuedRunBatch(supabase,workerId,batchSize);
    const durationMs=Date.now()-startedAt;
    return NextResponse.json({...result,workerId,batchSize,durationMs},{status:result.ok?200:500});
  }catch(error){
    console.error("Atlas background worker batch failed",error);
    return NextResponse.json({ok:false,reason:"Worker batch failed unexpectedly",workerId,batchSize,durationMs:Date.now()-startedAt},{status:500});
  }
}
