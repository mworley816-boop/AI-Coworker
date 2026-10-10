# Scentmarked incident response contract

Atlas treats Scentmarked as its highest-priority managed project. This document defines the diagnostic and approval contract; it does not grant Atlas permission to make production changes.

## Incident record

Each incident should store:
- incident_id: stable identifier for deduplication
- project: scentmarked
- detected_at: UTC ISO-8601 timestamp
- source: uptime | github_actions | cloudflare_deployments | cloudflare_runtime | manual
- environment: production | preview | unknown
- status: investigating | confirmed | resolved
- severity: informational | warning | critical
- fingerprint: normalized service + failure category + deployment identifier
- observed_evidence: HTTP status, error excerpt, deployment URL, run ID, or check result
- last_success_at: optional timestamp of the last verified healthy check
- recommendation: specific diagnostic or remediation step
- approval_required: true for any write, restart, redeploy, rollback, secret change, or data mutation
- notified_at: optional timestamp, to avoid repeated alerts for the same unresolved incident

## Detection rules

1. A single failed HTTP request is inconclusive. Confirm with a retry before marking an outage.
2. Treat authentication failures and rate limits as monitoring errors until distinguished from application outages.
3. Distinguish a failed preview deployment from production unavailability.
4. Correlate Cloudflare deployment errors with the GitHub commit and workflow run when identifiers are available.
5. Never treat missing Cloudflare credentials as proof of a Scentmarked outage.
6. Resolve an incident only after a confirmed healthy check or verified successful remediation.
7. Alert once on a newly confirmed incident; send a new alert on meaningful escalation or recurrence after resolution.

## Safe remediation boundaries

Atlas may read logs, collect diagnostics, and propose code changes without additional approval. Atlas must request explicit approval before pushing commits, opening production-affecting pull requests, modifying environment variables, triggering deployments, rolling back, or changing Supabase data. Never include credentials or full sensitive logs in alerts.

## Verification checklist

- [ ] Cloudflare connection is authorized and responds to a read-only request
- [ ] Latest production deployment status can be retrieved
- [ ] Runtime errors are scoped to the Scentmarked service
- [ ] Deployment status is correlated with GitHub checks
- [ ] Retry distinguishes transient failures from confirmed outages
- [ ] Incident records are persisted and deduplicated
- [ ] Recovery notification is emitted once
- [ ] Write actions require explicit approval
- [ ] End-to-end checks pass on the deployed Atlas workspace
