from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class UserCreate(BaseModel):
    fullName: str
    email: EmailStr
    password: str
    role: str = "Team Member"  
    isActive: bool = True  

class UserUpdate(BaseModel):
    fullName: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    role: Optional[str] = None
    isActive: Optional[bool] = None

class UserOut(BaseModel):
    id: int
    fullName: str
    email: str
    role: str
    isActive: bool
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None
    
    class Config:
        from_attributes = True
        
class AccountOut(BaseModel):
    id: int
    userId: int
    email: str
    isActive: bool
    lastLogin: Optional[datetime] = None
    createdAt: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class UserWithAccount(UserOut):
    account: Optional[AccountOut] = None
    
    class Config:
        from_attributes = True