from sqlalchemy import Column, Integer, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database.db import Base

class DashboardAccess(Base):
    __tablename__ = "dashboard_access"

    id                      = Column(Integer, primary_key=True, index=True)
    user_id                 = Column(Integer, ForeignKey("users.id"), nullable=False)
    dashboard_permissions_id = Column(Integer, ForeignKey("dashboard_permissions.id"), nullable=False)
    granted_at              = Column(DateTime, default=func.now())

    user = relationship("User", back_populates="dashboard_accesses")
    dashboard_permission = relationship("DashboardPermission", back_populates="dashboard_accesses")
