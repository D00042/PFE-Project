from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.db import get_db
from models.user import User,UserRole
from schemas.auth import UserRegister, UserLogin, UserUpdate, PasswordResetRequest, PasswordResetConfirm
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from schemas.auth import ChangePassword
from core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_password_reset_token,
    verify_password_reset_token
)
from core.dependencies import get_current_user, require_roles
from core.email import send_password_changed_email
router = APIRouter(prefix="/auth", tags=["auth"])


# Add this function anywhere before create_user
def _send_credentials_email(email: str, full_name: str, password: str):
    """Sends login credentials to a newly created user."""
    try:
        import smtplib
        from email.mime.multipart import MIMEMultipart
        from email.mime.text import MIMEText
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

# ================= CREATE USER (Leader only) =================
@router.post("/create-user")
def create_user(
    user: UserRegister,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["leader"]))
):
    if db.query(User).filter(User.email == user.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    new_user = User(
        email           = user.email,
        hashed_password = hash_password(user.password),
        role            = user.role,
        fullName        = user.fullName,
        telephone       = user.telephone,
        team            = user.team,
        is_active       = True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    # Send credentials email (won't crash if email fails)
    _send_credentials_email(user.email, user.fullName or user.email, user.password)
    return {"message": "User created successfully"}


# ================= LOGIN =================
@router.post("/login")
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()

    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # ← was checking user.is_active (the request body) instead of db_user.is_active
    if not db_user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")

    access_token = create_access_token({
        "sub": db_user.email,
        "role": db_user.role.value
    })

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }

# ================= ME (own profile) =================
@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "role": current_user.role.value,
        "is_active": current_user.is_active
    }


# ================= UPDATE OWN PROFILE =================
@router.put("/profile")
def update_profile(
    updates: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if "email" in updates:
        current_user.email = updates["email"]
    if "password" in updates:
        current_user.hashed_password = hash_password(updates["password"])

    db.commit()
    db.refresh(current_user)

    return {"message": "Profile updated successfully"}


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
            "email": u.email,
            "role": u.role.value,
            "is_active": u.is_active,
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
        "email": user.email,
        "role": user.role.value,
        "is_active": user.is_active,
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
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = True
    db.commit()

    return {"message": "User activated successfully"}


# ================= DEACTIVATE USER (Leader only) =================
@router.patch("/users/{user_id}/deactivate")
def deactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["leader"]))
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = False
    db.commit()

    return {"message": "User deactivated successfully"}


# ================= LOGOUT =================
@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    # JWT is stateless — actual token invalidation happens client-side
    # This endpoint exists so the frontend has something to call
    return {"message": "Logged out successfully"}


# ================= ROLE-PROTECTED ROUTES =================
@router.get("/member")
def member_panel(current_user: User = Depends(require_roles(["member"]))):
    return {"message": "Member access granted"}


@router.get("/leader")
def leader_panel(current_user: User = Depends(require_roles(["leader"]))):
    return {"message": "Leader access granted"}


@router.get("/manager")
def manager_panel(current_user: User = Depends(require_roles(["manager"]))):
    return {"message": "Manager access granted"}


# ================= REQUEST PASSWORD RESET =================
@router.post("/request-password-reset")
def request_password_reset(data: PasswordResetRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    reset_token = create_password_reset_token(user.email)

    return {
        "message": "Password reset token generated",
        "reset_token": reset_token
    }


# ================= RESET PASSWORD =================
@router.post("/reset-password")
def reset_password(token: str, new_password: str, db: Session = Depends(get_db)):

    payload = decode_token(token)
    email = payload.get("sub")

    user = db.query(User).filter(User.email == email).first()

    user.hashed_password = hash_password(new_password)

    db.commit()

    return {"message": "Password reset successfully"}


@router.post("/change-password")
def change_password(
    data: ChangePassword,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not verify_password(data.old_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect current password")

    current_user.hashed_password = hash_password(data.new_password)
    db.commit()

    # DEBUG — remove after fixing
    print(f"[debug] Sending email to: {current_user.email}, name: {current_user.fullName}")
    
    try:
        send_password_changed_email(current_user.email, current_user.fullName or "")
        print("[debug] Email sent successfully")
    except Exception as e:
        print(f"[debug] Email failed: {e}")   # ← this will show the real error

    return {"message": "Password updated successfully"}