import sys
import os

# Add the current directory to sys.path
sys.path.append(os.getcwd())

try:
    from database import get_db
    print("Import database.get_db: SUCCESS")
except ImportError as e:
    print(f"Import database.get_db: FAILED - {e}")

try:
    from models import User
    print("Import models.User: SUCCESS")
except ImportError as e:
    print(f"Import models.User: FAILED - {e}")

try:
    from routers.auth import get_current_user
    print("Import routers.auth.get_current_user: SUCCESS")
except ImportError as e:
    print(f"Import routers.auth.get_current_user: FAILED - {e}")

try:
    from routers.assignments import router
    print("Import routers.assignments.router: SUCCESS")
except ImportError as e:
    print(f"Import routers.assignments.router: FAILED - {e}")
