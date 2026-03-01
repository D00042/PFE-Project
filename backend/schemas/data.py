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

# SUPPLIERS

class SupplierCreate(BaseModel):
    vendorName: str
    amount: float
    expenseCategory: Optional[str] = None
    netDate: Optional[datetime] = None
    targetDate: Optional[datetime] = None
    year: int
    address: Optional[str] = None
    telephone: Optional[str] = None
    userId: int

class SupplierUpdate(BaseModel):
    vendorName: Optional[str] = None
    amount: Optional[float] = None
    expenseCategory: Optional[str] = None
    netDate: Optional[datetime] = None
    targetDate: Optional[datetime] = None
    year: Optional[int] = None
    address: Optional[str] = None
    telephone: Optional[str] = None

class SupplierOut(BaseModel):
    id: int
    userId: int
    vendorName: str
    amount: float
    expenseCategory: Optional[str] = None
    netDate: Optional[datetime] = None
    targetDate: Optional[datetime] = None
    year: int
    address: Optional[str] = None
    telephone: Optional[str] = None
    createdAt: Optional[datetime] = None

    class Config:
        from_attributes = True

# CUSTOMERS

class CustomerCreate(BaseModel):
    customerName: str
    amount: float
    netDate: Optional[datetime] = None
    targetDate: Optional[datetime] = None
    year: int
    address: Optional[str] = None
    telephone: Optional[str] = None
    userId: int

class CustomerUpdate(BaseModel):
    customerName: Optional[str] = None
    amount: Optional[float] = None
    netDate: Optional[datetime] = None
    targetDate: Optional[datetime] = None
    year: Optional[int] = None
    address: Optional[str] = None
    telephone: Optional[str] = None

class CustomerOut(BaseModel):
    id: int
    userId: int
    customerName: str
    amount: float
    netDate: Optional[datetime] = None
    targetDate: Optional[datetime] = None
    year: int
    address: Optional[str] = None
    telephone: Optional[str] = None
    createdAt: Optional[datetime] = None

    class Config:
        from_attributes = True