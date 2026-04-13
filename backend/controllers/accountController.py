from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.db import get_db
from models.user import User
from models.account import Account
from schemas.auth import UserRegister, UserUpdate
from core.security import hash_password
from core.dependencies import get_current_user, require_roles
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

router = APIRouter(prefix="/auth", tags=["auth"])


def _send_credentials_email(email: str, full_name: str, password: str):
    try:
        from core.email import SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, FROM_EMAIL
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Your TUI Platform Account"
        msg["From"]    = FROM_EMAIL
        msg["To"]      = email
        body = f"""
        <html><body style="font-family:sans-serif;color:#1a2b4a;">
          <h2 style="color:#E8002D;">Welcome to TUI Financial Platform</h2>
          <p>Hello {full_name},</p>
          <p>Your account has been created. Here are your credentials:</p>
          <p><strong>Email:</strong> {email}</p>
          <p><strong>Password:</strong> {password}</p>
          <p>Please log in and change your password immediately.</p>
          <p style="color:#888;font-size:12px;">TUI Financial Intelligence Platform</p>
        </body></html>
        """
        msg.attach(MIMEText(body, "html"))
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(FROM_EMAIL, email, msg.as_string())
    except Exception as e:
        print(f"[email] Failed to send credentials to {email}: {e}")

@router.post("/create-user")
def create_user(
    user: UserRegister,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["leader"]))
):
    if db.query(Account).filter(Account.email == user.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    new_user = User(
        role      = user.role,
        fullName  = user.fullName,
        telephone = user.telephone,
        team      = user.team,
    )
    db.add(new_user)
    db.flush()  # get new_user.id before creating Account
    new_account = Account(
        user_id         = new_user.id,
        email           = user.email,
        hashed_password = hash_password(user.password),
        is_active       = True,
    )
    db.add(new_account)
    db.commit()
    db.refresh(new_user)
    # Send credentials email (won't crash if email fails)
    _send_credentials_email(user.email, user.fullName or user.email, user.password)
    return {"message": "User created successfully"}

# ================= GET ALL USERS (Leader only) =================
@router.get("/users")
def get_all_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["leader"]))
):
    users = db.query(User).all()
    return [
        {
            "id": u.id,
            "email": u.account.email if u.account else None,
            "role": u.role.value,
            "is_active": u.account.is_active if u.account else None,
            "fullName": u.fullName,
            "telephone": u.telephone,
            "team": u.team,
        }
        for u in users
    ]

# ================= GET USER BY ID (Leader only) =================
@router.get("/users/{user_id}")
def get_user_by_id(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["leader"]))
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "id": user.id,
        "email": user.account.email if user.account else None,
        "role": user.role.value,
        "is_active": user.account.is_active if user.account else None,
        "fullName": user.fullName,
        "telephone": user.telephone,
        "team": user.team,
    }

# ================= UPDATE USER (Leader only) =================
@router.put("/users/{user_id}")
def update_user(
    user_id: int,
    updates: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["leader"]))
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    data = updates.dict(exclude_unset=True)
    # email lives on Account
    if "email" in data:
        if user.account:
            user.account.email = data.pop("email")
        else:
            data.pop("email")
    for field, value in data.items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return {"message": "User updated successfully"}


# ================= DELETE USER (Leader only) =================
@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["leader"]))
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db.delete(user)
    db.commit()

    return {"message": "User deleted successfully"}


# ================= ACTIVATE USER (Leader only) =================
@router.patch("/users/{user_id}/activate")
def activate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["leader"]))
):
    account = db.query(Account).filter(Account.user_id == user_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="User not found")

    account.is_active = True
    db.commit()

    return {"message": "User activated successfully"}


# ================= DEACTIVATE USER (Leader only) =================
@router.patch("/users/{user_id}/deactivate")
def deactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["leader"]))
):
    account = db.query(Account).filter(Account.user_id == user_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="User not found")

    account.is_active = False
    db.commit()

    return {"message": "User deactivated successfully"}
