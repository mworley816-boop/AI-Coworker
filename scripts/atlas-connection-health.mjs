/**
 * Normalize server-side provider connection checks without leaking credentials.
 * Transport success alone is not evidence that an integration is authenticated.
 */
export function classifyConnectionResponse({ status, body = null, networkError = false }) {
  if (networkError) return { healthy: false, state: 'unreachable', action: 'retry_later' };
  if (!Number.isInteger(status) || status < 100 || status > 599) throw new TypeError('Valid HTTP status required');
  if (status === 401) return { healthy: false, state: 'unauthorized', action: 'reconnect' };
  if (status === 403) return { healthy: false, state: 'forbidden', action: 'check_permissions' };
  if (status === 429) return { healthy: false, state: 'rate_limited', action: 'retry_later' };
  if (status >= 500) return { healthy: false, state: 'provider_error', action: 'retry_later' };
  if (status >= 300) return { healthy: false, state: 'unexpected_response', action: 'inspect_configuration' };
  if (body && typeof body === 'object') {
    const flag = body.connected === false || body.authenticated === false || body.ok === false || body.success === false;
    const code = String(body.code ?? body.error_code ?? '').toLowerCase();
    const error = typeof body.error === 'string' ? body.error.toLowerCase() : '';
    if (flag || ['unauthorized', 'invalid_token', 'token_expired', 'invalid_grant'].includes(code) || /^(unauthorized|invalid_token|token_expired)$/.test(error)) {
      return { healthy: false, state: 'unauthorized', action: 'reconnect' };
    }
    if (body.error || body.errors) return { healthy: false, state: 'provider_error', action: 'inspect_configuration' };
  }
  return { healthy: true, state: 'connected', action: 'none' };
}
