# Testing

## Test Strategy

| Layer | Tool | Focus |
|-------|------|-------|
| Convex Backend | `vitest` + `convex-test` | Matching engine, extraction, mutations |
| Frontend | `vitest` + `@testing-library/react` | Component tests, hooks |
| Python ML | `pytest` | OCR parsers, PDF generation, API endpoints |
| E2E | `playwright` | Critical user flows |

## Configuration

Test config is in `vitest.config.ts`:

```typescript
// Test file locations
include: [
  '__tests__/**/*.{test,spec}.{ts,tsx}',
  'convex/**/__tests__/**/*.{test,spec}.{ts,tsx}',
  'lib/**/*.{test,spec}.{ts,tsx}',
  'hooks/**/*.{test,spec}.{ts,tsx}',
]

// Coverage thresholds (Phase 3)
thresholds: {
  statements: 80,
  branches: 75,
  functions: 80,
  lines: 80,
}
```

## Convex Backend Testing

### Matching Engine Tests
```typescript
// convex/matching/__tests__/layers.test.ts
describe("Layer 1: Exact Match", () => {
  it("matches transactions with same amount and close dates", () => {
    // Test exact matching logic
  });
});

// convex/matching/__tests__/partial.test.ts
describe("Layer 7: Partial Match", () => {
  it("matches one cash transaction to multiple accrual documents", () => {
    // Test partial matching combinations
  });
});
```

Test files are co-located with source in `convex/__tests__/` and `convex/matching/__tests__/`.

### Agent Intelligence Tests
```typescript
// convex/lib/__tests__/agentRules.test.ts (81 tests)
// Layer 1: Date gaps, duplicates, amount validation, extraction quality,
// period coverage, document classification, multi-company detection

// convex/lib/__tests__/agentCrossRef.test.ts (34 tests)
// Layer 2: Accrual company ref, matchability preview, orphaned docs, basis consistency

// convex/lib/__tests__/agentLlm.test.ts (40 tests)
// Layer 3: Entity resolution, summary generation, Bedrock integration mocking

// convex/lib/__tests__/agentUtils.test.ts (36 tests)
// Shared utilities: bigram Dice similarity, helpers
```

### Export System Tests
```typescript
// convex/exports/__tests__/bankRecon.test.ts
// convex/exports/__tests__/clientQuery.test.ts
// convex/exports/__tests__/transactionListing.test.ts
// convex/exports/accounting/__tests__/exports.test.ts
// convex/exports/utils/__tests__/excel.test.ts
// convex/exports/utils/__tests__/formatting.test.ts
```

### Convex Function Tests
```typescript
// convex/__tests__/companies.test.ts
// Uses convex-test for isolated function testing
```

## Frontend Testing

### Component Tests
```tsx
// __tests__/components/brand/match-layer-badge.test.tsx
import { render, screen } from "@testing-library/react";
import { MatchLayerBadge } from "@/components/brand/match-layer-badge";

describe("MatchLayerBadge", () => {
  it("displays correct layer name", () => {
    render(<MatchLayerBadge layer={1} />);
    expect(screen.getByText(/exact/i)).toBeInTheDocument();
  });
});
```

### Test Directory Structure
```
__tests__/
├── setup.ts                    # Global test setup (jsdom, mocks)
├── __mocks__/                  # Module mocks (authkit, next/cache)
├── components/
│   ├── ai/                     # AI component tests
│   │   └── reconcile-agent/    # Reconcile agent tests
│   │       ├── hooks/          # Agent hook tests
│   │       └── tool-parts/     # Tool UI component tests (10+ files)
│   ├── brand/                  # Brand component tests
│   ├── design/                 # Design page component tests
│   │   ├── demo-card.test.tsx
│   │   ├── code-block.test.tsx
│   │   ├── command-block.test.tsx
│   │   └── components-section.test.tsx
│   ├── spreadsheet/            # Spreadsheet component tests
│   └── views/                  # View component tests
│       └── upload-view/agent/  # Agent upload UI tests
│           ├── agent-progress-view.test.tsx
│           ├── agent-upload-ack.test.tsx
│           ├── finding-card.test.tsx
│           └── findings-summary.test.tsx
├── views/
│   ├── reports-view.test.tsx   # Reports view tests
│   └── upload-view.test.tsx    # Upload view tests
├── api/                        # API route tests
│   └── chat/assistant/         # Assistant route helper tests
├── integration/                # Integration tests
│   └── multi-tenant.test.tsx   # Multi-tenant isolation tests
└── lib/                        # Library utility tests

convex/
├── __tests__/                  # Convex function tests (15+ files)
├── matching/__tests__/         # Matching engine tests (6 files)
├── lib/__tests__/              # Agent engine + utility tests (5 files)
└── exports/__tests__/          # Export system tests

hooks/__tests__/                # Hook tests
```

**Total: 133 test files, 2,078 tests**

### Path Aliases in Tests
Tests use `@/` alias resolved via vitest config:
```typescript
resolve: {
  alias: {
    '@': path.resolve(__dirname, './'),
  },
}
```

### Mock Setup
```typescript
// __tests__/setup.ts
// Mocks for:
// - @workos-inc/authkit-nextjs (auth provider)
// - next/cache (caching functions)
// - Convex client (for component tests)
```

## Python Testing

### OCR Parser Tests
```python
# ml/tests/test_parsers.py
def test_maybank_parser():
    raw_text = """
    15/01/2025 PAYMENT TO ABC SDN BHD 1,234.00 50,000.00
    """
    transactions = parse_maybank(raw_text)
    assert len(transactions) == 1
    assert transactions[0].amount == -1234.00
```

### PDF Generation Tests
```python
# ml/tests/test_pdf_generator.py
def test_bank_recon_report():
    # Test PDF generation produces valid bytes
```

## E2E Testing (Playwright)

### Test Files
```
e2e/tests/
├── reconciliation-workflow.spec.ts  # Full reconciliation flow
└── extraction-workflow.spec.ts      # Document extraction flow
```

### Example
```typescript
// e2e/tests/reconciliation-workflow.spec.ts
import { test, expect } from "@playwright/test";

test("complete reconciliation flow", async ({ page }) => {
  // Navigate, upload, match, review
});
```

## Test Coverage Requirements

| Area | Minimum | Source |
|------|---------|--------|
| Statements | 80% | vitest.config.ts |
| Branches | 75% | vitest.config.ts |
| Functions | 80% | vitest.config.ts |
| Lines | 80% | vitest.config.ts |

## Commands

```bash
pnpm test                # Run all Vitest tests
pnpm test:watch          # Watch mode
pnpm test:ui             # Vitest UI
pnpm test:coverage       # With coverage report
pnpm test:e2e            # Playwright E2E
pnpm test:python         # Python ML tests (cd ml && pytest -v)
pnpm test:all            # Vitest + Python
```

## CI Pipeline

```yaml
# .github/workflows/test.yml
test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - name: Install dependencies
      run: pnpm install
    - name: Frontend + Convex tests
      run: pnpm test --coverage
    - name: Python tests
      run: cd ml && pytest --cov=services --cov-fail-under=85
    - name: E2E tests
      run: pnpm test:e2e
```
