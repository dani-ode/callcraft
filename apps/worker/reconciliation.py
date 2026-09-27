"""Lease-based reconciliation worker; only SQL metadata is read from the queue."""
import logging
import os
from sqlalchemy import text
from callcraft_api.db.session import AsyncSessionLocal
from callcraft_api.db.repository import Repository
from callcraft_api.services.execution_journal import claim_reconciliation, reconcile_claim, release_reconciliation_lease
from callcraft_api.config import settings

logger = logging.getLogger('callcraft-reconciliation')


async def run_once() -> int:
    settings.validate_execution_security()
    limit = int(os.environ.get('CALLCRAFT_RECONCILIATION_BATCH_SIZE', '20'))
    lease = int(os.environ.get('CALLCRAFT_RECONCILIATION_LEASE_SECONDS', '60'))
    async with AsyncSessionLocal() as session:
        jobs = await claim_reconciliation(session, limit, lease)
    for job in jobs:
        async with AsyncSessionLocal() as session:
            try:
                row = (await session.execute(text('''SELECT s.id, s.project_id, s.tools_config,
                    v.request_schema, v.response_schema FROM call_specs s JOIN call_spec_versions v
                    ON v.call_spec_id=s.id AND v.version_number=s.active_version_number
                    WHERE s.id=:spec AND s.project_id=:project'''), job)).mappings().one_or_none()
                if not row:
                    await release_reconciliation_lease(session, job['id'], job['project_id'], 'failed', 'SPEC_NOT_FOUND')
                    continue
                spec = {'id': row['id'], 'projectId': row['project_id'],
                    'toolsConfig': row['tools_config'] or {}, 'requestSchema': row['request_schema'] or {},
                    'responseSchema': row['response_schema'] or {}}
                result = await reconcile_claim(session, job['id'], job['project_id'], spec)
                logger.info('reconciliation execution=%s status=%s', job['id'], result['status'])
            except Exception:
                logger.exception('reconciliation metadata job failed id=%s', job['id'])
                await release_reconciliation_lease(session, job['id'], job['project_id'],
                    'reconciliation_required', 'WORKER_FAILURE')
    return len(jobs)
