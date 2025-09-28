import bcrypt
from jose import jwt, JWTError
from fastapi import HTTPException , status
from datetime import datetime, timedelta, timezone
from .config import settings

ALGORITHM = "HS256"


def get_hash_password(password: str):
    salt = bcrypt.gensalt(rounds=15)
    password_bytes = password.encode("utf-8")
    hash_password = bcrypt.hashpw(password_bytes, salt)

    return hash_password

def verify_password(password : str , hash_password:str):
    password_bytes = password.encode("utf-8")
    hash_password_bytes = hash_password.encode("utf-8")

    return bcrypt.checkpw(password_bytes , hash_password_bytes)


def generate_token(data: dict):
    try:
        expire = datetime.now(timezone.utc) + timedelta(days=settings.TOKEN_EXPIRATION)
        to_encode = data.copy() 
        to_encode.update({"exp": expire})
        return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    except JWTError:    
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists.",
        )

def get_current_user(token:str):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return user_id
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
