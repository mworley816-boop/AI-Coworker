/**
 * Atlas maintenance API route handler. Server-side only.
 * Integrate into the existing Worker router AFTER session validation.
 * No credentials are accepted from URL parameters or request bodies.
 */
import { createIncidentRepository } from './atlas-incident-repository.mjs';
import { createMaintenanceDashboard } from './atlas-maintenance-dashboard.mjs';

export function createMaintenanceApi({ supabase, authorizeAdmin }) {
  if (typeof authorizeAdmin !== 'function') throw new TypeError('Admin authorization function required');
  const dashboard = createMaintenanceDashboard(createIncidentRepository(supabase));

  return async function handleMaintenanceApi(request) {
    const url = new URL(request.url);
    if (url.pathname !== '/api/maintenance/dashboard') return null;
    if (request.method !== 'GET') {
      return Response.json({ error: 'Method not allowed' }, { status: 405, headers: { Allow: 'GET', 'Cache-Control': 'no-store' } });
    }
    try {
      const authorized = await authorizeAdmin(request);
      if (authorized !== true) {
        return Response.json({ error: 'Unauthorized' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
      }
      const project = url.searchParams.get('project') ?? 'scentmarked';
      if (project !== 'scentmarked') {
        return Response.json({ error: 'Unsupported project' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
      }
      const result = await dashboard({ project });
      return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
      // Avoid leaking internal Supabase errors, queries, or credentials.
      return Response.json({ error: 'Maintenance dashboard unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }
  };
}
