from collections import defaultdict
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session
from database.db import get_db
from models.data_models import RevenueExpense, AssetLiability, CashFlow, Client

router = APIRouter(tags=["data"])

# Fiscal year runs October to September
FISCAL_MONTHS_IN_ORDER = [
    "October", "November", "December", "January", "February", "March",
    "April", "May", "June", "July", "August", "September"
]

@router.get("/dashboard/profitability")
def get_profitability_dashboard(
    year: int,
    period: str = "P12",
    db: Session = Depends(get_db),
):
    # Convert P6 to 6
    try:
        period_index = int(period.replace("P", ""))
    except ValueError:
        period_index = 12

    active_months = FISCAL_MONTHS_IN_ORDER[:period_index]

    # Fetch actual and budget data for current and previous year
    current  = db.query(RevenueExpense).filter(
        RevenueExpense.year == year,
        RevenueExpense.month.in_(active_months),
        RevenueExpense.type == "Actual"
    ).all()
    previous = db.query(RevenueExpense).filter(
        RevenueExpense.year == year - 1,
        RevenueExpense.month.in_(active_months),
        RevenueExpense.type == "Actual"
    ).all()
    budget = db.query(RevenueExpense).filter(
        RevenueExpense.year == year,
        RevenueExpense.month.in_(active_months),
        RevenueExpense.type == "Budget"
    ).all()

    def sum_by_label(entries, label):
        return sum(e.value or 0 for e in entries if e.label == label)

    def sum_by_category(entries, category):
        # Only sums rows that are Other Overheads with a matching category
        return sum(e.value or 0 for e in entries
               if e.label == "Other Overheads" and e.category == category)

    # Balance sheet snapshot uses the last active month
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

    # Core P&L values for both years
    rev_curr      = sum_by_label(current,  "Revenue")
    rev_prev      = sum_by_label(previous, "Revenue")
    ebit_curr     = sum_by_label(current,  "EBIT")
    ebit_prev     = sum_by_label(previous, "EBIT")
    retained_curr = sum_by_label(current,  "Retained Profit/(loss)")
    retained_prev = sum_by_label(previous, "Retained Profit/(loss)")
    staff_cur     = sum_by_label(current,  "Staff Costs")
    staff_prev    = sum_by_label(previous, "Staff Costs")
    equity_curr = ss_assets(assets_curr, "Equity holders of parent")  
    equity_prev = ss_assets(assets_prev, "Equity holders of parent")

    # Margin calculations; guard against zero revenue
    gross_margin_curr = round((rev_curr - staff_cur)  / rev_curr * 100, 2) if rev_curr else 0
    gross_margin_prev = round((rev_prev - staff_prev) / rev_prev * 100, 2) if rev_prev else 0
    ebit_margin_curr  = round(ebit_curr     / rev_curr * 100, 2) if rev_curr else 0
    ebit_margin_prev  = round(ebit_prev     / rev_prev * 100, 2) if rev_prev else 0
    net_margin_curr   = round(retained_curr / rev_curr * 100, 2) if rev_curr else 0
    net_margin_prev   = round(retained_prev / rev_prev * 100, 2) if rev_prev else 0

    # P&L table rows
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
            "budget":   round(sum_by_label(budget,   lbl), 2),
        }
        for lbl in pl_labels
    ]

    # Overhead breakdown by category
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

    # Monthly revenue, expenses, EBIT and budget per active month
    monthly_trend = []
    for m in active_months:
        rev = sum(e.value for e in current  if e.label == "Revenue" and e.month == m)
        exp = sum(e.value for e in current  if e.label not in ("Revenue",) and e.month == m)
        ebt = sum(e.value for e in current  if e.label == "EBIT"    and e.month == m)
        bud = sum(e.value for e in budget   if e.label == "Revenue" and e.month == m)
        monthly_trend.append({
            "month":    m[:3],
            "revenue":  round(rev, 2),
            "expenses": round(exp, 2),
            "ebit":     round(ebt, 2),
            "retained": round(sum(e.value for e in current
                                  if e.label == "Retained Profit/(loss)" and e.month == m), 2),
            "budget":   round(bud, 2),
        })

    # Funnel uses absolute values so negative margins display correctly
    funnel = [
        {"name": "Gross Profit Margin", "value": abs(gross_margin_curr)},
        {"name": "EBIT Margin",         "value": abs(ebit_margin_curr)},
        {"name": "Net Profit Margin",   "value": abs(net_margin_curr)},
    ]

    expenses_breakdown = [
        {"name": "Staff Costs",     "value": round(sum_by_label(current, "Staff Costs"), 2)},
        {"name": "Overhead Depr.",  "value": round(sum_by_label(current, "Overhead Depreciation"), 2)},
        {"name": "Other Overheads", "value": round(sum_by_label(current, "Other Overheads"), 2)},
        {"name": "Misc. Overheads", "value": round(sum_by_label(current, "Total Miscellaneous Overheads"), 2)},
        {"name": "Interest",        "value": round(sum_by_label(current, "Interest"), 2)},
    ]
    # Remove zero-value entries to keep charts clean
    expenses_breakdown = [e for e in expenses_breakdown if e["value"] != 0]

    return {
        "kpis": {
            "grossMargin":     {"current": gross_margin_curr, "previous": gross_margin_prev},
            "ebitMargin":      {"current": ebit_margin_curr,  "previous": ebit_margin_prev},
            "netProfitMargin": {"current": net_margin_curr,   "previous": net_margin_prev},
            "roa": {
                "current":  round(retained_curr / total_assets_c * 100, 2) if total_assets_c else 0,
                "previous": round(retained_prev / total_assets_p * 100, 2) if total_assets_p else 0,
            },
            "roe": {
                "current":  round(retained_curr / equity_curr * 100, 2) if equity_curr else 0,
                "previous": round(retained_prev / equity_prev * 100, 2) if equity_prev else 0,
            },
            "totalRevenue": {"current": round(rev_curr, 2), "previous": round(rev_prev, 2)},
        },
        "plSummary":         pl_summary,
        "overheadsDetail":   overheads_detail,
        "monthlyTrend":      monthly_trend,
        "funnel":            funnel,
        "expensesBreakdown": expenses_breakdown,
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

    # Match by label (exact row)
    def sl(entries, label):
        return sum(e.value or 0 for e in entries
                   if (e.label or "").strip().lower() == label.strip().lower())

    # Match by subCategory (group of rows)
    def ss(entries, subcategory):
        return sum(e.value or 0 for e in entries
                   if (e.subCategory or "").strip().lower() == subcategory.strip().lower())

    non_curr_c = ss(current,  "SB Non-current Assets")
    non_curr_p = ss(previous, "SB Non-current Assets")
    curr_c     = ss(current,  "SB Current Assets")
    curr_p     = ss(previous, "SB Current Assets")

    total_assets_c = non_curr_c + curr_c
    total_assets_p = non_curr_p + curr_p

    equity_c = sl(current,  "Equity holders of parent")
    equity_p = sl(previous, "Equity holders of parent")

    # Uses sl() because this entry is stored as a label, not a subCategory
    ncl_c = sl(current,  "SB Non-current provisions and liabilities")
    ncl_p = sl(previous, "SB Non-current provisions and liabilities")

    cl_c = ss(current,  "SB Current Provisions And Liabilities")
    cl_p = ss(previous, "SB Current Provisions And Liabilities")

    total_eq_liab_c = equity_c + ncl_c + cl_c
    total_eq_liab_p = equity_p + ncl_p + cl_p

    # Individual line items for detailed charts
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

    # KPI calculations protected against division by zero
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

    # Helper to build a current vs previous row by label
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
            "cash":           {"current": round(cash_c, 2), "previous": round(cash_p, 2)},
        },
        "charts": {
            "totalAssets":           [{"label": "Total Assets",               "current": round(total_assets_c, 2),  "previous": round(total_assets_p, 2)}],
            "nonCurrentAssets":      [{"label": "Non-Current Assets",         "current": round(non_curr_c, 2),      "previous": round(non_curr_p, 2)}],
            "currentAssets":         [{"label": "Current Assets",             "current": round(curr_c, 2),          "previous": round(curr_p, 2)}],
            "totalEquity":           [{"label": "Total Equity & Liabilities", "current": round(total_eq_liab_c, 2), "previous": round(total_eq_liab_p, 2)}],
            "nonCurrentLiabilities": [{"label": "Non-Current Liabilities",    "current": round(ncl_c, 2),           "previous": round(ncl_p, 2)}],
            "currentLiabilities":    [{"label": "Current Liabilities",        "current": round(cl_c, 2),            "previous": round(cl_p, 2)}],
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
            # Pie chart data uses name/value format
            "assetStructure": [
                {"name": "Non-Current Assets", "value": round(non_curr_c, 2)},
                {"name": "Current Assets",     "value": round(curr_c, 2)},
            ],
            "liabilityStructure": [
                {"name": "Non-Current Liab.", "value": round(ncl_c, 2)},
                {"name": "Current Liab.",     "value": round(cl_c, 2)},
            ],
            "assetsVsLiabilities": [
                {"label": "Total",       "assets": round(total_assets_c, 2), "liabilities": round(total_liab_c, 2)},
                {"label": "Non-Current", "assets": round(non_curr_c, 2),     "liabilities": round(ncl_c, 2)},
                {"label": "Current",     "assets": round(curr_c, 2),         "liabilities": round(cl_c, 2)},
            ],
            "currentAssetsBreakdown": [
                {"label": "Trade Receivables", "current": round(recv_c, 2),    "previous": round(recv_p, 2)},
                {"label": "Cash",              "current": round(cash_c, 2),    "previous": round(cash_p, 2)},
                {"label": "Prepayments",       "current": round(prep_c, 2),    "previous": round(prep_p, 2)},
                {"label": "Other",             "current": round(other_c, 2),   "previous": round(other_p, 2)},
                {"label": "Tax Recoverable",   "current": round(tax_rec_c, 2), "previous": round(tax_rec_p, 2)},
            ],
            "tradePosition": [
                {"label": "Trade Receivables", "current": round(recv_c, 2), "previous": round(recv_p, 2)},
                {"label": "Trade Payables",    "current": round(pay_c, 2),  "previous": round(pay_p, 2)},
            ],
        },
    }


