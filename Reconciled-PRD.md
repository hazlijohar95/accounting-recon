# Reconciled - Intelligent Accounting Reconciliation SaaS

> **Product Requirements Document (PRD)**
> **Version:** 1.0 | **Date:** January 2026 | **Status:** Planning

---

# PART 1: THE BUILD PROMPT

> *This is a comprehensive prompt that describes exactly what to build, reverse-engineered from the working CLI prototype.*

---

## BUILD PROMPT: Reconciled - Cash-Accrual Reconciliation Platform

### What You're Building

Build a **cloud-based accounting reconciliation platform** that automatically matches bank transactions (cash basis) with invoices and receipts (accrual basis) using a multi-layer AI matching engine. The platform serves both SME business owners and accounting professionals managing multiple clients.

### Core Problem Solved

Every month, businesses must reconcile:
- **Bank statements** (what actually moved through the bank)
- **Invoices & receipts** (what should have been paid/received)

This is tedious, error-prone, and typically done in Excel. Reconciled automates 80-95% of this work using rule-based matching + LLM semantic matching for edge cases.

### User Model

**Single user type** that can manage multiple "companies":
- A **business owner** manages their own company
- An **accountant** manages multiple client companies
- Both use the same interface, same features, same pricing

**Access model:**
- **Open exploration** - Users can explore the full app without signup
- **Paywall on action** - When user clicks "Process" or "Save", payment required
- **Demo mode** - Interactive demo with animations showing how it works
- **Transparent pricing** - Clear pricing displayed before any action

### Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | Next.js 16 + React 19 + TypeScript | Desktop-first responsive web app (Turbopack) |
| Styling | Tailwind CSS v4 | Utility-first CSS framework |
| Backend API | Rust (Axum) | High-performance API, file processing |
| ML/AI Services | Python (FastAPI) | OCR extraction, LLM matching |
| Database | Convex | Real-time sync, serverless |
| LLM | AWS Bedrock | Claude 4.5 Opus/Haiku + Mistral Large |
| Storage | AWS S3/Cloudflare | Document storage |
| Auth | WorkOS | Authentication |

### Core Features to Build

#### 1. Company Onboarding (5-step wizard)

Collect essential business metadata:

```
Step 1: Company Info
├── Company name (legal name)
├── Trading name (if different)
├── Registration number (SSM for Malaysia)
└── Client code (auto-generated, editable)

Step 2: Tax Registration
├── Tax registered? (SST for Malaysia, GST for others)
├── Tax registration number
└── Tax rate configuration

Step 3: Industry Classification
├── Industry selector (F&B, Retail, Services, Manufacturing, etc.)
├── First year of business flag
└── Business start date

Step 4: Bank Accounts
├── Primary bank (dropdown: Maybank, CIMB, etc.)
├── Account number
├── Account type (Current/Savings)
├── Support for multiple accounts
└── Auto-detect bank from statement upload

Step 5: Financial Year
├── Year-end date (Dec 31, Mar 31, etc.)
└── Current financial year
```

**Industry-specific behavior:**
- F&B → Show POS report upload, platform settlements (Grab/FoodPanda)
- Retail → Show e-commerce settlements (Shopee/Lazada)
- Services → Show project invoice tracking

#### 2. Document Management System

**Document types supported:**

| Type | Category | Required | Formats |
|------|----------|----------|---------|
| Bank Statement | Cash | Yes | PDF |
| Sales Invoice | Accrual | Yes | PDF, JPG, PNG |
| Purchase Invoice | Accrual | Yes | PDF, JPG, PNG |
| POS Daily Report | Accrual | Optional | PDF, CSV, XLSX |
| Platform Settlement | Accrual | Optional | PDF, CSV, XLSX |
| Payment Receipt | Accrual | Optional | PDF, JPG, PNG |
| Petty Cash Log | Cash | Optional | PDF, XLSX |

**Upload interface:**
- Drag & drop zone (primary)
- File picker (secondary)
- Bulk upload support
- Progress indicators
- Duplicate detection

**Document checklist:**
- Visual checklist showing uploaded vs missing
- Industry-aware requirements
- Period-specific completeness check
- Contextual help for each document type

#### 3. Document Extraction Engine (Python service)

**OCR Pipeline:**
```
PDF Upload
    ↓
[AWS S3 Storage]
    ↓
[OCR Service Selection]
├── Mistral OCR (default, cost-effective)
└── AWS Textract (fallback, higher accuracy)
    ↓
[Document Classification]
├── Bank statement → Transaction extraction
├── Invoice → Invoice data extraction
└── POS report → Aggregated sales extraction
    ↓
[Structured Data Output]
├── Transactions table (for bank)
└── Accrual documents table (for invoices)
```

**Bank statement extraction:**
```typescript
interface BankTransaction {
  date: string;           // YYYY-MM-DD
  description: string;    // Raw transaction text
  amount: number;         // Positive = inflow, Negative = outflow
  balance: number;        // Running balance
  reference?: string;     // Transaction reference
  payee?: string;         // Extracted payee name
}
```

**Invoice extraction:**
```typescript
interface InvoiceData {
  docNumber: string;      // INV-2025-001
  docDate: string;        // YYYY-MM-DD
  dueDate?: string;
  counterparty: string;   // Customer/Supplier name
  amount: number;
  taxAmount?: number;
  lineItems?: LineItem[];
  rawText: string;        // For LLM matching
}
```

#### 4. Five-Layer Matching Engine (Core IP)

