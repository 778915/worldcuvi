'use client'

import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="w-full py-8 border-t border-black/5 dark:border-white/5 bg-white dark:bg-gray-950 mt-auto">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-col items-center md:items-start">
          <Link 
            href="/" 
            className="text-xl font-bold mb-1 hover:scale-105 transition-transform"
            onClick={(e) => {
              if (window.location.pathname === '/') {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
          >
            <span className="text-gray-900 dark:text-white">World</span>
            <span style={{ color: 'var(--accent-primary)' }}>Cuvi</span>
          </Link>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            나만의 이상형 월드컵을 만들고 공유하세요.
          </p>
        </div>
        <div className="flex items-center gap-6 text-sm text-zinc-500 font-medium">
          <a href="#" className="hover:text-zinc-900 dark:hover:text-white transition-colors">이용약관</a>
          <a href="#" className="hover:text-zinc-900 dark:hover:text-white transition-colors">개인정보처리방침</a>
          <a href="#" className="hover:text-zinc-900 dark:hover:text-white transition-colors">고객센터</a>
        </div>
      </div>
      <div className="mt-8 text-center text-xs text-zinc-400">
        © {new Date().getFullYear()} WorldCuvi. All rights reserved.
      </div>
    </footer>
  )
}
