from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from database import engine, Base, get_db
from typing import List
import models
import schemas
import utils

app=FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create tables
models.Base.metadata.create_all(bind=engine)

# USER MANAGEMENT ENDPOINTS

@app.post("/users", response_model=schemas.UserOut, status_code=201)
def create_user(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user_in.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_pwd = utils.hash_password(user_in.password)
    
    new_user = models.User(
        fullName=user_in.fullName,
        email=user_in.email,
        password=hashed_pwd,
        role=user_in.role,
        isActive=user_in.isActive
    )
    
    db.add(new_user)
    db.flush()  # CHANGE: flush instead of commit to get the new_user.id
    
    # ADD THIS BLOCK - create linked Account
    new_account = models.Account(
        userId=new_user.id,
        email=user_in.email,
        password=hashed_pwd,
        isActive=user_in.isActive
    )
    db.add(new_account)
    
    db.commit()  # now commit both together
    db.refresh(new_user)
    return new_user


@app.get("/users", response_model=list[schemas.UserOut])
def get_all_users(db: Session = Depends(get_db)):
    """
    Get all users (Team Leader only)
    """
    users = db.query(models.User).all()
    return users


@app.get("/users/{user_id}", response_model=schemas.UserOut)
def get_user(user_id: int, db: Session = Depends(get_db)):
    """
    Get user by ID
    """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@app.put("/users/{user_id}", response_model=schemas.UserOut)
def update_user(user_id: int, user_update: schemas.UserUpdate, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user_update.fullName is not None:
        user.fullName = user_update.fullName
    if user_update.email is not None:
        existing = db.query(models.User).filter(
            models.User.email == user_update.email,
            models.User.id != user_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")
        user.email = user_update.email
    if user_update.password is not None:
        user.password = utils.hash_password(user_update.password)
    if user_update.role is not None:
        valid_roles = ["Manager", "Team Leader", "Team Member"]
        if user_update.role not in valid_roles:
            raise HTTPException(status_code=400, detail="Invalid role assigned")
        user.role = user_update.role
    if user_update.isActive is not None:
        user.isActive = user_update.isActive
    db.commit()
    db.refresh(user)
    return user


@app.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    """
    Delete user (Team Leader only)
    """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"}


# ACTIVATION/DEACTIVATION ENDPOINTS

@app.patch("/users/{user_id}/activate")
def activate_user(user_id: int, db: Session = Depends(get_db)):
    """
    Activate a user account (Team Leader only)
    """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.isActive = True
    db.commit()
    db.refresh(user)
    return {"message": "User activated successfully", "user": user}


@app.patch("/users/{user_id}/deactivate")
def deactivate_user(user_id: int, db: Session = Depends(get_db)):
    """
    Deactivate a user account (Team Leader only)
    """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.isActive = False
    db.commit()
    db.refresh(user)
    return {"message": "User deactivated successfully", "user": user}


# AUTHENTICATION

@app.post("/login")
def login(credentials: dict, db: Session = Depends(get_db)):
    email = credentials.get("email")
    password = credentials.get("password")
    
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user or not utils.verify_password(password, user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user.isActive:
        raise HTTPException(status_code=403, detail="Account is deactivated")
    
    # ADD THIS - track last login on the Account
    if user.account:
        from datetime import datetime
        user.account.lastLogin = datetime.utcnow()
        db.commit()
    
    return {
        "access_token": "partner_will_provide_jwt_here", 
        "token_type": "bearer",
        "role": user.role,
        "fullName": user.fullName
    }