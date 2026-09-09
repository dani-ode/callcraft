import pytest
import json
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select

from callcraft_api.app import app
from callcraft_api.db.session import AsyncSessionLocal
from callcraft_api.db.init_db import init_db
from callcraft_api.db.models import User
from callcraft_api.db.repository import Repository

pytestmark = pytest.mark.asyncio

@pytest.fixture
async def active_user_id():
    async with AsyncSessionLocal() as session:
        await init_db(session)
        stmt = select(User).where(User.status == "active")
        res = await session.execute(stmt)
        users = res.scalars().all()
        if users:
            return users[0].id
        return "usr_default_dev_01"


@pytest.fixture
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
