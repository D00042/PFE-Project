from pydantic import BaseModel, EmailStr
from typing import Optional

class UserCreate(BaseModel):
    fullName: str
    email: EmailStr
    password:str
    role:str="Team Member"

class UserOut(BaseModel):
    id: int
    fullName:str
    email:str
    role:str

    class Config:
        from_attributes=True