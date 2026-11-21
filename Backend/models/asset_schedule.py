from sqlalchemy import (
    Column,
    Date,
    DateTime,
    Integer,
    String,
    UniqueConstraint,
    func,
)

from database import Base


class AssetSchedule(Base):
    __tablename__ = "asset_schedules"

    id = Column(Integer, primary_key=True, index=True)

    substation_id = Column(String(50), nullable=False)
    equipment_id = Column(String(50), nullable=False)

    activity = Column(String(100), nullable=False)
    scheduled_date = Column(Date, nullable=False, index=True)
    completed_at = Column(Date, nullable=True)
    description = Column(String(500), nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint(
            "substation_id",
            "equipment_id",
            "scheduled_date",
            "activity",
            name="uq_asset_schedule_equipment_date_activity",
        ),
    )
