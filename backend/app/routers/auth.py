import os
import jwt
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from google.oauth2 import id_token
from google.auth.transport import requests
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from db.database import get_db
from db.models import User

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

class GoogleAuthRequest(BaseModel):
    token: str

@router.post("/google")
async def googleAuth(payload: GoogleAuthRequest, db: AsyncSession = Depends(get_db)):
    google_client_id = os.getenv("GOOGLE_CLIENT_ID")
    jwt_secret = os.getenv("JWT_SECRET")
    
    if not google_client_id:
        raise ValueError("GOOGLE_CLIENT_ID not set")
    if not jwt_secret:
        raise ValueError("JWT_SECRET not set")
    if not payload.token:
        raise HTTPException(400, "Google token is required")

    try:
        token_info = id_token.verify_oauth2_token(
            payload.token, requests.Request(), google_client_id
        )
    except Exception as e:
        raise HTTPException(400, f"Invalid Google token: {e}")

    email = token_info.get("email")
    name = token_info.get("name")
    google_id = token_info.get("sub")
    picture = token_info.get("picture")

    if not email:
        raise HTTPException(400, "Invalid Google token payload")

    stmt = select(User).where(User.email == email)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        user = User(email=email, name=name, google_id=google_id)
        db.add(user)
        await db.commit()
        await db.refresh(user)

    app_token = jwt.encode(
        {"userId": user.id, "email": user.email},
        jwt_secret,
        algorithm="HS256",
    )

    return {
        "message": "Login successful",
        "token": app_token,
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "image": picture,
        },
    }
