from sqlalchemy import Column, Integer, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database.db import Base

class DashboardPermission(Base):
    __tablename__ = "dashboard_permissions"

    id            = Column(Integer, primary_key=True, index=True)
    user_id       = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    profitability = Column(Boolean, default=False)
    balance_sheet = Column(Boolean, default=False)
    liquidity     = Column(Boolean, default=False)
    dpo_dso       = Column(Boolean, default=False)
    granted_by    = Column(Integer, ForeignKey("users.id"), nullable=True)
    granted_at    = Column(DateTime, server_default=func.now(), onupdate=func.now())

    @property
    def is_granted(self):
        return any([self.profitability, self.balance_sheet,
                    self.liquidity, self.dpo_dso])

    user = relationship(
        "User",
        foreign_keys="DashboardPermission.user_id",
        back_populates="dashboard_permissions"
    )
    granted_by_user = relationship(
        "User",
        foreign_keys="DashboardPermission.granted_by"
    )

    dashboard_accesses = relationship(
        "DashboardAccess",
        back_populates="dashboard_permission"
    )