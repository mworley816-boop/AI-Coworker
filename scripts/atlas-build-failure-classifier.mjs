/** Safe, read-only classification of build output. Never execute log contents. */
const RULES = [
  { kind: 'typescript', pattern: /(?:error TS\d{4}|Type error:)/i, recommendation: 'Inspect TypeScript diagnostics and fix the reported source location.' },
  { kind: 'missing_dependency', pattern: /(?:Cannot find module|Module not found|ERR_MODULE_NOT_FOUND)/i, recommendation: 'Verify package dependencies and import paths.' },
  { kind: 'authentication', pattern: /(?:401 Unauthorized|403 Forbidden|authentication failed)/i, recommendation: 'Verify deployment permissions and credential configuration.' },
  { kind: 'environment', pattern: /(?:Missing required environment variable|environment variable .* is not set)/i, recommendation: 'Verify required environment bindings without exposing secret values.' },
  { kind: 'tests', pattern: /(?:not ok \d+|Tests? failed|FAIL\s+[^\n]+)/i, recommendation: 'Inspect failing test names and reproduce in an isolated branch.' },
];
export function classifyBuildFailure({ conclusion, log = '' } = {}) {
  if (conclusion === 'success') return { status: 'healthy', category: 'none', approval_required: false };
  if (typeof log !== 'string') throw new TypeError('Log must be text');
  const found = RULES.find(rule => rule.pattern.test(log.slice(0, 100000)));
  return {
    status: conclusion === 'failure' ? 'confirmed' : 'unverified',
    category: found?.kind ?? 'unknown',
    recommendation: found?.recommendation ?? 'Review the failed workflow and its sanitized diagnostics.',
    approval_required: true,
  };
}
