"use client";

import React, { useRef, useState, useEffect, useCallback, Suspense } from "react";
import dynamic from "next/dynamic";
import { GameEngine3D, GameSnapshot } from "@/lib/gameEngine3D";

const Canvas = dynamic(() => import("@react-three/fiber").then((m) => m.Canvas), { ssr: false });
const Scene = dynamic(() => import("./SceneContent"), { ssr: false });

const WS_URL = "ws://localhost:8000/ws";

export default function Game3DPage() {
  const [engine] = useState(() => new GameEngine3D(() => {}));
  const [snap, setSnap] = useState<GameSnapshot>({ score: 0, lives: 3, status: "idle", lane: 1, playerY: 0 });
  const [wsConnected, setWsConnected] = useState(false);
  const [cameraImage, setCameraImage] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [mounted, setMounted] = useState(false);

  const connectWS = useCallback(() => {
    try {
      if (wsRef.current) wsRef.current.close();
      const ws = new WebSocket(WS_URL);
      ws.onopen = () => setWsConnected(true);
      ws.onclose = () => setWsConnected(false);
      ws.onerror = () => ws.close();
      ws.onmessage = (e) => {
        const data = JSON.parse(e.data);
        engine.setLane(data.lane);
        if (data.jump) engine.jump();
        if (data.image) setCameraImage(`data:image/jpeg;base64,${data.image}`);
      };
      wsRef.current = ws;
    } catch {
      setWsConnected(false);
    }
  }, [engine]);

  useEffect(() => {
    setMounted(true);
    engine.start();
    connectWS();

    // Setup Camera
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      } catch (err) {
        console.error("Camera access denied:", err);
      }
    };
    startCamera();

    // Frame Capture Loop
    const captureInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN && videoRef.current && canvasRef.current) {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = canvas.toDataURL("image/jpeg", 0.5);
          wsRef.current.send(JSON.stringify({ image: imageData }));
        }
      }
    }, 100); // 10 FPS for capture is enough for pose tracking

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") engine.setLane(0);
      if (e.key === "ArrowRight") engine.setLane(2);
      if (e.key === "ArrowUp" || e.key === " ") engine.jump();
      if ((e.key === "r" || e.key === "R") && engine.status === "over") engine.start();
    };

    window.addEventListener("keydown", onKey);
    const interval = setInterval(() => {
      setSnap({
        score: engine.score,
        lives: engine.lives,
        status: engine.status,
        lane: engine.lane,
        playerY: engine.playerY
      });
    }, 50);

    return () => {
      window.removeEventListener("keydown", onKey);
      clearInterval(interval);
      clearInterval(captureInterval);
      wsRef.current?.close();
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
    };
  }, [engine, connectWS]);

  if (!mounted) return <div className="w-full h-screen bg-black" />;

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden font-sans">
      {/* Hidden Camera Elements */}
      <video ref={videoRef} className="hidden" playsInline muted />
      <canvas ref={canvasRef} className="hidden" width={320} height={240} />

      <Suspense fallback={<div className="flex items-center justify-center h-full text-white text-2xl animate-pulse">LOADING 3D WORLD...</div>}>
        <Canvas camera={{ position: [0, 6, 12], fov: 45 }}>
          <Scene engine={engine} />
        </Canvas>
      </Suspense>

      {/* Camera Preview Overlay */}
      <div className="absolute bottom-6 right-6 w-64 h-48 bg-black/40 rounded-2xl border-2 border-white/20 overflow-hidden backdrop-blur-sm shadow-2xl">
        {cameraImage ? (
          <img src={cameraImage} className="w-full h-full object-cover" alt="Camera Feed" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-white/30 text-xs text-center p-4">
            <span className="mb-2 text-2xl">📷</span>
            WAITING FOR CAMERA...
          </div>
        )}
        <div className="absolute top-2 left-2 px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded uppercase tracking-tighter">LIVE</div>
      </div>

      {/* UI Overlay */}
      <div className="absolute top-0 left-0 w-full p-8 flex justify-between items-start pointer-events-none">
        <div className="bg-black/60 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-2xl">
          <div className="text-yellow-400 text-5xl font-black italic tracking-tighter">SCORE: {snap.score}</div>
          <div className="text-white text-2xl mt-2 font-bold opacity-90">LIVES: {"❤️".repeat(snap.lives)}</div>
        </div>

        <div className={`flex items-center gap-3 px-6 py-3 rounded-full backdrop-blur-xl border-2 shadow-xl transition-all duration-500 ${wsConnected ? 'bg-green-500/10 border-green-500/50 text-green-400' : 'bg-red-500/10 border-red-500/50 text-red-400'}`}>
          <div className={`w-3 h-3 rounded-full ${wsConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
          <span className="text-lg font-black tracking-widest">{wsConnected ? "POSE TRACKING ACTIVE" : "KEYBOARD FALLBACK"}</span>
        </div>
      </div>

      {snap.status === "over" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md z-50">
          <div className="bg-white/5 p-12 rounded-[40px] border border-white/10 text-center shadow-[0_0_100px_rgba(231,76,60,0.2)]">
            <h1 className="text-red-500 text-8xl font-black mb-2 tracking-tighter drop-shadow-2xl">GAME OVER</h1>
            <p className="text-yellow-400 text-4xl mb-12 font-bold italic tracking-tight">FINAL SCORE: {snap.score}</p>
            <button 
              onClick={() => engine.start()}
              className="group relative px-12 py-5 bg-white text-black font-black text-2xl rounded-full hover:bg-yellow-400 transition-all active:scale-95 shadow-2xl"
            >
              PLAY AGAIN
              <span className="block text-xs font-normal opacity-50 mt-1">Press 'R' to Restart</span>
            </button>
          </div>
        </div>
      )}

      <div className="absolute bottom-8 left-8 text-white/40 text-sm font-medium tracking-wide bg-black/20 px-4 py-2 rounded-lg backdrop-blur-sm">
        CONTROLS: STEP LEFT/RIGHT TO MOVE • JUMP TO JUMP
      </div>
    </div>
  );
}
