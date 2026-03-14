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
   
    snapshot_month = active_months[-1]

    assets_curr = db.query(AssetLiability).filter(
        AssetLiability.year == year,
        AssetLiability.month == snapshot_month
    ).all()
    assets_prev = db.query(AssetLiability).filter(
        AssetLiability.year == year - 1,
        AssetLiability.month == snapshot_month
    ).all()

    def ss_assets(entries, subcategory):
        return sum(e.value or 0 for e in entries
                   if (e.subCategory or "").strip().lower() == subcategory.strip().lower())

    non_curr_assets_c = ss_assets(assets_curr, "SB Non-current Assets")
    non_curr_assets_p = ss_assets(assets_prev, "SB Non-current Assets")
    curr_assets_c     = ss_assets(assets_curr, "SB Current Assets")
    curr_assets_p     = ss_assets(assets_prev, "SB Current Assets")
    total_assets_c    = non_curr_assets_c + curr_assets_c
    total_assets_p    = non_curr_assets_p + curr_assets_p


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
            "roa": {
                "current":  round(retained_curr / total_assets_c * 100, 2) if total_assets_c else 0,
                "previous": round(retained_prev / total_assets_p * 100, 2) if total_assets_p else 0,},
            "roe": {
                "current":  round(retained_curr / non_curr_assets_c * 100, 2) if non_curr_assets_c else 0,
                "previous": round(retained_prev / non_curr_assets_p * 100, 2) if non_curr_assets_p else 0,},
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
FISCAL_PERIODS_LIQ = [
    "P1","P2","P3","P4","P5","P6",
    "P7","P8","P9","P10","P11","P12"
]
PERIOD_TO_MONTH_LIQ = {
    "P1":"October","P2":"November","P3":"December",
    "P4":"January","P5":"February","P6":"March",
    "P7":"April","P8":"May","P9":"June",
    "P10":"July","P11":"August","P12":"September"
}

OPENING_LABEL    = "Opening Cash Balance"
CLOSING_LABEL    = "Closing Cash Balance"
OPERATING_LABEL  = "Operating Cash Flow"
INVESTING_LABELS = ["Net Investments Cash Flow"]
FINANCING_LABELS = [
    "Lease & Asset Financing Repayments",
    "Adj. Financing Cash Flow",
    "Total change in Cash due to FX",
]
WATERFALL_ORDER = [
    "Opening Cash Balance",
    "Operating Cash Flow",
    "Net Investments Cash Flow",
    "Lease & Asset Financing Repayments",
    "Total change in Cash due to FX",
    "Adj. Financing Cash Flow",
    "Closing Cash Balance",
]
TOTAL_LABELS_LIQ = {"Opening Cash Balance", "Closing Cash Balance"}

CASH_LABEL_AL       = "SB Cash and cash equivalents"
CURRENT_LIAB_LABELS = [
    "Trade payables",
    "Current prepayments received",
    "Current other liabilities - non-financial instruments",
    "Current income tax payable",
]


def periods_up_to_liq(period: str):
    idx = FISCAL_PERIODS_LIQ.index(period) if period in FISCAL_PERIODS_LIQ else len(FISCAL_PERIODS_LIQ) - 1
    return FISCAL_PERIODS_LIQ[:idx + 1]


