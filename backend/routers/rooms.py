from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from typing import Dict, List
import json
from routers.auth import get_current_user
from database import get_db

router = APIRouter(tags=["Study Rooms"])

# In-memory state for study rooms
# Room structure:
# {
#   "room_1": {
#       "connections": [(websocket, username)],
#       "chat_history": [{"username": "Alice", "text": "Hi"}],
#       "timer": {"active": False, "timeLeft": 1500, "mode": "focus"}
#   }
# }
rooms: Dict[str, Dict] = {}

def get_room(room_id: str):
    if room_id not in rooms:
        rooms[room_id] = {
            "connections": [],
            "chat_history": [],
            "timer": {"active": False, "timeLeft": 1500, "mode": "focus"} # 25 mins
        }
    return rooms[room_id]

class ConnectionManager:
    async def connect(self, websocket: WebSocket, room_id: str, username: str):
        await websocket.accept()
        room = get_room(room_id)
        room["connections"].append((websocket, username))
        
        # Send current state
        await websocket.send_json({
            "type": "init",
            "chat_history": room["chat_history"][-50:], # Last 50 messages
            "timer": room["timer"],
            "users": [u for _, u in room["connections"]]
        })
        
        # Broadcast user joined
        await self.broadcast(room_id, {
            "type": "system",
            "text": f"{username} joined the room",
            "users": [u for _, u in room["connections"]]
        })

    def disconnect(self, websocket: WebSocket, room_id: str, username: str):
        if room_id in rooms:
            room = rooms[room_id]
            room["connections"] = [(ws, u) for ws, u in room["connections"] if ws != websocket]
            return room["connections"]
        return []

    async def broadcast(self, room_id: str, message: dict):
        if room_id in rooms:
            room = rooms[room_id]
            for ws, _ in room["connections"]:
                try:
                    await ws.send_json(message)
                except:
                    pass

manager = ConnectionManager()

@router.websocket("/api/rooms/{room_id}/ws")
async def websocket_endpoint(websocket: WebSocket, room_id: str, token: str = None):
    await websocket.accept()

    if not token:
        await websocket.close(code=1008)
        return

    from jose import jwt
    import os
    from database import SessionLocal
    from models import User as UserModel

    SECRET_KEY = os.getenv("SECRET_KEY", "edukno-super-secret-key-change-in-production-2024")
    ALGORITHM = "HS256"
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            await websocket.close(code=1008)
            return

        # Look up the actual username from the database
        db = SessionLocal()
        try:
            user_obj = db.query(UserModel).filter(UserModel.id == user_id).first()
            username = user_obj.username if user_obj else user_id
        finally:
            db.close()

    except Exception:
        await websocket.close(code=1008)
        return

    room = get_room(room_id)
    room["connections"].append((websocket, username))
    
    # Send current state
    await websocket.send_json({
        "type": "init",
        "chat_history": room["chat_history"][-50:],
        "timer": room["timer"],
        "users": [u for _, u in room["connections"]]
    })
    
    # Broadcast user joined
    await manager.broadcast(room_id, {
        "type": "system",
        "text": f"{username} joined the room",
        "users": [u for _, u in room["connections"]]
    })

    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                msg_type = msg.get("type")
                
                if msg_type == "chat":
                    chat_msg = {"username": username, "text": msg.get("text")}
                    room["chat_history"].append(chat_msg)
                    # Keep latest 100
                    if len(room["chat_history"]) > 100:
                        room["chat_history"].pop(0)
                        
                    await manager.broadcast(room_id, {
                        "type": "chat",
                        "message": chat_msg
                    })
                    
                elif msg_type == "timer_update":
                    # Client sends timer sync
                    room["timer"] = msg.get("timer")
                    await manager.broadcast(room_id, {
                        "type": "timer_sync",
                        "timer": room["timer"]
                    })
                    
            except json.JSONDecodeError:
                pass
                
    except WebSocketDisconnect:
        manager.disconnect(websocket, room_id, username)
        # Broadcast user left
        if room_id in rooms:
            await manager.broadcast(room_id, {
                "type": "system",
                "text": f"{username} left the room",
                "users": [u for _, u in rooms[room_id]["connections"]]
            })
