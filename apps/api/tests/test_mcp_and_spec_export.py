import pytest
import json
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select

from callcraft_api.app import app
from callcraft_api.db.session import AsyncSessionLocal
from callcraft_api.db.init_db import init_db
from callcraft_api.db.models import User
import pytest_asyncio
from callcraft_api.db.repository import Repository

pytestmark = pytest.mark.asyncio

@pytest_asyncio.fixture
async def active_user_id():
    async with AsyncSessionLocal() as session:
        await init_db(session)
        stmt = select(User).where(User.status == "active")
        res = await session.execute(stmt)
        users = res.scalars().all()
        if users:
            return users[0].id
        return "usr_default_dev_01"


@pytest_asyncio.fixture
async def active_spec_id(active_user_id: str):
    async with AsyncSessionLocal() as session:
        specs = await Repository.list_call_specs(session, active_user_id)
        if specs:
            return specs[0]["id"]
        return "spc_01HZX01SPEC000000000001"


async def test_mcp_tools_list(active_user_id: str):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            "/mcp/v1/rpc",
            json={
                "jsonrpc": "2.0",
                "id": 1,
                "method": "tools/list",
            },
            headers={"X-USER-ID": active_user_id},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["jsonrpc"] == "2.0"
        tools = data["result"]["tools"]
        tool_names = [t["name"] for t in tools]
        assert "callcraft_list_projects" in tool_names
        assert "callcraft_list_specs" in tool_names
        assert "callcraft_get_spec" in tool_names
        assert "callcraft_get_spec_section" in tool_names
        assert "callcraft_create_spec" in tool_names
        assert "callcraft_update_spec" in tool_names
        assert "callcraft_update_spec_section" in tool_names
        assert "callcraft_delete_spec" in tool_names
        assert "callcraft_export_spec_json" in tool_names
        assert "callcraft_import_spec_json" in tool_names
        assert "callcraft_list_user_ai_providers" in tool_names
        assert "callcraft_list_ai_models" in tool_names
        assert "callcraft_verify_ai_provider" in tool_names


async def test_mcp_tool_call_list_specs(active_user_id: str):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            "/mcp/v1/rpc",
            json={
                "jsonrpc": "2.0",
                "id": 2,
                "method": "tools/call",
                "params": {
                    "name": "callcraft_list_specs",
                    "arguments": {},
                },
            },
            headers={"X-USER-ID": active_user_id},
        )
        assert response.status_code == 200
        data = response.json()
        assert "result" in data
        text_content = data["result"]["content"][0]["text"]
        parsed = json.loads(text_content)
        assert "specs" in parsed


async def test_mcp_tool_call_list_ai_providers_and_models(active_user_id: str):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Test callcraft_list_user_ai_providers
        prov_res = await ac.post(
            "/mcp/v1/rpc",
            json={
                "jsonrpc": "2.0",
                "id": 3,
                "method": "tools/call",
                "params": {
                    "name": "callcraft_list_user_ai_providers",
                    "arguments": {},
                },
            },
            headers={"X-USER-ID": active_user_id},
        )
        assert prov_res.status_code == 200
        prov_data = prov_res.json()
        assert "result" in prov_data
        prov_content = json.loads(prov_data["result"]["content"][0]["text"])
        assert "providers" in prov_content
        assert isinstance(prov_content["providers"], list)

        # 2. Test callcraft_list_ai_models
        models_res = await ac.post(
            "/mcp/v1/rpc",
            json={
                "jsonrpc": "2.0",
                "id": 4,
                "method": "tools/call",
                "params": {
                    "name": "callcraft_list_ai_models",
                    "arguments": {},
                },
            },
            headers={"X-USER-ID": active_user_id},
        )
        assert models_res.status_code == 200
        models_data = models_res.json()
        assert "result" in models_data
        models_content = json.loads(models_data["result"]["content"][0]["text"])
        assert "models" in models_content
        assert len(models_content["models"]) > 0
        first_model = models_content["models"][0]
        assert "modelIdentifier" in first_model
        assert "providerCode" in first_model

        # 3. Test callcraft_verify_ai_provider without active key (returns valid=False gracefully)
        verify_res = await ac.post(
            "/mcp/v1/rpc",
            json={
                "jsonrpc": "2.0",
                "id": 5,
                "method": "tools/call",
                "params": {
                    "name": "callcraft_verify_ai_provider",
                    "arguments": {"provider": "unsupported_xyz"},
                },
            },
            headers={"X-USER-ID": active_user_id},
        )
        assert verify_res.status_code == 200
        verify_data = verify_res.json()
        assert "result" in verify_data
        verify_content = json.loads(verify_data["result"]["content"][0]["text"])
        assert verify_content["valid"] is False


