
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from database import get_db
from dependencies import get_current_user
from models.equipment_type import EquipmentType
from models.substation import Substation

router = APIRouter(
    prefix="/substations/{substation_id}/equipment-types",
    tags=["Equipment Types"],
)


class EquipmentTypeCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)


@router.get("")
def get_equipment_types(
    substation_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    substation = db.query(Substation).filter(
        Substation.id == substation_id
    ).first()

    if not substation:
        raise HTTPException(
            status_code=404,
            detail="Substation not found",
        )

    equipment_types = db.query(EquipmentType).filter(
        EquipmentType.substation_id == substation_id
    ).order_by(EquipmentType.name).all()

    return equipment_types


@router.post("", status_code=status.HTTP_201_CREATED)
def create_equipment_type(
    substation_id: str,
    data: EquipmentTypeCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # Adjust this lookup if your existing user model
    # exposes its role differently.
    role = getattr(current_user, "role", None)
    role_name = (
        role.name if hasattr(role, "name") else str(role)
    ).lower()

    if role_name not in ("admin", "engineer"):
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to create equipment types",
        )

    substation = db.query(Substation).filter(
        Substation.id == substation_id
    ).first()

    if not substation:
        raise HTTPException(
            status_code=404,
            detail="Substation not found",
        )

    name = data.name.strip()

    if not name:
        raise HTTPException(
            status_code=422,
            detail="Equipment Type name cannot be empty",
        )

    existing = db.query(EquipmentType).filter(
        EquipmentType.substation_id == substation_id,
        EquipmentType.name == name,
    ).first()

    if existing:
        raise HTTPException(
            status_code=409,
            detail="Equipment Type already exists in this substation",
        )

    equipment_type = EquipmentType(
        substation_id=substation_id,
        name=name,
    )

    db.add(equipment_type)

    try:
        db.commit()
        db.refresh(equipment_type)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Equipment Type already exists or substation is invalid",
        )

    return equipment_type
