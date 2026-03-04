from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Float
from sqlalchemy.sql import func
from database.db import Base

FISCAL_PERIOD_MAP = {
    "October": "P1", "November": "P2", "December": "P3",
    "January": "P4", "February": "P5", "March": "P6",
    "April": "P7", "May": "P8", "June": "P9",
    "July": "P10", "August": "P11", "September": "P12"
}

def calculate_aging(net_date, target_date):
    if not net_date or not target_date:
        return "Not due", None
    if hasattr(net_date, 'date'):    net_date    = net_date.date()
    if hasattr(target_date, 'date'): target_date = target_date.date()
    days = (target_date - net_date).days if target_date > net_date else 0
    if   days == 0:   return "Not due",     None
    elif days <= 30:  return "0-30 days",   None
    elif days <= 61:  return "31-61 days",  None
    elif days <= 90:  return "61-90 days",  None
    elif days <= 180: return "90-180 days", None
    else:             return ">180 days",   target_date.year

class RevenueExpense(Base):
    __tablename__ = "revenue_expenses"
    id        = Column(Integer, primary_key=True, index=True)
    userId    = Column(Integer, ForeignKey("users.id"), nullable=False)
    code      = Column(String, nullable=False)
    label     = Column(String, nullable=False)
    year      = Column(Integer, nullable=False)
    month     = Column(String, nullable=False)
    period    = Column(String, nullable=False)
    value     = Column(Float, nullable=False)
    frequency = Column(String, nullable=False)
    type      = Column(String, nullable=False)
    category  = Column(String, nullable=False)
    createdAt = Column(DateTime, server_default=func.now())
    updatedAt = Column(DateTime, onupdate=func.now())

class AssetLiability(Base):
    __tablename__ = "asset_liabilities"
    id          = Column(Integer, primary_key=True, index=True)
    userId      = Column(Integer, ForeignKey("users.id"), nullable=False)
    code        = Column(String, nullable=False)
    label       = Column(String, nullable=False)
    category    = Column(String, nullable=False)
    subCategory = Column(String, nullable=False)
    year        = Column(Integer, nullable=False)
    month       = Column(String, nullable=False)
    period      = Column(String, nullable=False)
    value       = Column(Float, nullable=False)
    type        = Column(String, nullable=True)
    createdAt   = Column(DateTime, server_default=func.now())
    updatedAt   = Column(DateTime, onupdate=func.now())

class CashFlow(Base):
    __tablename__ = "cash_flows"
    id        = Column(Integer, primary_key=True, index=True)
    userId    = Column(Integer, ForeignKey("users.id"), nullable=False)
    code      = Column(String, nullable=False)
    label     = Column(String, nullable=False)
    year      = Column(Integer, nullable=False)
    month     = Column(String, nullable=False)
    period    = Column(String, nullable=False)
    value     = Column(Float, nullable=False)
    createdAt = Column(DateTime, server_default=func.now())
    updatedAt = Column(DateTime, onupdate=func.now())

class Supplier(Base):
    __tablename__ = "suppliers"
    id              = Column(Integer, primary_key=True, index=True)
    userId          = Column(Integer, ForeignKey("users.id"), nullable=False)
    vendorName      = Column(String, nullable=False)
    amount          = Column(Float, nullable=False)
    expenseCategory = Column(String, nullable=True)
    netDate         = Column(DateTime, nullable=True)
    targetDate      = Column(DateTime, nullable=True)
    year            = Column(Integer, nullable=False)
    address         = Column(String, nullable=True)
    telephone       = Column(String, nullable=True)
    createdAt       = Column(DateTime, server_default=func.now())
    updatedAt       = Column(DateTime, onupdate=func.now())

class Customer(Base):
    __tablename__ = "customers"
    id           = Column(Integer, primary_key=True, index=True)
    userId       = Column(Integer, ForeignKey("users.id"), nullable=False)
    customerName = Column(String, nullable=False)
    amount       = Column(Float, nullable=False)
    netDate      = Column(DateTime, nullable=True)
    targetDate   = Column(DateTime, nullable=True)
    year         = Column(Integer, nullable=False)
    address      = Column(String, nullable=True)
    telephone    = Column(String, nullable=True)
    createdAt    = Column(DateTime, server_default=func.now())
    updatedAt    = Column(DateTime, onupdate=func.now())

# NEW — Client merges Supplier + Customer
class Client(Base):
    __tablename__ = "clients"
    id              = Column(Integer, primary_key=True, index=True)
    userId          = Column(Integer, ForeignKey("users.id"), nullable=False)
    clientName      = Column(String, nullable=False)
    clientType      = Column(String, nullable=False)  # 'supplier' or 'customer'
    amount          = Column(Float, nullable=False)
    expenseCategory = Column(String, nullable=True)
    netDate         = Column(DateTime, nullable=True)
    targetDate      = Column(DateTime, nullable=True)
    year            = Column(Integer, nullable=False)
    address         = Column(String, nullable=True)
    telephone       = Column(String, nullable=True)
    daysOutstanding = Column(Integer, nullable=True)
    agingDays       = Column(String, nullable=True)
    agingYear       = Column(Integer, nullable=True)
    createdAt       = Column(DateTime, server_default=func.now())
    updatedAt       = Column(DateTime, onupdate=func.now())