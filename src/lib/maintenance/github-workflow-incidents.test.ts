import assert from "node:assert/strict";
import {test} from "node:test";
import {inspectFailedScentmarkedRuns,summarizeWorkflowIncidents} from "./github-workflow-incidents";

function fakeResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {status, headers: {"content-type": "application/json"}});
}
test("reports only failed runs and failed steps without exposing credentials", async () => {
  const urls: string[] = [];
  const fetchImpl = (async (input: string | URL | Request) => {
    const url = String(input);
    urls.push(url);
    if (url.includes("/jobs?")) return fakeResponse({jobs: [
      {id: 12, name: "verify", conclusion: "failure", steps: [{number: 2, name: "Typecheck", conclusion: "failure"}, {number: 3, name: "Cleanup", conclusion: "success"}]},
      {id: 13, name: "other", conclusion: "success", steps: []},
    ]});
    return fakeResponse({workflow_runs: [{id: 42, name: "CI", conclusion: "failure"}, {id: 43, name: "OK", conclusion: "success"}]});
  }) as typeof fetch;
  const incidents = await inspectFailedScentmarkedRuns({owner: "owner", repo: "repo", token: "private-token", fetchImpl});
  assert.equal(incidents.length, 1);
  assert.deepEqual(incidents[0].jobs[0].failedSteps, [{number: 2, name: "Typecheck"}]);
  assert.equal(incidents[0].approvalRequired, true);
  assert.equal(JSON.stringify(incidents).includes("private-token"), false);
  assert.equal(urls.length, 2);
  assert.equal(summarizeWorkflowIncidents(incidents).status, "warning");
});
test("empty failure list reports healthy", async () => {
  const fetchImpl = (async () => fakeResponse({workflow_runs: []})) as typeof fetch;
  assert.equal(summarizeWorkflowIncidents(await inspectFailedScentmarkedRuns({owner: "owner", repo: "repo", token: "token", fetchImpl})).status, "healthy");
});
test("GitHub authorization errors are sanitized", async () => {
  const fetchImpl = (async () => fakeResponse({message: "private-token"}, 401)) as typeof fetch;
  await assert.rejects(inspectFailedScentmarkedRuns({owner: "owner", repo: "repo", token: "private-token", fetchImpl}), /HTTP 401/);
});
test("rejects invalid repository and limits", async () => {
  await assert.rejects(inspectFailedScentmarkedRuns({owner: "../bad", repo: "repo", token: "token"}), TypeError);
  await assert.rejects(inspectFailedScentmarkedRuns({owner: "owner", repo: "repo", token: "token", maxRuns: 100}), RangeError);
});