async def test_spec_export_and_import(active_user_id: str, active_spec_id: str):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Export spec
        exp_res = await ac.get(
            f"/internal/v1/specs/{active_spec_id}/export",
            headers={"X-USER-ID": active_user_id},
        )
        assert exp_res.status_code == 200
        spec_json = exp_res.json()
        assert spec_json["id"] == active_spec_id
        assert "responseSchema" in spec_json
        assert "prompts" in spec_json

        # Modify positive prompt and import
        spec_json["prompts"]["positivePrompt"] = "Updated positive prompt from MCP import test"
        
        imp_res = await ac.post(
            f"/internal/v1/specs/{active_spec_id}/import",
            json=spec_json,
            headers={"X-USER-ID": active_user_id},
        )
        assert imp_res.status_code == 200
        imp_data = imp_res.json()
        assert imp_data["spec"]["positivePrompt"] == "Updated positive prompt from MCP import test"


async def test_spec_sections_get_and_put(active_user_id: str, active_spec_id: str):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Get section
        get_res = await ac.get(
            f"/internal/v1/specs/{active_spec_id}/sections/prompts",
            headers={"X-USER-ID": active_user_id},
        )
        assert get_res.status_code == 200
        prompts = get_res.json()
        assert "positivePrompt" in prompts

        # Update section
        put_res = await ac.put(
            f"/internal/v1/specs/{active_spec_id}/sections/prompts",
            json={"positivePrompt": "Granular section update test prompt"},
            headers={"X-USER-ID": active_user_id},
        )
        assert put_res.status_code == 200
        put_data = put_res.json()
        assert put_data["spec"]["positivePrompt"] == "Granular section update test prompt"


async def test_mcp_streamable_http_json(active_user_id: str):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Test initialize on root /mcp/v1
        init_res = await ac.post(
            "/mcp/v1",
            json={
                "jsonrpc": "2.0",
                "id": 101,
                "method": "initialize",
                "params": {
                    "protocolVersion": "2024-11-05",
                    "capabilities": {},
                    "clientInfo": {"name": "deepseek-harness", "version": "1.0.0"},
                },
            },
            headers={"X-USER-ID": active_user_id},
        )
        assert init_res.status_code == 200
        init_data = init_res.json()
        assert init_data["result"]["protocolVersion"] == "2024-11-05"
        assert init_data["result"]["serverInfo"]["name"] == "CallCraft MCP Server"

        # Test ping method
        ping_res = await ac.post(
            "/mcp/v1",
            json={
                "jsonrpc": "2.0",
                "id": 102,
                "method": "ping",
            },
            headers={"X-USER-ID": active_user_id},
        )
        assert ping_res.status_code == 200
        assert ping_res.json()["result"] == {}

        # Test notifications return 204
        notif_res = await ac.post(
            "/mcp/v1",
            json={
                "jsonrpc": "2.0",
                "method": "notifications/initialized",
            },
            headers={"X-USER-ID": active_user_id},
        )
        assert notif_res.status_code == 204


async def test_mcp_streamable_http_event_stream(active_user_id: str):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # POST with Accept: text/event-stream (DeepSeek Harness / streamable HTTP style)
        stream_res = await ac.post(
            "/mcp/v1",
            json={
                "jsonrpc": "2.0",
                "id": 201,
                "method": "ping",
            },
            headers={
                "X-USER-ID": active_user_id,
                "Accept": "text/event-stream",
            },
        )
        assert stream_res.status_code == 200
        assert "text/event-stream" in stream_res.headers["content-type"]
        text_body = stream_res.text
        assert "event: message" in text_body
        assert '"jsonrpc": "2.0"' in text_body
        assert '"id": 201' in text_body


