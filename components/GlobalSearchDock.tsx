'use client'

import { useRouter } from 'next/navigation'
import { ExpandingSearchDock } from '@/components/ui/expanding-search-dock-shadcnui'
import { useUI } from './UIProvider'
import { motion, AnimatePresence } from 'framer-motion'

export default function GlobalSearchDock() {
  const router = useRouter()
  const { searchDockPos, searchDockOpen, closeSearchDock } = useUI()

  // 검색 독이 닫혀있고 위치도 초기화되었다면 렌더링 최적화를 위해 숨김
  if (!searchDockOpen && !searchDockPos) return null

  return (
    <>
      {/* 바깥 영역 클릭 시 검색 독 닫기 백드롭 */}
      <AnimatePresence>
        {searchDockOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[199]"
            onClick={() => closeSearchDock()}
          />
        )}
      </AnimatePresence>

      <div 
      className="fixed z-[200] transition-all duration-300 pointer-events-auto"
      style={{
        left: searchDockPos ? searchDockPos.x : '50%',
        top: searchDockPos ? searchDockPos.y : 'auto',
        bottom: searchDockPos ? 'auto' : '2rem',
        transform: searchDockPos ? 'translate(-50%, -100%)' : 'translateX(-50%)',
        marginTop: searchDockPos ? '-12px' : '0'
      }}
    >
      <ExpandingSearchDock 
        onSearch={(q) => {
          router.push(`/worldcup?search=${encodeURIComponent(q)}`)
        }} 
      />
    </div>
    </>
  )
}
