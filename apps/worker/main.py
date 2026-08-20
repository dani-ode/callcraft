import asyncio
import logging
import sys
from datetime import datetime, timezone
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
                logger.info(f"Worker processed batch of {len(items)} audit log items from Redis outbox.")
                for item in items:
                    logger.debug(f"Audit log saved: request_id={item.get('request_id')} time={item.get('processing_time_ms')}ms")
            
            await asyncio.sleep(2)
        except asyncio.CancelledError:
            logger.info("Worker received shutdown signal. Stopping...")
            break
        except Exception as e:
            logger.error(f"Error in worker loop: {e}")
            await asyncio.sleep(5)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Worker stopped by user.")
