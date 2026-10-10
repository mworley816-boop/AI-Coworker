import test from 'node:test';
import assert from 'node:assert/strict';
import { deploymentToIncident } from './cloudflare-incident.mjs';

test('production failure becomes critical confirmed incident', () => {
  const result = deploymentToIncident({ id: 'd1', environment: 'production', latest_stage: { name: 'deploy', status: 'failure' } });
  assert.equal(result.status, 'confirmed');
  assert.equal(result.severity, 'critical');
  assert.equal(result.approval_required, true);
  assert.equal(result.fingerprint, 'scentmarked:production:deployment:d1');
});

test('preview failure is warning, not production outage', () => {
  const result = deploymentToIncident({ id: 'd2', environment: 'preview', latest_stage: { status: 'failure' } });
  assert.equal(result.severity, 'warning');
});

test('pending status remains investigating', () => {
  const result = deploymentToIncident({ id: 'd3', environment: 'production', latest_stage: { status: 'active' } });
  assert.equal(result.status, 'investigating');
});

test('successful deployment requires HTTP verification before outage closure', () => {
  const result = deploymentToIncident({ id: 'd4', environment: 'production', latest_stage: { status: 'success' } });
  assert.equal(result.status, 'resolved');
  assert.match(result.recommendation, /Verify production HTTP health/);
});

test('missing input rejected', () => {
  assert.throws(() => deploymentToIncident(null), TypeError);
});
