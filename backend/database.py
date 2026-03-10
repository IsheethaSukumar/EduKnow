from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker
import os
import platform

# Determine the app data folder based on the OS
if platform.system() == "Windows":
    app_data_path = os.path.join(os.environ.get("LOCALAPPDATA", os.environ.get("APPDATA", ".")), "EduKno")
else:
    app_data_path = os.path.expanduser("~/.edukno")

# Create the folder if it doesn't exist
if not os.path.exists(app_data_path):
    os.makedirs(app_data_path)

# Default to sqlite in the app data folder if not overridden by environment
# Ensure we use forward slashes for the SQLite URL even on Windows
db_path = os.path.join(app_data_path, "edukno.db").replace("\\", "/")
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{db_path}")

engine = create_engine(
    DATABASE_URL, 
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
