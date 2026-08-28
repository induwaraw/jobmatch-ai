"""SQLAlchemy engine, session factory and declarative base.

Every model inherits from Base, and Alembic reads Base.metadata to work out
what the schema should look like.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings

# pool_pre_ping avoids handing out connections that MySQL has already dropped,
# which matters more against a managed database than a local one. pool_recycle
# closes connections before a cloud provider's idle timeout can kill them
# underneath us. The URL and the TLS arguments both come from settings so that
# a plain mysql:// value from the host works without being edited by hand.
engine = create_engine(
    settings.sqlalchemy_url,
    pool_pre_ping=True,
    pool_recycle=280,
    connect_args=settings.db_connect_args,
    future=True,
)

SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)


# My MySQL server defaults to MyISAM, which ignores foreign keys, so every
# table has to say InnoDB itself.
MYSQL_TABLE_ARGS = {
    "mysql_engine": "InnoDB",
    "mysql_charset": "utf8mb4",
    "mysql_collate": "utf8mb4_unicode_ci",
}


class Base(DeclarativeBase):
    """Declarative base shared by every model in the project."""


def get_db():
    """FastAPI dependency that yields a session and always closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
