import {isWorkerMaintenanceEnabled} from "./worker-maintenance.ts";

export type WorkerAdmission =
  | {status:503;body:{ok:false;reason:"Worker is not configured"}}
  | {status:401;body:{ok:false;reason:"Unauthorized"}}
  | {status:200;body:{ok:true;paused:true;processed:0;failed:0;reason:"Worker maintenance mode is enabled"}}
  | null;

/** Pure preflight: never accesses a database or dispatches work. */
export function workerAdmission(input:{
  secret:string|undefined;
  serviceRoleKey:string|undefined;
  url:string|undefined;
  authorization:string|null;
  maintenanceFlag:string|undefined;
}):WorkerAdmission{
  if(!input.secret||!input.serviceRoleKey||!input.url)
    return {status:503,body:{ok:false,reason:"Worker is not configured"}};
  if(input.authorization!==`Bearer ${input.secret}`)
    return {status:401,body:{ok:false,reason:"Unauthorized"}};
  if(isWorkerMaintenanceEnabled(input.maintenanceFlag))
    return {status:200,body:{ok:true,paused:true,processed:0,failed:0,reason:"Worker maintenance mode is enabled"}};
  return null;
}
