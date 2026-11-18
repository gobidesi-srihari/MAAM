
from sqlalchemy import (
    Column,
    Integer,
    String,
    Date,
    Numeric,
    DateTime,
    ForeignKeyConstraint,
    UniqueConstraint,
    CheckConstraint,
    func,
)

from database import Base


class TransformerBDV(Base):
    __tablename__ = "transformer_bdv"

    id = Column(Integer, primary_key=True, index=True)

    substation_id = Column(
        String(50),
        nullable=False
    )

    equipment_id = Column(
        String(50),
        nullable=False
    )

    test_date = Column(
        Date,
        nullable=False
    )

    bdv_kv = Column(
        Numeric(8, 2),
        nullable=False
    )

    created_at = Column(
        DateTime,
        server_default=func.current_timestamp()
    )

    __table_args__ = (
        ForeignKeyConstraint(
            ["substation_id", "equipment_id"],
            ["equipment.substation_id", "equipment.id"],
            name="fk_transformer_bdv_equipment",
            ondelete="RESTRICT",
        ),
        UniqueConstraint(
            "substation_id",
            "equipment_id",
            "test_date",
            name="uq_transformer_bdv_date",
        ),
        CheckConstraint(
            "bdv_kv > 0",
            name="chk_transformer_bdv_positive",
        ),
        {"schema": "public"},
    )
