from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
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
    
    def updateProfile(self, fullName: str, email: str):
        self.fullName = fullName
        self.email = email
        return True
    
    def logout(self):
        pass
    
    def getRole(self):
        return self.role