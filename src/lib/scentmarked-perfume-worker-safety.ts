/** Conservative gate for unattended perfume research.
 * Deliberately separate from draft approval and publishing.
 */
export type ResearchWorkerSettings={
 schedulerEnabled:boolean;
 workerEnabled:boolean;
 batchSize:number;
};
export function validateResearchWorkerSettings(settings:ResearchWorkerSettings):
 {ok:true;limit:number}|{ok:false;reason:string}{
 if(!settings.schedulerEnabled||!settings.workerEnabled)return {ok:false,reason:"WORKER_DISABLED"};
 if(!Number.isInteger(settings.batchSize)||settings.batchSize<1||settings.batchSize>5)return {ok:false,reason:"INVALID_BATCH_SIZE"};
 return {ok:true,limit:settings.batchSize};
}
