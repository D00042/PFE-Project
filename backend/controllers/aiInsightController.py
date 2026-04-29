from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.db import get_db
from models.ai_insight import AIInsight
from models.data_models import RevenueExpense, AssetLiability, CashFlow, Client
from core.dependencies import get_current_user, require_roles
from models.user import User
from pydantic import BaseModel
from typing import Optional
import cohere
import os
import json
from dotenv import load_dotenv
from sqlalchemy import func as sqlfunc

load_dotenv()

router = APIRouter(prefix="/ai-insights", tags=["ai-insights"])

COHERE_API_KEY = os.getenv("COHERE_API_KEY")

# loaded once at startup, injected into every prompt to help identify financial risks
FINANCIAL_STANDARDS = ""
try:
    standards_path = os.path.join(
        os.path.dirname(__file__), "documents", "financial_standards.txt"
    )
    with open(standards_path, "r", encoding="utf-8") as f:
        FINANCIAL_STANDARDS = f.read()
    print("[AI] Financial standards loaded.")
except FileNotFoundError:
    print("[AI WARNING] financial_standards.txt not found.")



FISCAL_PERIODS = [
    "P1","P2","P3","P4","P5","P6",
    "P7","P8","P9","P10","P11","P12"
]

FISCAL_MONTHS_ORDER = [
    "October","November","December","January","February","March",
    "April","May","June","July","August","September"
]

# returns the next fiscal period, wraps from P12 back to P1
def next_period(period: str) -> str:
    try:
        idx = FISCAL_PERIODS.index(period)
        return FISCAL_PERIODS[(idx + 1) % len(FISCAL_PERIODS)]
    except ValueError:
        return "P1"

# returns the list of months active up to and including the selected period
def get_active_months(period: str) -> list:
    try:
        idx = FISCAL_PERIODS.index(period)
    except ValueError:
        idx = 11
    return FISCAL_MONTHS_ORDER[:idx + 1]

# queries revenue_expenses for the selected year and period for profitability data
def get_profitability_from_db(year: int, period: str, db: Session) -> dict:
    active_months = get_active_months(period)

    current  = db.query(RevenueExpense).filter(
        RevenueExpense.year == year,
        RevenueExpense.month.in_(active_months)
    ).all()

    previous = db.query(RevenueExpense).filter(
        RevenueExpense.year == year - 1,
        RevenueExpense.month.in_(active_months)
    ).all()
    budget = db.query(RevenueExpense).filter(
        RevenueExpense.year == year,
        RevenueExpense.month.in_(active_months),
        RevenueExpense.type == "Budget"
    ).all()

    

    def sum_label(entries, label):
        return round(sum(e.value or 0 for e in entries if e.label == label), 2)

    def sum_category(entries, category):
        return round(sum(
            e.value or 0 for e in entries
            if e.label == "Other Overheads" and e.category == category
        ), 2)

    pl_labels = [
        "Revenue", "Staff Costs", "Overhead Depreciation",
        "Other Overheads", "Total Miscellaneous Overheads",
        "EBIT", "Interest", "Retained Profit/(loss)"
    ]

    pl = []
    for lbl in pl_labels:
        curr_val = sum_label(current, lbl)
        prev_val = sum_label(previous, lbl)
        change   = round(curr_val - prev_val, 2)
        pl.append({
            "label":     lbl,
            "current":   curr_val,
            "previous":  prev_val,
            "change":    change,
            "direction": "up" if change >= 0 else "down"
        })

    overhead_cats = [
        "Property Costs", "Communication Costs", "Travel And Entertainment",
        "Office Costs", "Computer Costs", "Professional Fees",
    ]
    overheads = []
    for cat in overhead_cats:
        curr_val = sum_category(current, cat)
        prev_val = sum_category(previous, cat)
        if curr_val > 0 or prev_val > 0:
            overheads.append({
                "category": cat,
                "current":  curr_val,
                "previous": prev_val,
                "change":   round(curr_val - prev_val, 2)
            })

    rev_curr   = sum_label(current,  "Revenue")
    rev_prev   = sum_label(previous, "Revenue")
    ebit_curr  = sum_label(current,  "EBIT")
    ret_curr   = sum_label(current,  "Retained Profit/(loss)")
    ret_prev   = sum_label(previous, "Retained Profit/(loss)")
    staff_curr = sum_label(current,  "Staff Costs")

    budget_revenue = sum_label(budget, "Revenue")
    budget_ebit    = sum_label(budget, "EBIT")

    gross_margin = round((rev_curr - staff_curr) / rev_curr * 100, 2) if rev_curr else 0
    ebit_margin  = round(ebit_curr / rev_curr * 100, 2) if rev_curr else 0
    net_margin   = round(ret_curr  / rev_curr * 100, 2) if rev_curr else 0

    monthly = []
    for m in active_months:
        rev = sum(e.value for e in current if e.label == "Revenue" and e.month == m)
        exp = sum(e.value for e in current if e.label not in ("Revenue",) and e.month == m)
        ebt = sum(e.value for e in current if e.label == "EBIT" and e.month == m)
        monthly.append({
            "month":    m[:3],
            "revenue":  round(rev, 2),
            "expenses": round(exp, 2),
            "ebit":     round(ebt, 2),
        })

    return {
        "pl":            pl,
        "overheads":     overheads,
        "gross_margin":  gross_margin,
        "ebit_margin":   ebit_margin,
        "net_margin":    net_margin,
        "revenue_curr":  rev_curr,
        "revenue_prev":  rev_prev,
        "retained_curr": ret_curr,
        "retained_prev": ret_prev,
        "monthly":       monthly,
        "active_months": active_months,
        "budget_revenue": budget_revenue,
        "budget_ebit":    budget_ebit,
    }

