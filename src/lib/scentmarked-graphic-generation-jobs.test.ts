import assert from "node:assert/strict";
import {test} from "node:test";
import {planGraphicGenerationJobs} from "./scentmarked-graphic-generation-jobs.ts";
const a={perfumeId:"1",brand:"Example",perfumeName:"Vanilla",format:"product-card" as const};
test("queues artwork with identity and rights review required",()=>{const r=planGraphicGenerationJobs([a]);assert.equal(r.queued.length,1);assert.equal(r.queued[0].requiresRightsReview,true);assert.equal(r.queued[0].requiresIdentityReview,true);});
test("holds duplicate perfume-format jobs",()=>assert.equal(planGraphicGenerationJobs([a,a]).held[0].reason,"DUPLICATE_GRAPHIC_JOB"));
test("bounds batches",()=>assert.equal(planGraphicGenerationJobs([a,{...a,perfumeId:"2"}],1).held[0].reason,"BATCH_LIMIT_REACHED"));
test("holds incomplete identity",()=>assert.equal(planGraphicGenerationJobs([{...a,brand:" "}]).held[0].reason,"MISSING_PERFUME_IDENTITY"));
