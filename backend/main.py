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
    db.flush()  
    new_account = models.Account(
        userId=new_user.id,
        email=user_in.email,
        password=hashed_pwd,
        isActive=user_in.isActive
    )
    db.add(new_account)
    
    db.commit() 
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



FISCAL_PERIOD_MAP = {
    "October": "P1",  "November": "P2",  "December": "P3",
    "January": "P4",  "February": "P5",  "March": "P6",
    "April": "P7",    "May": "P8",       "June": "P9",
    "July": "P10",    "August": "P11",   "September": "P12"
}

def get_period(month: str) -> str:
    return FISCAL_PERIOD_MAP.get(month, "P1")


# REVENUE & EXPENSES

@app.post("/revenue-expenses", response_model=schemas.RevenueExpenseOut, status_code=201)
def create_revenue_expense(entry: schemas.RevenueExpenseCreate, db: Session = Depends(get_db)):
    data = entry.dict()
    data["period"] = get_period(data["month"])
    new_entry = models.RevenueExpense(**data)
    db.add(new_entry)
    db.commit()
    db.refresh(new_entry)
    return new_entry

@app.get("/revenue-expenses", response_model=list[schemas.RevenueExpenseOut])
def get_all_revenue_expenses(db: Session = Depends(get_db)):
    return db.query(models.RevenueExpense).all()

