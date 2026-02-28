# Known Issues and Fast Fixes

This file records setup/runtime issues hit during implementation and the quickest fix for each.

## 1) `next dev` lock error

Error:

`Unable to acquire lock at .next/dev/lock, is another instance of next dev running?`

Fix:

```bash
pkill -f "next dev"
rm -f .next/dev/lock
npm run dev
```

## 2) Supabase reachable but tables missing

Symptoms:

- `db:seed` fails with `Could not find the table 'public.<table>' in the schema cache`

Fix:

1. Open Supabase SQL Editor.
2. Run `supabase/schema.sql`.
3. Re-run:

```bash
npm run db:check
npm run db:seed
```

## 3) First login returns `{"error":"Unexpected server error"}`

Cause:

- Multiple initial API calls raced to create the same user row.

Fix already implemented:

- `getOrCreateUserByEmail` in `src/lib/db.ts` is race-safe and handles duplicate insert conflicts.

## 4) No magic-link email received

Checks:

1. Supabase Auth -> Email provider enabled.
2. Supabase Auth -> URL config includes:
   - `http://localhost:3000`
   - `http://localhost:3000/auth/callback`
3. Supabase Auth -> SMTP configured (Resend recommended).
4. Resend domain is verified and sender email is on that domain.
5. Check spam/junk and Supabase Auth logs.

Resend SMTP settings:

- Host: `smtp.resend.com`
- Port: `587`
- Username: `resend`
- Password: your `re_...` API key
- Sender email: e.g. `noreply@ucm.chang-gpt.com` (verified domain)

## 5) NPM cache permission errors

Symptoms:

- `EACCES` / `EEXIST` under `~/.npm/_cacache`

Fix:

```bash
npm install --cache /tmp/ucm-npm-cache
```

## 6) App appears signed in but API still unauthorized

Cause:

- API now expects `Authorization: Bearer <token>` from real Supabase session.

Fix:

- Sign in at `/login` and complete `/auth/callback`.
- Hard refresh after callback.

## 7) New user has wrong initial role

Current behavior:

- New emails auto-provision as `assistant` for pilot usability.
- If `.env.local` includes `BOOTSTRAP_ADMIN_EMAIL=<your email>`, that email is auto-provisioned as `admin`.

To change role later:

- Update `users.role` directly in Supabase table editor or SQL.

## Security follow-up

A service-role key was shared in chat during setup. Rotate it in Supabase after testing and update `.env.local`.
