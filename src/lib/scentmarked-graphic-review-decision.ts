export type GraphicReviewDecision="approve"|"reject";
export function planGraphicReviewUpdate(decision:unknown,identityVerified:unknown,rightsCleared:unknown):{ok:true;update:{status:"approved"|"held";identity_verified:boolean;rights_cleared:boolean;error_code:null|"REJECTED_BY_REVIEWER"}}|{ok:false;error:"INVALID_DECISION"|"REVIEW_CONFIRMATION_REQUIRED"}{
 if(decision!=="approve"&&decision!=="reject")return {ok:false,error:"INVALID_DECISION"};
 if(decision==="approve"&&(identityVerified!==true||rightsCleared!==true))return {ok:false,error:"REVIEW_CONFIRMATION_REQUIRED"};
 const approved=decision==="approve";
 return {ok:true,update:{status:approved?"approved":"held",identity_verified:approved,rights_cleared:approved,error_code:approved?null:"REJECTED_BY_REVIEWER"}};
}
