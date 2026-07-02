import os
import random
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
import bcrypt
import jwt
import asyncpg
from db import get_db

router = APIRouter()

JWT_SECRET = os.getenv("JWT_SECRET", "hex-territory-secret-2024-xyz789abc")

class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, db: asyncpg.Connection = Depends(get_db)):
    username = body.username.strip()
    email = body.email.strip()
    password = body.password
    
    if not username or not email or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Missing fields"}
        )
    
    try:
        # Hash the password
        salt = bcrypt.gensalt(10)
        password_hash = bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")
        
        # Generate random hex color (e.g., #3B82F6)
        color = f"#{random.randint(0, 0xffffff):06x}"
        
        # Insert into DB
        row = await db.fetchrow(
            """
            INSERT INTO users (username, email, password_hash, color)
            VALUES ($1, $2, $3, $4)
            RETURNING id, username, color, score
            """,
            username, email, password_hash, color
        )
        
        # Sign JWT
        payload = {
            "userId": str(row["id"]),
            "username": row["username"],
            "exp": datetime.utcnow() + timedelta(days=7)
        }
        token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")
        
        return {
            "token": token,
            "user": {
                "id": str(row["id"]),
                "username": row["username"],
                "color": row["color"],
                "score": row["score"]
            }
        }
        
    except asyncpg.exceptions.UniqueViolationError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"error": "Username or email already taken"}
        )
    except Exception as e:
        print(f"Register error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Server error"}
        )

@router.post("/login")
async def login(body: LoginRequest, db: asyncpg.Connection = Depends(get_db)):
    email = body.email.strip()
    password = body.password
    
    if not email or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Missing fields"}
        )
        
    try:
        row = await db.fetchrow(
            "SELECT id, username, password_hash, color, score FROM users WHERE email = $1",
            email
        )
        
        if not row:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"error": "Invalid credentials"}
            )
            
        stored_hash = row["password_hash"]
        if not bcrypt.checkpw(password.encode("utf-8"), stored_hash.encode("utf-8")):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"error": "Invalid credentials"}
            )
            
        # Sign JWT
        payload = {
            "userId": str(row["id"]),
            "username": row["username"],
            "exp": datetime.utcnow() + timedelta(days=7)
        }
        token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")
        
        return {
            "token": token,
            "user": {
                "id": str(row["id"]),
                "username": row["username"],
                "color": row["color"],
                "score": row["score"]
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Server error"}
        )
