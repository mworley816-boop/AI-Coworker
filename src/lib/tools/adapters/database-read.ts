import type {ToolAdapter,ToolExecutionResult} from "@/lib/tools/executor";
const fields:Record<string,string>={
coworkers:"id,name,role,status,created_at,updated_at",
tasks:"id,coworker_id,goal,status,created_at",
runs:"id,task_id,status,started_at,finished_at,created_at",
run_steps:"id,run_id,position,kind,title,status,input,output,created_at",
memories:"id,coworker_id,kind,content,metadata,status,source_run_id,expires_at,created_at",
approvals:"id,run_id,action,reason,payload,status,decided_at,created_at",
activity_logs:"id,run_id,event_type,message,metadata,created_at"
};
export const databaseReadAdapter:ToolAdapter={id:"database.read",async execute(input,context):Promise<ToolExecutionResult>{const table=typeof input.table==="string"?input.table:"";const select=fields[table];if(!select)return {ok:false,toolId:"database.read",message:"Requested table is not available to this tool"};const limit=Math.min(Math.max(typeof input.limit==="number"?Math.floor(input.limit):20,1),100);let query=context.supabase.from(table).select(select).limit(limit);if(table==="coworkers")query=query.eq("id",context.coworkerId);else if(table==="tasks")query=query.eq("coworker_id",context.coworkerId);else if(table==="memories")query=query.eq("coworker_id",context.coworkerId);else if(context.runId&&(table==="runs"||table==="run_steps"||table==="approvals"||table==="activity_logs"))query=query.eq(table==="runs"?"id":"run_id",context.runId);else return {ok:false,toolId:"database.read",message:"A run context is required for this table"};const {data,error}=await query;if(error)return {ok:false,toolId:"database.read",message:"Workspace data could not be read"};return {ok:true,toolId:"database.read",message:`Read ${data?.length??0} permitted ${table} records.`,data:{table,records:data??[]}};}};