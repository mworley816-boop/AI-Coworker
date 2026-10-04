import {databaseReadAdapter} from "./adapters/database-read";
import {databaseWriteAdapter} from "./adapters/database-write";
import {webResearchAdapter} from "./adapters/web-research";
import {filesReadAdapter} from "./adapters/files-read";
import {authorizeTool,type SupabaseLike} from "./authorize";
export type ToolExecutionContext={coworkerId:string;runId?:string;approved?:boolean;supabase:SupabaseLike};
export type ToolExecutionResult={ok:boolean;toolId:string;message:string;data?:Record<string,unknown>};
export type ToolAdapter={id:string;execute(input:Record<string,unknown>,context:ToolExecutionContext):Promise<ToolExecutionResult>};
const adapters=new Map<string,ToolAdapter>();
adapters.set(webResearchAdapter.id,webResearchAdapter);
adapters.set(databaseReadAdapter.id,databaseReadAdapter);
adapters.set(databaseWriteAdapter.id,databaseWriteAdapter);
adapters.set(filesReadAdapter.id,filesReadAdapter);
export function registerToolAdapter(adapter:ToolAdapter){adapters.set(adapter.id,adapter);}
export async function executeTool(toolId:string,input:Record<string,unknown>,context:ToolExecutionContext){const permission=await authorizeTool(context.coworkerId,toolId,Boolean(context.approved),context.supabase);if(!permission.allowed){await audit(context,"tool.blocked",`${toolId}: ${permission.reason}`,{toolId,reason:permission.reason});return {ok:false,toolId,message:permission.reason};}const adapter=adapters.get(toolId);if(!adapter){await audit(context,"tool.unavailable",`${toolId} is authorized but has no connected adapter.`,{toolId});return {ok:false,toolId,message:"Tool adapter is not connected"};}await audit(context,"tool.started",`${toolId} started.`,{toolId,access:permission.tool.access,approvalRequired:permission.tool.requiresApproval||permission.tool.access==="write",approved:Boolean(context.approved)});try{const result=await adapter.execute(input,context);await audit(context,result.ok?"tool.completed":"tool.failed",result.message,{toolId,ok:result.ok});return result;}catch(error){const message=error instanceof Error?error.message:"Tool execution failed";await audit(context,"tool.failed",message,{toolId,ok:false});return {ok:false,toolId,message};}}
async function audit(context:ToolExecutionContext,event_type:string,message:string,metadata:Record<string,unknown>){if(!context.runId)return;await context.supabase.from("activity_logs").insert({run_id:context.runId,event_type,message,metadata});}