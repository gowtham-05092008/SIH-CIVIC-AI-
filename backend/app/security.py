import os
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError

SECRET = os.getenv("JWT_SECRET", "development-only-change-me")
ALGORITHM = "HS256"
EXPIRE_MINUTES = 60 * 24

def create_token(user_id: int, role: str):
    payload = {
        "sub": str(user_id),
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=EXPIRE_MINUTES),
    }
    return jwt.encode(payload, SECRET, algorithm=ALGORITHM)

def decode_token(token: str):
    try:
        return jwt.decode(token, SECRET, algorithms=[ALGORITHM])
    except JWTError:
        return None
