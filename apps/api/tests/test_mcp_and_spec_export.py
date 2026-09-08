import pytest
import json
from httpx import AsyncClient, ASGITransport
from callcraft_api.app import app

pytestmark = pytest.mark.asyncio


async def test_mcp_tools_list():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            "/mcp/v1/rpc",
            json={
                "jsonrpc": "2.0",
                "id": 1,
                "method": "tools/list",
            },
            headers={"X-USER-ID": "usr_01HZX01USER0000000000001"},
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


async def test_mcp_tool_call_list_specs():
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
            headers={"X-USER-ID": "usr_01HZX01USER0000000000001"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "result" in data
        text_content = data["result"]["content"][0]["text"]
        parsed = json.loads(text_content)
        assert "specs" in parsed


async def test_spec_export_and_import():
    user_id = "usr_01HZX01USER0000000000001"
    spec_id = "spc_01HZX01SPEC000000000001"

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Export spec
        exp_res = await ac.get(
            f"/internal/v1/specs/{spec_id}/export",
            headers={"X-USER-ID": user_id},
        )
        assert exp_res.status_code == 200
        spec_json = exp_res.json()
        assert spec_json["id"] == spec_id
        assert "responseSchema" in spec_json
        assert "prompts" in spec_json

        # Modify positive prompt and import
        spec_json["prompts"]["positivePrompt"] = "Updated positive prompt from MCP import test"
        
        imp_res = await ac.post(
            f"/internal/v1/specs/{spec_id}/import",
            json=spec_json,
            headers={"X-USER-ID": user_id},
        )
        assert imp_res.status_code == 200
        imp_data = imp_res.json()
        assert imp_data["spec"]["positivePrompt"] == "Updated positive prompt from MCP import test"


async def test_spec_sections_get_and_put():
    user_id = "usr_01HZX01USER0000000000001"
    spec_id = "spc_01HZX01SPEC000000000001"

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Get section
        get_res = await ac.get(
            f"/internal/v1/specs/{spec_id}/sections/prompts",
            headers={"X-USER-ID": user_id},
        )
        assert get_res.status_code == 200
        prompts = get_res.json()
        assert "positivePrompt" in prompts

        # Update section
        put_res = await ac.put(
            f"/internal/v1/specs/{spec_id}/sections/prompts",
            json={"positivePrompt": "Granular section update test prompt"},
            headers={"X-USER-ID": user_id},
        )
        assert put_res.status_code == 200
        put_data = put_res.json()
        assert put_data["spec"]["positivePrompt"] == "Granular section update test prompt"
