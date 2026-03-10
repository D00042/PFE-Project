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
from core.dependencies import get_current_user
from models.user import User
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
    if data.get("label") != "Other Overheads":
        data["category"] = data["label"]
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
    if "label" in data and data["label"] != "Other Overheads":
        data["category"] = data["label"]
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

# CLIENTS

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

FISCAL_MONTHS_IN_ORDER = [
    "October", "November", "December", "January", "February", "March",
    "April", "May", "June", "July", "August", "September"
]

@router.get("/dashboard/profitability")
def get_profitability_dashboard(
    year: int,
    period: str = "P12",          # ← new param, defaults to full year
    db: Session = Depends(get_db),
):
    # Convert "P3" → keep only the first 3 fiscal months (Oct, Nov, Dec)
    try:
        period_index = int(period.replace("P", ""))
    except ValueError:
        period_index = 12

    active_months = FISCAL_MONTHS_IN_ORDER[:period_index]

    # Filter BOTH years to only the active months
    current  = db.query(RevenueExpense).filter(
        RevenueExpense.year == year,
        RevenueExpense.month.in_(active_months)
    ).all()
    previous = db.query(RevenueExpense).filter(
        RevenueExpense.year == year - 1,
        RevenueExpense.month.in_(active_months)
    ).all()

    def sum_by_label(entries, label):
        return sum(e.value or 0 for e in entries if e.label == label)

    def sum_by_category(entries, category):
        return sum(e.value or 0 for e in entries
               if e.label == "Other Overheads" and e.category == category)

    rev_curr      = sum_by_label(current,  "Revenue")
    rev_prev      = sum_by_label(previous, "Revenue")
    ebit_curr     = sum_by_label(current,  "EBIT")
    ebit_prev     = sum_by_label(previous, "EBIT")
    retained_curr = sum_by_label(current,  "Retained Profit/(loss)")
    retained_prev = sum_by_label(previous, "Retained Profit/(loss)")
    staff_cur     = sum_by_label(current,  "Staff Costs")
    staff_prev    = sum_by_label(previous, "Staff Costs")

    gross_margin_curr = round((rev_curr - staff_cur)  / rev_curr * 100, 2) if rev_curr else 0
    gross_margin_prev = round((rev_prev - staff_prev) / rev_prev * 100, 2) if rev_prev else 0
    ebit_margin_curr  = round(ebit_curr     / rev_curr * 100, 2) if rev_curr else 0
    ebit_margin_prev  = round(ebit_prev     / rev_prev * 100, 2) if rev_prev else 0
    net_margin_curr   = round(retained_curr / rev_curr * 100, 2) if rev_curr else 0
    net_margin_prev   = round(retained_prev / rev_prev * 100, 2) if rev_prev else 0

    pl_labels = [
        "Revenue", "Staff Costs", "Overhead Depreciation",
        "Other Overheads", "Total Miscellaneous Overheads",
        "EBIT", "Interest", "Retained Profit/(loss)"
    ]
    pl_summary = [
        {
            "label":    lbl,
            "current":  round(sum_by_label(current,  lbl), 2),
            "previous": round(sum_by_label(previous, lbl), 2),
        }
        for lbl in pl_labels
    ]

    overhead_categories = [
        "Property Costs", "Communication Costs", "Travel And Entertainment",
        "Office Costs", "Computer Costs", "Professional Fees",
    ]
    overheads_detail = [
        {
            "category": cat,
            "current":  round(sum_by_category(current,  cat), 2),
            "previous": round(sum_by_category(previous, cat), 2),
        }
        for cat in overhead_categories
    ]

    # Monthly trend — only active months, in fiscal order
    monthly_trend = []
    for m in active_months:
        rev = sum(e.value for e in current  if e.label == "Revenue" and e.month == m)
        exp = sum(e.value for e in current  if e.label not in ("Revenue",) and e.month == m)
        ebt = sum(e.value for e in current  if e.label == "EBIT"    and e.month == m)
        monthly_trend.append({
            "month":    m[:3],
            "revenue":  round(rev, 2),
            "expenses": round(exp, 2),
            "ebit":     round(ebt, 2),
        })

    funnel = [
        {"name": "Gross Profit Margin", "value": abs(gross_margin_curr)},
        {"name": "EBIT Margin",         "value": abs(ebit_margin_curr)},
        {"name": "Net Profit Margin",   "value": abs(net_margin_curr)},
    ]

    return {
        "kpis": {
            "grossMargin":    {"current": gross_margin_curr, "previous": gross_margin_prev},
            "ebitMargin":     {"current": ebit_margin_curr,  "previous": ebit_margin_prev},
            "netProfitMargin":{"current": net_margin_curr,   "previous": net_margin_prev},
            "roa":            {"current": 0,                 "previous": 0},
            "totalRevenue":   {"current": round(rev_curr,2), "previous": round(rev_prev,2)},
        },
        "plSummary":       pl_summary,
        "overheadsDetail": overheads_detail,
        "monthlyTrend":    monthly_trend,
        "funnel":          funnel,
    }
