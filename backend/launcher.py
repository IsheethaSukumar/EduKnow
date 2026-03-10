import uvicorn
from main import app
import sys
import os

if __name__ == "__main__":
    # Support for relative paths if bundled as a single file
    if getattr(sys, 'frozen', False):
        base_path = sys._MEIPASS
    else:
        base_path = os.path.dirname(os.path.abspath(__file__))

    # Run the app
    # We use a fixed port (8000) for now, matching the frontend proxy setting
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")
