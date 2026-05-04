"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Game3D, GameSnapshot } from "@/lib/game3D";

const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000/ws";

export default function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const engineRef    = useRef<Game3D | null>(null);
  const wsRef        = useRef<WebSocket | null>(null);
  const videoRef     = useRef<HTMLVideoElement | null>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [snap, setSnap]       = useState<GameSnapshot>({ score: 0, lives: 3, status: "idle", lane: 1 });
  const [wsOk, setWsOk]       = useState(false);
  const [started, setStarted] = useState(false);

  // ── WebSocket ───────────────────────────────────────────────────────────────
  const connectWS = useCallback(() => {
    try {
      const ws = new WebSocket(WS_URL);
      ws.onopen    = () => setWsOk(true);
      ws.onclose   = () => { setWsOk(false); wsRef.current = null; };
      ws.onerror   = () => ws.close();
      ws.onmessage = (e) => {
        const { lane } = JSON.parse(e.data) as { lane: number };
        engineRef.current?.setLane(lane);
      };
      wsRef.current = ws;
    } catch { setWsOk(false); }
  }, []);

  // ── Init engine ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas    = canvasRef.current!;
    const container = containerRef.current!;

    // Match canvas to container
    const { width, height } = container.getBoundingClientRect();
    canvas.width  = width;
    canvas.height = height;

    const engine = new Game3D(canvas, (s) => {
      setSnap(s);
      if (s.status === "playing" && !started) setStarted(true);
    });
    engineRef.current = engine;
    engine.start();
    setStarted(true);
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
      if (wsRef.current?.readyState === WebSocket.OPEN && videoRef.current && captureCanvasRef.current) {
        const cvs = captureCanvasRef.current;
        const vid = videoRef.current;
        const ctx = cvs.getContext("2d");
        if (ctx) {
          ctx.drawImage(vid, 0, 0, cvs.width, cvs.height);
          const imageData = cvs.toDataURL("image/jpeg", 0.5);
          wsRef.current.send(JSON.stringify({ image: imageData }));
        }
      }
    }, 100);

    // Responsive resize
    const ro = new ResizeObserver((entries) => {
      const { width: w, height: h } = entries[0].contentRect;
      if (w > 0 && h > 0) engine.resize(w, h);
    });
    ro.observe(container);

    // Keyboard
    const onKey = (e: KeyboardEvent) => {
      const eng = engineRef.current;
      if (!eng) return;
      if (e.key === "ArrowLeft")  eng.setLane(0);
      if (e.key === "ArrowRight") eng.setLane(2);
      if (e.key === "ArrowUp")    eng.setLane(1);
      if ((e.key === "r" || e.key === "R") && eng.getStatus() === "over") { eng.start(); setSnap(s => ({ ...s, status: "playing" })); }
      if (e.key === "f" || e.key === "F") {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen();
        else document.exitFullscreen();
      }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      engine.dispose();
      wsRef.current?.close();
      ro.disconnect();
      window.removeEventListener("keydown", onKey);
      clearInterval(captureInterval);
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
    };
  }, [connectWS, started]);

  const hearts = "❤️".repeat(snap.lives) + "🖤".repeat(Math.max(0, 3 - snap.lives));

  return (
    <div ref={containerRef} className="relative w-full h-full bg-black select-none">
      {/* Hidden Camera Elements */}
      <video ref={videoRef} className="hidden" playsInline muted />
      <canvas ref={captureCanvasRef} className="hidden" width={320} height={240} />

      {/* Three.js canvas */}
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* ── HUD ─────────────────────────────────────────────────── */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-5 py-2
                      bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
        <span className="text-yellow-400 font-bold text-2xl tracking-wide">
          {snap.score.toLocaleString()}
        </span>
        <span className="text-xl">{hearts}</span>
        <span className="text-gray-400 text-sm">
          ×{(0.14 + snap.score / 14000).toFixed(2)}
        </span>
      </div>

      {/* Lane indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3 pointer-events-none">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full transition-all duration-150 ${
              i === snap.lane ? "bg-yellow-400 scale-125 shadow-[0_0_8px_#ffd700]" : "bg-white/20"
            }`}
          />
        ))}
      </div>

      {/* ── Game Over overlay ────────────────────────────────────── */}
      {snap.status === "over" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center
                        bg-black/75 backdrop-blur-sm gap-4">
          <h1 className="text-7xl font-black text-red-500 drop-shadow-lg tracking-wider">
            GAME OVER
          </h1>
          <p className="text-yellow-400 text-4xl font-bold">
            Score: {snap.score.toLocaleString()}
          </p>
          <button
            onClick={() => { engineRef.current?.start(); }}
            className="mt-4 px-10 py-4 bg-yellow-400 text-black font-black text-xl
                       rounded-2xl hover:scale-105 active:scale-95 transition-transform
                       shadow-[0_0_30px_rgba(255,215,0,0.5)]"
          >
            เล่นอีกครั้ง
          </button>
          <p className="text-gray-500 text-sm mt-2">หรือกด R บนคีย์บอร์ด</p>
        </div>
      )}

      {/* ── Camera status badge ──────────────────────────────────── */}
      <div className="absolute top-14 right-3 flex items-center gap-2
                      bg-black/60 rounded-full px-3 py-1 text-xs">
        <span className={`w-2 h-2 rounded-full ${wsOk ? "bg-green-400 animate-pulse" : "bg-gray-600"}`} />
        <span className={wsOk ? "text-green-400" : "text-gray-500"}>
          {wsOk ? "Camera ON" : "Keyboard only"}
        </span>
        {!wsOk && (
          <button onClick={connectWS} className="ml-1 text-blue-400 hover:text-blue-300 underline pointer-events-auto">
            connect
          </button>
        )}
      </div>

      {/* Mobile touch controls */}
      <div className="absolute bottom-16 inset-x-0 flex justify-between px-4 md:hidden pointer-events-auto">
        {(["←", "↑", "→"] as const).map((label, i) => (
          <button
            key={label}
            onTouchStart={() => engineRef.current?.setLane(i)}
            className="bg-white/10 active:bg-white/30 text-white text-3xl w-20 h-20 rounded-2xl"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
