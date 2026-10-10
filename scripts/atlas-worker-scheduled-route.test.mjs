import test from 'node:test';
import assert from 'node:assert/strict';
import { attachScheduledHttpMaintenance } from './atlas-worker-scheduled-route.mjs';

const options = (record, fetchImpl = async () => ({ status: 200 })) => ({
  repository: { record },
  healthUrl: 'https://scentmarked.example.test/',
  fetchImpl,
});

test('preserves original scheduled handler arguments and result', async () => {
  const event = { cron: '0 * * * *' }, env = { key: 1 }, ctx = { marker: 2 };
  let recorded = false;
  const handler = attachScheduledHttpMaintenance(
    async (a, b, c) => {
      assert.equal(a, event); assert.equal(b, env); assert.equal(c, ctx);
      return 'original';
    },
    options(async () => { recorded = true; return { id: '1' }; }),
  );
  assert.equal(await handler(event, env, ctx), 'original');
  assert.equal(recorded, true);
});

test('existing scheduled work still runs when HTTP maintenance fails', async () => {
  let existingCalled = false, reported = false;
  const handler = attachScheduledHttpMaintenance(
    async () => { existingCalled = true; return 'ok'; },
    options(async () => { throw new Error('db offline'); }),
    { onError: () => { reported = true; } },
  );
  assert.equal(await handler({}, {}, {}), 'ok');
  assert.equal(existingCalled, true);
  assert.equal(reported, true);
});

test('original scheduled handler failure is not swallowed', async () => {
  const handler = attachScheduledHttpMaintenance(
    async () => { throw new Error('original failure'); },
    options(async () => ({ id: '1' })),
  );
  await assert.rejects(handler({}, {}, {}), /original failure/);
});

test('requires existing scheduled handler', () => {
  assert.throws(() => attachScheduledHttpMaintenance(null, options(async () => ({}))), TypeError);
});

test('scheduled maintenance errors are sanitized', async () => {
  let received;
  const handler = attachScheduledHttpMaintenance(async () => 'existing', options(async () => { throw new Error('private detail'); }), { onError: value => { received = value; } });
  assert.equal(await handler({}, {}, {}), 'existing');
  assert.deepEqual(received, { component: 'http_maintenance', reason: 'maintenance_failed' });
});
