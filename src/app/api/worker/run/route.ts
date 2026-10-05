import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {processNextQueuedRun} from "@/lib/execution/worker";

export const runtime="nodejs";

export async function POST(request:Request){
  const secret=process.env.WORKER_SECRET;
  const serviceRoleKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  if(!secret||!serviceRoleKey||!url)return NextResponse.json({ok:false,reason:"Worker is not configured"},{status:503});
  const authorization=request.headers.get("authorization");
  if(authorization!==`Bearer ${secret}`)return NextResponse.json({ok:false,reason:"Unauthorized"},{status:401});
  const supabase=createClient(url,serviceRoleKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const workerId=`worker:${crypto.randomUUID()}`;
  const result=await processNextQueuedRun(supabase,workerId);
  return NextResponse.json(result,{status:result.ok?200:500});
}
