from pydantic import BaseModel
from typing import Optional
from datetime import datetime

# REVENUE & EXPENSES

class RevenueExpenseCreate(BaseModel):
    code: str
    label: str
    year: int
    month: str
    value: float
    frequency: str
    type: str
    category: str
    userId: int

class RevenueExpenseUpdate(BaseModel):
    code: Optional[str] = None
    label: Optional[str] = None
    year: Optional[int] = None
    month: Optional[str] = None
    value: Optional[float] = None
    frequency: Optional[str] = None
    type: Optional[str] = None
    category: Optional[str] = None

class RevenueExpenseOut(BaseModel):
    id: int
    userId: int
    code: str
    label: str
    year: int
    month: str
    period: str
    value: float
    frequency: str
    type: str
    category: str
    createdAt: Optional[datetime] = None

    class Config:
        from_attributes = True

# ASSETS & LIABILITIES

class AssetLiabilityCreate(BaseModel):
    code: str
    label: str
    category: str
    subCategory: str
    year: int
    month: str
    value: float
    type: Optional[str] = None
    userId: int

class AssetLiabilityUpdate(BaseModel):
    code: Optional[str] = None
    label: Optional[str] = None
    category: Optional[str] = None
    subCategory: Optional[str] = None
    year: Optional[int] = None
    month: Optional[str] = None
    value: Optional[float] = None
    type: Optional[str] = None

class AssetLiabilityOut(BaseModel):
    id: int
    userId: int
    code: str
    label: str
    category: str
    subCategory: str
    year: int
    month: str
    period: str
    value: float
    type: Optional[str] = None
    createdAt: Optional[datetime] = None

    class Config:
        from_attributes = True

# CASH FLOW

class CashFlowCreate(BaseModel):
    code: str
    label: str
    year: int
    month: str
    value: float
    userId: int

class CashFlowUpdate(BaseModel):
    code: Optional[str] = None
    label: Optional[str] = None
    year: Optional[int] = None
    month: Optional[str] = None
    value: Optional[float] = None

class CashFlowOut(BaseModel):
    id: int
    userId: int
    code: str
    label: str
    year: int
    month: str
    period: str
    value: float
    createdAt: Optional[datetime] = None

    class Config:
        from_attributes = True



EXPENSE_CATEGORIES = [
    "General costs", "Other Business travel", "Other Insurance",
    "Professional fees", "Rents and leases", "Software licence",
]

class ClientCreate(BaseModel):
    clientName:      str
    clientType:      str
    amount:          float
    expenseCategory: Optional[str]      = None
    netDate:         Optional[datetime] = None
    targetDate:      Optional[datetime] = None
    year:            int
    address:         Optional[str]      = None
    telephone:       Optional[str]      = None
    userId:          int

class ClientUpdate(BaseModel):
    clientName:      Optional[str]      = None
    clientType:      Optional[str]      = None
    amount:          Optional[float]    = None
    expenseCategory: Optional[str]      = None
    netDate:         Optional[datetime] = None
    targetDate:      Optional[datetime] = None
    year:            Optional[int]      = None
    address:         Optional[str]      = None
    telephone:       Optional[str]      = None

class ClientOut(BaseModel):
    id:              int
    userId:          int
    clientName:      str
    clientType:      str
    amount:          float
    expenseCategory: Optional[str]      = None
    netDate:         Optional[datetime] = None
    targetDate:      Optional[datetime] = None
    year:            int
    address:         Optional[str]      = None
    telephone:       Optional[str]      = None
    daysOutstanding: Optional[int]      = None
    agingDays:       Optional[str]      = None
    agingYear:       Optional[int]      = None
    createdAt:       Optional[datetime] = None
    class Config: from_attributes = True