**Architecture:**
```
┌─────────────────────────────────────────────────────────────┐
│                    MATCHING ENGINE                           │
├─────────────────────────────────────────────────────────────┤
│  Layer 1: EXACT MATCH                                       │
│  ├── Amount: ±$0.01                                         │
│  ├── Date: ±3 days                                          │
│  └── Confidence: 100% → Auto-match                          │
├─────────────────────────────────────────────────────────────┤
│  Layer 2: WINDOW MATCH                                      │
│  ├── Amount: ±$0.01                                         │
│  ├── Date: ±7 days                                          │
│  └── Confidence: 88-95% → Auto-match with flag              │
├─────────────────────────────────────────────────────────────┤
│  Layer 3: REFERENCE MATCH                                   │
│  ├── Extract invoice numbers from bank description          │
│  ├── Patterns: INV-xxx, REF-xxx, BILL-xxx                  │
│  └── Confidence: 85-95% → Auto-match                        │
├─────────────────────────────────────────────────────────────┤
│  Layer 4: FUZZY NAME MATCH                                  │
│  ├── Levenshtein distance on payee/counterparty            │
│  ├── Amount tolerance: ±10%                                │
│  └── Confidence: 70-85% → Suggest for review                │
├─────────────────────────────────────────────────────────────┤
│  Layer 5: LLM SEMANTIC MATCH                                │
│  ├── Batch unmatched items (max 50)                        │
│  ├── Send to Claude/Mistral via AWS Bedrock                │
│  └── Confidence: Variable → Human review recommended        │
└─────────────────────────────────────────────────────────────┘
```

**Confidence thresholds:**
- ≥90%: Auto-match (no review needed)
- 70-89%: Suggested match (highlight for review)
- <70%: No match (create suspense item)

**LLM Prompt template:**
```
You are an accounting reconciliation expert. Match these bank
transactions to invoices/receipts based on:
- Amount similarity (exact or close)
- Date proximity (within 30 days)
- Name/description semantic similarity
- Reference number patterns

Bank Transactions: [JSON array]
Accrual Documents: [JSON array]

Return JSON array of matches with confidence scores.
```

#### 5. Transaction Categorization

**Auto-categorization with confidence:**
- High (>90%): Auto-apply category
- Medium (70-90%): Apply with highlight
- Low (<70%): Flag for user input

**Category structure:**
```typescript
interface Category {
  mainCategory: string;   // "Operating Expenses"
  subCategory: string;    // "Rent"
  accountCode?: string;   // "6100" (for accounting software)
  keywords: string[];     // ["rent", "landlord", "lease"]
}
```

**Pre-seeded keywords (300+):**
- Rent: landlord names, "rental", "lease"
- Utilities: TNB, Air Selangor, TM, IWK
- Tax: LHDN, SST, SOCSO, EPF, PSMB
- Delivery: Lalamove, Grab, J&T
- etc.

#### 6. Reconciliation Workflow

**Status flow:**
```
DRAFT → IN_PROGRESS → REVIEW → COMPLETE
```

**Reconciliation session:**
```typescript
interface ReconciliationSession {
  companyId: string;
  periodStart: string;    // "2025-01-01"
  periodEnd: string;      // "2025-01-31"
  status: "draft" | "in_progress" | "review" | "complete";

  // Opening/closing balances
  bankOpening: number;
  bankClosing: number;
  bookOpening: number;
  bookClosing: number;

  // Counts
  totalBankTransactions: number;
  totalAccrualDocuments: number;
  matchedCount: number;
  suspenseCount: number;
  queryCount: number;

  // Match rate
  matchRate: number;      // 0-100%
}
```

#### 7. Output Generation

**Reports to generate:**

1. **Bank Reconciliation Statement (Excel)**
   - Sheet 1: Matched transactions
   - Sheet 2: Suspense items
   - Sheet 3: Summary dashboard
   - Sheet 4: Journal entries

2. **Client Query List**
   - Missing documents to request
   - Unverified transactions
   - Priority ranking by amount

3. **Export Files (for accounting software)**
   - SQL Accounting format
   - AutoCount format
   - QuickBooks IIF format
   - Xero CSV format
   - Generic CSV/JSON

#### 8. Dashboard & Analytics

**Company dashboard:**
```
┌─────────────────────────────────────────────────────┐
│  Total Revenue    │  Total Expenses   │  Net Cash   │
│  RM 5.2M         │  RM 2.1M          │  +RM 3.1M   │
├─────────────────────────────────────────────────────┤
│  [Cash Flow Chart - 12 months]                      │
├─────────────────────────────────────────────────────┤
│  Top Expenses          │  Match Rate Progress       │
│  ├─ Rent: RM 156K      │  ████████░░ 85%           │
│  ├─ Salaries: RM 124K  │                           │
│  └─ Supplies: RM 72K   │  Suspense: 45 items       │
└─────────────────────────────────────────────────────┘
```

**User dashboard (all companies):**
```
┌─────────────────────────────────────────────────────┐
│  My Companies (3)                          [+ Add]  │
├─────────────────────────────────────────────────────┤
│  CJT Bakery       │ Jan 2025  │ 95% matched │ ✓    │
│  TLG Restaurant   │ Jan 2025  │ 78% matched │ ⚠    │
│  ABC Services     │ Dec 2024  │ Pending     │ ○    │
└─────────────────────────────────────────────────────┘
```

### Database Schema (Convex)

