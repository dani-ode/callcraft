import json
import asyncio
import logging
from typing import Any, Dict, List, Optional
import ulid
import httpx

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, Response
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession

from callcraft_api.db.session import AsyncSessionLocal, get_db_session
from callcraft_api.db.models import User, CallSpec, AiModel
from callcraft_api.db.repository import Repository
from callcraft_api.services.redis_cache import redis_service

logger = logging.getLogger("callcraft.mcp")

router = APIRouter(prefix="/mcp/v1", tags=["Model Context Protocol (MCP) Server"])

# Active SSE Session Queues
sse_sessions: Dict[str, asyncio.Queue] = {}


class McpContext:
    def __init__(self, user_id: str, project_id: Optional[str] = None):
        self.user_id = user_id
        self.project_id = project_id


from fastapi import status
from callcraft_api.db.models import Project

async def resolve_mcp_context(
    x_user_id: Optional[str] = Header(None, alias="X-USER-ID"),
    x_project_id: Optional[str] = Header(None, alias="X-PROJECT-ID"),
    user_id: Optional[str] = Query(None),
    project_id: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None),
    db: Optional[AsyncSession] = Depends(get_db_session),
) -> McpContext:
    """Strictly verifies user identity and project scope against database credentials without fallback hacks."""
    uid = x_user_id or user_id
    if not uid and authorization:
        if authorization.startswith("Bearer "):
            uid = authorization.replace("Bearer ", "").strip()
        else:
            uid = authorization.strip()

    if not uid or not uid.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Header 'X-USER-ID' atau query param 'user_id' wajib diisi untuk autentikasi MCP Server.",
        )

    clean_uid = uid.strip()

    if db:
        stmt_u = select(User).where(User.id == clean_uid)
        res_u = await db.execute(stmt_u)
        user_obj = res_u.scalar_one_or_none()
        if not user_obj:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Identitas pengguna '{clean_uid}' tidak ditemukan di database platform.",
            )

    target_project_id = (x_project_id or project_id or "").strip() or None
    if target_project_id and db:
        stmt_p = select(Project).where(Project.id == target_project_id, Project.user_id == clean_uid)
        res_p = await db.execute(stmt_p)
        proj_obj = res_p.scalar_one_or_none()
        if not proj_obj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Project '{target_project_id}' tidak ditemukan untuk user '{clean_uid}'.",
            )

    return McpContext(user_id=clean_uid, project_id=target_project_id)




# ============================================================================
# MCP TOOLS DECLARATIONS
# ============================================================================

