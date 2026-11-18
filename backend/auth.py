
import os
import sqlite3
from datetime import datetime, timedelta, timezone

import jwt
from jwt.exceptions import InvalidTokenError
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pwdlib import PasswordHash
from pydantic import BaseModel, EmailStr, Field

from database import get_connection

SECRET_KEY = os.environ.get("PRIVACYSHIELD_JWT_SECRET")

if not SECRET_KEY or len(SECRET_KEY) < 32:
    raise RuntimeError(
        "Set PRIVACYSHIELD_JWT_SECRET to a random "
        "secret of at least 32 characters"
    )

ALGORITHM = "HS256"
TOKEN_MINUTES = 30

password_hash = PasswordHash.recommended()
bearer = HTTPBearer()


class RegisterPayload(BaseModel):
    username: str = Field(
        min_length=3, max_length=40,
        pattern=r"^[A-Za-z0-9_]+$"
    )
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)


class LoginPayload(BaseModel):
    username: str
    password: str


def hash_password(password):
    return password_hash.hash(password)


def verify_password(password, hashed):
    return password_hash.verify(password, hashed)


def register_user(payload):
    with get_connection() as connection:
        try:
            cursor = connection.execute(
                """
                INSERT INTO users
                (username, email, password_hash)
                VALUES (?, ?, ?)
                """,
                (
                    payload.username,
                    str(payload.email),
                    hash_password(payload.password)
                )
            )
            connection.commit()
            user_id = cursor.lastrowid

        except sqlite3.IntegrityError:
            raise HTTPException(
                status_code=409,
                detail="Username or email already exists"
            )

    return {
        "id": user_id,
        "username": payload.username,
        "email": str(payload.email)
    }


def authenticate_user(username, password):
    with get_connection() as connection:
        row = connection.execute(
            "SELECT * FROM users WHERE username = ?",
            (username,)
        ).fetchone()

    if not row:
        return None

    if not verify_password(password, row["password_hash"]):
        return None

    return dict(row)


def create_access_token(user):
    now = datetime.now(timezone.utc)

    payload = {
        "sub": str(user["id"]),
        "iat": now,
        "exp": now + timedelta(minutes=TOKEN_MINUTES),
        "iss": "privacyshield"
    }

    return jwt.encode(
        payload,
        SECRET_KEY,
        algorithm=ALGORITHM
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer)
):
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired authentication token",
        headers={"WWW-Authenticate": "Bearer"}
    )

    try:
        payload = jwt.decode(
            credentials.credentials,
            SECRET_KEY,
            algorithms=[ALGORITHM],
            issuer="privacyshield"
        )
        user_id = int(payload["sub"])

    except (InvalidTokenError, KeyError, ValueError, TypeError):
        raise unauthorized

    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT id, username, email
            FROM users WHERE id = ?
            """,
            (user_id,)
        ).fetchone()

    if not row:
        raise unauthorized

    return dict(row)
