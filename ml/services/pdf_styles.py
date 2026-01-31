"""
Premium PDF Styles for Reconciled Reports.

This module defines the complete design system for PDF report generation,
including colors, fonts, styles, and utility functions. It implements a
premium black and white aesthetic with pixel-perfect branding.

Design System Components:
    - Brand colors (PRIMARY_COLOR through WHITE)
    - Page dimensions and margins
    - Brand constants (name, wordmark, tagline, URL)
    - Font registration (Inter family with Helvetica fallback)
    - Geometric 'R' logo drawing function
    - ParagraphStyle collection for text elements
    - TableStyle functions for each table type
    - Responsive column width calculations
    - Utility functions for formatting

Color Palette:
    - PRIMARY_COLOR: #0A0A0A (near black - primary text, headers)
    - SECONDARY_COLOR: #171717 (dark charcoal)
    - ACCENT_COLOR: #404040 (medium gray)
    - TEXT_MUTED: #737373 (secondary text, labels)
    - LIGHT_GRAY: #FAFAFA (alternating rows)
    - BORDER_COLOR: #E5E5E5 (table lines, separators)
    - WHITE: #FFFFFF (backgrounds)

Typography:
    - Primary: Inter font family (Regular, Medium, Bold)
    - Fallback: Helvetica family
    - Font files located in assets/fonts/

Example:
    >>> from services.pdf_styles import get_custom_styles, format_currency
    >>> styles = get_custom_styles()
    >>> title_para = Paragraph("Report", styles["Title"])
    >>> amount = format_currency(1234.56, "MYR")  # "RM1,234.56"
"""

import os
from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.platypus import TableStyle
from reportlab.lib.units import inch, mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import structlog

logger = structlog.get_logger()

# ============================================================================
# BRAND COLORS - Premium Black & White Aesthetic
# ============================================================================
PRIMARY_COLOR = colors.HexColor("#0A0A0A")      # Near black - text, headers, logo
SECONDARY_COLOR = colors.HexColor("#171717")   # Dark charcoal
ACCENT_COLOR = colors.HexColor("#404040")      # Medium gray
TEXT_COLOR = colors.HexColor("#0A0A0A")        # Near black
TEXT_MUTED = colors.HexColor("#737373")        # Muted gray - secondary text, labels
LIGHT_GRAY = colors.HexColor("#FAFAFA")        # Off-white - alternating rows
BORDER_COLOR = colors.HexColor("#E5E5E5")      # Light border - table lines, separators
WHITE = colors.HexColor("#FFFFFF")             # Pure white - background

# ============================================================================
# PAGE DIMENSIONS
# ============================================================================
PAGE_WIDTH = 8.5 * inch
PAGE_HEIGHT = 11 * inch
MARGIN = 0.5 * inch
CONTENT_WIDTH = PAGE_WIDTH - (2 * MARGIN)

# ============================================================================
# BRAND CONSTANTS
# ============================================================================
BRAND_NAME = "reconciled"
BRAND_WORDMARK = "reconciled"
BRAND_TAGLINE = "Automated Accounting Reconciliation"
BRAND_URL = "reconciled.dev"

# ============================================================================
# FONT REGISTRATION
# ============================================================================
_fonts_registered = False


def get_fonts_dir() -> Path:
    """
    Get the path to the fonts directory.

    Returns:
        Path object pointing to ml/assets/fonts/
    """
    return Path(__file__).parent.parent / "assets" / "fonts"


def register_fonts() -> bool:
    """
    Register custom Inter font family for premium typography.
    Falls back gracefully to Helvetica if fonts unavailable.

    Returns:
        True if Inter fonts registered, False if using fallback
    """
    global _fonts_registered

    if _fonts_registered:
        return True

    fonts_dir = get_fonts_dir()
    font_files = {
        'Inter': 'Inter-Regular.ttf',
        'Inter-Medium': 'Inter-Medium.ttf',
        'Inter-Bold': 'Inter-Bold.ttf',
    }

    try:
        for font_name, file_name in font_files.items():
            font_path = fonts_dir / file_name
            if font_path.exists():
                pdfmetrics.registerFont(TTFont(font_name, str(font_path)))
                logger.debug("font_registered", font=font_name, path=str(font_path))
            else:
                logger.warning("font_file_missing", font=font_name, path=str(font_path))
                return False

        _fonts_registered = True
        logger.info("inter_fonts_registered")
        return True

    except Exception as e:
        logger.warning("font_registration_failed", error=str(e))
        return False


