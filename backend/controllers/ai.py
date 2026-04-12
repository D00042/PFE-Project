from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import cohere
import os
from pathlib import Path
from dotenv import load_dotenv

router = APIRouter(prefix="/ai", tags=["ai"])

# Load .env from the backend directory regardless of where uvicorn is started from
load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env")

COHERE_API_KEY = os.getenv("COHERE_API_KEY")

if not COHERE_API_KEY:
    print("[AI ERROR] Could not find COHERE_API_KEY in environment variables!")

class MonthlyPoint(BaseModel):
    month: str
    revenue: float
    ebit: float
    expenses: float

class PLRow(BaseModel):
    label: str
    current: float
    previous: float

class ProfitabilityData(BaseModel):
    year: int
    period: str
    # KPIs
    grossMargin: float
    grossMarginPrev: float
    ebitMargin: float
    ebitMarginPrev: float
    netProfitMargin: float
    netProfitMarginPrev: float
    roa: float
    roaPrev: float
    roe: float
    roePrev: float
    totalRevenue: float
    totalRevenuePrev: float
    # Chart data
    plSummary: Optional[List[PLRow]] = []
    monthlyTrend: Optional[List[MonthlyPoint]] = []

@router.post("/interpret/profitability")
def interpret_profitability(body: ProfitabilityData):
    try:
        co = cohere.ClientV2(COHERE_API_KEY)

        # Build P&L summary text
        pl_text = ""
        for row in body.plSummary:
            change = row.current - row.previous
            direction = "increased" if change >= 0 else "decreased"
            pl_text += f"  - {row.label}: {row.current:,.0f} ({direction} by {abs(change):,.0f})\n"

        # Build monthly trend text
        trend_text = ""
        for m in body.monthlyTrend:
            trend_text += f"  - {m.month}: Revenue {m.revenue:,.0f}, EBIT {m.ebit:,.0f}, Expenses {m.expenses:,.0f}\n"

        prompt = f"""You are a financial analyst at TUI, a large tourism company.
Analyze the following profitability data for fiscal year {body.year}, period {body.period}.
Write a clear, professional interpretation in 4-5 sentences.
Focus on what is going well, what needs attention, and what the trends suggest.
Do not use bullet points. Write in plain business English.

KEY PERFORMANCE INDICATORS (Current vs Previous Year):
- Gross Profit Margin: {body.grossMargin:.1f}% vs {body.grossMarginPrev:.1f}%
- EBIT Margin: {body.ebitMargin:.1f}% vs {body.ebitMarginPrev:.1f}%
- Net Profit Margin: {body.netProfitMargin:.1f}% vs {body.netProfitMarginPrev:.1f}%
- Return on Assets: {body.roa:.1f}% vs {body.roaPrev:.1f}%
- Return on Equity: {body.roe:.1f}% vs {body.roePrev:.1f}%
- Total Revenue: {body.totalRevenue:,.0f} vs {body.totalRevenuePrev:,.0f}

PROFIT AND LOSS BREAKDOWN (Current Year):
{pl_text}

MONTHLY TREND:
{trend_text}

Based on all of the above, provide a comprehensive interpretation:"""

        response = co.chat(
            model="command-a-03-2025",
            messages=[{"role": "user", "content": prompt}]
        )

        result = response.message.content[0].text
        return {"interpretation": result.strip()}

    except Exception as e:
        print(f"[AI ERROR] {str(e)}")
        raise HTTPException(status_code=500, detail=f"Interpretation failed: {str(e)}")

class BalanceSheetData(BaseModel):
    year: int
    period: str
    equityRatioCurrent: float
    equityRatioPrev: float
    workingCapitalCurrent: float
    workingCapitalPrev: float
    currentRatioCurrent: float
    currentRatioPrev: float
    debtToEquityCurrent: float
    debtToEquityPrev: float
    cashCurrent: float
    cashPrev: float

