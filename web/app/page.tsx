import Link from "next/link";

const HOW_TO_PLAY = [
  { icon: "⬅️", text: "ยืนด้านซ้าย → ตัวละครวิ่งซ้าย" },
  { icon: "➡️", text: "ยืนด้านขวา → ตัวละครวิ่งขวา" },
  { icon: "🧍", text: "ยืนกลาง → อยู่เลนกลาง" },
  { icon: "⌨️", text: "ไม่มีกล้อง? ใช้ลูกศรบนคีย์บอร์ด" },
];

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12 gap-10">
      {/* Title */}
      <div className="text-center">
        <h1 className="pixel-font text-4xl md:text-6xl text-brand-yellow drop-shadow-[0_0_30px_rgba(255,215,0,0.6)] mb-3">
          SUBWAY
        </h1>
        <h1 className="pixel-font text-4xl md:text-6xl text-brand-purple drop-shadow-[0_0_30px_rgba(83,82,237,0.6)]">
          KIDS
        </h1>
        <p className="mt-4 text-gray-400 text-lg">ขยับตัวซ้าย-ขวาเพื่อหลบสิ่งกีดขวาง!</p>
      </div>

      {/* Runner illustration */}
      <div className="flex gap-6 text-6xl select-none animate-bounce">
        <span>🏃</span>
        <span className="text-brand-red">🚧</span>
        <span>🏃</span>
      </div>

      {/* Start button */}
      <Link
        href="/game"
        className="pixel-font text-lg bg-brand-yellow text-black px-10 py-5 rounded-2xl
                   hover:scale-105 active:scale-95 transition-transform
                   shadow-[0_0_40px_rgba(255,215,0,0.4)]"
      >
        START GAME
      </Link>

      {/* How to play */}
      <div className="bg-brand-card rounded-2xl p-6 max-w-md w-full">
        <h2 className="pixel-font text-sm text-brand-yellow mb-5 text-center">HOW TO PLAY</h2>
        <ul className="flex flex-col gap-3">
          {HOW_TO_PLAY.map((item) => (
            <li key={item.text} className="flex items-center gap-3 text-gray-200 text-sm">
              <span className="text-2xl w-8 text-center">{item.icon}</span>
              <span>{item.text}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Setup note */}
      <p className="text-gray-600 text-xs text-center max-w-sm">
        เปิด Python server ก่อนเล่น:{" "}
        <code className="text-gray-400 bg-black/40 px-1 rounded">
          cd server && python main.py
        </code>
      </p>
    </main>
  );
}
