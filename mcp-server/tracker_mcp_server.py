#!/usr/bin/env python3
"""
MCP Server for Tracker API
Provides read-only access to Tracker events, catalog, and locks
"""

import asyncio
import json
import os
from typing import Any, Optional
from datetime import datetime

import httpx
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent


class TrackerMCPServer:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip('/')
        self.api_base = f"{self.base_url}/api/v1alpha1"
        self.client = httpx.AsyncClient(timeout=30.0)
        
    async def close(self):
        await self.client.aclose()
    
    async def list_events(self, per_page: int = 10, page: int = 1, 
                         event_type: Optional[str] = None,
                         service: Optional[str] = None,
                         status: Optional[str] = None) -> dict[str, Any]:
        """List events with optional filters"""
        params = {"perPage": per_page, "page": page}
        if event_type:
            params["type"] = event_type
        if service:
            params["service"] = service
        if status:
            params["status"] = status
            
        response = await self.client.get(f"{self.api_base}/events/list", params=params)
        response.raise_for_status()
        return response.json()
    
    async def today_events(self, per_page: int = 10, page: int = 1) -> dict[str, Any]:
        """Get today's events"""
        params = {"perPage": per_page, "page": page}
        response = await self.client.get(f"{self.api_base}/events/today", params=params)
        response.raise_for_status()
        return response.json()
    
    async def search_events(self, 
                           source: Optional[str] = None,
                           event_type: Optional[str] = None,
                           priority: Optional[str] = None,
                           status: Optional[str] = None,
                           service: Optional[str] = None,
                           start_date: Optional[str] = None,
                           end_date: Optional[str] = None,
                           environment: Optional[str] = None,
                           impact: Optional[bool] = None,
                           slack_id: Optional[str] = None) -> dict[str, Any]:
        """Search events with multiple filters"""
        params = {}
        if source:
            params["source"] = source
        if event_type:
            params["type"] = event_type
        if priority:
            params["priority"] = priority
        if status:
            params["status"] = status
        if service:
            params["service"] = service
        if start_date:
            params["startDate"] = start_date
        if end_date:
            params["endDate"] = end_date
        if environment:
            params["environment"] = environment
        if impact is not None:
            params["impact"] = str(impact).lower()
        if slack_id:
            params["slackId"] = slack_id
            
        response = await self.client.get(f"{self.api_base}/events/search", params=params)
        response.raise_for_status()
        return response.json()
    
    async def get_event(self, event_id: str) -> dict[str, Any]:
        """Get a specific event by ID"""
        response = await self.client.get(f"{self.api_base}/events/{event_id}")
        response.raise_for_status()
        return response.json()
    
    async def list_catalog(self, per_page: int = 10, page: int = 1) -> dict[str, Any]:
        """List catalog services"""
        params = {"perPage": per_page, "page": page}
        response = await self.client.get(f"{self.api_base}/catalogs/list", params=params)
        response.raise_for_status()
        return response.json()
    
    async def get_catalog_service(self, service_name: str) -> dict[str, Any]:
        """Get a specific service from catalog"""
        params = {"name": service_name}
        response = await self.client.get(f"{self.api_base}/catalog", params=params)
        response.raise_for_status()
        return response.json()
    
    async def list_locks(self, per_page: int = 10, page: int = 1) -> dict[str, Any]:
        """List active locks"""
        params = {"perPage": per_page, "page": page}
        response = await self.client.get(f"{self.api_base}/locks/list", params=params)
        response.raise_for_status()
        return response.json()
    
    async def get_lock(self, lock_id: str) -> dict[str, Any]:
        """Get a specific lock by ID"""
        response = await self.client.get(f"{self.api_base}/locks/{lock_id}")
        response.raise_for_status()
        return response.json()
    
    async def get_openapi_spec(self) -> dict[str, Any]:
        """Get the OpenAPI specification"""
        response = await self.client.get(f"{self.base_url}/swagger.json")
        response.raise_for_status()
        return response.json()
    
    async def get_event_changelog(self, event_id: str, per_page: int = 50, page: int = 1) -> dict[str, Any]:
        """Get changelog entries for an event"""
        params = {"perPage": per_page, "page": page}
        response = await self.client.get(f"{self.api_base}/event/{event_id}/changelog", params=params)
        response.raise_for_status()
        return response.json()
    
    async def get_version_compliance(self) -> dict[str, Any]:
        """Get version compliance report for catalog deliverables"""
        response = await self.client.get(f"{self.api_base}/catalog/version-compliance")
        response.raise_for_status()
        return response.json()


