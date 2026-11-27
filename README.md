# MTD Back Office customer portal

Login + dashboard for customers of [mtdbackoffice.co.uk](https://mtdbackoffice.co.uk). Customers tell us about their
business, set what *their* clients see on invoices/reminders, upload documents, track setup progress and ask for support.
Staff get an admin area to see everything and update progress.

**Stack:** Next.js (App Router) · TypeScript · Drizzle ORM · Postgres on Neon · plain CSS using the marketing site's tokens.

## Run locally (no database needed)
```bash
npm install
cp .env.example .env.local
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='a long passphrase' npm run db:seed   # first staff login
npm run dev
```
Without `DATABASE_URL` it uses embedded PGlite in `.data/`. Emails are printed to the server log when `RESEND_API_KEY` is empty.

## Production
Required env vars: `DATABASE_URL` (Neon **pooled** string), `DATA_ENCRYPTION_KEY` (`openssl rand -base64 32`), `APP_URL`.
Recommended: `RESEND_API_KEY`, `EMAIL_FROM`, `STORAGE_DIR` (persistent disk), `STRIPE_WEBHOOK_SECRET`.
```bash
npm run db:migrate   # uses DATABASE_URL_UNPOOLED (direct), or DATABASE_URL minus "-pooler"
ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run db:seed
npm run build && npm start
```
The app refuses to start in production without `DATABASE_URL`, and refuses to save UTR/NI without `DATA_ENCRYPTION_KEY`.

## How customers get in
No open sign-up. A purchase (admin "Add customer" or Stripe webhook) creates an entitlement keyed by email and emails a
one-time link to choose a password. `/activate` re-sends that link for anyone who has bought.
