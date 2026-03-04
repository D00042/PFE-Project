from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.db import get_db
from models.data_models import RevenueExpense, AssetLiability, CashFlow, Client, calculate_aging
from schemas.data import (
    RevenueExpenseCreate, RevenueExpenseUpdate, RevenueExpenseOut,
    AssetLiabilityCreate, AssetLiabilityUpdate, AssetLiabilityOut,
    CashFlowCreate, CashFlowUpdate, CashFlowOut,
    ClientCreate, ClientUpdate, ClientOut,
)
router = APIRouter(tags=["data"])

FISCAL_PERIOD_MAP = {
    "October": "P1", "November": "P2", "December": "P3",
    "January": "P4", "February": "P5", "March": "P6",
    "April": "P7", "May": "P8", "June": "P9",
    "July": "P10", "August": "P11", "September": "P12"
}

def get_period(month: str) -> str:
    return FISCAL_PERIOD_MAP.get(month, "P1")

# REVENUE & EXPENSES

@router.post("/revenue-expenses", response_model=RevenueExpenseOut, status_code=201)
def create_revenue_expense(entry: RevenueExpenseCreate, db: Session = Depends(get_db)):
    data = entry.dict()
    data["period"] = get_period(data["month"])
    new_entry = RevenueExpense(**data)
    db.add(new_entry)
    db.commit()
    db.refresh(new_entry)
    return new_entry

@router.get("/revenue-expenses", response_model=list[RevenueExpenseOut])
def get_all_revenue_expenses(db: Session = Depends(get_db)):
    return db.query(RevenueExpense).all()

@router.get("/revenue-expenses/{entry_id}", response_model=RevenueExpenseOut)
def get_revenue_expense(entry_id: int, db: Session = Depends(get_db)):
    entry = db.query(RevenueExpense).filter(RevenueExpense.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    return entry

@router.put("/revenue-expenses/{entry_id}", response_model=RevenueExpenseOut)
def update_revenue_expense(entry_id: int, update: RevenueExpenseUpdate, db: Session = Depends(get_db)):
    entry = db.query(RevenueExpense).filter(RevenueExpense.id == entry_id).first()
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

@router.delete("/revenue-expenses/{entry_id}")
def delete_revenue_expense(entry_id: int, db: Session = Depends(get_db)):
    entry = db.query(RevenueExpense).filter(RevenueExpense.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    db.delete(entry)
    db.commit()
    return {"message": "Entry deleted successfully"}

# ASSETS & LIABILITIES

@router.post("/asset-liabilities", response_model=AssetLiabilityOut, status_code=201)
def create_asset_liability(entry: AssetLiabilityCreate, db: Session = Depends(get_db)):
    data = entry.dict()
    data["period"] = get_period(data["month"])
    new_entry = AssetLiability(**data)
    db.add(new_entry)
    db.commit()
    db.refresh(new_entry)
    return new_entry

@router.get("/asset-liabilities", response_model=list[AssetLiabilityOut])
def get_all_asset_liabilities(db: Session = Depends(get_db)):
    return db.query(AssetLiability).all()

@router.get("/asset-liabilities/{entry_id}", response_model=AssetLiabilityOut)
def get_asset_liability(entry_id: int, db: Session = Depends(get_db)):
    entry = db.query(AssetLiability).filter(AssetLiability.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    return entry

@router.put("/asset-liabilities/{entry_id}", response_model=AssetLiabilityOut)
def update_asset_liability(entry_id: int, update: AssetLiabilityUpdate, db: Session = Depends(get_db)):
    entry = db.query(AssetLiability).filter(AssetLiability.id == entry_id).first()
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

@router.delete("/asset-liabilities/{entry_id}")
def delete_asset_liability(entry_id: int, db: Session = Depends(get_db)):
    entry = db.query(AssetLiability).filter(AssetLiability.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    db.delete(entry)
    db.commit()
    return {"message": "Entry deleted successfully"}

# CASH FLOW

@router.post("/cash-flows", response_model=CashFlowOut, status_code=201)
def create_cash_flow(entry: CashFlowCreate, db: Session = Depends(get_db)):
    data = entry.dict()
    data["period"] = get_period(data["month"])
    new_entry = CashFlow(**data)
    db.add(new_entry)
    db.commit()
    db.refresh(new_entry)
    return new_entry

@router.get("/cash-flows", response_model=list[CashFlowOut])
def get_all_cash_flows(db: Session = Depends(get_db)):
    return db.query(CashFlow).all()

@router.get("/cash-flows/{entry_id}", response_model=CashFlowOut)
def get_cash_flow(entry_id: int, db: Session = Depends(get_db)):
    entry = db.query(CashFlow).filter(CashFlow.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    return entry

@router.put("/cash-flows/{entry_id}", response_model=CashFlowOut)
def update_cash_flow(entry_id: int, update: CashFlowUpdate, db: Session = Depends(get_db)):
    entry = db.query(CashFlow).filter(CashFlow.id == entry_id).first()
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

@router.delete("/cash-flows/{entry_id}")
def delete_cash_flow(entry_id: int, db: Session = Depends(get_db)):
    entry = db.query(CashFlow).filter(CashFlow.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    db.delete(entry)
    db.commit()
    return {"message": "Entry deleted successfully"}


@router.post("/clients", response_model=ClientOut, status_code=201)
def create_client(entry: ClientCreate, db: Session = Depends(get_db)):
    data = entry.dict()
    net, tgt = data.get("netDate"), data.get("targetDate")
    aging_days, aging_year = calculate_aging(net, tgt)
    days_out = None
    if net and tgt:
        n = net.date() if hasattr(net, 'date') else net
        t = tgt.date() if hasattr(tgt, 'date') else tgt
        days_out = (t - n).days if t > n else 0
    db_entry = Client(**data, daysOutstanding=days_out, agingDays=aging_days, agingYear=aging_year)
    db.add(db_entry); db.commit(); db.refresh(db_entry)
    return db_entry

@router.get("/clients", response_model=list[ClientOut])
def get_all_clients(db: Session = Depends(get_db)):
    return db.query(Client).all()

@router.get("/clients/{entry_id}", response_model=ClientOut)
def get_client(entry_id: int, db: Session = Depends(get_db)):
    e = db.query(Client).filter(Client.id == entry_id).first()
    if not e: raise HTTPException(status_code=404, detail="Entry not found")
    return e

@router.put("/clients/{entry_id}", response_model=ClientOut)
def update_client(entry_id: int, update: ClientUpdate, db: Session = Depends(get_db)):
    e = db.query(Client).filter(Client.id == entry_id).first()
    if not e: raise HTTPException(status_code=404, detail="Entry not found")
    data = update.dict(exclude_unset=True)
    for k, v in data.items(): setattr(e, k, v)
    if "netDate" in data or "targetDate" in data:
        aging_days, aging_year = calculate_aging(e.netDate, e.targetDate)
        net, tgt = e.netDate, e.targetDate
        if net and tgt:
            n = net.date() if hasattr(net, 'date') else net
            t = tgt.date() if hasattr(tgt, 'date') else tgt
            e.daysOutstanding = (t - n).days if t > n else 0
        e.agingDays = aging_days; e.agingYear = aging_year
    db.commit(); db.refresh(e)
    return e

@router.delete("/clients/{entry_id}")
def delete_client(entry_id: int, db: Session = Depends(get_db)):
    e = db.query(Client).filter(Client.id == entry_id).first()
    if not e: raise HTTPException(status_code=404, detail="Entry not found")
    db.delete(e); db.commit()
    return {"message": "Entry deleted successfully"}