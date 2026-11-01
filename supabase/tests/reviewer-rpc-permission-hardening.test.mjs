import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";

const sql = readFileSync(new URL("./reviewer-rpc-permission-hardening.sql", import.meta.url), "utf8");
const functions = [
  "public.is_scentmarked_reviewer\\(\\)",
  "public.list_pending_scentmarked_proposals\\(integer\\)",
  "public.review_scentmarked_proposal\\(uuid,text,text\\)",
];
for (const signature of functions) {
  test(`reviewer RPC ${signature} denies anonymous execution but retains authenticated access`, () => {
    assert.match(sql, new RegExp(`revoke execute on function ${signature} from public, anon;`, "i"));
    assert.match(sql, new RegExp(`grant execute on function ${signature} to authenticated;`, "i"));
  });
}
test("hardening SQL is transaction-wrapped and avoids function replacement", () => {
  assert.match(sql, /begin;[\s\S]*commit;/i);
  assert.doesNotMatch(sql, /create\\s+or\\s+replace|drop\\s+function/i);
});
