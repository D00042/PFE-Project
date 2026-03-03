import enum
from sqlalchemy import Column, Integer, String, Boolean, Enum
from database.db import Base

class UserRole(str, enum.Enum):
    manager = "manager"
    leader = "leader"
    member = "member"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.member)
    is_active = Column(Boolean, default=True)