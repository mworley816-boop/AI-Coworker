import assert from "node:assert/strict";
import {test} from "node:test";
import {createScentmarkedStorageTransport} from "./scentmarked-supabase-media-transport.ts";
test("requires HTTPS and a service credential",()=>{
 assert.throws(()=>createScentmarkedStorageTransport({supabaseUrl:"http://example.com",serviceRoleKey:"test"}));
 assert.throws(()=>createScentmarkedStorageTransport({supabaseUrl:"https://example.com",serviceRoleKey:""}));
});
test("rejects URLs with embedded credentials or paths",()=>{
 assert.throws(()=>createScentmarkedStorageTransport({supabaseUrl:"https://user:pass@example.com",serviceRoleKey:"test"}));
 assert.throws(()=>createScentmarkedStorageTransport({supabaseUrl:"https://example.com/other",serviceRoleKey:"test"}));
});
