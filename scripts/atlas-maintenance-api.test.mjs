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
