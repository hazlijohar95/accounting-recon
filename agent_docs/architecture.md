# Architecture

## System Diagram
```
┌───────────────────────────────────────────────────────────────┐
│              FRONTEND (Next.js 16 + React 19)                 │
│  Dashboard | Upload | Reconciliation | Reports | Spreadsheet  │
│  PDF.js (browser) | Zustand state | Fumadocs                 │
└─────────┬──────────────────┬───────────────────┬──────────────┘
          │                  │                   │
          ▼                  ▼                   ▼
┌──────────────────┐  ┌───────────────────┐  ┌──────────────────┐
│  CONVEX           │  │ NEXT.JS API       │  │ PYTHON ML        │
│  (Serverless DB + │  │ ROUTES            │  │ (FastAPI/Fly.io) │
│   Backend Logic)  │  │                   │  │                  │
│                   │  │ /api/chat/*       │  │ /extract         │
│ • Schema (30+ tbl)│  │   AI assistant    │  │   Mistral OCR    │
│ • Matching engine │  │   (Bedrock+AI SDK)│  │                  │
│ • Extraction orch │  │                   │  │ /generate-pdf    │
│ • Cron jobs       │  │ /api/matching/    │  │   ReportLab PDF  │
│ • Auth checks     │  │   stream (SSE)    │  │                  │
│ • Real-time sync  │  │                   │  │ /health          │
│                   │  │ /api/auth/*       │  │                  │
│                   │  │   WorkOS login/   │  └────────┬─────────┘
│                   │  │   callback/logout │           │
│                   │  │                   │           ▼
│                   │  │ /api/import/csv   │  ┌──────────────────┐
│                   │  │ /api/search       │  │ MISTRAL OCR API  │
└────────┬──────────┘  └────────┬──────────┘  └──────────────────┘
         │                      │
         ▼                      ▼
┌──────────────────┐  ┌──────────────────┐
│  AWS BEDROCK     │  │ CLOUDFLARE R2    │
│  • Claude Sonnet │  │ • Document store │
│  • Claude Opus   │  │ • PDF exports    │
│  • Mistral Large │  └──────────────────┘
└──────────────────┘
```

## Service Boundaries

### Frontend (Next.js 16 + React 19)
Owns:
- User interaction and routing (App Router)
- Browser-side PDF rendering (PDF.js / pdfjs-dist)
- Client state management (Zustand)
- Convex real-time subscriptions (useQuery, useMutation)
- User-facing documentation (Fumadocs)

Does NOT:
- Run matching logic (delegates to Convex)
- Store data (Convex owns all persistence)

### Convex (Serverless Backend)
Owns:
- **All persistent data** -- 37 tables (see `convex/schema.ts`)
- **Matching engine** -- 5-layer matching in TypeScript (`convex/matching/`)
- **Agent intelligence engine** -- 3-layer analysis pipeline: Rules, Cross-Reference, LLM (`convex/agentEngine.ts`, `convex/agentSession.ts`)
- **Extraction orchestration** -- coordinates OCR via Python ML or native Bedrock Vision
- **Export system** -- CSV/XLSX/PDF exports with accounting integrations (`convex/exports/`)
- **Cron jobs** -- error cleanup, enrichment jobs, stale PDF cleanup, chat expiry
- **Auth verification** -- WorkOS AuthKit JWT validation + database user lookup
- **Real-time subscriptions** -- auto-push to connected clients
- **Audit logging** -- structured audit trail for compliance

Does NOT:
- Serve static assets (Next.js handles)
- Run long-running ML inference directly (delegates to Python ML or Bedrock via actions)

### Next.js API Routes
Owns:
- **AI chat streaming** -- Vercel AI SDK + AWS Bedrock for reconciliation assistant
- **Matching stream** -- SSE endpoint for real-time matching progress
- **Auth callbacks** -- WorkOS login/callback/logout flows
- **CSV import** -- parse and import CSV data
- **Search** -- search endpoint for docs/data

