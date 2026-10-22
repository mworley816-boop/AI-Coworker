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
    const search = async (term: string): Promise<Response> => fetch(endpoint, {
        method: "POST",
        headers: {
          "authorization": `Bearer ${env.CLOUDFLARE_AI_GATEWAY_TOKEN}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          query: term, provider: "ceramic", limit,
          options: { gateway: { id: env.CLOUDFLARE_AI_GATEWAY_ID || "default" } }
        }),
        signal: AbortSignal.timeout(12000)
      });
    const readItems = (payload: unknown): {items: SearchItem[];result: Record<string,unknown>;body: Record<string,unknown>} => {
      const result = payload && typeof payload === "object" ? payload as Record<string,unknown> : {};
      const body = result.result && typeof result.result === "object" ? result.result as Record<string,unknown> : result;
      const items = Array.isArray(body.items) ? body.items : Array.isArray(body.results) ? body.results : Array.isArray(body.data) ? body.data : Array.isArray(result.items) ? result.items : [];
      return {items,result,body};
    };
    let response: Response;
    try { response = await search(query); } catch { return json({ error: "Search provider unavailable" }, 502); }
    if (!response.ok) return json({ error: "Search provider failed", provider_status: response.status }, 502);
    let payload: unknown;
    try { payload = await response.json(); } catch { return json({ error: "Invalid provider response" }, 502); }
    let {items,result,body} = readItems(payload);
    if(items.length===0){
      // Some providers return a successful empty response for long instructions.
      // Retry with progressively shorter, topic-preserving searches (max 3 calls).
      const concise=query
        .replace(/^(?:please\\s+)?(?:research|compare|find|look up|search for)\\s+/i,"")
        .replace(/\\b(?:using the official|official manufacturer website|manufacturer website|across multiple sources|top,? heart,? and base|top heart and base)\\b/gi," ")
        .replace(/\\s+/g," ").trim();
      const subject=concise
        .replace(/\\b(?:fragrance notes?|perfume notes?|note breakdown|source links?|official|website|manufacturer|using|the)\\b/gi," ")
        .replace(/\\s+/g," ").trim();
      const tried=new Set([query.toLowerCase()]);
      for(const term of [concise,subject]){
        if(term.length<5||tried.has(term.toLowerCase()))continue;
        tried.add(term.toLowerCase());
        try{
          const retry=await search(term);
          if(!retry.ok)continue;
          const parsed=readItems(await retry.json() as unknown);
          if(parsed.items.length){items=parsed.items;result=parsed.result;body=parsed.body;break;}
        }catch{/* Preserve safe empty-result diagnostics. */}
      }
    }
    const results = items.slice(0, limit).flatMap((item: SearchItem) => {
      const link = typeof item?.url === "string" ? item.url : typeof (item as Record<string,unknown>)?.link === "string" ? (item as Record<string,unknown>).link as string : "";
      if (!/^https?:\/\//i.test(link)) return [];
      return [{ title: typeof item.title === "string" ? item.title : "Source",
        url: link, content: typeof item.description === "string" ? item.description : typeof (item as Record<string,unknown>).snippet === "string" ? (item as Record<string,unknown>).snippet as string : "" }];
    });
    if (results.length === 0) {
      // Only return structural diagnostics; never expose source content or credentials.
      return json({error:"Search provider returned no usable sources",provider_shape:{top_level_keys:Object.keys(result).slice(0,12),result_keys:Object.keys(body).slice(0,12),item_count:items.length,first_item_keys:items[0] && typeof items[0] === "object" ? Object.keys(items[0]).slice(0,12) : []}},502);
    }
    return json({ results });
  }
};
