from sqlalchemy import Column, Integer, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from database.db import Base

class DashboardPermission(Base):
    __tablename__ = "dashboard_permissions"

    id              = Column(Integer, primary_key=True, index=True)
    user_id         = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    profitability   = Column(Boolean, default=False)
    balance_sheet   = Column(Boolean, default=False)
    liquidity       = Column(Boolean, default=False)
    dpo_dso         = Column(Boolean, default=False)

    user = relationship("User", back_populates="dashboard_permissions")