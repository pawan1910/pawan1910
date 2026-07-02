import os
from fastapi import Request
import jwt

JWT_SECRET = os.getenv("JWT_SECRET", "hex-territory-secret-2024-xyz789abc")

class AuthException(Exception):
    def __init__(self, status_code: int, error_message: str):
        self.status_code = status_code
        self.error_message = error_message

async def require_auth(request: Request) -> dict:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise AuthException(401, "Unauthorized")
    
    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload  # Returns dict containing 'userId' and 'username'
    except Exception:
        raise AuthException(401, "Invalid token")