@router.post("/interpret/balance-sheet")
def interpret_balance_sheet(body: BalanceSheetData):
    try:
        co = cohere.ClientV2(COHERE_API_KEY)
        prompt = f"""You are a financial analyst at TUI, a large tourism company.
Analyze the following balance sheet data for fiscal year {body.year}, period {body.period}.
Write a clear, professional interpretation in 4-5 sentences.
Focus on financial health, leverage, liquidity risk, and year-over-year changes.
Do not use bullet points. Write in plain business English.

KEY BALANCE SHEET INDICATORS (Current vs Previous Year):
- Equity Ratio: {body.equityRatioCurrent:.1f}% vs {body.equityRatioPrev:.1f}%
- Working Capital: {body.workingCapitalCurrent:,.0f} vs {body.workingCapitalPrev:,.0f}
- Current Ratio: {body.currentRatioCurrent:.2f} vs {body.currentRatioPrev:.2f}
- Debt / Equity: {body.debtToEquityCurrent:.2f} vs {body.debtToEquityPrev:.2f}
- Cash Position: {body.cashCurrent:,.0f} vs {body.cashPrev:,.0f}

Based on all of the above, provide a comprehensive interpretation:"""
        response = co.chat(model="command-a-03-2025", messages=[{"role": "user", "content": prompt}])
        return {"interpretation": response.message.content[0].text.strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Interpretation failed: {str(e)}")

class LiquidityData(BaseModel):
    year: int
    period: str
    cashRatioCurrent: float
    cashRatioPrev: float
    freeCashFlowCurrent: float
    freeCashFlowPrev: float
    closingCashCurrent: float
    closingCashPrev: float
    openingCashCurrent: float
    openingCashPrev: float

@router.post("/interpret/liquidity")
def interpret_liquidity(body: LiquidityData):
    try:
        co = cohere.ClientV2(COHERE_API_KEY)
        prompt = f"""You are a financial analyst at TUI, a large tourism company.
Analyze the following liquidity data for fiscal year {body.year}, period {body.period}.
Write a clear, professional interpretation in 4-5 sentences.
Focus on cash generation, liquidity risk, and trends vs prior year.
Do not use bullet points. Write in plain business English.

KEY LIQUIDITY INDICATORS (Current vs Previous Year):
- Cash Ratio: {body.cashRatioCurrent:.2f} vs {body.cashRatioPrev:.2f}
- Free Cash Flow: {body.freeCashFlowCurrent:,.0f} vs {body.freeCashFlowPrev:,.0f}
- Closing Cash Balance: {body.closingCashCurrent:,.0f} vs {body.closingCashPrev:,.0f}
- Opening Cash Balance: {body.openingCashCurrent:,.0f} vs {body.openingCashPrev:,.0f}

Based on all of the above, provide a comprehensive interpretation:"""
        response = co.chat(model="command-a-03-2025", messages=[{"role": "user", "content": prompt}])
        return {"interpretation": response.message.content[0].text.strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Interpretation failed: {str(e)}")

class DsoDpoData(BaseModel):
    year: int
    period: str
    dsoCurrent: float
    dsoPrev: float
    dpoCurrent: float
    dpoPrev: float
    totalCustomers: int
    totalSuppliers: int

@router.post("/interpret/dso-dpo")
def interpret_dso_dpo(body: DsoDpoData):
    try:
        co = cohere.ClientV2(COHERE_API_KEY)
        prompt = f"""You are a financial analyst at TUI, a large tourism company.
Analyze the following DSO and DPO data for fiscal year {body.year}, period {body.period}.
Write a clear, professional interpretation in 4-5 sentences.
Focus on collection efficiency, payment behavior, working capital impact, and year-over-year changes.
Do not use bullet points. Write in plain business English.

KEY DSO/DPO INDICATORS (Current vs Previous Year):
- Days Sales Outstanding (DSO): {body.dsoCurrent:.0f} days vs {body.dsoPrev:.0f} days
- Days Payables Outstanding (DPO): {body.dpoCurrent:.0f} days vs {body.dpoPrev:.0f} days
- Total Customers tracked: {body.totalCustomers}
- Total Suppliers tracked: {body.totalSuppliers}

Based on all of the above, provide a comprehensive interpretation:"""
        response = co.chat(model="command-a-03-2025", messages=[{"role": "user", "content": prompt}])
        return {"interpretation": response.message.content[0].text.strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Interpretation failed: {str(e)}")