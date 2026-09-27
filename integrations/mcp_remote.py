"""Remote stdio bridge for IDEs. No Callcraft database/runtime imports required."""
import asyncio
import json
import os
import sys
from urllib.parse import urlsplit

import httpx


async def main() -> None:
    names = ('CALLCRAFT_MCP_URL', 'CALLCRAFT_USER_ID', 'CALLCRAFT_PUBLIC_KEY',
             'CALLCRAFT_AUTH', 'CALLCRAFT_MCP_TIMEOUT_SECONDS')
    if any(not os.environ.get(name, '').strip() for name in names):
        raise SystemExit('Missing required Callcraft MCP environment configuration.')
    url = os.environ['CALLCRAFT_MCP_URL']
    parsed = urlsplit(url)
    if parsed.scheme != 'https' or parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise SystemExit('CALLCRAFT_MCP_URL must be an HTTPS endpoint without credentials/query.')
    timeout = float(os.environ['CALLCRAFT_MCP_TIMEOUT_SECONDS'])
    if timeout <= 0:
        raise SystemExit('CALLCRAFT_MCP_TIMEOUT_SECONDS must be positive.')
    headers = {'Authorization': 'Bearer ' + os.environ['CALLCRAFT_AUTH'],
               'X-USER-ID': os.environ['CALLCRAFT_USER_ID'],
               'X-CALL-PUBLIC-KEY': os.environ['CALLCRAFT_PUBLIC_KEY'],
               'Accept': 'application/json'}
    async with httpx.AsyncClient(timeout=timeout, trust_env=False, follow_redirects=False) as client:
        while line := await asyncio.to_thread(sys.stdin.readline):
            request_id = None
            try:
                payload = json.loads(line)
                request_id = payload.get('id')
                response = await client.post(url, json=payload, headers=headers)
                response.raise_for_status()
                if response.status_code == 204:
                    continue
                result = response.json()
            except (ValueError, AttributeError, httpx.HTTPError):
                result = {'jsonrpc': '2.0', 'id': request_id, 'error': {
                    'code': -32603, 'message': 'Remote MCP request failed; verify configuration and credentials. Mutation outcome may be unknown.'}}
            if request_id is not None:
                print(json.dumps(result), flush=True)


if __name__ == '__main__':
    asyncio.run(main())
