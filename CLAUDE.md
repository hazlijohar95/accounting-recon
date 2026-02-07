# Reconciled - Accounting Reconciliation SaaS

**Automated cash-accrual reconciliation with 5-layer AI matching**

## Tech Stack
| Layer | Tech | Purpose |
|-------|------|---------|
| Frontend | Next.js 16 + React 19 + TS | Desktop-first web app (Turbopack) |
| Styling | Tailwind CSS v4 | Utility-first CSS |
| Backend | Convex 1.31 | Serverless DB, real-time sync, matching engine, business logic |
| API Routes | Next.js API | AI chat (Bedrock), matching stream (SSE), auth, CSV import |
| ML Services | Python (FastAPI) | OCR (Mistral), PDF generation -- deployed on Fly.io |
| AI/LLM | AWS Bedrock + Vertex AI | Claude Sonnet 4, Opus 4.5, Gemini via Vercel AI SDK |
| Auth | WorkOS | Authentication (AuthKit) |
| Docs | Fumadocs | User-facing documentation site |

## Commands
```bash
# Development (run in separate terminals)
pnpm dev                    # Start Next.js dev server (Turbopack)
npx convex dev              # Start Convex dev backend

# Testing
pnpm test                   # Vitest (frontend + Convex unit tests)
pnpm test:coverage          # Vitest with coverage report
pnpm test:e2e               # Playwright E2E tests
cd ml && pytest             # Python ML service tests

# Build
pnpm build                  # Production Next.js build
npx convex deploy           # Deploy Convex to production
```

## Architecture

**2-tier architecture:** browser + Convex serverless, supplemented by Next.js API routes and a Python ML microservice.

- **Convex** -- owns all data, matching engine (5 layers in TypeScript), extraction orchestration, cron jobs, auth verification, real-time subscriptions
- **Next.js API Routes** -- AI chat streaming (Vercel AI SDK + Bedrock), matching SSE endpoint, auth callbacks, CSV import
- **Python ML (FastAPI on Fly.io)** -- OCR extraction (Mistral), PDF report generation (ReportLab)
- **Frontend** -- React 19 UI, PDF.js browser-side rendering, Zustand state management

## Core Domain
- **Bank transactions** (cash basis) <-> **Invoices/receipts** (accrual basis)
- 5-layer matching: Exact -> Window -> Reference -> Fuzzy -> LLM Semantic (+ Layer 7: Partial)
- Confidence thresholds: >=90% auto-match, 70-89% suggest, <70% suspense

## Detailed Docs
- `agent_docs/architecture.md` - System diagram, service boundaries, data flows
- `agent_docs/convex-backend.md` - Convex modules, matching engine, extraction, crons, auth
- `agent_docs/api-routes.md` - Next.js API routes (chat, matching stream, auth, import)
- `agent_docs/backend-python.md` - FastAPI ML service (OCR, PDF generation)
- `agent_docs/frontend-react.md` - React patterns, component architecture
- `agent_docs/database-convex.md` - Schema, queries, mutations, real-time patterns
- `agent_docs/testing.md` - Test strategy, coverage thresholds
- `agent_docs/logging.md` - Structured logging, error monitoring
- `agent_docs/security.md` - Auth, data isolation, CSRF

## Key Files
- `Reconciled-PRD.md` - Product requirements (planning document, not current state)
- `convex/schema.ts` - Database schema (30+ tables)
- `convex/matching/engine.ts` - Matching engine orchestration
- `convex/matching/layers/` - Matching layer implementations (Exact, Window, Reference, Fuzzy, Semantic, Partial)
- `convex/lib/auth.ts` - Auth helpers (requireAuth, requireCompanyAccess, etc.)
- `lib/ai/` - AI providers, prompts, sanitization
- `app/api/` - Next.js API routes
- `ml/` - Python ML service (OCR + PDF generation)
