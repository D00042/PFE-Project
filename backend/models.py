from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from database import Base 

class User(Base):
    __tablename__="users"
    id=Column(Integer,primary_key=True,index=True)
    fullName=Column(String,nullable=False)
    email=Column(String,unique=True,index=True,nullable=False)
    password=Column(String,nullable=False)
    role=Column(String,default="Team Member")

    def authenticate(self, email: str, password: str):
        return self.email == email and self.password == password

    def updateProfile(self, fullName: str, email: str):
        self.fullName = fullName
        self.email = email
        return True

    def logout(self):
        pass

    def resetPassword(self, new_password: str):  
        self.password = new_password

    def getRole(self):
        return self.role