def get_font_family() -> dict:
    """
    Get the appropriate font family names based on registration status.

    Returns:
        Dict with 'regular', 'medium', 'bold' font names
    """
    if register_fonts():
        return {
            'regular': 'Inter',
            'medium': 'Inter-Medium',
            'bold': 'Inter-Bold',
        }
    else:
        # Fallback to Helvetica
        return {
            'regular': 'Helvetica',
            'medium': 'Helvetica',
            'bold': 'Helvetica-Bold',
        }


# ============================================================================
# LOGO DRAWING
# ============================================================================
def draw_logo(canvas, x: float, y: float, scale: float = 1.0, fill_color=None):
    """
    Draw the Reconciled geometric R logo programmatically.

    The logo consists of 6 rectangles forming a stylized 'R':
    - Vertical stem on the left
    - Top horizontal bar
    - Right column (top portion)
    - Middle horizontal bar
    - Diagonal connector
    - Leg/foot at bottom right

    Args:
        canvas: ReportLab canvas object
        x: X coordinate for logo origin (bottom-left)
        y: Y coordinate for logo origin (bottom-left)
        scale: Scale factor (1.0 = default size ~32px height)
        fill_color: Color for logo (defaults to white)
    """
    if fill_color is None:
        fill_color = WHITE

    canvas.saveState()
    canvas.setFillColor(fill_color)

    # Scale factor - base logo is 32 units tall
    s = scale

    # Vertical stem (left edge)
    canvas.rect(x, y, 8*s, 32*s, fill=True, stroke=False)

    # Top horizontal bar
    canvas.rect(x + 8*s, y + 24*s, 16*s, 8*s, fill=True, stroke=False)

    # Right column (top portion of R)
    canvas.rect(x + 24*s, y + 20*s, 8*s, 12*s, fill=True, stroke=False)

    # Middle horizontal bar (the R's bowl bottom)
    canvas.rect(x + 8*s, y + 12*s, 16*s, 8*s, fill=True, stroke=False)

    # Diagonal connector piece
    canvas.rect(x + 16*s, y + 8*s, 8*s, 4*s, fill=True, stroke=False)

    # Leg/foot at bottom right
    canvas.rect(x + 24*s, y, 8*s, 8*s, fill=True, stroke=False)

    canvas.restoreState()


def get_logo_dimensions(scale: float = 1.0) -> tuple[float, float]:
    """
    Get the width and height of the logo at given scale.

    Useful for calculating layout positions when placing the logo.

    Args:
        scale: Scale factor (1.0 = 32 points)

    Returns:
        Tuple of (width, height) in points

    Example:
        >>> w, h = get_logo_dimensions(0.5)
        >>> print(f"Logo size: {w}x{h}")  # "Logo size: 16.0x16.0"
    """
    return (32 * scale, 32 * scale)


