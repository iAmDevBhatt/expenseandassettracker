from typing import List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from core.security import verify_password, create_access_token, hash_password
from core.config import settings
from models.user import User
from schemas.auth import LoginRequest, LoginResponse, CreateUserRequest, UpdateUserRequest


def login(request: LoginRequest, db: Session) -> LoginResponse:
    user = db.query(User).filter(User.username == request.username).first()
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
    token = create_access_token(user.username)
    return LoginResponse(
        token=token,
        expires_in=settings.JWT_EXPIRY_HOURS * 3600,
        username=user.username
    )


def get_user_by_username(username: str, db: Session) -> User:
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def list_users(db: Session) -> List[User]:
    return db.query(User).order_by(User.created_at.asc()).all()


def create_user(data: CreateUserRequest, db: Session) -> User:
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(status_code=400, detail="Username already exists")
    user = User(username=data.username, password_hash=hash_password(data.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update_user(user_id: int, data: UpdateUserRequest, db: Session) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if data.username is not None:
        existing = db.query(User).filter(User.username == data.username, User.id != user_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Username already exists")
        user.username = data.username
    if data.password is not None:
        user.password_hash = hash_password(data.password)
    db.commit()
    db.refresh(user)
    return user


def delete_user(user_id: int, db: Session) -> None:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
