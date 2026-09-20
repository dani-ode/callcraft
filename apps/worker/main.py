import asyncio
import logging
import sys
from datetime import datetime, timezone

from callcraft_api.db.repository import Repository
from callcraft_api.db.session import AsyncSessionLocal
from callcraft_api.services.redis_cache import redis_service

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("callcraft-worker")


async def main():
    logger.info("Starting Callcraft Background Outbox & Analytics Worker...")
    await redis_service.connect()
    
    while True:
        try:
            # Poll Redis Outbox queue
            items = await redis_service.pop_outbox(count=50)
            if items:
                logger.info(f"Worker retrieved batch of {len(items)} audit log items from Redis outbox.")
                persisted_count = 0
                async with AsyncSessionLocal() as session:
                    for item in items:
                        try:
                            log_id = await Repository.record_api_request(session, item)
                            if log_id:
                                persisted_count += 1
                                logger.debug(
                                    f"Audit log persisted: request_id={item.get('request_id')} "
                                    f"time={item.get('processing_time_ms')}ms cost=${item.get('estimated_cost_usd')}"
                                )
                        except Exception as item_err:
                            logger.error(
                                f"Failed to persist audit log for request_id={item.get('request_id')}: {item_err}",
                                exc_info=True,
                            )
                logger.info(f"Worker persisted {persisted_count}/{len(items)} audit log items to PostgreSQL.")
            
            await asyncio.sleep(2)
        except asyncio.CancelledError:
            logger.info("Worker received shutdown signal. Stopping...")
            break
        except Exception as e:
            logger.error(f"Error in worker loop: {e}", exc_info=True)
            await asyncio.sleep(5)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Worker stopped by user.")