@router.get("/dashboard/liquidity")
def get_liquidity_dashboard(
    year:   int = 2025,
    period: str = "P12",
    db: Session = Depends(get_db),
):
    from collections import defaultdict
    from sqlalchemy import func

    active_periods = periods_up_to_liq(period)
    prev_year      = year - 1

    # ── Cash flow rows ────────────────────────────────────────────────────
    cf_curr = db.query(CashFlow).filter(
        CashFlow.year == year,
        CashFlow.period.in_(active_periods)
    ).all()

    cf_prev = db.query(CashFlow).filter(
        CashFlow.year == prev_year,
        CashFlow.period.in_(active_periods)
    ).all()

    # ── Monthly trend ─────────────────────────────────────────────────────
    monthly_trend = []
    for p in active_periods:
        rows_curr = [r for r in cf_curr if r.period == p]
        rows_prev = [r for r in cf_prev if r.period == p]
        op_curr   = sum(r.value for r in rows_curr if r.label == OPERATING_LABEL)
        op_prev   = sum(r.value for r in rows_prev if r.label == OPERATING_LABEL)
        inv_curr  = sum(r.value for r in rows_curr if r.label in INVESTING_LABELS)
        fin_curr  = sum(r.value for r in rows_curr if r.label in FINANCING_LABELS)
        net_curr  = op_curr + inv_curr + fin_curr
        monthly_trend.append({
            "month":     PERIOD_TO_MONTH_LIQ.get(p, p),
            "period":    p,
            "operating": round(op_curr,  2),
            "investing": round(inv_curr, 2),
            "financing": round(fin_curr, 2),
            "net":       round(net_curr, 2),
            "prev_op":   round(op_prev,  2),
        })

    # ── Cash balance evolution ────────────────────────────────────────────
    cash_balance = []
    for p in active_periods:
        rows    = [r for r in cf_curr if r.period == p]
        opening = sum(r.value for r in rows if r.label == OPENING_LABEL)
        closing = sum(r.value for r in rows if r.label == CLOSING_LABEL)
        cash_balance.append({
            "month":   PERIOD_TO_MONTH_LIQ.get(p, p),
            "opening": round(opening, 2),
            "closing": round(closing, 2),
        })

    # ── Cash vs Payables ──────────────────────────────────────────────────
    suppliers      = db.query(Client).filter(
        Client.year == year,
        Client.clientType == "supplier"
    ).all()
    total_payables = sum(s.amount for s in suppliers)
    n              = len(active_periods) or 1

    cash_vs_payables = []
    for p in active_periods:
        rows    = [r for r in cf_curr if r.period == p]
        closing = sum(r.value for r in rows if r.label == CLOSING_LABEL)
        cash_vs_payables.append({
            "month":    PERIOD_TO_MONTH_LIQ.get(p, p),
            "cash":     round(closing, 2),
            "payables": round(total_payables / n, 2),
        })

    # ── Supplier payments vs Cash Flow ────────────────────────────────────
    supplier_vs_cf = []
    for p in active_periods:
        rows = [r for r in cf_curr if r.period == p]
        op   = sum(r.value for r in rows if r.label == OPERATING_LABEL)
        fin  = sum(r.value for r in rows if r.label in FINANCING_LABELS)
        supplier_vs_cf.append({
            "month":             PERIOD_TO_MONTH_LIQ.get(p, p),
            "operatingCashFlow": round(op,      2),
            "supplierPayments":  round(abs(fin), 2),
        })

    # ── Waterfall ─────────────────────────────────────────────────────────
    label_totals = defaultdict(float)
    for r in cf_curr:
        label_totals[r.label] += r.value

    waterfall_data = [
        {
            "name":  label,
            "value": round(label_totals.get(label, 0), 2),
            "type":  "total" if label in TOTAL_LABELS_LIQ else "bar",
        }
        for label in WATERFALL_ORDER
    ]

    # ── KPIs ──────────────────────────────────────────────────────────────
    def get_al_by_label(yr, label):
        return db.query(func.sum(AssetLiability.value)).filter(
            AssetLiability.year == yr,
            AssetLiability.period.in_(active_periods),
            AssetLiability.label == label
        ).scalar() or 0

    def get_al_by_labels(yr, labels):
        return db.query(func.sum(AssetLiability.value)).filter(
            AssetLiability.year == yr,
            AssetLiability.period.in_(active_periods),
            AssetLiability.label.in_(labels)
        ).scalar() or 0

    cash_assets      = get_al_by_label(year,      CASH_LABEL_AL)
    prev_cash_assets = get_al_by_label(prev_year, CASH_LABEL_AL)
    curr_liab        = get_al_by_labels(year,      CURRENT_LIAB_LABELS)
    prev_curr_liab   = get_al_by_labels(prev_year, CURRENT_LIAB_LABELS)

    cash_ratio      = round(cash_assets / curr_liab,           4) if curr_liab      else 0
    prev_cash_ratio = round(prev_cash_assets / prev_curr_liab, 4) if prev_curr_liab else 0

    op_total       = sum(r.value for r in cf_curr if r.label == OPERATING_LABEL)
    inv_total      = sum(r.value for r in cf_curr if r.label in INVESTING_LABELS)
    prev_op_total  = sum(r.value for r in cf_prev if r.label == OPERATING_LABEL)
    prev_inv_total = sum(r.value for r in cf_prev if r.label in INVESTING_LABELS)

    opening_curr = sum(r.value for r in cf_curr if r.label == OPENING_LABEL)
    closing_curr = sum(r.value for r in cf_curr if r.label == CLOSING_LABEL)
    opening_prev = sum(r.value for r in cf_prev if r.label == OPENING_LABEL)
    closing_prev = sum(r.value for r in cf_prev if r.label == CLOSING_LABEL)

    kpis = {
        "cashRatio":    {"current": cash_ratio,                             "previous": prev_cash_ratio},
        "freeCashFlow": {"current": round(op_total + inv_total, 2),         "previous": round(prev_op_total + prev_inv_total, 2)},
        "closingCash":  {"current": round(closing_curr, 2),                 "previous": round(closing_prev, 2)},
        "openingCash":  {"current": round(opening_curr, 2),                 "previous": round(opening_prev, 2)},
    }

    return {
        "kpis":           kpis,
        "monthlyTrend":   monthly_trend,
        "cashBalance":    cash_balance,
        "cashVsPayables": cash_vs_payables,
        "supplierVsCF":   supplier_vs_cf,
        "waterfallData":  waterfall_data,
    }

FISCAL_MONTHS_DSO = [
    "October", "November", "December", "January", "February", "March",
    "April", "May", "June", "July", "August", "September"
]
PERIOD_TO_IDX_DSO = {f"P{i+1}": i for i in range(12)}


