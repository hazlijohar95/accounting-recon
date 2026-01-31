"""
Agent service for data enrichment.

Orchestrates LLM and tools to enrich cell data in the agentic spreadsheet.
Supports:
- Direct tool calls (Clearbit, SSM)
- LLM-based enrichment with tool use
- Batch processing with rate limiting
"""

import json
import asyncio
from typing import Optional, Dict, Any

import httpx
import structlog

from config import get_settings
from tools import ToolRegistry, ClearbitTool, SearchTool
from models.agent import DataSource

logger = structlog.get_logger()

# AWS Bedrock configuration
BEDROCK_RUNTIME_URL = "https://bedrock-runtime.{region}.amazonaws.com"


class AgentService:
    """
    Agent service for data enrichment.

    Uses AWS Bedrock for LLM capabilities and integrates with
    external tools for data retrieval.
    """

    def __init__(
        self,
        aws_region: str,
        aws_access_key_id: str,
        aws_secret_access_key: str,
        model_id: str,
        clearbit_api_key: Optional[str] = None,
        serper_api_key: Optional[str] = None,
    ):
        self.aws_region = aws_region
        self.aws_access_key_id = aws_access_key_id
        self.aws_secret_access_key = aws_secret_access_key
        self.model_id = model_id

        # Initialize tool registry
        self.tools = ToolRegistry()

        if clearbit_api_key:
            self.tools.register(ClearbitTool(clearbit_api_key))

        if serper_api_key:
            self.tools.register(SearchTool(serper_api_key))

        # HTTP client for Bedrock
        self._client = httpx.AsyncClient(timeout=60.0)

        logger.info(
            "agent_service_initialized",
            model_id=model_id,
            tools=self.tools.list_tools(),
        )

    async def enrich(
        self,
        input_value: str,
        prompt: str,
        data_source: str,
    ) -> Dict[str, Any]:
        """
        Enrich a cell value using the specified data source.

        Args:
            input_value: The input data (e.g., domain, company name)
            prompt: The enrichment instruction
            data_source: Which data source to use (llm, clearbit, etc.)

        Returns:
            dict with:
                - success: bool
                - result: str (the enriched value)
                - error: str (if failed)
        """
        logger.info(
            "enrichment_started",
            input=input_value[:100],
            data_source=data_source,
            prompt=prompt[:100],
        )

        try:
            if data_source == DataSource.CLEARBIT.value:
                return await self._enrich_clearbit(input_value, prompt)
            elif data_source == DataSource.LLM.value:
                return await self._enrich_llm(input_value, prompt)
            else:
                return {
                    "success": False,
                    "error": f"Unknown data source: {data_source}",
                }

        except Exception as e:
            logger.exception(
                "enrichment_error",
                input=input_value[:50],
                error=str(e),
            )
            return {
                "success": False,
                "error": str(e),
            }

    async def _enrich_clearbit(self, input_value: str, prompt: str) -> Dict[str, Any]:
        """
        Enrich using Clearbit API directly.

        Args:
            input_value: Domain to look up
            prompt: Optional field path (e.g., "metrics.employees")

        Returns:
            Enrichment result
        """
        clearbit = self.tools.get("clearbit")
        if not clearbit:
            return {
                "success": False,
                "error": "Clearbit tool not configured",
            }

        # Check if prompt specifies a field path
        if "." in prompt or prompt.lower() in [
            "name",
            "description",
            "employees",
            "industry",
            "location",
        ]:
            # Direct field extraction
            field_map = {
                "name": "name",
                "description": "description",
                "employees": "metrics.employees",
                "industry": "category.industry",
                "location": "geo.city",
            }
            field_path = field_map.get(prompt.lower(), prompt)
            result = await clearbit.get_field(input_value, field_path)
        else:
            # Full lookup
            result = await clearbit.run(input_value)

        return result

    async def _enrich_llm(self, input_value: str, prompt: str) -> Dict[str, Any]:
        """
        Enrich using LLM with optional tool use.

        Args:
            input_value: The input data
            prompt: The enrichment instruction

        Returns:
            Enrichment result
        """
        # Build the messages
        system_prompt = """You are a data enrichment assistant. Your task is to extract or find specific information based on the user's request.

Rules:
1. If you can answer directly from your knowledge, do so.
2. If you need to look up current information, use the available tools.
3. Always respond with just the requested value - no explanations or extra text.
4. If you cannot find the information, respond with "N/A"."""

        user_message = f"""Input: {input_value}

Task: {prompt}

Respond with only the requested value."""

        # Get available tools for Claude
        tools = self.tools.get_claude_tools()

        try:
            response = await self._call_bedrock(
                system=system_prompt,
                messages=[{"role": "user", "content": user_message}],
                tools=tools if tools else None,
                max_tokens=500,
            )

            if not response:
                return {
                    "success": False,
                    "error": "No response from LLM",
                }

            # Check if model wants to use a tool
            stop_reason = response.get("stop_reason")

            if stop_reason == "tool_use":
                # Execute tool calls
                content = response.get("content", [])
                tool_results = await self._execute_tool_calls(content)

                # Send results back to model
                messages = [
                    {"role": "user", "content": user_message},
                    {"role": "assistant", "content": content},
                    {"role": "user", "content": tool_results},
                ]

                response = await self._call_bedrock(
                    system=system_prompt,
                    messages=messages,
                    max_tokens=500,
                )

            # Extract final text response
            content = response.get("content", [])
            text_parts = [c.get("text", "") for c in content if c.get("type") == "text"]
            result_text = "\n".join(text_parts).strip()

            if result_text:
                return {
                    "success": True,
                    "result": result_text,
                }
            else:
                return {
                    "success": False,
                    "error": "LLM returned empty response",
                }

        except Exception as e:
            logger.exception("llm_enrichment_error", error=str(e))
            return {
                "success": False,
                "error": f"LLM enrichment failed: {str(e)}",
            }

    async def _call_bedrock(
        self,
        system: str,
        messages: list,
        tools: Optional[list] = None,
        max_tokens: int = 500,
    ) -> Optional[Dict[str, Any]]:
        """
        Call AWS Bedrock with the Claude model.

        Args:
            system: System prompt
            messages: Conversation messages
            tools: Optional tool definitions
            max_tokens: Maximum tokens in response

        Returns:
            Response dict or None
        """
        import hashlib
        import hmac
        from datetime import datetime

        # Build request body
        body = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": max_tokens,
            "system": system,
            "messages": messages,
        }

        if tools:
            body["tools"] = tools

        body_json = json.dumps(body)

        # AWS Signature V4
        service = "bedrock"
        host = f"bedrock-runtime.{self.aws_region}.amazonaws.com"
        endpoint = f"https://{host}/model/{self.model_id}/invoke"

        t = datetime.utcnow()
        amz_date = t.strftime("%Y%m%dT%H%M%SZ")
        date_stamp = t.strftime("%Y%m%d")

        # Create canonical request
        method = "POST"
        canonical_uri = f"/model/{self.model_id}/invoke"
        canonical_querystring = ""

        payload_hash = hashlib.sha256(body_json.encode("utf-8")).hexdigest()

        canonical_headers = (
            f"content-type:application/json\n"
            f"host:{host}\n"
            f"x-amz-date:{amz_date}\n"
        )
        signed_headers = "content-type;host;x-amz-date"

        canonical_request = (
            f"{method}\n{canonical_uri}\n{canonical_querystring}\n"
            f"{canonical_headers}\n{signed_headers}\n{payload_hash}"
        )

        # Create string to sign
        algorithm = "AWS4-HMAC-SHA256"
        credential_scope = f"{date_stamp}/{self.aws_region}/{service}/aws4_request"
        string_to_sign = (
            f"{algorithm}\n{amz_date}\n{credential_scope}\n"
            f"{hashlib.sha256(canonical_request.encode('utf-8')).hexdigest()}"
        )

        # Calculate signature
        def sign(key, msg):
            return hmac.new(key, msg.encode("utf-8"), hashlib.sha256).digest()

        k_date = sign(f"AWS4{self.aws_secret_access_key}".encode("utf-8"), date_stamp)
        k_region = sign(k_date, self.aws_region)
        k_service = sign(k_region, service)
        k_signing = sign(k_service, "aws4_request")
        signature = hmac.new(
            k_signing, string_to_sign.encode("utf-8"), hashlib.sha256
        ).hexdigest()

        # Build authorization header
        authorization_header = (
            f"{algorithm} Credential={self.aws_access_key_id}/{credential_scope}, "
            f"SignedHeaders={signed_headers}, Signature={signature}"
        )

        headers = {
            "Content-Type": "application/json",
            "X-Amz-Date": amz_date,
            "Authorization": authorization_header,
        }

        try:
            response = await self._client.post(
                endpoint,
                content=body_json,
                headers=headers,
            )

            if response.status_code == 200:
                return response.json()
            else:
                logger.error(
                    "bedrock_error",
                    status_code=response.status_code,
                    response=response.text[:500],
                )
                return None

        except Exception as e:
            logger.exception("bedrock_request_error", error=str(e))
            return None

    async def _execute_tool_calls(self, content: list) -> list:
        """
        Execute tool calls from LLM response.

        Args:
            content: List of content blocks from LLM response

        Returns:
            List of tool result content blocks
        """
        results = []

        for block in content:
            if block.get("type") == "tool_use":
                tool_name = block.get("name")
                tool_input = block.get("input", {})
                tool_id = block.get("id")

                tool = self.tools.get(tool_name)
                if tool:
                    # Get input value from tool_input
                    input_val = tool_input.get("input") or tool_input.get(
                        "domain"
                    ) or tool_input.get("query") or ""

                    result = await tool.run(input_val, **tool_input)

                    results.append({
                        "type": "tool_result",
                        "tool_use_id": tool_id,
                        "content": result.get("result", result.get("error", "No result")),
                    })
                else:
                    results.append({
                        "type": "tool_result",
                        "tool_use_id": tool_id,
                        "content": f"Tool '{tool_name}' not found",
                        "is_error": True,
                    })

        return results

    async def close(self):
        """Clean up resources."""
        await self._client.aclose()

        # Close tool clients
        for tool_name in self.tools.list_tools():
            tool = self.tools.get(tool_name)
            if hasattr(tool, "close"):
                await tool.close()


# Singleton instance (created lazily)
_agent_service: Optional[AgentService] = None


def get_agent_service() -> AgentService:
    """
    Get or create the agent service instance.

    Returns:
        AgentService singleton
    """
    global _agent_service

    if _agent_service is None:
        settings = get_settings()
        _agent_service = AgentService(
            aws_region=settings.aws_region,
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key,
            model_id=settings.bedrock_model_id,
            clearbit_api_key=settings.clearbit_api_key or None,
            serper_api_key=settings.serper_api_key or None,
        )

    return _agent_service


async def shutdown_agent_service():
    """Shutdown the agent service."""
    global _agent_service

    if _agent_service:
        await _agent_service.close()
        _agent_service = None
