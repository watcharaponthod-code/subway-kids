import Link from "next/link";
import GameCanvas from "@/components/GameCanvas";

export default function GamePage() {
  return (
    <main className="min-h-screen flex flex-col bg-brand-dark">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-3 bg-brand-card border-b border-white/10">
        <Link href="/" className="text-gray-400 hover:text-white text-sm transition-colors">
          ← หน้าหลัก
        </Link>
        <span className="pixel-font text-brand-yellow text-xs">SUBWAY KIDS</span>
        <span className="text-gray-600 text-xs">F = Fullscreen</span>
      </header>

      {/* Game canvas */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="game-canvas-wrapper shadow-2xl rounded-xl overflow-hidden">
          <GameCanvas />
        </div>
      </div>

      {/* Controls reminder */}
      <footer className="text-center py-3 text-gray-600 text-xs">
        ลูกศรซ้าย/ขวา = เปลี่ยนเลน &nbsp;|&nbsp; R = เริ่มใหม่ &nbsp;|&nbsp; F = เต็มจอ
      </footer>
    </main>
  );
}
