import assert from "node:assert/strict";
import {test} from "node:test";
import {inspectFailedScentmarkedRuns,summarizeWorkflowIncidents} from "./github-workflow-incidents.ts";

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
    return fakeResponse({workflow_runs: [{id: 42, name: "CI", status: "completed", conclusion: "failure"}, {id: 43, name: "OK", status: "completed", conclusion: "success"}]});
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

test("maintenance summary retains safe links, failed jobs, and steps", () => {
  const incidents = [{runId: 42, workflow: "CI", url: "https://github.com/owner/repo/actions/runs/42", jobs: [{id: 12, name: "verify", failedSteps: [{number: 2, name: "Typecheck"}]}], approvalRequired: true as const}];
  const summary = summarizeWorkflowIncidents(incidents);
  assert.equal(summary.status, "warning");
  assert.deepEqual(summary.incidents, [{runId: 42, workflow: "CI", url: "https://github.com/owner/repo/actions/runs/42", jobs: [{id: 12, name: "verify", failedSteps: [{number: 2, name: "Typecheck"}]}]}]);
  assert.equal(JSON.stringify(summary).includes("approvalRequired"), false);
});
test("maintenance summary includes an empty incident list when healthy", () => {
  const summary = summarizeWorkflowIncidents([]);
  assert.equal(summary.status, "healthy");
  assert.deepEqual(summary.incidents, []);
});

test("ignores an old failed run after the same workflow succeeds", async () => {
 const fetchImpl = (async () => fakeResponse({workflow_runs: [
  {id: 102, name: "Verify", status: "completed", conclusion: "success"},
  {id: 101, name: "Verify", status: "completed", conclusion: "failure"},
 ]})) as typeof fetch;
 const incidents = await inspectFailedScentmarkedRuns({owner:"owner",repo:"repo",token:"token",fetchImpl});
 assert.deepEqual(incidents,[]);
});
test("ignores a running workflow when selecting the latest completed run", async () => {
 const fetchImpl = (async (input: string | URL | Request) => String(input).includes("/jobs?")
  ? fakeResponse({jobs: []})
  : fakeResponse({workflow_runs: [
    {id: 103, name: "Verify", status: "in_progress", conclusion: null},
    {id: 102, name: "Verify", status: "completed", conclusion: "failure"},
  ]})) as typeof fetch;
 const incidents = await inspectFailedScentmarkedRuns({owner:"owner",repo:"repo",token:"token",fetchImpl});
 assert.deepEqual(incidents.map(x=>x.runId),[102]);
});
