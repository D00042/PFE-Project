from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Enum
from sqlalchemy.sql import func
from database.db import Base
import enum

class InsightType(str, enum.Enum):
    interpretation = "interpretation"
    recommendation = "recommendation"

class AIInsight(Base):
    __tablename__ = "ai_insights"

    id          = Column(Integer, primary_key=True, index=True)
    userId      = Column(Integer, ForeignKey("users.id"), nullable=False)
    insightType = Column(Enum(InsightType), nullable=False)
    dashboard   = Column(String, nullable=False)   
    year        = Column(Integer, nullable=False)
    period      = Column(String, nullable=False)
    targetPeriod = Column(String, nullable=True)  
    content     = Column(Text, nullable=False)     
    createdAt   = Column(DateTime, server_default=func.now())