# queries cash_flows and asset_liabilities for liquidity data
def get_liquidity_from_db(year: int, period: str, db: Session) -> dict:
    FISCAL_PERIODS_LIQ = [
        "P1","P2","P3","P4","P5","P6","P7","P8","P9","P10","P11","P12"
    ]
    PERIOD_TO_MONTH_LIQ = {
        "P1":"October","P2":"November","P3":"December","P4":"January",
        "P5":"February","P6":"March","P7":"April","P8":"May",
        "P9":"June","P10":"July","P11":"August","P12":"September",
    }
    idx            = FISCAL_PERIODS_LIQ.index(period) if period in FISCAL_PERIODS_LIQ else 11
    active_periods = FISCAL_PERIODS_LIQ[:idx + 1]
    prev_year      = year - 1

    cf_curr = db.query(CashFlow).filter(
        CashFlow.year == year, CashFlow.period.in_(active_periods)
    ).all()
    cf_prev = db.query(CashFlow).filter(
        CashFlow.year == prev_year, CashFlow.period.in_(active_periods)
    ).all()

    def sum_label(rows, label):
        return round(sum(r.value for r in rows if r.label == label), 2)

    OPERATING_LABEL  = "Operating Cash Flow"
    CLOSING_LABEL    = "Closing Cash Balance"
    OPENING_LABEL    = "Opening Cash Balance"
    INVESTING_LABELS = ["Net Investments Cash Flow"]
    FINANCING_LABELS = [
        "Lease & Asset Financing Repayments",
        "Adj. Financing Cash Flow",
        "Total change in Cash due to FX",
    ]

    op_curr    = sum_label(cf_curr, OPERATING_LABEL)
    op_prev    = sum_label(cf_prev, OPERATING_LABEL)
    inv_curr   = sum(sum_label(cf_curr, l) for l in INVESTING_LABELS)
    fin_curr   = sum(sum_label(cf_curr, l) for l in FINANCING_LABELS)
    closing_c  = sum_label(cf_curr, CLOSING_LABEL)
    closing_p  = sum_label(cf_prev, CLOSING_LABEL)
    opening_c  = sum_label(cf_curr, OPENING_LABEL)
    opening_p  = sum_label(cf_prev, OPENING_LABEL)
    free_cf    = round(op_curr + inv_curr, 2)

   
    CURRENT_LIAB_LABELS = [
        "Trade payables", "Current prepayments received",
        "Current other liabilities - non-financial instruments",
        "Current income tax payable",
    ]
    cash_al = db.query(sqlfunc.sum(AssetLiability.value)).filter(
        AssetLiability.year == year, AssetLiability.period.in_(active_periods),
        AssetLiability.label == "SB Cash and cash equivalents"
    ).scalar() or 0
    curr_liab = db.query(sqlfunc.sum(AssetLiability.value)).filter(
        AssetLiability.year == year, AssetLiability.period.in_(active_periods),
        AssetLiability.label.in_(CURRENT_LIAB_LABELS)
    ).scalar() or 0
    cash_ratio = round(cash_al / curr_liab, 4) if curr_liab else 0

    monthly = []
    for p in active_periods:
        rows = [r for r in cf_curr if r.period == p]
        op   = sum(r.value for r in rows if r.label == OPERATING_LABEL)
        inv  = sum(r.value for r in rows if r.label in INVESTING_LABELS)
        fin  = sum(r.value for r in rows if r.label in FINANCING_LABELS)
        monthly.append({
            "period": p,
            "month":  PERIOD_TO_MONTH_LIQ.get(p, p),
            "operating": round(op,  2),
            "investing": round(inv, 2),
            "financing": round(fin, 2),
            "net":       round(op + inv + fin, 2),
        })

    return {
        "operating_cf": op_curr, "operating_cf_prev": op_prev,
        "investing_cf": inv_curr, "financing_cf": fin_curr,
        "free_cf": free_cf,
        "closing_cash": closing_c, "closing_cash_prev": closing_p,
        "opening_cash": opening_c, "opening_cash_prev": opening_p,
        "cash_ratio": cash_ratio,
        "monthly": monthly,
        "active_periods": active_periods,
        "prev_year": prev_year,
    }

