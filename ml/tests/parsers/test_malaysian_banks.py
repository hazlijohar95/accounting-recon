"""
Tests for Malaysian bank statement parser.
"""

import pytest
from models import BankType, BankTransaction


class TestMalaysianBankParser:
    """Tests for MalaysianBankParser."""

    @pytest.fixture
    def parser(self):
        """Create a parser instance."""
        from parsers.malaysian_banks import MalaysianBankParser
        return MalaysianBankParser()

    # Bank Type Detection Tests

    def test_detect_maybank(self, parser, sample_maybank_text):
        """Test Maybank detection."""
        parser.clear_cache()  # Clear LRU cache
        assert parser.detect_bank_type(sample_maybank_text) == BankType.MAYBANK

    def test_detect_maybank_from_maybank2u(self, parser):
        """Test Maybank detection from Maybank2U reference."""
        parser.clear_cache()
        text = "MAYBANK2U Online Banking Statement"
        assert parser.detect_bank_type(text) == BankType.MAYBANK

    def test_detect_cimb(self, parser, sample_cimb_text):
        """Test CIMB detection."""
        parser.clear_cache()
        assert parser.detect_bank_type(sample_cimb_text) == BankType.CIMB

    def test_detect_public_bank(self, parser):
        """Test Public Bank detection."""
        parser.clear_cache()
        text = "PUBLIC BANK BERHAD\nStatement of Account"
        assert parser.detect_bank_type(text) == BankType.PUBLIC_BANK

    def test_detect_rhb(self, parser):
        """Test RHB Bank detection."""
        parser.clear_cache()
        text = "RHB BANK BERHAD\ne-Statement"
        assert parser.detect_bank_type(text) == BankType.RHB

    def test_detect_hong_leong(self, parser):
        """Test Hong Leong Bank detection."""
        parser.clear_cache()
        text = "Hong Leong Bank Berhad\nAccount Statement"
        assert parser.detect_bank_type(text) == BankType.HONG_LEONG

    def test_detect_ambank(self, parser):
        """Test AmBank detection."""
        parser.clear_cache()
        text = "AMBANK (M) BERHAD\nStatement"
        assert parser.detect_bank_type(text) == BankType.AMBANK

    def test_detect_bank_islam(self, parser):
        """Test Bank Islam detection."""
        parser.clear_cache()
        text = "BANK ISLAM MALAYSIA BERHAD"
        assert parser.detect_bank_type(text) == BankType.BANK_ISLAM

    def test_detect_ocbc(self, parser):
        """Test OCBC Bank detection."""
        parser.clear_cache()
        text = "OCBC Bank (Malaysia) Berhad"
        assert parser.detect_bank_type(text) == BankType.OCBC

    def test_detect_uob(self, parser):
        """Test UOB detection."""
        parser.clear_cache()
        text = "United Overseas Bank (Malaysia) Bhd"
        assert parser.detect_bank_type(text) == BankType.UOB

    def test_detect_hsbc(self, parser):
        """Test HSBC detection."""
        parser.clear_cache()
        text = "HSBC Bank Malaysia Berhad"
        assert parser.detect_bank_type(text) == BankType.HSBC

    def test_detect_unknown_bank(self, parser):
        """Test unknown bank returns UNKNOWN type."""
        parser.clear_cache()
        text = "Random text without bank name"
        assert parser.detect_bank_type(text) == BankType.UNKNOWN

    def test_detection_uses_first_2000_chars(self, parser):
        """Test that detection only looks at first 2000 characters."""
        parser.clear_cache()
        # Bank name after 2000 chars should not be detected
        text = "A" * 2100 + "MAYBANK"
        assert parser.detect_bank_type(text) == BankType.UNKNOWN

    # Transaction Parsing Tests

    def test_parse_transactions_maybank(self, parser, sample_maybank_text):
        """Test transaction parsing for Maybank format."""
        transactions = parser.parse_transactions(sample_maybank_text, BankType.MAYBANK)

        assert len(transactions) > 0
        assert all(isinstance(tx, BankTransaction) for tx in transactions)

    def test_parse_transactions_cimb_cr_dr_format(self, parser, sample_cimb_text):
        """Test parsing CIMB CR/DR format amounts."""
        transactions = parser.parse_transactions(sample_cimb_text, BankType.CIMB)

        # Should handle CR (credit) and DR (debit) suffixes
        assert len(transactions) > 0

        # Find the salary credit (positive amount)
        credits = [tx for tx in transactions if tx.amount > 0]
        assert len(credits) > 0

    def test_parse_date_format_dd_mm_yyyy(self, parser):
        """Test parsing DD/MM/YYYY date format."""
        text = "01/01/2024  Test Transaction  1,000.00"
        transactions = parser.parse_transactions(text, BankType.MAYBANK)

        assert len(transactions) == 1
        assert transactions[0].date == "2024-01-01"

    def test_parse_date_format_dd_mmm_yyyy(self, parser):
        """Test parsing DD MMM YYYY date format."""
        text = "15 Jan 2024  Test Transaction  500.00"
        transactions = parser.parse_transactions(text, BankType.CIMB)

        assert len(transactions) == 1
        assert transactions[0].date == "2024-01-15"

    def test_parse_date_format_iso(self, parser):
        """Test parsing YYYY-MM-DD (ISO) date format."""
        text = "2024-02-28  Test Transaction  750.00"
        transactions = parser.parse_transactions(text, BankType.MAYBANK)

        assert len(transactions) == 1
        assert transactions[0].date == "2024-02-28"

    def test_parse_amount_with_commas(self, parser):
        """Test parsing amounts with comma separators."""
        text = "01/01/2024  Large Transfer  1,234,567.89"
        transactions = parser.parse_transactions(text, BankType.MAYBANK)

        assert len(transactions) == 1
        assert transactions[0].amount == 1234567.89

    def test_parse_negative_amount(self, parser):
        """Test parsing negative amounts."""
        text = "01/01/2024  Payment Out  -500.00"
        transactions = parser.parse_transactions(text, BankType.MAYBANK)

        assert len(transactions) == 1
        assert transactions[0].amount == -500.00

    def test_parse_amount_dr_suffix(self, parser):
        """Test parsing amount with DR (debit) suffix."""
        text = "01/01/2024  Withdrawal  300.00 DR"
        transactions = parser.parse_transactions(text, BankType.CIMB)

        assert len(transactions) == 1
        assert transactions[0].amount == -300.00

    def test_parse_amount_cr_suffix(self, parser):
        """Test parsing amount with CR (credit) suffix."""
        text = "01/01/2024  Deposit  200.00 CR"
        transactions = parser.parse_transactions(text, BankType.CIMB)

        assert len(transactions) == 1
        assert transactions[0].amount == 200.00

    def test_extract_reference_from_description(self, parser):
        """Test reference number extraction."""
        text = "01/01/2024  Payment REF:ABC123  100.00"
        transactions = parser.parse_transactions(text, BankType.MAYBANK)

        assert len(transactions) == 1
        assert transactions[0].reference == "ABC123"

    def test_extract_reference_txn_format(self, parser):
        """Test TXN reference format extraction."""
        text = "01/01/2024  Transfer TXN:TRX987654  500.00"
        transactions = parser.parse_transactions(text, BankType.MAYBANK)

        assert len(transactions) == 1
        assert transactions[0].reference == "TRX987654"

    def test_extract_reference_inv_format(self, parser):
        """Test INV reference format extraction."""
        text = "01/01/2024  Invoice Payment INV:INV-2024-001  1500.00"
        transactions = parser.parse_transactions(text, BankType.MAYBANK)

        assert len(transactions) == 1
        assert transactions[0].reference == "INV-2024-001"

    def test_skip_empty_lines(self, parser):
        """Test that empty lines are skipped."""
        text = """

        01/01/2024  Transaction 1  100.00

        02/01/2024  Transaction 2  200.00

        """
        transactions = parser.parse_transactions(text, BankType.MAYBANK)
        assert len(transactions) == 2

    def test_skip_header_lines(self, parser):
        """Test that short header lines are skipped."""
        text = """DATE DESC AMOUNT
        01/01/2024  Actual Transaction  100.00"""
        transactions = parser.parse_transactions(text, BankType.MAYBANK)
        assert len(transactions) == 1

    def test_transaction_confidence_is_0_6(self, parser):
        """Test regex-parsed transactions have confidence 0.6."""
        text = "01/01/2024  Test Transaction  100.00"
        transactions = parser.parse_transactions(text, BankType.MAYBANK)

        assert transactions[0].confidence == 0.6

    # Metadata Parsing Tests

    def test_parse_statement_metadata_account_number(self, parser, sample_maybank_text):
        """Test account number extraction from metadata."""
        metadata = parser.parse_statement_metadata(sample_maybank_text)
        assert "account_number" in metadata

    def test_parse_statement_metadata_period(self, parser, sample_maybank_text):
        """Test statement period extraction."""
        metadata = parser.parse_statement_metadata(sample_maybank_text)

        assert "period_start" in metadata
        assert "period_end" in metadata
        assert metadata["period_start"] == "2024-01-01"
        assert metadata["period_end"] == "2024-01-31"

    def test_parse_statement_metadata_balances(self, parser, sample_maybank_text):
        """Test balance extraction from metadata."""
        metadata = parser.parse_statement_metadata(sample_maybank_text)

        assert "opening_balance" in metadata
        assert "closing_balance" in metadata
        assert metadata["opening_balance"] == 10000.00
        assert metadata["closing_balance"] == 14475.00

    def test_parse_statement_metadata_missing_data(self, parser):
        """Test metadata parsing with missing data."""
        text = "Some random text without any bank information"
        metadata = parser.parse_statement_metadata(text)

        # Should return empty dict when no data found
        assert isinstance(metadata, dict)

    # Cache Tests

    def test_cache_is_used(self, parser):
        """Test that LRU cache is used for bank detection."""
        text = "MAYBANK Statement"
        parser.clear_cache()

        # First call
        result1 = parser.detect_bank_type(text)
        # Second call (should use cache)
        result2 = parser.detect_bank_type(text)

        assert result1 == result2 == BankType.MAYBANK

        # Check cache info
        cache_info = parser.detect_bank_type.cache_info()
        assert cache_info.hits >= 1

    def test_clear_cache(self, parser):
        """Test cache clearing."""
        parser.detect_bank_type("MAYBANK")
        parser.clear_cache()

        cache_info = parser.detect_bank_type.cache_info()
        assert cache_info.hits == 0
        assert cache_info.misses == 0
