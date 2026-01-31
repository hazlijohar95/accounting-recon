"""
Web search tool using Serper.dev API.

Provides Google search results for LLM-based enrichment.
Serper pricing: $50/10K searches.
"""

import httpx
import structlog

from .base import BaseTool

logger = structlog.get_logger()


class SearchTool(BaseTool):
    """
    Web search tool using Serper.dev.

    Performs Google searches and returns structured results
    that can be used by the LLM for data extraction.
    """

    name = "web_search"
    description = "Search the web using Google. Returns titles, snippets, and links from search results."

    def __init__(self, api_key: str):
        self.api_key = api_key
        self._client = httpx.AsyncClient(timeout=30.0)

    def get_input_schema(self) -> dict:
        return {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Search query string",
                },
                "num_results": {
                    "type": "integer",
                    "description": "Number of results to return (1-10)",
                    "default": 5,
                },
            },
            "required": ["query"],
        }

    async def run(self, input_value: str, **kwargs) -> dict:
        """
        Perform a web search.

        Args:
            input_value: Search query string
            **kwargs: Optional num_results (1-10)

        Returns:
            dict with success, result (formatted search results), or error
        """
        query = kwargs.get("query", input_value)
        num_results = min(max(kwargs.get("num_results", 5), 1), 10)

        if not query or not query.strip():
            return {
                "success": False,
                "error": "Empty search query",
            }

        logger.info("web_search", query=query[:100], num_results=num_results)

        try:
            response = await self._client.post(
                "https://google.serper.dev/search",
                headers={
                    "X-API-KEY": self.api_key,
                    "Content-Type": "application/json",
                },
                json={
                    "q": query,
                    "num": num_results,
                },
            )

            if response.status_code == 200:
                data = response.json()
                organic = data.get("organic", [])

                if not organic:
                    return {
                        "success": True,
                        "result": "No search results found.",
                        "raw_data": data,
                    }

                # Format results
                result_parts = []
                for i, item in enumerate(organic[:num_results], 1):
                    title = item.get("title", "No title")
                    snippet = item.get("snippet", "")
                    link = item.get("link", "")

                    result_parts.append(f"{i}. {title}")
                    if snippet:
                        result_parts.append(f"   {snippet}")
                    if link:
                        result_parts.append(f"   URL: {link}")
                    result_parts.append("")

                result = "\n".join(result_parts)

                logger.info(
                    "web_search_success",
                    query=query[:50],
                    result_count=len(organic),
                )

                return {
                    "success": True,
                    "result": result,
                    "raw_data": data,
                }

            elif response.status_code == 401:
                logger.error("serper_auth_error")
                return {
                    "success": False,
                    "error": "Serper API authentication failed",
                }

            elif response.status_code == 429:
                logger.warning("serper_rate_limit")
                return {
                    "success": False,
                    "error": "Serper API rate limit exceeded",
                }

            else:
                logger.error(
                    "serper_error",
                    status_code=response.status_code,
                    response=response.text[:500],
                )
                return {
                    "success": False,
                    "error": f"Search API error: {response.status_code}",
                }

        except httpx.TimeoutException:
            logger.error("serper_timeout", query=query[:50])
            return {
                "success": False,
                "error": "Search request timed out",
            }

        except Exception as e:
            logger.exception("serper_exception", query=query[:50], error=str(e))
            return {
                "success": False,
                "error": f"Search failed: {str(e)}",
            }

    async def close(self):
        """Close the HTTP client."""
        await self._client.aclose()
