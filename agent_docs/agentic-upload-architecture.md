# Agentic Upload Architecture

**Status:** Phase 5 Complete — Polish & Optimization (Reviewed & Hardened)
**Last Updated:** 2026-02-10
**Author:** Architecture Review

---

## Table of Contents

1. [Vision & Principles](#1-vision--principles)
2. [Architecture Overview](#2-architecture-overview)
3. [Data Model](#3-data-model)
4. [Intelligence Engine (Convex Backend)](#4-intelligence-engine-convex-backend)
5. [Agent UI/UX Design](#5-agent-uiux-design)
6. [Cross-Page Agent Context](#6-cross-page-agent-context)
7. [Token Budget Strategy](#7-token-budget-strategy)
8. [Implementation Phases](#8-implementation-phases)
9. [File Inventory](#9-file-inventory)
10. [Edge Cases & Error Handling](#10-edge-cases--error-handling)

---

## 1. Vision & Principles

### What We're Building

An intelligent agent layer that enhances the existing `/upload` flow — not replacing it, but making it 10x smarter. The agent observes what the user uploads, understands the documents deeply, surfaces findings in plain language, and guides users through any issues before they hit reconciliation.

The agent's intelligence carries across to the reconciliation page as persistent context, so the entire workflow feels cohesive.

### Core Principles

| Principle | Meaning |
|-----------|---------|
| **Calm & Minimalist** | Agent surfaces information without overwhelming. Collapsible cards, plain language, progressive disclosure. |
| **Guided Autonomy** | Agent does the work, shows what it found, lets user approve or override. Never auto-applies silently. |
| **Enhancement, Not Replacement** | The existing 3-tab flow (Upload / Documents / Analysis) stays. The agent injects intelligence into each tab contextually. |
| **Plain Language** | Write like explaining to a 16-year-old. No jargon. Every finding has a "why it matters" explanation. |
| **Token-Efficient** | Rules-based checks first (date gaps, duplicates, amounts). LLM only for complex reasoning (entity resolution, natural language summaries). |
| **Shared Primitives** | Same message format, LLM call pattern, and UI components as the reconciliation chat. Can unify later. |

### Agent Persona: "Calm Explainer"

- Uses "I" and "we" naturally
- Explains things simply: "Your bank statements look good — I found transactions from January to March 2024."
- Surfaces issues without alarm: "One thing to note though — I couldn't find any February transactions."
- Never uses jargon without explaining it

---

## 2. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                    UPLOAD PAGE (/upload)                          │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  AGENT LAYER (React Components)                          │    │
│  │                                                          │    │
│  │  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │    │
│  │  │ Upload  │→ │ Analyze  │→ │ Validate │→ │ Proceed  │  │    │
│  │  │  Step   │  │  Step    │  │  Step    │  │  Step    │  │    │
│  │  └─────────┘  └──────────┘  └──────────┘  └──────────┘  │    │
│  │       ↕             ↕             ↕             ↕        │    │
│  │  [Inline Findings Cards - collapsible, Claude-style]     │    │
│  │  [User Response: Buttons + Optional Text]                │    │
│  └──────────────────────────────────────────────────────────┘    │
│                          ↕                                       │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  EXISTING UI (Enhanced)                                   │    │
│  │  Upload Tab | Documents Tab | Analysis Tab                │    │
│  └──────────────────────────────────────────────────────────┘    │
└──────────────────────────────┬───────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│               CONVEX BACKEND                                      │
│                                                                  │
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────────┐  │
│  │ agentSessions   │  │ agentFindings    │  │ agentMessages  │  │
│  │ (orchestrator)  │←→│ (persisted       │  │ (conversation  │  │
│  │                 │  │  intelligence)   │  │  log - hybrid) │  │
│  └────────┬────────┘  └──────────────────┘  └────────────────┘  │
│           │                                                      │
│  ┌────────▼────────────────────────────────────────────────┐    │
│  │  INTELLIGENCE ENGINE                                     │    │
│  │                                                          │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │    │
│  │  │ Rules Layer │  │ Analysis    │  │ LLM Layer       │  │    │
│  │  │ (no tokens) │  │ Layer       │  │ (Bedrock Claude)│  │    │
│  │  │             │  │ (rule-based)│  │                 │  │    │
│  │  │ • Date gaps │  │ • Company   │  │ • Entity resol. │  │    │
│  │  │ • Dupes     │  │   cross-ref │  │ • NL summaries  │  │    │
│  │  │ • Amounts   │  │ • Period    │  │ • Complex edge  │  │    │
│  │  │ • Types     │  │   coverage  │  │   cases         │  │    │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘  │    │
│  └──────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│           RECONCILIATION PAGE (/reconcile)                        │
│  Agent context carried via agentSessions + agentFindings tables  │
│  Findings appear as banners/cards on reconcile page              │
└──────────────────────────────────────────────────────────────────┘
```

### How the Agent Enhances (Not Replaces) the Existing Flow

The agent layer sits **above** the existing tab system:

1. **Upload Tab** — Agent adds an acknowledgment step before processing. When the user drops files, the agent says "I see 5 bank statements and 3 invoices for ABC Sdn Bhd. Ready to process?" If it detects multiple companies, it creates parallel lanes.

2. **Documents Tab** — No change. Document management stays as-is.

3. **Analysis Tab** — Agent's findings **replace** the current static analysis panel with richer, collapsible, interactive findings. The agent's analysis is the evolution of `uploadAnalysis.ts`.

---

## 3. Data Model

### New Tables

#### `agentSessions` — The Orchestrator

```typescript
agentSessions: defineTable({
  companyId: v.id("companies"),
  userId: v.id("users"),
  
  // Lifecycle
  status: v.union(
    v.literal("active"),        // In progress on /upload
    v.literal("ready"),         // Analysis complete, awaiting user action
    v.literal("proceeded"),     // User clicked proceed, session created
    v.literal("dismissed"),     // User dismissed
    v.literal("expired")       // Timed out (24h)
  ),
  
  // Step tracking
  currentStep: v.union(
    v.literal("upload"),       // Files being uploaded/processed
    v.literal("analyze"),      // Post-extraction analysis running
    v.literal("validate"),     // User reviewing findings
    v.literal("proceed")       // Ready to proceed to reconciliation
  ),
  
  // Document tracking
  documentIds: v.array(v.id("documents")),
  
  // Company lanes (for multi-company uploads)
  companyLanes: v.optional(v.array(v.object({
    detectedCompanyName: v.string(),
    companyId: v.optional(v.id("companies")),  // null if unmatched
    documentIds: v.array(v.id("documents")),
    isSelected: v.boolean(),                    // User chose to process this lane
  }))),
  
  // Links to other entities
  uploadAnalysisId: v.optional(v.id("uploadAnalyses")),
  reconciliationSessionId: v.optional(v.id("reconciliationSessions")),
  
  // Agent summary (LLM-generated, one call at end of analysis)
  summary: v.optional(v.string()),
  
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_company", ["companyId"])
  .index("by_user_status", ["userId", "status"])
  .index("by_company_active", ["companyId", "status"]),
```

#### `agentFindings` — Persisted Intelligence

```typescript
agentFindings: defineTable({
  agentSessionId: v.id("agentSessions"),
  companyId: v.id("companies"),
  
  // Finding metadata
  type: v.union(
    // Company verification
    v.literal("company_verified"),
    v.literal("company_mismatch"),
    v.literal("multi_company_detected"),
    
    // Period analysis
    v.literal("period_detected"),
    v.literal("period_gap"),
    
    // Data quality
    v.literal("duplicate_transactions"),
    v.literal("extraction_errors"),
    v.literal("low_confidence_extractions"),
    v.literal("unusual_amounts"),
    
    // Accrual cross-checks
    v.literal("accrual_company_mismatch"),  // Invoice doesn't reference the company
    v.literal("unlinked_accrual_docs"),      // Invoices with no matching bank txn context
    
    // Summary findings
    v.literal("cash_basis_summary"),
    v.literal("accrual_basis_summary"),
    v.literal("matching_preview")
  ),
  
  severity: v.union(
    v.literal("critical"),   // Blocks proceeding (wrong company, no data)
    v.literal("warning"),    // Should address (missing months, low confidence)
    v.literal("info")        // FYI (stats, previews, suggestions)
  ),
  
  // Human-readable content
  title: v.string(),           // e.g., "Missing February Transactions"
  description: v.string(),     // Plain language explanation
  details: v.optional(v.string()), // JSON string - structured data for the UI card
  
  // Resolution tracking
  status: v.union(
    v.literal("open"),        // Needs attention
    v.literal("acknowledged"),// User saw it, moved on
    v.literal("resolved"),    // User took action
    v.literal("dismissed")    // User dismissed
  ),
  userResponse: v.optional(v.string()),  // User's text response if any
  
  // Links for context
  relatedDocumentIds: v.optional(v.array(v.id("documents"))),
  relatedTransactionIds: v.optional(v.array(v.id("transactions"))),
  
  createdAt: v.number(),
  resolvedAt: v.optional(v.number()),
})
  .index("by_session", ["agentSessionId"])
  .index("by_session_type", ["agentSessionId", "type"])
  .index("by_session_severity", ["agentSessionId", "severity"])
  .index("by_company", ["companyId"]),
```

### Existing Tables — Enrichments

#### `documents` table — Additional extraction metadata

```typescript
// ADD to existing documents schema:
extractedCompanyName: v.optional(v.string()),     // Company name found in document
extractedCounterparties: v.optional(v.array(v.string())), // All counterparties mentioned
extractedCurrency: v.optional(v.string()),         // Detected currency
```

These fields are populated during extraction (enriching the existing extraction prompts) and consumed by the rules engine for analysis.

### What We DON'T Persist

- Agent conversation messages (ephemeral, React state only)
- Step navigation state (React state)
- Loading/progress animations (React state)

What we DO persist:
- Agent findings (survive page refresh, carry to /reconcile)
- Agent session state (resume if user leaves and comes back)
- User responses to findings (audit trail)

---

## 4. Intelligence Engine (Convex Backend)

### Module: `convex/agentEngine.ts`

The intelligence engine runs as Convex actions/mutations and produces `agentFindings`. It's organized into three layers, executed in order.

### Layer 1: Rules Engine (Zero Tokens)

Pure TypeScript logic. Runs on extracted data from `documents`, `transactions`, and `accrualDocuments`.

```
Rules Engine Functions:
├── detectDateGaps()          — Find missing months in transaction date ranges
├── detectDuplicates()        — Same amount + date + description within ±1 day
├── validateAmounts()         — Flag unusual amounts (outliers, negative where unexpected)
├── checkExtractionQuality()  — Flag docs with <70% confidence or errors
├── computePeriodCoverage()   — Determine what months/periods are covered
├── classifyDocumentTypes()   — Verify extraction-assigned types make sense
└── detectMultiCompany()      — Group documents by detected company name
```

**Input:** All documents + transactions + accrual docs for the batch
**Output:** Array of `AgentFinding` objects (type, severity, title, description, details)

### Layer 2: Cross-Reference Analysis (Zero Tokens)

Analyzes relationships between cash and accrual sides. Rule-based string matching and comparison.

```
Cross-Reference Functions:
├── checkAccrualCompanyReference()  — Do invoices/receipts reference the uploaded company
│                                      (as issuer OR recipient)? Flag those that don't.
├── previewMatchability()           — Compare amounts and dates between cash/accrual
│                                      to estimate match rate before reconciliation.
├── detectOrphanedDocuments()       — Documents with 0 extracted transactions/items
└── validateBasisConsistency()      — Bank statement classified as accrual? Flag it.
```

**Key Logic for `checkAccrualCompanyReference()`:**

```
For each accrual document (invoice/receipt):
  1. Get the company name from the selected company
  2. Get the extractedCompanyName from the source document
  3. Get the counterparty from the accrual document
  4. Check: does the company name appear as EITHER:
     - The issuer (extractedCompanyName matches company) → this is our invoice TO someone
     - The counterparty → this is an invoice FROM someone TO us
  5. If neither → flag as "accrual_company_mismatch" finding
     - Severity: warning if some match, critical if none match
     - Include document details for user review
```

### Layer 3: LLM Reasoning (Token-Consuming — Use Sparingly)

Only called when rules can't resolve an issue, or for the final summary.

```
LLM Functions:
├── resolveEntityNames()     — "ABC Sdn Bhd" vs "ABC SDN. BHD." vs "A.B.C. Sdn Bhd"
│                               Fuzzy company name matching that rules can't handle.
│                               Called ONCE per batch with all unique entity names.
│
└── generateAgentSummary()   — One LLM call at the end to produce the natural language
                                summary shown to the user. Input: all findings + stats.
                                Output: 2-3 paragraph plain language summary.
```

**Token Budget:**
- `resolveEntityNames()`: ~500 input tokens (list of names), ~200 output tokens. Called once per batch.
- `generateAgentSummary()`: ~1000 input tokens (findings + stats), ~500 output tokens. Called once per batch.
- **Total per upload batch: ~2,200 tokens** (vs. current uploadAnalysis which does ~5,000-10,000 tokens per batch with per-document classification)

### Execution Flow

```
1. User uploads files → extraction runs (existing flow, unchanged)
2. All extractions complete → agent engine triggers automatically
3. Layer 1: Rules Engine runs (instant, ~50ms)
   → Produces 5-15 findings
4. Layer 2: Cross-Reference runs (instant, ~100ms)
   → Produces 2-5 findings
5. Layer 3: LLM calls (only if needed)
   → resolveEntityNames() if ambiguous company names detected
   → generateAgentSummary() always (one call)
6. All findings written to agentFindings table
7. Agent session updated to "ready"
8. Frontend receives real-time update, displays findings
```

### Module: `convex/agentSession.ts`

Session lifecycle management.

```
Agent Session Functions:
├── create()                — Create new agent session when upload starts
├── get()                   — Query for real-time subscription
├── addDocuments()          — Add document IDs as they're created
├── triggerAnalysis()       — Kick off the intelligence engine
├── updateStep()            — Move to next step
├── recordUserResponse()    — Store user's response to a finding
├── proceed()               — Create reconciliation session, carry context
└── getForReconciliation()  — Query agent context from /reconcile page
```

---

## 5. Agent UI/UX Design

### Overall Layout

The agent layer appears as a **vertical flow above the existing tabs**. It uses the Claude-style collapsible reasoning pattern:

```
┌──────────────────────────────────────────────────────────┐
│  Upload Documents                     [Company: ABC]     │
│                                                          │
│  ┌ Agent Flow ─────────────────────────────────────────┐ │
│  │                                                      │ │
│  │  ✓ Upload Complete                          ▸       │ │ ← Collapsed (completed step)
│  │    5 bank statements, 3 invoices                    │ │
│  │                                                      │ │
│  │  ◉ Analysis                                  ▾      │ │ ← Expanded (active step)
│  │  ┌────────────────────────────────────────────────┐ │ │
│  │  │  Your bank statements look good — I found      │ │ │
│  │  │  234 transactions from January to March 2024.  │ │ │
│  │  │                                                │ │ │
│  │  │  ┌ 2 issues, 1 suggestion ──────────────── ▾ ┐ │ │ │ ← Collapsible summary
│  │  │  │                                           │ │ │ │
│  │  │  │  ⚠ Missing February Transactions     ▾   │ │ │ │ ← Expandable finding
│  │  │  │  │ I have Jan and Mar bank statements    │ │ │ │
│  │  │  │  │ but nothing for February. This could  │ │ │ │
│  │  │  │  │ mean some transactions won't match.   │ │ │ │
│  │  │  │  │                                       │ │ │ │
│  │  │  │  │ [Upload Feb Statement] [Skip]         │ │ │ │
│  │  │  │  └───────────────────────────────────────│ │ │ │
│  │  │  │                                           │ │ │ │
│  │  │  │  ⚠ 2 Invoices Don't Reference ABC   ▾   │ │ │ │
│  │  │  │  │ INV-2024-045 and REC-331 don't        │ │ │ │
│  │  │  │  │ mention ABC Sdn Bhd as issuer or      │ │ │ │
│  │  │  │  │ recipient. They might belong to a     │ │ │ │
│  │  │  │  │ different company.                    │ │ │ │
│  │  │  │  │                                       │ │ │ │
│  │  │  │  │ [Keep Anyway] [Remove] [Reassign]     │ │ │ │
│  │  │  │  └───────────────────────────────────────│ │ │ │
│  │  │  │                                           │ │ │ │
│  │  │  │  ℹ Expected Match Rate: ~80%          ▸  │ │ │ │ ← Collapsed info
│  │  │  └───────────────────────────────────────────┘ │ │ │
│  │  │                                                │ │ │
│  │  │  [Looks Good, Proceed →]  [+ Add More Files]   │ │ │
│  │  └────────────────────────────────────────────────┘ │ │
│  │                                                      │ │
│  │  ○ Proceed to Reconciliation                        │ │ ← Future step (greyed)
│  │                                                      │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌ Upload New ┐  ┌ Documents ┐  ┌ Analysis ┐            │
│  │            │  │           │  │ (Legacy)  │            │
│  └────────────┘  └───────────┘  └───────────┘            │
└──────────────────────────────────────────────────────────┘
```

### Step Definitions (4-Step Balanced)

| Step | Name | What Happens | User Interaction |
|------|------|-------------|-----------------|
| 1 | **Upload** | User drops files. Agent acknowledges what it sees (file types, potential companies). If multiple companies detected, shows parallel lanes. | Confirm to process, or adjust |
| 2 | **Analyze** | Extraction runs (existing flow). Agent shows live progress. Once done, intelligence engine runs. | Watch progress, optionally add more files |
| 3 | **Validate** | Agent presents findings as collapsible summary card. Issues grouped by severity. | Review, respond to findings, resolve issues |
| 4 | **Proceed** | Agent shows final summary. User clicks to create reconciliation session. | Confirm and proceed |

### Collapsible Accordion Pattern

Completed steps collapse to a single summary line (like Claude's thinking blocks):

```
✓ Upload Complete — 8 files (5 bank statements, 3 invoices)    ▸
```

Clicking `▸` expands to show the full step content. Active step is always expanded. Future steps show as greyed-out pills.

### Finding Cards

Each finding is a collapsible card within the summary:

```
Structure:
┌─────────────────────────────────────────────┐
│ [severity-icon] [title]                  [▾] │  ← Header (always visible)
│                                              │
│ [description in plain language]              │  ← Body (collapsible)
│                                              │
│ [Structured details if applicable]           │
│   Document: INV-2024-045.pdf                 │
│   Counterparty: XYZ Trading                  │
│   Amount: RM 4,500.00                        │
│                                              │
│ [Action Button 1] [Action Button 2]         │  ← Response buttons
│ [Optional text input: "Type a correction..."]│
└─────────────────────────────────────────────┘
```

Severity styling:
- **Critical (red):** Red left border, red icon. Cannot proceed until resolved.
- **Warning (amber):** Amber left border, amber icon. Can proceed but recommended to address.
- **Info (blue):** Blue left border, blue icon. Informational, no action needed.

### Multi-Company Parallel Lanes

When the agent detects documents for multiple companies:

```
┌──────────────────────────────────────────────────────┐
│  I found documents that seem to belong to             │
│  different companies. Which would you like to         │
│  process?                                             │
│                                                       │
│  ┌─ Lane 1 ──────────────────────────────────────┐   │
│  │  ABC Sdn Bhd (selected company)               │   │
│  │  5 bank statements, 2 invoices                 │   │
│  │  Jan-Mar 2024                                  │   │
│  │  [Process This]                                │   │
│  └────────────────────────────────────────────────┘   │
│                                                       │
│  ┌─ Lane 2 ──────────────────────────────────────┐   │
│  │  DEF Holdings Sdn Bhd                          │   │
│  │  1 bank statement                              │   │
│  │  [Process Later] [Remove]                      │   │
│  └────────────────────────────────────────────────┘   │
│                                                       │
│  [Process All Companies] [Process Selected Only]      │
└──────────────────────────────────────────────────────┘
```

### Agent Acknowledgment (Upload Step)

When files are dropped, before processing:

```
┌──────────────────────────────────────────────────────┐
│  I see 8 files you'd like to process:                 │
│                                                       │
│  Cash Basis (Bank Statements)                         │
│  ├── ABC_Bank_Jan2024.pdf (4.2 MB)                   │
│  ├── ABC_Bank_Feb2024.pdf (3.8 MB)                   │
│  └── ABC_Bank_Mar2024.pdf (5.1 MB)                   │
│                                                       │
│  Accrual Basis (Invoices & Receipts)                  │
│  ├── INV-2024-001.pdf (245 KB)                       │
│  ├── INV-2024-002.pdf (198 KB)                       │
│  └── RECEIPT-331.pdf (156 KB)                        │
│                                                       │
│  Other (I'll classify these during extraction)        │
│  ├── Statement_Q1.pdf (2.1 MB)                       │
│  └── Report.pdf (890 KB)                             │
│                                                       │
│  These will be processed for ABC Sdn Bhd.            │
│                                                       │
│  [Process All →] [Remove Some] [Add More Files]      │
└──────────────────────────────────────────────────────┘
```

The pre-classification here is done by filename heuristics (no LLM needed):
- Files containing "bank", "statement", "cash" → Cash Basis
- Files containing "inv", "invoice", "receipt", "rcpt" → Accrual Basis
- Everything else → Other

---

## 6. Cross-Page Agent Context

### How Findings Carry to /reconcile

When the user proceeds to reconciliation, the `agentSession` is linked to the `reconciliationSession`. On the reconcile page:

1. **Banner Findings:** Critical/warning findings that weren't resolved appear as a collapsible banner at the top of the reconciliation page.

2. **Context Sidebar:** The agent's summary is available in the reconciliation chat sidebar as context. When the user asks the chat "Why are there unmatched invoices?", the chat can reference the agent's findings.

3. **Finding References:** Each `agentFinding` links to specific document/transaction IDs. When viewing a suspense item on the reconcile page, the system can show "The agent noted this invoice doesn't reference your company" if there's a matching finding.

### Data Flow

```
/upload                          /reconcile
agentSession ──────────────────→ query via reconciliationSessionId
  └── agentFindings[] ─────────→ display as banners + chat context
        └── relatedDocumentIds → highlight related items
        └── relatedTxnIds ────→ explain suspense items
```

---

## 7. Token Budget Strategy

### Tiered Approach: Rules First, LLM as Fallback

| Check | Method | Tokens | When |
|-------|--------|--------|------|
| Date gap detection | TypeScript rules | 0 | Always |
| Duplicate detection | TypeScript rules | 0 | Always |
| Amount validation | TypeScript rules | 0 | Always |
| Extraction quality | TypeScript rules | 0 | Always |
| Period coverage | TypeScript rules | 0 | Always |
| Document type validation | TypeScript rules | 0 | Always |
| Multi-company detection | TypeScript string matching | 0 | Always |
| Accrual company reference | TypeScript string matching | 0 | Always |
| Match rate preview | TypeScript comparison | 0 | Always |
| Entity name resolution | Bedrock Claude (Haiku) | ~700 | Only if ambiguous names found |
| Agent summary | Bedrock Claude (Haiku) | ~1,500 | Once per batch, at end |

**Total per batch: ~2,200 tokens** worst case (with entity resolution)
**Best case: ~1,500 tokens** (only summary, no ambiguous names)

Compare to current `uploadAnalysis.runAnalysis()`: ~5,000-10,000 tokens per batch.

### Model Selection

- **Entity resolution + Summary:** `anthropic.claude-3-5-haiku-20241022-v1:0` (fast, cheap, good enough for structured reasoning)
- **Only escalate to Sonnet** if Haiku's response quality is insufficient (measure during testing)

---

## 8. Implementation Phases

### Phase 1: Intelligence Engine (Backend)
**Goal:** Build the Convex backend that produces agent findings from extracted data.
**No UI changes yet.** Test via Convex dashboard.

| # | Task | Status | Files |
|---|------|--------|-------|
| 1.1 | Add `agentSessions` and `agentFindings` tables to schema | `done` | `convex/schema.ts` |
| 1.2 | Add extraction enrichment fields to `documents` table | `done` | `convex/schema.ts` |
| 1.3 | Create `convex/agentSession.ts` — CRUD + lifecycle | `done` | `convex/agentSession.ts` |
| 1.4 | Create Rules Layer 1 (pure TypeScript, zero tokens) | `done` | `convex/lib/agentRules.ts` |
| 1.5 | Create Cross-Reference Layer 2 (pure TypeScript, zero tokens) | `done` | `convex/lib/agentCrossRef.ts` |
| 1.6 | Create LLM Layer 3 (entity resolution + summary) | `done` | `convex/lib/agentLlm.ts` |
| 1.7 | Enrich extraction prompts to extract company names + counterparties | `done` | `convex/lib/extractionUtils.ts`, `convex/geminiExtraction.ts`, `convex/nativePdfExtraction.ts` |
| 1.8 | Wire agent engine to trigger after upload analysis completes | `done` | `convex/uploadAnalysis.ts`, `convex/agentSession.ts`, `convex/agentEngine.ts` |
| 1.9 | Write unit tests for rules engine and cross-ref layer | `done` | `convex/lib/__tests__/agentRules.test.ts`, `convex/lib/__tests__/agentCrossRef.test.ts` |

### Phase 2: Agent UI Components
**Goal:** Build the React components for the agent flow. Wire to backend.

| # | Task | Status | Files |
|---|------|--------|-------|
| 2.1 | Create `AgentStep` component (collapsible accordion step) | `done` | `components/views/upload-view/agent/agent-step.tsx` |
| 2.2 | Create `AgentFindingCard` component (severity-styled, expandable) | `done` | `components/views/upload-view/agent/finding-card.tsx` |
| 2.3 | Create `AgentFindingsSummary` component (collapsible group) | `done` | `components/views/upload-view/agent/findings-summary.tsx` |
| 2.4 | Create `AgentUploadAck` component (file acknowledgment pre-process) | `done` | `components/views/upload-view/agent/agent-upload-ack.tsx` |
| 2.5 | Create `AgentProgressView` component (live extraction progress) | `done` | `components/views/upload-view/agent/agent-progress-view.tsx` |
| 2.6 | Create `AgentCompanyLanes` component (multi-company routing) | `deferred to Phase 3` | — |
| 2.7 | Create `useAgentSession` hook (React state + Convex subscriptions) | `done` | `hooks/useAgentSession.ts` |
| 2.8 | Integrate agent flow into `upload-view.tsx` (above existing tabs) | `done` | `components/views/upload-view.tsx` |
| 2.9 | Add Claude-style collapse/expand animations | `done` | `app/globals.css`, agent components |

### Phase 3: Edge Cases & Multi-Company
**Goal:** Handle complex scenarios gracefully.

| # | Task | Status | Files |
|---|------|--------|-------|
| 3.1 | Multi-company detection and lane creation | `done` | `convex/agentEngine.ts` |
| 3.2 | Multi-company UI with lane selection | `done` | `components/views/upload-view/agent/agent-company-lanes.tsx` |
| 3.3 | Accrual company reference cross-checking | `done` | `components/views/upload-view/agent/finding-card.tsx` |
| 3.4 | Handle user adding more files mid-analysis | `done` | `hooks/useAgentSession.ts`, `components/views/upload-view.tsx`, `convex/agentSession.ts`, `convex/agentEngine.ts` |
| 3.5 | Handle extraction failures gracefully in agent flow | `done` | `components/views/upload-view/agent/finding-card.tsx`, `convex/agentSession.ts` |
| 3.6 | Session resumption (user leaves and comes back) | `done` | `hooks/useAgentSession.ts`, `components/views/upload-view/agent/agent-flow.tsx` |

### Phase 4: Cross-Page Context
**Goal:** Agent intelligence carries to reconciliation page.

| # | Task | Status | Files |
|---|------|--------|-------|
| 4.1 | Create `useAgentFindingsForReconciliation` hook — real-time subscription to agent session + unresolved findings via reconciliationSessionId | `done` | `hooks/useAgentFindingsForReconciliation.ts` |
| 4.2 | Create `AgentFindingsBanner` — read-only collapsible banner on /reconcile with severity-grouped findings | `done` | `components/views/reconcile-view/agent-findings-banner.tsx` |
| 4.3 | Wire banner + hook into `reconcile-view.tsx` — between filter bar and tabs, with dismissal state | `done` | `components/views/reconcile-view.tsx` |
| 4.4 | Add suspense tab context strip — shows agent finding types relevant to unmatched items | `done` | `components/views/reconcile-view.tsx` (SuspenseAgentContext component) |
| 4.5 | Thread `agentSummary` to ReconcileAgent — prop flows through ReconcileAgent → useReconcileAgent → transport body | `done` | `components/ai/reconcile-agent/reconcile-agent.tsx`, `components/ai/reconcile-agent/hooks/use-reconcile-agent.ts` |
| 4.6 | Inject agent context into AI assistant system prompt — pre-match analysis summary + `getAgentFindings` tool | `done` | `app/api/chat/assistant/route.ts` |
| 4.7 | Update reconcile-view barrel export | `done` | `components/views/reconcile-view/index.ts` |

### Phase 5: Polish & Optimization
**Goal:** Performance, animations, and edge case hardening.

| # | Task | Status | Files |
|---|------|--------|-------|
| 5.1 | Add smooth collapse/expand animations (CSS) — unified timing, staggered entrance, exit animations, opacity transitions. Named duration constant (`AGENT_EXIT_DURATION_MS`) links CSS and JS timing. | `done` | `app/globals.css`, `components/views/upload-view/agent/finding-card.tsx`, `components/views/upload-view/agent/findings-summary.tsx`, `components/views/upload-view/agent/agent-step.tsx`, `components/views/upload-view/agent/agent-flow.tsx` |
| 5.2 | Optimize rule engine for 50+ document batches — parallel DB reads, O(m+n) charOverlap, date-sorted duplicate detection with early exit, single-pass stats | `done` | `convex/agentEngine.ts`, `convex/lib/agentRules.ts`, `convex/lib/agentUtils.ts` |
| 5.3 | Add agent session expiry cron (24h) — global sweep across active/analyzing/ready statuses, by_status index. Documented index limitation and scaling notes. | `done` | `convex/crons.ts`, `convex/agentSession.ts`, `convex/schema.ts` |
| 5.4 | E2E tests for agent flow — Playwright tests with proper `test.skip()` gating (visible in reports, never silently passes). Shared helpers `requireAgentFlow()`, `requireFindings()`, `requireFindingBySeverity()` for explicit precondition checks. Covers structure, interactions, findings, dismiss, proceed, accessibility (keyboard Enter+Space), animations, cross-page context. | `done` | `e2e/tests/agent-upload.spec.ts` |
| 5.5 | Measure and optimize LLM token usage — Bedrock caller with token tracking, persisted on session, console logging. Documented SDK naming mapping (inputTokens/outputTokens -> promptTokens/completionTokens). | `done` | `convex/agentEngine.ts`, `convex/agentSession.ts`, `convex/schema.ts` |

---

## 9. File Inventory

### New Files

| File | Purpose |
|------|---------|
| `convex/agentSession.ts` | Agent session CRUD, lifecycle, queries, mutations, actions |
| `convex/agentEngine.ts` | Intelligence engine (3 layers), finding generation, reconciliation queries |
| `convex/lib/agentRules.ts` | Pure rule functions (date gaps, dupes, amounts, etc.) |
| `convex/lib/agentCrossRef.ts` | Cross-reference analysis (accrual checks, match preview) |
| `convex/lib/agentLlm.ts` | LLM functions (entity resolution, summary generation) |
| `convex/lib/agentUtils.ts` | Shared agent utilities (bigram similarity, helpers) |
| `convex/lib/__tests__/agentRules.test.ts` | 81 tests for Layer 1 rules |
| `convex/lib/__tests__/agentCrossRef.test.ts` | 34 tests for Layer 2 cross-reference |
| `convex/lib/__tests__/agentLlm.test.ts` | 40 tests for Layer 3 LLM |
| `convex/lib/__tests__/agentUtils.test.ts` | 36 tests for agent utilities |
| `components/views/upload-view/agent/agent-step.tsx` | Collapsible step accordion component |
| `components/views/upload-view/agent/finding-card.tsx` | Individual finding card (severity-styled) |
| `components/views/upload-view/agent/findings-summary.tsx` | Grouped findings with collapsible summary |
| `components/views/upload-view/agent/agent-upload-ack.tsx` | File acknowledgment before processing |
| `components/views/upload-view/agent/agent-progress-view.tsx` | Live extraction progress within agent flow |
| `components/views/upload-view/agent/agent-flow.tsx` | Main 4-step agent flow orchestrator |
| `components/views/upload-view/agent/agent-company-lanes.tsx` | Multi-company lane selection |
| `components/views/upload-view/agent/index.ts` | Barrel exports |
| `components/views/reconcile-view/agent-findings-banner.tsx` | Read-only findings banner for /reconcile |
| `hooks/useAgentSession.ts` | React hook for agent state + Convex subscriptions |
| `hooks/useAgentFindingsForReconciliation.ts` | Reconcile page agent findings hook |
| `e2e/tests/agent-upload.spec.ts` | Playwright E2E tests with explicit `test.skip()` gating for agent flow |

### Modified Files

| File | Changes |
|------|---------|
| `convex/schema.ts` | Add `agentSessions`, `agentFindings` tables; add enrichment fields to `documents` |
| `components/views/upload-view.tsx` | Integrate agent flow above existing 3-tab system |
| `components/views/reconcile-view.tsx` | Agent findings hook, banner, suspense context strip, agentSummary prop threading |
| `components/views/reconcile-view/index.ts` | Added AgentFindingsBanner export |
| `components/ai/reconcile-agent/reconcile-agent.tsx` | Added `agentSummary?` prop forwarding |
| `components/ai/reconcile-agent/hooks/use-reconcile-agent.ts` | Added `agentSummary` to transport body context |
| `app/api/chat/assistant/route.ts` | Expanded context with agentSummary, system prompt injection, `getAgentFindings` tool |
| `convex/geminiExtraction.ts` | Enrich extraction to capture company names + counterparties |
| `convex/nativePdfExtraction.ts` | Same enrichment as Gemini path |
| `convex/lib/extractionUtils.ts` | Add company name / counterparty to extraction prompts |
| `app/globals.css` | Claude-style collapse/expand animations, `prefers-reduced-motion` support |

---

## 10. Edge Cases & Error Handling

### Upload Edge Cases

| Scenario | Agent Behavior |
|----------|---------------|
| **Single file upload** | Skip multi-company detection. Show simplified acknowledgment. Analysis still runs. |
| **All files same type** | Agent notes: "I only see bank statements. You'll need invoices/receipts for reconciliation." Allows proceeding anyway. |
| **Zero extractable data** | Agent flags as critical: "I couldn't extract any transactions from these files. They might be scanned poorly or in an unsupported format." |
| **Mixed companies (3+)** | Show max 5 lanes. If more, group into "Other (X documents)" lane. |
| **User adds files mid-analysis** | Agent pauses analysis, processes new files, re-runs analysis on the full batch. |
| **Extraction takes >5 min** | Agent shows "This is taking longer than usual" message with option to skip analysis and proceed manually. |

### Accrual Edge Cases

| Scenario | Agent Behavior |
|----------|---------------|
| **Invoice issued BY the company** | Company name appears as issuer. Valid - this is a sales invoice. Mark as "issued by [company]". |
| **Invoice issued TO the company** | Company name appears as recipient/counterparty. Valid - this is a purchase invoice. Mark as "received by [company]". |
| **Invoice references neither** | Warning: "This invoice between XYZ Corp and DEF Ltd doesn't seem related to ABC Sdn Bhd." User can keep, remove, or reassign. |
| **Receipt with no company reference** | Info finding (lower severity than invoice). Receipts often don't have formal company references. |
| **POS report** | POS reports are for the company's own transactions. Match by date/amount, not by company name. |

### Technical Edge Cases

| Scenario | Handling |
|----------|---------|
| **Convex action timeout** | Rules engine runs as mutation (no timeout). LLM calls use action with retry. |
| **LLM rate limit** | Queue LLM calls with exponential backoff. Rules findings appear immediately. |
| **User navigates away during analysis** | Session persists in Convex. On return, `useAgentSession` detects active session and resumes. |
| **Concurrent uploads** | Each upload batch creates its own agent session. Only one active per company. Warn if existing active session found. |
| **Page refresh** | React state lost (step animation, expand/collapse). Convex state restored (session, findings, user responses). Agent picks up where it left off. |

---

## Design Decisions Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Agent UI pattern | Inline conversational flow | Feels more natural than sidebar. Doesn't split attention. |
| Autonomy level | Guided (show + confirm) | Users need to trust the AI. Showing work builds confidence. |
| Post-extraction analysis | Gap analysis + Data quality | These are what accountants actually check before reconciling. |
| Company mismatch | Cross-reference check | Validates accrual docs reference the right company. Practical. |
| Persistence model | Hybrid (findings in Convex, messages in React) | Balances robustness with simplicity. |
| Step pattern | 4-step balanced (Upload/Analyze/Validate/Proceed) | Not too many steps, enough checkpoints for user control. |
| Collapse pattern | Claude-style accordion | Familiar pattern, keeps context visible without clutter. |
| Token strategy | Tiered (rules → LLM fallback) | ~2,200 tokens per batch vs. 10,000 today. 4x cheaper. |
| LLM provider | Bedrock Claude Haiku | Fast, cheap, sufficient for structured reasoning. |
| Implementation order | Engine -> UI -> Edge cases | Ensures intelligence works before we build the conversation. |
| E2E test strategy | `test.skip()` gating, not silent `if` guards | Skipped tests are visible in reports. Silent `if` guards give false confidence. |
| Agent persona | Calm explainer | Plain language, non-alarming, explains why things matter. |
| Multi-company | Parallel lanes | Accommodates real-world scenario of mixed document uploads. |
| Cross-page | Full agent context on /reconcile | Continuous experience from upload to reconciliation. |
| Existing flow | Enhancement (not replacement) | De-risks rollout. Agent adds intelligence to existing UI. |
