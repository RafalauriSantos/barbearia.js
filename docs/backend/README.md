# Backend (Supabase-backed)

This backend uses Supabase as the primary database. Steps to get started locally:

1. Copy `.env.example` to `.env` and fill the values (use your Supabase project URL and a service role key):

```powershell
cd backend
copy .env.example .env
```

2. Install dependencies:

```powershell
npm install
```

3. Create the database schema in Supabase (open your project SQL editor and run `db/schema.sql`).

4. Seed initial data (optional):

```powershell
npm run seed
```

5. Start the server:

```powershell
npm run dev
```

Notes:

- The `migrate` script only prints a hint; use Supabase SQL editor or `psql` to apply `db/schema.sql`.
- For local dev you can use an ANON key, but prefer `SUPABASE_SERVICE_KEY` (service role) for seeding and admin operations.
