import {createClient} from "@/lib/supabase/client";
export async function listPendingApprovals(runId:string){const supabase=createClient();if(!supabase)return [];const {data,error}=await supabase.from("approvals").select("id,run_id,action,reason,payload,status,created_at").eq("run_id",runId).eq("status","pending").order("created_at");if(error)throw error;return data??[];}
