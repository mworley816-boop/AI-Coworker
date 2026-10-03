# AI Coworker setup

## Supabase

The dedicated AI-Coworker Supabase project is created separately from Scentmarked.

Configure the deployment environment with:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_APP_URL`

Do not commit private service-role keys or LLM secrets. The app supports Supabase's modern publishable key and retains legacy anon-key compatibility during migration.

## Authentication

Enable email authentication in Supabase and add the deployed application URL plus `/auth/callback` to the allowed redirect URLs. Local development uses `http://localhost:3000`.

## Database

Apply migrations in `supabase/migrations` to the AI-Coworker project only. Never apply AI-Coworker migrations to Scentmarked.