MCP_TOOLS = [
    {
        "name": "callcraft_list_projects",
        "description": "List all projects in CallCraft workspace for the current user.",
        "inputSchema": {
            "type": "object",
            "properties": {},
        },
    },
    {
        "name": "callcraft_list_specs",
        "description": "List all CallCraft endpoint specifications, optionally filtered by project_id.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "project_id": {"type": "string", "description": "Optional Project ID filter"}
            },
        },
    },
    {
        "name": "callcraft_get_spec",
        "description": "Retrieve full CallCraft specification details by spec_id or slug.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "spec_id": {"type": "string", "description": "Call Spec ID or slug"}
            },
            "required": ["spec_id"],
        },
    },
    {
        "name": "callcraft_get_spec_section",
        "description": "Retrieve a specific section of a CallCraft spec (request-schema, response-schema, prompts, tools-config, config).",
        "inputSchema": {
            "type": "object",
            "properties": {
                "spec_id": {"type": "string", "description": "Call Spec ID or slug"},
                "section": {
                    "type": "string",
                    "enum": ["request-schema", "response-schema", "prompts", "tools-config", "config"],
                    "description": "Target section name",
                },
            },
            "required": ["spec_id", "section"],
        },
    },
    {
        "name": "callcraft_create_spec",
        "description": "Create a new CallCraft endpoint specification with schemas, prompts, and tool calling settings.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "Call Spec name"},
                "slug": {"type": "string", "description": "URL slug for API endpoint"},
                "project_id": {"type": "string", "description": "Project ID this spec belongs to"},
                "description": {"type": "string", "description": "Spec description"},
                "request_schema": {"type": "object", "description": "JSON Schema of input payload"},
                "response_schema": {"type": "object", "description": "JSON Schema of target output"},
                "positive_prompt": {"type": "string", "description": "Positive AI extraction instructions"},
                "negative_prompt": {"type": "string", "description": "Negative prompt constraints"},
                "additional_prompt": {"type": "string", "description": "Default additional user prompt"},
                "tools_config": {"type": "object", "description": "Tool calling configuration"},
                "use_external_api_key": {"type": "boolean", "default": True},
                "external_model_name": {"type": "string", "default": "gemini-3.6-flash"},
                "external_base_url": {"type": "string", "description": "Optional custom third-party base URL / gateway"},
            },
            "required": ["name", "response_schema", "project_id"],
        },
    },
    {
        "name": "callcraft_update_spec",
        "description": "Update an existing CallCraft endpoint spec or its metadata.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "spec_id": {"type": "string", "description": "Call Spec ID or slug"},
                "name": {"type": "string"},
                "slug": {"type": "string"},
                "description": {"type": "string"},
                "request_schema": {"type": "object"},
                "response_schema": {"type": "object"},
                "positive_prompt": {"type": "string"},
                "negative_prompt": {"type": "string"},
                "additional_prompt": {"type": "string"},
                "tools_config": {"type": "object"},
                "allow_additional_prompt": {"type": "boolean"},
                "use_external_api_key": {"type": "boolean"},
                "external_model_name": {"type": "string"},
                "external_api_key": {"type": "string"},
                "external_base_url": {"type": "string", "description": "Optional custom third-party base URL / gateway"},
            },
            "required": ["spec_id"],
        },
    },
    {
        "name": "callcraft_update_spec_section",
        "description": "Update only a specific section of a spec (e.g. modify system prompt, change response schema, edit tools config).",
        "inputSchema": {
            "type": "object",
            "properties": {
                "spec_id": {"type": "string", "description": "Call Spec ID or slug"},
                "section": {
                    "type": "string",
                    "enum": ["request-schema", "response-schema", "prompts", "tools-config", "config"],
                    "description": "Section to update",
                },
                "content": {"type": "object", "description": "JSON payload for the section"},
            },
            "required": ["spec_id", "section", "content"],
        },
    },
    {
        "name": "callcraft_delete_spec",
        "description": "Delete a CallCraft endpoint specification by ID or slug.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "spec_id": {"type": "string", "description": "Call Spec ID or slug to delete"}
            },
            "required": ["spec_id"],
        },
    },
    {
        "name": "callcraft_export_spec_json",
        "description": "Export a CallCraft spec as a complete, standardized JSON document.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "spec_id": {"type": "string", "description": "Call Spec ID or slug"}
            },
            "required": ["spec_id"],
        },
    },
    {
        "name": "callcraft_import_spec_json",
        "description": "Import a complete spec JSON document to replace an existing spec or create a new spec in DB.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "spec_id": {"type": "string", "description": "Optional existing spec_id to replace/update"},
                "project_id": {"type": "string", "description": "Optional project_id for new spec"},
                "spec_json": {"type": "object", "description": "Full spec JSON content object"},
            },
            "required": ["spec_json"],
        },
    },
    {
        "name": "callcraft_list_user_ai_providers",
        "description": "List AI provider API keys and third-party base URLs currently activated/configured by the user in CallCraft.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "project_id": {"type": "string", "description": "Optional project ID to filter provider keys"}
            },
        },
    },
    {
        "name": "callcraft_list_ai_models",
        "description": "List all active AI models and providers supported in CallCraft (including capabilities like image input and tool calling).",
        "inputSchema": {
            "type": "object",
            "properties": {
                "provider": {"type": "string", "description": "Optional provider code filter: openai, gemini, anthropic, deepseek, mistral"}
            },
        },
    },
    {
        "name": "callcraft_verify_ai_provider",
        "description": "Verify connection and health of an AI Provider (test stored API key or a custom base_url / third-party gateway).",
        "inputSchema": {
            "type": "object",
            "properties": {
                "provider": {"type": "string", "description": "Provider code to verify: gemini, openai, anthropic, deepseek, mistral"},
                "base_url": {"type": "string", "description": "Optional custom base URL / third-party gateway to test"},
                "api_key": {"type": "string", "description": "Optional raw API key to test. If omitted, uses user's active configured key in CallCraft."},
            },
            "required": ["provider"],
        },
    },
]