```typescript
// Core tables
companies: {
  _id: Id<"companies">,
  userId: Id<"users">,
  code: string,
  name: string,
  tradingAs?: string,
  registrationNumber?: string,
  taxRegistered: boolean,
  taxNumber?: string,
  industry: string,
  industryCategory: string,
  primaryBank: string,
  primaryAccountNumber: string,
  bankAccounts: BankAccount[],
  financialYearEnd: string,
  onboardingCompleted: boolean,
  createdAt: number,
}

transactions: {
  _id: Id<"transactions">,
  companyId: Id<"companies">,
  documentId?: Id<"documents">,
  date: string,
  description: string,
  amount: number,
  balance?: number,
  category?: string,
  subCategory?: string,
  payee?: string,
  reference?: string,
  isFlagged: boolean,
  flagReason?: string,
}

accrualDocuments: {
  _id: Id<"accrualDocuments">,
  companyId: Id<"companies">,
  docType: "sales_invoice" | "purchase_invoice" | "pos_report" | "settlement" | "receipt",
  docNumber?: string,
  docDate: string,
  dueDate?: string,
  counterparty?: string,
  amount: number,
  taxAmount?: number,
  description?: string,
  filePath: string,
  extractedText?: string,
  status: "pending" | "matched" | "partial" | "suspense",
}

matchedPairs: {
  _id: Id<"matchedPairs">,
  companyId: Id<"companies">,
  bankTransactionId: Id<"transactions">,
  accrualDocumentId: Id<"accrualDocuments">,
  matchType: "exact" | "window" | "reference" | "fuzzy" | "llm_semantic",
  confidence: number,
  amountDifference: number,
  matchedBy: "rule" | "llm",
  notes?: string,
}

suspenseItems: {
  _id: Id<"suspenseItems">,
  companyId: Id<"companies">,
  sourceType: "bank" | "accrual",
  sourceId: string,
  amount: number,
  transactionDate: string,
  description: string,
  reason: string,
  suggestedAction: string,
  status: "open" | "queried" | "resolved",
  resolutionNotes?: string,
}

reconciliationSessions: {
  _id: Id<"reconciliationSessions">,
  companyId: Id<"companies">,
  periodStart: string,
  periodEnd: string,
  status: "draft" | "in_progress" | "review" | "complete",
  bankOpening?: number,
  bankClosing?: number,
  matchedCount: number,
  suspenseCount: number,
  matchRate: number,
}
```

### API Endpoints

**Rust API (high-performance):**
```
POST   /api/documents/upload          Upload document(s)
GET    /api/documents/:id/status      Check extraction status
POST   /api/reconciliation/run        Run matching engine
GET    /api/reconciliation/:id        Get session status
POST   /api/export/excel              Generate Excel report
POST   /api/export/accounting-software Generate import file
```

**Python API (ML/AI):**
```
POST   /ml/extract/bank-statement     Extract bank transactions
POST   /ml/extract/invoice            Extract invoice data
POST   /ml/match/semantic             LLM semantic matching
POST   /ml/categorize                 Auto-categorize transactions
```

### Pricing Model

**Hybrid: Subscription + Credits**

```
┌─────────────────────────────────────────────────────┐
│  FREE TIER                                          │
│  - Explore full app                                 │
│  - Demo mode                                        │
│  - 1 company, 50 transactions/month                 │
├─────────────────────────────────────────────────────┤
│  STARTER - RM 49/month                              │
│  - 3 companies                                      │
│  - 500 transactions/month                           │
│  - Email support                                    │
├─────────────────────────────────────────────────────┤
│  PROFESSIONAL - RM 149/month                        │
│  - 10 companies                                     │
│  - 5,000 transactions/month                         │
│  - Priority support                                 │
│  - Export to accounting software                    │
├─────────────────────────────────────────────────────┤
│  ENTERPRISE - Custom                                │
│  - Unlimited companies                              │
│  - Unlimited transactions                           │
│  - White-label option                               │
│  - Dedicated support                                │
├─────────────────────────────────────────────────────┤
│  CREDITS (Pay-as-you-go)                           │
│  - RM 0.10 per transaction                          │
│  - RM 0.50 per document extraction                  │
│  - RM 1.00 per LLM matching batch                   │
│  - Never expires                                    │
└─────────────────────────────────────────────────────┘
```

### Security Requirements

- All data encrypted at rest (AWS)
- TLS 1.3 for data in transit
- API keys stored in environment variables
- Per-company data isolation (row-level security)
- Audit trail for all actions
- GDPR-compliant data handling
- SOC 2 compliance roadmap

### Performance Targets

- Document upload: <5 seconds for 10MB PDF
- OCR extraction: <30 seconds per document
- Matching engine (Layer 1-4): <2 seconds for 1,000 transactions
- LLM matching: <30 seconds for 50-item batch
- Dashboard load: <1 second
- Export generation: <10 seconds

---

# PART 2: PRODUCT REQUIREMENTS DOCUMENT (PRD)

---

## Executive Summary

**Product Name:** Reconciled
**Tagline:** "Reconciliation on Autopilot"
**Target Market:** SME business owners and accounting professionals globally, starting with Malaysia

**Value Proposition:**
Transform the tedious monthly reconciliation process from hours of manual Excel work into a 5-minute automated workflow with 90%+ accuracy.

**Business Model:**
- Subscription tiers (Free → Starter → Pro → Enterprise)
- Credit-based pay-as-you-go option
- Transparent pricing displayed before any action

