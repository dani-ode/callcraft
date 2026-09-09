# ADR-0008 — Multi-Transport Model Context Protocol (MCP) Server

> **Status:** Accepted
> **Date:** 2026-09-09

## Context

Callcraft specs, projects, and execution configurations need to be dynamically inspected and edited by external AI agents and orchestration tools (DeepSeek Harness, Antigravity IDE, Cursor, Claude Desktop, Langflow, n8n). 

Different MCP client environments support disparate transport layers:
1. **DeepSeek Harness (DSH)** requires **Streamable HTTP** (`POST` with `Accept: text/event-stream` or `application/json`) or **Stdio**; it rejects legacy SSE endpoints.
2. **Antigravity IDE** and **Cursor** connect via **Server-Sent Events (SSE)** with a handshake GET request yielding an endpoint event to a separate messages route.
3. **Claude Desktop** and local agent runtimes communicate over **Stdio** (`stdin`/`stdout`).

Restricting Callcraft to a single transport would lock out major AI tooling ecosystems.

## Decision

Callcraft implements a first-class, multi-transport Model Context Protocol (MCP) server conforming to the JSON-RPC 2.0 and MCP 2024-11-05 specifications:

1. **Streamable HTTP (`/mcp/v1`, `/mcp/v1/stream`, `/mcp/v1/rpc`)**:
   - Accepts direct HTTP `POST` requests.
   - Dynamically inspects the client's `Accept` header:
     - If `text/event-stream` is requested, yields continuous SSE message chunks (`event: message\ndata: <json>\n\n`).
     - Otherwise, returns standard `application/json`.
   - Supports `GET /mcp/v1` for capability discovery probes and long-lived event streams.
   - Handles JSON-RPC `ping` and ignores notifications without returning error codes.

2. **Legacy SSE Transport (`/mcp/v1/sse` & `/mcp/v1/messages`)**:
   - Preserved for backwards compatibility with Antigravity and Cursor SSE client handshakes.

3. **Stdio CLI Transport (`python -m callcraft_api.mcp_stdio`)**:
   - Standalone CLI runner communicating over standard I/O for desktop and process-isolated agents.

4. **Strict Identity & Workspace Scoping**:
   - Every MCP session resolves user context through `X-USER-ID` header, `user_id` query param, or `Authorization: Bearer <user_id>`.
   - Optional `project_id` parameter enforces workspace isolation across all tool operations.

## Consequences

- Universal compatibility: DeepSeek Harness, Antigravity, Cursor, Claude, Langflow, and n8n can all interface with Callcraft without external adapters.
- Zero breaking changes for existing Antigravity IDE configurations (`serverUrl: /mcp/v1/sse`).
- Standardized tool execution catalog: 13 MCP tools cover full workspace spec management, JSON import/export, and provider key verification.

## Implementation

- MCP Router & Handlers: `apps/api/src/callcraft_api/routers/mcp.py`
- Stdio CLI Runner: `apps/api/src/callcraft_api/mcp_stdio.py`
- Specification reference: [../specifications/api-endpoints.md#2-model-context-protocol-mcp-server-plane---mcpv1](../specifications/api-endpoints.md#2-model-context-protocol-mcp-server-plane---mcpv1)
