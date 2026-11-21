
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from database import get_db
from dependencies import get_current_user
from models.asset_schedule import AssetSchedule
from models.equipment import Equipment
from models.equipment_type import EquipmentType
from models.substation import Substation
from models.transformer_bdv import TransformerBDV
from models.transformer_test_reading import TransformerTestReading
from models.user import User


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


class SubstationUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=255)


def _require_substation_manager(current_user: User, action: str):
    if current_user.role not in ("admin", "engineer"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Only Admin and Engineer can {action} substations",
        )


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
    _require_substation_manager(current_user, "add")

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


@router.put("/{substation_id}")
def update_substation(
    substation_id: str,
    data: SubstationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_substation_manager(current_user, "edit")

    substation = db.get(Substation, substation_id)
    if not substation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Substation not found",
        )

    name = data.name.strip().upper()
    if not name:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Substation name cannot be empty",
        )

    duplicate = db.scalar(
        select(Substation).where(
            Substation.id != substation_id,
            (Substation.id == name) | (Substation.name == name),
        )
    )
    if duplicate:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Another substation already uses this name",
        )

    substation.name = name
    description = data.description.strip() if data.description else ""
    substation.description = description or None

    try:
        db.commit()
        db.refresh(substation)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Another substation already uses this name",
        )

    return {
        "id": substation.id,
        "name": substation.name,
        "description": substation.description,
    }


@router.delete("/{substation_id}")
def delete_substation(
    substation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_substation_manager(current_user, "delete")

    substation = db.get(Substation, substation_id)
    if not substation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Substation not found",
        )

    dependent_models = (
        ("equipment", Equipment),
        ("equipment types", EquipmentType),
        ("manual schedules", AssetSchedule),
        ("BDV test records", TransformerBDV),
        ("transformer test records", TransformerTestReading),
    )
    dependencies = [
        label
        for label, model in dependent_models
        if db.scalar(
            select(func.count())
            .select_from(model)
            .where(model.substation_id == substation_id)
        )
    ]
    if dependencies:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Cannot delete this substation while it has associated "
                f"{', '.join(dependencies)}. Remove them first."
            ),
        )

    db.delete(substation)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete this substation while it has associated records",
        )

    return {"id": substation_id, "message": "Substation deleted"}