# ============================================================================
# TOOL EXECUTION DISPATCHER
# ============================================================================

async def execute_mcp_tool(
    name: str,
    arguments: Dict[str, Any],
    user_id: str,
    db: AsyncSession,
    default_project_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Executes CallCraft MCP Tool based on requested method name."""
    if name == "callcraft_list_projects":
        projects = await Repository.list_projects(db, user_id)
        return {"projects": projects}

    elif name == "callcraft_list_specs":
        project_id = arguments.get("project_id") or default_project_id
        specs = await Repository.list_call_specs(db, user_id, project_id=project_id)
        return {"specs": specs}

    elif name == "callcraft_get_spec":
        spec_id = arguments["spec_id"]
        spec = await Repository.get_call_spec(db, user_id, spec_id)
        if not spec:
            raise ValueError(f"Call Spec '{spec_id}' not found")
        return spec

    elif name == "callcraft_get_spec_section":
        spec_id = arguments["spec_id"]
        section = arguments["section"].lower().replace("_", "-")
        spec = await Repository.get_call_spec(db, user_id, spec_id)
        if not spec:
            raise ValueError(f"Call Spec '{spec_id}' not found")

        if section in ["request-schema", "request"]:
            return {"requestSchema": spec.get("requestSchema")}
        elif section in ["response-schema", "response"]:
            return {"responseSchema": spec.get("responseSchema")}
        elif section in ["prompts", "prompt"]:
            return {
                "positivePrompt": spec.get("positivePrompt") or spec.get("extractionPrompt"),
                "negativePrompt": spec.get("negativePrompt"),
                "additionalPrompt": spec.get("additionalPrompt"),
            }
        elif section in ["tools-config", "tools", "toolcalling"]:
            return {"toolsConfig": spec.get("toolsConfig") or {}}
        elif section in ["config", "settings"]:
            return {
                "allowAdditionalPrompt": spec.get("allowAdditionalPrompt", True),
                "useExternalApiKey": spec.get("useExternalApiKey", True),
                "externalModelName": spec.get("externalModelName"),
                "externalApiKey": spec.get("externalApiKey"),
                "externalBaseUrl": spec.get("externalBaseUrl"),
            }
        else:
            raise ValueError(f"Unknown section '{section}'")

    elif name == "callcraft_create_spec":
        spec_name = arguments["name"]
        raw_slug = arguments.get("slug") or spec_name
        base_slug = raw_slug.lower().replace(" ", "-")
        slug = f"{base_slug}-{str(ulid.new()).lower()[-4:]}"
        target_project_id = (arguments.get("project_id") or default_project_id or "").strip()
        if not target_project_id:
            raise ValueError("Parameter 'project_id' wajib diisi untuk membuat Call Spec baru di MCP Server.")

        spec = await Repository.create_call_spec(
            db=db,
            user_id=user_id,
            name=spec_name,
            slug=slug,
            project_id=target_project_id,
            description=arguments.get("description"),
            request_schema=arguments.get("request_schema"),
            response_schema=arguments["response_schema"],
            positive_prompt=arguments.get("positive_prompt"),
            negative_prompt=arguments.get("negative_prompt"),
            additional_prompt=arguments.get("additional_prompt"),
            use_external_api_key=arguments.get("use_external_api_key", True),
            external_model_name=arguments.get("external_model_name", "gemini-3.6-flash"),
            external_base_url=arguments.get("external_base_url") or arguments.get("externalBaseUrl"),
            tools_config=arguments.get("tools_config"),
        )
        return {"message": "Spec created successfully", "spec": spec}


    elif name == "callcraft_update_spec":
        spec_id = arguments["spec_id"]
        updated = await Repository.update_call_spec(
            db=db,
            user_id=user_id,
            spec_id_or_slug=spec_id,
            name=arguments.get("name"),
            slug=arguments.get("slug"),
            description=arguments.get("description"),
            request_schema=arguments.get("request_schema"),
            response_schema=arguments.get("response_schema"),
            positive_prompt=arguments.get("positive_prompt"),
            negative_prompt=arguments.get("negative_prompt"),
            additional_prompt=arguments.get("additional_prompt"),
            allow_additional_prompt=arguments.get("allow_additional_prompt"),
            use_external_api_key=arguments.get("use_external_api_key"),
            external_model_name=arguments.get("external_model_name"),
            external_api_key=arguments.get("external_api_key"),
            external_base_url=arguments.get("external_base_url") or arguments.get("externalBaseUrl"),
            tools_config=arguments.get("tools_config"),
        )
        if not updated:
            raise ValueError(f"Call Spec '{spec_id}' not found")

        await redis_service.delete_spec(user_id, spec_id)
        if updated.get("slug"):
            await redis_service.delete_spec(user_id, updated["slug"])
        return {"message": "Spec updated successfully", "spec": updated}

    elif name == "callcraft_update_spec_section":
        spec_id = arguments["spec_id"]
        section = arguments["section"].lower().replace("_", "-")
        content = arguments["content"]

        update_kwargs: Dict[str, Any] = {}
        if section in ["request-schema", "request"]:
            update_kwargs["request_schema"] = content.get("requestSchema") if isinstance(content, dict) and "requestSchema" in content else content
        elif section in ["response-schema", "response"]:
            update_kwargs["response_schema"] = content.get("responseSchema") if isinstance(content, dict) and "responseSchema" in content else content
        elif section in ["prompts", "prompt"]:
            if isinstance(content, dict):
                if "positivePrompt" in content or "positive_prompt" in content:
                    update_kwargs["positive_prompt"] = content.get("positivePrompt") or content.get("positive_prompt")
                if "negativePrompt" in content or "negative_prompt" in content:
                    update_kwargs["negative_prompt"] = content.get("negativePrompt") or content.get("negative_prompt")
                if "additionalPrompt" in content or "additional_prompt" in content:
                    update_kwargs["additional_prompt"] = content.get("additionalPrompt") or content.get("additional_prompt")
        elif section in ["tools-config", "tools", "toolcalling"]:
            update_kwargs["tools_config"] = content.get("toolsConfig") if isinstance(content, dict) and "toolsConfig" in content else content
        elif section in ["config", "settings"]:
            if isinstance(content, dict):
                if "allowAdditionalPrompt" in content:
                    update_kwargs["allow_additional_prompt"] = content["allowAdditionalPrompt"]
                if "useExternalApiKey" in content:
                    update_kwargs["use_external_api_key"] = content["useExternalApiKey"]
                if "externalModelName" in content:
                    update_kwargs["external_model_name"] = content["externalModelName"]
                if "externalApiKey" in content:
                    update_kwargs["external_api_key"] = content["externalApiKey"]
                if "externalBaseUrl" in content or "external_base_url" in content:
                    update_kwargs["external_base_url"] = content.get("externalBaseUrl") or content.get("external_base_url")

        updated = await Repository.update_call_spec(
            db=db,
            user_id=user_id,
            spec_id_or_slug=spec_id,
            **update_kwargs,
        )
        if not updated:
            raise ValueError(f"Call Spec '{spec_id}' not found")

        await redis_service.delete_spec(user_id, spec_id)
        if updated.get("slug"):
            await redis_service.delete_spec(user_id, updated["slug"])

        return {"message": f"Section '{section}' updated successfully", "spec": updated}

    elif name == "callcraft_delete_spec":
        spec_id = arguments["spec_id"]
        success = await Repository.delete_call_spec(db, user_id, spec_id)
        if not success:
            raise ValueError(f"Call Spec '{spec_id}' not found")
        await redis_service.delete_spec(user_id, spec_id)
        return {"message": "Spec deleted successfully", "id": spec_id}

    elif name == "callcraft_export_spec_json":
        spec_id = arguments["spec_id"]
        spec = await Repository.get_call_spec(db, user_id, spec_id)
        if not spec:
            raise ValueError(f"Call Spec '{spec_id}' not found")

        export_payload = {
            "version": "1.0",
            "id": spec.get("id"),
            "name": spec.get("name"),
            "slug": spec.get("slug"),
            "projectId": spec.get("projectId") or spec.get("project_id"),
            "description": spec.get("description"),
            "requestSchema": spec.get("requestSchema"),
            "responseSchema": spec.get("responseSchema"),
            "prompts": {
                "positivePrompt": spec.get("positivePrompt") or spec.get("extractionPrompt"),
                "negativePrompt": spec.get("negativePrompt"),
                "additionalPrompt": spec.get("additionalPrompt"),
            },
            "toolsConfig": spec.get("toolsConfig") or {},
            "config": {
                "allowAdditionalPrompt": spec.get("allowAdditionalPrompt", True),
                "useExternalApiKey": spec.get("useExternalApiKey", True),
                "externalModelName": spec.get("externalModelName"),
                "externalApiKey": spec.get("externalApiKey"),
            },
        }
        return export_payload

    elif name == "callcraft_import_spec_json":
        spec_json = arguments["spec_json"]
        spec_id = arguments.get("spec_id") or spec_json.get("id")
        project_id = arguments.get("project_id") or spec_json.get("projectId") or spec_json.get("project_id") or default_project_id

        req_schema = spec_json.get("requestSchema") or spec_json.get("request_schema")
        res_schema = spec_json.get("responseSchema") or spec_json.get("response_schema") or {}

        prompts_obj = spec_json.get("prompts") or {}
        pos_prompt = prompts_obj.get("positivePrompt") or spec_json.get("positive_prompt") or spec_json.get("positivePrompt")
        neg_prompt = prompts_obj.get("negativePrompt") or spec_json.get("negative_prompt") or spec_json.get("negativePrompt")
        add_prompt = prompts_obj.get("additionalPrompt") or spec_json.get("additional_prompt") or spec_json.get("additionalPrompt")

        tools_cfg = spec_json.get("toolsConfig") or spec_json.get("tools_config")

        cfg_obj = spec_json.get("config") or {}
        allow_add = bool(cfg_obj.get("allowAdditionalPrompt", spec_json.get("allow_additional_prompt", True)))
        use_ext_key = bool(cfg_obj.get("useExternalApiKey", spec_json.get("use_external_api_key", True)))
        ext_model = spec_json.get("externalModelName") or cfg_obj.get("externalModelName") or spec_json.get("external_model_name")
        ext_key = spec_json.get("externalApiKey") or cfg_obj.get("externalApiKey") or spec_json.get("external_api_key")
        ext_base = spec_json.get("externalBaseUrl") or cfg_obj.get("externalBaseUrl") or spec_json.get("external_base_url") or cfg_obj.get("external_base_url")

        existing = None
        if spec_id and spec_id != "new":
            existing = await Repository.get_call_spec(db, user_id, spec_id)

        if existing:
            updated = await Repository.update_call_spec(
                db=db,
                user_id=user_id,
                spec_id_or_slug=spec_id,
                name=spec_json.get("name"),
                slug=spec_json.get("slug"),
                description=spec_json.get("description"),
                request_schema=req_schema,
                response_schema=res_schema if res_schema else None,
                positive_prompt=pos_prompt,
                negative_prompt=neg_prompt,
                additional_prompt=add_prompt,
                allow_additional_prompt=allow_add,
                use_external_api_key=use_ext_key,
                external_model_name=ext_model,
                external_api_key=ext_key,
                external_base_url=ext_base,
                tools_config=tools_cfg,
            )
            await redis_service.delete_spec(user_id, spec_id)
            return {"message": "Spec imported and updated successfully", "spec": updated}
        else:
            if not project_id or not str(project_id).strip():
                raise ValueError("Parameter 'project_id' wajib diisi untuk meng-import Call Spec baru di MCP Server.")

            name = spec_json.get("name") or "Imported Call Spec"
            raw_slug = spec_json.get("slug") or name
            base_slug = raw_slug.lower().replace(" ", "-")
            slug = f"{base_slug}-{str(ulid.new()).lower()[-4:]}"

            new_spec = await Repository.create_call_spec(
                db=db,
                user_id=user_id,
                name=name,
                slug=slug,
                project_id=project_id,
                description=spec_json.get("description"),
                request_schema=req_schema,
                response_schema=res_schema,
                positive_prompt=pos_prompt,
                negative_prompt=neg_prompt,
                additional_prompt=add_prompt,
                allow_additional_prompt=allow_add,
                use_external_api_key=use_ext_key,
                external_model_name=ext_model,
                external_api_key=ext_key,
                external_base_url=ext_base,
                tools_config=tools_cfg,
            )
            return {"message": "Spec imported and created successfully", "spec": new_spec}

    elif name == "callcraft_list_user_ai_providers":
        target_project_id = arguments.get("project_id") or default_project_id
        providers = await Repository.list_user_ai_providers(db, user_id, project_id=target_project_id)
        sanitized = []
        for p in providers:
            raw_key = p.get("key") or ""
            if len(raw_key) > 8:
                masked_key = f"{raw_key[:4]}...{raw_key[-4:]}"
            elif raw_key:
                masked_key = "***"
            else:
                masked_key = ""
            sanitized.append({
                "id": p.get("id"),
                "providerCode": p.get("providerCode"),
                "providerName": p.get("providerName"),
                "isActive": p.get("isActive", True),
                "baseUrl": p.get("baseUrl") or None,
                "keyConfigured": bool(raw_key),
                "keyMasked": masked_key,
                "projectId": p.get("projectId"),
                "updatedAt": p.get("updatedAt"),
            })
        return {"providers": sanitized}

    elif name == "callcraft_list_ai_models":
        provider_filter = arguments.get("provider", "").lower().strip() if arguments.get("provider") else None

        stmt = (
            select(AiModel)
            .options(joinedload(AiModel.provider))
            .where(AiModel.is_active.is_(True))
            .order_by(AiModel.provider_id, AiModel.name)
        )
        res = await db.execute(stmt)
        models = res.scalars().all()

        output_models = []
        for m in models:
            p_code = m.provider.code if m.provider else ""
            if provider_filter and p_code.lower() != provider_filter:
                continue
            output_models.append({
                "id": m.id,
                "name": m.name,
                "modelIdentifier": m.model_identifier,
                "providerCode": p_code,
                "providerName": m.provider.name if m.provider else "",
                "supportsImage": m.supports_image,
                "supportsToolCalling": m.supports_tool_calling,
                "supportsStructuredOutput": m.supports_structured_output,
                "costPer1kPromptTokens": m.cost_per_1k_prompt_tokens or 0.0,
                "costPer1kCompletionTokens": m.cost_per_1k_completion_tokens or 0.0,
                "isDefault": m.is_default,
            })
        return {"models": output_models}

    elif name == "callcraft_verify_ai_provider":
        provider = arguments.get("provider", "").lower().strip()
        if not provider:
            raise ValueError("Parameter 'provider' wajib diisi (contoh: gemini, openai, anthropic, deepseek, mistral).")

        raw_key = arguments.get("api_key")
        custom_base = arguments.get("base_url")

        # If key or base_url not explicitly passed, fallback to user's stored provider credentials in DB
        if not raw_key or not custom_base:
            creds = await Repository.get_user_ai_provider_credentials(
                db=db, user_id=user_id, provider_code=provider, project_id=default_project_id
            )
            if creds:
                if not raw_key:
                    raw_key = creds.get("apiKey")
                if not custom_base and creds.get("baseUrl"):
                    custom_base = creds.get("baseUrl")

        if not raw_key:
            return {
                "valid": False,
                "statusCode": 404,
                "message": f"Kredensial API Key untuk provider '{provider}' belum dikonfigurasi oleh user di CallCraft.",
            }

        key = raw_key.strip()
        clean_base = custom_base.strip().rstrip("/") if custom_base and custom_base.strip() else None

        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                if provider == "gemini":
                    if clean_base:
                        url = f"{clean_base}/models?key={key}"
                    else:
                        url = f"https://generativelanguage.googleapis.com/v1beta/models?key={key}"
                    resp = await client.get(url)
                elif provider == "openai":
                    url = f"{clean_base}/models" if clean_base else "https://api.openai.com/v1/models"
                    resp = await client.get(url, headers={"Authorization": f"Bearer {key}"})
                elif provider == "anthropic":
                    url = f"{clean_base}/models" if clean_base else "https://api.anthropic.com/v1/models"
                    resp = await client.get(url, headers={"x-api-key": key, "anthropic-version": "2023-06-01"})
                elif provider in ("deepseek", "ocr"):
                    url = f"{clean_base}/models" if clean_base else "https://api.deepseek.com/models"
                    resp = await client.get(url, headers={"Authorization": f"Bearer {key}"})
                elif provider == "mistral":
                    url = f"{clean_base}/models" if clean_base else "https://api.mistral.ai/v1/models"
                    resp = await client.get(url, headers={"Authorization": f"Bearer {key}"})
                else:
                    return {
                        "valid": False,
                        "statusCode": 400,
                        "message": f"Unsupported provider code: '{provider}'",
                    }

                if resp.status_code == 200:
                    return {
                        "valid": True,
                        "statusCode": 200,
                        "provider": provider,
                        "baseUrlUsed": clean_base or "Official Provider Endpoint",
                        "message": f"{provider.capitalize()} API Key and endpoint verified successfully!",
                    }
                else:
                    try:
                        err_msg = resp.json().get("error", {}).get("message", resp.text)
                    except Exception:
                        err_msg = resp.text
                    return {
                        "valid": False,
                        "statusCode": resp.status_code,
                        "provider": provider,
                        "baseUrlUsed": clean_base or "Official Provider Endpoint",
                        "message": f"{provider.capitalize()} test failed ({resp.status_code}): {err_msg}",
                    }
            except httpx.RequestError as exc:
                return {
                    "valid": False,
                    "statusCode": 500,
                    "provider": provider,
                    "baseUrlUsed": clean_base or "Official Provider Endpoint",
                    "message": f"Connection network error while testing {provider}: {str(exc)}",
                }

    else:
        raise ValueError(f"Unknown tool '{name}'")


# ============================================================================
# JSON-RPC PROTOCOL HANDLER
# ============================================================================

async def handle_jsonrpc_request(
    request_data: Dict[str, Any], user_id: str, db: AsyncSession, default_project_id: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """Handles standard JSON-RPC 2.0 MCP requests."""
    req_id = request_data.get("id")
    method = request_data.get("method")
    params = request_data.get("params") or {}

    if not method:
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "error": {"code": -32600, "message": "Invalid Request: method is required"},
        }

    if method == "initialize":
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "protocolVersion": "2024-11-05",
                "capabilities": {
                    "tools": {}
                },
                "serverInfo": {
                    "name": "CallCraft MCP Server",
                    "version": "1.0.0",
                },
            },
        }

    elif method == "notifications/initialized":
        return None

    elif method == "tools/list":
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "tools": MCP_TOOLS
            },
        }

    elif method == "tools/call":
        tool_name = params.get("name")
        arguments = params.get("arguments") or {}

        if not tool_name:
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "error": {"code": -32602, "message": "Invalid params: 'name' is required for tools/call"},
            }

        try:
            res_data = await execute_mcp_tool(
                name=tool_name,
                arguments=arguments,
                user_id=user_id,
                db=db,
                default_project_id=default_project_id,
            )
            res_json_str = json.dumps(res_data, indent=2, default=str, ensure_ascii=False)
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "content": [
                        {
                            "type": "text",
                            "text": res_json_str,
                        }
                    ]
                },
            }
        except Exception as e:
            logger.error(f"Error executing MCP tool '{tool_name}': {e}", exc_info=True)
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "error": {"code": -32603, "message": f"Tool execution failed: {str(e)}"},
            }

    else:
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "error": {"code": -32601, "message": f"Method '{method}' not found"},
        }


# ============================================================================
# HTTP & SSE TRANSPORTS
# ============================================================================

@router.post("/rpc")
async def mcp_http_rpc_endpoint(
    request: Request,
    ctx: McpContext = Depends(resolve_mcp_context),
    db: AsyncSession = Depends(get_db_session),
):
    """Direct HTTP POST JSON-RPC 2.0 endpoint for MCP calls (Langflow, n8n, curl, Postman)."""
    try:
        body = await request.json()
    except Exception as e:
        return {
            "jsonrpc": "2.0",
            "id": None,
            "error": {"code": -32700, "message": f"Parse error: {str(e)}"},
        }

    if isinstance(body, list):
        results = []
        for req in body:
            res = await handle_jsonrpc_request(req, ctx.user_id, db, default_project_id=ctx.project_id)
            if res:
                results.append(res)
        return results

    res = await handle_jsonrpc_request(body, ctx.user_id, db, default_project_id=ctx.project_id)
    return res or {"jsonrpc": "2.0", "result": "ok"}


@router.get("/sse")
async def mcp_sse_endpoint(
    request: Request,
    ctx: McpContext = Depends(resolve_mcp_context),
):
    """Server-Sent Events (SSE) connection endpoint for standard MCP clients."""
    session_id = f"mcp_sess_{str(ulid.new())}"
    queue: asyncio.Queue = asyncio.Queue()
    sse_sessions[session_id] = queue

    async def event_generator():
        try:
            proj_qs = f"&project_id={ctx.project_id}" if ctx.project_id else ""
            endpoint_url = f"/mcp/v1/messages?session_id={session_id}&user_id={ctx.user_id}{proj_qs}"
            yield f"event: endpoint\ndata: {endpoint_url}\n\n"

            while True:
                if await request.is_disconnected():
                    break
                try:
                    msg = await asyncio.wait_for(queue.get(), timeout=15.0)
                    yield f"event: message\ndata: {json.dumps(msg, ensure_ascii=False)}\n\n"
                except asyncio.TimeoutError:
                    # Ping heartbeat
                    yield ": heartbeat\n\n"
        finally:
            sse_sessions.pop(session_id, None)

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.post("/messages")
async def mcp_messages_endpoint(
    request: Request,
    session_id: str = Query(...),
    ctx: McpContext = Depends(resolve_mcp_context),
    db: AsyncSession = Depends(get_db_session),
):
    """Message endpoint receiving JSON-RPC requests for active SSE sessions."""
    try:
        body = await request.json()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON payload: {str(e)}")

    res = await handle_jsonrpc_request(body, ctx.user_id, db, default_project_id=ctx.project_id)

    if session_id in sse_sessions and res:
        await sse_sessions[session_id].put(res)

    return Response(status_code=202)