# queries clients and asset_liabilities for dso/dpo data
def get_dso_dpo_from_db(year: int, period: str, db: Session) -> dict:
    active_months = get_active_months(period)
    prev_year     = year - 1

    def get_clients(yr, ctype):
        return db.query(Client).filter(
            Client.year == yr,
            Client.clientType.in_([ctype, ctype.capitalize()])
        ).all()

    customers_curr = get_clients(year,      "customer")
    customers_prev = get_clients(prev_year, "customer")
    suppliers_curr = get_clients(year,      "supplier")
    suppliers_prev = get_clients(prev_year, "supplier")

    def get_revenue(yr):
        return db.query(sqlfunc.sum(RevenueExpense.value)).filter(
            RevenueExpense.year == yr,
            RevenueExpense.label == "Revenue",
            RevenueExpense.month.in_(active_months)
        ).scalar() or 0

    def get_al(yr, label):
        return db.query(sqlfunc.sum(AssetLiability.value)).filter(
            AssetLiability.year == yr,
            AssetLiability.month.in_(active_months),
            AssetLiability.label == label
        ).scalar() or 0

    revenue      = get_revenue(year)
    prev_revenue = get_revenue(prev_year)
    days         = len(active_months) * 30

    trade_recv = get_al(year,      "Current trade and other receivables")
    trade_pay  = get_al(year,      "Trade payables")
    prev_recv  = get_al(prev_year, "Current trade and other receivables")
    prev_pay   = get_al(prev_year, "Trade payables")

    dso      = round((trade_recv / revenue)      * days, 1) if revenue      else 0
    dpo      = round((trade_pay  / revenue)      * days, 1) if revenue      else 0
    prev_dso = round((prev_recv  / prev_revenue) * days, 1) if prev_revenue else 0
    prev_dpo = round((prev_pay   / prev_revenue) * days, 1) if prev_revenue else 0

    aging_buckets = ["Not due", "0-30 days", "31-61 days", "61-90 days", "90-180 days", ">180 days"]

    cust_aging = [
        {"bucket": b, "amount": round(sum(c.amount for c in customers_curr if c.agingDays == b), 2)}
        for b in aging_buckets
    ]
    supp_aging = [
        {"bucket": b, "amount": round(sum(s.amount for s in suppliers_curr if s.agingDays == b), 2)}
        for b in aging_buckets
    ]

    cust_total        = round(sum(c.amount for c in customers_curr), 2)
    cust_total_prev   = round(sum(c.amount for c in customers_prev), 2)
    cust_overdue      = round(sum(c.amount for c in customers_curr if c.agingDays != "Not due"), 2)
    supp_total        = round(sum(s.amount for s in suppliers_curr), 2)
    supp_total_prev   = round(sum(s.amount for s in suppliers_prev), 2)
    supp_overdue      = round(sum(s.amount for s in suppliers_curr if s.agingDays != "Not due"), 2)

    return {
        "dso": dso, "prev_dso": prev_dso,
        "dpo": dpo, "prev_dpo": prev_dpo,
        "revenue": revenue, "prev_revenue": prev_revenue,
        "trade_recv": trade_recv, "trade_pay": trade_pay,
        "cust_total": cust_total, "cust_total_prev": cust_total_prev,
        "cust_overdue": cust_overdue,
        "supp_total": supp_total, "supp_total_prev": supp_total_prev,
        "supp_overdue": supp_overdue,
        "cust_aging": cust_aging, "supp_aging": supp_aging,
        "active_months": active_months,
    }

# queries asset_liabilities for balance sheet data
def get_balance_sheet_from_db(year: int, period: str, db: Session) -> dict:
    try:
        period_index = int(period.replace("P", "")) - 1
    except ValueError:
        period_index = 11

    fiscal_months = [
        "October","November","December","January","February","March",
        "April","May","June","July","August","September"
    ]
    snapshot_month  = fiscal_months[period_index]
    prev_month      = snapshot_month

    def q(yr, mth):
        return db.query(AssetLiability).filter(
            AssetLiability.year == yr,
            AssetLiability.month == mth
        ).all()

    current  = q(year,     snapshot_month)
    previous = q(year - 1, prev_month)

    def sl(entries, label):
        return round(sum(e.value or 0 for e in entries
                         if (e.label or "").strip().lower() == label.strip().lower()), 2)

    def ss(entries, subcategory):
        return round(sum(e.value or 0 for e in entries
                         if (e.subCategory or "").strip().lower() == subcategory.strip().lower()), 2)

    non_curr_c  = ss(current,  "SB Non-current Assets")
    non_curr_p  = ss(previous, "SB Non-current Assets")
    curr_c      = ss(current,  "SB Current Assets")
    curr_p      = ss(previous, "SB Current Assets")
    total_c     = non_curr_c + curr_c
    total_p     = non_curr_p + curr_p
    equity_c    = sl(current,  "Equity holders of parent")
    equity_p    = sl(previous, "Equity holders of parent")
    ncl_c       = sl(current,  "SB Non-current provisions and liabilities")
    ncl_p       = sl(previous, "SB Non-current provisions and liabilities")
    cl_c        = ss(current,  "SB Current Provisions And Liabilities")
    cl_p        = ss(previous, "SB Current Provisions And Liabilities")
    cash_c      = sl(current,  "SB Cash and cash equivalents")
    cash_p      = sl(previous, "SB Cash and cash equivalents")

    equity_ratio  = round(equity_c / total_c * 100, 2) if total_c else 0
    working_cap   = round(curr_c - cl_c, 2)
    current_ratio = round(curr_c / cl_c, 2) if cl_c else 0
    debt_equity   = round((ncl_c + cl_c) / equity_c, 2) if equity_c else 0

    return {
        "snapshot_month": snapshot_month,
        "total_assets_c": total_c, "total_assets_p": total_p,
        "non_curr_c": non_curr_c, "non_curr_p": non_curr_p,
        "curr_assets_c": curr_c, "curr_assets_p": curr_p,
        "equity_c": equity_c, "equity_p": equity_p,
        "ncl_c": ncl_c, "ncl_p": ncl_p,
        "cl_c": cl_c, "cl_p": cl_p,
        "cash_c": cash_c, "cash_p": cash_p,
        "equity_ratio": equity_ratio,
        "working_capital": working_cap,
        "current_ratio": current_ratio,
        "debt_to_equity": debt_equity,
    }




