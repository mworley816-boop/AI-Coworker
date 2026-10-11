import assert from "node:assert/strict";
import {test} from "node:test";
import {evaluateAutoPublish} from "./scentmarked-auto-publish-policy.ts";
const ready={sourceVerified:true,duplicateReviewPassed:true,catalogConnectionReady:true,authorizedForAutopublish:true,conflictingExistingData:false,image:{rightsCleared:true,identityVerified:true,storageReady:true}};
test("fully validated candidate is eligible",()=>assert.deepEqual(evaluateAutoPublish(ready),{eligible:true,reasons:[]}));
test("blocks automatic publishing until authorized",()=>assert.ok(evaluateAutoPublish({...ready,authorizedForAutopublish:false}).reasons.includes("AUTO_PUBLISH_NOT_AUTHORIZED")));
test("blocks unverified image rights and identity",()=>assert.deepEqual(evaluateAutoPublish({...ready,image:{rightsCleared:false,identityVerified:false,storageReady:true}}).reasons,["IMAGE_RIGHTS_UNVERIFIED","IMAGE_IDENTITY_UNVERIFIED"]));
test("blocks catalog conflicts and duplicate uncertainty",()=>assert.deepEqual(evaluateAutoPublish({...ready,conflictingExistingData:true,duplicateReviewPassed:false}).reasons,["DUPLICATE_REVIEW_INCOMPLETE","CONFLICTING_EXISTING_DATA"]));
