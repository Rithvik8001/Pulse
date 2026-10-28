# Pulse

A daily habit app for who you are becoming. Say who you want to be ("I am a writer"), pick one to three small habits that show it, and check each one in as Done or Skipped every day. Each week Pulse writes a short recap and a one-line statement of who you are becoming, based only on your own check-ins and journal.

## Features

- **Today**: the habits due today with a Done or Skipped control and an optional note. Habits not due sit in a collapsed section.
- **Habits**: add, rename, reorder, reschedule, archive, restore and delete habits, up to 12 active. A habit is due every day, on set weekdays, or 1 to 6 times a week. Stats count only due days, and the first missed due day each week is forgiven. Suggestions point out dormant habits, strong archived ones and shorter wording.
- **History**: consistency score, done rate, an 8-week grid, a weekly done-rate chart, per-habit stats, and every check-in with search, filter, edit and delete.
- **Review**: the weekly recap (last week's, if this week has nothing yet), past recaps, a refreshable "who you are becoming" statement, and milestones.
- **Journal**: one entry per day with a date picker, prompts and that day's check-ins. Pip can read a saved entry and suggest the matching Done or Skipped check-ins to save in one go.
- **Reminders**: web push notifications on any browser that supports them (iPhone and iPad need Pulse added to the Home Screen). A daily reminder and an optional evening last call, each at a time you pick, sent only when a habit due today is still open. Settings suggests a time from when you usually check in, Pip writes the last call, and you can ask Pip to set reminders.
- **Pip**: the habit assistant, in a tray on every dashboard page. Ask about your history, or ask it to add, rename, archive, restore or delete a habit, check you in, or save a journal entry. Every change is a card you confirm first.
- **Email**: a welcome email and a weekly summary, with one-click unsubscribe.
- **Shell**: command menu (⌘K), `g` plus a letter to move between pages, `a` to open Pip, `?` for all shortcuts, light, dark and system themes.
- **Demo**: `/onboarding` lets anyone try Pulse without an account. Nothing is saved.

## Stack

- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS v4 with the Quiet Keycap design tokens in `app/globals.css`
- Radix primitives (`radix-ui`), cmdk, next-themes, Phosphor icons, Recharts
- Supabase Auth and Supabase Postgres
- Drizzle ORM with SQL migrations in `drizzle/`
- Vercel AI SDK with Anthropic: every AI feature runs on Claude Haiku 5.5 (`claude-haiku-5-5`) with thinking off
- Resend and React Email
- Vercel Cron for the weekly summary

## Getting started

Pulse uses [Bun](https://bun.sh).

```bash
bun install
bun run db:migrate
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

Create `.env` in the project root.

```bash
# Database
DATABASE_URL=
DIRECT_DATABASE_URL=

# Supabase auth
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# AI (recaps, statements, Pip, wording suggestions, journal check-ins)
CLAUDE_API_KEY=

# Email
RESEND_API_KEY=
EMAIL_FROM_PRODUCT="Pulse <hello@yourdomain.com>"
EMAIL_REPLY_TO=hello@yourdomain.com

# Cron routes (weekly summary and reminders), sent as a Bearer token
CRON_SECRET=

# Web push reminders. Generate with: bunx web-push generate-vapid-keys
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:hello@yourdomain.com
```

Without `CLAUDE_API_KEY` the app still works. AI features show a notice instead. Without the VAPID keys, Settings says reminders aren't set up and the reminders cron sends nothing.

### AI limits

Each person gets one shared allowance of AI uses a day. A Pip message, a weekly recap, a statement refresh, wording suggestions, Find check-ins and each evening last call that Pip writes cost 1. When the allowance is used up, the last call uses fixed text instead. The header shows how many are left. The allowance resets at midnight in the person's own time zone.

| Limit | Default | Variable |
| --- | --- | --- |
| AI uses per person per day | 30 | `AI_USER_DAILY_REQUEST_LIMIT` |
| Tokens per person per day (hidden) | 150,000 | `AI_USER_DAILY_TOKEN_LIMIT` |
| Input tokens per request | 12,000 | `AI_REQUEST_INPUT_TOKEN_LIMIT` |
| AI uses across the whole site per day | 1,000 | `AI_GLOBAL_DAILY_REQUEST_LIMIT` |
| Tokens across the whole site per day | 5,000,000 | `AI_GLOBAL_DAILY_TOKEN_LIMIT` |

The site-wide limits reset at midnight UTC. Pip messages are limited to 1,000 characters, and the server strips anything in the chat history that Pip didn't produce (other roles, files, oversized or unknown tool data) before counting tokens. Requests over the input limit are rejected before they cost a use.

Set `AI_LIMITS_ENABLED=false` to turn limits off in development. A failed AI call does not count against a limit. A Pip reply stopped part way still counts as one use.

### Reminders

`/api/cron/reminders` runs every 15 minutes. It sends each person's daily reminder and last call within 20 minutes of the time they picked, at most once per kind per local day (`reminder_deliveries` holds the dedupe keys), and skips anyone whose due habits are all checked in. Vercel Hobby only allows daily crons, so Supabase calls the route instead:

1. Deploy, then open the Supabase SQL editor.
2. Run `scripts/supabase-reminders-cron.sql` with your production URL and `CRON_SECRET` filled in. It enables `pg_cron` and `pg_net`, stores both values in Vault, and schedules the call.
3. Check runs with `select * from cron.job_run_details order by start_time desc limit 10;` and responses with `select * from net._http_response order by created desc limit 10;`.

Rotate the secret with `vault.update_secret`, and stop the job with `select cron.unschedule('pulse-reminders');`.

In development, call the route yourself. Outside production it accepts a `now` override so you can test a reminder window:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3000/api/cron/reminders?now=2026-10-28T20:05:00-07:00"
```

Push works on `localhost` in Chrome, Edge and Firefox. Safari on macOS needs HTTPS (`bun run dev --experimental-https`), and iOS needs a deployed site added to the Home Screen.

## Commands

| Command               | What it does                                                    |
| --------------------- | --------------------------------------------------------------- |
| `bun run dev`         | Start the dev server                                            |
| `bun run build`       | Production build                                                |
| `bun run start`       | Serve the production build                                      |
| `bun run lint`        | ESLint plus the design token check (`scripts/check-design.mjs`) |
| `bunx tsc --noEmit`   | Type check                                                      |
| `bun run db:generate` | Generate a migration from `lib/db/schema.ts`                    |
| `bun run db:migrate`  | Apply migrations                                                |
| `bun run db:studio`   | Open Drizzle Studio                                             |

## Project layout

- `app/`: routes. The dashboard is `/dashboard` (Today), `habits`, `history`, `review`, `journal` and `settings`. Old paths redirect in `next.config.ts`.
- `app/api/`: Pip's two backends (`pulse-coach`, `habit-agent`), the weekly summary and reminders crons, the push subscription refresh route and unsubscribe.
- `public/sw.js`: the service worker that shows reminders. `app/manifest.ts` and `public/icons/` make Pulse installable.
- `components/ui/`: design system primitives. `components/product/` and `components/landing/` build screens from them.
- `lib/`: data and AI logic. Files ending in `-core.ts` are pure functions, and the matching file without `-core` does the database and network work.
- `drizzle/`: SQL migrations.
- `emails/`: React Email templates.

Some code names predate the current wording. For example, `quests` are habits, `checkIns` with `win` or `pass` are Done or Skipped check-ins, `weeklyStories` are weekly recaps and `characters` hold who you are becoming. They stay as they are so the database and logs don't change.

## Deployment

Pulse is built for Vercel.

1. Add the environment variables above to the Vercel project, with `NEXT_PUBLIC_SITE_URL` set to the production domain.
2. Run `bun run db:migrate` against the production database.
3. Verify your sending domain in Resend, and set Supabase Auth to send email through Resend SMTP.
4. The weekly summary runs every Monday at 13:00 UTC from `vercel.json`. Vercel sends `CRON_SECRET` with each run.
5. Set up the reminders cron in Supabase as described under Reminders.
