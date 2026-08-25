import json
import logging
from typing import Any, Dict, List, Optional
from callcraft_engine.schema import FieldDefinition, PlatformDataType

logger = logging.getLogger("callcraft.api.execution_service")


def parse_dict_to_field_def(fmeta: dict, is_required: bool = True) -> FieldDefinition:
    """Recursively converts dictionary schema definitions into FieldDefinition objects."""
    ftype_str = fmeta.get("type", "string").lower()
    try:
        ptype = PlatformDataType(ftype_str)
    except ValueError:
        ptype = PlatformDataType.STRING

    sub_props = None
    if ptype == PlatformDataType.OBJECT and "properties" in fmeta and isinstance(fmeta["properties"], dict):
        sub_req_list = fmeta.get("required") or []
        if not isinstance(sub_req_list, list):
            sub_req_list = []
        sub_props = {}
        for sub_name, sub_meta in fmeta["properties"].items():
            if isinstance(sub_meta, dict):
                sub_req = sub_meta.get("required")
                if isinstance(sub_req, bool):
                    sub_is_req = sub_req
                elif sub_req_list:
                    sub_is_req = sub_name in sub_req_list
                else:
                    sub_is_req = True
                sub_props[sub_name] = parse_dict_to_field_def(sub_meta, is_required=sub_is_req)

    sub_items = None
    if ptype == PlatformDataType.ARRAY and "items" in fmeta and isinstance(fmeta["items"], dict):
        sub_items = parse_dict_to_field_def(fmeta["items"], is_required=True)

    enum_vals = fmeta.get("enum_values") or fmeta.get("enum")

    return FieldDefinition(
        type=ptype,
        description=fmeta.get("description"),
        required=is_required,
        enum_values=enum_vals,
        properties=sub_props,
        items=sub_items,
    )


def _is_meaningful_value(val: Any) -> bool:
    """Recursively checks if a value contains meaningful content (not None, empty string, or empty dict/list)."""
    if val in (None, "", "Tidak Terdeteksi"):
        return False
    if isinstance(val, dict):
        return any(_is_meaningful_value(sub_v) for sub_v in val.values())
    if isinstance(val, list):
        return any(_is_meaningful_value(item) for item in val)
    return True


def build_execution_trace_steps(
    raw_ai_out: Dict[str, Any],
    tools_list: List[Dict[str, Any]],
    configured_tool_name: str,
    configured_agent_name: str,
    processing_time_ms: int,
) -> List[Dict[str, Any]]:
    """
    Constructs executionTrace steps list purely based on AI model function call decisions.
    If no function tool was executed by the AI model, returns an empty list [].
    """
    if not isinstance(raw_ai_out, dict):
        return []

    executed_tools = raw_ai_out.get("_executed_tools")
    if not executed_tools or not isinstance(executed_tools, list):
        return []

    execution_steps = []
    step_duration = int(processing_time_ms / len(executed_tools)) if executed_tools else processing_time_ms

    for idx, tool_info in enumerate(executed_tools, start=1):
        t_name_raw = tool_info.get("name") if isinstance(tool_info, dict) else str(tool_info)
        t_name_str = str(t_name_raw or configured_tool_name or "extract_data")
        t_agent = None

        if tools_list:
            for t in tools_list:
                if isinstance(t, dict) and t.get("name") and str(t.get("name")).strip() == t_name_str.strip():
                    t_agent = t.get("agentRole")
                    break

        agent_final = str(t_agent or configured_agent_name or "vision_parser").strip()
        tool_final = t_name_str.strip()

        execution_steps.append({
            "stepId": f"step_{idx}",
            "agent": agent_final,
            "actionType": "tool_call",
            "toolName": tool_final,
            "status": tool_info.get("status", "success") if isinstance(tool_info, dict) else "success",
            "durationMs": tool_info.get("durationMs", step_duration) if isinstance(tool_info, dict) else step_duration,
        })

    return execution_steps
