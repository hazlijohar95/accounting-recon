"""
Configuration Management for Reconciled ML Service.

This module provides centralized configuration management using Pydantic
Settings. All configuration is loaded from environment variables with
validation and type coercion.

Required Environment Variables:
    - R2_ACCOUNT_ID: Cloudflare R2 account ID
    - R2_ACCESS_KEY_ID: R2 access key
    - R2_SECRET_ACCESS_KEY: R2 secret key
    - MISTRAL_API_KEY: Mistral API key for OCR
    - CONVEX_URL: Convex deployment URL
    - CONVEX_WEBHOOK_SECRET: Secret for webhook authentication

Optional Environment Variables:
    - DEBUG: Enable debug mode (default: False)
    - RATE_LIMIT_REQUESTS_PER_MINUTE: Rate limit (default: 30)
    - R2_BUCKET_NAME: R2 bucket name (default: reconciled-documents)
    - MAX_FILE_SIZE_MB: Max upload size (default: 50)
    - OCR_TIMEOUT_SECONDS: OCR timeout (default: 120)

Usage:
    >>> from config import get_settings
    >>> settings = get_settings()
    >>> print(settings.mistral_api_key[:10])

    Settings are cached via lru_cache for performance.
"""

from pydantic_settings import BaseSettings
from pydantic import Field, field_validator, model_validator
from functools import lru_cache
from typing import Self


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.

    Uses Pydantic Settings for automatic environment variable loading,
    type coercion, and validation. Supports .env file for local development.

    Attributes:
        service_name: Service identifier (default: reconciled-ml)
        debug: Enable debug mode for development
        rate_limit_requests_per_minute: API rate limit per IP
        r2_account_id: Cloudflare R2 account ID
        r2_access_key_id: R2 access key ID
        r2_secret_access_key: R2 secret access key
        r2_bucket_name: R2 bucket name for document storage
        mistral_api_key: Mistral API key for OCR
        convex_url: Convex deployment URL for webhooks
        convex_webhook_secret: Secret for webhook authentication
        max_file_size_mb: Maximum file upload size in MB
        ocr_timeout_seconds: Timeout for OCR operations

    Properties:
        r2_endpoint_url: Computed R2 endpoint URL from account ID

    Example:
        >>> settings = Settings()
        >>> print(settings.r2_endpoint_url)
        https://xxx.r2.cloudflarestorage.com
    """

    # Service configuration
    service_name: str = "reconciled-ml"
    debug: bool = False

    # Rate limiting
    rate_limit_requests_per_minute: int = Field(default=30, ge=1, le=1000)

    # Cloudflare R2 Storage
    r2_account_id: str = Field(..., min_length=10)
    r2_access_key_id: str = Field(..., min_length=10)
    r2_secret_access_key: str = Field(..., min_length=10)
    r2_bucket_name: str = "reconciled-documents"

    # R2 endpoint (S3-compatible)
    @property
    def r2_endpoint_url(self) -> str:
        return f"https://{self.r2_account_id}.r2.cloudflarestorage.com"

    # Mistral API
    mistral_api_key: str = Field(..., min_length=10)

    # Convex webhook
    convex_url: str = Field(..., min_length=10)  # e.g., https://xxx.convex.cloud
    convex_webhook_secret: str = Field(..., min_length=10)

    # Processing limits
    max_file_size_mb: int = Field(default=50, ge=1, le=200)
    ocr_timeout_seconds: int = Field(default=120, ge=10, le=600)

    # AWS Bedrock (for agent LLM)
    # Note: These default to empty strings but are validated if agent features are used
    aws_region: str = Field(default="us-east-1")
    aws_access_key_id: str = Field(default="")
    aws_secret_access_key: str = Field(default="")
    bedrock_model_id: str = Field(default="anthropic.claude-3-haiku-20240307-v1:0")

    # External API keys (for agent tools)
    clearbit_api_key: str = Field(default="")
    serper_api_key: str = Field(default="")

    # Feature flags
    enable_agent_features: bool = Field(default=False)

    @field_validator("convex_url")
    @classmethod
    def validate_https_url(cls, v: str) -> str:
        """Ensure Convex URL uses HTTPS in production"""
        if not v.startswith("https://") and not v.startswith("http://localhost"):
            raise ValueError("Convex URL must use HTTPS")
        return v

    @field_validator("mistral_api_key")
    @classmethod
    def validate_api_key_format(cls, v: str) -> str:
        """Validation for Mistral API key format - requires both prefix AND length"""
        # SECURITY: Require BOTH conditions to prevent weak keys
        if v.startswith("sk-") and len(v) > 20:
            return v
        raise ValueError(
            "Invalid Mistral API key format - must start with 'sk-' and be > 20 characters"
        )

    @model_validator(mode="after")
    def validate_aws_credentials_if_agent_enabled(self) -> Self:
        """
        Validate AWS credentials are present when agent features are enabled.

        SECURITY: Fail fast at startup instead of with cryptic errors at runtime.
        This prevents deployed services from partially working then failing
        when users try to use agent features.
        """
        if self.enable_agent_features:
            if not self.aws_access_key_id or len(self.aws_access_key_id) < 16:
                raise ValueError(
                    "AWS_ACCESS_KEY_ID is required when ENABLE_AGENT_FEATURES=true"
                )
            if not self.aws_secret_access_key or len(self.aws_secret_access_key) < 16:
                raise ValueError(
                    "AWS_SECRET_ACCESS_KEY is required when ENABLE_AGENT_FEATURES=true"
                )
        return self

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """
    Get cached settings instance.

    Returns a singleton Settings instance, cached via lru_cache to avoid
    repeated environment variable parsing.

    Returns:
        Validated Settings instance

    Raises:
        ValidationError: If required environment variables are missing
                        or have invalid values

    Note:
        Settings are loaded once and cached. To reload settings (e.g.,
        during testing), clear the cache with get_settings.cache_clear().
    """
    return Settings()
