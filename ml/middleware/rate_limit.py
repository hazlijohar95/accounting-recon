"""
Token Bucket Rate Limiter for Per-User Rate Limiting.

This module provides a token bucket rate limiter implementation that allows
per-user (company) rate limiting with configurable burst capacity.

Token Bucket Algorithm:
- Each user has a bucket with a maximum capacity of tokens
- Tokens are refilled at a constant rate (tokens per second)
- Each request consumes one token
- If no tokens available, request is rate limited

Benefits over simple counter:
- Allows burst traffic up to capacity
- Smooths out request rate over time
- Memory efficient (one dict entry per active user)

Usage:
    limiter = TokenBucketRateLimiter(rate=0.5, capacity=30)

    # In endpoint:
    if not await limiter.acquire(company_id):
        raise HTTPException(429, "Rate limit exceeded")

Example with 30/min limit:
    - rate=0.5 tokens/second (30/60=0.5)
    - capacity=30 tokens (allows burst up to 30)
    - After burst, user can make 1 request every 2 seconds
"""

import asyncio
import time
from collections import defaultdict
from typing import Optional

import structlog

logger = structlog.get_logger()


class TokenBucketRateLimiter:
    """
    Token bucket rate limiter with configurable rate and capacity.

    Thread-safe implementation using asyncio.Lock for concurrent access.
    Automatically cleans up stale buckets to prevent memory leaks.

    Attributes:
        rate: Token refill rate (tokens per second)
        capacity: Maximum bucket capacity (burst limit)
    """

    def __init__(
        self,
        rate: float,
        capacity: int,
        cleanup_interval: int = 300,  # 5 minutes
    ):
        """
        Initialize the rate limiter.

        Args:
            rate: Tokens to add per second (e.g., 0.5 for 30/min)
            capacity: Maximum tokens in bucket (burst limit)
            cleanup_interval: Seconds between stale bucket cleanup
        """
        self.rate = rate
        self.capacity = capacity
        self.cleanup_interval = cleanup_interval

        # Store buckets as {key: {"tokens": float, "last_update": float}}
        self._buckets: dict[str, dict] = defaultdict(
            lambda: {"tokens": capacity, "last_update": time.time()}
        )
        self._lock = asyncio.Lock()
        self._last_cleanup = time.time()

    async def acquire(self, key: str) -> bool:
        """
        Try to acquire a token for the given key.

        Refills tokens based on time elapsed since last request,
        then attempts to consume one token.

        Args:
            key: Unique identifier for the rate limit bucket (e.g., company_id)

        Returns:
            True if token acquired (request allowed), False if rate limited
        """
        async with self._lock:
            bucket = self._buckets[key]
            now = time.time()

            # Refill tokens based on elapsed time
            elapsed = now - bucket["last_update"]
            bucket["tokens"] = min(
                self.capacity,
                bucket["tokens"] + elapsed * self.rate
            )
            bucket["last_update"] = now

            # Try to consume a token
            if bucket["tokens"] >= 1:
                bucket["tokens"] -= 1
                return True

            return False

    async def get_tokens(self, key: str) -> float:
        """
        Get current token count for a key (for debugging/monitoring).

        Args:
            key: Bucket identifier

        Returns:
            Current token count (may be fractional)
        """
        async with self._lock:
            bucket = self._buckets[key]
            now = time.time()

            # Calculate current tokens without modifying bucket
            elapsed = now - bucket["last_update"]
            return min(
                self.capacity,
                bucket["tokens"] + elapsed * self.rate
            )

    async def get_retry_after(self, key: str) -> int:
        """
        Get seconds until next token is available.

        Args:
            key: Bucket identifier

        Returns:
            Seconds to wait before retrying (0 if tokens available)
        """
        tokens = await self.get_tokens(key)
        if tokens >= 1:
            return 0

        # Calculate time until we have 1 token
        tokens_needed = 1 - tokens
        return int(tokens_needed / self.rate) + 1

    async def cleanup_stale_buckets(self, max_age: int = 3600) -> int:
        """
        Remove buckets that haven't been accessed recently.

        Should be called periodically to prevent memory growth.

        Args:
            max_age: Maximum seconds since last access before cleanup

        Returns:
            Number of buckets removed
        """
        async with self._lock:
            now = time.time()

            # Don't cleanup too frequently
            if now - self._last_cleanup < self.cleanup_interval:
                return 0

            self._last_cleanup = now
            stale_keys = []

            for key, bucket in self._buckets.items():
                if now - bucket["last_update"] > max_age:
                    stale_keys.append(key)

            for key in stale_keys:
                del self._buckets[key]

            if stale_keys:
                logger.info(
                    "rate_limit_cleanup",
                    removed_buckets=len(stale_keys),
                    remaining_buckets=len(self._buckets),
                )

            return len(stale_keys)


class PerUserRateLimiter:
    """
    Convenience wrapper for per-user/per-company rate limiting.

    Provides sensible defaults for the extraction service:
    - 30 requests/minute burst capacity
    - 0.5 requests/second sustained rate

    Usage:
        limiter = PerUserRateLimiter()

        @app.post("/extract")
        async def extract(request: ExtractionRequest):
            if not await limiter.check_rate_limit(request.company_id):
                raise HTTPException(429, "Rate limit exceeded")
    """

    def __init__(
        self,
        requests_per_minute: int = 30,
        burst_capacity: Optional[int] = None,
    ):
        """
        Initialize the per-user rate limiter.

        Args:
            requests_per_minute: Target request rate per minute
            burst_capacity: Maximum burst size (defaults to requests_per_minute)
        """
        self.requests_per_minute = requests_per_minute
        self.burst_capacity = burst_capacity or requests_per_minute

        # Convert to tokens per second
        rate = requests_per_minute / 60.0

        self._limiter = TokenBucketRateLimiter(
            rate=rate,
            capacity=self.burst_capacity,
        )

    async def check_rate_limit(self, user_key: str) -> bool:
        """
        Check if request is within rate limit.

        Args:
            user_key: User/company identifier

        Returns:
            True if allowed, False if rate limited
        """
        return await self._limiter.acquire(user_key)

    async def get_retry_after(self, user_key: str) -> int:
        """
        Get seconds until rate limit resets for user.

        Args:
            user_key: User/company identifier

        Returns:
            Seconds to wait before retrying
        """
        return await self._limiter.get_retry_after(user_key)

    async def cleanup(self) -> int:
        """
        Cleanup stale rate limit buckets.

        Returns:
            Number of buckets removed
        """
        return await self._limiter.cleanup_stale_buckets()
