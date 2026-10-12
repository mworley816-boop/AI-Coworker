/** Fail-closed authorization for a generated private graphic awaiting human review. */
export function canReviewGeneratedGraphic(job:{owner_user_id:string;status:string;output_storage_path:string|null}|null,userId:string,jobId:string):boolean{
 return !!job&&job.owner_user_id===userId&&job.status==="generated"&&job.output_storage_path==="generated/"+jobId+".png";
}
