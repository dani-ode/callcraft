import sys
import json
import argparse
import asyncio
import logging

from callcraft_api.db.session import AsyncSessionLocal
from callcraft_api.routers.mcp import handle_jsonrpc_request

logging.basicConfig(level=logging.ERROR)


import os
from sqlalchemy import select
from callcraft_api.db.models import User

async def main():
    parser = argparse.ArgumentParser(description="CallCraft MCP Stdio Server")
    parser.add_argument("--user-id", default=os.environ.get("CALLCRAFT_USER_ID"), help="CallCraft User ID for workspace context")
    parser.add_argument("--project-id", default=os.environ.get("CALLCRAFT_PROJECT_ID"), help="Optional Project ID filter context")
    args = parser.parse_args()

    user_id = args.user_id
    project_id = args.project_id

    if not user_id or not user_id.strip():
        sys.stderr.write("ERROR: Parameter --user-id atau variabel lingkungan CALLCRAFT_USER_ID wajib diisi.\n")
        sys.exit(1)

    clean_user_id = user_id.strip()

    # Local stdio has the same credential requirements as HTTP MCP.
    from callcraft_api.db.repository import Repository
    secret = os.environ.get('CALLCRAFT_AUTH')
    public_key = os.environ.get('CALLCRAFT_PUBLIC_KEY')
    if not secret or not public_key:
        raise SystemExit('CALLCRAFT_AUTH and CALLCRAFT_PUBLIC_KEY are required.')
    async with AsyncSessionLocal() as db:
        credential = await Repository.verify_api_credential(db, secret, public_key=public_key, user_id=clean_user_id)
        if not credential or not credential.get('project_id'):
            raise SystemExit('Invalid project credential.')
        if project_id and project_id != credential['project_id']:
            raise SystemExit('Project credential mismatch.')
        if credential.get('ip_whitelist'):
            raise SystemExit('Use the remote MCP bridge for IP-restricted credentials.')
        project_id = credential['project_id']

    # Read line-by-line JSON-RPC messages from sys.stdin
    while True:
        try:
            line = sys.stdin.readline()
            if not line:
                break
            line_str = line.strip()
            if not line_str:
                continue

            try:
                request_data = json.loads(line_str)
            except Exception as e:
                err_resp = {
                    "jsonrpc": "2.0",
                    "id": None,
                    "error": {"code": -32700, "message": f"Parse error: {str(e)}"},
                }
                sys.stdout.write(json.dumps(err_resp) + "\n")
                sys.stdout.flush()
                continue

            async with AsyncSessionLocal() as db:
                credential = await Repository.verify_api_credential(db, secret, public_key=public_key, user_id=clean_user_id)
                if not credential or credential.get('project_id') != project_id:
                    raise SystemExit('Credential revoked or project changed.')
                response_data = await handle_jsonrpc_request(request_data, clean_user_id, db, default_project_id=project_id)
                if response_data:
                    sys.stdout.write(json.dumps(response_data, ensure_ascii=False) + "\n")
                    sys.stdout.flush()



        except KeyboardInterrupt:
            break
        except Exception as e:
            err_resp = {
                "jsonrpc": "2.0",
                "id": None,
                "error": {"code": -32603, "message": "Internal stdio error; operation outcome may be unknown."},
            }
            sys.stdout.write(json.dumps(err_resp) + "\n")
            sys.stdout.flush()


if __name__ == "__main__":
    asyncio.run(main())
