/**
 * Adapter for the existing Atlas Cloudflare Worker.
 * Inject the existing trusted Supabase client and session authorization callback.
 * Do not create a second auth system or expose a service key to the browser.
 */
import { createMaintenanceApi } from './atlas-maintenance-api.mjs';

export function attachMaintenanceRoute(existingFetch, { supabase, authorizeAdmin }) {
  if (typeof existingFetch !== 'function') throw new TypeError('Existing Worker fetch handler required');
  const maintenance = createMaintenanceApi({ supabase, authorizeAdmin });
  return async function fetchWithMaintenance(request, env, ctx) {
    // Existing routes remain untouched; only one exact pathname is intercepted.
    if (new URL(request.url).pathname !== '/api/maintenance/dashboard') {
      return existingFetch(request, env, ctx);
    }
    return maintenance(request);
  };
}
