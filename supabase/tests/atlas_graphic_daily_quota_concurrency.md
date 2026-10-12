# Atlas daily graphics quota — two-session concurrency test

This test checks that two independent database transactions cannot both reserve the last available generation slots. **Use Atlas Supabase only**, never Scentmarked production.

Prerequisites: two SQL connections to the same Atlas database with permission to execute `public.atlas_reserve_graphic_daily_quota`. Run in a quiet test window; each session rolls back. The table must have no quota row for today. Do not enable image generation.

## Connection A

Run the following, leaving the transaction open after the first statement:

```sql
BEGIN;
SELECT public.atlas_reserve_graphic_daily_quota(
  (now() AT TIME ZONE 'UTC')::date, 5, 5
) AS a_reserved; -- expect true
-- WAIT here until connection B has started its reservation.
ROLLBACK;
```

## Connection B

While connection A is open, run in another database session:

```sql
BEGIN;
SELECT public.atlas_reserve_graphic_daily_quota(
  (now() AT TIME ZONE 'UTC')::date, 1, 5
) AS b_reserved;
ROLLBACK;
```

Connection B may block on the row lock while A is open. **Do not interpret blocking as success or failure.** After A rolls back, B should return `true`, since A's reservation did not commit. To verify committed quota exhaustion, repeat the test in an isolated database or controlled test day, commit A, and expect B to return `false`. Never commit a quota-consuming test against the live Atlas day.

## Verification

- The sum of *committed* reservations must never exceed five.
- Confirm `SELECT reserved_count FROM public.atlas_graphic_daily_quota WHERE quota_day=(now() AT TIME ZONE 'UTC')::date;` matches the pre-test value.
- Confirm no image-provider API calls were made.
- The prior single-transaction test at `supabase/tests/atlas_graphic_daily_quota_boundary.sql` covers the rejection boundary but **does not prove concurrent behavior**.

**Status:** Procedure only. No simultaneous multi-session run has been performed yet.
