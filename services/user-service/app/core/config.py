from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    GOOGLE_CLIENT_ID : str
    GOOGLE_CLIENT_SECRET : str
    
    GITHUB_CLIENT_ID : str 
    GITHUB_CLIENT_SECRET : str
    
    SECRET_KEY : str 
    MONGO_URI : str
    
    class Config:
        env_file = ".env"
        
        
settings = Settings()