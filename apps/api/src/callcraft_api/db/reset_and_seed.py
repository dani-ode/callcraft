import asyncio
import logging
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from callcraft_api.config import settings
from callcraft_api.db.models import Base
from callcraft_api.db.init_db import init_db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("callcraft.db.reset")

db_url = settings.resolved_database_url
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+asyncpg://", 1)
elif db_url.startswith("postgresql://") and "+asyncpg" not in db_url:
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

async def reset_database():
    logger.info(f"Connecting to database: {db_url}")
    engine = create_async_engine(db_url, echo=False)

    async with engine.begin() as conn:
        logger.info("Dropping all existing database tables (CASCADE)...")
        # Drop all tables cleanly in PostgreSQL
        await conn.run_sync(Base.metadata.drop_all)
        logger.info("Re-creating all database tables from SQLAlchemy Base metadata...")
        await conn.run_sync(Base.metadata.create_all)

    session_maker = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    async with session_maker() as session:
        logger.info("Seeding realistic production metadata and marketplace records...")
        await init_db(session)
        await session.commit()

    logger.info("✨ Database fresh migration & seeding completed successfully!")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(reset_database())