async def test_mcp_streamable_http_discovery_get_and_delete(active_user_id: str):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # GET probe on /mcp/v1
        get_res = await ac.get(
            "/mcp/v1",
            headers={"X-USER-ID": active_user_id},
        )
        assert get_res.status_code == 200
        get_data = get_res.json()
        assert get_data["status"] == "active"
        assert get_data["transport"] == "streamable-http"
        assert get_data["protocolVersion"] == "2024-11-05"
        assert get_data["capabilities"]["streamableHttp"] is True
        assert get_data["authenticated"] is True
        assert get_data["userId"] == active_user_id

        # DELETE session terminate
        del_res = await ac.delete("/mcp/v1")
        assert del_res.status_code == 200
        assert del_res.json()["status"] == "session_terminated"


async def test_spec_update_persistence_camel_and_snake_case(active_user_id: str, active_spec_id: str):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Update with camelCase payload (Callcraft UI standard)
        camel_payload = {
            "name": "Updated Spec via CamelCase",
            "requestSchema": {
                "type": "object",
                "properties": {
                    "input_document_url": {"type": "string", "description": "Document URL"},
                    "doc_category": {"type": "string"}
                },
                "required": ["input_document_url"]
            },
            "responseSchema": {
                "type": "object",
                "properties": {
                    "extracted_id": {"type": "string"},
                    "extracted_name": {"type": "string"}
                },
                "required": ["extracted_id"]
            },
            "positivePrompt": "Extract user document data precisely.",
            "negativePrompt": "Do not hallucinate fields.",
            "toolsConfig": {
                "tools": [
                    {
                        "name": "lookup_registry",
                        "description": "Registry lookup tool",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "reg_id": {"type": "string"}
                            }
                        }
                    }
                ]
            }
        }

        put_res = await ac.put(
            f"/internal/v1/specs/{active_spec_id}",
            json=camel_payload,
            headers={"X-USER-ID": active_user_id},
        )
        assert put_res.status_code == 200, f"PUT failed: {put_res.text}"
        put_data = put_res.json()
        assert put_data["name"] == "Updated Spec via CamelCase"
        assert put_data["requestSchema"]["properties"]["input_document_url"]["type"] == "string"
        assert put_data["responseSchema"]["properties"]["extracted_id"]["type"] == "string"
        assert put_data["positivePrompt"] == "Extract user document data precisely."
        assert len(put_data["toolsConfig"]["tools"]) == 1

        # 2. Verify GET returns persisted changes
        get_res = await ac.get(
            f"/internal/v1/specs/{active_spec_id}",
            headers={"X-USER-ID": active_user_id},
        )
        assert get_res.status_code == 200
        get_data = get_res.json()
        assert get_data["name"] == "Updated Spec via CamelCase"
        assert get_data["requestSchema"]["properties"]["input_document_url"]["type"] == "string"
        assert get_data["responseSchema"]["properties"]["extracted_id"]["type"] == "string"
        assert get_data["positivePrompt"] == "Extract user document data precisely."
        assert get_data["negativePrompt"] == "Do not hallucinate fields."
        assert len(get_data["toolsConfig"]["tools"]) == 1

        # 3. Update with snake_case payload (backward compatibility via populate_by_name)
        snake_payload = {
            "name": "Updated Spec via SnakeCase",
            "request_schema": {
                "type": "object",
                "properties": {
                    "snake_req_key": {"type": "string"}
                }
            },
            "response_schema": {
                "type": "object",
                "properties": {
                    "snake_res_key": {"type": "string"}
                }
            },
            "positive_prompt": "Snake case prompt update"
        }

        put_res_snake = await ac.put(
            f"/internal/v1/specs/{active_spec_id}",
            json=snake_payload,
            headers={"X-USER-ID": active_user_id},
        )
        assert put_res_snake.status_code == 200
        put_snake_data = put_res_snake.json()
        assert put_snake_data["name"] == "Updated Spec via SnakeCase"
        assert "snake_req_key" in put_snake_data["requestSchema"]["properties"]
        assert "snake_res_key" in put_snake_data["responseSchema"]["properties"]
        assert put_snake_data["positivePrompt"] == "Snake case prompt update"


