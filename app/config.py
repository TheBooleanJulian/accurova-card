import os

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass


class Settings:
    DATABASE_URL: str = os.environ.get("DATABASE_URL", "")
    STATS_USERNAME: str = os.environ.get("STATS_USERNAME", "julian")
    STATS_PASSWORD: str = os.environ.get("STATS_PASSWORD", "changeme")
    PORT: int = int(os.environ.get("PORT", "8080"))


settings = Settings()
