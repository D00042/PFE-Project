from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.db import get_db
from models.user import User
from models.account import Account
from schemas.auth import UserLogin, PasswordResetRequest, ChangePassword
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


# Login
@router.post("/login")
def login(user: UserLogin, db: Session = Depends(get_db)):
    account = db.query(Account).filter(Account.email == user.email).first()

    if not account:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(user.password, account.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not account.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")

    access_token = create_access_token({
        "sub": account.email,
        "role": account.user.role.value
    })

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }

# Get profile
@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.account.email,
        "role": current_user.role.value,
        "is_active": current_user.account.is_active
    }


# Update profile
@router.put("/profile")
def update_profile(
    updates: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if "email" in updates and updates["email"]:
        existing = db.query(Account).filter(
            Account.email == updates["email"],
            Account.user_id != current_user.id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use by another account")
        current_user.account.email = updates["email"]

    if "fullName" in updates:
        current_user.fullName = updates["fullName"]

    if "telephone" in updates:
        current_user.telephone = updates["telephone"]

    db.commit()
    db.refresh(current_user)

    return {"message": "Profile updated successfully"}
 



# Logout
@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    # JWT is stateless — actual token invalidation happens client-side
    # This endpoint exists so the frontend has something to call
    return {"message": "Logged out successfully"}



# Request password reset
@router.post("/request-password-reset")
def request_password_reset(data: PasswordResetRequest, db: Session = Depends(get_db)):
    account = db.query(Account).filter(Account.email == data.email).first()

    if not account:
        raise HTTPException(status_code=404, detail="User not found")

    reset_token = create_password_reset_token(account.email)

    return {
        "message": "Password reset token generated",
        "reset_token": reset_token
    }


# Reset password
@router.post("/reset-password")
def reset_password(token: str, new_password: str, db: Session = Depends(get_db)):

    email = verify_password_reset_token(token)

    account = db.query(Account).filter(Account.email == email).first()

    account.hashed_password = hash_password(new_password)

    db.commit()

    return {"message": "Password reset successfully"}

# changepassword
@router.post("/change-password")
def change_password(
    data: ChangePassword,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not verify_password(data.old_password, current_user.account.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect current password")

    current_user.account.hashed_password = hash_password(data.new_password)
    db.commit()

    try:
        send_password_changed_email(current_user.account.email, current_user.fullName or "")
        print("[debug] Email sent successfully")
    except Exception as e:
        print(f"[debug] Email failed: {e}")   # ← this will show the real error

    return {"message": "Password updated successfully"}