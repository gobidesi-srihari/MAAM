from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from security import verify_password
from auth import create_access_token, verify_access_token
from schemas.auth import LoginRequest, TokenResponse


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


@router.post("/login", response_model=TokenResponse)
def login(
    data: LoginRequest,
    db: Session = Depends(get_db)
):
    # Find user in PostgreSQL
    user = db.query(User).filter(
        User.username == data.username
    ).first()

    # Check username and password
    if not user or not verify_password(
        data.password,
        user.password_hash
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )

    # Check whether account is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is inactive"
        )

    # Generate JWT token
    access_token = create_access_token(user.id)

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }

# Read JWT token from the request
bearer_scheme = HTTPBearer(auto_error=False)


@router.get("/me")
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db)
):
    # Check whether the token was provided
    if credentials is None:
        raise HTTPException(
            status_code=401,
            detail="Authentication required"
        )

    # Verify JWT token
    user_id = verify_access_token(credentials.credentials)

    # Find the user in PostgreSQL
    user = db.query(User).filter(User.id == user_id).first()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=401,
            detail="Invalid or inactive user"
        )

    return {
        "id": user.id,
        "full_name": user.full_name,
        "username": user.username,
        "role": user.role
    }