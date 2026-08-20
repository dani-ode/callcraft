import asyncio
import logging
import sys
from datetime import datetime, timezone

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("callcraft-worker")


async def main():
    logger.info("Starting Callcraft Background Outbox & Analytics Worker...")
    while True:
        try:
            logger.debug(f"Callcraft Worker heartbeating at {datetime.now(timezone.utc).isoformat()}...")
            # Poll Redis outbox queue / DB daily aggregation tasks
            await asyncio.sleep(10)
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
