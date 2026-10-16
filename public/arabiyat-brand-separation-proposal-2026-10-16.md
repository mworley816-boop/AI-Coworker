# Arabiyat brand separation — proposed implementation plan
Date: 2026-10-16
Status: PROPOSAL ONLY — NO PRODUCTION WRITES

## Evidence
My Perfumes presents Arabiyat, Arabiyat Prestige and Arabiyat Sugar as distinct shopping brands:
https://myperfumes.ae/collections/arabiyat

Read-only catalog comparison found 137 Arabiyat Prestige records, 15 Arabiyat Sugar records, and no standalone main Arabiyat brand in the returned results.

## Main Arabiyat manufacturer list audit
Six exact names also exist under Prestige: Intense Musk, Lamsat Harir, Lamsat Harir - Dubai Chocolate, Musk Tahira, Oud Al Faris, Oud Al Layl. Do not assume same SKU. For Musk Tahira and Oud Al Layl, Scentmarked lists perfume oil while manufacturer checklist is EDP. They may be separate concentration variants.

Seventeen other names require individual-product verification, alternate-name checks, and duplicate review before any catalog creation. See public/arabiyat-main-catalog-audit-2026-10-16.md.

## Safe staged approach
1. Inspect brands table uniqueness, slug rules, brand foreign keys, and public pages using read-only queries.
2. Draft a distinct main Arabiyat brand entry for approval, only if no existing brand alias represents it.
3. Resolve the six cross-listed names by manufacturer product page and concentration, checking linked notes, sources, images, comments, relationships, and saved collections before considering reassignment.
4. For 17 unresolved names, prepare review-only proposals with manufacturer individual product links, concentration, note evidence, and confidence; never mark as missing based on name alone.
5. Seek explicit approval for the exact new brand and individual record changes. Never bulk-move all Prestige records.
6. Execute changes only in an approved migration with rollback plan and post-migration validation.

## Required validation before publication
- Brand and perfume slugs remain unique.
- Existing perfume IDs and their foreign-key relationships are preserved.
- Product concentration variants are not collapsed.
- Public discovery, comparison, and admin counts remain correct.
- Unverified discontinued status is not converted into discontinued.
