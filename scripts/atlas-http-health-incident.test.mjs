import test from 'node:test';
import assert from 'node:assert/strict';
import { httpHealthToIncident } from './atlas-http-health-incident.mjs';

test('failed production HTTP check is a critical confirmed incident', () => {
  const result = httpHealthToIncident({
    healthy: false, http_status: 503, reason: 'HTTP non-success',
    checked_at: '2026-10-10T12:00:00Z',
  });
  assert.equal(result.status, 'confirmed');
  assert.equal(result.severity, 'critical');
  assert.equal(result.fingerprint, 'scentmarked:production:http-health');
  assert.equal(result.approval_required, true);
  assert.equal(result.observed_evidence.http_status, 503);
});

test('successful HTTP check resolves HTTP-health incident only', () => {
  const result = httpHealthToIncident({ healthy: true, http_status: 200 });
  assert.equal(result.status, 'resolved');
  assert.equal(result.severity, 'informational');
  assert.equal(result.fingerprint, 'scentmarked:production:http-health');
  assert.match(result.recommendation, /verify application functionality separately/i);
});

test('preview HTTP failure is warning, not production critical', () => {
  const result = httpHealthToIncident({ healthy: false, http_status: 500 }, { environment: 'preview' });
  assert.equal(result.severity, 'warning');
});

test('rejects malformed health results and unsafe identifiers', () => {
  assert.throws(() => httpHealthToIncident(null), TypeError);
  assert.throws(() => httpHealthToIncident({ healthy: 'yes' }), TypeError);
  assert.throws(() => httpHealthToIncident({ healthy: false }, { project: '../bad' }), TypeError);
});

test('excludes arbitrary health check metadata', () => {
  const result = httpHealthToIncident({ healthy: false, http_status: 503, secret: 'private' });
  assert.doesNotMatch(JSON.stringify(result), /private/);
});
