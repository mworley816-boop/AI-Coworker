// Cloudflare Worker: Atlas research proxy (Cloudflare Web Search API / Ceramic.ai).
// Required Worker secrets: ATLAS_RESEARCH_PROXY_KEY, CLOUDFLARE_AI_GATEWAY_TOKEN
// Required Worker variable: CLOUDFLARE_ACCOUNT_ID
// Optional Worker variable: CLOUDFLARE_AI_GATEWAY_ID (default: default)
export interface Env {
  ATLAS_RESEARCH_PROXY_KEY: string;
  CLOUDFLARE_AI_GATEWAY_TOKEN: string;
  CLOUDFLARE_ACCOUNT_ID: string;
  CLOUDFLARE_AI_GATEWAY_ID?: string;
}
type SearchItem = { title?: unknown; url?: unknown; description?: unknown };
function authorized(header: string | null, secret: string): boolean {
  const expected = `Bearer ${secret}`;
  if (!header || !secret || header.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) mismatch |= header.charCodeAt(i) ^ expected.charCodeAt(i);
  return mismatch === 0;
}
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "cache-control": "no-store" } });
    const url = new URL(request.url);
    if (url.pathname !== "/research") return json({ error: "Not found" }, 404);
    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
    if (!env.ATLAS_RESEARCH_PROXY_KEY || !env.CLOUDFLARE_AI_GATEWAY_TOKEN || !env.CLOUDFLARE_ACCOUNT_ID)
      return json({ error: "Proxy configuration incomplete" }, 503);
    if (!authorized(request.headers.get("authorization"), env.ATLAS_RESEARCH_PROXY_KEY))
      return json({ error: "Unauthorized" }, 401);
    if (Number(request.headers.get("content-length") || 0) > 4096)
      return json({ error: "Request too large" }, 413);
    let input: unknown;
    try { input = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
    if (!input || typeof input !== "object" || Array.isArray(input)) return json({ error: "Invalid request" }, 400);
    const data = input as Record<string, unknown>;
    const query = typeof data.query === "string" ? data.query.trim() : "";
    if (!query || query.length > 1024) return json({ error: "Query must be 1–1024 characters" }, 400);
    const limit = typeof data.max_results === "number" && Number.isInteger(data.max_results)
      ? Math.min(8, Math.max(1, data.max_results)) : 8;
    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(env.CLOUDFLARE_ACCOUNT_ID)}/ai/websearch/`;
    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "authorization": `Bearer ${env.CLOUDFLARE_AI_GATEWAY_TOKEN}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          query, provider: "ceramic", limit,
          options: { gateway: { id: env.CLOUDFLARE_AI_GATEWAY_ID || "default" } }
        }),
        signal: AbortSignal.timeout(12000)
      });
    } catch { return json({ error: "Search provider unavailable" }, 502); }
    if (!response.ok) return json({ error: "Search provider failed", provider_status: response.status }, 502);
    let payload: unknown;
    try { payload = await response.json(); } catch { return json({ error: "Invalid provider response" }, 502); }
    const result = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
    const body = result.result && typeof result.result === "object" ? result.result as Record<string, unknown> : result;
    const items = Array.isArray(body.items) ? body.items : [];
    const results = items.slice(0, limit).flatMap((item: SearchItem) => {
      if (typeof item?.url !== "string" || !/^https?:\/\//i.test(item.url)) return [];
      return [{ title: typeof item.title === "string" ? item.title : "Source",
        url: item.url, content: typeof item.description === "string" ? item.description : "" }];
    });
    return json({ results });
  }
};
