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
class RevenueExpense(Base):
    __tablename__ = "revenue_expenses"

    id = Column(Integer, primary_key=True, index=True)
    userId = Column(Integer, ForeignKey("users.id"), nullable=False)
    code = Column(String, nullable=False)
    label = Column(String, nullable=False)
    year = Column(Integer, nullable=False)
    period = Column(String, nullable=False)       
    month = Column(String, nullable=False)
    value = Column(Float, nullable=False)
    frequency = Column(String, nullable=False)    
    type = Column(String, nullable=False)         
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
    category = Column(String, nullable=False)       
    subCategory = Column(String, nullable=False)
    year = Column(Integer, nullable=False)
    period = Column(String, nullable=False)
    month = Column(String, nullable=False)
    value = Column(Float, nullable=False)
    frequency = Column(String, nullable=True)
    type = Column(String, nullable=True)
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
    value = Column(Float, nullable=False)
    category = Column(String, nullable=False)
    type = Column(String, nullable=False)        
    createdAt = Column(DateTime, server_default=func.now())
    updatedAt = Column(DateTime, onupdate=func.now())

    user = relationship("User", backref="cash_flows")


class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    userId = Column(Integer, ForeignKey("users.id"), nullable=False)
    vendorName = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    agingBucket = Column(String, nullable=True)
    netDate = Column(DateTime, nullable=True)
    targetDate = Column(DateTime, nullable=True)
    year = Column(Integer, nullable=False)
    address = Column(String, nullable=True)
    telephone = Column(String, nullable=True)
    category = Column(String, nullable=True)
    createdAt = Column(DateTime, server_default=func.now())
    updatedAt = Column(DateTime, onupdate=func.now())

    user = relationship("User", backref="suppliers")


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    userId = Column(Integer, ForeignKey("users.id"), nullable=False)
    customerName = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    agingBucket = Column(String, nullable=True)
    expenseCategory = Column(String, nullable=True)
    netDate = Column(DateTime, nullable=True)
    targetDate = Column(DateTime, nullable=True)
    year = Column(Integer, nullable=False)
    address = Column(String, nullable=True)
    telephone = Column(String, nullable=True)
    createdAt = Column(DateTime, server_default=func.now())
    updatedAt = Column(DateTime, onupdate=func.now())

    user = relationship("User", backref="customers")