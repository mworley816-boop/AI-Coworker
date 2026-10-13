import assert from "node:assert/strict";
import {test} from "node:test";
import {validateGraphicProvenance} from "./scentmarked-graphic-provenance.ts";
const base={perfumeId:"perfume-1",brand:"Example",perfumeName:"Example Scent",origin:"generated" as const,generationJobId:"job-123",reviewedIdentity:true,rightsCleared:true};
test("accepts generated art with traceable job and verified identity",()=>assert.equal(validateGraphicProvenance(base).ok,true));
test("rejects untraceable generation",()=>assert.deepEqual(validateGraphicProvenance({...base,generationJobId:""}).reasons,["MISSING_GENERATION_JOB"]));
test("licensed images require source and license evidence",()=>assert.deepEqual(validateGraphicProvenance({...base,origin:"licensed",sourceUrl:"https://example.com/image",licenseReference:""}).reasons,["MISSING_LICENSE_EVIDENCE"]));
test("rejects mismatched or uncleared artwork",()=>assert.deepEqual(validateGraphicProvenance({...base,reviewedIdentity:false,rightsCleared:false}).reasons,["PERFUME_IDENTITY_UNVERIFIED","IMAGE_RIGHTS_UNVERIFIED"]));
