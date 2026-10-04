"""Does supabase/schema.sql still match the SQLAlchemy models?

Run against a Postgres database that schema.sql has just been loaded into
(CI does exactly that):

    DATABASE_URL=postgresql+asyncpg://... python check_schema_sql.py

It checks three things the platform suite cannot see, because that suite lets
the backend create its own tables:

  1. every table and column the models declare exists after schema.sql alone —
     a column added to database.py but not to schema.sql (or to a migration)
     would otherwise only surface as a 500 in production;
  2. the backend starts on that database: init_db() runs, twice, without
     touching what schema.sql made;
  3. nothing init_db() needed to add — if it had to, schema.sql is behind.
"""
from __future__ import annotations

import asyncio
import os
import sys

os.environ.setdefault("BOT_TOKEN", "0:test")
os.environ.setdefault("BOT_USERNAME", "DehqonBozoriTestBot")

from sqlalchemy import inspect  # noqa: E402

from app.db.database import Base, engine, init_db  # noqa: E402


def _schema_gaps(sync_conn) -> list[str]:
    inspector = inspect(sync_conn)
    tables = set(inspector.get_table_names())
    gaps = []
    for name, table in Base.metadata.tables.items():
        if name not in tables:
            gaps.append(f"table {name}")
            continue
        existing = {c["name"] for c in inspector.get_columns(name)}
        gaps += [f"column {name}.{c.name}" for c in table.columns if c.name not in existing]
    return gaps


async def main() -> int:
    if not os.environ.get("DATABASE_URL", "").startswith("postgresql"):
        print("DATABASE_URL must point at a Postgres database loaded from schema.sql")
        return 2

    async with engine.connect() as conn:
        gaps = await conn.run_sync(_schema_gaps)
    if gaps:
        print("schema.sql is missing what the models declare:")
        for gap in gaps:
            print(f"  - {gap}")
        return 1
    print(f"schema.sql matches the models ({len(Base.metadata.tables)} tables)")

    await init_db()
    await init_db()
    async with engine.connect() as conn:
        gaps = await conn.run_sync(_schema_gaps)
    if gaps:
        print(f"init_db left gaps behind: {gaps}")
        return 1
    print("init_db runs twice on it without errors")
    await engine.dispose()
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
