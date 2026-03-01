from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.db import get_db
from models.user import User
from schemas.auth import UserRegister, UserLogin
from core.security import hash_password, verify_password, create_access_token
from core.dependencies import get_current_user, require_roles
from schemas.auth import (
    UserRegister,
    UserLogin,
    PasswordResetRequest,
    PasswordResetConfirm
)

from core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_password_reset_token,
    verify_password_reset_token
)

router = APIRouter(prefix="/auth", tags=["auth"])


# ================= CREATE USER (Leader only) =================
@router.post("/create-user")
def create_user(
    user: UserRegister,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["leader"]))
):
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = User(
        email=user.email,
        hashed_password=hash_password(user.password),
        role=user.role
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {"message": "User created successfully"}


# ================= LOGIN =================
@router.post("/login")
def login(user: UserLogin, db: Session = Depends(get_db)):

    db_user = db.query(User).filter(User.email == user.email).first()

    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = create_access_token({
        "sub": db_user.email,
        "role": db_user.role.value
    })

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


# ================= ME =================
@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "email": current_user.email,
        "role": current_user.role.value
    }


# ================= ROLE-PROTECTED ROUTES (for Sprint 1 scenarios) =================
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

    # In production → send via email
    # For now → return token directly
    return {
        "message": "Password reset token generated",
        "reset_token": reset_token
    }

# ================= RESET PASSWORD =================
@router.post("/reset-password")
def reset_password(data: PasswordResetConfirm, db: Session = Depends(get_db)):

    email = verify_password_reset_token(data.token)

    if not email:
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    user = db.query(User).filter(User.email == email).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.hashed_password = hash_password(data.new_password)

    db.commit()

    return {"message": "Password successfully reset"}

