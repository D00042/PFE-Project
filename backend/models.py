from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey,Float
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    fullName = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    role = Column(String, default="Team Member") 
    isActive = Column(Boolean, default=True)  
    createdAt = Column(DateTime, server_default=func.now())
    updatedAt = Column(DateTime, onupdate=func.now())

    account = relationship("Account", back_populates="user", uselist=False, cascade="all, delete-orphan")
    
    def updateProfile(self, fullName: str, email: str):
        self.fullName = fullName
        self.email = email
        return True
    
    def logout(self):
        pass
    
    def getRole(self):
        return self.role

class Account(Base):
    __tablename__ = "accounts"
    
    id = Column(Integer, primary_key=True, index=True)
    userId = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)        
    password = Column(String, nullable=False)                  
    isActive = Column(Boolean, default=True)
    lastLogin = Column(DateTime, nullable=True)
    createdAt = Column(DateTime, server_default=func.now())
    
    user = relationship("User", back_populates="account")

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
    period = Column(String, nullable=False)   # auto-calculated from month
    value = Column(Float, nullable=False)
    frequency = Column(String, nullable=False) # "periodic" | "year to date"
    type = Column(String, nullable=False)      # "Actual" | "Budget"
    category = Column(String, nullable=False)
    createdAt = Column(DateTime, server_default=func.now())
    updatedAt = Column(DateTime, onupdate=func.now())

    user = relationship("User", backref="revenue_expenses")


class AssetLiability(Base):
    __tablename__ = "asset_liabilities"

    id = Column(Integer, primary_key=True, index=True)
    userId = Column(Integer, ForeignKey("users.id"), nullable=False)
    code = Column(String, nullable=False)
    label = Column(String, nullable=False)
    category = Column(String, nullable=False)    # "Assets" | "Liabilities"
    subCategory = Column(String, nullable=False)
    year = Column(Integer, nullable=False)
    month = Column(String, nullable=False)
    period = Column(String, nullable=False)      # auto-calculated
    value = Column(Float, nullable=False)
    type = Column(String, nullable=True)         # "Actual" | "Budget"
    createdAt = Column(DateTime, server_default=func.now())
    updatedAt = Column(DateTime, onupdate=func.now())

    user = relationship("User", backref="asset_liabilities")


class CashFlow(Base):
    __tablename__ = "cash_flows"

    id = Column(Integer, primary_key=True, index=True)
    userId = Column(Integer, ForeignKey("users.id"), nullable=False)
    code = Column(String, nullable=False)
    label = Column(String, nullable=False)
    year = Column(Integer, nullable=False)
    month = Column(String, nullable=False)
    period = Column(String, nullable=False)      # auto-calculated
    value = Column(Float, nullable=False)
    createdAt = Column(DateTime, server_default=func.now())
    updatedAt = Column(DateTime, onupdate=func.now())

    user = relationship("User", backref="cash_flows")


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

    user = relationship("User", backref="suppliers")


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

    user = relationship("User", backref="customers")