# ============================================================================
# PARAGRAPH STYLES
# ============================================================================
def get_custom_styles() -> dict[str, ParagraphStyle]:
    """
    Get custom paragraph styles for reports.

    Creates a complete set of ParagraphStyle objects for all text elements
    in PDF reports, using the premium black & white aesthetic with Inter
    font family (falling back to Helvetica if unavailable).

    Returns:
        Dictionary of ParagraphStyle objects with keys:
            - Title: Main report title (18pt, bold, centered, ALL CAPS)
            - CompanyName: Company name below title (11pt, medium)
            - Subtitle: Period and date info (9pt, muted)
            - SectionHeader: Section headers (10pt, bold)
            - Normal: Body text (9pt, regular)
            - TableCell: Table cell text with wrapping (8pt)
            - TableCellNumber: Right-aligned numbers (8pt)
            - TableHeader: Table header text (8pt, bold, white on black)
            - Footer: Page footer text (7pt, muted, centered)
            - MetricLabel: Summary label column (9pt, muted)
            - MetricValue: Summary value column (10pt, bold)
            - MetricValueLarge: Large metric values (14pt, bold)

    Example:
        >>> styles = get_custom_styles()
        >>> title = Paragraph("REPORT TITLE", styles["Title"])
    """
    base_styles = getSampleStyleSheet()
    fonts = get_font_family()

    custom_styles = {
        # Main report title - ALL CAPS, centered, bold
        "Title": ParagraphStyle(
            "CustomTitle",
            parent=base_styles["Title"],
            fontSize=18,
            textColor=PRIMARY_COLOR,
            spaceAfter=4,
            alignment=TA_CENTER,
            fontName=fonts['bold'],
            leading=22,
            # Letter spacing simulated via XML
        ),

        # Company name - medium weight, centered
        "CompanyName": ParagraphStyle(
            "CompanyName",
            parent=base_styles["Normal"],
            fontSize=11,
            textColor=PRIMARY_COLOR,
            spaceAfter=2,
            alignment=TA_CENTER,
            fontName=fonts['medium'],
        ),

        # Period and date info - muted, smaller
        "Subtitle": ParagraphStyle(
            "CustomSubtitle",
            parent=base_styles["Normal"],
            fontSize=9,
            textColor=TEXT_MUTED,
            spaceAfter=2,
            alignment=TA_CENTER,
            fontName=fonts['regular'],
        ),

        # Section headers - ALL CAPS, bold with line above
        "SectionHeader": ParagraphStyle(
            "SectionHeader",
            parent=base_styles["Heading2"],
            fontSize=10,
            textColor=PRIMARY_COLOR,
            spaceBefore=16,
            spaceAfter=8,
            fontName=fonts['bold'],
            borderPadding=0,
            leftIndent=0,
        ),

        # Normal body text
        "Normal": ParagraphStyle(
            "CustomNormal",
            parent=base_styles["Normal"],
            fontSize=9,
            textColor=TEXT_COLOR,
            fontName=fonts['regular'],
            leading=12,
        ),

        # Table cell text (wrappable)
        "TableCell": ParagraphStyle(
            "TableCell",
            parent=base_styles["Normal"],
            fontSize=8,
            textColor=TEXT_COLOR,
            fontName=fonts['regular'],
            leading=10,
            alignment=TA_LEFT,
        ),

        # Table cell for numbers - right aligned
        "TableCellNumber": ParagraphStyle(
            "TableCellNumber",
            parent=base_styles["Normal"],
            fontSize=8,
            textColor=TEXT_COLOR,
            fontName=fonts['regular'],
            leading=10,
            alignment=TA_RIGHT,
        ),

        # Table header text
        "TableHeader": ParagraphStyle(
            "TableHeader",
            parent=base_styles["Normal"],
            fontSize=8,
            textColor=WHITE,
            fontName=fonts['bold'],
            leading=10,
            alignment=TA_LEFT,
        ),

        # Footer text
        "Footer": ParagraphStyle(
            "Footer",
            parent=base_styles["Normal"],
            fontSize=7,
            textColor=TEXT_MUTED,
            alignment=TA_CENTER,
            fontName=fonts['regular'],
        ),

        # Metric label (left side of summary)
        "MetricLabel": ParagraphStyle(
            "MetricLabel",
            parent=base_styles["Normal"],
            fontSize=9,
            textColor=TEXT_MUTED,
            fontName=fonts['regular'],
        ),

        # Metric value (right side of summary) - bold
        "MetricValue": ParagraphStyle(
            "MetricValue",
            parent=base_styles["Normal"],
            fontSize=10,
            textColor=PRIMARY_COLOR,
            fontName=fonts['bold'],
            alignment=TA_RIGHT,
        ),

        # Large metric value for highlights
        "MetricValueLarge": ParagraphStyle(
            "MetricValueLarge",
            parent=base_styles["Normal"],
            fontSize=14,
            textColor=PRIMARY_COLOR,
            fontName=fonts['bold'],
            alignment=TA_RIGHT,
        ),
    }

    return custom_styles