class GenerateRequest(BaseModel):
    year:      int
    period:    str
    dashboard: str = "profitability"


# generates a text interpretation of the selected dashboard and saves it to ai_insights
@router.post("/generate/interpretation")
def generate_interpretation(
    body: GenerateRequest,
    db:   Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    standards_block = f"""
Use the following financial standards only to identify risks.
Do not mention article numbers, law names, or the code name in your response.
---
{FINANCIAL_STANDARDS}
---
""" if FINANCIAL_STANDARDS else ""

    if body.dashboard == "liquidity":
        data = get_liquidity_from_db(body.year, body.period, db)
        monthly_text = "".join(
            f"  {m['month']}: Operating {m['operating']:,.0f} | Investing {m['investing']:,.0f} | Financing {m['financing']:,.0f} | Net {m['net']:,.0f}\n"
            for m in data["monthly"]
        )
        prompt = f"""You are a senior financial analyst at TUI TGBST Tunisia.
{standards_block}
Analyze the Liquidity data for fiscal year {body.year}, period {body.period}
(periods: {', '.join(data['active_periods'])}).
All comparisons are against the same period of {data['prev_year']}.

KEY METRICS:
  Cash Ratio           : {data['cash_ratio']:.2f}
  Free Cash Flow       : {data['free_cf']:,.0f} EUR
  Opening Cash Balance : {data['opening_cash']:,.0f} EUR (prev: {data['opening_cash_prev']:,.0f})
  Closing Cash Balance : {data['closing_cash']:,.0f} EUR (prev: {data['closing_cash_prev']:,.0f})
  Operating Cash Flow  : {data['operating_cf']:,.0f} EUR (prev: {data['operating_cf_prev']:,.0f})
  Investing Cash Flow  : {data['investing_cf']:,.0f} EUR
  Financing Cash Flow  : {data['financing_cf']:,.0f} EUR

MONTHLY BREAKDOWN:
{monthly_text}

Return ONLY a valid JSON object. No markdown, no backticks, nothing outside the JSON.
{{
  "bullets": [
    "First observation referencing a specific number.",
    "Second observation.",
    "Third observation.",
    "Fourth observation.",
    "Fifth observation."
  ],
  "legal_flags": [
    "A financial risk concern in plain language if one exists."
  ]
}}

Rules:
- bullets: 4 to 6 sentences. Each must reference specific numbers from the data.
- legal_flags: plain language only, no article numbers or law names. Empty array if no concerns.
- Do not repeat the same point in both arrays.
"""

    elif body.dashboard == "dso_dpo":
        data = get_dso_dpo_from_db(body.year, body.period, db)
        cust_aging_text = "".join(
            f"  {r['bucket']}: {r['amount']:,.0f} EUR\n" for r in data["cust_aging"]
        )
        supp_aging_text = "".join(
            f"  {r['bucket']}: {r['amount']:,.0f} EUR\n" for r in data["supp_aging"]
        )
        prompt = f"""You are a senior financial analyst at TUI TGBST Tunisia.
{standards_block}
Analyze the DSO & DPO data for fiscal year {body.year}, period {body.period}
(months: {', '.join(data['active_months'])}).
All comparisons are against the same period of {body.year - 1}.

KEY METRICS:
  DSO (Days Sales Outstanding)     : {data['dso']:.1f} days (prev: {data['prev_dso']:.1f})
  DPO (Days Payable Outstanding)   : {data['dpo']:.1f} days (prev: {data['prev_dpo']:.1f})
  Revenue                          : {data['revenue']:,.0f} EUR (prev: {data['prev_revenue']:,.0f})
  Trade Receivables                : {data['trade_recv']:,.0f} EUR
  Trade Payables                   : {data['trade_pay']:,.0f} EUR

CUSTOMER POSITION:
  Total Receivables : {data['cust_total']:,.0f} EUR (prev: {data['cust_total_prev']:,.0f})
  Overdue Amount    : {data['cust_overdue']:,.0f} EUR

CUSTOMER AGING:
{cust_aging_text}
SUPPLIER POSITION:
  Total Payables    : {data['supp_total']:,.0f} EUR (prev: {data['supp_total_prev']:,.0f})
  Overdue Amount    : {data['supp_overdue']:,.0f} EUR

SUPPLIER AGING:
{supp_aging_text}

Return ONLY a valid JSON object. No markdown, no backticks, nothing outside the JSON.
{{
  "bullets": [
    "First observation referencing a specific number.",
    "Second observation.",
    "Third observation.",
    "Fourth observation.",
    "Fifth observation."
  ],
  "legal_flags": [
    "A financial risk concern in plain language if one exists."
  ]
}}

Rules:
- bullets: 4 to 6 sentences. Each must reference specific numbers from the data.
- legal_flags: plain language only, no article numbers or law names. Empty array if no concerns.
- Do not repeat the same point in both arrays.
"""

    elif body.dashboard == "balance_sheet":
        data = get_balance_sheet_from_db(body.year, body.period, db)
        prompt = f"""You are a senior financial analyst at TUI TGBST Tunisia.
{standards_block}
Analyze the Balance Sheet data for fiscal year {body.year}, period {body.period}
(snapshot month: {data['snapshot_month']}).
All comparisons are against the same period of {body.year - 1}.

KEY METRICS:
  Equity Ratio        : {data['equity_ratio']:.1f}%
  Working Capital     : {data['working_capital']:,.0f} EUR
  Current Ratio       : {data['current_ratio']:.2f}
  Debt-to-Equity      : {data['debt_to_equity']:.2f}
  Cash & Equivalents  : {data['cash_c']:,.0f} EUR (prev: {data['cash_p']:,.0f})

BALANCE SHEET STRUCTURE:
  Total Assets            : {data['total_assets_c']:,.0f} EUR (prev: {data['total_assets_p']:,.0f})
  Non-current Assets      : {data['non_curr_c']:,.0f} EUR (prev: {data['non_curr_p']:,.0f})
  Current Assets          : {data['curr_assets_c']:,.0f} EUR (prev: {data['curr_assets_p']:,.0f})
  Equity                  : {data['equity_c']:,.0f} EUR (prev: {data['equity_p']:,.0f})
  Non-current Liabilities : {data['ncl_c']:,.0f} EUR (prev: {data['ncl_p']:,.0f})
  Current Liabilities     : {data['cl_c']:,.0f} EUR (prev: {data['cl_p']:,.0f})

Return ONLY a valid JSON object. No markdown, no backticks, nothing outside the JSON.
{{
  "bullets": [
    "First observation referencing a specific number.",
    "Second observation.",
    "Third observation.",
    "Fourth observation.",
    "Fifth observation."
  ],
  "legal_flags": [
    "A financial risk concern in plain language if one exists."
  ]
}}

Rules:
- bullets: 4 to 6 sentences. Each must reference specific numbers from the data.
- legal_flags: plain language only, no article numbers or law names. Empty array if no concerns.
- Do not repeat the same point in both arrays.
"""

    else:
        data = get_profitability_from_db(body.year, body.period, db)

        pl_text = ""
        for row in data["pl"]:
            arrow = "↑" if row["direction"] == "up" else "↓"
            pl_text += (
                f"  {row['label']}: {row['current']:,.0f} EUR "
                f"({arrow} {abs(row['change']):,.0f} vs {body.year - 1})\n"
            )

        oh_text = ""
        for oh in data["overheads"]:
            arrow = "↑" if oh["change"] >= 0 else "↓"
            oh_text += (
                f"  {oh['category']}: {oh['current']:,.0f} EUR "
                f"({arrow} {abs(oh['change']):,.0f} vs {body.year - 1})\n"
            )

        monthly_text = ""
        for m in data["monthly"]:
            monthly_text += (
                f"  {m['month']}: Revenue {m['revenue']:,.0f} | "
                f"EBIT {m['ebit']:,.0f} | Expenses {m['expenses']:,.0f}\n"
            )
        budget_text = f"""
        Budget Revenue : {data['budget_revenue']:,.0f} EUR
        Budget EBIT    : {data['budget_ebit']:,.0f} EUR
        Revenue vs Budget gap: {data['revenue_curr'] - data['budget_revenue']:,.0f} EUR
    """

        prompt = f"""You are a senior financial analyst at TUI TGBST Tunisia.
{standards_block}
Analyze the profitability data for fiscal year {body.year},
period {body.period} (months: {', '.join(data['active_months'])}).
All comparisons are against the same period of {body.year - 1}.

KEY METRICS:
  Gross Profit Margin : {data['gross_margin']:.1f}%
  EBIT Margin         : {data['ebit_margin']:.1f}%
  Net Profit Margin   : {data['net_margin']:.1f}%
  Total Revenue       : {data['revenue_curr']:,.0f} EUR (prev: {data['revenue_prev']:,.0f})
  Retained Profit     : {data['retained_curr']:,.0f} EUR (prev: {data['retained_prev']:,.0f})

PROFIT AND LOSS BREAKDOWN:
{pl_text}
OVERHEAD DETAIL:
{oh_text}
MONTHLY TREND:
{monthly_text}
BUDGET COMPARISON:
{budget_text}

Return ONLY a valid JSON object. No markdown, no backticks, nothing outside the JSON.
{{
  "bullets": [
    "First observation referencing a specific number.",
    "Second observation.",
    "Third observation.",
    "Fourth observation.",
    "Fifth observation."
  ],
  "legal_flags": [
    "A financial risk concern in plain language if one exists."
  ]
}}

Rules:
- bullets: 4 to 6 sentences. Each must reference specific numbers from the data.
- legal_flags: describe financial risks in plain language only. No article numbers,
  no law names. Empty array if there are no concerns.
- Do not repeat the same point in both arrays.
"""

    try:
        co       = cohere.ClientV2(COHERE_API_KEY)
        response = co.chat(
            model="command-a-03-2025",
            messages=[{"role": "user", "content": prompt}]
        )
        raw = response.message.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()
        parsed = json.loads(raw)

        insight = AIInsight(
            userId      = current_user.id,
            insightType = "interpretation",
            dashboard   = body.dashboard,
            year        = body.year,
            period      = body.period,
            content     = json.dumps(parsed)
        )
        db.add(insight)
        db.commit()
        db.refresh(insight)

        return {
            "id":      insight.id,
            "result":  parsed,
            "savedAt": insight.createdAt.isoformat() if insight.createdAt else None
        }

    except json.JSONDecodeError:
        fallback = {"bullets": [raw], "legal_flags": []}
        insight = AIInsight(
            userId=current_user.id, insightType="interpretation",
            dashboard=body.dashboard, year=body.year,
            period=body.period, content=json.dumps(fallback)
        )
        db.add(insight)
        db.commit()
        return {"id": insight.id, "result": fallback, "savedAt": None}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# generates 3 strategic recommendations for the next fiscal period and saves them
@router.post("/generate/recommendation")
def generate_recommendation(
    body: GenerateRequest,
    db:   Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    target_period = next_period(body.period)

    standards_block = f"""
Use the following financial standards only to identify risks.
Do not mention article numbers, law names, or the code name in your response.
---
{FINANCIAL_STANDARDS}
---
""" if FINANCIAL_STANDARDS else ""

    rec_json_schema = f"""
Return ONLY a valid JSON object. No markdown, no backticks, nothing outside the JSON.
{{
  "recommendations": [
    {{
      "type":       "Short label like Cost Control, Revenue, or Profitability",
      "impact":     "Two sentences stating the problem or opportunity with a specific number.",
      "prediction": "Two sentences on what to expect in {target_period}."
    }}
  ]
}}

Rules:
- Exactly 3 recommendations, each covering a different area.
- impact and prediction: two sentences each, short and direct.
- Use specific numbers from the data.
- No article numbers, no law names, no markdown inside strings.
"""

    if body.dashboard == "liquidity":
        data = get_liquidity_from_db(body.year, body.period, db)
        prompt = f"""You are a senior financial analyst at TUI TGBST Tunisia.
{standards_block}
Generate 3 concise recommendations for period {target_period}
based on Liquidity data for fiscal year {body.year}, period {body.period}.

KEY METRICS:
  Cash Ratio           : {data['cash_ratio']:.2f}
  Free Cash Flow       : {data['free_cf']:,.0f} EUR
  Operating Cash Flow  : {data['operating_cf']:,.0f} EUR (prev: {data['operating_cf_prev']:,.0f})
  Closing Cash Balance : {data['closing_cash']:,.0f} EUR (prev: {data['closing_cash_prev']:,.0f})
  Investing Cash Flow  : {data['investing_cf']:,.0f} EUR
  Financing Cash Flow  : {data['financing_cf']:,.0f} EUR
{rec_json_schema}"""

    elif body.dashboard == "dso_dpo":
        data = get_dso_dpo_from_db(body.year, body.period, db)
        prompt = f"""You are a senior financial analyst at TUI TGBST Tunisia.
{standards_block}
Generate 3 concise recommendations for period {target_period}
based on DSO & DPO data for fiscal year {body.year}, period {body.period}.

KEY METRICS:
  DSO : {data['dso']:.1f} days (prev: {data['prev_dso']:.1f})
  DPO : {data['dpo']:.1f} days (prev: {data['prev_dpo']:.1f})
  Customer Receivables : {data['cust_total']:,.0f} EUR (overdue: {data['cust_overdue']:,.0f})
  Supplier Payables    : {data['supp_total']:,.0f} EUR (overdue: {data['supp_overdue']:,.0f})
{rec_json_schema}"""

    elif body.dashboard == "balance_sheet":
        data = get_balance_sheet_from_db(body.year, body.period, db)
        prompt = f"""You are a senior financial analyst at TUI TGBST Tunisia.
{standards_block}
Generate 3 concise recommendations for period {target_period}
based on Balance Sheet data for fiscal year {body.year}, period {body.period}.

KEY METRICS:
  Equity Ratio    : {data['equity_ratio']:.1f}%
  Working Capital : {data['working_capital']:,.0f} EUR
  Current Ratio   : {data['current_ratio']:.2f}
  Debt-to-Equity  : {data['debt_to_equity']:.2f}
  Total Assets    : {data['total_assets_c']:,.0f} EUR (prev: {data['total_assets_p']:,.0f})
  Equity          : {data['equity_c']:,.0f} EUR (prev: {data['equity_p']:,.0f})
  Current Liab.   : {data['cl_c']:,.0f} EUR (prev: {data['cl_p']:,.0f})
{rec_json_schema}"""

    else:
        data = get_profitability_from_db(body.year, body.period, db)
        pl_text = ""
        for row in data["pl"]:
            arrow = "↑" if row["direction"] == "up" else "↓"
            pl_text += (
                f"  {row['label']}: {row['current']:,.0f} EUR "
                f"({arrow} {abs(row['change']):,.0f} vs {body.year - 1})\n"
            )
        prompt = f"""You are a senior financial analyst at TUI TGBST Tunisia.
{standards_block}
Generate 3 concise financial recommendations for period {target_period}
based on the profitability data for fiscal year {body.year}, period {body.period}.

KEY METRICS:
  Gross Profit Margin : {data['gross_margin']:.1f}%
  EBIT Margin         : {data['ebit_margin']:.1f}%
  Net Profit Margin   : {data['net_margin']:.1f}%
  Total Revenue       : {data['revenue_curr']:,.0f} EUR (prev: {data['revenue_prev']:,.0f})

PROFIT AND LOSS BREAKDOWN:
{pl_text}
{rec_json_schema}"""

    try:
        co       = cohere.ClientV2(COHERE_API_KEY)
        response = co.chat(
            model="command-a-03-2025",
            messages=[{"role": "user", "content": prompt}]
        )
        raw = response.message.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()
        parsed = json.loads(raw)

        insight = AIInsight(
            userId       = current_user.id,
            insightType  = "recommendation",
            dashboard    = body.dashboard,
            year         = body.year,
            period       = body.period,
            targetPeriod = target_period,
            content      = json.dumps(parsed)
        )
        db.add(insight)
        db.commit()
        db.refresh(insight)

        return {
            "id":           insight.id,
            "targetPeriod": target_period,
            "result":       parsed,
            "savedAt":      insight.createdAt.isoformat() if insight.createdAt else None
        }

    except json.JSONDecodeError:
        fallback = {"recommendations": [{"type": "General", "impact": raw, "prediction": ""}]}
        insight = AIInsight(
            userId=current_user.id, insightType="recommendation",
            dashboard=body.dashboard, year=body.year,
            period=body.period, targetPeriod=target_period,
            content=json.dumps(fallback)
        )
        db.add(insight)
        db.commit()
        return {"id": insight.id, "targetPeriod": target_period, "result": fallback, "savedAt": None}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



# returns all insights history
@router.get("/history")
def get_history(
    dashboard:    Optional[str] = None,
    insightType:  Optional[str] = None,
    db:           Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(AIInsight).filter(AIInsight.userId == current_user.id)
    if dashboard:   query = query.filter(AIInsight.dashboard   == dashboard)
    if insightType: query = query.filter(AIInsight.insightType == insightType)
    records = query.order_by(AIInsight.createdAt.desc()).all()
    return [
        {
            "id":           r.id,
            "insightType":  r.insightType,
            "dashboard":    r.dashboard,
            "year":         r.year,
            "period":       r.period,
            "targetPeriod": r.targetPeriod,
            "content":      json.loads(r.content),
            "createdAt":    r.createdAt.isoformat() if r.createdAt else None,
        }
        for r in records
    ]


# deletes an insight
@router.delete("/{insight_id}")
def delete_insight(
    insight_id:   int,
    db:           Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    insight = db.query(AIInsight).filter(
        AIInsight.id     == insight_id,
        AIInsight.userId == current_user.id
    ).first()
    if not insight:
        raise HTTPException(status_code=404, detail="Insight not found")
    db.delete(insight)
    db.commit()
    return {"message": "Deleted successfully"}


# queries all 4 tables to generate a global interpretation
@router.post("/generate/global")
def generate_global_interpretation(
    body: GenerateRequest,
    db:   Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    active_months = get_active_months(body.period)

    # ── Revenue & Expenses ────────────────────────────────────
    re_current  = db.query(RevenueExpense).filter(
        RevenueExpense.year == body.year,
        RevenueExpense.month.in_(active_months)
    ).all()
    re_previous = db.query(RevenueExpense).filter(
        RevenueExpense.year == body.year - 1,
        RevenueExpense.month.in_(active_months)
    ).all()

    def sum_re(entries, label):
        return round(sum(e.value or 0 for e in entries if e.label == label), 2)

    rev_curr   = sum_re(re_current,  "Revenue")
    rev_prev   = sum_re(re_previous, "Revenue")
    ebit_curr  = sum_re(re_current,  "EBIT")
    ret_curr   = sum_re(re_current,  "Retained Profit/(loss)")
    staff_curr = sum_re(re_current,  "Staff Costs")

    gross_margin = round((rev_curr - staff_curr) / rev_curr * 100, 2) if rev_curr else 0
    ebit_margin  = round(ebit_curr / rev_curr * 100, 2) if rev_curr else 0
    net_margin   = round(ret_curr  / rev_curr * 100, 2) if rev_curr else 0

    # ── Assets & Liabilities ──────────────────────────────────
    snapshot_month = active_months[-1]

    al_current  = db.query(AssetLiability).filter(
        AssetLiability.year == body.year,
        AssetLiability.month == snapshot_month
    ).all()
    al_previous = db.query(AssetLiability).filter(
        AssetLiability.year == body.year - 1,
        AssetLiability.month == snapshot_month
    ).all()

    def sum_al_sub(entries, subcategory):
        return round(sum(
            e.value or 0 for e in entries
            if (e.subCategory or "").strip().lower() == subcategory.strip().lower()
        ), 2)

    def sum_al_label(entries, label):
        return round(sum(
            e.value or 0 for e in entries
            if (e.label or "").strip().lower() == label.strip().lower()
        ), 2)

    curr_assets_c   = sum_al_sub(al_current,  "SB Current Assets")
    curr_assets_p   = sum_al_sub(al_previous, "SB Current Assets")
    non_curr_c      = sum_al_sub(al_current,  "SB Non-current Assets")
    curr_liab_c     = sum_al_sub(al_current,  "SB Current Provisions And Liabilities")
    curr_liab_p     = sum_al_sub(al_previous, "SB Current Provisions And Liabilities")
    total_assets_c  = non_curr_c + curr_assets_c
    equity_c        = sum_al_label(al_current,  "Equity holders of parent")
    cash_al_c       = sum_al_label(al_current,  "SB Cash and cash equivalents")
    cash_al_p       = sum_al_label(al_previous, "SB Cash and cash equivalents")
    working_cap_c   = round(curr_assets_c - curr_liab_c, 2)
    equity_ratio_c  = round(equity_c / total_assets_c * 100, 2) if total_assets_c else 0
    current_ratio_c = round(curr_assets_c / curr_liab_c, 2) if curr_liab_c else 0

    # ── Cash Flow ─────────────────────────────────────────────
    active_periods = FISCAL_PERIODS[:FISCAL_PERIODS.index(body.period) + 1]

    cf_current = db.query(CashFlow).filter(
        CashFlow.year == body.year,
        CashFlow.period.in_(active_periods)
    ).all()

    def sum_cf(entries, label):
        return round(sum(e.value or 0 for e in entries if e.label == label), 2)

    operating_cf = sum_cf(cf_current, "Operating Cash Flow")
    investing_cf = sum_cf(cf_current, "Net Investments Cash Flow")
    closing_cash = sum_cf(cf_current, "Closing Cash Balance")
    opening_cash = sum_cf(cf_current, "Opening Cash Balance")
    free_cf      = round(operating_cf + investing_cf, 2)
    cash_ratio   = round(cash_al_c / curr_liab_c, 4) if curr_liab_c else 0

    # ── Clients ───────────────────────────────────────────────
    def get_client_total(ctype):
        return round(sum(
            c.amount for c in db.query(Client).filter(
                Client.year == body.year,
                Client.clientType == ctype
            ).all()
        ), 2)

    def get_client_overdue(ctype):
        return round(sum(
            c.amount for c in db.query(Client).filter(
                Client.year == body.year,
                Client.clientType == ctype,
                Client.agingDays != "Not due"
            ).all()
        ), 2)

    cust_total   = get_client_total("customer")
    cust_overdue = get_client_overdue("customer")
    supp_total   = get_client_total("supplier")
    supp_overdue = get_client_overdue("supplier")

    # ── Build prompt ──────────────────────────────────────────
    standards_block = f"""
Use the following financial standards only to identify risks.
Do not mention article numbers, law names, or the code name in your response.
---
{FINANCIAL_STANDARDS}
---
""" if FINANCIAL_STANDARDS else ""

    prompt = f"""You are a senior financial analyst at TUI TGBST Tunisia.
{standards_block}
Generate a comprehensive cross-dashboard financial interpretation for fiscal year
{body.year}, period {body.period} (months: {', '.join(active_months)}).
All comparisons are against the same period of {body.year - 1}.

This interpretation must cover all four financial dimensions and connect them.
Do not analyze each dashboard in isolation.

PROFITABILITY:
  Gross Profit Margin : {gross_margin:.1f}%
  EBIT Margin         : {ebit_margin:.1f}%
  Net Profit Margin   : {net_margin:.1f}%
  Total Revenue       : {rev_curr:,.0f} EUR (prev: {rev_prev:,.0f})
  Retained Profit     : {ret_curr:,.0f} EUR

BALANCE SHEET (snapshot: {snapshot_month}):
  Total Assets        : {total_assets_c:,.0f} EUR
  Current Assets      : {curr_assets_c:,.0f} EUR (prev: {curr_assets_p:,.0f})
  Current Liabilities : {curr_liab_c:,.0f} EUR (prev: {curr_liab_p:,.0f})
  Working Capital     : {working_cap_c:,.0f} EUR
  Equity Ratio        : {equity_ratio_c:.1f}%
  Current Ratio       : {current_ratio_c:.2f}
  Cash Position       : {cash_al_c:,.0f} EUR (prev: {cash_al_p:,.0f})

LIQUIDITY:
  Opening Cash Balance: {opening_cash:,.0f} EUR
  Closing Cash Balance: {closing_cash:,.0f} EUR
  Operating Cash Flow : {operating_cf:,.0f} EUR
  Free Cash Flow      : {free_cf:,.0f} EUR
  Cash Ratio          : {cash_ratio:.2f}

CLIENT AND SUPPLIER POSITION:
  Customer Receivables: {cust_total:,.0f} EUR (overdue: {cust_overdue:,.0f})
  Supplier Payables   : {supp_total:,.0f} EUR (overdue: {supp_overdue:,.0f})

Return ONLY a valid JSON object. No markdown, no backticks, nothing outside the JSON.
{{
  "bullets": [
    "First cross-dashboard observation with specific numbers.",
    "Second observation.",
    "Third observation.",
    "Fourth observation.",
    "Fifth observation.",
    "Sixth observation."
  ],
  "legal_flags": [
    "A financial risk in plain language if one exists."
  ]
}}

Rules:
- bullets: 5 to 7 sentences. Each must reference specific numbers and connect
  at least two financial dimensions.
- legal_flags: plain language only, no article numbers or law names.
  Empty array if no concerns.
- Do not repeat the same point in both arrays.
"""

    try:
        co       = cohere.ClientV2(COHERE_API_KEY)
        response = co.chat(
            model="command-a-03-2025",
            messages=[{"role": "user", "content": prompt}]
        )
        raw = response.message.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()
        parsed = json.loads(raw)

        insight = AIInsight(
            userId      = current_user.id,
            insightType = "interpretation",
            dashboard   = "global",
            year        = body.year,
            period      = body.period,
            content     = json.dumps(parsed)
        )
        db.add(insight)
        db.commit()
        db.refresh(insight)

        return {
            "id":      insight.id,
            "result":  parsed,
            "savedAt": insight.createdAt.isoformat() if insight.createdAt else None
        }

    except json.JSONDecodeError:
        fallback = {"bullets": [raw], "legal_flags": []}
        insight = AIInsight(
            userId=current_user.id, insightType="interpretation",
            dashboard="global", year=body.year,
            period=body.period, content=json.dumps(fallback)
        )
        db.add(insight)
        db.commit()
        return {"id": insight.id, "result": fallback, "savedAt": None}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))