async def main():
    # Get Tracker URL from environment variable
    tracker_url = os.getenv("TRACKER_URL", "http://localhost:8080")
    
    tracker = TrackerMCPServer(tracker_url)
    server = Server("tracker-mcp-server")
    
    @server.list_tools()
    async def list_tools() -> list[Tool]:
        return [
            Tool(
                name="list_events",
                description="List events from Tracker with optional filters. Returns events with their metadata, attributes, and links.",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "per_page": {
                            "type": "number",
                            "description": "Number of events per page (default: 10, max: 100)",
                            "default": 10
                        },
                        "page": {
                            "type": "number",
                            "description": "Page number (default: 1)",
                            "default": 1
                        },
                        "type": {
                            "type": "string",
                            "description": "Filter by event type (deployment, operation, drift, incident, rpa_usage)",
                            "enum": ["deployment", "operation", "drift", "incident", "rpa_usage"]
                        },
                        "service": {
                            "type": "string",
                            "description": "Filter by service name"
                        },
                        "status": {
                            "type": "string",
                            "description": "Filter by status",
                            "enum": ["start", "failure", "success", "warning", "error", "snapshot", "user_update", "recommandation", "open", "close", "done"]
                        }
                    }
                }
            ),
            Tool(
                name="today_events",
                description="Get today's events from Tracker. Returns all events created today with pagination.",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "per_page": {
                            "type": "number",
                            "description": "Number of events per page (default: 10, max: 100)",
                            "default": 10
                        },
                        "page": {
                            "type": "number",
                            "description": "Page number (default: 1)",
                            "default": 1
                        }
                    }
                }
            ),
            Tool(
                name="search_events",
                description="Search events with advanced filters. Supports multiple criteria including date ranges, environment, impact, and more.",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "source": {
                            "type": "string",
                            "description": "Filter by event source (e.g., github-actions, jenkins, manual)"
                        },
                        "type": {
                            "type": "string",
                            "description": "Filter by event type",
                            "enum": ["deployment", "operation", "drift", "incident", "rpa_usage"]
                        },
                        "priority": {
                            "type": "string",
                            "description": "Filter by priority level",
                            "enum": ["P1", "P2", "P3", "P4", "P5"]
                        },
                        "status": {
                            "type": "string",
                            "description": "Filter by status",
                            "enum": ["start", "failure", "success", "warning", "error", "snapshot", "user_update", "recommandation", "open", "close", "done"]
                        },
                        "service": {
                            "type": "string",
                            "description": "Filter by service name"
                        },
                        "start_date": {
                            "type": "string",
                            "description": "Filter events from this date (ISO 8601 format: YYYY-MM-DD or YYYY-MM-DDTHH:MM:SSZ)"
                        },
                        "end_date": {
                            "type": "string",
                            "description": "Filter events until this date (ISO 8601 format: YYYY-MM-DD or YYYY-MM-DDTHH:MM:SSZ)"
                        },
                        "environment": {
                            "type": "string",
                            "description": "Filter by environment",
                            "enum": ["development", "integration", "TNR", "UAT", "recette", "preproduction", "production", "mco"]
                        },
                        "impact": {
                            "type": "boolean",
                            "description": "Filter by impact (true for events with impact, false for events without)"
                        },
                        "slack_id": {
                            "type": "string",
                            "description": "Filter by Slack message ID"
                        }
                    }
                }
            ),
            Tool(
                name="get_event",
                description="Get a specific event by its ID. Returns full event details including metadata, attributes, and links.",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "event_id": {
                            "type": "string",
                            "description": "The event ID to retrieve"
                        }
                    },
                    "required": ["event_id"]
                }
            ),
            Tool(
                name="list_catalog",
                description="List services from the catalog. Returns service information including name, description, team, and links.",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "per_page": {
                            "type": "number",
                            "description": "Number of services per page (default: 10, max: 100)",
                            "default": 10
                        },
                        "page": {
                            "type": "number",
                            "description": "Page number (default: 1)",
                            "default": 1
                        }
                    }
                }
            ),
            Tool(
                name="get_catalog_service",
                description="Get a specific service from the catalog by name. Returns full service details.",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "service_name": {
                            "type": "string",
                            "description": "The service name to retrieve"
                        }
                    },
                    "required": ["service_name"]
                }
            ),
            Tool(
                name="list_locks",
                description="List active locks. Returns lock information including service, reason, and owner.",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "per_page": {
                            "type": "number",
                            "description": "Number of locks per page (default: 10, max: 100)",
                            "default": 10
                        },
                        "page": {
                            "type": "number",
                            "description": "Page number (default: 1)",
                            "default": 1
                        }
                    }
                }
            ),
            Tool(
                name="get_lock",
                description="Get a specific lock by its ID. Returns full lock details.",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "lock_id": {
                            "type": "string",
                            "description": "The lock ID to retrieve"
                        }
                    },
                    "required": ["lock_id"]
                }
            ),
            Tool(
                name="get_openapi_spec",
                description="Get the OpenAPI/Swagger specification for the Tracker API. Returns the complete API documentation in OpenAPI 2.0 format.",
                inputSchema={
                    "type": "object",
                    "properties": {}
                }
            ),
            Tool(
                name="get_event_changelog",
                description="Get changelog entries for the given event ID (supports pagination).",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "event_id": {
                            "type": "string",
                            "description": "The event ID to retrieve changelog for"
                        },
                        "per_page": {
                            "type": "number",
                            "description": "Items per page",
                            "default": 50
                        },
                        "page": {
                            "type": "number",
                            "description": "Page index (1-based)",
                            "default": 1
                        }
                    },
                    "required": ["event_id"]
                }
            ),
            Tool(
                name="get_version_compliance",
                description="Get version compliance report for catalog deliverables (packages, charts, containers, modules).",
                inputSchema={
                    "type": "object",
                    "properties": {}
                }
            )
        ]
    
    @server.call_tool()
    async def call_tool(name: str, arguments: Any) -> list[TextContent]:
        try:
            if name == "list_events":
                result = await tracker.list_events(
                    per_page=arguments.get("per_page", 10),
                    page=arguments.get("page", 1),
                    event_type=arguments.get("type"),
                    service=arguments.get("service"),
                    status=arguments.get("status")
                )
            elif name == "today_events":
                result = await tracker.today_events(
                    per_page=arguments.get("per_page", 10),
                    page=arguments.get("page", 1)
                )
            elif name == "search_events":
                result = await tracker.search_events(
                    source=arguments.get("source"),
                    event_type=arguments.get("type"),
                    priority=arguments.get("priority"),
                    status=arguments.get("status"),
                    service=arguments.get("service"),
                    start_date=arguments.get("start_date"),
                    end_date=arguments.get("end_date"),
                    environment=arguments.get("environment"),
                    impact=arguments.get("impact"),
                    slack_id=arguments.get("slack_id")
                )
            elif name == "get_event":
                result = await tracker.get_event(arguments["event_id"])
            elif name == "list_catalog":
                result = await tracker.list_catalog(
                    per_page=arguments.get("per_page", 10),
                    page=arguments.get("page", 1)
                )
            elif name == "get_catalog_service":
                result = await tracker.get_catalog_service(arguments["service_name"])
            elif name == "list_locks":
                result = await tracker.list_locks(
                    per_page=arguments.get("per_page", 10),
                    page=arguments.get("page", 1)
                )
            elif name == "get_lock":
                result = await tracker.get_lock(arguments["lock_id"])
            elif name == "get_openapi_spec":
                result = await tracker.get_openapi_spec()
            elif name == "get_event_changelog":
                result = await tracker.get_event_changelog(
                    event_id=arguments["event_id"],
                    per_page=arguments.get("per_page", 50),
                    page=arguments.get("page", 1)
                )
            elif name == "get_version_compliance":
                result = await tracker.get_version_compliance()
            else:
                raise ValueError(f"Unknown tool: {name}")
            
            return [TextContent(
                type="text",
                text=json.dumps(result, indent=2)
            )]
        except httpx.HTTPStatusError as e:
            return [TextContent(
                type="text",
                text=f"HTTP Error {e.response.status_code}: {e.response.text}"
            )]
        except Exception as e:
            return [TextContent(
                type="text",
                text=f"Error: {str(e)}"
            )]
    
    try:
        async with stdio_server() as (read_stream, write_stream):
            await server.run(read_stream, write_stream, server.create_initialization_options())
    finally:
        await tracker.close()


def run():
    """Entry point for the MCP server"""
    asyncio.run(main())


if __name__ == "__main__":
    run()