# Fiscal year runs October (P1) to September (P12)
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
# Order determines left to right display in the waterfall chart
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
    # Returns all periods from P1 up to and including the selected period
    idx = FISCAL_PERIODS_LIQ.index(period) if period in FISCAL_PERIODS_LIQ else len(FISCAL_PERIODS_LIQ) - 1
    return FISCAL_PERIODS_LIQ[:idx + 1]


@router.get("/dashboard/liquidity")
def get_liquidity_dashboard(
    year:         int = 2025,
    period:       str = "P12",
    compare_year: int = None,
    db: Session = Depends(get_db),
):
    active_periods = periods_up_to_liq(period)
    prev_year      = compare_year if compare_year is not None else year - 1

    # Fetch cash flow rows for current and comparison year
    cf_curr = db.query(CashFlow).filter(
        CashFlow.year == year,
        CashFlow.period.in_(active_periods)
    ).all()
    cf_prev = db.query(CashFlow).filter(
        CashFlow.year == prev_year,
        CashFlow.period.in_(active_periods)
    ).all()

    # Monthly breakdown of operating, investing and financing flows
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

    # Opening and closing cash per period
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

    suppliers      = db.query(Client).filter(
        Client.year == year,
        Client.clientType == "supplier"
    ).all()
    total_payables = sum(s.amount for s in suppliers)
    n              = len(active_periods) or 1

    # Spread total payables evenly across periods for comparison
    cash_vs_payables = []
    for p in active_periods:
        rows    = [r for r in cf_curr if r.period == p]
        closing = sum(r.value for r in rows if r.label == CLOSING_LABEL)
        cash_vs_payables.append({
            "month":    PERIOD_TO_MONTH_LIQ.get(p, p),
            "cash":     round(closing, 2),
            "payables": round(total_payables / n, 2),
        })


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


    label_totals      = defaultdict(float)
    label_totals_prev = defaultdict(float)
    for r in cf_curr:
        label_totals[r.label] += r.value
    for r in cf_prev:
        label_totals_prev[r.label] += r.value

    waterfall_data = [
        {
            "name":  label,
            "value": round(label_totals.get(label, 0), 2),
            "prev":  round(label_totals_prev.get(label, 0), 2),
            "type":  "total" if label in TOTAL_LABELS_LIQ else "bar",
        }
        for label in WATERFALL_ORDER
    ]

    # Query asset/liability totals across active periods
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

    # Cash ratio = cash / current liabilities
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
        "cashRatio":    {"current": cash_ratio,                     "previous": prev_cash_ratio},
        "freeCashFlow": {"current": round(op_total + inv_total, 2), "previous": round(prev_op_total + prev_inv_total, 2)},
        "closingCash":  {"current": round(closing_curr, 2),         "previous": round(closing_prev, 2)},
        "openingCash":  {"current": round(opening_curr, 2),         "previous": round(opening_prev, 2)},
    }

    return {
        "kpis":           kpis,
        "monthlyTrend":   monthly_trend,
        "cashBalance":    cash_balance,
        "cashVsPayables": cash_vs_payables,
        "supplierVsCF":   supplier_vs_cf,
        "waterfallData":  waterfall_data,
    }


