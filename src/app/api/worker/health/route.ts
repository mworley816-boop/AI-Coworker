import {NextResponse} from "next/server";

export const runtime="nodejs";

export async function GET(){
  const configured=Boolean(process.env.WORKER_SECRET&&process.env.SUPABASE_SERVICE_ROLE_KEY&&process.env.NEXT_PUBLIC_SUPABASE_URL);
  return NextResponse.json({ok:true,workerConfigured:configured,time:new Date().toISOString()});
}
