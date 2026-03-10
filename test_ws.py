import asyncio
import websockets

async def test():
    uri = "ws://localhost:8000/api/rooms/global-hackathon/ws?token=testtoken"
    try:
        async with websockets.connect(uri) as ws:
            print("Connected!")
            await ws.send("hello")
    except Exception as e:
        print(f"Failed: {e}")

asyncio.run(test())
