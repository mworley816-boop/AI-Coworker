/**
 * Graphics generation preflight. A metadata candidate is never image approval.
 * Produces a plan only; does not invoke a model, download images or publish.
 */
import type {BottleVariantAssessment} from "./bottle-variant-matching";
export type GraphicsBrief={
 brand:string;perfumeName:string;artworkType:"catalog_card"|"social_square"|"banner";
 referenceUrl?:string;referenceApproved:boolean;rightsConfirmed:boolean;
 bottleVisuallyVerified:boolean;variant?:BottleVariantAssessment;
};
export type GraphicsPreflight={ready:boolean;blockers:string[];instructions:string[];status:"blocked"|"ready_for_generation"};
export function evaluateGraphicsPreflight(brief:GraphicsBrief):GraphicsPreflight{
 const blockers:string[]=[];
 if(!brief.brand.trim()||!brief.perfumeName.trim())blockers.push("Brand and perfume name are required.");
 if(!["catalog_card","social_square","banner"].includes(brief.artworkType))blockers.push("Artwork type is unsupported.");
 if(!brief.referenceUrl)blockers.push("An approved reference image URL is required.");
 else{
  try{const url=new URL(brief.referenceUrl);if(url.protocol!=="https:"||url.username||url.password)blockers.push("Reference must be a valid HTTPS URL without credentials.");}
  catch{blockers.push("Reference URL is invalid.");}
 }
 if(!brief.referenceApproved)blockers.push("A reviewer must approve the actual reference image.");
 if(!brief.rightsConfirmed)blockers.push("Image usage rights must be confirmed.");
 if(!brief.bottleVisuallyVerified)blockers.push("Bottle appearance must be visually verified.");
 if(!brief.variant||brief.variant.status!=="candidate")blockers.push("Requested bottle variant metadata must match.");
 const instructions=[
  "Use only the approved, visually verified bottle reference; never invent or redesign bottle shape, label, cap or logo.",
  "Do not alter branding, size, concentration or edition shown on the reference.",
  "If faithful reference-preserving rendering is not possible, stop and request human review.",
  "Generated output requires separate human approval before catalog upload or publication."
 ];
 return {ready:blockers.length===0,blockers,instructions,status:blockers.length?"blocked":"ready_for_generation"};
}
