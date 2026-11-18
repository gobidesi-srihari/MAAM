
from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKeyConstraint,
    UniqueConstraint,
    func,
)

from database import Base


class TransformerNameplate(Base):
    __tablename__ = "transformer_nameplate"

    id = Column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    substation_id = Column(
        String(50),
        nullable=False,
    )

    equipment_id = Column(
        String(50),
        nullable=False,
    )

    image_path = Column(
        String(500),
        nullable=False,
    )

    original_filename = Column(
        String(255),
        nullable=True,
    )

    uploaded_at = Column(
        DateTime,
        server_default=func.current_timestamp(),
    )

    __table_args__ = (
        ForeignKeyConstraint(
            ["substation_id", "equipment_id"],
            ["equipment.substation_id", "equipment.id"],
            ondelete="RESTRICT",
            name="fk_transformer_nameplate_equipment",
        ),

        UniqueConstraint(
            "substation_id",
            "equipment_id",
            name="uq_transformer_nameplate_equipment",
        ),
    )
