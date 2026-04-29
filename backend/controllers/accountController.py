from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.db import get_db
from models.user import User
from models.account import Account
from schemas.auth import UserRegister, UserUpdate
from core.security import hash_password
from core.dependencies import require_roles
from core.email import send_credentials_email

router = APIRouter(prefix="/auth", tags=["auth"])

# leader creates a user
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
    db.flush()  
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
    send_credentials_email(user.email, user.fullName or user.email, user.password)
    return {"message": "User created successfully"}

# leader gets all users
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

# leader returns a user by id
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

# leader updates a user
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


# leader activates a user account
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


# leader deactivates a user account
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
