from pydantic import EmailStr, BaseModel


class Register(BaseModel):
    name: str
    email: EmailStr
    password: str
    avatar_url: str | None = None


class Login(BaseModel):
    email: EmailStr
    password: str


class UpdateUser(BaseModel):
    full_name: str | None = None
    avatar_url: str | None = None
    password: str | None = None
