import assert from "node:assert/strict";
import {test} from "node:test";
import {validateMediaUpload,MAX_MEDIA_BYTES} from "./scentmarked-media-preflight.ts";
const valid={bucket:"perfume-images",path:"perfumes/test-123.webp",contentType:"image/webp",byteLength:1000,rightsCleared:true,identityVerified:true};
test("accepts validated perfume artwork",()=>assert.deepEqual(validateMediaUpload(valid),{ok:true,reasons:[]}));
test("rejects oversized and unlicensed artwork",()=>assert.deepEqual(validateMediaUpload({...valid,byteLength:MAX_MEDIA_BYTES+1,rightsCleared:false}).reasons,["INVALID_MEDIA_SIZE","IMAGE_RIGHTS_UNVERIFIED"]));
test("rejects unsupported buckets and traversal",()=>assert.deepEqual(validateMediaUpload({...valid,bucket:"private",path:"../secret.png"}).reasons,["UNSUPPORTED_BUCKET","INVALID_STORAGE_PATH"]));
test("rejects unsupported MIME types",()=>assert.deepEqual(validateMediaUpload({...valid,contentType:"image/svg+xml"}).reasons,["UNSUPPORTED_MEDIA_TYPE"]));
