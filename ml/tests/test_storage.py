"""
Tests for storage service (Cloudflare R2).
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
import httpx


class TestStorageService:
    """Tests for StorageService."""

    @pytest.fixture
    def storage_service(self, mock_boto3_client, mock_httpx_client):
        """Create StorageService with mocked clients."""
        with patch('boto3.client', return_value=mock_boto3_client):
            from services.storage import StorageService
            service = StorageService()
            service._http_client = mock_httpx_client
            return service

    @pytest.mark.asyncio
    async def test_download_file_success(self, storage_service):
        """Test successful file download."""
        content = await storage_service.download_file("https://r2.example.com/file.pdf")
        assert content == b"mock file content"

    @pytest.mark.asyncio
    async def test_download_file_checks_size_limit(self, mock_httpx_client, mock_boto3_client):
        """Test that download checks file size against limit."""
        # Set a large content-length
        mock_response = MagicMock()
        mock_response.content = b"x" * 100
        mock_response.headers = {"content-length": str(60 * 1024 * 1024)}  # 60MB
        mock_response.raise_for_status = MagicMock()
        mock_httpx_client.get = AsyncMock(return_value=mock_response)

        with patch('boto3.client', return_value=mock_boto3_client):
            from services.storage import StorageService
            service = StorageService()
            service._http_client = mock_httpx_client

            with pytest.raises(ValueError) as exc_info:
                await service.download_file("https://r2.example.com/large.pdf")

            assert "too large" in str(exc_info.value).lower()

    @pytest.mark.asyncio
    async def test_download_file_http_error(self, mock_httpx_client, mock_boto3_client):
        """Test download handles HTTP errors."""
        mock_httpx_client.get = AsyncMock(side_effect=httpx.HTTPError("Connection failed"))

        with patch('boto3.client', return_value=mock_boto3_client):
            from services.storage import StorageService
            service = StorageService()
            service._http_client = mock_httpx_client

            with pytest.raises(httpx.HTTPError):
                await service.download_file("https://r2.example.com/file.pdf")

    def test_download_file_sync(self, storage_service, mock_boto3_client):
        """Test synchronous file download."""
        storage_service._client = mock_boto3_client
        content = storage_service.download_file_sync("documents/test.pdf")
        assert content == b"mock content"

    def test_upload_file_success(self, storage_service, mock_boto3_client):
        """Test successful file upload."""
        storage_service._client = mock_boto3_client
        url = storage_service.upload_file(
            b"file content",
            "documents/test.pdf",
            "application/pdf"
        )
        assert "presigned" in url

    def test_upload_file_calls_put_object(self, storage_service, mock_boto3_client):
        """Test upload calls S3 put_object."""
        storage_service._client = mock_boto3_client
        storage_service.upload_file(b"content", "key", "application/pdf")

        mock_boto3_client.put_object.assert_called_once()
        call_kwargs = mock_boto3_client.put_object.call_args.kwargs
        assert call_kwargs["Key"] == "key"
        assert call_kwargs["ContentType"] == "application/pdf"

    def test_upload_returns_presigned_url(self, storage_service, mock_boto3_client):
        """Test upload returns presigned URL."""
        storage_service._client = mock_boto3_client
        url = storage_service.upload_file(b"content", "key")

        mock_boto3_client.generate_presigned_url.assert_called()

    def test_generate_presigned_url(self, storage_service, mock_boto3_client):
        """Test presigned URL generation."""
        storage_service._client = mock_boto3_client
        url = storage_service.generate_presigned_url("documents/test.pdf", expires_in=7200)

        assert "presigned" in url
        mock_boto3_client.generate_presigned_url.assert_called_with(
            "get_object",
            Params={"Bucket": storage_service._bucket, "Key": "documents/test.pdf"},
            ExpiresIn=7200
        )

    @pytest.mark.asyncio
    async def test_close(self, storage_service):
        """Test closing the HTTP client."""
        await storage_service.close()
        storage_service._http_client.aclose.assert_called_once()
