import type {SupabaseLike} from "@/lib/tools/authorize";

const DEFAULT_LEASE_MS=60_000;

export async function claimRunLease(supabase:SupabaseLike,runId:string,owner:string,leaseMs=DEFAULT_LEASE_MS){
  const now=new Date();
  const expiresAt=new Date(now.getTime()+leaseMs).toISOString();
  const {data:run,error}=await supabase.from("runs").select("id,lease_owner,lease_expires_at").eq("id",runId).maybeSingle();
  if(error||!run)return {ok:false as const,reason:"Run lease could not be loaded"};
  const active=typeof run.lease_expires_at==="string"&&new Date(run.lease_expires_at).getTime()>now.getTime();
  if(active&&run.lease_owner!==owner)return {ok:false as const,reason:"Run is leased by another worker"};
  const claim=await supabase.from("runs").update({lease_owner:owner,lease_expires_at:expiresAt}).eq("id",runId).eq("lease_owner",run.lease_owner).select("id").maybeSingle();
  if(claim.error||!claim.data)return {ok:false as const,reason:"Run lease changed before it could be claimed"};
  return {ok:true as const,expiresAt};
}

export async function renewRunLease(supabase:SupabaseLike,runId:string,owner:string,leaseMs=DEFAULT_LEASE_MS){
  const expiresAt=new Date(Date.now()+leaseMs).toISOString();
  const renewed=await supabase.from("runs").update({lease_expires_at:expiresAt}).eq("id",runId).eq("lease_owner",owner).select("id").maybeSingle();
  return renewed.error||!renewed.data?{ok:false as const}:{ok:true as const,expiresAt};
}

export async function releaseRunLease(supabase:SupabaseLike,runId:string,owner:string){
  const released=await supabase.from("runs").update({lease_owner:null,lease_expires_at:null}).eq("id",runId).eq("lease_owner",owner).select("id").maybeSingle();
  return released.error||!released.data?{ok:false as const}:{ok:true as const};
}
