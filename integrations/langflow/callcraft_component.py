import os
import json
import base64
import inspect
import asyncio
import requests
import mimetypes
from typing import Any, Dict, List, Optional, Tuple

# =============================================================================
# KONFIGURASI GLOBAL CALLCRAFT (CENTRALIZED CONFIGURATION)
# Ubah konfigurasi di bawah ini jika URL, domain, timeout, atau endpoint berubah.
# Anda hanya perlu mengubah nilai di bagian ini tanpa mengedit logika di bawah.
# =============================================================================

# 1. Base URL API Callcraft Production
# Secara default mengarah langsung ke server produksi Callcraft (callcraft.daniode.com).
# Endpoint backend API berada di: https://callcraft-api.daniode.com
CALLCRAFT_BASE_URL: str = os.environ.get("CALLCRAFT_API_URL", "https://callcraft-api.daniode.com")

# 2. Endpoint Path API Callcraft
CALLCRAFT_PROJECTS_ENDPOINT: str = "/v1/projects"
CALLCRAFT_SPECS_ENDPOINT: str = "/v1/specs"
CALLCRAFT_CALL_ENDPOINT: str = "/v1/call"

# 3. Timeout Konfigurasi HTTP (dalam detik)
CALLCRAFT_API_TIMEOUT: int = 60          # Timeout eksekusi spec AI (POST /v1/call)
CALLCRAFT_DISCOVERY_TIMEOUT: int = 10    # Timeout penarikan list project/specs dropdown

# 4. Metadata Tampilan Komponen Langflow
COMPONENT_DISPLAY_NAME: str = "Callcraft Spec"
COMPONENT_DESCRIPTION: str = "Menerima objek Data/Message/JSON dari node sebelumnya, otomatis ekstrak file ke Base64, dan mengeksekusi AI Callcraft Spec."
COMPONENT_DOCUMENTATION: str = "https://callcraft.daniode.com"
COMPONENT_ICON: str = "Workflow"

# 5. Metadata Internal Langflow yang Diabaikan dari Body Request
IGNORED_METADATA_KEYS: set = {
    "timestamp", "sender", "sender_name", "session_id", "context_id",
    "error", "edit", "properties", "category", "content_blocks",
    "session_metadata", "id", "flow_id", "run_id", "duration",
    "text_key", "default_value"
}


# =============================================================================
# IMPORTS FRAMEWORK LANGFLOW / LFX
# Langflow AST validator (validate.py) mewajibkan import top-level langsung
# tanpa blok try/except bersarang agar simbol Component dikenali saat build.
# =============================================================================
from lfx.custom.custom_component.component import Component
from lfx.io import DataInput, DropdownInput, Output, SecretStrInput, StrInput
from lfx.schema.data import Data
from lfx.services.deps import get_storage_service


def _clean_base_url(url: Optional[str]) -> str:
    """
    Membersihkan dan menormalisasi Base URL:
    1. Menggunakan default CALLCRAFT_BASE_URL jika kosong.
    2. Menambahkan skema https:// jika protokol belum disertakan.
    3. Mengarahkan domain frontend callcraft.daniode.com ke backend API callcraft-api.daniode.com.
    4. Menghilangkan trailing slash '/' dan path '/v1' jika pengguna menyertakannya.
    """
    raw = (url or CALLCRAFT_BASE_URL).strip()
    if not raw:
        raw = CALLCRAFT_BASE_URL

    if not raw.startswith("http://") and not raw.startswith("https://"):
        raw = f"https://{raw}"

    # Jika pengguna memasukkan domain frontend (callcraft.daniode.com), alihkan ke API server
    if "callcraft.daniode.com" in raw and "callcraft-api.daniode.com" not in raw:
        raw = raw.replace("callcraft.daniode.com", "callcraft-api.daniode.com")

    raw = raw.rstrip("/")
    if raw.endswith("/v1"):
        raw = raw[:-3]
    return raw


