import {extractPerfumeFacts} from "./scentmarked-perfume-source-extract";
export type PerfumeExtractionDiagnostic={
 status:"ready"|"no_product_schema"|"no_explicit_notes";
 productName:string|null;
 noteCount:number;
 /** Facts are research hints, not manufacturer-verified records. */
};
export function diagnosePerfumeExtraction(html:string):PerfumeExtractionDiagnostic{
 const facts=extractPerfumeFacts(html);
 if(!facts.name)return {status:"no_product_schema",productName:null,noteCount:0};
 if(!facts.notes.length)return {status:"no_explicit_notes",productName:facts.name,noteCount:0};
 return {status:"ready",productName:facts.name,noteCount:facts.notes.length};
}
