import enum
from sqlalchemy import Column, Integer, String, Enum
from sqlalchemy.orm import relationship
from database.db import Base

class UserRole(str, enum.Enum):
    manager = "manager"
    leader  = "leader"
    member  = "member"

class User(Base):
    __tablename__ = "users"

    id        = Column(Integer, primary_key=True, index=True)
    role      = Column(Enum(UserRole), default=UserRole.member)
    fullName  = Column(String, nullable=True)
    telephone = Column(String, nullable=True)
    team      = Column(String, nullable=True)

    account = relationship(
        "Account",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan"
    )

    dashboard_permissions = relationship(
        "DashboardPermission",
        foreign_keys="DashboardPermission.user_id",
        back_populates="user",
        uselist=False
    )

    dashboard_accesses = relationship(
        "DashboardAccess",
        back_populates="user"
    )