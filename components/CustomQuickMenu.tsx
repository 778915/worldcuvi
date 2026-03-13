'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowUpToLine, ArrowDownToLine, Search } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useUI } from './UIProvider'

export default function CustomQuickMenu() {
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null)
  const { openSearchDock, openLoginModal } = useUI()
  const pathname = usePathname()

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      if (document.body.classList.contains('popover-open')) return
      e.preventDefault()
      setMenuPos({ x: e.clientX, y: e.clientY })
    }

    const handleClick = () => {
      setMenuPos(null)
    }

    window.addEventListener('contextmenu', handleContextMenu)
    window.addEventListener('click', handleClick)

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu)
      window.removeEventListener('click', handleClick)
    }
  }, [])

  const handleSearchClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    let filterQuery = ''
    let placeholder = '어떤 월드컵을 찾으시나요?'

    if (pathname === '/popular') {
      filterQuery = 'minPlays:10000 likes:500 '
      placeholder = '레전드 인기 월드컵 검색...'
    } else if (pathname === '/new') {
      filterQuery = 'withinDays:30 '
      placeholder = '따끈따끈한 신작 검색...'
    } else if (pathname.startsWith('/genre/')) {
      const genre = decodeURIComponent(pathname.split('/')[2])
      filterQuery = `genre:${genre} `
      placeholder = `'${genre}' 장르 작품 검색...`
    }
    
    if (menuPos) {
      openSearchDock(filterQuery, placeholder, menuPos)
    }
    setMenuPos(null)
  }

  const scrollToTop = (e: React.MouseEvent) => {
    e.stopPropagation()
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setMenuPos(null)
  }

  const scrollToBottom = (e: React.MouseEvent) => {
    e.stopPropagation()
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
    setMenuPos(null)
  }

  const radius = 70 // 허브와 노드 간의 거리

  const items = [
    { icon: <ArrowUpToLine className="w-4 h-4" />, label: 'TOP', onClick: scrollToTop, angle: -90 },
    { icon: <Search className="w-4 h-4" />, label: 'SEARCH', onClick: handleSearchClick, angle: 0 },
    { icon: <ArrowDownToLine className="w-4 h-4" />, label: 'BOTTOM', onClick: scrollToBottom, angle: 90 },
  ]

  return (
    <AnimatePresence>
      {menuPos && (
        <div 
          className="fixed inset-0 z-[9999]" 
          onClick={() => setMenuPos(null)}
          onContextMenu={(e) => {
            e.preventDefault()
            setMenuPos(null)
          }}
        >
          <div 
            style={{
              position: 'absolute',
              left: menuPos.x,
              top: menuPos.y,
            }}
          >
            {/* 중앙 허브 */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="absolute -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-zinc-900 border border-transparent shadow-lg flex items-center justify-center z-10 pointer-events-none"
              style={{
                borderColor: 'var(--accent-1)',
                boxShadow: '0 0 15px color-mix(in srgb, var(--accent-1) 30%, transparent)'
              }}
            >
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--accent-1)' }} />
            </motion.div>

            {/* 주변 노드 트랙 */}
            {items.map((item, index) => {
              const radian = item.angle * (Math.PI / 180)
              const x = Math.cos(radian) * radius
              const y = Math.sin(radian) * radius

              return (
                <motion.button
                  key={item.label}
                  initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                  animate={{ x, y, scale: 1, opacity: 1 }}
                  exit={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                  transition={{ 
                    type: 'spring', 
                    stiffness: 400, 
                    damping: 20,
                    delay: index * 0.03 
                  }}
                  onClick={item.onClick}
                  className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center group"
                >
                  <div 
                    className="w-11 h-11 rounded-full bg-zinc-900 border border-zinc-700 shadow-xl flex items-center justify-center transition-all duration-200 group-hover:scale-110"
                    style={{
                      color: 'var(--accent-1)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--accent-1)'
                      e.currentTarget.style.boxShadow = '0 0 20px color-mix(in srgb, var(--accent-1) 50%, transparent)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#3f3f46' // zinc-700
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    {item.icon}
                  </div>
                  <span 
                    className="absolute top-12 text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap px-1.5 py-0.5 rounded-md bg-zinc-900/80 backdrop-blur-sm"
                    style={{ color: 'var(--accent-2)' }}
                  >
                    {item.label}
                  </span>
                </motion.button>
              )
            })}
          </div>
        </div>
      )}
    </AnimatePresence>
  )
}
