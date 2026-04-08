from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.db import get_db
from models.user import User
from schemas.auth import UserLogin, PasswordResetRequest
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
    if "email" in updates and updates["email"]:
        # Check if email is already taken by another user
        existing = db.query(User).filter(
            User.email == updates["email"],
            User.id != current_user.id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use by another account")
        current_user.email = updates["email"]
 
    if "fullName" in updates:
        current_user.fullName = updates["fullName"]
 
    if "telephone" in updates:
        current_user.telephone = updates["telephone"]
 
    db.commit()
    db.refresh(current_user)
 
    return {"message": "Profile updated successfully"}
 



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

    payload = verify_password_reset_token(token)
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