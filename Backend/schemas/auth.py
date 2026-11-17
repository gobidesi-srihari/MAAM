from pydantic import BaseModel


# Data received from React during login
class LoginRequest(BaseModel):
    username: str
    password: str


# Data returned to React after successful login
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"