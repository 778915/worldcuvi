'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ExpandingSearchDock } from '@/components/ui/expanding-search-dock-shadcnui'
import { useUI } from './UIProvider'
import { useAccent } from './ThemeProvider'
import { motion, AnimatePresence } from 'framer-motion'

export default function GlobalSearchDock() {
  const router = useRouter()
  const { searchDockOpen, closeSearchDock } = useUI()
  const { applyGroupTheme } = useAccent()

  const [inputValue, setInputValue] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])

  // 디바운스 로직: 타자를 멈추고 200ms 뒤에 API 호출
  useEffect(() => {
    if (inputValue.length < 1) {
      setSuggestions([])
      return
    }

    const timer = setTimeout(async () => {
      const res = await fetch(`/api/search/autocomplete?q=${encodeURIComponent(inputValue)}`)
      const data = await res.json()
      setSuggestions(data)
    }, 200)

    return () => clearTimeout(timer)
  }, [inputValue])

  const handleSearch = async (query: string) => {
    if (!query.trim()) return

    // AI 테마 적용 (이전 로직 유지)
    fetch('/api/ai/intent', { method: 'POST', body: JSON.stringify({ q: query }) })
      .then(res => res.json())
      .then(data => data.theme && applyGroupTheme(data.theme.primary_color, data.theme.secondary_color))

    router.push(`/worldcup?search=${encodeURIComponent(query)}`)
    closeSearchDock()
    setInputValue('')
  }

  if (!searchDockOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-[199] bg-black/40 backdrop-blur-sm" onClick={closeSearchDock} />

      <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[200] w-full max-w-md px-4">
        {/* 추천 검색어 팝업 */}
        <AnimatePresence>
          {suggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mb-4 bg-zinc-900/90 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl"
            >
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSearch(s)}
                  className="w-full px-6 py-4 text-left text-zinc-300 hover:bg-white/10 hover:text-white transition-colors border-b border-white/5 last:border-0 flex items-center gap-3"
                >
                  <span className="text-yellow-500/50">#</span>
                  <span className="font-medium">{s}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <ExpandingSearchDock
          value={inputValue}
          onChange={(v) => setInputValue(v)}
          onSearch={handleSearch}
        />
      </div>
    </>
  )
}