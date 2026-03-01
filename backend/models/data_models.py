from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Float
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database.db import Base

FISCAL_PERIOD_MAP = {
    "October": "P1", "November": "P2", "December": "P3",
    "January": "P4", "February": "P5", "March": "P6",
    "April": "P7", "May": "P8", "June": "P9",
    "July": "P10", "August": "P11", "September": "P12"
}

class RevenueExpense(Base):
    __tablename__ = "revenue_expenses"
    id = Column(Integer, primary_key=True, index=True)
    userId = Column(Integer, ForeignKey("users.id"), nullable=False)
    code = Column(String, nullable=False)
    label = Column(String, nullable=False)
    year = Column(Integer, nullable=False)
    month = Column(String, nullable=False)
    period = Column(String, nullable=False)
    value = Column(Float, nullable=False)
    frequency = Column(String, nullable=False)
    type = Column(String, nullable=False)
    category = Column(String, nullable=False)
    createdAt = Column(DateTime, server_default=func.now())
    updatedAt = Column(DateTime, onupdate=func.now())

class AssetLiability(Base):
    __tablename__ = "asset_liabilities"
    id = Column(Integer, primary_key=True, index=True)
    userId = Column(Integer, ForeignKey("users.id"), nullable=False)
    code = Column(String, nullable=False)
    label = Column(String, nullable=False)
    category = Column(String, nullable=False)
    subCategory = Column(String, nullable=False)
    year = Column(Integer, nullable=False)
    month = Column(String, nullable=False)
    period = Column(String, nullable=False)
    value = Column(Float, nullable=False)
    type = Column(String, nullable=True)
    createdAt = Column(DateTime, server_default=func.now())
    updatedAt = Column(DateTime, onupdate=func.now())

class CashFlow(Base):
    __tablename__ = "cash_flows"
    id = Column(Integer, primary_key=True, index=True)
    userId = Column(Integer, ForeignKey("users.id"), nullable=False)
    code = Column(String, nullable=False)
    label = Column(String, nullable=False)
    year = Column(Integer, nullable=False)
    month = Column(String, nullable=False)
    period = Column(String, nullable=False)
    value = Column(Float, nullable=False)
    createdAt = Column(DateTime, server_default=func.now())
    updatedAt = Column(DateTime, onupdate=func.now())

class Supplier(Base):
    __tablename__ = "suppliers"
    id = Column(Integer, primary_key=True, index=True)
    userId = Column(Integer, ForeignKey("users.id"), nullable=False)
    vendorName = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    expenseCategory = Column(String, nullable=True)
    netDate = Column(DateTime, nullable=True)
    targetDate = Column(DateTime, nullable=True)
    year = Column(Integer, nullable=False)
    address = Column(String, nullable=True)
    telephone = Column(String, nullable=True)
    createdAt = Column(DateTime, server_default=func.now())
    updatedAt = Column(DateTime, onupdate=func.now())

class Customer(Base):
    __tablename__ = "customers"
    id = Column(Integer, primary_key=True, index=True)
    userId = Column(Integer, ForeignKey("users.id"), nullable=False)
    customerName = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    netDate = Column(DateTime, nullable=True)
    targetDate = Column(DateTime, nullable=True)
    year = Column(Integer, nullable=False)
    address = Column(String, nullable=True)
    telephone = Column(String, nullable=True)
    createdAt = Column(DateTime, server_default=func.now())
    updatedAt = Column(DateTime, onupdate=func.now())