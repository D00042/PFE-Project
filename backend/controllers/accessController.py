from fastapi import APIRouter, Depends, HTTPException
from psycopg2.extras import RealDictCursor
import psycopg2
from database.db import DATABASE_URL        
from models.user import User, UserRole
from core.dependencies import require_roles
from pydantic import BaseModel
from core.email import send_dashboard_access_email

router = APIRouter(prefix="/dashboard-access", tags=["dashboard-access"])
# only these 4 values are accepted as dashboard names
VALID_DASHBOARDS = {"profitability", "balance_sheet", "liquidity", "dpo_dso"}


class ToggleRequest(BaseModel):
    dashboard: str
    enabled: bool


# this controller uses raw psycopg2 connection instead of SQLAlchemy
def get_pg():
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = False
    try:
        yield conn
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

# runs a SELECT and returns rows as dicts
def _q(conn, sql: str, params=None):
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(sql, params)
        try:
            return cur.fetchall()
        except psycopg2.ProgrammingError:
            return []

# runs INSERT or UPDATE
def _run(conn, sql: str, params=None):
    with conn.cursor() as cur:
        cur.execute(sql, params)

# creates a permissions row
def _ensure_perm_rows(conn, user_ids: list):
    for uid in user_ids:
        _run(conn, """
            INSERT INTO dashboard_permissions
                (user_id, profitability, balance_sheet, liquidity, dpo_dso)
            VALUES (%s, false, false, false, false)
            ON CONFLICT (user_id) DO NOTHING
        """, (uid,))
    conn.commit()

# returns permissions by user id
def _fetch_perm_map(conn, user_ids: list) -> dict:
    if not user_ids:
        return {}
    rows = _q(conn,
        "SELECT user_id, profitability, balance_sheet, liquidity, dpo_dso "
        "FROM dashboard_permissions WHERE user_id IN %s",
        (tuple(user_ids),)
    )
    return {r["user_id"]: r for r in rows}



# Endpoints

# returns all user permissions to the manager
@router.get("/users")
def get_users_with_permissions(
    conn=Depends(get_pg),
    current_user: User = Depends(require_roles(["manager"]))
):
    users = _q(conn, """
    SELECT u.id, a.email, u."fullName", u.team, u.role
    FROM users u
    LEFT JOIN accounts a ON a.user_id = u.id
    ORDER BY u.role, u."fullName"
""")

    if not users:
        return []

    user_ids = [u["id"] for u in users]
    _ensure_perm_rows(conn, user_ids)
    perm_map = _fetch_perm_map(conn, user_ids)

    return [
        {
            "id":        u["id"],
            "email":     u["email"],
            "fullName":  u["fullName"],
            "team":      u["team"],
            "role":      u["role"],
            "isGranted": any([
                perm_map.get(u["id"], {}).get("profitability"),
                perm_map.get(u["id"], {}).get("balance_sheet"),
                perm_map.get(u["id"], {}).get("liquidity"),
                perm_map.get(u["id"], {}).get("dpo_dso"),
            ]),
            "permissions": {
                "profitability": bool(perm_map.get(u["id"], {}).get("profitability")),
                "balance_sheet": bool(perm_map.get(u["id"], {}).get("balance_sheet")),
                "liquidity":     bool(perm_map.get(u["id"], {}).get("liquidity")),
                "dpo_dso":       bool(perm_map.get(u["id"], {}).get("dpo_dso")),
            }
        }
        for u in users
    ]

# returns the current user's permissions
@router.get("/my-permissions")
def get_my_permissions(
    conn=Depends(get_pg),
    current_user: User = Depends(require_roles(["leader", "member", "manager"]))
):
    if current_user.role == UserRole.manager:
        return {
            "profitability": True,
            "balance_sheet": True,
            "liquidity":     True,
            "dpo_dso":       True,
        }

    _ensure_perm_rows(conn, [current_user.id])
    perm_map = _fetch_perm_map(conn, [current_user.id])
    p = perm_map.get(current_user.id, {})

    return {
        "profitability": bool(p.get("profitability")),
        "balance_sheet": bool(p.get("balance_sheet")),
        "liquidity":     bool(p.get("liquidity")),
        "dpo_dso":       bool(p.get("dpo_dso")),
    }

# manager grants or revokes access to a dashboard
@router.patch("/users/{user_id}")
def toggle_dashboard(
    user_id: int,
    body: ToggleRequest,
    conn=Depends(get_pg),
    current_user: User = Depends(require_roles(["manager"]))
):
    if body.dashboard not in VALID_DASHBOARDS:
        raise HTTPException(status_code=400, detail=f"Invalid dashboard: {body.dashboard}")

    # dashboard name is validated above — safe to interpolate as column name
    rows = _q(conn,
        'SELECT u.id, a.email, u."fullName", u.role FROM users u '
        'LEFT JOIN accounts a ON a.user_id = u.id WHERE u.id = %s',
        (user_id,)
    )
    if not rows or rows[0]["role"] == "manager":
        raise HTTPException(status_code=404, detail="User not found")

    user_row = rows[0]
    _ensure_perm_rows(conn, [user_id])

    _run(conn, f"""
        UPDATE dashboard_permissions
        SET {body.dashboard} = %s,
            granted_by = CASE WHEN %s THEN %s ELSE granted_by END
        WHERE user_id = %s
    """, (body.enabled, body.enabled, current_user.id, user_id))
    conn.commit()

    if body.enabled:
        send_dashboard_access_email(
            user_row["email"], user_row["fullName"] or "", body.dashboard
        )

    action = "granted" if body.enabled else "revoked"
    return {"message": f"Access {action} successfully"}
