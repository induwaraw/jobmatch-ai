"""Record of notable actions, used for the security and accountability sections."""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import MYSQL_TABLE_ARGS, Base


class AuditLog(Base):
    __tablename__ = "audit_log"
    __table_args__ = MYSQL_TABLE_ARGS

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Nullable so anonymous or system events can still be logged
    user_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # Short action code such as 'login', 'cv_upload' or 'match_run'
    action: Mapped[str] = mapped_column(String(80), nullable=False, index=True)

    detail: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), index=True
    )

    def __repr__(self) -> str:
        return f"<AuditLog id={self.id} action={self.action!r} user_id={self.user_id}>"
