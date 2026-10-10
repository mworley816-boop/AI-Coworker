import test from 'node:test';
import assert from 'node:assert/strict';
import { checkHttpHealth } from './atlas-http-health.mjs';

test('HTTP 200 is healthy', async () => {
  const result = await checkHttpHealth('https://example.test/', {
    fetchImpl: async (_url, options) => {
      assert.equal(options.redirect, 'manual');
      assert.equal(options.cache, 'no-store');
      return { status: 200 };
    },
  });
  assert.equal(result.healthy, true);
  assert.equal(result.http_status, 200);
});

test('HTTP redirects do not count as verified health', async () => {
  const result = await checkHttpHealth('https://example.test/', {
    fetchImpl: async () => ({ status: 302 }),
  });
  assert.equal(result.healthy, false);
});

test('HTTP 500 is unhealthy', async () => {
  const result = await checkHttpHealth('https://example.test/', {
    fetchImpl: async () => ({ status: 500 }),
  });
  assert.equal(result.healthy, false);
});

test('network errors fail closed without leaking internals', async () => {
  const result = await checkHttpHealth('https://example.test/', {
    fetchImpl: async () => { throw new Error('secret'); },
  });
  assert.equal(result.healthy, false);
  assert.doesNotMatch(JSON.stringify(result), /secret/);
});

test('rejects HTTP URLs and embedded credentials', async () => {
  await assert.rejects(checkHttpHealth('http://example.test/'), TypeError);
  await assert.rejects(checkHttpHealth('https://user:pass@example.test/'), TypeError);
});

test('rejects invalid timeout values', async () => {
  await assert.rejects(checkHttpHealth('https://example.test/', { timeoutMs: 100 }), RangeError);
});
