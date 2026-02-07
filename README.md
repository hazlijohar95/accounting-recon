# Reconciled

**Your accountant's accountant.** Automated cash-accrual reconciliation that actually works.

Bank says one thing. Invoices say another. Reconciled figures out who's lying (spoiler: it's usually the dates).

## What Is This

A SaaS app that matches bank transactions (cash) against invoices and receipts (accrual) using a 5-layer matching engine. Layer 1 is basic arithmetic. Layer 5 is an LLM reading your transactions like a forensic auditor who had too much coffee.

```
Layer 1: Exact Match     → "These are literally the same number"
Layer 2: Window Match     → "Same amount, close enough date"
Layer 3: Reference Match  → "Found your invoice number hiding in the description"
Layer 4: Fuzzy Match      → "This looks close enough, I'm 78% sure"
Layer 5: LLM Semantic     → "I read both descriptions and they're definitely the same vendor"
Layer 7: Partial Match    → "Three invoices add up to one payment, you're welcome"
```

Yes, we skipped Layer 6. Layer 6 is you doing it manually. We don't talk about Layer 6.

## Tech Stack

No Rust. I know the old docs said Rust. The old docs were aspirational. We're over it.

| What | Tech | Why |
|------|------|-----|
| Frontend | Next.js 16 + React 19 | Because server components are the future and the future is now |
| Backend | Convex | Real-time, serverless, zero SQL. The matching engine runs here. In TypeScript. It's fast enough. |
| AI/LLM | AWS Bedrock + Vercel AI SDK | Claude does the thinking. We do the plumbing. |
| OCR | Python FastAPI + Mistral | Reads PDFs so you don't have to |
| PDF Reports | Python + ReportLab | Makes PDFs so your clients think you're fancy |
| Auth | WorkOS | Enterprise SSO without enterprise pain |
| Styling | Tailwind v4 | `className` goes brrr |

## Getting Started

```bash
# Install dependencies
pnpm install

# Start the frontend (terminal 1)
pnpm dev

# Start the backend (terminal 2)
npx convex dev

# That's it. Two terminals. No Docker. No Kubernetes. No YAML files.
# You're welcome.
```

## Running Tests

```bash
pnpm test              # Vitest - the fast one
pnpm test:coverage     # With coverage - the judgemental one
pnpm test:e2e          # Playwright - the slow but thorough one
cd ml && pytest        # Python - the other one
```

Coverage thresholds: 80% statements, 75% branches, 80% functions, 80% lines. Not negotiable.

## Project Structure

```
app/                    # Next.js App Router
  (app)/                # Authenticated routes (dashboard, upload, reconcile, reports)
  api/                  # API routes (AI chat, matching stream, auth, import)

components/             # React components
  brand/                # 20+ branded UI components (we went hard on the design)
  views/                # Page-level view components
  ai/                   # AI assistant components
  spreadsheet/          # Agentic spreadsheet (yes, we built a spreadsheet)

convex/                 # The actual backend
  matching/             # 5-layer matching engine
    engine.ts           # Orchestrator
    layers/             # Each layer is its own file because we're civilized
  lib/                  # Auth, validators, errors, audit logging
  schema.ts             # 30+ tables. It grew. We're not sorry.

lib/                    # Frontend utilities
  ai/                   # Bedrock provider, prompts, input sanitization
  store.ts              # Zustand. One store. Multiple slices. No Redux.

ml/                     # Python ML service (deployed on Fly.io)
  services/             # OCR, PDF generation, bank parsers
```

## The Matching Engine

Lives in `convex/matching/`. Layers 1-4 are pure TypeScript functions -- no I/O, deterministic, testable, fast. Layer 5 calls Bedrock and hopes for the best (with a smart fallback when Bedrock decides to take a nap).

Confidence scoring: >=90% gets auto-approved. 70-89% gets suggested. <70% goes to suspense (the accounting kind, not the movie kind).

Race condition protection built in. Two matches can't claim the same transaction. We learned that one the hard way.

## Docs

- `agent_docs/` - Internal architecture docs (for AI agents and devs who read)
- `docs/` - User-facing docs (Fumadocs, looks pretty)
- `CLAUDE.md` - Instructions for AI coding agents
- `Reconciled-PRD.md` - The original vision doc (read it for vibes, not for accuracy)

## Environment Variables

Copy `.env.example` to `.env.local`. Fill in the blanks. Don't commit your secrets. You know the drill.

## License

Proprietary. Don't steal our reconciliation engine. Build your own Layer 7. I dare you.
