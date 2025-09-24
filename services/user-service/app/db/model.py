from beanie import Document
from pydantic import EmailStr, Field
from typing import Optional
from datetime import datetime


class User(Document):
    """Represent a user in database"""
    
    email: EmailStr
    full_name: Optional[str] = None
    password: str

    avatar_url : Optional[str] = None
    
    created_at : datetime = Field(default_factory=datetime.utcnow)
    updated_at : datetime = Field(default_factory=datetime.utcnow)

    class Settings :
        name = "users"