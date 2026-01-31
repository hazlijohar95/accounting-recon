# Reconciled - Accounting Reconciliation SaaS

**Automated cash-accrual reconciliation with 5-layer AI matching**

## Tech Stack
| Layer | Tech | Purpose |
|-------|------|---------|
| Frontend | Next.js 16 + React 19 + TS | Desktop-first web app (Turbopack) |
| Styling | Tailwind CSS v4 | Utility-first CSS |
| Backend API | Rust (Axum) | File processing, exports |
| ML Services | Python (FastAPI) | OCR, LLM matching |
| Database | Convex | Real-time sync, serverless |
| Auth | WorkOS | Authentication |
| LLM | AWS Bedrock | Claude/Mistral for semantic matching |

## Commands
```bash
# Development
pnpm dev                    # Start Next.js dev server (Turbopack)
cargo run                   # Start Rust API
uvicorn main:app --reload   # Start Python ML service
npx convex dev              # Start Convex dev

# Testing
pnpm test                   # Frontend tests
cargo test                  # Rust tests
pytest                      # Python tests

# Build
pnpm build                  # Production frontend
cargo build --release       # Production Rust API
```

## Priority: Backend-First
1. **Rust API** - File uploads, matching engine orchestration, export generation
2. **Python ML** - OCR extraction, LLM semantic matching, categorization
3. **Convex** - Schema, queries, mutations, real-time subscriptions
4. **Frontend** - Only after backend APIs are stable

## Core Domain
- **Bank transactions** (cash basis) ↔ **Invoices/receipts** (accrual basis)
- 5-layer matching: Exact → Window → Reference → Fuzzy → LLM Semantic
- Confidence thresholds: ≥90% auto-match, 70-89% suggest, <70% suspense

## Detailed Docs
- `agent_docs/architecture.md` - System diagram, service boundaries
- `agent_docs/backend-rust.md` - Axum patterns, endpoints
- `agent_docs/backend-python.md` - FastAPI ML service
- `agent_docs/frontend-react.md` - React patterns, useEffect rules
- `agent_docs/database-convex.md` - Schema, queries
- `agent_docs/testing.md` - Test requirements
- `agent_docs/logging.md` - Structured logging
- `agent_docs/security.md` - Auth, data isolation

## Key Files
- `Reconciled-PRD.md` - Full product requirements
- `convex/schema.ts` - Database schema
- `src/api/` - Rust API handlers
- `ml/` - Python ML services
