import os
import ssl
from dotenv import load_dotenv
import asyncpg

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# Global pool instance
pool = None

async def get_db_pool():
    global pool
    if pool is None:
        if not DATABASE_URL:
            raise ValueError("DATABASE_URL environment variable is not set")
        
        ssl_context = None
        # Support remote SSL connections if not localhost
        if "localhost" not in DATABASE_URL and "127.0.0.1" not in DATABASE_URL:
            ssl_context = ssl.create_default_context()
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE
        
        pool = await asyncpg.create_pool(
            dsn=DATABASE_URL,
            ssl=ssl_context,
            min_size=1,
            max_size=10
        )
    return pool

async def get_db():
    p = await get_db_pool()
    async with p.acquire() as connection:
        yield connection
