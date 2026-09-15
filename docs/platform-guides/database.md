# Database options for `packages/server`

`packages/server` ships with an in-memory store by default (zero setup, data
resets on restart) so the dashboard works out of the box. Swap in a real
database via the `DATABASE_URL` env var — the server picks the driver based
on the URL scheme.

## SQLite (simplest persistent option, no separate service)

```bash
# .env
DATABASE_URL=file:./data/app.db
```

Good default for a single-machine dev setup or a small self-hosted
deployment. Uses `better-sqlite3` (synchronous, no async driver overhead for
a local file).

## PostgreSQL (recommended for anything multi-user)

```bash
# .env
DATABASE_URL=postgres://user:password@localhost:5432/nyxers
```

Local Postgres via Docker for dev:

```bash
docker run --name nyxers-pg -e POSTGRES_PASSWORD=devpass -p 5432:5432 -d postgres:16
```

Managed options if you don't want to run your own: [Neon](https://neon.tech)
and [Supabase](https://supabase.com) both offer a free Postgres tier with a
connection string you can drop straight into `DATABASE_URL`.

## Migrations

`packages/server` uses [Kysely](https://kysely.dev/) as the query builder
(works against SQLite and Postgres with the same TypeScript query API — no
ORM lock-in). Migration files live in `packages/server/migrations/`; run
them with:

```bash
npm run db:migrate --workspace packages/server
```

## Choosing

| Need | Use |
|---|---|
| Local dev, single user, zero setup | in-memory (default) |
| Local dev, persistent across restarts | SQLite |
| Multiple users / production | Postgres (self-hosted or Neon/Supabase) |
| Already using Firebase elsewhere | Firestore — see `firebase.md` instead, and skip Kysely for that data |
