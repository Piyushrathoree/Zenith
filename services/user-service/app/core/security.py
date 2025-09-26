import bcrypt 
from fastapi import HTTPException ,status
from  

def get_hash_password(password:str):
    
    if not password:
        raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Password cannot be empty.",
        )
        
    salt = bcrypt.gensalt(rounds=15)
    hash_password = bcrypt.hashpw(password , salt)
    
    return hash_password


def generate_access_token(email:str):
    