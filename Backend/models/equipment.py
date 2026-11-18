
from sqlalchemy import (
    Column,
    String,
    Integer,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    PrimaryKeyConstraint,
    func,
)

from database import Base


class Equipment(Base):
    __tablename__ = "equipment"

    id = Column(
        String(50),
        nullable=False,
    )

    substation_id = Column(
        String(50),
        ForeignKey(
            "substations.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
    )

    equipment_type_id = Column(
        Integer,
        nullable=False,
    )

    name = Column(
        String(100),
        nullable=True,
    )

    description = Column(
        String(255),
        nullable=True,
    )

    created_at = Column(
        DateTime,
        server_default=func.current_timestamp(),
    )

    __table_args__ = (
        PrimaryKeyConstraint(
            "substation_id",
            "id",
            name="pk_equipment",
        ),

        ForeignKeyConstraint(
            ["substation_id", "equipment_type_id"],
            [
                "equipment_types.substation_id",
                "equipment_types.id",
            ],
            ondelete="RESTRICT",
            name="fk_equipment_type_same_substation",
        ),
    )
