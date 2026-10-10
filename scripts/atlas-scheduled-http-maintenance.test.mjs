import test from 'node:test';
import assert from 'node:assert/strict';
import { createScheduledHttpMaintenance } from './atlas-scheduled-http-maintenance.mjs';

test('scheduled failure records critical HTTP incident without modifying website', async () => {
  const records = [];
  const run = createScheduledHttpMaintenance({
    repository: { record: async (incident) => { records.push(incident); return { id: '1' }; } },
    healthUrl: 'https://scentmarked.example.test/',
    fetchImpl: async () => ({ status: 503 }),
  });
  const result = await run();
  assert.equal(result.status, 'confirmed');
  assert.equal(result.severity, 'critical');
  assert.equal(records.length, 1);
  assert.equal(records[0].fingerprint, 'scentmarked:production:http-health');
});

test('successful check records recovery for the same fingerprint', async () => {
  let incident;
  const run = createScheduledHttpMaintenance({
    repository: { record: async (record) => { incident = record; return { id: '1' }; } },
    healthUrl: 'https://scentmarked.example.test/',
    fetchImpl: async () => ({ status: 200 }),
  });
  assert.equal((await run()).healthy, true);
  assert.equal(incident.status, 'resolved');
});

test('rejects untrusted URLs and missing repository', () => {
  assert.throws(() => createScheduledHttpMaintenance({
    repository: { record: async () => ({}) }, healthUrl: 'http://example.test',
  }), TypeError);
  assert.throws(() => createScheduledHttpMaintenance({
    repository: {}, healthUrl: 'https://example.test',
  }), TypeError);
});

test('database recording errors propagate to scheduler', async () => {
  const run = createScheduledHttpMaintenance({
    repository: { record: async () => { throw new Error('database unavailable'); } },
    healthUrl: 'https://scentmarked.example.test/',
    fetchImpl: async () => ({ status: 200 }),
  });
  await assert.rejects(run(), /database unavailable/);
});
