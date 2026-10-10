import test from 'node:test';
import assert from 'node:assert/strict';
import { createIncidentRepository } from './atlas-incident-repository.mjs';

test('rejects missing client', () => {
  assert.throws(() => createIncidentRepository(null), TypeError);
});

test('list limits results and scopes project', async () => {
  const calls = [];
  const query = {
    select: (...args) => { calls.push(['select', ...args]); return query; },
    eq: (...args) => { calls.push(['eq', ...args]); return query; },
    order: (...args) => { calls.push(['order', ...args]); return query; },
    limit: async (...args) => { calls.push(['limit', ...args]); return { data: [{ id: 'ok' }], error: null }; },
  };
  const repo = createIncidentRepository({ from: () => query });
  assert.deepEqual(await repo.list({ limit: 500 }), [{ id: 'ok' }]);
  assert.deepEqual(calls.find((call) => call[0] === 'eq'), ['eq', 'project', 'scentmarked']);
  assert.deepEqual(calls.find((call) => call[0] === 'limit'), ['limit', 100]);
});

test('record validates required incident fields', async () => {
  const repo = createIncidentRepository({ from: () => ({}) });
  await assert.rejects(repo.record({ project: 'scentmarked' }), TypeError);
});

test('record uses project and fingerprint conflict target', async () => {
  let payload, options;
  const query = {
    upsert: (p, o) => { payload = p; options = o; return query; },
    select: () => query,
    single: async () => ({ data: { id: 'saved' }, error: null }),
  };
  const repo = createIncidentRepository({ from: () => query });
  const result = await repo.record({ project: 'scentmarked', fingerprint: 'abc', source: 'cloudflare_deployments', status: 'confirmed', severity: 'critical', arbitrary: 'ignore' });
  assert.equal(result.id, 'saved');
  assert.equal(options.onConflict, 'project,fingerprint');
  assert.equal(payload.arbitrary, undefined);
});
