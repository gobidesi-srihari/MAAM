
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db
from dependencies import require_admin
from models.user import User
from schemas.user import UserCreate, UserResponse
from security import hash_password


router = APIRouter(
    prefix="/users",
    tags=["User Management"]
)


# ==========================================
# Request schemas for account management
# ==========================================

class UserRoleUpdate(BaseModel):
    role: Literal["admin", "engineer", "viewer"]


class UserStatusUpdate(BaseModel):
    is_active: bool


class UserPasswordReset(BaseModel):
    new_password: str = Field(min_length=8)


# ==========================================
# CREATE USER - Admin only
# ==========================================

@router.post(
    "/",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED
)
def create_user(
    data: UserCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    existing_user = db.query(User).filter(
        User.username == data.username
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already exists"
        )

    new_user = User(
        full_name=data.full_name,
        username=data.username,
        password_hash=hash_password(data.password),
        role=data.role,
        is_active=True,
        created_by=admin.id
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


# ==========================================
# VIEW USERS - Admin only
# ==========================================

@router.get("/", response_model=list[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    users = db.query(User).order_by(User.id).all()
    return users


# ==========================================
# UPDATE USER ROLE - Admin only
# ==========================================

@router.patch(
    "/{user_id}/role",
    response_model=UserResponse
)
def update_user_role(
    user_id: int,
    data: UserRoleUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    user = db.get(User, user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Prevent administrator from removing own admin role
    if user.id == admin.id and data.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot remove your own administrator role"
        )

    user.role = data.role

    db.commit()
    db.refresh(user)

    return user


# ==========================================
# ACTIVATE / DEACTIVATE USER - Admin only
# ==========================================

@router.patch(
    "/{user_id}/status",
    response_model=UserResponse
)
def update_user_status(
    user_id: int,
    data: UserStatusUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    user = db.get(User, user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Prevent administrator from deactivating own account
    if user.id == admin.id and not data.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot deactivate your own account"
        )

    user.is_active = data.is_active

    db.commit()
    db.refresh(user)

    return user


# ==========================================
# RESET USER PASSWORD - Admin only
# ==========================================

@router.patch(
    "/{user_id}/password",
    status_code=status.HTTP_204_NO_CONTENT
)
def reset_user_password(
    user_id: int,
    data: UserPasswordReset,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    user = db.get(User, user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Store only the password hash
    user.password_hash = hash_password(data.new_password)

    db.commit()

    return None
