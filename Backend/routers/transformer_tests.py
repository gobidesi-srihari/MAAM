from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user
from models.transformer_bdv import TransformerBDV
from models.transformer_test_reading import TransformerTestReading
from routers.transformer_nameplate import validate_transformer
from test_catalog import get_test_parameter, load_test_catalog


router = APIRouter(
    prefix="/substations/{substation_id}/transformers/{equipment_id}/tests",
    tags=["Transformer Tests"],
)
catalog_router = APIRouter(
    prefix="/transformer-test-parameters",
    tags=["Transformer Tests"],
)


class TransformerTestCreate(BaseModel):
    test_date: date
    value: Decimal = Field(
        ge=0,
        max_digits=14,
        decimal_places=4,
        allow_inf_nan=False,
    )
    notes: str | None = Field(default=None, max_length=500)

    @field_validator("test_date")
    @classmethod
    def reject_future_test_date(cls, value):
        if value > date.today():
            raise ValueError("Test date cannot be in the future")
        return value


@catalog_router.get("")
def get_transformer_test_parameters(
    current_user=Depends(get_current_user),
):
    return load_test_catalog()


def _serialize_reading(record, parameter_key):
    value = record.bdv_kv if parameter_key == "bdv" else record.value
    return {
        "id": record.id,
        "test_date": record.test_date.isoformat(),
        "value": float(value),
        "notes": getattr(record, "notes", None),
    }


@router.get("/{parameter_key}")
def get_transformer_test_readings(
    substation_id: str,
    equipment_id: str,
    parameter_key: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    parameter = get_test_parameter(parameter_key)
    if not parameter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transformer test parameter not found",
        )

    validate_transformer(db, substation_id, equipment_id)

    if parameter_key == "bdv":
        records = (
            db.query(TransformerBDV)
            .filter(
                TransformerBDV.substation_id == substation_id,
                TransformerBDV.equipment_id == equipment_id,
            )
            .order_by(TransformerBDV.test_date)
            .all()
        )
    else:
        records = (
            db.query(TransformerTestReading)
            .filter(
                TransformerTestReading.substation_id == substation_id,
                TransformerTestReading.equipment_id == equipment_id,
                TransformerTestReading.parameter_key == parameter_key,
            )
            .order_by(TransformerTestReading.test_date)
            .all()
        )

    return [_serialize_reading(record, parameter_key) for record in records]


@router.post(
    "/{parameter_key}",
    status_code=status.HTTP_201_CREATED,
)
def create_transformer_test_reading(
    substation_id: str,
    equipment_id: str,
    parameter_key: str,
    data: TransformerTestCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    parameter = get_test_parameter(parameter_key)
    if not parameter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transformer test parameter not found",
        )

    role = getattr(current_user, "role", None)
    role_name = (
        role.name if hasattr(role, "name") else str(role)
    ).lower()
    if role_name not in ("admin", "engineer"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin and Engineer can add transformer test results",
        )

    validate_transformer(db, substation_id, equipment_id)

    if parameter_key == "bdv":
        if data.value <= 0 or data.value > Decimal("999999.99"):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="BDV must be greater than 0 and support at most 2 decimal places",
            )
        if data.value.as_tuple().exponent < -2:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="BDV supports at most 2 decimal places",
            )

        record = TransformerBDV(
            substation_id=substation_id,
            equipment_id=equipment_id,
            test_date=data.test_date,
            bdv_kv=data.value,
        )
    else:
        record = TransformerTestReading(
            substation_id=substation_id,
            equipment_id=equipment_id,
            parameter_key=parameter_key,
            test_date=data.test_date,
            value=data.value,
            notes=data.notes.strip() if data.notes else None,
        )

    db.add(record)
    try:
        db.commit()
        db.refresh(record)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A test reading already exists for this parameter and date",
        )

    return _serialize_reading(record, parameter_key)