# Fiscal year runs October (P1) to September (P12)
FISCAL_MONTHS_DSO = [
    "October", "November", "December", "January", "February", "March",
    "April", "May", "June", "July", "August", "September"
]
PERIOD_TO_IDX_DSO = {f"P{i+1}": i for i in range(12)}


@router.get("/dashboard/dso-dpo")
def get_dso_dpo_dashboard(
    year: int = 2025,
    period: str = "P12",
    db: Session = Depends(get_db),
):
    from sqlalchemy import func

    idx           = PERIOD_TO_IDX_DSO.get(period, 11)
    active_months = FISCAL_MONTHS_DSO[:idx + 1]
    prev_year     = year - 1
    prev2_year    = year - 2


    def get_clients(yr, ctype):
        return db.query(Client).filter(
            Client.year == yr,
            Client.clientType.in_([ctype, ctype.capitalize()])
        ).all()

    customers_curr  = get_clients(year,       "customer")
    suppliers_curr  = get_clients(year,       "supplier")
    suppliers_prev  = get_clients(prev_year,  "supplier")
    suppliers_prev2 = get_clients(prev2_year, "supplier")

    def get_revenue(yr):
        return db.query(func.sum(RevenueExpense.value)).filter(
            RevenueExpense.year == yr,
            RevenueExpense.label == "Revenue",
            RevenueExpense.month.in_(active_months),
            RevenueExpense.type == "Actual"
        ).scalar() or 0

    revenue      = get_revenue(year)
    prev_revenue = get_revenue(prev_year)

    # Single month snapshot for balance sheet values
    snapshot_month = active_months[-1]

    def get_al_snapshot(yr, label):
        return db.query(func.sum(AssetLiability.value)).filter(
            AssetLiability.year == yr,
            AssetLiability.month == snapshot_month,
            AssetLiability.label == label
        ).scalar() or 0

    def get_overheads(yr):
        return db.query(func.sum(RevenueExpense.value)).filter(
            RevenueExpense.year == yr,
            RevenueExpense.label == "Other Overheads",
            RevenueExpense.month.in_(active_months),
            RevenueExpense.type == "Actual"
        ).scalar() or 0

    trade_recv     = get_al_snapshot(year,      "Current trade and other receivables")
    trade_pay      = get_al_snapshot(year,      "Trade payables")
    prev_recv      = get_al_snapshot(prev_year, "Current trade and other receivables")
    prev_pay       = get_al_snapshot(prev_year, "Trade payables")
    overheads      = get_overheads(year)
    prev_overheads = get_overheads(prev_year)

    # 30 days per month approximation for DSO/DPO
    days     = len(active_months) * 30
    dso      = round((trade_recv / revenue)        * days, 1) if revenue       else 0
    dpo      = round((trade_pay  / overheads)      * days, 1) if overheads     else 0
    prev_dso = round((prev_recv  / prev_revenue)   * days, 1) if prev_revenue  else 0
    prev_dpo = round((prev_pay   / prev_overheads) * days, 1) if prev_overheads else 0

    aging_buckets = [
        "Not Due", "0-30 Days", "31-61 Days",
        "61-90 Days", "90-180 Days", ">180 Days"
    ]

    # Amount owed per aging bucket for current year customers
    customer_aging = [
        {"bucket": b, "amount": round(sum(c.amount for c in customers_curr if c.agingDays == b), 2)}
        for b in aging_buckets
    ]

    # Supplier aging across three years for year-over-year comparison
    supplier_aging_by_year = []
    for bucket in aging_buckets:
        curr  = sum(s.amount for s in suppliers_curr  if s.agingDays == bucket)
        prev  = sum(s.amount for s in suppliers_prev  if s.agingDays == bucket)
        prev2 = sum(s.amount for s in suppliers_prev2 if s.agingDays == bucket)
        if curr > 0 or prev > 0 or prev2 > 0:
            supplier_aging_by_year.append({
                "bucket":        bucket,
                str(year):       round(curr,  2),
                str(prev_year):  round(prev,  2),
                str(prev2_year): round(prev2, 2),
            })

    # Current year only, used for the supplier aging pie chart
    supplier_aging = [
        {"bucket": b, "amount": round(sum(s.amount for s in suppliers_curr if s.agingDays == b), 2)}
        for b in aging_buckets
    ]

    # Returns top N clients sorted by total amount descending
    def top_clients(clients, n):
        totals = {}
        for c in clients:
            totals[c.clientName] = totals.get(c.clientName, 0) + c.amount
        return sorted(
            [{"name": k, "amount": round(v, 2)} for k, v in totals.items()],
            key=lambda x: x["amount"], reverse=True
        )[:n]

    top_customers = top_clients(customers_curr, 10)
    top_suppliers = top_clients(suppliers_curr, 5)

    # Count of clients per aging bucket 
    customer_delay_dist = [
        {"bucket": b, "count": sum(1 for c in customers_curr if c.agingDays == b)}
        for b in aging_buckets
    ]
    supplier_delay_dist = [
        {"bucket": b, "count": sum(1 for s in suppliers_curr if s.agingDays == b)}
        for b in aging_buckets
    ]

    # Per-supplier aging breakdown 
    supplier_details = {}
    for s in suppliers_curr:
        name   = s.clientName
        bucket = s.agingDays or "Not Due"
        if name not in supplier_details:
            supplier_details[name] = {}
        supplier_details[name][bucket] = supplier_details[name].get(bucket, 0) + s.amount

    supplier_aging_detail = {
        name: [
            {"bucket": bucket, "amount": round(amount, 2)}
            for bucket, amount in buckets.items()
            if amount > 0
        ]
        for name, buckets in supplier_details.items()
    }

    # Supplier grouped by expense category
    expense_cat_totals = {}
    for s in suppliers_curr:
        cat = s.expenseCategory or "Uncategorized"
        expense_cat_totals[cat] = expense_cat_totals.get(cat, 0) + s.amount

    supplier_expense_categories = [
        {"category": cat, "amount": round(amt, 2)}
        for cat, amt in sorted(expense_cat_totals.items(), key=lambda x: x[1], reverse=True)
        if amt > 0
    ]

    total_clients   = len(customers_curr) + len(suppliers_curr)
    total_customers = len(customers_curr)
    total_suppliers = len(suppliers_curr)

    # Overdue = anything not in "Not due" bucket
    total_customer_overdue = round(sum(c.amount for c in customers_curr if c.agingDays != "Not due"), 2)
    total_supplier_overdue = round(sum(s.amount for s in suppliers_curr if s.agingDays != "Not due"), 2)

    return {
        "kpis": {
            "dso":             {"current": dso,                    "previous": prev_dso},
            "dpo":             {"current": dpo,                    "previous": prev_dpo},
            "customerOverdue": {"current": total_customer_overdue, "previous": 0},
            "supplierOverdue": {"current": total_supplier_overdue, "previous": 0},
        },
        "counts": {
            "totalClients":   total_clients,
            "totalCustomers": total_customers,
            "totalSuppliers": total_suppliers,
        },
        "customerAging":       customer_aging,
        "supplierAging":       supplier_aging,
        "supplierAgingByYear": supplier_aging_by_year,
        "supplierAgingDetail": supplier_aging_detail,
        "topCustomers":        top_customers,
        "topSuppliers":        top_suppliers,
        "customerDelayDist":         customer_delay_dist,
        "supplierDelayDist":         supplier_delay_dist,
        "supplierExpenseCategories": supplier_expense_categories,
        "years": {
            "current": year,
            "prev":    prev_year,
            "prev2":   prev2_year,
        },
    }