# ============================================================================
# TABLE STYLES
# ============================================================================
def get_data_table_style() -> TableStyle:
    """
    Get table style for data tables.

    Creates a premium black & white table style with:
        - Solid black header row with white text
        - Alternating white/light gray row backgrounds
        - Clean horizontal-only borders
        - Proper padding and vertical alignment

    Returns:
        TableStyle configured for matched transactions, suspense items, etc.

    Note:
        Caller should add column-specific alignment overrides for numeric columns.
    """
    fonts = get_font_family()

    return TableStyle([
        # Header row - solid black background, white text
        ("BACKGROUND", (0, 0), (-1, 0), PRIMARY_COLOR),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("FONTNAME", (0, 0), (-1, 0), fonts['bold']),
        ("FONTSIZE", (0, 0), (-1, 0), 8),
        ("ALIGN", (0, 0), (-1, 0), "LEFT"),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 10),
        ("TOPPADDING", (0, 0), (-1, 0), 10),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),

        # Data rows - regular font
        ("FONTNAME", (0, 1), (-1, -1), fonts['regular']),
        ("FONTSIZE", (0, 1), (-1, -1), 8),
        ("TEXTCOLOR", (0, 1), (-1, -1), TEXT_COLOR),
        ("ALIGN", (0, 1), (-1, -1), "LEFT"),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 8),
        ("TOPPADDING", (0, 1), (-1, -1), 8),

        # Alternating row backgrounds
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, LIGHT_GRAY]),

        # Clean borders - only horizontal lines
        ("LINEBELOW", (0, 0), (-1, 0), 1, PRIMARY_COLOR),  # Under header
        ("LINEBELOW", (0, 1), (-1, -2), 0.5, BORDER_COLOR),  # Between rows
        ("LINEBELOW", (0, -1), (-1, -1), 1, PRIMARY_COLOR),  # Bottom of table

        # Vertical alignment
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ])


def get_summary_table_style() -> TableStyle:
    """
    Get table style for summary statistics cards.

    Creates a two-column card-style table with:
        - Left column: Muted gray labels, left-aligned
        - Right column: Bold black values, right-aligned
        - Subtle separator lines between rows
        - Outer border box
        - Consistent padding

    Returns:
        TableStyle configured for key-value summary displays
    """
    fonts = get_font_family()

    return TableStyle([
        # All cells base styling
        ("FONTNAME", (0, 0), (-1, -1), fonts['regular']),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),

        # Label column (left) - muted text, left aligned
        ("ALIGN", (0, 0), (0, -1), "LEFT"),
        ("TEXTCOLOR", (0, 0), (0, -1), TEXT_MUTED),

        # Value column (right) - bold black, right aligned
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("FONTNAME", (1, 0), (1, -1), fonts['bold']),
        ("TEXTCOLOR", (1, 0), (1, -1), PRIMARY_COLOR),

        # Subtle separator lines between rows
        ("LINEBELOW", (0, 0), (-1, -2), 0.5, BORDER_COLOR),

        # Outer border
        ("BOX", (0, 0), (-1, -1), 1, BORDER_COLOR),

        # Vertical alignment
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ])


def get_journal_table_style() -> TableStyle:
    """
    Get table style for journal entry tables.

    Creates a specialized table style for double-entry journals with:
        - Solid black header row
        - Right-aligned debit/credit columns (2, 3)
        - Alternating row backgrounds
        - Clean horizontal borders

    Returns:
        TableStyle configured for journal entry display

    Note:
        Totals row styling (bold, line above, gray background) should be
        added by the caller after creating the table.
    """
    fonts = get_font_family()

    return TableStyle([
        # Header row - solid black
        ("BACKGROUND", (0, 0), (-1, 0), PRIMARY_COLOR),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("FONTNAME", (0, 0), (-1, 0), fonts['bold']),
        ("FONTSIZE", (0, 0), (-1, 0), 8),
        ("ALIGN", (0, 0), (-1, 0), "LEFT"),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 10),
        ("TOPPADDING", (0, 0), (-1, 0), 10),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),

        # Data rows
        ("FONTNAME", (0, 1), (-1, -1), fonts['regular']),
        ("FONTSIZE", (0, 1), (-1, -1), 8),
        ("TEXTCOLOR", (0, 1), (-1, -1), TEXT_COLOR),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 8),
        ("TOPPADDING", (0, 1), (-1, -1), 8),

        # Right-align debit/credit columns (columns 2 and 3)
        ("ALIGN", (2, 0), (3, -1), "RIGHT"),

        # Alternating rows
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, LIGHT_GRAY]),

        # Clean borders
        ("LINEBELOW", (0, 0), (-1, 0), 1, PRIMARY_COLOR),
        ("LINEBELOW", (0, 1), (-1, -2), 0.5, BORDER_COLOR),
        ("LINEBELOW", (0, -1), (-1, -1), 1, PRIMARY_COLOR),

        # Vertical alignment
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ])


def get_header_table_style() -> TableStyle:
    """
    Get table style for report header section.

    Creates a header table style with:
        - Solid black background
        - White bold text
        - Centered alignment
        - Generous padding

    Returns:
        TableStyle for header/title tables
    """
    fonts = get_font_family()

    return TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), PRIMARY_COLOR),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("FONTNAME", (0, 0), (-1, 0), fonts['bold']),
        ("FONTSIZE", (0, 0), (-1, 0), 12),
        ("ALIGN", (0, 0), (-1, 0), "CENTER"),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
        ("TOPPADDING", (0, 0), (-1, 0), 12),
    ])