class CallcraftAPIComponent(Component):
    display_name = COMPONENT_DISPLAY_NAME
    description = COMPONENT_DESCRIPTION
    documentation: str = COMPONENT_DOCUMENTATION
    icon = COMPONENT_ICON
    name = "CallcraftAPIComponent"

    inputs = [
        # 1. Kredensial Otentikasi Wajib (Wajib diisi terlebih dahulu untuk dropdown otomatis)
        StrInput(
            name="user_id",
            display_name="User ID",
            info="ID Pengguna Callcraft Anda (misal: usr_01HZX89ABCDEF1234567890XY).",
            required=True,
        ),
        StrInput(
            name="public_key",
            display_name="Public Key",
            info="Public Key API Key Callcraft Anda (misal: pk_live_...).",
            required=True,
        ),
        SecretStrInput(
            name="secret_key",
            display_name="Secret Key",
            info="Secret Key API Key Callcraft Anda (misal: call_sk_live_...).",
            required=True,
        ),

        # 2. Dropdown Dinamis: Project & Call Spec
        DropdownInput(
            name="project_id",
            display_name="Project",
            info="Pilih project Callcraft (klik tombol refresh untuk memuat otomatis daftar project). Anda juga dapat mengetik langsung.",
            options=[],
            value="",
            combobox=True,
            refresh_button=True,
        ),
        DropdownInput(
            name="spec_id",
            display_name="Call Spec ID / Slug",
            info="Pilih Callcraft Spec yang ingin dieksekusi (otomatis terfilter berdasarkan project terpilih) atau ketik spec ID/slug langsung.",
            options=[],
            value="",
            combobox=True,
            refresh_button=True,
            required=True,
        ),

        # 3. Base URL (Default dari konstanta global di atas)
        StrInput(
            name="base_url",
            display_name="Callcraft Base URL",
            info="Base URL API Callcraft. Secara default mengarah langsung ke server produksi.",
            value=CALLCRAFT_BASE_URL,
            required=True,
            advanced=True,
        ),

        # 4. Input Manual Opsional
        StrInput(
            name="custom_prompt",
            display_name="Additional Prompt",
            info="Opsional: Prompt instruksi tambahan untuk ekstraksi AI.",
            value="",
            required=False,
            advanced=True,
        ),
        StrInput(
            name="document_input",
            display_name="Document URL / Base64 (Manual)",
            info="Opsional: Masukkan URL dokumen atau data Base64 jika tidak menggunakan node input sebelumnya.",
            value="",
            required=False,
            advanced=True,
        ),

        # 5. Optional Headers (AI Provider Override)
        StrInput(
            name="ai_model_name",
            display_name="AI Model Name",
            info="Opsional: Nama model AI override (misal: gemini-2.5-flash, gpt-4o).",
            required=False,
            advanced=True,
        ),
        SecretStrInput(
            name="ai_api_key",
            display_name="AI API Key",
            info="Opsional: API Key provider AI override. Hanya dikirim jika AI Model Name diisi.",
            required=False,
            advanced=True,
        ),
        StrInput(
            name="ai_base_url",
            display_name="AI Base URL",
            info="Opsional: Base URL custom provider AI override.",
            required=False,
            advanced=True,
        ),

        # 6. Input Data dari Node Sebelumnya (Chat Input, File, Data, Message, JSON)
        DataInput(
            name="input_data",
            display_name="Input Data (Payload)",
            input_types=["Message", "Data", "dict", "Text", "str", "list"],
            info="Hubungkan node sebelumnya di sini (Chat Input, File, Data, Message, atau JSON). File gambar/PDF akan otomatis diekstrak ke Base64.",
            required=False,
        ),
    ]

    outputs = [
        Output(display_name="Output JSON", name="output_json", method="call_api"),
    ]

    def _get_input_value(self, input_name: str) -> str:
        """
        Mengambil nilai mentah input dengan aman.
        Solusi kritis untuk:
        1. Langflow property shadowing: 'self.user_id' di-shadow oleh property internal Component bawaan.
           Oleh karena itu, wajib mengambil nilai dari 'self._attributes[input_name]' terlebih dahulu.
        2. Objek SecretStr: memanggil '.get_secret_value()' agar kunci rahasia tidak ter-masking menjadi '**********'.
        """
        val = None

        if hasattr(self, "_attributes") and isinstance(self._attributes, dict) and input_name in self._attributes:
            val = self._attributes[input_name]

        if val is None:
            attr_val = getattr(self, input_name, None)
            if input_name == "user_id" and attr_val is getattr(self, "_user_id", None):
                val = None
            else:
                val = attr_val

        if val is None:
            return ""

        if hasattr(val, "get_secret_value"):
            return val.get_secret_value()
        if hasattr(val, "value"):
            return val.value
        return str(val)

    def _read_file_from_storage(self, storage_service, folder_name: str, file_name: str) -> bytes:
        """
        Membaca bytes file dari storage service Langflow dengan aman.
        Mendukung async/sync storage_service.get_file dan fallback filesystem lokal.
        """
        if storage_service:
            try:
                res = storage_service.get_file(folder_name, file_name)
                if inspect.isawaitable(res):
                    try:
                        loop = asyncio.get_running_loop()
                    except RuntimeError:
                        loop = None
                    if loop and loop.is_running():
                        try:
                            import nest_asyncio
                            nest_asyncio.apply()
                            return loop.run_until_complete(res)
                        except Exception:
                            pass
                    return asyncio.run(res)
                elif isinstance(res, bytes):
                    return res
            except Exception:
                pass

            try:
                if hasattr(storage_service, "build_full_path"):
                    path_obj = storage_service.build_full_path(folder_name, file_name)
                    path_str = str(path_obj)
                    if os.path.exists(path_str):
                        with open(path_str, "rb") as f:
                            return f.read()
            except Exception:
                pass

        # Fallback pencarian file di filesystem lokal
        possible_paths = [
            os.path.join(folder_name, file_name),
            os.path.expanduser(f"~/.cache/langflow/storage/{folder_name}/{file_name}"),
            os.path.expanduser(f"~/.langflow/storage/{folder_name}/{file_name}"),
            os.path.expanduser(f"~/.cache/langflow/{folder_name}/{file_name}"),
        ]
        for p in possible_paths:
            if os.path.exists(p):
                with open(p, "rb") as f:
                    return f.read()

        raise FileNotFoundError(f"File '{folder_name}/{file_name}' tidak dapat dibaca dari storage service maupun filesystem lokal.")

    def _extract_payload_and_files(self, input_data):
        """
        Secara otomatis mengekstrak seluruh JSON key-value dari node sebelumnya,
        sekaligus menangkap file untuk diubah ke Base64.
        """
        payload = {}
        chat_text = ""
        chat_files = []

        if not input_data:
            return payload, chat_text, chat_files

        if isinstance(input_data, (list, tuple)):
            combined_payload = {}
            all_texts = []
            all_files = []
            for item in input_data:
                p, t, f = self._extract_payload_and_files(item)
                combined_payload.update(p)
                if t:
                    all_texts.append(t)
                if f:
                    all_files.extend(f)
            seen = set()
            unique_files = [x for x in all_files if not (x in seen or seen.add(x))]
            if all_texts and "prompt" not in combined_payload:
                combined_payload["prompt"] = "\n".join(all_texts)
            return combined_payload, "\n".join(all_texts), unique_files

        raw_dict = {}
        if hasattr(input_data, "model_dump"):
            raw_dict = input_data.model_dump()
        elif hasattr(input_data, "dict"):
            raw_dict = input_data.dict()
        elif isinstance(input_data, dict):
            raw_dict = input_data
        elif isinstance(input_data, str):
            chat_text = input_data
            payload["prompt"] = chat_text
            return payload, chat_text, chat_files

        if "text" in raw_dict and isinstance(raw_dict["text"], str) and raw_dict["text"]:
            chat_text = raw_dict["text"]
        if "files" in raw_dict and isinstance(raw_dict["files"], list):
            chat_files = raw_dict["files"]

        data_inner = raw_dict.get("data")
        if isinstance(data_inner, dict):
            if not chat_text and "text" in data_inner and isinstance(data_inner["text"], str):
                chat_text = data_inner["text"]
            if not chat_files and "files" in data_inner and isinstance(data_inner["files"], list):
                chat_files = data_inner["files"]

            for k, v in data_inner.items():
                if k not in IGNORED_METADATA_KEYS and k != "files":
                    payload[k] = v

        for k, v in raw_dict.items():
            if k not in IGNORED_METADATA_KEYS and k != "files" and k != "data":
                payload[k] = v

        if chat_text:
            if "prompt" not in payload:
                payload["prompt"] = chat_text
            if "text" in payload and "prompt" in payload:
                del payload["text"]

        seen = set()
        unique_files = [x for x in chat_files if not (x in seen or seen.add(x))]
        return payload, chat_text, unique_files

    def update_build_config(self, build_config: dict, field_value: Any, field_name: Optional[str] = None) -> dict:
        """
        Mengisi opsi dropdown Project dan Call Spec secara dinamis
        saat user memasukkan kredensial atau menekan tombol refresh.
        """
        try:
            base_url = _clean_base_url(self._get_input_value("base_url"))
            user_id = self._get_input_value("user_id").strip()
            public_key = self._get_input_value("public_key").strip()
            secret_key = self._get_input_value("secret_key").strip()

            if not (user_id and public_key and secret_key):
                return build_config

            headers = {
                "X-USER-ID": user_id,
                "X-CALL-PUBLIC-KEY": public_key,
                "Authorization": f"Bearer {secret_key}",
            }

            # 1. Ambil daftar project
            resp_p = requests.get(
                f"{base_url}{CALLCRAFT_PROJECTS_ENDPOINT}",
                headers=headers,
                timeout=CALLCRAFT_DISCOVERY_TIMEOUT,
            )

            project_options = []
            project_map = {}
            if resp_p.status_code == 200:
                p_data = resp_p.json().get("data", [])
                for p in p_data:
                    name = p.get("name") or p.get("id")
                    pid = p.get("id")
                    project_options.append(name)
                    project_map[name] = pid

            if "project_id" in build_config:
                build_config["project_id"]["options"] = project_options

            # 2. Ambil daftar spec sesuai project yang dipilih
            selected_proj_name = build_config.get("project_id", {}).get("value")
            target_proj_id = project_map.get(selected_proj_name, selected_proj_name)

            params = {}
            if target_proj_id:
                params["projectId"] = target_proj_id

            resp_s = requests.get(
                f"{base_url}{CALLCRAFT_SPECS_ENDPOINT}",
                headers=headers,
                params=params,
                timeout=CALLCRAFT_DISCOVERY_TIMEOUT,
            )

            spec_options = []
            if resp_s.status_code == 200:
                s_data = resp_s.json().get("data", [])
                for s in s_data:
                    spec_id = s.get("slug") or s.get("name") or s.get("id")
                    spec_options.append(spec_id)

            if "spec_id" in build_config:
                build_config["spec_id"]["options"] = spec_options

        except Exception:
            pass

        return build_config

    def call_api(self) -> Data:
        """
        Mengeksekusi Callcraft Spec melalui POST /v1/call.
        Menggabungkan payload dari node sebelumnya, file dari storage/chat, dan parameter manual.
        """
        base_url = _clean_base_url(self._get_input_value("base_url"))
        url = f"{base_url}{CALLCRAFT_CALL_ENDPOINT}"

        # 1. Kredensial & Identifikasi Spec
        user_id = self._get_input_value("user_id").strip()
        spec_id = self._get_input_value("spec_id").strip()
        public_key = self._get_input_value("public_key").strip()
        secret_key = self._get_input_value("secret_key").strip()

        if not user_id:
            return Data(data={"error": "Field 'user_id' wajib diisi."})
        if not public_key or not secret_key:
            return Data(data={"error": "Field 'public_key' dan 'secret_key' wajib diisi."})
        if not spec_id:
            return Data(data={"error": "Field 'spec_id' (Call Spec) wajib dipilih atau diisi."})

        headers = {
            "Content-Type": "application/json",
            "X-USER-ID": user_id,
            "X-CALL-SPEC-ID": spec_id,
            "X-CALL-PUBLIC-KEY": public_key,
            "Authorization": f"Bearer {secret_key}",
        }

        # 2. Optional AI Model Headers
        ai_model_name = self._get_input_value("ai_model_name").strip()
        ai_api_key = self._get_input_value("ai_api_key").strip()
        ai_base_url = self._get_input_value("ai_base_url").strip()

        optional_headers_sent = False
        if ai_model_name and ai_api_key:
            headers["X-AI-MODEL-NAME"] = ai_model_name
            headers["X-AI-API-KEY"] = ai_api_key
            optional_headers_sent = True

        if ai_base_url:
            headers["X-AI-BASE-URL"] = ai_base_url
            optional_headers_sent = True

        debug_trace = {
            "step_1_credentials": {
                "base_url": base_url,
                "user_id": user_id,
                "spec_id": spec_id,
                "public_key": public_key,
                "secret_key_status": f"OK (Length: {len(secret_key)})" if secret_key else "EMPTY",
                "optional_ai_headers_sent": optional_headers_sent,
                "ai_model_name": ai_model_name if (ai_model_name and ai_api_key) else None,
                "ai_base_url": ai_base_url if ai_base_url else None,
            },
            "step_2_incoming_payload": {},
            "step_3_file_processing": [],
            "step_4_final_payload_summary": {},
            "step_5_api_response": {},
        }

        # 3. Ekstraksi Payload dari Node Sebelumnya (input_data)
        target_input = getattr(self, "input_data", None)
        payload, chat_text, chat_files = self._extract_payload_and_files(target_input)

        debug_trace["step_2_incoming_payload"] = {
            "extracted_text": chat_text,
            "extracted_files": chat_files,
            "extracted_json_keys": list(payload.keys()),
            "raw_input_type": str(type(target_input)),
        }

        # 4. Tambahkan prompt manual atau dokumen manual jika diisi
        custom_prompt = self._get_input_value("custom_prompt").strip()
        if custom_prompt:
            if "prompt" in payload and payload["prompt"]:
                payload["prompt"] = f"{payload['prompt']}\n{custom_prompt}"
            else:
                payload["prompt"] = custom_prompt

        document_input = self._get_input_value("document_input").strip()

        base64_images = []

        # 5. Proses File dari Storage Langflow (Chat Attachment)
        if chat_files:
            try:
                storage_service = get_storage_service()
            except Exception:
                storage_service = None

            for file_path in chat_files:
                file_step_log = {"file_path": file_path}
                if isinstance(file_path, str) and "/" in file_path:
                    folder_name, file_name = file_path.split("/", 1)
                    file_step_log["folder_name"] = folder_name
                    file_step_log["file_name"] = file_name

                    try:
                        file_bytes = self._read_file_from_storage(storage_service, folder_name, file_name)
                        mime_type, _ = mimetypes.guess_type(file_name)
                        if not mime_type:
                            mime_type = "application/octet-stream"

                        b64_encoded = base64.b64encode(file_bytes).decode("utf-8")
                        data_uri = f"data:{mime_type};base64,{b64_encoded}"
                        base64_images.append(data_uri)

                        file_step_log["status"] = "SUCCESS"
                        file_step_log["bytes_size"] = len(file_bytes)
                        file_step_log["mime_type"] = mime_type
                        file_step_log["base64_prefix"] = data_uri[:60] + "..."
                    except Exception as e:
                        file_step_log["status"] = "FAILED"
                        file_step_log["error"] = str(e)

                debug_trace["step_3_file_processing"].append(file_step_log)

        # 6. Sisipkan Dokumen (File Storage atau Manual Document Input)
        if base64_images:
            if len(base64_images) > 1:
                payload["images"] = base64_images
            else:
                payload["image"] = base64_images[0]
        elif document_input:
            payload["file"] = document_input

        debug_trace["step_4_final_payload_summary"] = {
            "payload_keys": list(payload.keys()),
            "image_count": len(base64_images),
            "manual_document_present": bool(document_input),
        }

        # 7. Eksekusi Request ke API Callcraft
        try:
            response = requests.post(
                url,
                headers=headers,
                json=payload,
                timeout=CALLCRAFT_API_TIMEOUT,
            )

            try:
                response_json = response.json()
            except Exception:
                response_json = {
                    "status_code": response.status_code,
                    "text": response.text,
                }

            debug_trace["step_5_api_response"] = {
                "http_status": response.status_code,
                "response_keys": list(response_json.keys()) if isinstance(response_json, dict) else [],
            }

            self.status = debug_trace

            if isinstance(response_json, dict):
                merged_result = dict(response_json)
                merged_result["_debug_trace"] = debug_trace
                return Data(data=merged_result)

            return Data(data={"result": response_json, "_debug_trace": debug_trace})

        except requests.exceptions.RequestException as e:
            error_data = {
                "error": {
                    "code": "REQUEST_FAILED",
                    "message": str(e),
                },
                "_debug_trace": debug_trace,
            }
            self.status = error_data
            return Data(data=error_data)
