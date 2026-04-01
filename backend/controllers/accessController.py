from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.db import get_db
from models.user import User, UserRole
from models.dashboard_permission import DashboardPermission
from core.dependencies import require_roles
from pydantic import BaseModel
from core.email import send_dashboard_access_email

router = APIRouter(prefix="/dashboard-access", tags=["dashboard-access"])

VALID_DASHBOARDS = {"profitability", "balance_sheet", "liquidity", "dpo_dso"}


class ToggleRequest(BaseModel):
    dashboard: str
    enabled: bool


@router.get("/leaders")
def get_leaders_with_permissions(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["manager"]))
):
    leaders = db.query(User).filter(User.role == UserRole.leader).all()

    if not leaders:
        return []

    result = []
    for leader in leaders:
        perm = leader.dashboard_permissions
        if not perm:
            perm = DashboardPermission(user_id=leader.id)
            db.add(perm)
            db.commit()
            db.refresh(perm)

        result.append({
            "id":        leader.id,
            "email":     leader.email,
            "fullName":  leader.fullName,
            "team":      leader.team,
            "accessId":  perm.id,
            "grantedBy": perm.granted_by,
            "grantedAt": perm.granted_at.isoformat() if perm.granted_at else None,
            "isGranted": perm.is_granted,
            "permissions": {
                "profitability": perm.profitability,
                "balance_sheet": perm.balance_sheet,
                "liquidity":     perm.liquidity,
                "dpo_dso":       perm.dpo_dso,
            }
        })

    return result


@router.patch("/leaders/{user_id}")
def toggle_dashboard(
    user_id: int,
    body: ToggleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["manager"]))
):
    if body.dashboard not in VALID_DASHBOARDS:
        raise HTTPException(status_code=400, detail=f"Invalid dashboard: {body.dashboard}")

    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.role != UserRole.leader:
        raise HTTPException(status_code=404, detail="Team Leader not found")

    perm = user.dashboard_permissions
    if not perm:
        perm = DashboardPermission(user_id=user_id)
        db.add(perm)

    setattr(perm, body.dashboard, body.enabled)

    if body.enabled:
        perm.granted_by = current_user.id

    db.commit()

    if body.enabled:
        send_dashboard_access_email(user.email, user.fullName or "", body.dashboard)

    action = "granted" if body.enabled else "revoked"
    return {"message": f"Access {action} successfully"}