# ============================================================================
# RESPONSIVE COLUMN WIDTHS
# ============================================================================
def get_column_widths(table_type: str, content_width: float = None) -> list[float]:
    """
    Get responsive column widths based on table type.

    Calculates column widths as percentages of available content width,
    ensuring tables fit properly regardless of page size.

    Args:
        table_type: One of:
            - 'matches': 8 columns (Date, Desc, Bank Amt, Doc#, Doc Amt, Diff, Match, Conf)
            - 'suspense': 7 columns (Date, Desc, Amount, Source, Reason, Action, Status)
            - 'transactions': 7 columns (Date, Desc, Ref, Amount, Type, Status, Category)
            - 'journal': 6 columns (Date, Account, Debit, Credit, Desc, Ref)
            - 'summary': 2 columns (Label, Value)
        content_width: Available width in points (defaults to CONTENT_WIDTH)

    Returns:
        List of column widths in points

    Example:
        >>> widths = get_column_widths('matches')
        >>> table = Table(data, colWidths=widths)
    """
    if content_width is None:
        content_width = CONTENT_WIDTH

    # Column width percentages for each table type
    percentages = {
        'matches': [0.10, 0.28, 0.12, 0.10, 0.12, 0.10, 0.08, 0.08],  # 8 cols
        'suspense': [0.10, 0.24, 0.12, 0.08, 0.14, 0.18, 0.10],  # 7 cols
        'transactions': [0.10, 0.28, 0.10, 0.12, 0.10, 0.10, 0.14],  # 7 cols
        'journal': [0.10, 0.22, 0.14, 0.14, 0.24, 0.12],  # 6 cols
        'summary': [0.60, 0.40],  # 2 cols
    }

    pcts = percentages.get(table_type, [])
    return [content_width * p for p in pcts]


# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================
def format_currency(amount: float, currency: str = "MYR") -> str:
    """
    Format amount as currency string with proper parentheses for negatives.

    Args:
        amount: Numeric amount
        currency: Currency code

    Returns:
        Formatted currency string
    """
    symbols = {
        "MYR": "RM",
        "USD": "$",
        "EUR": "\u20ac",
        "GBP": "\u00a3",
        "SGD": "S$",
    }
    symbol = symbols.get(currency, currency + " ")

    if amount < 0:
        return f"({symbol}{abs(amount):,.2f})"
    return f"{symbol}{amount:,.2f}"


def format_percentage(value: float) -> str:
    """
    Format value as percentage.

    Args:
        value: Numeric value (0-100)

    Returns:
        Formatted percentage string
    """
    return f"{value:.1f}%"


def truncate_text(text: str, max_length: int = 40) -> str:
    """
    Truncate text to fit in table cells.
    Use Paragraph with wrapping for longer content instead.

    Args:
        text: Text to truncate
        max_length: Maximum length

    Returns:
        Truncated text with ellipsis if needed
    """
    if not text:
        return ""
    if len(text) <= max_length:
        return text
    return text[:max_length - 3] + "..."


def format_date(date_str: str) -> str:
    """
    Format date string for display in tables.

    Currently passes through the input unchanged. Future versions
    may implement locale-specific date formatting.

    Args:
        date_str: Date string in any format

    Returns:
        Formatted date string (currently unchanged)

    Note:
        This is a placeholder for future date formatting logic.
    """
    if not date_str:
        return ""
    return date_str


def draw_section_line(canvas, x1: float, y: float, x2: float, weight: float = 1.0, color=None) -> None:
    """
    Draw a horizontal section divider line on the canvas.

    Useful for adding visual separation between report sections.

    Args:
        canvas: ReportLab canvas object
        x1: Starting x coordinate in points
        y: Y coordinate in points
        x2: Ending x coordinate in points
        weight: Line thickness in points (default 1.0)
        color: ReportLab color object (defaults to PRIMARY_COLOR)

    Example:
        >>> draw_section_line(canvas, MARGIN, 500, PAGE_WIDTH - MARGIN)
    """
    if color is None:
        color = PRIMARY_COLOR

    canvas.saveState()
    canvas.setStrokeColor(color)
    canvas.setLineWidth(weight)
    canvas.line(x1, y, x2, y)
    canvas.restoreState()
