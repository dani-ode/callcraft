import json
import httpx
from typing import Any, Dict, List, Optional

try:
    from langflow.custom import Component
    from langflow.io import (
        DataInput,
        DictInput,
        DropdownInput,
        FileInput,
        MessageTextInput,
        Output,
        SecretStrInput,
        StrInput,
    )
    from langflow.schema import Data, Message
except ImportError:
    # Graceful fallback mock for testing outside an active Langflow runtime
    class Component:
        def __init__(self, **kwargs):
            for k, v in kwargs.items():
                setattr(self, k, v)

    class Output:
        def __init__(self, **kwargs): pass
    class StrInput:
        def __init__(self, **kwargs): pass
    class SecretStrInput:
        def __init__(self, **kwargs): pass
    class DropdownInput:
        def __init__(self, **kwargs): pass
    class MessageTextInput:
        def __init__(self, **kwargs): pass
    class FileInput:
        def __init__(self, **kwargs): pass
    class DictInput:
        def __init__(self, **kwargs): pass
    class DataInput:
        def __init__(self, **kwargs): pass

    class Data:
        def __init__(self, data=None): self.data = data or {}
    class Message:
        def __init__(self, text=""): self.text = text


class CallcraftComponent(Component):
    display_name = "Callcraft AI Spec Execution"
    description = "Connects to Callcraft to list projects, fetch specs, and execute AI document & schema extraction"
    icon = "sparkles"
    name = "CallcraftComponent"

    inputs = [
        StrInput(
            name="base_url",
            display_name="Callcraft Base URL",
            info="Base URL of Callcraft API (e.g. http://localhost:8081)",
            value="http://localhost:8081",
            required=True,
        ),
        StrInput(
            name="user_id",
            display_name="User ID",
            info="Your Callcraft User ID (e.g. usr_01HZX89ABCDEF1234567890XY)",
            required=True,
        ),
        StrInput(
            name="public_key",
            display_name="Public Key",
            info="Credential Public Key (e.g. pk_live_...)",
            required=True,
        ),
        SecretStrInput(
            name="secret_key",
            display_name="Secret Key",
            info="Credential Secret Key (e.g. call_sk_live_...)",
            required=True,
        ),
        DropdownInput(
            name="project_id",
            display_name="Project",
            info="Select project from your Callcraft workspace (dynamically loaded via credentials)",
            options=[],
            value="",
            refresh_button=True,
        ),
        DropdownInput(
            name="spec_id",
            display_name="Call Spec",
            info="Select Callcraft Spec to execute (dynamically loaded by project)",
            options=[],
            value="",
            refresh_button=True,
        ),
        StrInput(
            name="document_input",
            display_name="Document (URL, File Path, or Base64)",
            info="HTTP/HTTPS URL of document or base64 data string",
            value="",
        ),
        MessageTextInput(
            name="custom_prompt",
            display_name="Additional Prompt",
            info="Optional custom prompt instructions or focus",
            value="",
        ),
        DictInput(
            name="variables",
            display_name="Context Variables",
            info="Key-value pairs interpolated into {{placeholders}} in the spec prompts",
            value={},
        ),
        StrInput(
            name="ai_model_override",
            display_name="AI Model Override",
            info="Optional model name override (e.g. gemini-3.6-flash)",
            value="",
            advanced=True,
        ),
    ]

    outputs = [
        Output(display_name="Extracted Data", name="result_data", method="build_data_output"),
        Output(display_name="Text Message", name="result_message", method="build_message_output"),
    ]

    def _get_headers(self) -> Dict[str, str]:
        secret = getattr(self, "secret_key", "")
        if hasattr(secret, "get_secret_value"):
            secret = secret.get_secret_value()
        return {
            "X-USER-ID": str(getattr(self, "user_id", "")).strip(),
            "X-CALL-PUBLIC-KEY": str(getattr(self, "public_key", "")).strip(),
            "Authorization": f"Bearer {str(secret).strip()}",
        }

    def fetch_projects(self) -> List[Dict[str, Any]]:
        """Queries GET /v1/projects using configured credentials."""
        base_url = str(getattr(self, "base_url", "http://localhost:8081")).rstrip("/")
        headers = self._get_headers()
        with httpx.Client(timeout=10.0) as client:
            resp = client.get(f"{base_url}/v1/projects", headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                return data.get("data", [])
        return []

    def fetch_specs(self, project_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Queries GET /v1/specs?projectId=... using configured credentials."""
        base_url = str(getattr(self, "base_url", "http://localhost:8081")).rstrip("/")
        headers = self._get_headers()
        params = {}
        if project_id and str(project_id).strip():
            params["projectId"] = str(project_id).strip()

        with httpx.Client(timeout=10.0) as client:
            resp = client.get(f"{base_url}/v1/specs", headers=headers, params=params)
            if resp.status_code == 200:
                data = resp.json()
                return data.get("data", [])
        return []

    def update_build_config(self, build_config: dict, field_value: Any, field_name: Optional[str] = None) -> dict:
        """Dynamically populates Project and Spec dropdowns in the Langflow UI."""
        try:
            if field_name in ["user_id", "public_key", "secret_key", "project_id"]:
                projects = self.fetch_projects()
                project_options = [p["name"] for p in projects]
                project_map = {p["name"]: p["id"] for p in projects}
                build_config["project_id"]["options"] = project_options

                selected_project_name = build_config.get("project_id", {}).get("value")
                selected_project_id = project_map.get(selected_project_name, selected_project_name)

                specs = self.fetch_specs(project_id=selected_project_id)
                build_config["spec_id"]["options"] = [s.get("slug") or s.get("name") for s in specs]
        except Exception:
            pass
        return build_config

    def execute_spec(self) -> Dict[str, Any]:
        """Calls POST /v1/call and returns the structured extraction result."""
        base_url = str(getattr(self, "base_url", "http://localhost:8081")).rstrip("/")
        headers = self._get_headers()

        spec_identifier = str(getattr(self, "spec_id", "")).strip()
        if not spec_identifier:
            raise ValueError("Call Spec wajib dipilih sebelum eksekusi.")

        headers["X-CALL-SPEC-ID"] = spec_identifier

        model_override = str(getattr(self, "ai_model_override", "")).strip()
        if model_override:
            headers["X-AI-MODEL-NAME"] = model_override

        payload: Dict[str, Any] = {}

        doc = str(getattr(self, "document_input", "")).strip()
        if doc:
            payload["file"] = doc

        prompt = str(getattr(self, "custom_prompt", "")).strip()
        if prompt:
            payload["prompt"] = prompt

        vars_input = getattr(self, "variables", {})
        if isinstance(vars_input, str) and vars_input.strip():
            try:
                payload["variables"] = json.loads(vars_input)
            except Exception:
                payload["variables"] = {}
        elif isinstance(vars_input, dict):
            payload["variables"] = vars_input

        with httpx.Client(timeout=60.0) as client:
            resp = client.post(f"{base_url}/v1/call", headers=headers, json=payload)
            if resp.status_code != 200:
                raise RuntimeError(
                    f"Callcraft Execution Failed [{resp.status_code}]: {resp.text}"
                )
            result = resp.json()
            return result.get("data", result)

    def build_data_output(self) -> Data:
        data = self.execute_spec()
        return Data(data=data)

    def build_message_output(self) -> Message:
        data = self.execute_spec()
        return Message(text=json.dumps(data, indent=2, ensure_ascii=False))
