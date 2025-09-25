from pydantic import EmailStr , BaseModel

class User(BaseModel):
    name : str 
    email : EmailStr
    password : str 
    avatar_url: str | None = None
    