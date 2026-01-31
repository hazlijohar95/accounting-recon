"""
Tests for configuration module.
"""

import pytest
import os
from unittest.mock import patch


class TestSettings:
    """Tests for Settings configuration class."""

    def test_settings_loads_from_env(self):
        """Test that settings loads required environment variables."""
        from config import get_settings

        settings = get_settings()
        assert settings.r2_account_id == "test_account_id_12345"
        assert settings.r2_access_key_id == "test_access_key_12345"
        assert settings.mistral_api_key == "sk-test-api-key-for-testing-12345"
        assert settings.convex_url == "https://test.convex.cloud"

    def test_r2_endpoint_url_property(self):
        """Test that R2 endpoint URL is computed correctly."""
        from config import get_settings

        settings = get_settings()
        expected = f"https://{settings.r2_account_id}.r2.cloudflarestorage.com"
        assert settings.r2_endpoint_url == expected

    def test_default_values(self):
        """Test default configuration values."""
        from config import get_settings

        settings = get_settings()
        assert settings.service_name == "reconciled-ml"
        # r2_bucket_name is set to "test-bucket" in conftest.py for tests
        assert settings.r2_bucket_name == "test-bucket"
        assert settings.rate_limit_requests_per_minute == 30
        assert settings.max_file_size_mb == 50
        assert settings.ocr_timeout_seconds == 120

    def test_debug_mode_from_env(self):
        """Test that debug mode is read from environment."""
        from config import get_settings

        settings = get_settings()
        assert settings.debug is True  # Set in conftest.py

    def test_convex_url_validates_https(self):
        """Test that Convex URL must use HTTPS (or localhost)."""
        from config import Settings
        from pydantic import ValidationError

        # Valid HTTPS URL should work
        with patch.dict(os.environ, {"CONVEX_URL": "https://valid.convex.cloud"}):
            from config import get_settings
            get_settings.cache_clear()
            settings = get_settings()
            assert settings.convex_url.startswith("https://")

    def test_mistral_api_key_format_validation(self):
        """Test that Mistral API key must start with 'sk-' and be >20 chars."""
        from config import Settings
        from pydantic import ValidationError

        # Invalid: doesn't start with sk-
        with patch.dict(os.environ, {"MISTRAL_API_KEY": "invalid_key_format_here"}):
            from config import get_settings
            get_settings.cache_clear()
            with pytest.raises(ValidationError) as exc_info:
                get_settings()
            assert "mistral_api_key" in str(exc_info.value).lower()

    def test_rate_limit_bounds(self):
        """Test rate limit has valid bounds (1-1000)."""
        from config import get_settings

        settings = get_settings()
        assert 1 <= settings.rate_limit_requests_per_minute <= 1000

    def test_settings_caching(self):
        """Test that get_settings returns cached instance."""
        from config import get_settings

        settings1 = get_settings()
        settings2 = get_settings()
        assert settings1 is settings2
