
from datetime import datetime, timedelta, timezone
from io import BytesIO
import logging
from pathlib import Path
import re

import jwt
from fastapi import (
    APIRouter,
    Depends,
    Header,
    HTTPException,
    Response,
    status,
)
from openpyxl import Workbook
from openpyxl.drawing.image import Image as ExcelImage
from openpyxl.styles import Font, PatternFill
from openpyxl.utils import get_column_letter
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from auth import ALGORITHM, SECRET_KEY
from database import get_db
from dependencies import get_current_user

from models.asset_schedule import AssetSchedule
from models.equipment import Equipment
from models.equipment_type import EquipmentType
from models.substation import Substation
from models.transformer_bdv import TransformerBDV
from models.transformer_nameplate import TransformerNameplate
from models.transformer_test_reading import TransformerTestReading
from routers.transformer_nameplate import UPLOAD_ROOT


router = APIRouter(
    prefix="/substations/{substation_id}/equipment-types/{equipment_type_id}/equipment",
    tags=["Equipment"],
)
logger = logging.getLogger(__name__)


# ==========================================
# REQUEST SCHEMA
# ==========================================

class EquipmentCreate(BaseModel):
    id: str = Field(min_length=1, max_length=50)
    name: str | None = Field(default=None, max_length=100)
    description: str | None = Field(default=None, max_length=255)

class EquipmentUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=100)
    description: str | None = Field(default=None, max_length=255)


def _require_equipment_manager(current_user, action):
    role = getattr(current_user, "role", None)
    role_name = (
        role.name if hasattr(role, "name") else str(role)
    ).lower()

    if role_name not in ("admin", "engineer"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"You do not have permission to {action} equipment",
        )

def _require_equipment_admin(current_user, action):
    role = getattr(current_user, "role", None)
    role_name = (
        role.name if hasattr(role, "name") else str(role)
    ).lower()

    if role_name != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Only Admin can {action} equipment",
        )


def _create_export_token(
    substation_id: str,
    equipment_type_id: int,
    equipment_id: str,
    user_id: int,
):
    return jwt.encode(
        {
            "purpose": "equipment-export",
            "substation_id": substation_id,
            "equipment_type_id": equipment_type_id,
            "equipment_id": equipment_id,
            "user_id": user_id,
            "exp": datetime.now(timezone.utc) + timedelta(minutes=30),
        },
        SECRET_KEY,
        algorithm=ALGORITHM,
    )


def _validate_export_token(
    token: str | None,
    substation_id: str,
    equipment_type_id: int,
    equipment_id: str,
    user_id: int,
):
    if not token:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Download this equipment's Excel file before deleting it",
        )

    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )
    except jwt.InvalidTokenError:
        payload = {}

    if (
        payload.get("purpose") != "equipment-export"
        or payload.get("substation_id") != substation_id
        or payload.get("equipment_type_id") != equipment_type_id
        or payload.get("equipment_id") != equipment_id
        or payload.get("user_id") != user_id
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Download this equipment's Excel file again before deleting it",
        )


def _safe_nameplate_path(image_path: str) -> Path:
    path = Path(image_path).resolve()
    try:
        path.relative_to(UPLOAD_ROOT)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="The nameplate image path is outside the configured upload folder",
        )
    return path


def _add_worksheet(workbook, title, headers, rows):
    worksheet = workbook.create_sheet(title)
    worksheet.append(headers)
    for row in rows:
        worksheet.append([
            "'" + value
            if isinstance(value, str)
            and value.startswith(("=", "+", "-", "@"))
            else value
            for value in row
        ])

    for cell in worksheet[1]:
        cell.font = Font(bold=True, color="FFFFFF")
        cell.fill = PatternFill(
            fill_type="solid",
            fgColor="1E3A5F",
        )

    worksheet.freeze_panes = "A2"
    worksheet.auto_filter.ref = worksheet.dimensions
    for column_index, column in enumerate(
        worksheet.columns,
        start=1,
    ):
        width = max(
            len(str(cell.value or ""))
            for cell in column
        )
        worksheet.column_dimensions[
            get_column_letter(column_index)
        ].width = min(max(width + 2, 14), 48)
    return worksheet


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
    _require_equipment_manager(current_user, "create")

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


@router.put("/{equipment_id}")
def update_equipment(
    substation_id: str,
    equipment_type_id: int,
    equipment_id: str,
    data: EquipmentUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _require_equipment_manager(current_user, "edit")
    validate_equipment_type(db, substation_id, equipment_type_id)

    equipment = db.query(Equipment).filter(
        Equipment.substation_id == substation_id,
        Equipment.equipment_type_id == equipment_type_id,
        Equipment.id == equipment_id,
    ).first()
    if not equipment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Equipment not found",
        )

    name = data.name.strip() if data.name is not None else ""
    description = (
        data.description.strip()
        if data.description is not None
        else ""
    )
    equipment.name = name or None
    equipment.description = description or None

    try:
        db.commit()
        db.refresh(equipment)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Unable to update this equipment record",
        )

    return equipment