Does NOT:
- Store data (delegates to Convex)
- Run matching logic (delegates to Convex)

### Python ML Service (FastAPI on Fly.io)
Owns:
- **OCR extraction** -- Mistral OCR for bank statements and invoices
- **PDF report generation** -- ReportLab branded PDF reports
- **Bank-specific parsing** -- Malaysian bank statement regex parsers
- **Cloudflare R2 storage** -- upload/download documents

Does NOT:
- Run matching (matching is in Convex)
- Manage user sessions (Convex + WorkOS handle auth)
- Run LLM inference for matching (Bedrock calls happen in Convex actions)

## Data Flow: Document Upload

```
1. User drops PDF → Frontend (Upload View)
2. Frontend → Convex storage (upload file to _storage)
3. Convex mutation creates document record (status: "pending")
4. Extraction triggered:
   a. Native path: Convex action → AWS Bedrock Vision (for supported PDFs)
   b. Gemini path: Convex action → Vertex AI Gemini (alternative)
   c. ML path: Convex HTTP action → Python ML → Mistral OCR
5. Extracted data → Convex mutation (store transactions/accrual docs)
6. Upload analysis: AI classifies document type and basis (cash/accrual)
7. Convex → Frontend (real-time subscription updates)
```

## Data Flow: Reconciliation

```
1. User clicks "Run Matching" → Frontend
2. Frontend → Convex action (runMatchingEngine)
3. Convex action: Run Layers 1-4 (pure TypeScript, in-memory)
   - Layer 1: Exact match (±0.01 amount, ±3 days)
   - Layer 2: Window match (±0.01 amount, ±7 days)
   - Layer 3: Reference match (invoice number in description)
   - Layer 4: Fuzzy match (Levenshtein + amount variance)
4. Convex action: Run Layer 5 (optional, LLM)
   - Convex action → AWS Bedrock (Claude for semantic matching)
   - Fallback: smart heuristic matching if Bedrock unavailable
5. Convex action: Run Layer 7 (partial matching)
   - One cash transaction → multiple accrual documents
6. Convex mutations: Create matchedPairs + suspenseItems
7. Convex → Frontend (real-time session progress updates via SSE)
```

## Data Flow: AI Chat (Reconciliation Assistant)

```
1. User sends message → Frontend (AI chat panel)
2. Frontend → POST /api/chat/assistant (Next.js API route)
3. API route → Vercel AI SDK → AWS Bedrock (streaming)
4. Bedrock can call tools:
   - Read session data (via Convex queries)
   - Approve/reject matches
   - Explain matching reasoning
5. Streamed response → Frontend (rendered incrementally)
6. Chat messages persisted to Convex (24h retention)
```

## Data Flow: Agent Intelligence (Upload Analysis)

```
1. User uploads documents → Frontend (Upload View)
2. Extraction completes → Convex triggers upload analysis
3. Upload analysis → creates Agent Session (agentSessions table)
4. Agent Engine runs 3-layer pipeline (agentEngine.ts):
   Layer 1: Rules Engine (zero-token, pure TypeScript)
     - Date gap detection, duplicate check, amount validation
     - Extraction quality, period coverage, document classification
     - Multi-company detection
   Layer 2: Cross-Reference Analysis (zero-token)
     - Accrual company reference matching
     - Matchability preview, orphaned docs, basis consistency
   Layer 3: LLM Reasoning (Bedrock Claude Haiku)
     - Entity resolution (company name disambiguation)
     - Natural language summary generation
5. Findings stored → agentFindings table (severity: critical/warning/info)
6. Agent UI shows findings → User reviews, acknowledges, resolves
7. User proceeds → Agent session links to reconciliation session
8. Findings carry to /reconcile:
   - AgentFindingsBanner shows unresolved findings
   - Suspense tab context strip explains unmatched items
   - AI chat system prompt includes agent summary
   - getAgentFindings tool provides on-demand detail
```
