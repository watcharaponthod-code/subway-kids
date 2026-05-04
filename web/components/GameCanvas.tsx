"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { GameEngine, GameSnapshot } from "@/lib/gameEngine";

const WS_URL = "ws://localhost:8000/ws";

export default function GameCanvas() {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const engineRef  = useRef<GameEngine | null>(null);
  const wsRef      = useRef<WebSocket | null>(null);
  const [snap, setSnap] = useState<GameSnapshot>({ score: 0, lives: 3, status: "idle", lane: 1 });
  const [wsConnected, setWsConnected] = useState(false);

  // ── WebSocket (pose camera) ─────────────────────────────────────────────────
  const connectWS = useCallback(() => {
    try {
      const ws = new WebSocket(WS_URL);
      ws.onopen    = () => setWsConnected(true);
      ws.onclose   = () => { setWsConnected(false); wsRef.current = null; };
      ws.onerror   = () => ws.close();
      ws.onmessage = (e) => {
        const { lane } = JSON.parse(e.data) as { lane: number };
        engineRef.current?.setLane(lane);
      };
      wsRef.current = ws;
    } catch {
      setWsConnected(false);
    }
  }, []);

  // ── Game init ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current!;
    const engine = new GameEngine(canvas, setSnap);
    engineRef.current = engine;
    engine.start();
    connectWS();

    const onKey = (e: KeyboardEvent) => {
      const eng = engineRef.current;
      if (!eng) return;
      if (e.key === "ArrowLeft")  eng.setLane(0);
      if (e.key === "ArrowRight") eng.setLane(2);
      if (e.key === "ArrowUp")    eng.setLane(1);
      if ((e.key === "r" || e.key === "R") && eng.getStatus() === "over") eng.start();
      if (e.key === "f" || e.key === "F") {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen();
        else document.exitFullscreen();
      }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      engine.stop();
      wsRef.current?.close();
      window.removeEventListener("keydown", onKey);
    };
  }, [connectWS]);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="relative w-full h-full bg-black">
      <canvas ref={canvasRef} width={1280} height={720} className="w-full h-full" />

      {/* WS status badge */}
      <div className="absolute top-3 right-3 flex items-center gap-2 bg-black/60 rounded-full px-3 py-1 text-xs">
        <span className={`w-2 h-2 rounded-full ${wsConnected ? "bg-green-400 animate-pulse" : "bg-gray-600"}`} />
        <span className={wsConnected ? "text-green-400" : "text-gray-500"}>
          {wsConnected ? "Camera ON" : "Keyboard mode"}
        </span>
        {!wsConnected && (
          <button
            onClick={connectWS}
            className="ml-1 text-blue-400 hover:text-blue-300 underline"
          >
            connect
          </button>
        )}
      </div>

      {/* Mobile / touch lane buttons */}
      <div className="absolute bottom-14 left-0 right-0 flex justify-between px-4 md:hidden">
        {(["←", "↑", "→"] as const).map((label, i) => (
          <button
            key={label}
            onTouchStart={() => engineRef.current?.setLane(i)}
            className="bg-white/10 active:bg-white/30 text-white text-3xl w-20 h-20 rounded-2xl select-none"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
