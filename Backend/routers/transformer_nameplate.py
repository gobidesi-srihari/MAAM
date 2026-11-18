
from pathlib import Path
from uuid import uuid4
import os

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    UploadFile,
    status,
)
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user
from models.equipment import Equipment
from models.equipment_type import EquipmentType
from models.transformer_nameplate import TransformerNameplate


router = APIRouter(
    prefix="/substations/{substation_id}/transformers/{equipment_id}/nameplate",
    tags=["Transformer Nameplate"],
)

UPLOAD_ROOT = (
    Path(__file__).resolve().parents[1] / "uploads" / "transformers"
)

MAX_FILE_SIZE = 5 * 1024 * 1024

ALLOWED_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


def validate_transformer(db, substation_id, equipment_id):
    equipment = (
        db.query(Equipment)
        .filter(
            Equipment.substation_id == substation_id,
            Equipment.id == equipment_id,
        )
        .first()
    )

    if not equipment:
        raise HTTPException(
            status_code=404,
            detail="Equipment not found",
        )

    equipment_type = (
        db.query(EquipmentType)
        .filter(
            EquipmentType.id == equipment.equipment_type_id,
            EquipmentType.substation_id == substation_id,
        )
        .first()
    )

    if not equipment_type or equipment_type.name.strip().lower() not in (
        "transformer",
        "power transformer",
    ):
        raise HTTPException(
            status_code=400,
            detail="Selected equipment is not a transformer",
        )

    return equipment


@router.post("", status_code=status.HTTP_200_OK)
async def upload_nameplate(
    substation_id: str,
    equipment_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    role = getattr(current_user, "role", None)
    role_name = (
        role.name if hasattr(role, "name") else str(role)
    ).lower()

    if role_name not in ("admin", "engineer"):
        raise HTTPException(
            status_code=403,
            detail="Only Admin and Engineer can upload nameplates",
        )

    validate_transformer(db, substation_id, equipment_id)

    extension = ALLOWED_TYPES.get(file.content_type)

    if not extension:
        raise HTTPException(
            status_code=415,
            detail="Only JPG, PNG and WebP images are allowed",
        )

    content = await file.read(MAX_FILE_SIZE + 1)

    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Image must not exceed 5 MB",
        )

    # Verify file content, not just its declared MIME type.
    from io import BytesIO
    from PIL import Image, UnidentifiedImageError

    try:
        with Image.open(BytesIO(content)) as image:
            image.verify()

        with Image.open(BytesIO(content)) as image:
            actual_format = image.format

        valid_formats = {
            ".jpg": "JPEG",
            ".png": "PNG",
            ".webp": "WEBP",
        }

        if actual_format != valid_formats[extension]:
            raise ValueError("File content does not match image type")

    except (UnidentifiedImageError, ValueError, OSError):
        raise HTTPException(
            status_code=415,
            detail="Invalid or unsupported image file",
        )

    UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)

    filename = f"{uuid4().hex}{extension}"
    file_path = UPLOAD_ROOT / filename

    existing = (
        db.query(TransformerNameplate)
        .filter(
            TransformerNameplate.substation_id == substation_id,
            TransformerNameplate.equipment_id == equipment_id,
        )
        .first()
    )

    old_path = existing.image_path if existing else None

    try:
        file_path.write_bytes(content)

        if existing:
            existing.image_path = str(file_path)
            existing.original_filename = file.filename
        else:
            existing = TransformerNameplate(
                substation_id=substation_id,
                equipment_id=equipment_id,
                image_path=str(file_path),
                original_filename=file.filename,
            )
            db.add(existing)

        db.commit()
        db.refresh(existing)

    except Exception:
        db.rollback()
        file_path.unlink(missing_ok=True)
        raise

    # Remove the previous image only after successful DB commit.
    if old_path and old_path != str(file_path):
        old_file = Path(old_path)
        if old_file.parent == UPLOAD_ROOT:
            try:
                old_file.unlink(missing_ok=True)
            except OSError:
                pass

    return {
        "message": "Nameplate uploaded successfully",
        "id": existing.id,
        "original_filename": existing.original_filename,
    }


@router.get("")
def get_nameplate_info(
    substation_id: str,
    equipment_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    validate_transformer(db, substation_id, equipment_id)

    record = (
        db.query(TransformerNameplate)
        .filter(
            TransformerNameplate.substation_id == substation_id,
            TransformerNameplate.equipment_id == equipment_id,
        )
        .first()
    )

    if not record:
        raise HTTPException(
            status_code=404,
            detail="Nameplate image not found",
        )

    return {
        "id": record.id,
        "original_filename": record.original_filename,
        "uploaded_at": record.uploaded_at,
        "image_url": (
            f"/substations/{substation_id}"
            f"/transformers/{equipment_id}/nameplate/image"
        ),
    }


@router.get("/image")
def get_nameplate_image(
    substation_id: str,
    equipment_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    validate_transformer(db, substation_id, equipment_id)

    record = (
        db.query(TransformerNameplate)
        .filter(
            TransformerNameplate.substation_id == substation_id,
            TransformerNameplate.equipment_id == equipment_id,
        )
        .first()
    )

    if not record:
        raise HTTPException(
            status_code=404,
            detail="Nameplate image not found",
        )

    file_path = Path(record.image_path)

    if (
        file_path.parent != UPLOAD_ROOT
        or not file_path.is_file()
    ):
        raise HTTPException(
            status_code=404,
            detail="Image file is unavailable",
        )

    return FileResponse(
        path=file_path,
        media_type="image/jpeg"
        if file_path.suffix.lower() == ".jpg"
        else "image/png"
        if file_path.suffix.lower() == ".png"
        else "image/webp",
    )
