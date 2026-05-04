import asyncio
import json
import base64
import cv2
import numpy as np
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from camera import PoseCamera

camera: PoseCamera | None = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global camera
    print("[SERVER] Initializing PoseCamera...")
    try:
        camera = PoseCamera()
        print("[SERVER] Camera initialized successfully (Waiting for frames from browser)")
    except Exception as e:
        print(f"[ERROR] Camera init failed: {e}")
    yield
    if camera:
        print("[SERVER] Releasing Camera...")
        camera.release()

app = FastAPI(title="Subway Kids Pose Server", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.websocket("/ws")
async def ws_pose(ws: WebSocket):
    await ws.accept()
    print("[WS] Client connected")
    try:
        while True:
            # Receive data from client
            data = await ws.receive_json()
            image_data = data.get("image")
            
            lane = 1
            jump = False
            image_b64 = None

            if image_data and camera:
                # Decode base64 image
                try:
                    header, encoded = image_data.split(",", 1) if "," in image_data else (None, image_data)
                    nparr = np.frombuffer(base64.b64decode(encoded), np.uint8)
                    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

                    if frame is not None:
                        lane, jump, processed_frame = camera.process_frame(frame)

                        # Encode back to Base64 for preview
                        _, buffer = cv2.imencode('.jpg', cv2.resize(processed_frame, (280, 210)), [cv2.IMWRITE_JPEG_QUALITY, 70])
                        image_b64 = base64.b64encode(buffer).decode('utf-8')
                except Exception as e:
                    print(f"[ERROR] Frame processing failed: {e}")

            await ws.send_json({
                "lane": lane,
                "jump": jump,
                "image": image_b64
            })
            
    except WebSocketDisconnect:
        print("[WS] Client disconnected")
    except Exception as e:
        print(f"[WS] Error: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
