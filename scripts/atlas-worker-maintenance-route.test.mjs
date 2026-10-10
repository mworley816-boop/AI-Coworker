import test from 'node:test';
import assert from 'node:assert/strict';
import { attachMaintenanceRoute } from './atlas-worker-maintenance-route.mjs';

function fakeDb() {
  const q = { select: () => q, eq: () => q, order: () => q, limit: async () => ({ data: [], error: null }) };
  return { from: () => q };
}
const req = (path) => new Request('https://atlas.example.test' + path);

test('unrelated Worker routes preserve the original handler and arguments', async () => {
  const env = { marker: 1 }, ctx = { marker: 2 };
  const original = async (request, actualEnv, actualCtx) => {
    assert.equal(actualEnv, env);
    assert.equal(actualCtx, ctx);
    assert.equal(new URL(request.url).pathname, '/api/other');
    return new Response('existing');
  };
  const handler = attachMaintenanceRoute(original, { supabase: fakeDb(), authorizeAdmin: async () => true });
  assert.equal(await (await handler(req('/api/other'), env, ctx)).text(), 'existing');
});
test('maintenance route requires existing admin authorization', async () => {
  const handler = attachMaintenanceRoute(async () => new Response('unexpected'), { supabase: fakeDb(), authorizeAdmin: async () => false });
  assert.equal((await handler(req('/api/maintenance/dashboard'))).status, 403);
});
test('authorized maintenance route returns dashboard JSON', async () => {
  const handler = attachMaintenanceRoute(async () => new Response('unexpected'), { supabase: fakeDb(), authorizeAdmin: async () => true });
  const response = await handler(req('/api/maintenance/dashboard'));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).project, 'scentmarked');
});
