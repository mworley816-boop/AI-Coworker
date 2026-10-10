/**
 * Compose the trusted Atlas Cloudflare Worker scheduled handler.
 * Existing scheduled work runs regardless of HTTP maintenance success.
 * Call only after constructing a service-role-backed incident repository.
 * This adapter does not configure cron triggers or deploy anything.
 */
import { createScheduledHttpMaintenance } from './atlas-scheduled-http-maintenance.mjs';

export function attachScheduledHttpMaintenance(existingScheduled, options, { onError = () => {} } = {}) {
  if (typeof existingScheduled !== 'function') throw new TypeError('Existing scheduled handler required');
  if (typeof onError !== 'function') throw new TypeError('Error handler required');
  const check = createScheduledHttpMaintenance(options);
  return async function scheduledWithHttpMaintenance(event, env, ctx) {
    // Keep the original scheduled job independent of the new maintenance check.
    const existing = Promise.resolve().then(() => existingScheduled(event, env, ctx));
    const maintenance = Promise.resolve().then(check);
    const [oldResult, healthResult] = await Promise.allSettled([existing, maintenance]);
    if (healthResult.status === 'rejected') {
      try { onError(healthResult.reason); } catch { /* preserve original job outcome */ }
    }
    if (oldResult.status === 'rejected') throw oldResult.reason;
    return oldResult.value;
  };
}
