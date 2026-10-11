import assert from "node:assert/strict";
import {test} from "node:test";
import {uploadValidatedScentmarkedMedia} from "./scentmarked-media-upload-service.ts";
const request={bucket:"perfume-images",path:"perfumes/test.webp",contentType:"image/webp",byteLength:3,rightsCleared:true,identityVerified:true};
test("disabled mode never calls storage",async()=>{let calls=0;const result=await uploadValidatedScentmarkedMedia(request,new Uint8Array(3),async()=>{calls++;return {path:request.path}});assert.equal(result.reason,"MEDIA_AUTOMATION_DISABLED");assert.equal(calls,0)});
test("dry run never calls storage",async()=>{let calls=0;const result=await uploadValidatedScentmarkedMedia(request,new Uint8Array(3),async()=>{calls++;return {path:request.path}},{enabled:true});assert.equal(result.reason,"DRY_RUN_NO_UPLOAD");assert.equal(calls,0)});
test("rejects mismatched media size",async()=>{const result=await uploadValidatedScentmarkedMedia(request,new Uint8Array(2),async()=>({path:request.path}),{enabled:true,dryRun:false});assert.equal(result.reason,"MEDIA_SIZE_MISMATCH")});
test("valid upload uses transport only with explicit live mode",async()=>{let calls=0;const result=await uploadValidatedScentmarkedMedia(request,new Uint8Array(3),async input=>{calls++;assert.equal(input.bucket,"perfume-images");return {path:input.path}},{enabled:true,dryRun:false});assert.equal(result.ok,true);assert.equal(calls,1)});
test("invalid image rights prevent transport call",async()=>{let calls=0;const result=await uploadValidatedScentmarkedMedia({...request,rightsCleared:false},new Uint8Array(3),async()=>{calls++;return {path:request.path}},{enabled:true,dryRun:false});assert.equal(result.ok,false);assert.equal(calls,0)});
