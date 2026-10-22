# AI-Coworker

## Research source classification

Atlas research sources are **unclassified** by default. Operators may configure a server-only JSON object in `ATLAS_MANUFACTURER_DOMAINS`, with lowercase brand names as keys and reviewed manufacturer hostnames as arrays of strings. For example:

```env
ATLAS_MANUFACTURER_DOMAINS='{"example brand":["example.invalid"]}'
```

The domain above is a **placeholder, not a real manufacturer website**. Verify ownership and the precise hostname from reliable primary sources before entering any actual domain. For Arabiyat, first confirm the brand's official manufacturer-operated domain; do not assume a retailer, distributor, social-media page, or similarly named website is official.

Configure this value in the **Atlas staging Worker's environment variables** (or local `.env`), not in any `NEXT_PUBLIC_` variable. Never place API keys in the JSON. Redeploy the Atlas Worker after changing configuration and run new research; previously saved results retain their original classifications.

Classification requires the research goal to mention a configured brand and the returned URL hostname to match the configured domain or a subdomain. A matching source is labeled **Manufacturer-domain candidate**, never manufacturer verified. Source content, fragrance identity, and individual note claims still require independent review. An empty, absent, or malformed registry leaves sources unclassified. No Scentmarked credentials or database changes are required.
