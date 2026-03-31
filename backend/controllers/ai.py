from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import cohere
import os
from dotenv import load_dotenv

router = APIRouter(prefix="/ai", tags=["ai"])

load_dotenv()

COHERE_API_KEY = os.getenv("COHERE_API_KEY") 


if not COHERE_API_KEY:
    print("[AI ERROR] Could not find COHERE_API_KEY in environment variables!")

co = cohere.Client(COHERE_API_KEY)

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