
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from database import get_db
from dependencies import get_current_user
from models.user import User
from models.substation import Substation


router = APIRouter(
    prefix="/substations",
    tags=["Substations"],
    dependencies=[Depends(get_current_user)]
)


# ==========================================
# REQUEST SCHEMA
# ==========================================

class SubstationCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=255)


# ==========================================
# GET SUBSTATIONS - All authenticated users
# ==========================================

@router.get("")
def get_substations(db: Session = Depends(get_db)):
    substations = db.scalars(
        select(Substation).order_by(Substation.name)
    ).all()

    return [
        {
            "id": substation.id,
            "name": substation.name,
            "description": substation.description
        }
        for substation in substations
    ]


# ==========================================
# CREATE SUBSTATION - Admin and Engineer
# ==========================================

@router.post(
    "",
    status_code=status.HTTP_201_CREATED
)
def create_substation(
    data: SubstationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Enforce role permissions
    if current_user.role not in ("admin", "engineer"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin and Engineer can add substations"
        )

    # Normalize substation name
    name = data.name.strip().upper()

    if not name:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Substation name cannot be empty"
        )

    if len(name) > 50:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Substation name cannot exceed 50 characters"
        )

    # Check duplicate name
    existing = db.scalar(
        select(Substation).where(
            (Substation.id == name) |
            (Substation.name == name)
        )
    )

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This substation already exists"
        )

    new_substation = Substation(
        id=name,
        name=name,
        description=data.description or "New Substation"
    )

    db.add(new_substation)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This substation already exists"
        )

    db.refresh(new_substation)

    return {
        "id": new_substation.id,
        "name": new_substation.name,
        "description": new_substation.description
    }
