# Atlas Worker integration runbook

The GitHub repository contains maintenance components, not the source of the currently
deployed Cloudflare Worker. Do **not** deploy these modules as a replacement Worker:
that would remove existing sign-in and workspace routes.

## Preconditions
1. Locate the actual Atlas Worker source and its current deployment pipeline.
2. Verify the Worker is configured for the **AI-Coworker** Supabase project,
   not the Scentmarked database. Never paste or commit secret keys.
3. Identify the existing server-side administrator/session authorization routine.
   It must check an authenticated identity and a server-controlled admin role,
   not an editable user profile field or browser-provided flag.
4. Confirm that `atlas_incidents` exists with RLS enabled in the AI-Coworker
   project. Keep browser roles without access to incident records.
5. Run `node --test scripts/*.test.mjs` before staging.

## Worker composition (illustrative, not deployed)

```js
import { attachMaintenanceRoute } from './scripts/atlas-worker-maintenance-route.mjs';

// existingFetch, serverSupabase, and isAtlasAdmin must come from the
// REAL Atlas Worker implementation. Never fabricate these bindings.
const fetchWithMaintenance = attachMaintenanceRoute(existingFetch, {
  supabase: serverSupabase,
  authorizeAdmin: isAtlasAdmin,
});

// Route fetchWithMaintenance from the existing Worker entrypoint.
// Do not replace the other event handlers or scheduled jobs.
```

## Existing scheduled handler composition (illustrative, not deployed)

```js
import { attachScheduledHttpMaintenance } from './scripts/atlas-worker-scheduled-route.mjs';

const scheduledWithMaintenance = attachScheduledHttpMaintenance(existingScheduled, {
  repository: serverIncidentRepository,
  healthUrl: trustedScentmarkedHealthUrl,
});
// Connect scheduledWithMaintenance to the EXISTING Worker scheduled entrypoint.
// Do not add cron triggers without reviewing the current Worker configuration.
```

## Staging acceptance checks
- Anonymous GET to `/api/maintenance/dashboard` returns 403.
- Authenticated non-admin GET returns 403.
- Authenticated admin GET returns JSON with `project: "scentmarked"`.
- Unsupported project returns 400; POST returns 405.
- Existing login, workspace, and scheduled maintenance endpoints still work.
- No database secret or raw incident evidence appears in browser responses.
- Dashboard HTML must only be served behind existing Atlas admin authorization.
- Confirm incident rows are stored and read from Atlas's own database.
- Do not treat deployment success as website uptime recovery.
- Deploy to production only after tests, staging checks, and explicit approval.

## Known limitations
- Incident recording uses the server-side `atlas_record_incident` RPC to increment
  `occurrences` atomically. Notification delivery and cross-Worker alert
  deduplication are not yet implemented.
- The dashboard summary covers the returned page, not every historical incident.
- No production Worker integration or dashboard deployment is established here.
