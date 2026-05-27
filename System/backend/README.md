# OSCA Backend (Next.js)

This minimal Next.js backend exposes an API route to accept form submissions and save them to Supabase.

Setup

1. Copy `.env.example` to `.env.local` and set `SUPABASE_URL` and `SUPABASE_KEY`.

2. Install dependencies and run in dev mode:

```bash
cd backend
npm install
npm run dev
```

API

- `POST /api/submit` — accepts JSON body (the full form payload). For now empty fields are allowed. The route inserts the payload into a Supabase table named `applications`.

Database

Create a simple table in Supabase to store submissions. Example SQL:

```sql
create table applications (
  id bigserial primary key,
  created_at timestamptz default now(),
  full_name text,
  date_of_birth date,
  age integer,
  payload jsonb
);
```

If you already created the table with only `payload`, add the visible columns with:

```sql
alter table applications
  add column if not exists full_name text,
  add column if not exists date_of_birth date,
  add column if not exists age integer;
```

Notes

- This is a minimal starter. For production you should:
  - Use a Supabase service role key only on the server.
  - Add validation and authentication.
  - Map individual fields to columns if you need querying/filtering.
