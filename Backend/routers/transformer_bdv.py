
from datetime import date
from decimal import Decimal

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from pydantic import BaseModel, Field
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user

from models.transformer_bdv import TransformerBDV

# Reuse the existing transformer validation
from routers.transformer_nameplate import validate_transformer


# ==========================================
# ROUTER CONFIGURATION
# ==========================================

router = APIRouter(
    prefix="/substations/{substation_id}/transformers/{equipment_id}/bdv",
    tags=["Transformer Breakdown Voltage"],
)


# ==========================================
# PYDANTIC SCHEMAS
# ==========================================

class BDVCreate(BaseModel):
    test_date: date
    bdv_kv: Decimal = Field(
        gt=0,
        max_digits=8,
        decimal_places=2,
    )


class BDVResponse(BaseModel):
    id: int
    substation_id: str
    equipment_id: str
    test_date: date
    bdv_kv: Decimal

    model_config = {
        "from_attributes": True
    }


# ==========================================
# GET - HISTORICAL BDV RECORDS
# Admin, Engineer, Viewer
# ==========================================

@router.get(
    "",
    response_model=list[BDVResponse],
)
def get_transformer_bdv(
    substation_id: str,
    equipment_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):

    # Verify transformer exists
    validate_transformer(
        db,
        substation_id,
        equipment_id,
    )

    # Retrieve all historical records
    records = (
        db.query(TransformerBDV)
        .filter(
            TransformerBDV.substation_id == substation_id,
            TransformerBDV.equipment_id == equipment_id,
        )
        .order_by(
            TransformerBDV.test_date.asc()
        )
        .all()
    )

    return records


# ==========================================
# POST - ADD NEW BDV READING
# Admin and Engineer only
# ==========================================

@router.post(
    "",
    response_model=BDVResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_transformer_bdv(
    substation_id: str,
    equipment_id: str,
    data: BDVCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):

    # ======================================
    # ROLE-BASED ACCESS CONTROL
    # ======================================

    role = getattr(
        current_user,
        "role",
        None,
    )

    role_name = (
        role.name
        if hasattr(role, "name")
        else str(role)
    ).lower()

    if role_name not in (
        "admin",
        "engineer",
    ):
        raise HTTPException(
            status_code=403,
            detail=(
                "Only Admin and Engineer "
                "can add BDV readings"
            ),
        )

    # ======================================
    # VALIDATE TRANSFORMER
    # ======================================

    validate_transformer(
        db,
        substation_id,
        equipment_id,
    )

    # ======================================
    # CREATE BDV RECORD
    # ======================================

    new_record = TransformerBDV(
        substation_id=substation_id,
        equipment_id=equipment_id,
        test_date=data.test_date,
        bdv_kv=data.bdv_kv,
    )

    db.add(new_record)

    try:
        db.commit()
        db.refresh(new_record)

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=409,
            detail=(
                "A BDV reading already exists "
                "for this transformer "
                "on the selected test date"
            ),
        )

    return new_record
