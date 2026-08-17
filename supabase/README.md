# Supabase schema

`migrations/0001_init.sql` creates the initial schema: `profiles`, `pets`,
`vaccine_records`, `health_records`, plus Row Level Security policies that
restrict every row to its owner.

## Applying it

Either paste the file into the Supabase Dashboard → SQL Editor and run it,
or, if you have the Supabase CLI linked to your project:

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
