from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.db import get_db
from models.user import User,UserRole
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
from core.dependencies import get_current_user, require_roles

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
            "is_active": u.is_active
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
        "is_active": user.is_active
    }


# ================= UPDATE USER (Leader only) =================
@router.put("/users/{user_id}")
def update_user(
    user_id: int,
    updates: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["leader"]))
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if "email" in updates:
        user.email = updates["email"]
    if "role" in updates:
        user.role = updates["role"]
    if "password" in updates:
        user.hashed_password = hash_password(updates["password"])

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