**Timeline:** 9-12 months to comprehensive MVP

---

## Market Analysis

### Target Users

| Segment | Size (Malaysia) | Pain Points | Willingness to Pay |
|---------|-----------------|-------------|-------------------|
| Micro businesses | 900,000+ | No time for bookkeeping | Low (Free-Starter) |
| SMEs | 50,000+ | Manual reconciliation tedious | Medium (Starter-Pro) |
| Accounting firms | 3,000+ | Managing multiple clients | High (Pro-Enterprise) |

### Competitive Landscape

| Competitor | Strength | Weakness | Our Advantage |
|------------|----------|----------|---------------|
| Excel | Familiar | Manual, error-prone | Automation |
| AutoCount | Established | Desktop-only, complex | Cloud, AI-powered |
| Xero | Cloud-native | Expensive, not localized | Malaysia-first, affordable |
| QuickBooks | Feature-rich | Overkill for SMEs | Focused on reconciliation |

### Key Differentiators

1. **Try-before-buy** - Full app access without signup
2. **5-layer AI matching** - 90%+ automation rate
3. **Malaysia-first** - Local banks, SST, ringgit
4. **Transparent pricing** - No hidden fees, pay per use option

---

## User Stories

### Business Owner (Primary)

```
As a bakery owner,
I want to upload my bank statements and invoices,
So that I can see if my books are balanced without spending hours in Excel.

Acceptance Criteria:
- Upload bank statement PDF in <5 seconds
- See extraction progress in real-time
- Get matched results within 2 minutes
- Download reconciliation report as Excel
```

### Accountant (Primary)

```
As an accountant managing 15 clients,
I want to quickly reconcile each client's monthly accounts,
So that I can focus on advisory work instead of data entry.

Acceptance Criteria:
- Switch between clients in one click
- See reconciliation status for all clients at a glance
- Generate client query lists for missing documents
- Export to accounting software format
```

### First-Time Visitor

```
As a curious visitor,
I want to explore the app and see a demo,
So that I can decide if it's worth paying for.

Acceptance Criteria:
- Access full app without signup
- See interactive demo with sample data
- Clear pricing displayed before any paywall
- One-click signup when ready to pay
```

---

## Feature Specifications

### F1: Company Management

**Priority:** P0 (Must Have)
**Phase:** 1

| Feature | Description | Acceptance Criteria |
|---------|-------------|---------------------|
| Create company | Add new company with basic info | Name, code auto-generated |
| Company list | View all companies | Sort by name, last activity |
| Company dashboard | Overview of company status | Transactions, match rate, pending |
| Edit company | Update company details | All onboarding fields editable |
| Delete company | Remove company and data | Confirmation required, soft delete |

### F2: Onboarding Wizard

**Priority:** P0 (Must Have)
**Phase:** 1

| Step | Fields | Validation |
|------|--------|------------|
| Company Info | Name, trading name, registration number | Name required |
| Tax Registration | Tax registered (Y/N), tax number | If Y, number required |
| Industry | Industry dropdown, first-year flag | Industry required |
| Bank Accounts | Bank, account number, type | Primary account required |
| Financial Year | Year-end date | Valid date required |

**Industry options:**
- Food & Beverage
- Retail & E-commerce
- Professional Services
- Manufacturing
- Construction & Property
- Healthcare & Medical
- Other

### F3: Document Upload

**Priority:** P0 (Must Have)
**Phase:** 1

| Feature | Description | Acceptance Criteria |
|---------|-------------|---------------------|
| Drag & drop | Drop files onto upload zone | Visual feedback on hover |
| File picker | Click to select files | Multi-select supported |
| Progress bar | Show upload progress | Percentage, estimated time |
| File validation | Check file type/size | Max 50MB, PDF/JPG/PNG |
| Duplicate detection | Warn on same filename | Option to replace or skip |

**Document type detection:**
- Bank statement → Route to bank extraction
- Invoice → Route to invoice extraction
- Auto-detect from content if ambiguous

### F4: Document Extraction (OCR)

**Priority:** P0 (Must Have)
**Phase:** 2

| Document Type | Extracted Fields | Accuracy Target |
|---------------|------------------|-----------------|
| Bank statement | Date, description, amount, balance, reference | 95%+ |
| Sales invoice | Number, date, customer, amount, tax, line items | 90%+ |
| Purchase invoice | Number, date, supplier, amount, tax | 90%+ |
| POS report | Date, total sales, payment breakdown | 85%+ |

**OCR Pipeline:**
1. Upload to S3
2. Trigger extraction Lambda
3. Call Mistral OCR API
4. Parse response to structured data
5. Store in database
6. Update UI via Convex subscription

### F5: Matching Engine

**Priority:** P0 (Must Have)
**Phase:** 2

| Layer | Logic | Confidence | Auto-Match |
|-------|-------|------------|------------|
| 1: Exact | Amount ±0.01, Date ±3 days | 100% | Yes |
| 2: Window | Amount ±0.01, Date ±7 days | 88-95% | Yes |
| 3: Reference | Invoice # in bank description | 85-95% | Yes |
| 4: Fuzzy | Name similarity >60%, Amount ±10% | 70-85% | Suggest |
| 5: LLM | Semantic matching via Claude | Variable | Suggest |

**Matching workflow:**
```
1. Load unmatched bank transactions
2. Load unmatched accrual documents
3. Run Layer 1-4 sequentially
4. Batch remaining for Layer 5
5. Categorize results:
   - Auto-matched (≥90%)
   - Suggested (70-89%)
   - Unmatched (<70%)
6. Save to matched_pairs table
7. Create suspense items for unmatched
```

