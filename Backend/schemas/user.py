
from typing import Literal

from pydantic import BaseModel, Field, ConfigDict


# Data entered by administrator to create a user
class UserCreate(BaseModel):
    full_name: str = Field(min_length=1, max_length=150)
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=8)
    role: Literal["admin", "engineer", "viewer"]


# Data returned after creating a user
class UserResponse(BaseModel):
    id: int
    full_name: str
    username: str
    role: str
    is_active: bool

    model_config = ConfigDict(from_attributes=True)
