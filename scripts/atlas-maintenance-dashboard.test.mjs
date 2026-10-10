import test from 'node:test';
import assert from 'node:assert/strict';
import { createMaintenanceDashboard } from './atlas-maintenance-dashboard.mjs';

test('dashboard summarizes confirmed incidents and removes raw evidence', async () => {
  const dashboard = createMaintenanceDashboard({
    list: async () => [
      { id: '1', project: 'scentmarked', status: 'confirmed', severity: 'critical', observed_evidence: { token: 'private' } },
      { id: '2', project: 'scentmarked', status: 'investigating', severity: 'warning' },
    ],
  });
  const result = await dashboard({});
  assert.equal(result.summary.confirmed_incidents_in_page.critical, 1);
  assert.equal(result.summary.confirmed_incidents_in_page.warning, 0);
  assert.equal(result.incidents[0].observed_evidence, undefined);
  assert.equal(result.incidents.length, 2);
});
test('dashboard scopes list query to Scentmarked by default', async () => {
  let requested;
  const dashboard = createMaintenanceDashboard({ list: async (args) => { requested = args; return []; } });
  await dashboard();
  assert.equal(requested.project, 'scentmarked');
});
test('dashboard rejects unsafe project values', async () => {
  const dashboard = createMaintenanceDashboard({ list: async () => [] });
  await assert.rejects(dashboard({ project: '../other' }), TypeError);
});

test('dashboard fails closed on malformed repository response', async () => {
  const dashboard = createMaintenanceDashboard({ list: async () => null });
  await assert.rejects(dashboard(), /Invalid incident repository response/);
});

test('dashboard limits summary to confirmed incidents on the returned page', async () => {
  const dashboard = createMaintenanceDashboard({
    list: async () => [
      { id: '1', status: 'confirmed', severity: 'warning' },
      { id: '2', status: 'deployment_succeeded', severity: 'critical' },
      { id: '3', status: 'confirmed', severity: 'informational' },
    ],
  });
  const result = await dashboard();
  assert.deepEqual(result.summary.confirmed_incidents_in_page, {
    critical: 0, warning: 1, informational: 1,
  });
  assert.equal(result.summary.displayed, 3);
});
