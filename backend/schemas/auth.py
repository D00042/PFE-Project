from pydantic import BaseModel, EmailStr
from models.user import UserRole
from typing import Optional

class UserRegister(BaseModel):
    email:     EmailStr
    password:  str
    role:      UserRole
    fullName:  Optional[str] = None
    telephone: Optional[str] = None
    team:      Optional[str] = None

class UserLogin(BaseModel):
    email:    EmailStr
    password: str

class UserUpdate(BaseModel):
    email:     Optional[EmailStr] = None
    role:      Optional[UserRole] = None
    fullName:  Optional[str]      = None
    telephone: Optional[str]      = None
    team:      Optional[str]      = None

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token:        str
    new_password: str