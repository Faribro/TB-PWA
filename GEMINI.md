# SAMADHAAN — TB Surveillance Platform (GEMINI.md)

## Project Overview

**SAMADHAAN** is a National Integrated Health OS built for TB (Tuberculosis) surveillance in Indian correctional facilities, developed by Alliance India. It is a **Next.js 15 / React 19 Progressive Web App** deployed on Vercel, backed by Supabase (PostgreSQL + RLS) and Prisma ORM.

The platform unifies:
- AI-assisted TB X-Ray screening (neural confidence scoring)
- Patient pipeline management (initiation → treatment)
- GIS hotspot intelligence (MapLibre + Deck.gl)
- Monitoring & Evaluation (M&E) reporting
- Role-based access control (RBAC) across state/district/facility scopes
- KoboToolbox ETL integration for field data collection
- Real-time sync via Supabase Realtime + Upstash Redis + QStash

---

## Technology Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15, React 19, TypeScript 5 |
| Styling | Tailwind CSS v4, Framer Motion, GSAP |
| Auth | NextAuth v5 (beta) + Supabase SSR |
| Database | Supabase PostgreSQL + Row-Level Security (RLS) |
| ORM | Prisma v7 |
| AI | Google Generative AI, Vercel AI SDK |
| Maps | MapLibre GL, Deck.gl, react-map-gl |
| Charts | ECharts, Recharts, D3 |
| 3D | Three.js, @react-three/fiber |
| Queue | Upstash QStash, Upstash Redis |
| ETL | KoboToolbox webhook integration |
| Analytics | PostHog |
| Testing | Custom Bun/Node scripts in /scripts |
| Deployment | Vercel (bun package manager) |

---

## Project Structure

```
app/                    # Next.js App Router pages & API routes
  (public)/             # Public-facing pages (landing, etc.)
  api/                  # API route handlers
    etl/kobo-sync/      # KoboToolbox ETL pipeline
    sync/               # Supabase sync endpoints
    admin/              # Admin-only operations
  dashboard/            # Protected dashboard pages
    submit-new/         # TB screening form (multi-step)
  docs/                 # Knowledge base / documentation viewer
  admin/                # Admin panel (Super Admin only)
components/             # Shared React components
  ui/                   # Radix UI primitives (badge, card, etc.)
hooks/                  # Custom React hooks
lib/                    # Shared utilities & constants
  constants/roles.ts    # RBAC role definitions
  supabase-client.ts    # Browser Supabase client
  supabase-server.ts    # Server Supabase client
stores/                 # Zustand state stores
types/                  # TypeScript type definitions
prisma/
  schema.prisma         # Prisma schema
scripts/                # Test & utility scripts
```

---

## Role Hierarchy (RBAC)

| Role | Scope | Key Permissions |
|---|---|---|
| `ADMIN` / Super Admin | Global | All modules, audit controls |
| `SPM` / State Officer | State | State command, district supervision |
| `ME` / M&E Officer | District | M&E reporting, triage decisions |
| `PM` / District Officer | District | District operations |
| `PC` / Field Operator | Facility | Screening execution, form submission |

Roles are enforced by NextAuth session tokens + Supabase RLS policies. The middleware at `middleware.ts` guards all `/dashboard` and `/admin` routes.

---

## Patient Pipeline States

`INITIATED → SCREENED → AI_FLAGGED → TRIAGED → TESTED → CONFIRMED → ENROLLED → COMPLETED`

LTFU (Lost to Follow-Up) is a special watch state. SLA thresholds: triage <24h, testing <2h, enrollment <48h.

---

## Key Conventions & Patterns

- **`'use client'`** pages that use Supabase browser client **must** export `export const dynamic = 'force-dynamic'` to avoid prerender errors at build time
- **API routes** use Supabase service-role client (server-side), never expose to browser
- All patient data writes are audited; no hard deletes
- Supabase RLS restricts data to user's assigned geographic scope
- Environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (public), all others are server-only
- Package manager: **bun** (not npm/yarn). Use `bun install`, `bun run <script>`
- Build command: `bun run build`

---

## Issue & PR Labels

When triaging issues, use these labels:

- `bug` — Something is broken
- `enhancement` — New feature or improvement
- `auth` — Authentication / session issues
- `database` — Supabase / Prisma / RLS concerns
- `api` — API route failures or errors
- `ui` — Frontend component or styling issues
- `performance` — Build time, runtime, or query performance
- `ci-cd` — Vercel deployment or GitHub Actions
- `security` — Auth, RLS, data exposure concerns
- `etl` — KoboToolbox sync or data pipeline
- `realtime` — Supabase Realtime / Redis sync
- `rbac` — Role-based access control
- `good first issue` — Suitable for new contributors
- `needs-investigation` — Unclear root cause
- `blocking` — Blocks deployment or critical path

---

## Common Build & Test Commands

```bash
bun run build              # Production build
bun run typecheck          # TypeScript check (no emit)
bun run lint               # ESLint
bun run test:e2e           # End-to-end test suite
bun run test:rbac          # RBAC permission tests
bun run test:pipeline      # Supabase + triple sync validation
bun run test:rls           # RLS normalization tests
bun run verify:deployment  # Post-deploy health check
```

---

## PR Review Priorities

When reviewing pull requests, pay special attention to:
1. **Security**: Any Supabase client instantiation — ensure browser client is never used server-side with sensitive keys
2. **RLS bypass risk**: Service-role client should never be exposed to client components
3. **Static prerendering**: Pages using `createClient()` must have `export const dynamic = 'force-dynamic'`
4. **RBAC enforcement**: Route protection changes in `middleware.ts` or `lib/constants/roles.ts`
5. **Data integrity**: Patient record mutations must be auditable, no cascading hard deletes
6. **Type safety**: Zod schemas for all API inputs, TypeScript strict mode
7. **Performance**: Large dependency imports in client bundles; prefer dynamic imports for heavy libs (Three.js, ECharts, Deck.gl)
