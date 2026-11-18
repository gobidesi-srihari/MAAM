
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from database import get_db
from dependencies import get_current_user

from models.equipment import Equipment
from models.equipment_type import EquipmentType
from models.substation import Substation


router = APIRouter(
    prefix="/substations/{substation_id}/equipment-types/{equipment_type_id}/equipment",
    tags=["Equipment"],
)


# ==========================================
# REQUEST SCHEMA
# ==========================================

class EquipmentCreate(BaseModel):
    id: str = Field(min_length=1, max_length=50)
    name: str | None = Field(default=None, max_length=100)
    description: str | None = Field(default=None, max_length=255)


# ==========================================
# HELPER: VALIDATE SUBSTATION AND TYPE
# ==========================================

def validate_equipment_type(
    db: Session,
    substation_id: str,
    equipment_type_id: int,
):
    substation = db.query(Substation).filter(
        Substation.id == substation_id
    ).first()

    if not substation:
        raise HTTPException(
            status_code=404,
            detail="Substation not found",
        )

    equipment_type = db.query(EquipmentType).filter(
        EquipmentType.id == equipment_type_id,
        EquipmentType.substation_id == substation_id,
    ).first()

    if not equipment_type:
        raise HTTPException(
            status_code=404,
            detail="Equipment Type not found in this substation",
        )

    return equipment_type


# ==========================================
# GET EQUIPMENT
# ==========================================

@router.get("")
def get_equipment(
    substation_id: str,
    equipment_type_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    validate_equipment_type(
        db,
        substation_id,
        equipment_type_id,
    )

    equipment = db.query(Equipment).filter(
        Equipment.substation_id == substation_id,
        Equipment.equipment_type_id == equipment_type_id,
    ).order_by(Equipment.id).all()

    return equipment


# ==========================================
# CREATE EQUIPMENT
# ==========================================

@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
)
def create_equipment(
    substation_id: str,
    equipment_type_id: int,
    data: EquipmentCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # Role-based access control
    role = getattr(current_user, "role", None)

    role_name = (
        role.name if hasattr(role, "name") else str(role)
    ).lower()

    if role_name not in ("admin", "engineer"):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to create equipment",
        )

    validate_equipment_type(
        db,
        substation_id,
        equipment_type_id,
    )

    equipment_id = data.id.strip().upper()

    if not equipment_id:
        raise HTTPException(
            status_code=422,
            detail="Equipment ID cannot be empty",
        )

    # Equipment ID must be unique within a substation
    existing = db.query(Equipment).filter(
        Equipment.substation_id == substation_id,
        Equipment.id == equipment_id,
    ).first()

    if existing:
        raise HTTPException(
            status_code=409,
            detail="Equipment ID already exists in this substation",
        )

    equipment = Equipment(
        id=equipment_id,
        substation_id=substation_id,
        equipment_type_id=equipment_type_id,
        name=data.name.strip() if data.name else None,
        description=(
            data.description.strip()
            if data.description else None
        ),
    )

    db.add(equipment)

    try:
        db.commit()
        db.refresh(equipment)

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Equipment already exists or its references are invalid",
        )

    return equipment
