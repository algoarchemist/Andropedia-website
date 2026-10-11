# Going live: checklist

Do these in order. Nothing here needs code changes; it is the setup the code now expects.

## 1. Make the member sheet private (before anything else)

The Google Form responses sheet holds register numbers, phone numbers and dates of birth. It used to be readable by anyone, and its id
was in this (public) repository, so **treat the data in it as exposed**.

1. Google Sheets -> Share -> General access -> **Restricted**. Remove "Anyone with the link".
2. Share it with the service account (`GOOGLE_SERVICE_ACCOUNT_EMAIL`) as **Viewer**.
3. Set `MEMBER_SHEET_ID` (from the sheet URL) and, if the responses are not on the first tab, `MEMBER_SHEET_GID`
   (the number after `gid=`). Leave `MEMBER_SHEET_ALLOW_PUBLIC` as `false`.
4. Decide with the club whether members must be told, and consider asking them to confirm their phone number and
   date of birth were not misused. Passwords: see step 6.
5. Optional: if you want the old sheet id out of the git history too, make that part of the repository clean-up; once the sheet is private
   the id by itself no longer opens it.

## 2. Supabase / database

| Variable | Value |
|---|---|
| `DATABASE_URL` | the **Transaction pooler** string: host `...pooler.supabase.com`, port **6543**, add `?sslmode=require` |
| `DIRECT_URL` | the **direct** string: `db.<ref>.supabase.co`, port **5432**, add `?sslmode=require` (migrations only) |
| `PG_POOL_MAX` | optional; connections per server instance (default 5). Keep instances x this below the database limit |

The app refuses nothing by itself, but `/api/health` reports `degraded` if `DATABASE_URL` is the direct connection.

## 3. Migrations come BEFORE the new code

```
npm run db:deploy       # applies every pending migration using DIRECT_URL
npx prisma migrate status
```

Migrations in this release: `member_photo`, `event_image`, `must_change_password`. The last one also flags every account that is still on its
register-number password, so those members are asked to choose a new password the next time they sign in.
`/api/health` lists any table or column the code needs that is missing.

## 4. Environment variables

Copy `.env.example` and fill it in. These matter most:

- `AUTH_SECRET` (required; changing it later invalidates every password), `CRON_SECRET`
- `NEXT_PUBLIC_SITE_URL` = `https://your-domain` (used in password-reset links, the sitemap and share previews)
- `SMTP_*` or the Apps Script web app values (confirmation and reset emails), `GOOGLE_*` + `RECRUITMENT_SHEET_ID`
- `TRUSTED_PROXY_HOPS` (default 1) if you are not on Vercel; rate limits trust the address the closest proxy saw

## 5. Deploy, then verify

```
curl -s https://your-domain/api/health                                   # {"status":"ok","database":true}
curl -s -H "Authorization: Bearer $CRON_SECRET" https://your-domain/api/health   # full list of problems (should be [])
```

Also check: `/robots.txt` and `/sitemap.xml` use your domain; the 404 page shows; a test login works and asks for a new password;
`/api/cron/maintenance` runs daily (`vercel.json` schedules it; on another host, call it daily with `Authorization: Bearer $CRON_SECRET`).

## 6. Existing members

- Everyone on the register-number password is asked to choose a new one at their next sign-in (nothing is emailed).
  The portal does nothing else for them until they do, on the server as well as in the page.
- Until a member has changed it, anyone who knows their register number can sign in as them and set their own password. Since those
  numbers were in the exposed sheet, ask members to sign in and change their password soon. Check the **admin accounts first**.

## 7. Known limits

- Photos (members and events) are stored in Postgres. They are cached for a year by the CDN, but a lot of uploads grows the database. Move
  them to object storage (Supabase Storage) if that becomes a problem.
- The Content-Security-Policy has no `script-src` (that needs per-request nonces). Framing, plugins, form targets and cross-site requests are blocked.
- Dev-only tools (`eslint-config-next`, `tailwindcss`) report advisories in `npm audit`; they are not part of the production bundle.
  CI fails on any high advisory in production dependencies.
- There are no browser-level (end-to-end) tests yet; the checks are unit and route tests plus manual passes.
