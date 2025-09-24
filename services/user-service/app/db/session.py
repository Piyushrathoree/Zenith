from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.core.config import settings
from .model import User 

async def init_db():
    """ Initializing  the database connection and Beanie ODM """

    client = AsyncIOMotorClient(settings.MONGO_URI)
    
    await init_beanie(
        database=client.get_default_database(),
        document_models=[User]
    )
    print("Database connected Successfully")