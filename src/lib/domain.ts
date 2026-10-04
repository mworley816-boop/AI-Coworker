export type CoworkerStatus="ready"|"working"|"paused"|"disabled";
export type TaskStatus="queued"|"running"|"paused"|"waiting_approval"|"completed"|"failed"|"cancelled";
export type ApprovalStatus="pending"|"approved"|"executing"|"rejected"|"consumed";
export interface Coworker{id:string;name:string;role:string;instructions:string;status:CoworkerStatus;}
export interface Task{id:string;coworkerId:string;goal:string;status:TaskStatus;}
export interface Run{id:string;taskId:string;status:TaskStatus;startedAt?:string;finishedAt?:string;}
export interface Approval{id:string;runId:string;action:string;reason:string;status:ApprovalStatus;}