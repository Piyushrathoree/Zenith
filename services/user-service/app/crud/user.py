from pydantic import EmailStr
from ..db.model import User


async def find_or_create_user(email: EmailStr, full_name: str, provider: str):
    user = await User.find_one(User.email == email)
    if not user:
        new_user = User(full_name=full_name, email=email, provider=provider)
        await new_user.save()

    return user
