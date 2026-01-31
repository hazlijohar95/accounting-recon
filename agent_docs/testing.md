# Testing

## Test Strategy

| Layer | Tool | Focus |
|-------|------|-------|
| Rust API | `cargo test` | Unit tests, integration tests |
| Python ML | `pytest` | Unit tests, mock LLM responses |
| Frontend | `vitest` | Component tests, hooks |
| E2E | Playwright | Critical user flows |

## Rust Testing

### Unit Tests
```rust
// In src/services/matching.rs
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_exact_match() {
        let bank = Transaction {
            date: "2025-01-15",
            amount: 1234.00,
            description: "Payment ABC",
        };
        let accrual = AccrualDoc {
            doc_date: "2025-01-14",
            amount: 1234.00,
            counterparty: "ABC Supplier",
        };

        let result = layer_exact(&[bank], &[accrual]);
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].confidence, 100);
    }

    #[test]
    fn test_exact_match_amount_tolerance() {
        // ±0.01 tolerance
        let bank = Transaction { amount: 1234.00, .. };
        let accrual = AccrualDoc { amount: 1234.01, .. };

        let result = layer_exact(&[bank], &[accrual]);
        assert_eq!(result.len(), 1);
    }

    #[test]
    fn test_window_match_date_range() {
        // ±7 days
        let bank = Transaction { date: "2025-01-20", .. };
        let accrual = AccrualDoc { doc_date: "2025-01-14", .. };

        let result = layer_window(&[bank], &[accrual]);
        assert_eq!(result.len(), 1);
        assert!(result[0].confidence >= 88);
    }
}
```

### Integration Tests
```rust
// tests/api_tests.rs
#[tokio::test]
async fn test_document_upload() {
    let app = create_test_app().await;

    let file = create_test_pdf();
    let response = app
        .post("/api/v1/documents/upload")
        .multipart(file)
        .send()
        .await;

    assert_eq!(response.status(), StatusCode::OK);
}
```

## Python Testing

### Unit Tests
```python
# tests/test_matching.py
import pytest
from services.matching import llm_semantic_match

@pytest.mark.asyncio
async def test_semantic_match_returns_results():
    bank_items = [
        {"id": "1", "amount": 1000, "description": "Payment to supplier"}
    ]
    accrual_items = [
        {"id": "a", "amount": 1000, "counterparty": "ABC Supplier"}
    ]

    matches = await llm_semantic_match(bank_items, accrual_items)

    assert len(matches) >= 1
    assert matches[0]["confidence"] > 0.5

@pytest.fixture
def mock_bedrock(mocker):
    return mocker.patch("services.matching.bedrock.invoke_model")

async def test_llm_fallback_on_error(mock_bedrock):
    mock_bedrock.side_effect = Exception("Bedrock unavailable")

    result = await llm_semantic_match([], [])
    assert result == []  # Graceful fallback
```

### OCR Tests
```python
# tests/test_ocr.py
def test_maybank_parser():
    raw_text = """
    15/01/2025 PAYMENT TO ABC SDN BHD 1,234.00 50,000.00
    16/01/2025 SALARY TRANSFER 5,000.00 45,000.00
    """

    transactions = parse_maybank(raw_text)

    assert len(transactions) == 2
    assert transactions[0].amount == -1234.00
    assert transactions[0].description == "PAYMENT TO ABC SDN BHD"
```

## Frontend Testing

### Component Tests
```tsx
// src/components/__tests__/CompanyCard.test.tsx
import { render, screen } from "@testing-library/react";
import { CompanyCard } from "../CompanyCard";

describe("CompanyCard", () => {
  const company = {
    id: "1",
    name: "Test Company",
    matchRate: 85,
    status: "active",
  };

  it("displays company name", () => {
    render(<CompanyCard company={company} />);
    expect(screen.getByText("Test Company")).toBeInTheDocument();
  });

  it("shows match rate progress", () => {
    render(<CompanyCard company={company} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "85");
  });
});
```

### Hook Tests
```tsx
// src/hooks/__tests__/useUpload.test.tsx
import { renderHook, act } from "@testing-library/react";
import { useUpload } from "../useUpload";

describe("useUpload", () => {
  it("tracks upload status", async () => {
    const { result } = renderHook(() => useUpload("company-1"));

    expect(result.current.status).toBe("idle");

    const file = new File(["test"], "test.pdf", { type: "application/pdf" });
    await act(async () => {
      await result.current.upload([file]);
    });

    expect(result.current.status).toBe("success");
  });
});
```

## E2E Testing

### Critical Flows
```typescript
// e2e/reconciliation.spec.ts
import { test, expect } from "@playwright/test";

test("complete reconciliation flow", async ({ page }) => {
  await page.goto("/companies/1/reconciliation");

  // Upload bank statement
  await page.setInputFiles('input[type="file"]', "fixtures/maybank.pdf");
  await expect(page.getByText("Extraction complete")).toBeVisible();

  // Run matching
  await page.click("button:has-text('Run Matching')");
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", /[0-9]+/);

  // Review matches
  await expect(page.getByText("matches found")).toBeVisible();
});
```

## Test Coverage Requirements

| Area | Minimum |
|------|---------|
| Rust matching engine | 90% |
| Python OCR parsers | 85% |
| Frontend components | 70% |
| Critical user flows | 100% |

## CI Pipeline
```yaml
# .github/workflows/test.yml
test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - name: Rust tests
      run: cargo test
    - name: Python tests
      run: pytest --cov=services --cov-fail-under=85
    - name: Frontend tests
      run: pnpm test --coverage
```