@router.get("/dashboard/balance-sheet")
def get_balance_sheet_dashboard(
    year: int,
    period: str = "P12",
    db: Session = Depends(get_db),
):
    try:
        period_index = int(period.replace("P", "")) - 1
    except ValueError:
        period_index = 11

    selected_month = FISCAL_MONTHS_IN_ORDER[period_index]

    current  = db.query(AssetLiability).filter(
        AssetLiability.year == year,
        AssetLiability.month == selected_month
    ).all()
    previous = db.query(AssetLiability).filter(
        AssetLiability.year == year - 1,
        AssetLiability.month == selected_month
    ).all()

    def sl(entries, label):
        return sum(e.value or 0 for e in entries
                   if (e.label or "").strip().lower() == label.strip().lower())

    def ss(entries, subcategory):
        return sum(e.value or 0 for e in entries
                   if (e.subCategory or "").strip().lower() == subcategory.strip().lower())

    # ── Non-current Assets: sum all rows with subCategory = "SB Non-current Assets"
    non_curr_c = ss(current,  "SB Non-current Assets")
    non_curr_p = ss(previous, "SB Non-current Assets")

    # ── Current Assets: sum all rows with subCategory = "SB Current Assets"
    curr_c = ss(current,  "SB Current Assets")
    curr_p = ss(previous, "SB Current Assets")

    # ── Total Assets
    total_assets_c = non_curr_c + curr_c
    total_assets_p = non_curr_p + curr_p

    # ── Equity: only "Equity holders of parent" exists in your data
    equity_c = sl(current,  "Equity holders of parent")
    equity_p = sl(previous, "Equity holders of parent")

    # ── Non-current Liabilities: sum subCategory = "SB Non-current Provisions and Liabilities"
    # BUT BST240000T has label = "SB Non-current provisions and liabilities" so use sl()
    ncl_c = sl(current,  "SB Non-current provisions and liabilities")
    ncl_p = sl(previous, "SB Non-current provisions and liabilities")

    # ── Current Liabilities: sum all rows with subCategory = "SB Current Provisions And Liabilities"
    cl_c = ss(current,  "SB Current Provisions And Liabilities")
    cl_p = ss(previous, "SB Current Provisions And Liabilities")

    # ── Total Equity and Liabilities
    total_eq_liab_c = equity_c + ncl_c + cl_c
    total_eq_liab_p = equity_p + ncl_p + cl_p

    # ── Individual line items
    cash_c    = sl(current,  "SB Cash and cash equivalents")
    cash_p    = sl(previous, "SB Cash and cash equivalents")
    recv_c    = sl(current,  "Current trade and other receivables")
    recv_p    = sl(previous, "Current trade and other receivables")
    pay_c     = sl(current,  "Trade payables")
    pay_p     = sl(previous, "Trade payables")
    prep_c    = sl(current,  "Current prepayments")
    prep_p    = sl(previous, "Current prepayments")
    other_c   = sl(current,  "Current other assets - non-financial instruments")
    other_p   = sl(previous, "Current other assets - non-financial instruments")
    tax_rec_c = sl(current,  "Current income tax recoverable")
    tax_rec_p = sl(previous, "Current income tax recoverable")

    # ── KPIs
    total_liab_c   = ncl_c + cl_c
    total_liab_p   = ncl_p + cl_p
    equity_ratio_c = round(equity_c / total_assets_c * 100, 2) if total_assets_c else 0
    equity_ratio_p = round(equity_p / total_assets_p * 100, 2) if total_assets_p else 0
    working_cap_c  = round(curr_c - cl_c, 2)
    working_cap_p  = round(curr_p - cl_p, 2)
    curr_ratio_c   = round(curr_c / cl_c, 2) if cl_c else 0
    curr_ratio_p   = round(curr_p / cl_p, 2) if cl_p else 0
    de_c           = round(total_liab_c / equity_c, 2) if equity_c else 0
    de_p           = round(total_liab_p / equity_p, 2) if equity_p else 0

    def row(label):
        return {
            "label":    label,
            "current":  round(sl(current,  label), 2),
            "previous": round(sl(previous, label), 2),
        }

    return {
        "snapshotMonth": selected_month,
        "kpis": {
            "equityRatio":    {"current": equity_ratio_c, "previous": equity_ratio_p},
            "workingCapital": {"current": working_cap_c,  "previous": working_cap_p},
            "currentRatio":   {"current": curr_ratio_c,   "previous": curr_ratio_p},
            "debtToEquity":   {"current": de_c,           "previous": de_p},
            "cash":           {"current": round(cash_c,2),"previous": round(cash_p,2)},
        },
        "charts": {
            "totalAssets":           [{"label": "Total Assets",             "current": round(total_assets_c,2),   "previous": round(total_assets_p,2)}],
            "nonCurrentAssets":      [{"label": "Non-Current Assets",       "current": round(non_curr_c,2),       "previous": round(non_curr_p,2)}],
            "currentAssets":         [{"label": "Current Assets",           "current": round(curr_c,2),           "previous": round(curr_p,2)}],
            "totalEquity":           [{"label": "Total Equity & Liabilities","current": round(total_eq_liab_c,2), "previous": round(total_eq_liab_p,2)}],
            "nonCurrentLiabilities": [{"label": "Non-Current Liabilities",  "current": round(ncl_c,2),            "previous": round(ncl_p,2)}],
            "currentLiabilities":    [{"label": "Current Liabilities",      "current": round(cl_c,2),             "previous": round(cl_p,2)}],
            "nonCurrentAssetsDetail": [
                row("Other Intangible assets"),
                row("SB Property, plant and equipment"),
                row("Right of Use Assets"),
                row("Non-current trade and other receivables"),
            ],
            "currentAssetsDetail": [
                row("Current trade and other receivables"),
                row("SB Cash and cash equivalents"),
                row("Current prepayments"),
                row("Current other assets - non-financial instruments"),
                row("Current income tax recoverable"),
            ],
            "equityDetail": [
                row("Equity holders of parent"),
            ],
            "currentLiabilitiesDetail": [
                row("Trade payables"),
                row("Current prepayments received"),
                row("Current other liabilities - non-financial instruments"),
                row("Current income tax payable"),
                row("Current lease liabilities (IFRS 16)"),
            ],
            "assetStructure": [
                {"label": "Non-Current", "current": round(non_curr_c,2), "previous": round(non_curr_p,2)},
                {"label": "Current",     "current": round(curr_c,2),     "previous": round(curr_p,2)},
            ],
            "currentAssetsBreakdown": [
                {"label": "Trade Receivables", "current": round(recv_c,2),    "previous": round(recv_p,2)},
                {"label": "Cash",              "current": round(cash_c,2),    "previous": round(cash_p,2)},
                {"label": "Prepayments",       "current": round(prep_c,2),    "previous": round(prep_p,2)},
                {"label": "Other",             "current": round(other_c,2),   "previous": round(other_p,2)},
                {"label": "Tax Recoverable",   "current": round(tax_rec_c,2), "previous": round(tax_rec_p,2)},
            ],
            "tradePosition": [
                {"label": "Trade Receivables", "current": round(recv_c,2), "previous": round(recv_p,2)},
                {"label": "Trade Payables",    "current": round(pay_c,2),  "previous": round(pay_p,2)},
            ],
        },
    }