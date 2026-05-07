# tejido-next

Next.js rewrite of [Tejido](https://github.com/danemyers/Tejido) (formerly Circle): an AI-facilitated group-deliberation chatbot. Anonymous chat → point extraction → live theme clustering. Phone OTP gates the results view.

## Stack

- Next.js 16 (App Router, Turbopack)
- Vercel AI SDK 6 + AI Elements (chat UI)
- Anthropic Claude (facilitator + extraction + clustering)
- Groq Whisper Turbo (voice transcription)
- Supabase: data + Auth (phone OTP, anonymous sign-in) + Realtime

## Architecture

| Surface | Path | Notes |
| --- | --- | --- |
| Landing | `/` | enter session code |
| Chat | `/s/[code]` | anonymous Supabase Auth, streams Claude via `/api/chat` |
| OTP gate | `/s/[code]/verify` | upgrades anonymous user → phone-verified |
| Themes | `/s/[code]/themes` | live-updating via Supabase Realtime |
| Admin home | `/admin` | list + create sessions |
| Admin detail | `/admin/sessions/[code]` | participants + themes |
| Admin login | `/admin/login` | phone OTP for existing admin users |

DB lives in the `tejido_next` Postgres schema on the existing Supabase project (`avtzkupvesskynecgdzg`), separate from the legacy `public.*` tables.

## Setup

1. **Env vars** — copy `.env.example` → `.env.local`, fill in:
   - `SUPABASE_SERVICE_ROLE_KEY` — Supabase dashboard → Project Settings → API
   - `ANTHROPIC_API_KEY` — console.anthropic.com
   - `GROQ_API_KEY` — console.groq.com (Whisper transcription)

2. **Supabase Auth providers** — in dashboard, Authentication → Providers:
   - Enable **Anonymous sign-ins** (required — every participant gets an anon user)
   - Enable **Phone** provider, configure Twilio (or Vonage / MessageBird). SMS costs ~$0.008/msg US

3. **Seed an admin** — first admin must be set manually after they sign up via OTP at least once:
   ```sql
   UPDATE tejido_next.profiles SET role = 'admin'
   WHERE user_id = (SELECT id FROM auth.users WHERE phone = '+15551234567');
   ```

4. **Run**
   ```bash
   pnpm install
   pnpm dev
   ```

## Notable design choices

- **No state machine.** Participant phase (`in_conversation` / `awaiting_verification` / `complete`) is a column on `tejido_next.participants`, advanced by API routes. Server-rendered pages redirect based on phase.
- **Anonymous-first auth.** Every visitor to `/s/[code]` gets a Supabase anonymous user immediately. Phone OTP is an *upgrade* of that user (`auth.updateUser({ phone })` + `verifyOtp({ type: "phone_change" })`) — keeps a single `participants.user_id` across the join.
- **No permissions UI.** Extraction still happens (we need structured points to cluster) but every point defaults to anonymous. PII redaction is enforced in the extraction prompt itself.
- **Custom schema, not `public`.** Server uses `service_role` for all writes. Client reads go through RLS — gated to `phone IS NOT NULL` for the themes view.
- **Realtime for themes.** Both `themes` and `theme_assignments` are added to the `supabase_realtime` publication so the themes page updates live as more participants finish.

## What's not included (vs. legacy Tejido)

Removed: Telegram bot, contexts library, multiple workflow types, synthesis/proposal/revise post-processors, permissions UI, admin password auth.

## Project layout

```
src/
  app/
    page.tsx                  landing
    s/[code]/                 participant flow
    admin/                    admin pages
    api/                      streaming chat, extraction, clustering, transcription
  components/
    ai-elements/              from `npx ai-elements` (subset)
    ui/                       shadcn primitives
  lib/
    prompts/                  facilitator + extraction + clustering prompts
    supabase/                 client / server / admin (service-role)
    participant.ts            anon user + participant lookup
    extract.ts                Claude → structured points → DB
    cluster.ts                Claude → themes + assignments → DB
    admin-guard.ts            requireAdmin() helper
  proxy.ts                    Supabase auth cookie refresh (Next 16 proxy)
```
