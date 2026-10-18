/** Classify a worker's result without treating a paused or approval-gated run as finished. */
export function classifyWorkerOutcome(result:{ok:boolean;result?:{status?:string}}):"failed"|"completed"|"deferred"{
  if(!result.ok)return "failed";
  return result.result?.status==="completed"?"completed":"deferred";
}
