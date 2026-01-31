"""
Tests for async PDF generation with progress tracking.

These tests verify that:
- Progress callbacks are called at expected intervals
- Progress values increase monotonically from 0 to 100
- Progress steps reflect actual generation stages
- Generation completes successfully with progress tracking
"""

import pytest
from unittest.mock import AsyncMock, MagicMock
from datetime import datetime

from models.pdf_report import (
    PDFGenerationRequest,
    PDFGenerationProgress,
    PDFReportType,
    PDFStatus,
    CompanyInfo,
    SessionInfo,
    PDFReportData,
    PDFReportOptions,
    SummaryData,
    MatchedTransaction,
    SuspenseItem,
)
from services.pdf_generator import PDFGeneratorService


@pytest.fixture
def pdf_generator():
    """Create a PDF generator service instance."""
    return PDFGeneratorService()


@pytest.fixture
def sample_request():
    """Create a sample PDF generation request."""
    return PDFGenerationRequest(
        job_id="test-job-123",
        report_type=PDFReportType.BANK_RECON,
        company=CompanyInfo(name="Test Company", currency="USD"),
        data=PDFReportData(
            session=SessionInfo(
                id="session-1",
                name="January 2025 Reconciliation",
                period_start="2025-01-01",
                period_end="2025-01-31",
            ),
            matches=[
                MatchedTransaction(
                    date="2025-01-15",
                    bank_description=f"Payment {i}",
                    bank_amount=100.00 * i,
                    invoice_number=f"INV-{i:04d}",
                    invoice_amount=100.00 * i,
                    match_type="Exact",
                    confidence=95.0,
                )
                for i in range(1, 51)  # 50 matches
            ],
            suspense_items=[
                SuspenseItem(
                    date="2025-01-20",
                    description=f"Unmatched item {i}",
                    amount=50.00 * i,
                    source="Bank",
                    reason="No matching invoice",
                    suggested_action="Review manually",
                    status="open",
                )
                for i in range(1, 6)  # 5 suspense items
            ],
            summary=SummaryData(
                total_cash=5000.00,
                total_accrual=4750.00,
                matched_count=50,
                pending_count=0,
                suspense_count=5,
                match_rate=90.9,
                total_cash_transactions=55,
                total_accrual_documents=50,
            ),
        ),
        options=PDFReportOptions(
            include_matched=True,
            include_suspense=True,
            include_journal=False,
        ),
        webhook_url="https://example.com/webhook",
    )


