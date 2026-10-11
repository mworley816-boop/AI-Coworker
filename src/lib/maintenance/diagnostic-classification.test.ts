import assert from "node:assert/strict";
import {test} from "node:test";
import {classifyScentmarkedDiagnostics as classify} from "./diagnostic-classification.ts";

test("classifies repeated website failures as critical",()=>{
 const findings=classify({websiteHealthy:false,websiteFailureStreak:3,github:"healthy"});
 assert.equal(findings[0].category,"website_outage");
 assert.equal(findings[0].severity,"critical");
 assert.equal(findings[0].approvalRequired,true);
});
test("distinguishes a failed build from an unavailable website",()=>{
 const findings=classify({websiteHealthy:true,websiteFailureStreak:0,github:"failed"});
 assert.deepEqual(findings.map(f=>f.category),["github_build_failure"]);
});
test("reports separate findings when both website and GitHub fail",()=>{
 const findings=classify({websiteHealthy:false,websiteFailureStreak:1,github:"failed"});
 assert.deepEqual(findings.map(f=>f.category),["website_outage","github_build_failure"]);
});
test("reports unavailable GitHub diagnostics without marking website down",()=>{
 const findings=classify({websiteHealthy:true,websiteFailureStreak:0,github:"unavailable"});
 assert.deepEqual(findings.map(f=>f.category),["integration_unavailable"]);
});
test("disabled GitHub monitoring is not misclassified as a failure",()=>{
 const findings=classify({websiteHealthy:true,websiteFailureStreak:0,github:"disabled"});
 assert.equal(findings[0].category,"healthy");
 assert.match(findings[0].summary,/disabled/);
});
