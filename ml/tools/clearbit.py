"""
Clearbit company enrichment tool.

Uses Clearbit's Company API to enrich company data from domain.
Free tier: 1000 API calls/month.
"""

import httpx
import structlog

from .base import BaseTool

logger = structlog.get_logger()


class ClearbitTool(BaseTool):
    """
    Clearbit company enrichment tool.

    Given a domain (e.g., "apple.com"), returns company information
    including name, description, industry, employee count, etc.
    """

    name = "clearbit"
    description = "Look up company information from a domain name. Returns company name, description, industry, employee count, and more."

    def __init__(self, api_key: str):
        self.api_key = api_key
        self._client = httpx.AsyncClient(timeout=30.0)

    def get_input_schema(self) -> dict:
        return {
            "type": "object",
            "properties": {
                "domain": {
                    "type": "string",
                    "description": "Company domain name (e.g., apple.com)",
                }
            },
            "required": ["domain"],
        }

    async def run(self, input_value: str, **kwargs) -> dict:
        """
        Look up company information from Clearbit.

        Args:
            input_value: Company domain (e.g., "apple.com")

        Returns:
            dict with success, result, raw_data, or error
        """
        domain = kwargs.get("domain", input_value)

        # Clean up domain
        domain = domain.strip().lower()
        if domain.startswith("http://"):
            domain = domain[7:]
        if domain.startswith("https://"):
            domain = domain[8:]
        if domain.startswith("www."):
            domain = domain[4:]
        domain = domain.split("/")[0]  # Remove path

        if not domain:
            return {
                "success": False,
                "error": "Invalid domain provided",
            }

        logger.info("clearbit_lookup", domain=domain)

        try:
            response = await self._client.get(
                f"https://company.clearbit.com/v2/companies/find",
                params={"domain": domain},
                headers={"Authorization": f"Bearer {self.api_key}"},
            )

            if response.status_code == 200:
                data = response.json()

                # Extract key fields
                result_parts = []
                if data.get("name"):
                    result_parts.append(f"Name: {data['name']}")
                if data.get("description"):
                    result_parts.append(f"Description: {data['description'][:200]}")
                if data.get("category", {}).get("industry"):
                    result_parts.append(f"Industry: {data['category']['industry']}")
                if data.get("metrics", {}).get("employees"):
                    result_parts.append(f"Employees: {data['metrics']['employees']}")
                if data.get("geo", {}).get("city"):
                    city = data["geo"]["city"]
                    country = data["geo"].get("country", "")
                    result_parts.append(f"Location: {city}, {country}")

                result = "\n".join(result_parts) if result_parts else "No data found"

                logger.info(
                    "clearbit_success",
                    domain=domain,
                    company_name=data.get("name"),
                )

                return {
                    "success": True,
                    "result": result,
                    "raw_data": data,
                }

            elif response.status_code == 404:
                logger.info("clearbit_not_found", domain=domain)
                return {
                    "success": False,
                    "error": f"Company not found for domain: {domain}",
                }

            elif response.status_code == 402:
                logger.warning("clearbit_quota_exceeded")
                return {
                    "success": False,
                    "error": "Clearbit API quota exceeded",
                }

            else:
                logger.error(
                    "clearbit_error",
                    domain=domain,
                    status_code=response.status_code,
                    response=response.text[:500],
                )
                return {
                    "success": False,
                    "error": f"Clearbit API error: {response.status_code}",
                }

        except httpx.TimeoutException:
            logger.error("clearbit_timeout", domain=domain)
            return {
                "success": False,
                "error": "Clearbit API request timed out",
            }

        except Exception as e:
            logger.exception("clearbit_exception", domain=domain, error=str(e))
            return {
                "success": False,
                "error": f"Clearbit lookup failed: {str(e)}",
            }

    async def get_field(self, domain: str, field_path: str) -> dict:
        """
        Get a specific field from Clearbit data.

        Args:
            domain: Company domain
            field_path: Dot-separated path (e.g., "metrics.employees", "name")

        Returns:
            dict with success and result or error
        """
        result = await self.run(domain)

        if not result.get("success"):
            return result

        data = result.get("raw_data", {})

        # Navigate to field
        parts = field_path.split(".")
        value = data
        for part in parts:
            if isinstance(value, dict) and part in value:
                value = value[part]
            else:
                return {
                    "success": False,
                    "error": f"Field '{field_path}' not found in company data",
                }

        return {
            "success": True,
            "result": str(value) if value is not None else "",
        }

    async def close(self):
        """Close the HTTP client."""
        await self._client.aclose()
