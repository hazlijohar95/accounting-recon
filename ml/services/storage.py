"""
Cloudflare R2 storage service
S3-compatible object storage for documents
"""

import boto3
from botocore.config import Config
import structlog
from typing import Optional
import httpx

from config import get_settings

logger = structlog.get_logger()


class StorageService:
    """Service for interacting with Cloudflare R2 storage"""

    def __init__(self):
        settings = get_settings()
        self._client = boto3.client(
            "s3",
            endpoint_url=settings.r2_endpoint_url,
            aws_access_key_id=settings.r2_access_key_id,
            aws_secret_access_key=settings.r2_secret_access_key,
            config=Config(
                signature_version="s3v4",
                retries={"max_attempts": 3, "mode": "standard"},
            ),
        )
        self._bucket = settings.r2_bucket_name
        self._http_client = httpx.AsyncClient(timeout=60.0)

    async def download_file(self, storage_url: str) -> bytes:
        """
        Download file from R2 storage URL with streaming size validation.

        Args:
            storage_url: Full URL to the file in R2

        Returns:
            File contents as bytes

        Raises:
            ValueError: If file exceeds max_file_size_mb limit (checked via header AND streaming)
            httpx.HTTPError: On network errors
        """
        logger.info("downloading_file", url=storage_url)
        settings = get_settings()
        max_bytes = settings.max_file_size_mb * 1024 * 1024

        try:
            # SECURITY: Use streaming to prevent memory exhaustion DoS attacks
            # 1. First check Content-Length header if present
            # 2. Then enforce limit during streaming (handles missing/fake headers)
            async with self._http_client.stream("GET", storage_url) as response:
                response.raise_for_status()

                # Check Content-Length header first (early rejection)
                content_length = response.headers.get("content-length")
                if content_length:
                    declared_size = int(content_length)
                    if declared_size > max_bytes:
                        logger.error(
                            "file_too_large_header",
                            url=storage_url[:100],
                            declared_size=declared_size,
                            max_size=max_bytes,
                        )
                        raise ValueError(
                            f"File too large: {declared_size} bytes (max: {max_bytes} bytes / {settings.max_file_size_mb} MB)"
                        )

                # Stream download with size enforcement (handles missing/fake Content-Length)
                chunks = []
                total_bytes = 0

                async for chunk in response.aiter_bytes(chunk_size=65536):  # 64KB chunks
                    total_bytes += len(chunk)
                    if total_bytes > max_bytes:
                        logger.error(
                            "file_too_large_streaming",
                            url=storage_url[:100],
                            bytes_received=total_bytes,
                            max_size=max_bytes,
                        )
                        raise ValueError(
                            f"File exceeds size limit during download: {total_bytes}+ bytes (max: {max_bytes} bytes / {settings.max_file_size_mb} MB)"
                        )
                    chunks.append(chunk)

                logger.info("download_complete", bytes=total_bytes)
                return b"".join(chunks)

        except httpx.HTTPError as e:
            logger.error("download_failed", url=storage_url[:100], error=str(e))
            raise

    def download_file_sync(self, storage_id: str) -> bytes:
        """
        Download file from R2 using storage ID (sync version)

        Args:
            storage_id: R2 object key

        Returns:
            File contents as bytes
        """
        logger.info("downloading_file_sync", storage_id=storage_id)

        try:
            response = self._client.get_object(Bucket=self._bucket, Key=storage_id)
            return response["Body"].read()
        except Exception as e:
            logger.error("download_failed", storage_id=storage_id, error=str(e))
            raise

    def upload_file(
        self,
        file_content: bytes,
        storage_id: str,
        content_type: str = "application/octet-stream",
        expires_in: int = 3600,
    ) -> str:
        """
        Upload file to R2 storage

        Args:
            file_content: File contents as bytes
            storage_id: R2 object key to use
            content_type: MIME type of the file
            expires_in: Presigned URL expiration time in seconds (default: 1 hour)

        Returns:
            Presigned URL to access the uploaded file
        """
        logger.info("uploading_file", storage_id=storage_id, size=len(file_content))

        try:
            self._client.put_object(
                Bucket=self._bucket,
                Key=storage_id,
                Body=file_content,
                ContentType=content_type,
            )

            # Generate presigned URL for reliable access
            # This works regardless of bucket public access settings
            presigned_url = self._client.generate_presigned_url(
                "get_object",
                Params={"Bucket": self._bucket, "Key": storage_id},
                ExpiresIn=expires_in,
            )

            logger.info(
                "upload_complete",
                storage_id=storage_id,
                expires_in=expires_in,
            )

            return presigned_url
        except Exception as e:
            logger.error("upload_failed", storage_id=storage_id, error=str(e))
            raise

    def generate_presigned_url(self, storage_id: str, expires_in: int = 3600) -> str:
        """
        Generate a presigned URL for temporary access

        Args:
            storage_id: R2 object key
            expires_in: URL expiration time in seconds

        Returns:
            Presigned URL
        """
        return self._client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self._bucket, "Key": storage_id},
            ExpiresIn=expires_in,
        )

    async def close(self):
        """Close the HTTP client"""
        await self._http_client.aclose()