### F6: Reconciliation Session

**Priority:** P0 (Must Have)
**Phase:** 3

| Feature | Description | Acceptance Criteria |
|---------|-------------|---------------------|
| Create session | Start reconciliation for period | Select month/year |
| Readiness check | Show what's available/missing | Bank txns, accrual docs count |
| Run matching | Execute matching engine | Progress indicator |
| Review matches | Show matched pairs | Accept/reject individual |
| Resolve suspense | Handle unmatched items | Assign reason, action |
| Complete session | Finalize reconciliation | Lock from further changes |

**Session statuses:**
- `draft` - Created, not started
- `in_progress` - Matching running
- `review` - Waiting for user review
- `complete` - Finalized

### F7: Dashboard & Analytics

**Priority:** P1 (Should Have)
**Phase:** 3

**Company dashboard widgets:**
- Total revenue / expenses / net cash
- Cash flow chart (12 months)
- Top expense categories (pie chart)
- Match rate progress bar
- Pending items count

**User dashboard:**
- Company cards with status
- Quick actions (upload, reconcile)
- Recent activity feed
- Subscription usage meter

### F8: Report Generation

**Priority:** P0 (Must Have)
**Phase:** 3

| Report | Format | Contents |
|--------|--------|----------|
| Bank Reconciliation | Excel | Matched, unmatched, summary |
| Client Query List | Excel/PDF | Missing documents to request |
| Transaction Listing | CSV | All transactions with categories |
| Journal Entries | CSV | Adjustment entries |

**Accounting software exports:**
- SQL Accounting format
- AutoCount import format
- QuickBooks IIF
- Xero CSV
- Generic JSON/CSV

### F9: Payment & Billing

**Priority:** P0 (Must Have)
**Phase:** 4

| Feature | Description |
|---------|-------------|
| Paywall modal | Show when action requires payment |
| Pricing page | Display all tiers and credits |
| Stripe integration | Handle subscriptions and one-time |
| Usage tracking | Track transactions, extractions |
| Credit balance | Show remaining credits |
| Invoices | Generate billing invoices |

### F10: Demo Mode

**Priority:** P1 (Should Have)
**Phase:** 4

| Feature | Description |
|---------|-------------|
| Sample company | Pre-loaded demo data |
| Guided tour | Step-by-step walkthrough |
| Interactive animations | Show matching in action |
| Reset demo | Clear demo changes |

---

## Technical Architecture

### System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│                 Next.js 16 + React 19 + TypeScript                │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │
│  │Dashboard│  │ Upload  │  │ Recon   │  │ Reports │            │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘            │
└───────┼────────────┼────────────┼────────────┼──────────────────┘
        │            │            │            │
        ▼            ▼            ▼            ▼
┌─────────────────────────────────────────────────────────────────┐
│                         CONVEX                                   │
│              (Database + Real-time + Auth)                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Tables: companies, transactions, accrualDocuments,      │   │
│  │          matchedPairs, suspenseItems, sessions, users    │   │
│  └─────────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│   RUST API    │  │  PYTHON ML   │  │   AWS S3/Cloudflare      │
│    (Axum)     │  │  (FastAPI)   │  │  (Storage)    │
│               │  │              │  │               │
│ • File proc   │  │ • OCR        │  │ • Documents   │
│ • Export gen  │  │ • Matching   │  │ • Exports     │
│ • Heavy ops   │  │ • Categorize │  │ • Backups     │
└───────┬───────┘  └───────┬──────┘  └───────────────┘
        │                  │
        │                  ▼
        │         ┌───────────────┐
        │         │  AWS BEDROCK  │
        │         │               │
        │         │ • Opus 4.5  │
        │         │ • Mistral     │
        │         └───────────────┘
        │
        ▼
