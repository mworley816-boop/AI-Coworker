import assert from "node:assert/strict";
import {test} from "node:test";
import {appendDiagnosticSnapshot} from "./diagnostic-history.ts";
import {classifyScentmarkedDiagnostics} from "./diagnostic-classification.ts";

test("records categories and highest severity without copying investigation details",()=>{
 const findings=classifyScentmarkedDiagnostics({websiteHealthy:false,websiteFailureStreak:3,github:"failed"});
 const result=appendDiagnosticSnapshot([],"2026-10-11T12:00:00Z",findings);
 assert.deepEqual(result,[{at:"2026-10-11T12:00:00Z",categories:["website_outage","github_build_failure"],highestSeverity:"critical"}]);
 assert.equal(JSON.stringify(result).includes("investigationSteps"),false);
});
test("limits retained history to 96 snapshots",()=>{
 let history=Array.from({length:120},(_,i)=>({at:String(i),categories:["healthy"],highestSeverity:"info" as const}));
 const result=appendDiagnosticSnapshot(history,"new",[]);
 assert.equal(result.length,96);
 assert.equal(result[0].at,"25");
 assert.equal(result.at(-1)?.at,"new");
});
test("ignores invalid previously stored history",()=>{
 assert.equal(appendDiagnosticSnapshot([{at:1}],"now",[]).length,1);
 assert.equal(appendDiagnosticSnapshot(null,"now",[]).length,1);
});
