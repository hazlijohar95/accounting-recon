"""
PDF Report Generator Service using ReportLab.

This module generates premium branded PDF reports for bank reconciliation
results. It uses ReportLab's Platypus framework for document flow and
includes custom branding with the Reconciled logo and color scheme.

Report Types:
    - BANK_RECON: Full reconciliation report with matches, suspense, journals
    - CLIENT_QUERY: Simplified report highlighting items requiring attention
    - TRANSACTION_LISTING: Complete transaction listing without matching

Design System:
    - Black and white premium aesthetic
    - Inter font family (falls back to Helvetica)
    - Geometric 'R' logo programmatically drawn
    - Consistent header/footer on all pages

Architecture:
    - Uses pdf_styles.py for all styling constants and functions
    - Paragraph elements for text wrapping in table cells
    - Responsive column widths based on content type
    - Background task execution for async generation

Example:
    >>> from services.pdf_generator import PDFGeneratorService
    >>> from models.pdf_report import PDFGenerationRequest, PDFReportType
    >>> service = PDFGeneratorService()
    >>> pdf_bytes = service.generate_report(request)
    >>> with open("report.pdf", "wb") as f:
    ...     f.write(pdf_bytes)
"""

import io
import asyncio
import time
from datetime import datetime
from typing import Optional, Callable, Awaitable
import structlog

from reportlab.lib.pagesizes import A4, letter
from reportlab.platypus import (
    SimpleDocTemplate,
    Table,
    TableStyle,
    Paragraph,
    Spacer,
    PageBreak,
    KeepTogether,
    HRFlowable,
)
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
from reportlab.lib.units import inch

from models.pdf_report import (
    PDFGenerationRequest,
    PDFReportType,
    PDFReportData,
    PDFStatus,
    PDFGenerationProgress,
    CompanyInfo,
    PDFReportOptions,
    MatchedTransaction,
    SuspenseItem,
    Transaction,
    JournalEntry,
    SummaryData,
)
from .pdf_styles import (
    get_custom_styles,
    get_data_table_style,
    get_summary_table_style,
    get_journal_table_style,
    get_column_widths,
    get_font_family,
    register_fonts,
    draw_logo,
    format_currency,
    format_percentage,
    truncate_text,
    PRIMARY_COLOR,
    SECONDARY_COLOR,
    LIGHT_GRAY,
    BORDER_COLOR,
    TEXT_MUTED,
    WHITE,
    CONTENT_WIDTH,
    MARGIN,
    BRAND_NAME,
    BRAND_WORDMARK,
    BRAND_TAGLINE,
    BRAND_URL,
)

logger = structlog.get_logger()


# Header/footer dimensions
HEADER_HEIGHT = 40  # Height of the branded header bar
FOOTER_HEIGHT = 30  # Height of the footer area


