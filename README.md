# UCM Executive Travel Concierge + AI Copilot

Mobile-first Next.js app for executive meeting travel concierge workflows with AI copilot support, proactive nudges, and compliant profile enrichment.

## Current State

- API routes now read/write **real Supabase data** (not in-memory runtime data)
- Traveler dashboard uses persistent travel/agenda/speaker/briefing/nudge records
- Admin actions (nudge updates, enrichment approvals, edits) persist to Supabase
- Compliance model remains: licensed/official enrichment adapters only, no scraping

## One-Time Setup

1. Put keys in `.env.local`.
2. In Supabase SQL Editor, run `supabase/schema.sql`.
3. Seed starter data:

```bash
npm run db:check
npm run db:seed
```

4. Run app:

```bash
npm install
npm run dev
```

5. Verify DB status:

- [http://localhost:3000/api/system/db-status](http://localhost:3000/api/system/db-status)

## Useful Scripts

- `npm run db:check` - verifies required tables exist and are accessible
- `npm run db:seed` - inserts starter concierge data
- `npm run lint`
- `npm run build`

## Notes

- App now uses real Supabase magic-link sessions. APIs require a valid bearer token.
- Optional: set `BOOTSTRAP_ADMIN_EMAIL` in `.env.local` to auto-assign admin role on first login for that email.

- New emails that are not in `users` are auto-provisioned as `assistant` for pilot usability.
# TravelConcierge_UCM
