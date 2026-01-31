"""
Base class for agent tools.

Provides a common interface for all enrichment tools.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, Type

import structlog

logger = structlog.get_logger()


class BaseTool(ABC):
    """
    Abstract base class for enrichment tools.

    All tools must implement:
    - name: Tool identifier
    - description: Human-readable description
    - run(): Execute the tool with input
    """

    name: str = "base_tool"
    description: str = "Base tool class"

    @abstractmethod
    async def run(self, input_value: str, **kwargs) -> dict:
        """
        Execute the tool with the given input.

        Args:
            input_value: The input to process (e.g., domain, company name)
            **kwargs: Additional parameters specific to the tool

        Returns:
            dict with keys:
                - success: bool
                - result: str (the enriched value)
                - raw_data: dict (optional, full API response)
                - error: str (optional, error message if failed)
        """
        pass

    def to_claude_tool_spec(self) -> dict:
        """
        Convert tool to Claude tool specification format.

        Returns:
            Tool specification dict for Claude's tool_use API
        """
        return {
            "name": self.name,
            "description": self.description,
            "input_schema": self.get_input_schema(),
        }

    def get_input_schema(self) -> dict:
        """
        Get JSON schema for tool input parameters.

        Override this method to define custom input parameters.
        Default: requires a single "input" string parameter.
        """
        return {
            "type": "object",
            "properties": {
                "input": {
                    "type": "string",
                    "description": "The input value to process",
                }
            },
            "required": ["input"],
        }


class ToolRegistry:
    """
    Registry for managing available tools.

    Provides a centralized way to register, retrieve, and list tools.
    """

    def __init__(self):
        self._tools: Dict[str, BaseTool] = {}

    def register(self, tool: BaseTool) -> None:
        """Register a tool in the registry."""
        self._tools[tool.name] = tool
        logger.info("tool_registered", tool_name=tool.name)

    def get(self, name: str) -> Optional[BaseTool]:
        """Get a tool by name."""
        return self._tools.get(name)

    def list_tools(self) -> list[str]:
        """List all registered tool names."""
        return list(self._tools.keys())

    def get_all(self) -> Dict[str, BaseTool]:
        """Get all registered tools."""
        return self._tools.copy()

    def get_claude_tools(self, tool_names: Optional[list[str]] = None) -> list[dict]:
        """
        Get tool specifications for Claude API.

        Args:
            tool_names: Optional list of tool names to include.
                       If None, includes all tools.

        Returns:
            List of tool specifications for Claude's tool_use API
        """
        if tool_names is None:
            tools = self._tools.values()
        else:
            tools = [self._tools[name] for name in tool_names if name in self._tools]

        return [tool.to_claude_tool_spec() for tool in tools]
