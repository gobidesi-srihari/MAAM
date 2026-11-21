from calendar import monthrange
from datetime import date, timedelta
from functools import lru_cache

import holidays
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import and_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user
from models.asset_schedule import AssetSchedule
from models.equipment import Equipment
from models.equipment_type import EquipmentType
from models.substation import Substation
from models.transformer_bdv import TransformerBDV
from models.transformer_test_reading import TransformerTestReading
from test_catalog import load_test_catalog


router = APIRouter(
    prefix="/asset-schedules",
    tags=["Asset Scheduling"],
)

class ScheduleCreate(BaseModel):
    substation_id: str = Field(min_length=1, max_length=50)
    equipment_id: str = Field(min_length=1, max_length=50)
    activity: str = Field(min_length=1, max_length=100)
    scheduled_date: date
    description: str | None = Field(default=None, max_length=500)


@lru_cache(maxsize=16)
def _holidays_for_year(year: int):
    return holidays.country_holidays(
        "IN",
        subdiv="TN",
        years=[year],
    )


def _holiday_name(day: date):
    return _holidays_for_year(day.year).get(day)


def _next_working_day(day: date) -> date:
    for _ in range(32):
        if day.weekday() < 5 and not _holiday_name(day):
            return day
        day += timedelta(days=1)

    raise HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail="Could not find a working day after the selected date",
    )


def _add_months(day: date, months: int) -> date:
    month_index = day.month - 1 + months
    year = day.year + month_index // 12
    month = month_index % 12 + 1
    return date(
        year,
        month,
        min(day.day, monthrange(year, month)[1]),
    )


def _require_scheduler_role(current_user):
    role = getattr(current_user, "role", None)
    role_name = (
        role.name if hasattr(role, "name") else str(role)
    ).lower()

    if role_name not in ("admin", "engineer"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin and Engineer can manage asset schedules",
        )


def _schedule_query(db: Session):
    return (
        db.query(AssetSchedule, Equipment, EquipmentType, Substation)
        .join(
            Equipment,
            and_(
                Equipment.substation_id == AssetSchedule.substation_id,
                Equipment.id == AssetSchedule.equipment_id,
            ),
        )
        .join(
            EquipmentType,
            and_(
                EquipmentType.substation_id == Equipment.substation_id,
                EquipmentType.id == Equipment.equipment_type_id,
            ),
        )
        .join(
            Substation,
            Substation.id == AssetSchedule.substation_id,
        )
    )


def _serialize_schedule(row):
    schedule, equipment, equipment_type, substation = row
    return {
        "id": schedule.id,
        "substation_id": schedule.substation_id,
        "substation_name": substation.name,
        "equipment_id": schedule.equipment_id,
        "equipment_name": equipment.name or equipment.id,
        "equipment_type": equipment_type.name,
        "activity": schedule.activity,
        "scheduled_date": schedule.scheduled_date.isoformat(),
        "completed_at": (
            schedule.completed_at.isoformat()
            if schedule.completed_at
            else None
        ),
        "description": schedule.description,
    }


def _get_schedule_response(db: Session, schedule_id: int):
    row = _schedule_query(db).filter(
        AssetSchedule.id == schedule_id
    ).first()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset schedule not found",
        )

    return _serialize_schedule(row)


def _generated_test_schedules(
    db: Session,
    today: date,
    due_within_days: int | None,
):
    latest_tests = {}

    def keep_latest(substation_id, equipment_id, parameter_key, test_date):
        key = (substation_id, equipment_id, parameter_key)
        if key not in latest_tests or test_date > latest_tests[key]:
            latest_tests[key] = test_date

    for reading in db.query(TransformerTestReading).all():
        keep_latest(
            reading.substation_id,
            reading.equipment_id,
            reading.parameter_key,
            reading.test_date,
        )

    for reading in db.query(TransformerBDV).all():
        keep_latest(
            reading.substation_id,
            reading.equipment_id,
            "bdv",
            reading.test_date,
        )

    equipment_rows = (
        db.query(Equipment, EquipmentType, Substation)
        .join(
            EquipmentType,
            and_(
                EquipmentType.substation_id == Equipment.substation_id,
                EquipmentType.id == Equipment.equipment_type_id,
            ),
        )
        .join(Substation, Substation.id == Equipment.substation_id)
        .all()
    )
    equipment_by_key = {
        (equipment.substation_id, equipment.id): (
            equipment,
            equipment_type,
            substation,
        )
        for equipment, equipment_type, substation in equipment_rows
    }

    parameters = {
        parameter["key"]: parameter
        for parameter in load_test_catalog()["parameters"]
    }
    limit_date = (
        today + timedelta(days=due_within_days)
        if due_within_days is not None
        else None
    )
    generated = []

    for (substation_id, equipment_id, parameter_key), test_date in latest_tests.items():
        parameter = parameters.get(parameter_key)
        equipment_details = equipment_by_key.get(
            (substation_id, equipment_id)
        )
        if (
            not parameter
            or not parameter.get("interval_months")
            or not equipment_details
        ):
            continue

        due_date = _next_working_day(
            _add_months(test_date, parameter["interval_months"])
        )
        if limit_date is not None and not today <= due_date <= limit_date:
            continue

        equipment, equipment_type, substation = equipment_details
        generated.append({
            "id": f"test:{substation_id}:{equipment_id}:{parameter_key}",
            "substation_id": substation_id,
            "substation_name": substation.name,
            "equipment_id": equipment_id,
            "equipment_name": equipment.name or equipment.id,
            "equipment_type": equipment_type.name,
            "activity": parameter["name"],
            "parameter_key": parameter_key,
            "scheduled_date": due_date.isoformat(),
            "last_test_date": test_date.isoformat(),
            "interval_months": parameter["interval_months"],
            "completed_at": None,
            "description": "Automatically calculated from the latest test result",
            "source": "test-history",
        })

    return generated


