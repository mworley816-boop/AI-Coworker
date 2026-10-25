/**
 * Build a graphics job proposal from saved review attestations.
 * This never calls an image provider or grants publication permission.
 */
import {evaluateGraphicsPreflight,type GraphicsBrief} from "./generation-preflight";
import type {BottleVariantAssessment} from "./bottle-variant-matching";
export type GraphicsReviewDraft={brand:string;perfumeName:string;referenceUrl:string;artworkType:GraphicsBrief["artworkType"];referenceApproved:boolean;rightsConfirmed:boolean;bottleVisuallyVerified:boolean;variantConfirmed:boolean};
export type GraphicsJobProposal={status:"blocked"|"prepared";blockers:string[];prompt:string|null;referenceUrl:string|null;requiresOutputApproval:true;mayPublish:false;mayGenerateAutomatically:false};
export function prepareGraphicsJob(draft:GraphicsReviewDraft):GraphicsJobProposal{
 // Variant confirmation is a reviewer attestation, not visual recognition.
 const variant:BottleVariantAssessment|undefined=draft.variantConfirmed?{status:"candidate",matchedFields:["brand","perfumeName"],missingFields:[],conflicts:[],requiresVisualVerification:true,usageRights:"unknown",safeToGenerate:false,reason:"Reviewer attestation; not independently verified."}:undefined;
 const check=evaluateGraphicsPreflight({...draft,variant});
 if(!check.ready)return {status:"blocked",blockers:check.blockers,prompt:null,referenceUrl:null,requiresOutputApproval:true,mayPublish:false,mayGenerateAutomatically:false};
 const identity=[draft.brand.trim(),draft.perfumeName.trim()].join(" — ");
 const prompt=["Prepare a "+draft.artworkType.replace(/_/g," ")+" artwork proposal for "+identity+".",...check.instructions,"Reference: "+draft.referenceUrl,"Do not claim independent product authentication."].join("\n");
 return {status:"prepared",blockers:[],prompt,referenceUrl:draft.referenceUrl,requiresOutputApproval:true,mayPublish:false,mayGenerateAutomatically:false};
}
