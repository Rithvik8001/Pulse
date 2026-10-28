# Pulse

A daily habit app for who you are becoming. Say who you want to be ("I am a writer"), pick one to three small habits that show it, and check each one in as Done or Skipped every day. Each week Pulse writes a short recap and a one-line statement of who you are becoming, based only on your own check-ins and journal.

## Features

- **Today**: the day's habits with a Done or Skipped control and an optional note.
- **Habits**: add, rename, reorder, archive, restore and delete habits, up to 12 active. Suggestions point out dormant habits, strong archived ones and shorter wording.
- **History**: consistency score, done rate, an 8-week grid, a weekly done-rate chart, per-habit stats, and every check-in with search, filter, edit and delete.
- **Review**: the weekly recap (last week's, if this week has nothing yet), past recaps, a refreshable "who you are becoming" statement, and milestones.
- **Journal**: one entry per day with a date picker, prompts and that day's check-ins. Pip can read a saved entry and suggest the matching Done or Skipped check-ins to save in one go.
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

# Weekly summary cron, sent as a Bearer token
CRON_SECRET=
```

Without `CLAUDE_API_KEY` the app still works. AI features show a notice instead.

### AI limits

Each person gets one shared allowance of AI uses a day. A Pip message, a weekly recap, a statement refresh, wording suggestions and Find check-ins each cost 1. The header shows how many are left. The allowance resets at midnight in the person's own time zone.

| Limit | Default | Variable |
| --- | --- | --- |
| AI uses per person per day | 30 | `AI_USER_DAILY_REQUEST_LIMIT` |
| Tokens per person per day (hidden) | 150,000 | `AI_USER_DAILY_TOKEN_LIMIT` |
| Input tokens per request | 12,000 | `AI_REQUEST_INPUT_TOKEN_LIMIT` |
| AI uses across the whole site per day | 1,000 | `AI_GLOBAL_DAILY_REQUEST_LIMIT` |
| Tokens across the whole site per day | 5,000,000 | `AI_GLOBAL_DAILY_TOKEN_LIMIT` |

The site-wide limits reset at midnight UTC. Pip messages are limited to 1,000 characters, and the server strips anything in the chat history that Pip didn't produce (other roles, files, oversized or unknown tool data) before counting tokens. Requests over the input limit are rejected before they cost a use.

Set `AI_LIMITS_ENABLED=false` to turn limits off in development. A failed AI call does not count against a limit. A Pip reply stopped part way still counts as one use.

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
- `app/api/`: Pip's two backends (`pulse-coach`, `habit-agent`), the weekly summary cron and unsubscribe.
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
