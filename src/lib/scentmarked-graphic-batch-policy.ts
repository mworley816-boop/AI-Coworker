/** Pure planner for a future opt-in graphics batch worker. Does not invoke providers. */
export type GraphicBatchPlan={allowed:boolean;maxJobs:number;reason:string};
export function planGraphicBatch(input:{requestedJobs:number;workerEnabled:boolean;generationEnabled:boolean;providerConfigured:boolean;privateStorageReady:boolean;explicitlyAuthorized:boolean}):GraphicBatchPlan{
 if(!input.explicitlyAuthorized)return {allowed:false,maxJobs:0,reason:"AUTHORIZATION_REQUIRED"};
 if(!input.workerEnabled||!input.generationEnabled)return {allowed:false,maxJobs:0,reason:"GENERATION_DISABLED"};
 if(!input.providerConfigured)return {allowed:false,maxJobs:0,reason:"PROVIDER_NOT_CONFIGURED"};
 if(!input.privateStorageReady)return {allowed:false,maxJobs:0,reason:"PRIVATE_STORAGE_NOT_READY"};
 if(!Number.isSafeInteger(input.requestedJobs)||input.requestedJobs<1||input.requestedJobs>5)return {allowed:false,maxJobs:0,reason:"BATCH_LIMIT_EXCEEDED"};
 return {allowed:true,maxJobs:input.requestedJobs,reason:"MANUAL_BATCH_AUTHORIZED"};
}
