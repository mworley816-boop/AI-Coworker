import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const script = new URL('./cloudflare-deployment-check.mjs', import.meta.url);
const env = { ...process.env };
for (const name of ['CLOUDFLARE_API_TOKEN','CLOUDFLARE_ACCOUNT_ID','CLOUDFLARE_PAGES_PROJECT']) delete env[name];

test('missing configuration exits safely without making an API call', () => {
  const result = spawnSync(process.execPath, [script.pathname], { env, encoding: 'utf8' });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Missing configuration/);
  assert.equal(result.stdout, '');
});

test('diagnostics script parses as valid JavaScript', () => {
  const result = spawnSync(process.execPath, ['--check', script.pathname], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});
