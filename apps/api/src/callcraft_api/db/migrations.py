"""Forward-only SQL migration runner for deployment-owned schema changes."""
from pathlib import Path
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine


def migration_files() -> list[Path]:
    root = Path(__file__).resolve().parents[5]
    directory = Path(__import__('os').environ.get('CALLCRAFT_MIGRATIONS_DIR', root / 'migrations'))
    return sorted(directory.glob('[0-9][0-9][0-9][0-9]_*.sql'))


async def apply_migrations(engine: AsyncEngine) -> None:
    # Base.metadata/init_db owns the historical baseline. These forward files
    # are only additive migrations introduced after the running application
    # baseline; never replay legacy schema/seed SQL from a live process.
    files = [path for path in migration_files() if path.name >= '0005_']
    if not files:
        raise RuntimeError('No CallCraft migration files found; refusing to start.')
    async with engine.begin() as connection:
        await connection.execute(text('''CREATE TABLE IF NOT EXISTS schema_migrations (
            version VARCHAR(64) PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )'''))
        for path in files:
            version = path.name
            applied = (await connection.execute(text(
                'SELECT 1 FROM schema_migrations WHERE version=:version'), {'version': version}
            )).scalar_one_or_none()
            if applied:
                continue
            statements = [statement.strip() for statement in path.read_text().split(';') if statement.strip()]
            for statement in statements:
                await connection.execute(text(statement))
            await connection.execute(text(
                'INSERT INTO schema_migrations(version) VALUES (:version)'), {'version': version})
