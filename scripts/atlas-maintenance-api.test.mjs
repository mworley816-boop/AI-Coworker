import test from 'node:test';
import assert from 'node:assert/strict';
import { createMaintenanceApi } from './atlas-maintenance-api.mjs';

function mockSupabase() {
  const query = {
    select: () => query,
    eq: () => query,
    order: () => query,
    limit: async () => ({ data: [], error: null }),
  };
  return { from: () => query };
}
const request = (path = '/api/maintenance/dashboard', method = 'GET') =>
  new Request('https://atlas.example.test' + path, { method });

test('rejects missing authorization dependency', () => {
  assert.throws(() => createMaintenanceApi({ supabase: mockSupabase() }), TypeError);
});
test('returns null for unrelated routes', async () => {
  const api = createMaintenanceApi({ supabase: mockSupabase(), authorizeAdmin: async () => true });
  assert.equal(await api(request('/other')), null);
});
test('denies unauthorized dashboard requests', async () => {
  const api = createMaintenanceApi({ supabase: mockSupabase(), authorizeAdmin: async () => false });
  const response = await api(request());
  assert.equal(response.status, 403);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});
test('denies unsupported project queries', async () => {
  const api = createMaintenanceApi({ supabase: mockSupabase(), authorizeAdmin: async () => true });
  assert.equal((await api(request('/api/maintenance/dashboard?project=other'))).status, 400);
});
test('returns sanitized dashboard after authorization', async () => {
  const api = createMaintenanceApi({ supabase: mockSupabase(), authorizeAdmin: async () => true });
  const response = await api(request());
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.project, 'scentmarked');
  assert.deepEqual(body.incidents, []);
});
test('blocks non-GET methods', async () => {
  const api = createMaintenanceApi({ supabase: mockSupabase(), authorizeAdmin: async () => true });
  assert.equal((await api(request('/api/maintenance/dashboard', 'POST'))).status, 405);
});

test('does not query incident data before administrator authorization', async () => {
  let queried = false;
  const api = createMaintenanceApi({
    supabase: { from: () => { queried = true; throw new Error('must not query'); } },
    authorizeAdmin: async () => false,
  });
  assert.equal((await api(request())).status, 403);
  assert.equal(queried, false);
});

test('fails closed when administrator authorization throws', async () => {
  const api = createMaintenanceApi({
    supabase: mockSupabase(),
    authorizeAdmin: async () => { throw new Error('private auth details'); },
  });
  const response = await api(request());
  assert.equal(response.status, 503);
  assert.doesNotMatch(await response.text(), /private auth details/);
});

test('hides database errors from the browser', async () => {
  const q = {
    select: () => q,
    eq: () => q,
    order: () => q,
    limit: async () => ({ data: null, error: new Error('secret database detail') }),
  };
  const api = createMaintenanceApi({
    supabase: { from: () => q },
    authorizeAdmin: async () => true,
  });
  const response = await api(request());
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.doesNotMatch(await response.text(), /secret database detail/);
});
