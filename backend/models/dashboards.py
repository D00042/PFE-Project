from dataclasses import dataclass
from typing import Optional


@dataclass
class Dashboard:
    """Matches Dashboard class in the class diagram."""
    dashboard_id: int
    key: str         
    name: str        
    description: str  


DASHBOARDS = [
    Dashboard(
        dashboard_id=1,
        key="profitability",
        name="Profitability",
        description="Profit & Loss summary, margins, revenue vs expenses, and monthly trend analysis."
    ),
    Dashboard(
        dashboard_id=2,
        key="balance_sheet",
        name="Balance Sheet",
        description="Assets, liabilities, equity structure and financial position overview."
    ),
    Dashboard(
        dashboard_id=3,
        key="liquidity",
        name="Liquidity Analysis",
        description="Cash flow waterfall, balance evolution, and supplier payment analysis."
    ),
    Dashboard(
        dashboard_id=4,
        key="dpo_dso",
        name="DPO & DSO",
        description="Days Payables Outstanding and Days Sales Outstanding with aging analysis."
    ),
]



def get_all_dashboards() -> list[Dashboard]:
    """Diagram: get_all_dashboards() : Dashboard[]"""
    return DASHBOARDS


def get_dashboard(dashboard_id: int) -> Optional[Dashboard]:
    """Diagram: get_dashboard() : Dashboard"""
    return next((d for d in DASHBOARDS if d.dashboard_id == dashboard_id), None)


def get_dashboard_by_key(key: str) -> Optional[Dashboard]:
    """Helper: look up by string key (used in permission checks)."""
    return next((d for d in DASHBOARDS if d.key == key), None)



VALID_DASHBOARD_KEYS = {d.key for d in DASHBOARDS}