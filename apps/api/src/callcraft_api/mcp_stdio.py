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

    # Verify user exists in database on startup
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(User).where(User.id == clean_user_id))
        if not res.scalar_one_or_none():
            sys.stderr.write(f"ERROR: User ID '{clean_user_id}' tidak ditemukan di database CallCraft.\n")
            sys.exit(1)

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
                "error": {"code": -32603, "message": f"Internal stdio error: {str(e)}"},
            }
            sys.stdout.write(json.dumps(err_resp) + "\n")
            sys.stdout.flush()


if __name__ == "__main__":
    asyncio.run(main())