@app.get("/revenue-expenses/{entry_id}", response_model=schemas.RevenueExpenseOut)
def get_revenue_expense(entry_id: int, db: Session = Depends(get_db)):
    entry = db.query(models.RevenueExpense).filter(models.RevenueExpense.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    return entry

@app.put("/revenue-expenses/{entry_id}", response_model=schemas.RevenueExpenseOut)
def update_revenue_expense(entry_id: int, update: schemas.RevenueExpenseUpdate, db: Session = Depends(get_db)):
    entry = db.query(models.RevenueExpense).filter(models.RevenueExpense.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    data = update.dict(exclude_unset=True)
    if "month" in data:
        data["period"] = get_period(data["month"])
    for field, value in data.items():
        setattr(entry, field, value)
    db.commit()
    db.refresh(entry)
    return entry

@app.delete("/revenue-expenses/{entry_id}")
def delete_revenue_expense(entry_id: int, db: Session = Depends(get_db)):
    entry = db.query(models.RevenueExpense).filter(models.RevenueExpense.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    db.delete(entry)
    db.commit()
    return {"message": "Entry deleted successfully"}


# ASSETS & LIABILITIES

@app.post("/asset-liabilities", response_model=schemas.AssetLiabilityOut, status_code=201)
def create_asset_liability(entry: schemas.AssetLiabilityCreate, db: Session = Depends(get_db)):
    data = entry.dict()
    data["period"] = get_period(data["month"])
    new_entry = models.AssetLiability(**data)
    db.add(new_entry)
    db.commit()
    db.refresh(new_entry)
    return new_entry

@app.get("/asset-liabilities", response_model=list[schemas.AssetLiabilityOut])
def get_all_asset_liabilities(db: Session = Depends(get_db)):
    return db.query(models.AssetLiability).all()

@app.get("/asset-liabilities/{entry_id}", response_model=schemas.AssetLiabilityOut)
def get_asset_liability(entry_id: int, db: Session = Depends(get_db)):
    entry = db.query(models.AssetLiability).filter(models.AssetLiability.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    return entry

@app.put("/asset-liabilities/{entry_id}", response_model=schemas.AssetLiabilityOut)
def update_asset_liability(entry_id: int, update: schemas.AssetLiabilityUpdate, db: Session = Depends(get_db)):
    entry = db.query(models.AssetLiability).filter(models.AssetLiability.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    data = update.dict(exclude_unset=True)
    if "month" in data:
        data["period"] = get_period(data["month"])
    for field, value in data.items():
        setattr(entry, field, value)
    db.commit()
    db.refresh(entry)
    return entry

@app.delete("/asset-liabilities/{entry_id}")
def delete_asset_liability(entry_id: int, db: Session = Depends(get_db)):
    entry = db.query(models.AssetLiability).filter(models.AssetLiability.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    db.delete(entry)
    db.commit()
    return {"message": "Entry deleted successfully"}


# CASH FLOW 

@app.post("/cash-flows", response_model=schemas.CashFlowOut, status_code=201)
def create_cash_flow(entry: schemas.CashFlowCreate, db: Session = Depends(get_db)):
    data = entry.dict()
    data["period"] = get_period(data["month"])
    new_entry = models.CashFlow(**data)
    db.add(new_entry)
    db.commit()
    db.refresh(new_entry)
    return new_entry

@app.get("/cash-flows", response_model=list[schemas.CashFlowOut])
def get_all_cash_flows(db: Session = Depends(get_db)):
    return db.query(models.CashFlow).all()

@app.get("/cash-flows/{entry_id}", response_model=schemas.CashFlowOut)
def get_cash_flow(entry_id: int, db: Session = Depends(get_db)):
    entry = db.query(models.CashFlow).filter(models.CashFlow.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    return entry

@app.put("/cash-flows/{entry_id}", response_model=schemas.CashFlowOut)
def update_cash_flow(entry_id: int, update: schemas.CashFlowUpdate, db: Session = Depends(get_db)):
    entry = db.query(models.CashFlow).filter(models.CashFlow.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    data = update.dict(exclude_unset=True)
    if "month" in data:
        data["period"] = get_period(data["month"])
    for field, value in data.items():
        setattr(entry, field, value)
    db.commit()
    db.refresh(entry)
    return entry

@app.delete("/cash-flows/{entry_id}")
def delete_cash_flow(entry_id: int, db: Session = Depends(get_db)):
    entry = db.query(models.CashFlow).filter(models.CashFlow.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    db.delete(entry)
    db.commit()
    return {"message": "Entry deleted successfully"}


#SUPPLIERS

@app.post("/suppliers", response_model=schemas.SupplierOut, status_code=201)
def create_supplier(entry: schemas.SupplierCreate, db: Session = Depends(get_db)):
    new_entry = models.Supplier(**entry.dict())
    db.add(new_entry)
    db.commit()
    db.refresh(new_entry)
    return new_entry

@app.get("/suppliers", response_model=list[schemas.SupplierOut])
def get_all_suppliers(db: Session = Depends(get_db)):
    return db.query(models.Supplier).all()

@app.get("/suppliers/{entry_id}", response_model=schemas.SupplierOut)
def get_supplier(entry_id: int, db: Session = Depends(get_db)):
    entry = db.query(models.Supplier).filter(models.Supplier.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    return entry

@app.put("/suppliers/{entry_id}", response_model=schemas.SupplierOut)
def update_supplier(entry_id: int, update: schemas.SupplierUpdate, db: Session = Depends(get_db)):
    entry = db.query(models.Supplier).filter(models.Supplier.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    for field, value in update.dict(exclude_unset=True).items():
        setattr(entry, field, value)
    db.commit()
    db.refresh(entry)
    return entry

@app.delete("/suppliers/{entry_id}")
def delete_supplier(entry_id: int, db: Session = Depends(get_db)):
    entry = db.query(models.Supplier).filter(models.Supplier.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    db.delete(entry)
    db.commit()
    return {"message": "Entry deleted successfully"}


# CUSTOMERS

@app.post("/customers", response_model=schemas.CustomerOut, status_code=201)
def create_customer(entry: schemas.CustomerCreate, db: Session = Depends(get_db)):
    new_entry = models.Customer(**entry.dict())
    db.add(new_entry)
    db.commit()
    db.refresh(new_entry)
    return new_entry

@app.get("/customers", response_model=list[schemas.CustomerOut])
def get_all_customers(db: Session = Depends(get_db)):
    return db.query(models.Customer).all()

@app.get("/customers/{entry_id}", response_model=schemas.CustomerOut)
def get_customer(entry_id: int, db: Session = Depends(get_db)):
    entry = db.query(models.Customer).filter(models.Customer.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    return entry

@app.put("/customers/{entry_id}", response_model=schemas.CustomerOut)
def update_customer(entry_id: int, update: schemas.CustomerUpdate, db: Session = Depends(get_db)):
    entry = db.query(models.Customer).filter(models.Customer.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    for field, value in update.dict(exclude_unset=True).items():
        setattr(entry, field, value)
    db.commit()
    db.refresh(entry)
    return entry

@app.delete("/customers/{entry_id}")
def delete_customer(entry_id: int, db: Session = Depends(get_db)):
    entry = db.query(models.Customer).filter(models.Customer.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    db.delete(entry)
    db.commit()
    return {"message": "Entry deleted successfully"}