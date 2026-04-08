from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class AIInsightCreate(BaseModel):
    insightType:  str
    dashboard:    str
    year:         int
    period:       str
    targetPeriod: Optional[str] = None
    content:      str           # JSON string

class AIInsightOut(BaseModel):
    id:           int
    userId:       int
    insightType:  str
    dashboard:    str
    year:         int
    period:       str
    targetPeriod: Optional[str] = None
    content:      str
    createdAt:    Optional[datetime] = None

    class Config:
        from_attributes = True