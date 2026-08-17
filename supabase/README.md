# Supabase schema

- `migrations/0001_init.sql` creates the initial schema: `profiles`, `pets`,
  `vaccine_records`, `health_records`, plus Row Level Security policies that
  restrict every row to its owner.
- `migrations/0002_vaccine_reminders.sql` adds `vaccine_reminders` (one row
  per 30/7/1/0-day reminder for a vaccine's `next_due_date`), with the same
  owner-only RLS pattern, and drops the now-redundant
  `vaccine_records.notification_ids` column. Run this **after** 0001.

## Applying it

Run each migration file, in order, either by pasting it into the Supabase
Dashboard → SQL Editor, or, if you have the Supabase CLI linked to your
project:

```bash
supabase db push
```

## Regenerating TypeScript types

`src/types/database.types.ts` is currently hand-written to mirror this
schema. Once the project exists on Supabase, regenerate it from the real
database so the two never drift:

```bash
npx supabase gen types typescript --project-id <project-id> > src/types/database.types.ts
```
