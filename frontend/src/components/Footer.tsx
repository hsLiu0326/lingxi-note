import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-white">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 64 64">
              <defs>
                <linearGradient id="footer-icon" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ec4899"/>
                  <stop offset="100%" stopColor="#db2777"/>
                </linearGradient>
              </defs>
              <rect width="64" height="64" rx="14" fill="url(#footer-icon)"/>
              <path d="M32 12 L38 28 L32 52 L26 28 Z" fill="#fff" opacity="0.95"/>
            </svg>
            <span className="font-semibold text-gray-800">灵犀笔记</span>
          </div>

          <div className="flex items-center gap-6 text-sm text-gray-400">
            <Link href="/" className="hover:text-gray-600 transition-colors">首页</Link>
            <Link href="/generate" className="hover:text-gray-600 transition-colors">文案生成</Link>
            <Link href="/subscribe" className="hover:text-gray-600 transition-colors">会员</Link>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-gray-400">
          <p>© {new Date().getFullYear()} 灵犀笔记 — 让 AI 帮你写出爆款文案</p>
          <p>Built with Next.js &amp; FastAPI</p>
        </div>
      </div>
    </footer>
  );
}