┌───────────────┐
│    STRIPE     │
│               │
│ • Payments    │
│ • Subs        │
└───────────────┘
```

### Technology Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Frontend | Next.js 16 + React 19 | SSR, Turbopack, great ecosystem |
| Styling | Tailwind CSS v4 | Modern CSS-first config, fast builds |
| Backend (Performance) | Rust (Axum) | File processing, exports need speed |
| Backend (ML) | Python (FastAPI) | ML libraries, LLM integrations |
| Database | Convex | Real-time sync, serverless,|
| LLM Provider | AWS Bedrock | Claude + Mistral, enterprise-grade |
| Payments | Stripe | Industry standard, global |
| Storage | AWS S3/Cloudflare | Scalable, integrated with Lambda |
| Hosting |Cloudlfare | Easy deployment, good DX |

### Convex Schema (Detailed)

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    subscriptionTier: v.string(), // "free", "starter", "pro", "enterprise"
    credits: v.number(),
    createdAt: v.number(),
  }).index("by_email", ["email"]),

  companies: defineTable({
    userId: v.id("users"),
    code: v.string(),
    name: v.string(),
    tradingAs: v.optional(v.string()),
    registrationNumber: v.optional(v.string()),
    taxRegistered: v.boolean(),
    taxNumber: v.optional(v.string()),
    industry: v.string(),
    industryCategory: v.string(),
    primaryBank: v.string(),
    primaryAccountNumber: v.string(),
    bankAccounts: v.array(v.object({
      bank: v.string(),
      accountNumber: v.string(),
      accountType: v.string(),
      isPrimary: v.boolean(),
    })),
    financialYearEnd: v.string(),
    onboardingCompleted: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_code", ["code"]),

  documents: defineTable({
    companyId: v.id("companies"),
    filename: v.string(),
    filePath: v.string(),
    fileSize: v.number(),
    docType: v.string(), // "bank_statement", "sales_invoice", etc.
    periodStart: v.optional(v.string()),
    periodEnd: v.optional(v.string()),
    status: v.string(), // "pending", "processing", "completed", "failed"
    extractionJobId: v.optional(v.string()),
    extractedAt: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_company", ["companyId"])
    .index("by_status", ["status"]),

  transactions: defineTable({
    companyId: v.id("companies"),
    documentId: v.optional(v.id("documents")),
    date: v.string(),
    description: v.string(),
    amount: v.number(),
    balance: v.optional(v.number()),
    category: v.optional(v.string()),
    subCategory: v.optional(v.string()),
    payee: v.optional(v.string()),
    reference: v.optional(v.string()),
    isFlagged: v.boolean(),
    flagReason: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_company", ["companyId"])
    .index("by_date", ["companyId", "date"])
    .index("by_category", ["companyId", "category"]),

  accrualDocuments: defineTable({
    companyId: v.id("companies"),
    docType: v.string(),
    docNumber: v.optional(v.string()),
    docDate: v.string(),
    dueDate: v.optional(v.string()),
    counterparty: v.optional(v.string()),
    amount: v.number(),
    taxAmount: v.optional(v.number()),
    description: v.optional(v.string()),
    lineItems: v.optional(v.string()), // JSON string
    filePath: v.string(),
    extractedText: v.optional(v.string()),
    status: v.string(), // "pending", "matched", "partial", "suspense"
    createdAt: v.number(),
  })
    .index("by_company", ["companyId"])
    .index("by_status", ["companyId", "status"])
    .index("by_date", ["companyId", "docDate"]),

  matchedPairs: defineTable({
    companyId: v.id("companies"),
    sessionId: v.optional(v.id("reconciliationSessions")),
    bankTransactionId: v.id("transactions"),
    accrualDocumentId: v.id("accrualDocuments"),
    matchType: v.string(),
    confidence: v.number(),
    amountDifference: v.number(),
    matchedBy: v.string(), // "rule", "llm", "manual"
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_company", ["companyId"])
    .index("by_session", ["sessionId"])
    .index("by_bank_txn", ["bankTransactionId"])
    .index("by_accrual_doc", ["accrualDocumentId"]),

  suspenseItems: defineTable({
    companyId: v.id("companies"),
    sessionId: v.optional(v.id("reconciliationSessions")),
    sourceType: v.string(), // "bank", "accrual"
    sourceId: v.string(),
    amount: v.number(),
    transactionDate: v.string(),
    description: v.string(),
    reason: v.string(),
    suggestedAction: v.string(),
    status: v.string(), // "open", "queried", "resolved"
    resolutionNotes: v.optional(v.string()),
    resolvedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_company", ["companyId"])
    .index("by_status", ["companyId", "status"]),

  reconciliationSessions: defineTable({
    companyId: v.id("companies"),
    periodStart: v.string(),
    periodEnd: v.string(),
    status: v.string(), // "draft", "in_progress", "review", "complete"
    bankOpening: v.optional(v.number()),
    bankClosing: v.optional(v.number()),
    bookOpening: v.optional(v.number()),
    bookClosing: v.optional(v.number()),
    totalBankTransactions: v.number(),
    totalAccrualDocuments: v.number(),
    matchedCount: v.number(),
    suspenseCount: v.number(),
    matchRate: v.number(),
    notes: v.optional(v.string()),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_company", ["companyId"])
    .index("by_period", ["companyId", "periodStart"]),

  categories: defineTable({
    companyId: v.optional(v.id("companies")), // null = global
    keyword: v.string(),
    mainCategory: v.string(),
    subCategory: v.string(),
    accountCode: v.optional(v.string()),
    isGlobal: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_company", ["companyId"])
    .index("by_keyword", ["keyword"]),

  clientQueries: defineTable({
    companyId: v.id("companies"),
    sessionId: v.optional(v.id("reconciliationSessions")),
    reconPeriod: v.string(),
    queryType: v.string(),
    description: v.string(),
    bankTransactionId: v.optional(v.id("transactions")),
    amount: v.optional(v.number()),
    priority: v.string(), // "low", "medium", "high"
    status: v.string(), // "pending", "sent", "responded", "resolved"
    response: v.optional(v.string()),
    createdAt: v.number(),
    resolvedAt: v.optional(v.number()),
  })
    .index("by_company", ["companyId"])
    .index("by_status", ["companyId", "status"]),

  usageEvents: defineTable({
    userId: v.id("users"),
    eventType: v.string(), // "extraction", "matching", "export"
    companyId: v.optional(v.id("companies")),
    quantity: v.number(),
    creditsUsed: v.number(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),
});
```

---

## Development Phases

### Phase 1: Foundation (Month 1-3)

**Goal:** Basic infrastructure and company management

| Week | Deliverables |
|------|--------------|
| 1-2 | Project setup: Next.js + React, Convex, Rust API skeleton |
| 3-4 | Auth flow: Signup, login, session management |
| 5-6 | Company CRUD: Create, list, edit, delete |
| 7-8 | Onboarding wizard: 5-step form with validation |
| 9-10 | Basic document upload: Drag & drop, S3 storage |
| 11-12 | UI polish: Design system, responsive layout |

