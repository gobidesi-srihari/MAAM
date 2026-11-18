
from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    UniqueConstraint,
)

from database import Base


class EquipmentType(Base):
    __tablename__ = "equipment_types"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    substation_id = Column(
        String(50),
        ForeignKey(
            "substations.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
    )

    name = Column(
        String(100),
        nullable=False,
    )

    created_at = Column(
        DateTime,
        default=datetime.now,
    )

    __table_args__ = (
        UniqueConstraint(
            "substation_id",
            "name",
            name="unique_substation_equipment_type",
        ),
    )
