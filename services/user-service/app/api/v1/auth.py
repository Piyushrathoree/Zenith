from fastapi import APIRouter, HTTPException, status, Request, Depends
from app.core.sso import sso_providers
from app.core.security import (
    get_hash_password,
    verify_password,
    generate_token,
    get_current_user,
)
from ...schema.user import Register
from ...schema.user import Login
from ...schema.user import UpdateUser
from ...db.model import User
from uuid import UUID
from pydantic import EmailStr
from ...crud.user import find_or_create_user
from datetime import datetime

router = APIRouter()


@router.post("/auth/register", name="auth:register")
async def register(user: Register):
    """auth route for register user through jwt"""

    existing_user = await User.find_one(User.email == user.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists.",
        )

    hashed_password = get_hash_password(user.password)

    if not user.avatar_url:
        user.avatar_url = ""

    token = generate_token({"email": user.email})
    new_user = User(
        full_name=user.name,
        email=user.email,
        password=hashed_password,
        avatar_url=user.avatar_url,
    )
    await new_user.save()

    return {
        "user": new_user,
        "token": token,
        "message": "user created successfully",
        "success": "True",
    }


@router.post("/auth/login", name="auth:login")
async def login(user: Login):
    """auth route for login"""

    existing_user = await User.find_one(User.email == user.email)
    if not existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="user not found",
        )

    password = verify_password(user.password, existing_user.password)
    print(password)
    if not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="username or password is wrong",
        )

    token = generate_token({"email": user.email})
    if not token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="token not generated",
        )

    return {
        "user": existing_user,
        "token": token,
        "message": "user created successfully",
        "success": "True",
    }


@router.get("/auth/{user_id}", name="auth:id")
async def get_user_by_id(
    user_id: UUID,
) -> User:
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="user not found",
        )
    user = await User.get(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="user not found ",
        )

    return user


@router.get("/auth", name="auth:email")
async def get_user_by_email(email: EmailStr) -> User:
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="email not found",
        )
    user = await User.find_one(User.email == email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="user not found",
        )

    return user


@router.get("/auth/{provider}/login", name="auth:sso_login")
async def sso_login(provider: str):
    """Redirects the user to the provider's login page."""
    if provider not in sso_providers:
        raise HTTPException(status_code=404, detail="Provider not supported")

    sso_client = sso_providers[provider]
    return await sso_client.get_login_redirect()


"""route for saving the SSO user"""


@router.get("/auth/{provider}/callback", name="auth:callback")
async def sso_callback(provider: str, request: Request):
    """
    Handles the callback from the SSO provider.
    """
    if provider not in sso_providers:
        raise HTTPException(status_code=404, detail="Provider not supported")

    sso_client = sso_providers[provider]

    try:
        user_info = await sso_client.verify_and_process(request)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {e}",
        )

    db_user = await find_or_create_user(
        email=user_info.email, full_name=user_info.display_name, sso_provider=provider
    )

    token = generate_token({"email": db_user.email})

    return {
        "user": db_user,
        "token": token,
        "message": "user authenticated successfully",
        "success": "True",
    }


@router.put("/auth/update/{user_id}", name="auth:update_user")
async def update_user(user_data: UpdateUser, request: Request, user_id: UUID):
    """Update user profile (requires authentication)"""

    # Find the existing user
    existing_user = await User.get(user_id)
    if not existing_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    # Prepare update data
    update_data = {}

    if user_data.full_name is not None:
        update_data["full_name"] = user_data.full_name

    if user_data.avatar_url is not None:
        update_data["avatar_url"] = user_data.avatar_url

    if user_data.password is not None:
        update_data["password"] = get_hash_password(user_data.password)

    # Add updated timestamp
    update_data["updated_at"] = datetime.utcnow()

    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid fields provided for update",
        )

    # Update the user
    await existing_user.update({"$set": update_data})

    # Fetch the updated user
    updated_user = await User.find_one(User.email == existing_user.email)

    return {
        "user": updated_user,
        "message": "User updated successfully",
        "success": "True",
    }


@router.get("/users", name="admin:all_users")
async def get_all_users():
    return await User.find_many().to_list()