@router.get("/dashboard/dso-dpo")
def get_dso_dpo_dashboard(
    year:   int = 2025,
    period: str = "P12",
    db: Session = Depends(get_db),
):
    from sqlalchemy import func

    # Active months up to selected period
    idx            = PERIOD_TO_IDX_DSO.get(period, 11)
    active_months  = FISCAL_MONTHS_DSO[:idx + 1]
    prev_year      = year - 1

    # ── Fetch clients ─────────────────────────────────────────────────────
    customers = db.query(Client).filter(
        Client.year == year,
        Client.clientType.in_(["customer", "Customer"])
    ).all()

    suppliers = db.query(Client).filter(
        Client.year == year,
        Client.clientType.in_(["supplier", "Supplier"])
    ).all()

    # ── Revenue filtered by active months ─────────────────────────────────
    revenue = db.query(func.sum(RevenueExpense.value)).filter(
        RevenueExpense.year == year,
        RevenueExpense.label == "Revenue",
        RevenueExpense.month.in_(active_months)
    ).scalar() or 0

    prev_revenue = db.query(func.sum(RevenueExpense.value)).filter(
        RevenueExpense.year == prev_year,
        RevenueExpense.label == "Revenue",
        RevenueExpense.month.in_(active_months)
    ).scalar() or 0

    # ── Trade Receivables & Payables ──────────────────────────────────────
    trade_recv = db.query(func.sum(AssetLiability.value)).filter(
        AssetLiability.year == year,
        AssetLiability.month.in_(active_months),
        AssetLiability.label == "Current trade and other receivables"
    ).scalar() or 0

    trade_pay = db.query(func.sum(AssetLiability.value)).filter(
        AssetLiability.year == year,
        AssetLiability.month.in_(active_months),
        AssetLiability.label == "Trade payables"
    ).scalar() or 0

    prev_recv = db.query(func.sum(AssetLiability.value)).filter(
        AssetLiability.year == prev_year,
        AssetLiability.month.in_(active_months),
        AssetLiability.label == "Current trade and other receivables"
    ).scalar() or 0

    prev_pay = db.query(func.sum(AssetLiability.value)).filter(
        AssetLiability.year == prev_year,
        AssetLiability.month.in_(active_months),
        AssetLiability.label == "Trade payables"
    ).scalar() or 0

    # ── DSO / DPO ─────────────────────────────────────────────────────────
    days = len(active_months) * 30
    dso      = round((trade_recv / revenue) * days, 1) if revenue else 0
    dpo      = round((trade_pay  / revenue) * days, 1) if revenue else 0
    prev_dso = round((prev_recv  / prev_revenue) * days, 1) if prev_revenue else 0
    prev_dpo = round((prev_pay   / prev_revenue) * days, 1) if prev_revenue else 0

    # ── Aging buckets ─────────────────────────────────────────────────────
    aging_buckets = [
        "Not due", "0-30 days", "31-61 days",
        "61-90 days", "90-180 days", ">180 days"
    ]

    customer_aging = [
        {"bucket": b, "amount": round(sum(c.amount for c in customers if c.agingDays == b), 2)}
        for b in aging_buckets
    ]
    supplier_aging = [
        {"bucket": b, "amount": round(sum(s.amount for s in suppliers if s.agingDays == b), 2)}
        for b in aging_buckets
    ]

    # ── Top unpaid ────────────────────────────────────────────────────────
    def top_clients(clients, n):
        totals = {}
        for c in clients:
            totals[c.clientName] = totals.get(c.clientName, 0) + c.amount
        return sorted(
            [{"name": k, "amount": round(v, 2)} for k, v in totals.items()],
            key=lambda x: x["amount"], reverse=True
        )[:n]

    top_customers = top_clients(customers, 10)
    top_suppliers = top_clients(suppliers, 5)

    # ── Delay distribution histogram ──────────────────────────────────────
    customer_delay_dist = [
        {"bucket": b, "count": sum(1 for c in customers if c.agingDays == b)}
        for b in aging_buckets
    ]
    supplier_delay_dist = [
        {"bucket": b, "count": sum(1 for s in suppliers if s.agingDays == b)}
        for b in aging_buckets
    ]

    # ── Overdue totals ────────────────────────────────────────────────────
    total_customer_overdue = round(sum(c.amount for c in customers if c.agingDays != "Not due"), 2)
    total_supplier_overdue = round(sum(s.amount for s in suppliers if s.agingDays != "Not due"), 2)

    return {
        "kpis": {
            "dso":             {"current": dso,                    "previous": prev_dso},
            "dpo":             {"current": dpo,                    "previous": prev_dpo},
            "customerOverdue": {"current": total_customer_overdue, "previous": 0},
            "supplierOverdue": {"current": total_supplier_overdue, "previous": 0},
        },
        "customerAging":     customer_aging,
        "supplierAging":     supplier_aging,
        "topCustomers":      top_customers,
        "topSuppliers":      top_suppliers,
        "customerDelayDist": customer_delay_dist,
        "supplierDelayDist": supplier_delay_dist,
    }