# TalkMaze

TalkMaze is a tutoring platform that connects students with coaches for live 1-on-1 video lessons. It handles the full lifecycle: family signup and onboarding, subscription billing, automated coach–student matchmaking, scheduling, in-app messaging, lesson delivery over an external video room, progress tracking, and a rewards system.

It is a [Next.js](https://nextjs.org) App Router application backed by Supabase, with Stripe for billing, LessonSpace for video, and Resend for transactional email.

> For deeper architecture and conventions, read [`CLAUDE.md`](./CLAUDE.md) and the canonical docs in [`docs/`](./docs).

## Stack

- **Framework:** Next.js 16 (App Router), React 19, TypeScript (strict)
- **Styling:** Tailwind v4 (CSS-only config) + shadcn/Radix primitives (`cva` + `cn`)
- **Backend:** Supabase (Postgres, Auth, Storage)
- **Billing:** Stripe (subscriptions via `SubscriptionSchedule`)
- **Video:** LessonSpace (external rooms + webhooks)
- **Email:** Resend + React Email
- **Rich text:** Tiptap (StarterKit) with DOMPurify on render
- **Calendars:** FullCalendar (dayGrid / timeGrid / interaction)
- **Validation:** Zod
- **Testing:** Vitest (unit + integration), Playwright (screenshots), MSW
- **Package manager:** npm

## Getting Started

### Prerequisites

- Node.js 20+
- npm
- [Supabase CLI](https://supabase.com/docs/guides/cli) (for type generation and local integration tests)

### Setup

```bash
npm install
cp .env.example .env.local   # create this file; see Environment variables below
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

Create `.env.local` with the following:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Base URL used for building absolute links / redirects |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase browser (publishable) key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key — **server/webhooks only**, bypasses RLS |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for the Stripe webhook |
| `LESSONSPACE_API_KEY` | LessonSpace API key |
| `LESSONSPACE_WEBHOOK_URL` | Callback URL registered with LessonSpace rooms |
| `RESEND_API_KEY` | Resend transactional email key |

Integration tests additionally require a `.env.test` file and a running local Supabase instance — see [`docs/testing-coverage.md`](./docs/testing-coverage.md).

## Commands

```bash
npm run dev               # start dev server (http://localhost:3000)
npm run build             # production build
npm run start             # serve the production build
npm run lint              # eslint (enforces custom layering rules)
npm run gen-types         # regenerate Supabase types -> src/services/supabase/types/database.ts

npm run test:unit         # vitest unit tests (no DB, ~10s)
npm run test:integration  # vitest integration tests (needs `supabase start` + .env.test, ~60s)
npm run test:coverage     # unit tests with v8 coverage
```

CI runs both test suites on every push and PR (`.github/workflows/test.yml`). Unit tests run unconditionally; integration tests are skipped on draft PRs.

> `gen-types` has the Supabase project ID hard-coded. There is no Prettier — formatting is handled by ESLint only.

## Project structure

```
src/
  app/              Next.js App Router
    (public)/       login, signup, password reset, payments/paywall
    (protected)/
      (families)/   student/parent: lessons, message, onboarding, parent, profiles, reward, student
      coach/        coach dashboard
      admin/        admin dashboard
    api/            REST handlers, grouped by RESOURCE (never by audience)
  components/        shared UI (ui/ = shadcn primitives, common/ = composite)
  lib/              app-specific domain logic (auth, payments, scheduling, ...)
  services/         third-party SDK adapters (supabase, lessonspace, ...) — adapter-only
  utils/            cross-domain helpers
docs/               canonical architecture & contract docs
tests/              unit + integration tests
```

### Route collocation

Each route segment under `src/app/` may colocate route-private code using underscore-prefixed folders (not routed by Next): `_components/`, `_hooks/`, `_context/`, `_lib/`, `_types/`, plus `actions.ts` for route-scoped server actions. Keep `_lib/` flat while small; split into `_lib/server/`, `_lib/utils/` as it grows. `loading.tsx` always renders `<PageSpinner />`.

### Layering rules (enforced by ESLint)

- Nothing under `src/**` may import from `@/src/app/api/**` — route handlers are HTTP endpoints, not a shared module. Put shared logic in `src/lib/<domain>/`.
- Adapters in `src/services/**` are SDK/HTTP only — no DB access, no business logic, no cookie writes. Business workflows live in `src/lib/<domain>/server/` and call into `src/services/*` (not the reverse).
- The path alias `@/*` resolves to the repo root, so imports include the explicit `src/` segment: `@/src/lib/...`.

## Core concepts

### Roles & access control

Auth + RBAC run in middleware (`src/middleware.ts`) on every request. The `account.role` numeric code drives gating: `1` = family (parent/student), `2` = coach, `3` = admin. Family users select an **active profile** (`student` or `parent`), stored in httpOnly cookies, which further gates access (e.g. a student without an active subscription is routed to `/payments`). Webhook routes bypass both auth layers and verify signatures instead.

### API contract

Every gated route follows a four-stage shape: **`requireRole` → Zod `.strict()` validation → `assertOwns*` ownership check → execute.** List endpoints return named collections (`{ students: [...] }`), entity endpoints return `{ student: {...} }`, and errors return `{ error: string }` with a proper status code. Clients never hard-code `/api/...` strings — they build URLs from the typed registry in `src/lib/api/routes.ts`. The spec is canonical in [`docs/api-contract.md`](./docs/api-contract.md), [`docs/api-auth.md`](./docs/api-auth.md), and [`docs/api-ownership.md`](./docs/api-ownership.md).

### Supabase clients

Three clients in `src/services/supabase/` — pick by context:

- `client.ts` — browser client, use in Client Components.
- `server.ts` — cookie-wired server client, the default on the server (Server Components, Route Handlers, Server Actions).
- `service.ts` — service-role client that bypasses RLS; **legitimately used only in webhooks**.

### Key domain flows

- **Signup → onboarding → payment → matchmaking** is a deliberate lazy chain: signup creates minimal rows; the Stripe customer is created in `/api/checkout`; the LessonSpace room and coach assignment happen only after `invoice.paid`.
- **Matchmaking** (`assignCoachToStudent`) reserves a weekly slot as `pending`; admin approval materializes concrete `sessions` rows and activates the slot. DST is handled by re-anchoring wall-clock time per week.
- **Subscriptions** support upgrade/downgrade via Stripe `SubscriptionSchedule` with a 28-day refund window.

See [`docs/data-model.md`](./docs/data-model.md), [`docs/payments-flow.md`](./docs/payments-flow.md), [`docs/matchmaking.md`](./docs/matchmaking.md), and [`docs/lessonspace-runtime-flows.md`](./docs/lessonspace-runtime-flows.md).

## Testing

- **Unit** (`npm run test:unit`) — no database, fast feedback.
- **Integration/contract** (`npm run test:integration`) — runs against a local Supabase instance; each test uses `beforeEach(resetAll)` and asserts side effects via helpers in `tests/helpers/`.

Full details, coverage, and the role-gate auth matrix live in [`docs/testing-coverage.md`](./docs/testing-coverage.md).

## Documentation

| Doc | Contents |
| --- | --- |
| [`docs/api-contract.md`](./docs/api-contract.md) | Route shape, status codes, error format — the API spec |
| [`docs/api-auth.md`](./docs/api-auth.md) | `requireRole`, role matrix per resource |
| [`docs/api-ownership.md`](./docs/api-ownership.md) | `assertOwns*` helpers, 404-vs-403 rule |
| [`docs/component-architecture.md`](./docs/component-architecture.md) | UI primitives, variant rules, two-tier tokens, shadcn workflow |
| [`docs/data-model.md`](./docs/data-model.md) | Full table inventory and entity graph |
| [`docs/payments-flow.md`](./docs/payments-flow.md) | Stripe checkout → invoice → schedule lifecycle |
| [`docs/matchmaking.md`](./docs/matchmaking.md) | Coach/student matching algorithm |
| [`docs/lessonspace-runtime-flows.md`](./docs/lessonspace-runtime-flows.md) | LessonSpace integration map |
| [`docs/testing-coverage.md`](./docs/testing-coverage.md) | Test coverage, helpers, CI shape |
| [`docs/repo-quality-audit.md`](./docs/repo-quality-audit.md) | Audit findings and tracked tech debt |