class TestAsyncPDFGeneration:
    """Tests for async PDF generation with progress tracking."""

    @pytest.mark.asyncio
    async def test_progress_callback_called(self, pdf_generator, sample_request):
        """Test that progress callback is called during generation."""
        progress_updates = []

        async def callback(progress: PDFGenerationProgress):
            progress_updates.append(progress)

        pdf_bytes = await pdf_generator.generate_report_async(sample_request, callback)

        # Should have received progress updates
        assert len(progress_updates) > 0
        # Should have generated valid PDF
        assert len(pdf_bytes) > 0
        assert pdf_bytes[:4] == b"%PDF"

    @pytest.mark.asyncio
    async def test_progress_increases_monotonically(self, pdf_generator, sample_request):
        """Test that progress values increase from start to finish."""
        progress_values = []

        async def callback(progress: PDFGenerationProgress):
            progress_values.append(progress.progress)

        await pdf_generator.generate_report_async(sample_request, callback)

        # Progress should be monotonically increasing
        for i in range(1, len(progress_values)):
            assert progress_values[i] >= progress_values[i - 1], (
                f"Progress decreased from {progress_values[i-1]} to {progress_values[i]}"
            )

        # Should start at or near 0 and end at 100
        assert progress_values[0] <= 10
        assert progress_values[-1] == 100

    @pytest.mark.asyncio
    async def test_progress_contains_job_id(self, pdf_generator, sample_request):
        """Test that progress updates contain the correct job ID."""
        progress_updates = []

        async def callback(progress: PDFGenerationProgress):
            progress_updates.append(progress)

        await pdf_generator.generate_report_async(sample_request, callback)

        for update in progress_updates:
            assert update.job_id == sample_request.job_id

    @pytest.mark.asyncio
    async def test_progress_contains_step_descriptions(self, pdf_generator, sample_request):
        """Test that progress updates contain meaningful step descriptions."""
        progress_updates = []

        async def callback(progress: PDFGenerationProgress):
            progress_updates.append(progress)

        await pdf_generator.generate_report_async(sample_request, callback)

        # All progress updates should have step descriptions
        for update in progress_updates:
            assert update.current_step, f"Missing step at progress {update.progress}"

        # Should include key stages
        step_texts = " ".join(u.current_step for u in progress_updates).lower()
        assert "initializing" in step_texts or "document" in step_texts
        assert "complete" in step_texts

    @pytest.mark.asyncio
    async def test_progress_status_is_processing(self, pdf_generator, sample_request):
        """Test that progress updates have PROCESSING status."""
        progress_updates = []

        async def callback(progress: PDFGenerationProgress):
            progress_updates.append(progress)

        await pdf_generator.generate_report_async(sample_request, callback)

        for update in progress_updates:
            assert update.status == PDFStatus.PROCESSING

    @pytest.mark.asyncio
    async def test_progress_tracks_item_counts(self, pdf_generator, sample_request):
        """Test that progress updates track processed items."""
        progress_updates = []

        async def callback(progress: PDFGenerationProgress):
            progress_updates.append(progress)

        await pdf_generator.generate_report_async(sample_request, callback)

        # Total items should match request data
        expected_total = (
            len(sample_request.data.matches) +
            len(sample_request.data.suspense_items)
        )

        # At least one update should show total items
        totals = [u.total_items for u in progress_updates if u.total_items > 0]
        assert len(totals) > 0
        assert totals[0] == expected_total

    @pytest.mark.asyncio
    async def test_client_query_report_progress(self, pdf_generator, sample_request):
        """Test progress tracking for client query reports."""
        sample_request.report_type = PDFReportType.CLIENT_QUERY
        progress_values = []

        async def callback(progress: PDFGenerationProgress):
            progress_values.append(progress.progress)

        pdf_bytes = await pdf_generator.generate_report_async(sample_request, callback)

        assert len(pdf_bytes) > 0
        assert progress_values[-1] == 100

    @pytest.mark.asyncio
    async def test_transaction_listing_progress(self, pdf_generator, sample_request):
        """Test progress tracking for transaction listing reports."""
        sample_request.report_type = PDFReportType.TRANSACTION_LISTING
        progress_values = []

        async def callback(progress: PDFGenerationProgress):
            progress_values.append(progress.progress)

        pdf_bytes = await pdf_generator.generate_report_async(sample_request, callback)

        assert len(pdf_bytes) > 0
        assert progress_values[-1] == 100

    @pytest.mark.asyncio
    async def test_empty_report_progress(self, pdf_generator):
        """Test progress tracking with empty data."""
        request = PDFGenerationRequest(
            job_id="empty-job",
            report_type=PDFReportType.BANK_RECON,
            company=CompanyInfo(name="Empty Corp", currency="USD"),
            data=PDFReportData(
                session=SessionInfo(id="s1", name="Empty Session"),
                matches=[],
                suspense_items=[],
                summary=SummaryData(),
            ),
            options=PDFReportOptions(),
            webhook_url="https://example.com/webhook",
        )

        progress_values = []

        async def callback(progress: PDFGenerationProgress):
            progress_values.append(progress.progress)

        pdf_bytes = await pdf_generator.generate_report_async(request, callback)

        assert len(pdf_bytes) > 0
        assert progress_values[-1] == 100

    @pytest.mark.asyncio
    async def test_estimated_remaining_time(self, pdf_generator, sample_request):
        """Test that estimated remaining time is provided during processing."""
        progress_updates = []

        async def callback(progress: PDFGenerationProgress):
            progress_updates.append(progress)

        await pdf_generator.generate_report_async(sample_request, callback)

        # Mid-progress updates should have estimated time
        mid_updates = [u for u in progress_updates if 20 <= u.progress <= 90]
        has_estimate = any(
            u.estimated_remaining_seconds is not None
            for u in mid_updates
        )

        # At least some mid-progress updates should have time estimates
        # (early ones might not have enough data to estimate)
        if len(mid_updates) > 2:
            assert has_estimate, "Expected time estimates during mid-generation"
