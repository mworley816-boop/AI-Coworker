# Atlas retailer research-to-draft safety test

This milestone is a standalone, opt-in orchestrator. It does **not** deploy or modify the live Atlas Worker, schedule research, or claim a retailer listing has been verified.

Run offline tests with `node --test scripts/atlas-retailer-research-flow.test.mjs scripts/atlas-retailer-submission.test.mjs`.

The research provider must return a structured candidate with a real Scentmarked catalog UUID, brand and perfume name, merchant, HTTPS product/evidence URLs and a concise evidence note. A trusted researcher must verify bottle identity, merchant and product URL before enabling any submission. The sample test uses fictional names and does not touch Scentmarked.

`runRetailerResearchToDraft({research})` defaults to a dry run and makes **no submission**. To test transport, inject a mocked `submit` function with `allowSubmission:true`. A real submission requires an explicit opt-in, verified data and server-side secrets, and creates an inactive offer only. Admin approval remains mandatory. Never put credentials in client code or logs.

**Not yet complete:** a verified live research provider, integration into the original Atlas Worker, a production end-to-end test, evidence audit persistence, and monitoring.
