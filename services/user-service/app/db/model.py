from beanie import Document
from pydantic import EmailStr, Field
from typing import Optional
from datetime import datetime
import uuid


class User(Document):
    """Represent a user in database"""

    id: uuid.UUID = Field(default_factory=uuid.uuid4, alias="_id")
    email: EmailStr = Field(unique=True)

    full_name: Optional[str] = None
    password: Optional[str] = None
    avatar_url: Optional[str] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    provider:Optional[str] = None
    
    class Settings:
        name = "users"