**Milestones:**
- [ ] User can signup and login
- [ ] User can create and manage companies
- [ ] User can complete onboarding wizard
- [ ] User can upload documents (stored in S3)

### Phase 2: Extraction Engine (Month 4-6)

**Goal:** Document processing and data extraction

| Week | Deliverables |
|------|--------------|
| 13-14 | Python service setup: FastAPI, AWS Bedrock integration |
| 15-16 | Bank statement extraction: Mistral OCR pipeline |
| 17-18 | Invoice extraction: Multiple format handling |
| 19-20 | Transaction storage: Convex integration |
| 21-22 | Extraction status UI: Progress, errors, retry |
| 23-24 | Testing with real Malaysian bank statements |

**Milestones:**
- [ ] Bank statements extracted with 95%+ accuracy
- [ ] Invoices extracted with 90%+ accuracy
- [ ] Real-time extraction status in UI
- [ ] Transactions viewable in app

### Phase 3: Matching Engine (Month 6-8)

**Goal:** Core reconciliation functionality

| Week | Deliverables |
|------|--------------|
| 25-26 | Layer 1-2: Exact and window matching |
| 27-28 | Layer 3-4: Reference and fuzzy matching |
| 29-30 | Layer 5: LLM semantic matching via Bedrock |
| 31-32 | Reconciliation session management |
| 33-34 | Match review UI: Accept, reject, manual match |
| 35-36 | Suspense item handling and resolution |

**Milestones:**
- [ ] Matching engine achieves 85%+ automation
- [ ] User can review and approve matches
- [ ] Suspense items clearly presented
- [ ] Session can be completed and locked

### Phase 4: Reports & Export (Month 8-9)

**Goal:** Output generation and accounting software integration

| Week | Deliverables |
|------|--------------|
| 37-38 | Excel report generation (Rust) |
| 39-40 | Bank reconciliation statement template |
| 41-42 | Accounting software export formats |
| 43-44 | Client query list generation |
| 45-46 | Download and email delivery |

**Milestones:**
- [ ] Excel reports generated correctly
- [ ] Export formats work with SQL Accounting, AutoCount
- [ ] Reports downloadable from UI
- [ ] Query lists help identify missing docs

### Phase 5: Dashboard & Analytics (Month 9-10)

**Goal:** Visual insights and status tracking

| Week | Deliverables |
|------|--------------|
| 47-48 | Company dashboard: Revenue, expenses, cash flow |
| 49-50 | User dashboard: Multi-company overview |
| 51-52 | Charts: Line charts, pie charts, progress bars |
| 53-54 | Real-time updates via Convex subscriptions |

**Milestones:**
- [ ] Company financial summary visible
- [ ] Charts render correctly with real data
- [ ] Dashboard loads in <1 second
- [ ] Real-time updates work

### Phase 6: Monetization & Polish (Month 10-12)

**Goal:** Payment integration, demo mode, launch readiness

| Week | Deliverables |
|------|--------------|
| 55-56 | Stripe integration: Subscriptions, credits |
| 57-58 | Paywall implementation: Pre-action modal |
| 59-60 | Usage tracking and credit deduction |
| 61-62 | Demo mode: Sample data, guided tour |
| 63-64 | Pricing page and billing portal |
| 65-68 | Testing, bug fixes, performance optimization |
| 69-72 | Soft launch, feedback, iteration |

**Milestones:**
- [ ] Payments work end-to-end
- [ ] Demo mode showcases full functionality
- [ ] Pricing is clear and transparent
- [ ] Ready for public launch

---

## Success Metrics

### Launch Metrics (Month 12)

| Metric | Target |
|--------|--------|
| Registered users | 500+ |
| Paying customers | 50+ |
| Companies created | 200+ |
| Documents processed | 5,000+ |
| Match accuracy | 90%+ |

### Growth Metrics (Year 1)

| Metric | Target |
|--------|--------|
| Monthly Active Users | 1,000+ |
| Monthly Recurring Revenue | RM 50,000+ |
| Customer Retention | 80%+ |
| NPS Score | 50+ |

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| OCR accuracy issues | Medium | High | Multiple OCR providers, manual fallback |
| LLM costs too high | Medium | Medium | Caching, rule-based priority, usage limits |
| Malaysian bank format changes | Low | Medium | Configurable parsers, quick updates |
| Competitor launches similar | Medium | Medium | Focus on UX, local expertise |
| Scope creep | High | High | Strict phase gates, MVP mindset |

---

## Appendix A: Bank Statement Formats

### Supported Malaysian Banks

| Bank | PDF Format | Special Handling |
|------|------------|------------------|
| Maybank | Statement per page | Balance column varies |
| CIMB | Tabular format | Combined debit/credit column |
| Public Bank | Fixed columns | Reference in separate field |
| RHB | Multi-page tables | Headers on each page |
| Hong Leong | Grid format | Running balance |
| AmBank | Variable format | Date format varies |
| UOB | Clean tabular | Standard format |
| OCBC | Clean tabular | Standard format |
| HSBC | International format | Multi-currency |
| Standard Chartered | International format | Multi-currency |

---

## Appendix B: Category Keywords (Seed Data)

### Expenses