@router.get("/{equipment_id}/export")
def export_equipment(
    substation_id: str,
    equipment_type_id: int,
    equipment_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _require_equipment_admin(current_user, "export")
    equipment_type = validate_equipment_type(
        db,
        substation_id,
        equipment_type_id,
    )
    equipment = db.query(Equipment).filter(
        Equipment.substation_id == substation_id,
        Equipment.equipment_type_id == equipment_type_id,
        Equipment.id == equipment_id,
    ).first()
    if not equipment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Equipment not found",
        )

    schedules = (
        db.query(AssetSchedule)
        .filter(
            AssetSchedule.substation_id == substation_id,
            AssetSchedule.equipment_id == equipment_id,
        )
        .order_by(AssetSchedule.scheduled_date)
        .all()
    )
    bdv_records = (
        db.query(TransformerBDV)
        .filter(
            TransformerBDV.substation_id == substation_id,
            TransformerBDV.equipment_id == equipment_id,
        )
        .order_by(TransformerBDV.test_date)
        .all()
    )
    test_records = (
        db.query(TransformerTestReading)
        .filter(
            TransformerTestReading.substation_id == substation_id,
            TransformerTestReading.equipment_id == equipment_id,
        )
        .order_by(
            TransformerTestReading.parameter_key,
            TransformerTestReading.test_date,
        )
        .all()
    )
    nameplates = (
        db.query(TransformerNameplate)
        .filter(
            TransformerNameplate.substation_id == substation_id,
            TransformerNameplate.equipment_id == equipment_id,
        )
        .all()
    )

    workbook = Workbook()
    workbook.remove(workbook.active)
    _add_worksheet(
        workbook,
        "Equipment",
        [
            "Substation ID",
            "Equipment Type",
            "Equipment ID",
            "Name",
            "Description",
            "Created At",
        ],
        [[
            substation_id,
            equipment_type.name,
            equipment.id,
            equipment.name,
            equipment.description,
            equipment.created_at,
        ]],
    )
    _add_worksheet(
        workbook,
        "Asset Schedules",
        ["Activity", "Scheduled Date", "Completed Date", "Description"],
        [
            [
                schedule.activity,
                schedule.scheduled_date,
                schedule.completed_at,
                schedule.description,
            ]
            for schedule in schedules
        ] or [["No schedule records"]],
    )
    _add_worksheet(
        workbook,
        "BDV Tests",
        ["Test Date", "Breakdown Voltage (kV)"],
        [
            [record.test_date, float(record.bdv_kv)]
            for record in bdv_records
        ] or [["No BDV test records"]],
    )
    _add_worksheet(
        workbook,
        "Other Tests",
        ["Parameter", "Test Date", "Value", "Notes"],
        [
            [
                record.parameter_key,
                record.test_date,
                float(record.value),
                record.notes,
            ]
            for record in test_records
        ] or [["No other test records"]],
    )
    nameplate_sheet = _add_worksheet(
        workbook,
        "Nameplate",
        ["Original Filename", "Uploaded At", "Image Status"],
        [
            [
                record.original_filename or "Nameplate image",
                record.uploaded_at,
                "Embedded below",
            ]
            for record in nameplates
        ] or [["No nameplate image"]],
    )

    for row_index, record in enumerate(nameplates, start=2):
        image_path = _safe_nameplate_path(record.image_path)
        if not image_path.is_file():
            nameplate_sheet.cell(row=row_index, column=3).value = (
                "Image file is missing from the server"
            )
            continue

        image = ExcelImage(str(image_path))
        scale = min(1, 600 / image.width, 400 / image.height)
        image.width = int(image.width * scale)
        image.height = int(image.height * scale)
        nameplate_sheet.add_image(image, f"A{row_index + 4}")

    workbook_stream = BytesIO()
    workbook.save(workbook_stream)
    safe_name = re.sub(
        r"[^A-Za-z0-9._-]+",
        "_",
        f"{substation_id}_{equipment_id}",
    ).strip("._")
    filename = f"equipment_{safe_name or 'record'}.xlsx"
    export_token = _create_export_token(
        substation_id,
        equipment_type_id,
        equipment_id,
        current_user.id,
    )

    return Response(
        content=workbook_stream.getvalue(),
        media_type=(
            "application/vnd.openxmlformats-officedocument."
            "spreadsheetml.sheet"
        ),
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "X-Equipment-Export-Token": export_token,
        },
    )


@router.delete("/{equipment_id}")
def delete_equipment(
    substation_id: str,
    equipment_type_id: int,
    equipment_id: str,
    export_token: str | None = Header(
        default=None,
        alias="X-Equipment-Export-Token",
    ),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _require_equipment_admin(current_user, "delete")
    _validate_export_token(
        export_token,
        substation_id,
        equipment_type_id,
        equipment_id,
        current_user.id,
    )
    validate_equipment_type(db, substation_id, equipment_type_id)

    equipment = db.query(Equipment).filter(
        Equipment.substation_id == substation_id,
        Equipment.equipment_type_id == equipment_type_id,
        Equipment.id == equipment_id,
    ).first()
    if not equipment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Equipment not found",
        )

    nameplates = (
        db.query(TransformerNameplate)
        .filter(
            TransformerNameplate.substation_id == substation_id,
            TransformerNameplate.equipment_id == equipment_id,
        )
        .all()
    )
    image_paths = [
        _safe_nameplate_path(record.image_path)
        for record in nameplates
    ]

    for model in (
        AssetSchedule,
        TransformerBDV,
        TransformerNameplate,
        TransformerTestReading,
    ):
        db.query(model).filter(
            model.substation_id == substation_id,
            model.equipment_id == equipment_id,
        ).delete(synchronize_session=False)
    db.delete(equipment)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete this equipment while it has associated records",
        )

    cleanup_warning = None
    for image_path in image_paths:
        try:
            image_path.unlink(missing_ok=True)
        except OSError:
            logger.exception(
                "Could not remove nameplate image after deleting equipment"
            )
            cleanup_warning = (
                "Equipment was deleted, but a nameplate image file "
                "could not be removed from uploads."
            )

    return {
        "id": equipment_id,
        "message": "Equipment and its exported related records were deleted",
        "warning": cleanup_warning,
    }
