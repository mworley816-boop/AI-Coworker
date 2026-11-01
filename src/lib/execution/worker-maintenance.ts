/** A deployment-time admission guard; not a substitute for draining in-flight jobs. */
export function isWorkerMaintenanceEnabled(value:string|undefined):boolean{
  return value==="true";
}