```
Rent: landlord, rental, lease, tenancy
Utilities: TNB, air selangor, IWK, TM, telekom, unifi
Tax: LHDN, IRB, SST, income tax, cukai
Statutory: SOCSO, EPF, KWSP, PSMB, EIS
Salary: wages, salary, payroll, gaji
Delivery: lalamove, grab, j&t express, poslaju, dhl
Raw Materials: chicken, vegetables, flour, sugar, eggs
Office: stationery, printing, supplies
Professional: legal, audit, accounting, consulting
Insurance: takaful, prudential, allianz, aia
```

### Income

```
Sales: duitnow, payment received, invoice
Platform: grab, foodpanda, shopee, lazada
Transfer: IBG, GIRO, instant transfer, fund transfer
Deposit: cash deposit, CDM
Interest: interest earned, profit
Refund: refund, return
```

---

## Appendix C: API Endpoint Specifications

### Rust API Endpoints

```
POST   /api/v1/documents/upload
  Body: multipart/form-data
  Response: { documentId, status, message }

GET    /api/v1/documents/:id/status
  Response: { status, progress, extractedData? }

POST   /api/v1/reconciliation/run
  Body: { companyId, periodStart, periodEnd, useLlm }
  Response: { sessionId, status }

GET    /api/v1/reconciliation/:sessionId
  Response: { session, matches, suspense, summary }

POST   /api/v1/export/excel
  Body: { sessionId, reportType }
  Response: { downloadUrl }

POST   /api/v1/export/accounting
  Body: { sessionId, format } // "sql_accounting", "autocount", "xero"
  Response: { downloadUrl }
```

### Python ML API Endpoints

```
POST   /ml/v1/extract/bank-statement
  Body: { s3Path, bankType }
  Response: { transactions[], metadata }

POST   /ml/v1/extract/invoice
  Body: { s3Path, docType }
  Response: { invoiceData }

POST   /ml/v1/match/semantic
  Body: { bankItems[], accrualItems[], maxResults }
  Response: { matches[] }

POST   /ml/v1/categorize
  Body: { transactions[] }
  Response: { categorized[] }
```

---

## Appendix D: UI Wireframes (Key Screens)

### 1. Company Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back    CJT Bakery Sdn Bhd                    [Settings] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │   Revenue   │ │  Expenses   │ │  Net Cash   │           │
│  │  RM 660K    │ │  RM 648K    │ │  +RM 12K    │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
│                                                             │
│  Cash Flow (Jan - Dec 2025)                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │     ___                                              │   │
│  │    /   \    ___         ___                         │   │
│  │ __/     \__/   \___    /   \___                     │   │
│  │                    \__/                              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────────────┐  ┌──────────────────────────┐   │
│  │ Top Expenses         │  │ Reconciliation Status    │   │
│  │ ■ Rent      RM 56K   │  │ ████████████░░░ 85%     │   │
│  │ ■ Salary    RM 48K   │  │                          │   │
│  │ ■ Supplies  RM 32K   │  │ 45 items need review     │   │
│  │ ■ Utilities RM 12K   │  │ [Review Now]             │   │
│  └──────────────────────┘  └──────────────────────────┘   │
│                                                             │
│  [Upload Documents]  [Run Reconciliation]  [Export Report] │
└─────────────────────────────────────────────────────────────┘
```

### 2. Document Upload

```
┌─────────────────────────────────────────────────────────────┐
│  Upload Documents                                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                      │   │
│  │     ┌─────┐                                         │   │
│  │     │ 📄 │  Drag & drop files here                 │   │
│  │     └─────┘                                         │   │
│  │             or click to browse                      │   │
│  │                                                      │   │
│  │     Supported: PDF, JPG, PNG (max 50MB)            │   │
│  │                                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Document Checklist                                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ [✓] Bank Statement       Maybank_202501.pdf        │   │
│  │ [ ] Sales Invoices       0 files                    │   │
│  │ [ ] Purchase Invoices    0 files                    │   │
│  │ [ ] POS Reports          Optional                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [Process Documents - RM 5.00]                              │
└─────────────────────────────────────────────────────────────┘
```

### 3. Matching Review

```
┌─────────────────────────────────────────────────────────────┐
│  Review Matches - January 2025                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Filter: [All] [Auto-matched] [Needs Review] [Unmatched]   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Bank Transaction          │ Invoice/Receipt         │   │
│  ├───────────────────────────┼─────────────────────────┤   │
│  │ 15 Jan | RM 1,234.00     │ INV-2025-001           │   │
│  │ PAYMENT ABC SUPPLIER      │ ABC Supplier Sdn Bhd   │   │
│  │                           │ RM 1,234.00            │   │
│  │ Confidence: 100% ✓        │ [✓ Accept] [✗ Reject]  │   │
│  ├───────────────────────────┼─────────────────────────┤   │
│  │ 18 Jan | RM 567.80       │ INV-2025-015           │   │
│  │ TRANSFER XYZ              │ XYZ Enterprise         │   │
│  │                           │ RM 567.80              │   │
│  │ Confidence: 78% ⚠         │ [✓ Accept] [✗ Reject]  │   │
│  ├───────────────────────────┼─────────────────────────┤   │
│  │ 22 Jan | RM 5,000.00     │ No match found         │   │
│  │ CASH DEPOSIT CDM          │                        │   │
│  │                           │ [Find Match] [Mark OK] │   │
│  └───────────────────────────┴─────────────────────────┘   │
│                                                             │
│  Showing 1-10 of 145 items                    [< 1 2 3 >]  │
│                                                             │
│  [Complete Reconciliation]                                  │
└─────────────────────────────────────────────────────────────┘
```

---

*End of PRD*
