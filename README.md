# Pulse

Identity-first habit tracking for people who want proof of who they are becoming, not another streak counter.

Pulse lets users define a **Character**, manage a small set of repeatable **Quests**, and log daily **Proof** as Wins or Passes. AI features turn that history into weekly reflection, coaching, and confirmed habit operations.

## Features

- Character-first onboarding and daily Quest check-ins
- Proof archive, journal, momentum, stats, and heuristic suggestions
- Weekly Story generation from Proof and Journal context
- Pulse Coach for reflective AI guidance with confirmed actions
- Habit Agent for confirmed create/update/archive/restore/delete habit operations
- Postgres-backed AI usage caps and token/request audit logging
- Resend product emails: welcome email, weekly digest, and unsubscribe handling
- Supabase auth with branded SMTP delivery through Resend

## Stack

- Next.js 16 App Router, React 19, TypeScript
- Tailwind CSS v4, shadcn/ui, Hugeicons, Recharts
- Supabase Auth + Supabase Postgres
- Drizzle ORM + SQL migrations
- AI SDK with OpenAI and Vercel AI Gateway
- Resend + React Email
- Vercel Cron for scheduled weekly digests

## Getting Started

```bash
bun install
bun dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

Create `.env` with the required Supabase, AI, and email values:

```bash
DATABASE_URL=
DIRECT_DATABASE_URL=

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000

AI_GATEWAY_API_KEY=

AI_LIMITS_ENABLED=true
AI_GLOBAL_DAILY_REQUEST_LIMIT=50
AI_GLOBAL_DAILY_TOKEN_LIMIT=500000
AI_PULSE_COACH_DAILY_REQUEST_LIMIT=5
AI_HABIT_AGENT_DAILY_REQUEST_LIMIT=3
AI_REWORD_DAILY_REQUEST_LIMIT=5
AI_WEEKLY_STORY_WEEKLY_REQUEST_LIMIT=2

RESEND_API_KEY=
EMAIL_FROM_PRODUCT="Pulse <hello@yourdomain.com>"
EMAIL_FROM_AUTH="Pulse <auth@yourdomain.com>"
EMAIL_REPLY_TO=hello@yourdomain.com
CRON_SECRET=
```

For production, set `NEXT_PUBLIC_SITE_URL` to the deployed domain and configure Supabase Auth SMTP with Resend.

## Commands

```bash
bun run test
bun run lint
bun run build
bun run db:generate
bun run db:migrate
```

## Deployment

Pulse is designed for Vercel. Add the same production environment variables in Vercel, run Drizzle migrations against the production database, and verify the Resend domain before sending emails.
