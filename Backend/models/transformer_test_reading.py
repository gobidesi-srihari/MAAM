from sqlalchemy import (
    Column,
    Date,
    DateTime,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
    func,
)

from database import Base


class TransformerTestReading(Base):
    __tablename__ = "transformer_test_readings"

    id = Column(Integer, primary_key=True, index=True)
    substation_id = Column(String(50), nullable=False)
    equipment_id = Column(String(50), nullable=False)
    parameter_key = Column(String(80), nullable=False)
    test_date = Column(Date, nullable=False)
    value = Column(Numeric(14, 4), nullable=False)
    notes = Column(String(500), nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint(
            "substation_id",
            "equipment_id",
            "parameter_key",
            "test_date",
            name="uq_transformer_test_parameter_date",
        ),
        {"schema": "public"},
    )
