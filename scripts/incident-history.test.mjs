import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeIncidentHistory, filterIncidents } from './incident-history.mjs';

const failed = { fingerprint: 'scentmarked:production:deployment:1', project: 'scentmarked', environment: 'production', status: 'confirmed', severity: 'critical' };
test('new confirmed incident creates a single alert', () => {
  const result = mergeIncidentHistory([], failed, '2026-10-10T00:00:00Z');
  assert.equal(result.history.length, 1);
  assert.equal(result.should_notify, true);
  assert.equal(result.history[0].occurrences, 1);
});
test('repeat confirmed incident does not repeat notification', () => {
  const first = mergeIncidentHistory([], failed);
  const second = mergeIncidentHistory(first.history, failed);
  assert.equal(second.should_notify, false);
  assert.equal(second.history.length, 1);
  assert.equal(second.history[0].occurrences, 2);
});
test('escalation notifies again', () => {
  const warning = { ...failed, status: 'investigating', severity: 'warning' };
  const first = mergeIncidentHistory([], warning);
  const second = mergeIncidentHistory(first.history, failed);
  assert.equal(second.should_notify, true);
  assert.equal(second.change, 'escalated');
});
test('filters incidents by status and environment', () => {
  const history = [failed, { ...failed, fingerprint: 'other', environment: 'preview', status: 'investigating' }];
  assert.deepEqual(filterIncidents(history, { environment: 'production', status: 'confirmed' }), [failed]);
});
test('does not mutate caller history', () => {
  const history = Object.freeze([Object.freeze({ ...failed, occurrences: 1 })]);
  mergeIncidentHistory(history, failed);
  assert.equal(history[0].occurrences, 1);
});