class PDFGeneratorService:
    """
    Service for generating premium branded PDF reports.

    Generates professional PDF reports for bank reconciliation results
    using ReportLab's Platypus document framework. Reports include
    custom branding, responsive tables, and multi-page support.

    Attributes:
        styles: Custom ParagraphStyle dictionary for text formatting
        fonts: Font family names (Inter or Helvetica fallback)

    Report Sections:
        - Title section with company name and period
        - Summary statistics table
        - Matched transactions table
        - Suspense items table
        - Journal entries table

    Example:
        >>> service = PDFGeneratorService()
        >>> request = PDFGenerationRequest(
        ...     job_id="abc123",
        ...     report_type=PDFReportType.BANK_RECON,
        ...     company=CompanyInfo(name="ACME Corp"),
        ...     data=report_data,
        ...     webhook_url="https://..."
        ... )
        >>> pdf_bytes = service.generate_report(request)
    """

    def __init__(self):
        # Register fonts on initialization
        register_fonts()
        self.styles = get_custom_styles()
        self.fonts = get_font_family()

    def generate_report(
        self,
        request: PDFGenerationRequest,
    ) -> bytes:
        """
        Generate a PDF report based on the request

        Args:
            request: PDF generation request with all data

        Returns:
            PDF file content as bytes
        """
        logger.info(
            "generating_pdf_report",
            job_id=request.job_id,
            report_type=request.report_type,
            company=request.company.name,
        )

        # Create buffer for PDF
        buffer = io.BytesIO()

        # Create document with space for header and footer
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            leftMargin=MARGIN,
            rightMargin=MARGIN,
            topMargin=MARGIN + HEADER_HEIGHT + 10,  # Space for branded header
            bottomMargin=MARGIN + FOOTER_HEIGHT,  # Space for branded footer
        )

        # Build story (content)
        story = []

        # Add title section (below the header bar)
        story.extend(self._build_title_section(request.company, request.data, request.report_type))

        # Add content based on report type
        if request.report_type == PDFReportType.BANK_RECON:
            story.extend(self._build_bank_recon_content(request.data, request.company, request.options))
        elif request.report_type == PDFReportType.CLIENT_QUERY:
            story.extend(self._build_client_query_content(request.data, request.company, request.options))
        elif request.report_type == PDFReportType.TRANSACTION_LISTING:
            story.extend(self._build_transaction_listing_content(request.data, request.company))

        # Build PDF with branded header/footer
        doc.build(story, onFirstPage=self._add_page_header_footer, onLaterPages=self._add_page_header_footer)

        # Get PDF content
        pdf_content = buffer.getvalue()
        buffer.close()

        logger.info(
            "pdf_generated",
            job_id=request.job_id,
            size_bytes=len(pdf_content),
        )

        return pdf_content

    async def generate_report_async(
        self,
        request: PDFGenerationRequest,
        progress_callback: Callable[[PDFGenerationProgress], Awaitable[None]],
    ) -> bytes:
        """
        Generate a PDF report asynchronously with progress tracking.

        This method generates the same PDF as generate_report but provides
        progress updates through a callback function. Useful for long reports
        where users need feedback on generation progress.

        Args:
            request: PDF generation request with all data
            progress_callback: Async callback to receive progress updates

        Returns:
            PDF file content as bytes
        """
        job_id = request.job_id
        start_time = time.time()

        # Calculate total items for progress tracking
        total_items = (
            len(request.data.matches) +
            len(request.data.suspense_items) +
            len(request.data.transactions) +
            len(request.data.journal_entries)
        )

        # Helper to report progress
        async def report_progress(
            progress: int,
            step: str,
            items_processed: int = 0,
        ) -> None:
            elapsed = time.time() - start_time
            remaining = None
            if progress > 0 and progress < 100:
                remaining = int((elapsed / progress) * (100 - progress))

            await progress_callback(PDFGenerationProgress(
                job_id=job_id,
                status=PDFStatus.PROCESSING,
                progress=progress,
                current_step=step,
                items_processed=items_processed,
                total_items=total_items,
                estimated_remaining_seconds=remaining,
            ))
            # Yield to event loop
            await asyncio.sleep(0)

        logger.info(
            "generating_pdf_report_async",
            job_id=job_id,
            report_type=request.report_type,
            company=request.company.name,
            total_items=total_items,
        )

        # Report initial progress
        await report_progress(5, "Initializing report generation")

        # Create buffer for PDF
        buffer = io.BytesIO()

        # Create document
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            leftMargin=MARGIN,
            rightMargin=MARGIN,
            topMargin=MARGIN + HEADER_HEIGHT + 10,
            bottomMargin=MARGIN + FOOTER_HEIGHT,
        )

        await report_progress(10, "Building document structure")

        # Build story (content)
        story = []

        # Add title section
        story.extend(self._build_title_section(request.company, request.data, request.report_type))
        await report_progress(15, "Generated title section")

        # Track processed items
        items_processed = 0

        # Add content based on report type with progress tracking
        if request.report_type == PDFReportType.BANK_RECON:
            # Summary section
            story.extend(self._build_summary_section(request.data.summary, request.company))
            await report_progress(20, "Generated summary section")

            # Matched transactions section
            if request.options.include_matched and request.data.matches:
                story.extend(self._build_section_header("MATCHED TRANSACTIONS"))

                # Process matches in chunks for progress reporting
                chunk_size = max(50, len(request.data.matches) // 10)
                matches_processed = 0

                for i in range(0, len(request.data.matches), chunk_size):
                    chunk = request.data.matches[i:i + chunk_size]
                    # Build partial table (in production, would batch)
                    matches_processed += len(chunk)
                    items_processed += len(chunk)

                    progress = 20 + int((items_processed / max(total_items, 1)) * 60)
                    await report_progress(
                        min(progress, 80),
                        f"Processing matches ({matches_processed}/{len(request.data.matches)})",
                        items_processed,
                    )

                story.extend(self._build_matches_table(request.data.matches, request.company))
                story.append(Spacer(1, 20))

            # Suspense items section
            if request.options.include_suspense and request.data.suspense_items:
                story.extend(self._build_section_header("SUSPENSE ITEMS"))
                story.extend(self._build_suspense_table(request.data.suspense_items, request.company))
                items_processed += len(request.data.suspense_items)
                await report_progress(
                    min(20 + int((items_processed / max(total_items, 1)) * 60), 80),
                    f"Processed suspense items ({len(request.data.suspense_items)})",
                    items_processed,
                )
                story.append(Spacer(1, 20))

            # Journal entries section
            if request.options.include_journal and request.data.journal_entries:
                story.append(PageBreak())
                story.extend(self._build_section_header("JOURNAL ENTRIES"))
                story.extend(self._build_journal_table(request.data.journal_entries, request.company))
                items_processed += len(request.data.journal_entries)
                await report_progress(85, "Generated journal entries", items_processed)

        elif request.report_type == PDFReportType.CLIENT_QUERY:
            story.extend(self._build_client_query_content(request.data, request.company, request.options))
            items_processed = len(request.data.suspense_items)
            await report_progress(85, "Generated client query content", items_processed)

        elif request.report_type == PDFReportType.TRANSACTION_LISTING:
            story.extend(self._build_transaction_listing_content(request.data, request.company))
            items_processed = len(request.data.transactions)
            await report_progress(85, "Generated transaction listing", items_processed)

        await report_progress(90, "Building PDF document")

        # Build PDF
        doc.build(story, onFirstPage=self._add_page_header_footer, onLaterPages=self._add_page_header_footer)

        await report_progress(95, "Finalizing PDF")

        # Get PDF content
        pdf_content = buffer.getvalue()
        buffer.close()

        await report_progress(100, "Complete")

        logger.info(
            "pdf_generated_async",
            job_id=job_id,
            size_bytes=len(pdf_content),
            duration_seconds=round(time.time() - start_time, 2),
            total_items=total_items,
        )

        return pdf_content

    def _build_title_section(
        self,
        company: CompanyInfo,
        data: PDFReportData,
        report_type: PDFReportType,
    ) -> list:
        """
        Build report title section with company info and period.

        Creates the document header area below the branded bar, including:
            - Report type title (ALL CAPS, centered)
            - Company name
            - Statement period or session name
            - Generation date

        Args:
            company: Company information for the report
            data: Report data containing session information
            report_type: Type of report being generated

        Returns:
            List of Platypus flowable elements for the title section
        """
        elements = []

        # Report type titles
        titles = {
            PDFReportType.BANK_RECON: "BANK RECONCILIATION REPORT",
            PDFReportType.CLIENT_QUERY: "CLIENT QUERY REPORT",
            PDFReportType.TRANSACTION_LISTING: "TRANSACTION LISTING",
        }
        title = titles.get(report_type, "REPORT")

        # Main title - ALL CAPS, centered
        elements.append(Spacer(1, 8))
        elements.append(Paragraph(title, self.styles["Title"]))

        # Company name - medium weight
        elements.append(Paragraph(company.name, self.styles["CompanyName"]))

        # Period info
        period = ""
        if data.session.period_start and data.session.period_end:
            period = f"{data.session.period_start} to {data.session.period_end}"
        elif data.session.name:
            period = data.session.name
        if period:
            elements.append(Paragraph(period, self.styles["Subtitle"]))

        # Generated date
        generated_date = datetime.now().strftime("%d %B %Y")
        elements.append(Paragraph(f"Generated: {generated_date}", self.styles["Subtitle"]))

        elements.append(Spacer(1, 24))

        return elements

    def _build_bank_recon_content(
        self,
        data: PDFReportData,
        company: CompanyInfo,
        options: PDFReportOptions,
    ) -> list:
        """
        Build bank reconciliation report content sections.

        Generates the full report body including:
            - Summary statistics section
            - Matched transactions table (if enabled)
            - Suspense items table (if enabled)
            - Journal entries table (if enabled, with page break)

        Args:
            data: Report data with matches, suspense items, journals
            company: Company info for currency formatting
            options: Report options controlling included sections

        Returns:
            List of Platypus flowable elements for the report body
        """
        elements = []

        # Summary section
        elements.extend(self._build_summary_section(data.summary, company))

        # Matched transactions section
        if options.include_matched and data.matches:
            elements.extend(self._build_section_header("MATCHED TRANSACTIONS"))
            elements.extend(self._build_matches_table(data.matches, company))
            elements.append(Spacer(1, 20))

        # Suspense items section
        if options.include_suspense and data.suspense_items:
            elements.extend(self._build_section_header("SUSPENSE ITEMS"))
            elements.extend(self._build_suspense_table(data.suspense_items, company))
            elements.append(Spacer(1, 20))

        # Journal entries section
        if options.include_journal and data.journal_entries:
            elements.append(PageBreak())
            elements.extend(self._build_section_header("JOURNAL ENTRIES"))
            elements.extend(self._build_journal_table(data.journal_entries, company))

        return elements

    def _build_client_query_content(
        self,
        data: PDFReportData,
        company: CompanyInfo,
        options: PDFReportOptions,
    ) -> list:
        """
        Build client query report content.

        Creates a simplified report focused on items requiring client
        attention, with summary and suspense items only.

        Args:
            data: Report data with summary and suspense items
            company: Company info for currency formatting
            options: Report options (not used for client query)

        Returns:
            List of Platypus flowable elements
        """
        elements = []

        # Summary
        elements.extend(self._build_section_header("RECONCILIATION SUMMARY"))
        elements.extend(self._build_summary_section(data.summary, company))

        # Only suspense items for client query
        if data.suspense_items:
            elements.extend(self._build_section_header("ITEMS REQUIRING ATTENTION"))
            elements.append(Paragraph(
                "The following items could not be automatically matched and require your attention:",
                self.styles["Normal"]
            ))
            elements.append(Spacer(1, 12))
            elements.extend(self._build_suspense_table(data.suspense_items, company))

        return elements

    def _build_transaction_listing_content(
        self,
        data: PDFReportData,
        company: CompanyInfo,
    ) -> list:
        """
        Build transaction listing report content.

        Creates a comprehensive transaction listing without matching
        information, useful for review and audit purposes.

        Args:
            data: Report data with summary and transactions list
            company: Company info for currency formatting

        Returns:
            List of Platypus flowable elements
        """
        elements = []

        # Summary
        elements.extend(self._build_summary_section(data.summary, company))

        # All transactions
        if data.transactions:
            elements.extend(self._build_section_header("TRANSACTION LISTING"))
            elements.extend(self._build_transactions_table(data.transactions, company))

        return elements

    def _build_section_header(self, title: str) -> list:
        """
        Build a section header with horizontal rule separator.

        Creates a styled section divider with:
            - Thin primary-colored line above
            - Section title in ALL CAPS bold

        Args:
            title: Section title text (will be displayed as-is)

        Returns:
            List of flowable elements (HRFlowable, Paragraph, Spacer)
        """
        elements = []

        # Thin line above section header
        elements.append(HRFlowable(
            width="100%",
            thickness=1,
            color=PRIMARY_COLOR,
            spaceBefore=8,
            spaceAfter=8,
        ))

        # Section title - ALL CAPS
        elements.append(Paragraph(title, self.styles["SectionHeader"]))
        elements.append(Spacer(1, 8))

        return elements

    def _build_summary_section(self, summary: SummaryData, company: CompanyInfo) -> list:
        """
        Build summary statistics section with card-like design.

        Creates a two-column summary table showing:
            - Total bank transactions / Total accrual documents
            - Matched / Pending / Suspense counts
            - Match rate percentage
            - Total cash / Total accrual / Variance amounts

        Args:
            summary: Summary statistics data
            company: Company info for currency code

        Returns:
            List of flowable elements (Table with custom styling)

        Note:
            Non-zero variance row is highlighted with bold formatting.
        """
        elements = []

        # Summary data rows with separator groups
        summary_data = [
            ["Total Bank Transactions", str(summary.total_cash_transactions)],
            ["Total Accrual Documents", str(summary.total_accrual_documents)],
            ["", ""],  # Separator row
            ["Matched", str(summary.matched_count)],
            ["Pending Review", str(summary.pending_count)],
            ["Suspense Items", str(summary.suspense_count)],
            ["", ""],  # Separator row
            ["Match Rate", format_percentage(summary.match_rate)],
            ["", ""],  # Separator row
            ["Total Cash (Bank)", format_currency(summary.total_cash, company.currency)],
            ["Total Accrual", format_currency(summary.total_accrual, company.currency)],
            ["Variance", format_currency(summary.total_cash - summary.total_accrual, company.currency)],
        ]

        col_widths = get_column_widths('summary')
        table = Table(summary_data, colWidths=col_widths)

        # Base style
        style = get_summary_table_style()

        # Make variance row bold if significant
        variance = summary.total_cash - summary.total_accrual
        if abs(variance) > 0.01:  # Non-zero variance
            style.add("FONTNAME", (0, -1), (-1, -1), self.fonts['bold'])

        table.setStyle(style)

        elements.append(table)
        elements.append(Spacer(1, 24))

        return elements

    def _build_matches_table(self, matches: list[MatchedTransaction], company: CompanyInfo) -> list:
        """
        Build matched transactions table with text wrapping.

        Creates an 8-column table showing matched transaction pairs:
            - Date | Description | Bank Amt | Doc # | Doc Amt | Diff | Match | Conf

        Uses Paragraph elements for description column to enable
        automatic text wrapping within cells.

        Args:
            matches: List of matched transaction records
            company: Company info for currency formatting

        Returns:
            List containing a single Table flowable

        Note:
            Numeric columns (Bank Amt, Doc Amt, Diff, Conf) are right-aligned.
        """
        elements = []

        # Header row
        headers = ["Date", "Description", "Bank Amt", "Doc #", "Doc Amt", "Diff", "Match", "Conf"]

        # Get responsive column widths
        col_widths = get_column_widths('matches')

        # Data rows using Paragraph for text wrapping
        data = [headers]
        for match in matches:
            diff = abs(match.bank_amount) - abs(match.invoice_amount or 0)

            # Use Paragraph for description to enable text wrapping
            description = Paragraph(
                match.bank_description or "",
                self.styles["TableCell"]
            )

            data.append([
                match.date,
                description,  # Wrappable description
                format_currency(match.bank_amount, company.currency),
                match.invoice_number or "",
                format_currency(match.invoice_amount or 0, company.currency),
                format_currency(diff, company.currency),
                match.match_type[:10] if match.match_type else "",
                f"{match.confidence:.0f}%",
            ])

        table = Table(data, colWidths=col_widths, repeatRows=1)

        # Apply style with right-alignment for numeric columns
        style = get_data_table_style()
        # Right-align amount columns (2, 4, 5)
        style.add("ALIGN", (2, 1), (2, -1), "RIGHT")
        style.add("ALIGN", (4, 1), (5, -1), "RIGHT")
        style.add("ALIGN", (7, 1), (7, -1), "RIGHT")  # Confidence
        table.setStyle(style)

        elements.append(table)

        return elements

    def _build_suspense_table(self, items: list[SuspenseItem], company: CompanyInfo) -> list:
        """
        Build suspense items table with text wrapping.

        Creates a 7-column table showing unmatched items:
            - Date | Description | Amount | Source | Reason | Action | Status

        Uses Paragraph elements for description, reason, and action columns
        to enable automatic text wrapping.

        Args:
            items: List of suspense item records
            company: Company info for currency formatting

        Returns:
            List containing a single Table flowable

        Note:
            Amount column is right-aligned.
        """
        elements = []

        headers = ["Date", "Description", "Amount", "Source", "Reason", "Action", "Status"]

        col_widths = get_column_widths('suspense')

        data = [headers]
        for item in items:
            # Use Paragraph for longer text fields
            description = Paragraph(item.description or "", self.styles["TableCell"])
            reason = Paragraph(item.reason or "", self.styles["TableCell"])
            action = Paragraph(item.suggested_action or "", self.styles["TableCell"])

            data.append([
                item.date,
                description,
                format_currency(item.amount, company.currency),
                item.source,
                reason,
                action,
                item.status.title() if item.status else "",
            ])

        table = Table(data, colWidths=col_widths, repeatRows=1)

        style = get_data_table_style()
        # Right-align amount column
        style.add("ALIGN", (2, 1), (2, -1), "RIGHT")
        table.setStyle(style)

        elements.append(table)

        return elements

    def _build_transactions_table(self, transactions: list[Transaction], company: CompanyInfo) -> list:
        """
        Build transactions listing table.

        Creates a 7-column table showing all transactions:
            - Date | Description | Reference | Amount | Type | Status | Category

        Uses Paragraph elements for description column to enable
        automatic text wrapping.

        Args:
            transactions: List of transaction records
            company: Company info for currency formatting

        Returns:
            List containing a single Table flowable
        """
        elements = []

        headers = ["Date", "Description", "Reference", "Amount", "Type", "Status", "Category"]

        col_widths = get_column_widths('transactions')

        data = [headers]
        for txn in transactions:
            description = Paragraph(txn.description or "", self.styles["TableCell"])

            data.append([
                txn.date,
                description,
                txn.reference or "",
                format_currency(txn.amount, company.currency),
                txn.type.title() if txn.type else "",
                txn.status.title() if txn.status else "",
                txn.category or "",
            ])

        table = Table(data, colWidths=col_widths, repeatRows=1)

        style = get_data_table_style()
        # Right-align amount column
        style.add("ALIGN", (3, 1), (3, -1), "RIGHT")
        table.setStyle(style)

        elements.append(table)

        return elements

    def _build_journal_table(self, entries: list[JournalEntry], company: CompanyInfo) -> list:
        """
        Build journal entries table with debit/credit totals.

        Creates a 6-column table showing journal entries:
            - Date | Account | Debit | Credit | Description | Ref

        Includes a totals row at the bottom with sum of debits and credits.

        Uses Paragraph elements for account and description columns to
        enable automatic text wrapping.

        Args:
            entries: List of journal entry records
            company: Company info for currency formatting

        Returns:
            List containing a single Table flowable

        Note:
            Totals row is styled with bold font, line above, and gray background.
        """
        elements = []

        headers = ["Date", "Account", "Debit", "Credit", "Description", "Ref"]

        col_widths = get_column_widths('journal')

        data = [headers]
        total_debit = 0.0
        total_credit = 0.0

        for entry in entries:
            total_debit += entry.debit
            total_credit += entry.credit

            account = Paragraph(entry.account or "", self.styles["TableCell"])
            description = Paragraph(entry.description or "", self.styles["TableCell"])

            data.append([
                entry.date,
                account,
                format_currency(entry.debit, company.currency) if entry.debit else "",
                format_currency(entry.credit, company.currency) if entry.credit else "",
                description,
                entry.reference,
            ])

        # Add totals row
        data.append([
            "",
            "TOTALS",
            format_currency(total_debit, company.currency),
            format_currency(total_credit, company.currency),
            "",
            "",
        ])

        table = Table(data, colWidths=col_widths, repeatRows=1)

        # Get base style and add totals row formatting
        style = get_journal_table_style()
        style.add("FONTNAME", (0, -1), (-1, -1), self.fonts['bold'])
        style.add("LINEABOVE", (0, -1), (-1, -1), 1, PRIMARY_COLOR)
        style.add("BACKGROUND", (0, -1), (-1, -1), LIGHT_GRAY)
        table.setStyle(style)

        elements.append(table)

        return elements

    def _add_page_header_footer(self, canvas, doc):
        """
        Add premium branded header and footer to each page.

        Called by ReportLab during document build for each page.
        Draws consistent branding elements:

        Header (black bar):
            - Geometric 'R' logo (white)
            - "reconciled" wordmark
            - Tagline on right side

        Footer (clean minimal):
            - Thin separator line
            - Page number (left)
            - "Powered by Reconciled" (center)
            - Website URL (right)

        Args:
            canvas: ReportLab canvas object for drawing
            doc: Document being built (for page size info)
        """
        canvas.saveState()
        page_width = doc.pagesize[0]
        page_height = doc.pagesize[1]

        # ============================================================
        # HEADER - Black bar with logo and wordmark
        # ============================================================
        header_y = page_height - HEADER_HEIGHT

        # Black header bar
        canvas.setFillColor(PRIMARY_COLOR)
        canvas.rect(0, header_y, page_width, HEADER_HEIGHT, fill=True, stroke=False)

        # Draw geometric R logo
        logo_scale = 0.6  # Scale to fit in header
        logo_x = MARGIN
        logo_y = header_y + (HEADER_HEIGHT - 32 * logo_scale) / 2  # Vertically center
        draw_logo(canvas, logo_x, logo_y, scale=logo_scale, fill_color=WHITE)

        # Wordmark "reconciled" next to logo
        wordmark_x = logo_x + 32 * logo_scale + 8  # After logo with small gap
        wordmark_y = header_y + HEADER_HEIGHT / 2 - 5  # Vertically center text

        canvas.setFillColor(WHITE)
        canvas.setFont(self.fonts['bold'], 14)
        canvas.drawString(wordmark_x, wordmark_y, BRAND_WORDMARK)

        # Tagline on the right
        canvas.setFont(self.fonts['regular'], 8)
        canvas.setFillColor(colors.HexColor("#A0A0A0"))  # Lighter gray for tagline
        canvas.drawRightString(page_width - MARGIN, wordmark_y, BRAND_TAGLINE)

        # ============================================================
        # FOOTER - Clean minimal design
        # ============================================================
        footer_y = FOOTER_HEIGHT

        # Thin separator line
        canvas.setStrokeColor(BORDER_COLOR)
        canvas.setLineWidth(0.5)
        canvas.line(MARGIN, footer_y, page_width - MARGIN, footer_y)

        # Page number (left) - muted
        page_num = canvas.getPageNumber()
        canvas.setFillColor(TEXT_MUTED)
        canvas.setFont(self.fonts['regular'], 7)
        canvas.drawString(MARGIN, footer_y - 14, f"Page {page_num}")

        # Powered by branding (center)
        powered_text = f"Powered by {BRAND_NAME}"
        text_width = canvas.stringWidth(powered_text, self.fonts['regular'], 7)
        canvas.drawString((page_width - text_width) / 2, footer_y - 14, powered_text)

        # URL (right) - black for emphasis
        canvas.setFillColor(PRIMARY_COLOR)
        canvas.drawRightString(page_width - MARGIN, footer_y - 14, BRAND_URL)

        canvas.restoreState()

    def generate_file_name(
        self,
        report_type: PDFReportType,
        session_name: Optional[str] = None,
    ) -> str:
        """
        Generate file name for the PDF

        Args:
            report_type: Type of report
            session_name: Optional session name

        Returns:
            Generated file name
        """
        type_names = {
            PDFReportType.BANK_RECON: "Bank_Reconciliation",
            PDFReportType.CLIENT_QUERY: "Client_Query",
            PDFReportType.TRANSACTION_LISTING: "Transaction_Listing",
        }

        base_name = type_names.get(report_type, "Report")
        timestamp = datetime.now().strftime("%Y%m%d_%H%M")

        if session_name:
            # Clean session name for file name
            clean_name = "".join(c if c.isalnum() or c in "_ " else "" for c in session_name)
            clean_name = clean_name.replace(" ", "_")[:30]
            return f"{base_name}_{clean_name}_{timestamp}.pdf"

        return f"{base_name}_{timestamp}.pdf"
