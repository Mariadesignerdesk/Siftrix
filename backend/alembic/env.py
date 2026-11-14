"""Alembic runtime environment for Siftrix database migrations.

Dynamically binds to app.core.config.settings.DATABASE_URL and registers
all SQLAlchemy models through app.core.database.Base.metadata.
"""
import sys
from logging.config import fileConfig
from pathlib import Path

from alembic import context
from sqlalchemy import engine_from_config, pool

# Ensure backend root is on sys.path so 'app' package imports reliably
BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.core.config import settings
from app.core.database import Base
# Import all models so Base.metadata is fully populated for migrations
from app.models.scan import ScanRecord
from app.models.user import User

# Alembic Config object, which provides access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Target metadata for 'autogenerate' support
target_metadata = Base.metadata


def get_database_url() -> str:
    """Retrieve normalized database URL from Siftrix application settings."""
    url = settings.DATABASE_URL
    # Ensure postgresql+psycopg driver prefix for psycopg 3
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+psycopg://", 1)
    elif url.startswith("postgresql://") and not url.startswith("postgresql+"):
        url = url.replace("postgresql://", "postgresql+psycopg://", 1)
    return url


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    Configures the context with just a URL and not an Engine, though an Engine is acceptable here as well.
    Calls to context.execute() emit the given string to the script output.
    """
    url = get_database_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    Creates an Engine and associates a connection with the context.
    If a connection is provided via config attributes (e.g. from tests), it reuses that connection.
    """
    # Support connection injection from pytest fixtures
    provided_connection = config.attributes.get("connection", None)
    if provided_connection is not None:
        context.configure(
            connection=provided_connection,
            target_metadata=target_metadata,
        )
        with context.begin_transaction():
            context.run_migrations()
        return

    # Normal online execution using settings.DATABASE_URL
    configuration = config.get_section(config.config_ini_section) or {}
    configuration["sqlalchemy.url"] = get_database_url()

    connect_args = {}
    if "postgresql" in configuration["sqlalchemy.url"]:
        connect_args["connect_timeout"] = 2

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
        connect_args=connect_args,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
