import type {SupabaseLike} from "@/lib/tools/authorize";

const DEFAULT_LEASE_MS=60_000;

export async function claimRunLease(supabase:SupabaseLike,runId:string,owner:string,leaseMs=DEFAULT_LEASE_MS){
  const leaseSeconds=Math.max(1,Math.ceil(leaseMs/1000));
  const {data,error}=await supabase.rpc("claim_run_lease",{p_run_id:runId,p_owner:owner,p_lease_seconds:leaseSeconds});
  if(error)return {ok:false as const,reason:"Run lease could not be claimed"};
  const claim=Array.isArray(data)?data[0]:data;
  if(!claim)return {ok:false as const,reason:"Run is leased by another worker"};
  return {ok:true as const,expiresAt:claim.lease_expires_at as string};
}

export async function renewRunLease(supabase:SupabaseLike,runId:string,owner:string,leaseMs=DEFAULT_LEASE_MS){
  const expiresAt=new Date(Date.now()+leaseMs).toISOString();
  const renewed=await supabase.from("runs").update({lease_expires_at:expiresAt}).eq("id",runId).eq("lease_owner",owner).gt("lease_expires_at",new Date().toISOString()).select("id").maybeSingle();
  return renewed.error||!renewed.data?{ok:false as const}:{ok:true as const,expiresAt};
}

export async function releaseRunLease(supabase:SupabaseLike,runId:string,owner:string){
  const released=await supabase.from("runs").update({lease_owner:null,lease_expires_at:null}).eq("id",runId).eq("lease_owner",owner).select("id").maybeSingle();
  return released.error||!released.data?{ok:false as const}:{ok:true as const};
}
