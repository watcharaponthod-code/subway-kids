"""
server/main.py — FastAPI WebSocket server
Streams lane data (0/1/2) from MediaPipe pose detection to the Next.js game.

Start: uvicorn main:app --host 0.0.0.0 --port 8000
"""

import asyncio
import json
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from camera import PoseCamera


camera: PoseCamera | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global camera
    camera = PoseCamera()
    if not camera.active:
        print("[WARN] No webcam found — WebSocket will return lane=1 (center)")
    yield
    if camera:
        camera.release()


app = FastAPI(title="Subway Kids Pose Server", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok", "camera": camera.active if camera else False}


@app.websocket("/ws")
async def ws_pose(ws: WebSocket):
    await ws.accept()
    print("[WS] Client connected")
    try:
        while True:
            lane = camera.update() if camera else 1
            await ws.send_text(json.dumps({"lane": lane}))
            await asyncio.sleep(1 / 30)   # 30 fps
    except WebSocketDisconnect:
        print("[WS] Client disconnected")
    except Exception as e:
        print(f"[WS] Error: {e}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
