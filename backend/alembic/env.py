"""Alembic environment for JobMatch AI.

The database URL comes from backend/.env instead of alembic.ini so the password
is not committed. Importing app.models puts every table on Base.metadata, which
is what autogenerate compares against.
"""

import sys
from logging.config import fileConfig
from pathlib import Path

from sqlalchemy import engine_from_config, event, pool

from alembic import context

# Make the backend/ folder importable so "app.*" resolves when Alembic runs
BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.core.config import settings  # noqa: E402
from app.db.session import Base  # noqa: E402
import app.models  # noqa: E402, F401  (imported for its side effect of registering tables)

# Alembic Config object, giving access to the values in alembic.ini
config = context.config

# Feed the real connection string in from the environment
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

# Interpret the config file for Python logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Metadata that autogenerate compares against the database
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations without a live connection, emitting SQL only."""
    context.configure(
        url=settings.DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations against a live database connection."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    @event.listens_for(connectable, "connect")
    def force_innodb(dbapi_connection, connection_record):
        """Make Alembic's own alembic_version table InnoDB as well.

        This has to happen on the raw connection. Doing it through SQLAlchemy
        opened a transaction that stopped Alembic saving the version number.
        """
        with dbapi_connection.cursor() as cursor:
            cursor.execute("SET SESSION default_storage_engine = 'InnoDB'")

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
