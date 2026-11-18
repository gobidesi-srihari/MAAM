
from sqlalchemy import Column, String, DateTime, func
from database import Base


class Substation(Base):
    __tablename__ = "substations"

    id = Column(String(50), primary_key=True)

    name = Column(
        String(100),
        unique=True,
        nullable=False
    )

    description = Column(
        String(255),
        nullable=True
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
