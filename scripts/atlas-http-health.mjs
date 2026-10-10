/**
 * Read-only production HTTP health probe.
 * A successful deployment is not evidence of website availability.
 * Supply a trusted, configured HTTPS URL; never accept a URL from user input.
 */
export async function checkHttpHealth(url, { fetchImpl = fetch, timeoutMs = 10000 } = {}) {
  const target = new URL(url);
  if (target.protocol !== 'https:' || target.username || target.password || target.port) {
    throw new TypeError('HTTPS health endpoint required');
  }
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 30000) {
    throw new RangeError('Invalid health check timeout');
  }
  const observedAt = new Date().toISOString();
  try {
    const response = await fetchImpl(target.toString(), {
      method: 'GET',
      redirect: 'manual',
      cache: 'no-store',
      signal: AbortSignal.timeout(timeoutMs),
      headers: { Accept: 'text/html' },
    });
    const healthy = response.status >= 200 && response.status < 300;
    return {
      checked_at: observedAt,
      healthy,
      http_status: response.status,
      reason: healthy ? 'HTTP success' : 'HTTP non-success',
      // Intentionally omit URL, response body, headers and credentials.
    };
  } catch {
    return {
      checked_at: observedAt,
      healthy: false,
      http_status: null,
      reason: 'Network or timeout failure',
    };
  }
}