@router.get("")
def get_asset_schedules(
    due_within_days: int | None = Query(default=None, ge=0, le=365),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    today = date.today()
    generated = _generated_test_schedules(
        db,
        today,
        due_within_days,
    )
    query = _schedule_query(db)

    if due_within_days is not None:
        query = query.filter(
            AssetSchedule.completed_at.is_(None),
            AssetSchedule.scheduled_date >= today,
            AssetSchedule.scheduled_date
            <= today + timedelta(days=due_within_days),
        )

    manual = [
        _serialize_schedule(row)
        for row in query.order_by(
            AssetSchedule.scheduled_date,
            AssetSchedule.id,
        ).all()
    ]
    return sorted(
        [*generated, *manual],
        key=lambda schedule: schedule["scheduled_date"],
    )


@router.post("", status_code=status.HTTP_201_CREATED)
def create_asset_schedule(
    data: ScheduleCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _require_scheduler_role(current_user)

    equipment = db.query(Equipment).filter(
        Equipment.substation_id == data.substation_id,
        Equipment.id == data.equipment_id,
    ).first()

    if not equipment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Equipment not found in the selected substation",
        )

    activity = data.activity.strip()
    if not activity:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Activity cannot be empty",
        )

    scheduled_date = _next_working_day(data.scheduled_date)
    existing = db.query(AssetSchedule).filter(
        AssetSchedule.substation_id == data.substation_id,
        AssetSchedule.equipment_id == data.equipment_id,
        AssetSchedule.scheduled_date == scheduled_date,
        AssetSchedule.activity == activity,
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This equipment already has this activity scheduled for that date",
        )

    schedule = AssetSchedule(
        substation_id=data.substation_id,
        equipment_id=data.equipment_id,
        activity=activity,
        scheduled_date=scheduled_date,
        description=data.description.strip() if data.description else None,
    )
    db.add(schedule)

    try:
        db.commit()
        db.refresh(schedule)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A matching equipment schedule already exists",
        )

    result = _get_schedule_response(db, schedule.id)
    result["requested_date"] = data.scheduled_date.isoformat()
    result["date_adjusted"] = scheduled_date != data.scheduled_date
    return result


@router.post("/{schedule_id}/complete")
def complete_asset_schedule(
    schedule_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _require_scheduler_role(current_user)

    schedule = db.query(AssetSchedule).filter(
        AssetSchedule.id == schedule_id
    ).first()

    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset schedule not found",
        )

    if schedule.completed_at is None:
        schedule.completed_at = date.today()

    catalog = load_test_catalog()
    parameter = next(
        (
            item
            for item in catalog["parameters"]
            if item["key"] == schedule.activity
            or item["name"] == schedule.activity
        ),
        None,
    )
    interval_months = (
        parameter["interval_months"]
        if parameter and parameter.get("interval_months")
        else catalog["manual_default_interval_months"]
    )

    next_due_date = _next_working_day(
        _add_months(schedule.completed_at, interval_months)
    )

    next_schedule = db.query(AssetSchedule).filter(
        AssetSchedule.substation_id == schedule.substation_id,
        AssetSchedule.equipment_id == schedule.equipment_id,
        AssetSchedule.activity == schedule.activity,
        AssetSchedule.scheduled_date == next_due_date,
        AssetSchedule.completed_at.is_(None),
    ).first()

    if next_schedule is None:
        next_schedule = AssetSchedule(
            substation_id=schedule.substation_id,
            equipment_id=schedule.equipment_id,
            activity=schedule.activity,
            scheduled_date=next_due_date,
            description=schedule.description,
        )
        db.add(next_schedule)

    try:
        db.commit()
        db.refresh(schedule)
        db.refresh(next_schedule)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Could not create the next quarterly schedule",
        )

    return {
        "completed_schedule": _get_schedule_response(db, schedule.id),
        "next_schedule": _get_schedule_response(db, next_schedule.id),
        "interval_months": interval_months,
    }
