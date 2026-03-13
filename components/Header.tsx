'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Bell, Trophy, Flame, LogIn, ChevronDown, Star, Gift, Grid, Zap, X, Trash, ArrowUpRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from './AuthProvider'
import { useUI } from './UIProvider'
import ProfileDropdown from './ProfileDropdown'
import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { MOCK_NOTIFICATIONS, MOCK_BOOSTERS, Notification, Booster } from '@/constants/mockData'
import BoosterButton from './BoosterButton'
import BoosterModal from './BoosterModal'
import './HeaderAnimations.css'

const NAV_LINKS = [
  { href: '/popular', label: '인기', icon: Flame },
  { href: '/new', label: '신규', icon: Star },
]

export default function Header() {
  const pathname = usePathname()
  const { user, profile, loading } = useAuth()
  const { openLoginModal } = useUI()

  const [activePopover, setActivePopover] = useState<'none' | 'genres' | 'notifications' | 'gifts' | 'profile' | 'boosters'>('none')
  const [popoverPos, setPopoverPos] = useState({ leftEdge: 0, rightEdge: 0, y: 0 })
  const router = useRouter()

  const [mockNotis, setMockNotis] = useState<(Notification & { isRead?: boolean })[]>(MOCK_NOTIFICATIONS.map(n => ({ ...n, isRead: false })))
  const [mockBoosters, setMockBoosters] = useState<(Booster & { isRead?: boolean })[]>(MOCK_BOOSTERS.map(b => ({ ...b, isRead: false, isNew: true })))
  const [selectedBooster, setSelectedBooster] = useState<Booster | null>(null)
  const [sideViewUrl, setSideViewUrl] = useState<string | null>(null)

  const [notiDeleteModeId, setNotiDeleteModeId] = useState<number | null>(null)
  const [boosterDeleteModeId, setBoosterDeleteModeId] = useState<number | null>(null)

  const [isAutoRinging, setIsAutoRinging] = useState(false)
  const [isBoosterAutoRinging, setIsBoosterAutoRinging] = useState(false)
  const [ringKey, setRingKey] = useState(0)
  const isHoveredNoti = activePopover === 'notifications'

  // 지연 타이머 상태
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleMouseEnter = (e: React.MouseEvent, type: 'genres' | 'notifications' | 'gifts' | 'profile' | 'boosters') => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current)
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setPopoverPos({ leftEdge: rect.left, rightEdge: rect.right, y: rect.bottom + 8 })
    setActivePopover(type)
  }

  const handleMouseLeave = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setActivePopover('none')
    }, 250) // 0.25초 대기
  }

  const handlePopoverEnter = () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current)
  }

  // Side View Width (LocalStorage)
  const [sideViewWidth, setSideViewWidth] = useState<number>(800)
  useEffect(() => {
    const savedWidth = localStorage.getItem('worldcuvi_sideview_width')
    if (savedWidth) {
      setSideViewWidth(parseInt(savedWidth, 10))
    } else {
      setSideViewWidth(window.innerWidth * (2 / 3))
    }
  }, [])

  useEffect(() => {
    if (activePopover !== 'none') {
      document.body.classList.add('popover-open')
    } else {
      document.body.classList.remove('popover-open')
      setNotiDeleteModeId(null)
      setBoosterDeleteModeId(null)
    }
    return () => document.body.classList.remove('popover-open')
  }, [activePopover])

  // 자동 링잉 설정 (5초 주기)
  useEffect(() => {
    const unreadNotis = mockNotis.length
    const unreadBoosters = mockBoosters.filter(b => !b.isRead).length

    if (unreadNotis === 0 && unreadBoosters === 0) {
      setIsAutoRinging(false)
      setIsBoosterAutoRinging(false)
      return
    }

    const interval = setInterval(() => {
      // 알림 종 흔들림 (우선)
      if (unreadNotis > 0) {
        setIsAutoRinging(true)
        setRingKey(prev => prev + 1)
        setTimeout(() => setIsAutoRinging(false), 900)
      }

      // 부스터 번개 흔들림 (0.5초 뒤)
      if (unreadBoosters > 0) {
        setTimeout(() => {
          setIsBoosterAutoRinging(true)
          setTimeout(() => setIsBoosterAutoRinging(false), 900)
        }, 500)
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [mockNotis.length, mockBoosters.filter(b => !b.isRead).length])

  const [isResizing, setIsResizing] = useState(false)
  const isDraggingNoti = useRef(false)

  const handleDismissNoti = (e: React.SyntheticEvent, id: number) => {
    e.preventDefault()
    e.stopPropagation()
    setMockNotis((prev) => prev.filter((n) => n.id !== id))
  }

  const handleDismissBooster = (e: React.MouseEvent, id: number) => {
    e.preventDefault()
    e.stopPropagation()
    setMockBoosters((prev) => prev.filter((b) => b.id !== id))
  }

  const togglePopover = (e: React.MouseEvent, type: 'genres' | 'notifications' | 'gifts' | 'profile' | 'boosters') => {
    if (activePopover === type) {
      setActivePopover('none')
    } else {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      setPopoverPos({ leftEdge: rect.left, rightEdge: rect.right, y: rect.bottom + 8 })
      setActivePopover(type)
    }
  }

  const closePopover = () => setActivePopover('none')

  const avatarSrc = profile?.profile_img || user?.user_metadata?.avatar_url || null
  const nickname = profile?.nickname || user?.user_metadata?.full_name || user?.email?.split('@')[0] || '유저'

  const getBoosterGridClass = (count: number) => {
    if (count <= 2) return 'grid-cols-1 gap-3'
    if (count <= 4) return 'grid-cols-2 gap-3'
    return 'grid-cols-3 gap-2'
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="absolute inset-0 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-black/[0.06] dark:border-white/[0.05] pointer-events-none" />

      <div className="relative z-[100] max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* 로고 */}
        <Link href="/" className="btn-hover group hover:brightness-110 transition-all flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-[1.2]"
            style={{ background: `linear-gradient(135deg, var(--accent-1), color-mix(in srgb, var(--accent-1) 80%, black))` }}
          >
            <Trophy className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold">
            <span className="text-gray-900 dark:text-white">World</span>
            <span style={{ color: 'var(--accent-1)' }}>Cuvi</span>
          </span>
        </Link>

        {/* 중앙 네비게이션 */}
        <nav className="hidden md:flex items-center gap-6 absolute left-1/2 -translate-x-1/2 bg-white/50 dark:bg-black/20 backdrop-blur-sm px-2 py-1 rounded-2xl border border-black/5 dark:border-white/5">
          {/* 인기 */}
          <Link
            href="/popular"
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all group whitespace-nowrap shrink-0 ${pathname === '/popular'
                ? 'bg-orange-500/10 text-orange-500 shadow-[0_0_15px_-3px_rgba(249,115,22,0.3)]'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
              }`}
          >
            <div className="nav-flame-container">
              <Flame className="absolute inset-0 w-5 h-5 transition-opacity group-hover:opacity-0" />
              <div className={`fill-layer ${pathname === '/popular' ? '!translate-y-0' : ''}`}>
                <Flame className="absolute inset-0 w-5 h-5 text-orange-500 fill-orange-500" />
              </div>
            </div>
            인기
          </Link>

          {/* 신규 */}
          <Link
            href="/news"
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all group whitespace-nowrap shrink-0 ${pathname === '/news'
                ? 'bg-yellow-500/10 text-yellow-500 shadow-[0_0_20px_-5px_#ffeb49]'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
              }`}
          >
            <div className={`nav-star-container ${pathname === '/new' ? 'animate-star-glow' : ''}`}>
              <Star className="absolute inset-0 w-5 h-5 transition-opacity group-hover:opacity-0" />
              <div className={`fill-layer ${pathname === '/new' ? '!translate-y-0' : ''}`}>
                <Star className="absolute inset-0 w-5 h-5 text-[#ffeb49] fill-[#ffeb49]" />
              </div>
            </div>
            신규
          </Link>

          {/* 장르 (전체 통합) */}
          <button
            onClick={() => router.push('/worldcup')}
            onMouseEnter={(e) => handleMouseEnter(e, 'genres')}
            onMouseLeave={handleMouseLeave}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all group shrink-0 ${pathname === '/worldcup' || pathname.startsWith('/worldcup/genre')
                ? 'bg-[var(--accent-1)]/10 text-[var(--accent-1)]'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
              }`}
          >
            <div className="nav-icon-container">
              <Grid className="absolute inset-0 w-5 h-5 transition-opacity group-hover:opacity-0" />
              <div className={`fill-layer ${pathname === '/worldcup' || pathname.startsWith('/worldcup/genre') ? '!translate-y-0' : ''}`}>
                <Grid className="absolute inset-0 w-5 h-5 fill-[var(--accent-1)] text-[var(--accent-1)]" />
              </div>
            </div>
            장르
            <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${activePopover === 'genres' ? 'rotate-180' : 'group-hover:translate-y-1'}`} />
          </button>
        </nav>

        {/* 오른쪽 영역 */}
        <div className="flex items-center gap-1 lg:gap-2">
          {(!loading && user) ? (
            <>
              {/* 알림 */}
              <button
                onClick={(e) => togglePopover(e, 'notifications')}
                onMouseEnter={(e) => handleMouseEnter(e, 'notifications')}
                onMouseLeave={handleMouseLeave}
                className="transition-all relative w-8 h-8 flex items-center justify-center rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 group"
                title="알림"
              >
                <div className="relative w-5 h-5 flex items-center justify-center">
                  <Bell className={`w-5 h-5 transition-colors duration-300 ${isAutoRinging ? 'animate-bellAlert' :
                      activePopover === 'notifications' ? 'text-[var(--accent-1)] fill-[var(--accent-1)]' : ''
                    }`} />
                  {mockNotis.length > 0 && (
                    <span className="absolute top-0 right-0 w-1.5 h-1.5 rounded-full ring-1 ring-white dark:ring-gray-950 bg-red-500 z-[10] animate-dotPulse" />
                  )}
                </div>
              </button>

              {/* 부스터 */}
              <button
                onClick={(e) => togglePopover(e, 'boosters')}
                onMouseEnter={(e) => handleMouseEnter(e, 'boosters')}
                onMouseLeave={handleMouseLeave}
                className="transition-all relative w-8 h-8 flex items-center justify-center rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 group"
                title="부스터"
              >
                <div className="relative flex items-center justify-center">
                  <div className={`booster-fill-container ${isBoosterAutoRinging ? 'animate-boosterAlert' : ''}`}>
                    <Zap className={`absolute inset-0 w-5 h-5 transition-opacity group-hover:opacity-0 ${isBoosterAutoRinging ? 'text-red-500 fill-red-500' : ''
                      }`} />
                    <div className={`fill-layer ${activePopover === 'boosters' ? '!translate-y-0' : ''}`}>
                      <Zap className={`absolute inset-0 w-5 h-5 ${activePopover === 'boosters' ? 'text-[var(--accent-1)] fill-[var(--accent-1)]' : ''
                        }`} />
                    </div>
                  </div>
                  {mockBoosters.filter(b => !b.isRead).length > 0 && (
                    <span className="absolute top-0 right-0 w-1.5 h-1.5 rounded-full ring-1 ring-white dark:ring-gray-950 bg-red-500 z-[10] animate-dotPulse" />
                  )}
                </div>
              </button>

              {/* 프로필 드롭다운 트리거 */}
              <button
                id="profile-dropdown-btn"
                onClick={(e) => togglePopover(e, 'profile')}
                onMouseEnter={(e) => handleMouseEnter(e, 'profile')}
                onMouseLeave={handleMouseLeave}
                className="transition-all flex items-center gap-1.5 rounded-lg px-1.5 py-1 hover:bg-black/5 dark:hover:bg-white/5 group profile-trigger login-aura-effect"
              >
                <div className="profile-avatar-container w-8 h-8 rounded-full overflow-hidden ring-2 transition-all duration-300 group-hover:z-10" style={{ '--tw-ring-color': `color-mix(in srgb, var(--accent-1) 50%, transparent)` } as React.CSSProperties}>
                  {avatarSrc ? (
                    <Image src={avatarSrc} alt="프로필" width={32} height={32} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold" style={{ background: 'var(--accent-1)' }}>
                      {nickname[0].toUpperCase()}
                    </div>
                  )}
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${activePopover === 'profile' ? 'rotate-180' : 'group-hover:translate-y-1'}`} />
              </button>
            </>
          ) : !loading ? (
            /* ── 로그인 버튼 → 동적 모달 ── */
            <button
              id="header-login-btn"
              onClick={() => openLoginModal()}
              className="btn-hover login-aura-effect flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-all shadow-lg hover:opacity-90"
              style={{ backgroundColor: 'var(--accent-1)' }}
            >
              <LogIn className="w-4 h-4" />
              로그인
            </button>
          ) : null}
        </div>
      </div>

      <BoosterModal />

      {/* 동적 포포버 (Dynamic Popover 모달) */}
      {activePopover !== 'none' && (
        <>
          <div className="fixed inset-0 z-40 bg-black/10 dark:bg-black/40 sm:bg-transparent max-sm:block hidden" onClick={closePopover} />
          <div
            className="fixed z-50 bg-white dark:bg-zinc-900 shadow-2xl shadow-black/20
                       w-full sm:w-auto bottom-0 left-0 sm:bottom-auto sm:left-auto rounded-t-3xl sm:rounded-2xl animate-[fadeScaleIn_0.2s_ease] overflow-hidden"
            onMouseEnter={handlePopoverEnter}
            onMouseLeave={handleMouseLeave}
            style={typeof window !== 'undefined' && window.innerWidth >= 640 ? (
              activePopover === 'genres'
                ? { left: `${popoverPos.leftEdge}px`, right: 'auto', top: `${popoverPos.y}px` }
                : { right: `${window.innerWidth - popoverPos.rightEdge}px`, left: 'auto', top: `${popoverPos.y}px` }
            ) : {}}
          >
            {/* 장르 팝오버 */}
            {activePopover === 'genres' && (
              <div className="p-4 w-full sm:w-64 bg-white dark:bg-zinc-900">
                <h3 className="font-bold mb-3 px-2" style={{ color: 'var(--accent-2)' }}>장르 선택</h3>
                <div className="grid grid-cols-2 gap-2">
                  {['애니메이션', '스포츠', '게임', '연예인', '음식', '음악'].map(genre => (
                    <button key={genre} className="btn-hover hover:scale-105 px-4 py-2.5 text-sm text-left rounded-xl transition-all border border-transparent"
                      style={{
                        backgroundColor: 'color-mix(in srgb, var(--accent-1) 8%, transparent)',
                        color: 'var(--accent-2)'
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent-1)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'transparent' }}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 알림 팝오버 */}
            {activePopover === 'notifications' && (
              <div className="flex flex-col w-full sm:w-[340px]">
                <div className="px-4 py-3 border-b flex justify-between items-center bg-white dark:bg-zinc-900"
                  style={{ borderColor: 'color-mix(in srgb, var(--accent-1) 20%, transparent)' }}>
                  <h3 className="font-bold" style={{ color: 'var(--accent-2)' }}>알림</h3>
                  <span className="text-xs text-white px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: 'var(--accent-1)' }}>{mockNotis.length}</span>
                </div>
                <div className="max-h-[360px] overflow-x-hidden overflow-y-auto w-full bg-white dark:bg-zinc-900">
                  {/* 선물 도착 배너 */}
                  {mockNotis.some(n => n.type === 'gift') && (
                    <div className="p-4 bg-orange-50 dark:bg-orange-950/20 flex items-center gap-3 border-b border-orange-100 dark:border-orange-900/30">
                      <motion.div
                        animate={{
                          rotate: [0, -10, 10, -10, 10, -10, 10, 0, 0, 0]
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          times: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 1],
                          ease: "easeInOut"
                        }}
                        className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center shadow-[0_0_15px_rgba(249,115,22,0.4)]"
                      >
                        <Gift className="w-5 h-5 text-white" />
                      </motion.div>
                      <div>
                        <p className="text-sm font-bold text-orange-600 dark:text-orange-400">선물이 도착했어요!</p>
                        <p className="text-[11px] text-orange-500/80">내용을 확인하고 혜택을 받으세요.</p>
                      </div>
                    </div>
                  )}
                  {mockNotis.length === 0 ? (
                    <div className="p-8 text-center text-sm" style={{ color: 'var(--accent-2)' }}>새로운 알림이 없습니다.</div>
                  ) : (
                    <div className="flex flex-col">
                      <AnimatePresence>
                        {mockNotis.map((noti) => (
                          <motion.div
                            key={noti.id}
                            layout
                            initial={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="relative border-b border-black/5 dark:border-white/5 last:border-0 hover:z-50 bg-white dark:bg-zinc-900"
                            style={{ willChange: 'transform' }}
                            whileHover={{ scale: 1.05, filter: 'brightness(1.05)' }}
                          >
                            {/* Backdrop */}
                            <div
                              className="absolute inset-0 flex items-center justify-between px-6"
                              style={{ backgroundColor: 'color-mix(in srgb, var(--accent-1) 15%, transparent)' }}
                            >
                              {/* Drag Right -> Left side revealed (Trash) */}
                              <Trash className="w-5 h-5" style={{ color: 'var(--accent-1)' }} />
                              {/* Drag Left -> Right side revealed (Popup) */}
                              <ArrowUpRight className="w-5 h-5" style={{ color: 'var(--accent-1)' }} />
                            </div>
                            {/* Front Card */}
                            <motion.div
                              drag="x"
                              dragConstraints={{ left: 0, right: 0 }}
                              dragElastic={0.5}
                              onDragStart={() => { isDraggingNoti.current = true }}
                              onDragEnd={(e, info) => {
                                setTimeout(() => { isDraggingNoti.current = false }, 50)
                                if (info.offset.x > 80) {
                                  // Swipe right (Drag Right) -> Delete
                                  handleDismissNoti(e as any, noti.id)
                                } else if (info.offset.x < -80) {
                                  // Swipe left (Drag Left) -> Open Side View
                                  closePopover()
                                  setSideViewUrl(noti.link)
                                }
                              }}
                              onContextMenu={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setNotiDeleteModeId(noti.id)
                              }}
                              className="relative w-full flex items-center touch-pan-y transition-[transform] cursor-grab active:cursor-grabbing rounded-lg overflow-hidden bg-white dark:bg-zinc-900 shrink-0"
                              style={{ willChange: 'transform' }}
                            >
                              <Link
                                href={noti.link}
                                onClick={(e) => {
                                  e.preventDefault()
                                  if (isDraggingNoti.current) {
                                    return
                                  }
                                  closePopover()
                                  setMockNotis(prev => prev.filter(n => n.id !== noti.id))
                                  router.push(noti.link)
                                }}
                                className="block flex-1 p-4 pr-12"
                                draggable={false}
                              >
                                <p className="text-sm font-semibold line-clamp-2" style={{ color: 'var(--accent-2)' }}>
                                  {noti.type === 'gift' && <Gift className="inline-block w-4 h-4 mr-1.5 pointer-events-none scale-110" style={{ color: '#f97316' }} />}
                                  {noti.type === 'booster' && <Zap className="inline-block w-4 h-4 mr-1.5 pointer-events-none" style={{ color: 'var(--accent-1)' }} />}
                                  {noti.title}
                                </p>
                                <p className="text-xs text-zinc-500 mt-1 pointer-events-none">{noti.time}</p>
                              </Link>
                              {notiDeleteModeId === noti.id && (
                                <button
                                  onClick={(e) => handleDismissNoti(e, noti.id)}
                                  className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center hover:scale-110 transition-all z-[60] shadow-lg"
                                  title="알림 삭제"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </motion.div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 부스터 팝오버 (동적 그리드 및 개편 UI) */}
            {activePopover === 'boosters' && (
              <div className="flex flex-col w-full sm:w-[420px] bg-white dark:bg-zinc-900">
                {/* 상단 헤더 */}
                <div className="px-5 py-4 border-b flex justify-between items-center"
                  style={{ borderColor: 'color-mix(in srgb, var(--accent-1) 20%, transparent)' }}>
                  <div>
                    <h3 className="font-bold flex items-center gap-1.5" style={{ color: 'var(--accent-2)' }}>
                      <Zap className="w-4 h-4" style={{ color: 'var(--accent-1)' }} /> 내 부스터 현황
                    </h3>
                    <p className="text-xs text-zinc-500 mt-1">보유 포인트: <span className="font-bold" style={{ color: 'var(--accent-2)' }}>{(profile?.points || 0).toLocaleString()} P</span></p>
                  </div>
                  <BoosterButton
                    label="+ 부스터 구매"
                    isFullPower={true}
                    className="!h-9 !px-3 !text-xs !rounded-lg shadow-sm"
                    onClick={() => alert('부스터 구매 창이 열립니다.')}
                  />
                </div>

                <div className="p-4 bg-white dark:bg-zinc-900">
                  {mockBoosters.length === 0 ? (
                    <div className="py-8 flex flex-col items-center justify-center text-center">
                      <Zap className="w-12 h-12 mb-4 opacity-30" style={{ color: 'var(--accent-1)' }} />
                      <p className="text-sm mb-6 font-medium text-zinc-500">현재 가동 중인 부스터가 없습니다.</p>

                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-end mb-3 px-1">
                        <p className="text-sm font-bold" style={{ color: 'var(--accent-2)' }}>
                          가동 중 <span className="text-xs ml-1 px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: 'var(--accent-1)' }}>{mockBoosters.length}</span>
                        </p>
                      </div>

                      <div className={`grid ${getBoosterGridClass(mockBoosters.length)}`}>
                        {mockBoosters.slice(0, 9).map((booster) => {
                          const count = mockBoosters.length
                          const isLarge = count <= 2
                          const isMedium = count === 3 || count === 4

                          return (
                            <div
                              key={booster.id}
                              className={`relative ${!isLarge && !isMedium ? 'aspect-square' : ''}`}
                              onContextMenu={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setBoosterDeleteModeId(booster.id)
                              }}
                            >
                              <motion.button
                                onClick={() => {
                                  setSelectedBooster(booster)
                                  setMockBoosters(prev => prev.map(b => b.id === booster.id ? { ...b, isRead: true } : b))
                                }}
                                className={`rounded-2xl w-full h-full flex items-center text-left btn-hover hover:z-50 transition-transform origin-center border border-transparent ${isLarge ? 'p-4 flex-row gap-4' : isMedium ? 'p-3 flex-col justify-between text-center' : 'p-2 flex-col justify-between text-center'
                                  }`}
                                style={{
                                  backgroundColor: 'color-mix(in srgb, var(--accent-1) 8%, transparent)',
                                  willChange: 'transform'
                                }}
                                whileHover={{ scale: 1.05, filter: 'brightness(1.1)' }}
                              >
                                {isLarge ? (
                                  <>
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm" style={{ backgroundColor: 'color-mix(in srgb, var(--accent-1) 15%, transparent)' }}>
                                      <Zap className="w-6 h-6" style={{ color: 'var(--accent-1)', filter: 'drop-shadow(0 0 4px color-mix(in srgb, var(--accent-1) 50%, transparent))' }} />
                                    </div>
                                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                                      <p className="text-sm font-bold truncate w-full" style={{ color: 'var(--accent-2)' }}>{booster.title}</p>
                                      <div className="flex items-center gap-3 mt-1.5 text-xs font-mono">
                                        <span className="font-bold text-green-500 flex items-center gap-0.5"><span className="text-[10px]">👁️</span> {booster.viewsDiff > 0 ? `+${booster.viewsDiff}` : booster.viewsDiff}</span>
                                        {booster.rankDiff > 0 ? (
                                          <span className="font-bold text-red-500">▲{booster.rankDiff}</span>
                                        ) : booster.rankDiff < 0 ? (
                                          <span className="font-bold text-blue-500">▼{Math.abs(booster.rankDiff)}</span>
                                        ) : (
                                          <span className="font-bold text-green-500">—</span>
                                        )}
                                        <span className="text-zinc-500 ml-auto px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/5">{booster.timeLeft}</span>
                                      </div>
                                    </div>
                                  </>
                                ) : isMedium ? (
                                  <>
                                    <div className="w-full flex justify-between items-center px-1">
                                      <span className="text-[11px] font-bold text-green-500">+{booster.viewsDiff} 👁️</span>
                                      {booster.rankDiff > 0 ? (
                                        <span className="text-[11px] font-bold text-red-500">▲{booster.rankDiff}</span>
                                      ) : booster.rankDiff < 0 ? (
                                        <span className="text-[11px] font-bold text-blue-500">▼{Math.abs(booster.rankDiff)}</span>
                                      ) : (
                                        <span className="text-[11px] font-bold text-green-500">—</span>
                                      )}
                                    </div>
                                    <div className="w-9 h-9 rounded-full flex items-center justify-center mx-auto my-1 shadow-sm" style={{ backgroundColor: 'color-mix(in srgb, var(--accent-1) 15%, transparent)' }}>
                                      <Zap className="w-5 h-5" style={{ color: 'var(--accent-1)' }} />
                                    </div>
                                    <div className="w-full">
                                      <p className="text-xs font-bold line-clamp-1 w-full truncate" style={{ color: 'var(--accent-2)' }}>{booster.title}</p>
                                      <span className="text-[10px] font-mono font-bold text-zinc-500 block mt-0.5">{booster.timeLeft}</span>
                                      <div className="w-full bg-black/10 dark:bg-white/10 rounded-full h-1 mt-1.5 overflow-hidden">
                                        <div className="h-full rounded-full" style={{ width: '50%', backgroundColor: 'var(--accent-1)' }} />
                                      </div>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div className="w-full flex justify-between items-center px-0.5">
                                      <span className="text-[9px] font-bold text-green-500">+{booster.viewsDiff}</span>
                                      {booster.rankDiff > 0 ? (
                                        <span className="text-[9px] font-bold text-red-500">▲{booster.rankDiff}</span>
                                      ) : booster.rankDiff < 0 ? (
                                        <span className="text-[9px] font-bold text-blue-500">▼{Math.abs(booster.rankDiff)}</span>
                                      ) : (
                                        <span className="text-[9px] font-bold text-green-500">—</span>
                                      )}
                                    </div>
                                    <Zap className="w-5 h-5 my-0.5 mx-auto" style={{ color: 'var(--accent-1)' }} />
                                    <p className="text-[9px] font-semibold line-clamp-1 w-full truncate" style={{ color: 'var(--accent-2)' }}>{booster.title}</p>
                                    <div className="w-full bg-black/10 dark:bg-white/10 rounded-full h-0.5 mt-1 overflow-hidden">
                                      <div className="h-full rounded-full" style={{ width: '40%', backgroundColor: 'var(--accent-1)' }} />
                                    </div>
                                    <span className="text-[8px] font-mono text-zinc-500 mt-0.5">{booster.timeLeft}</span>
                                  </>
                                )}
                              </motion.button>
                              {boosterDeleteModeId === booster.id && (
                                <button
                                  onClick={(e) => handleDismissBooster(e, booster.id)}
                                  className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 text-white border-2 border-white dark:border-zinc-900 rounded-full flex items-center justify-center hover:scale-110 transition-all z-[60] shadow-lg"
                                  title="부스터 종료"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </>
                  )}

                  {mockBoosters.length > 9 && (
                    <Link
                      href="/boosters"
                      onClick={closePopover}
                      className="block mt-4 text-center text-[13px] font-bold text-white transition-all hover:brightness-110 p-3 rounded-xl shadow-md"
                      style={{ backgroundColor: 'var(--accent-1)' }}
                    >
                      +{mockBoosters.length - 9}개 더 보기
                    </Link>
                  )}
                </div>
              </div>
            )}


            {/* 프로필 팝오버 */}
            {activePopover === 'profile' && (
              <ProfileDropdown onClose={closePopover} />
            )}
          </div>
        </>
      )}

      {/* 부스터 상세 모달 (페이지 팝업 형식) */}
      <AnimatePresence>
        {selectedBooster && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6"
            style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
            onClick={() => setSelectedBooster(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden bg-white dark:bg-zinc-900 flex flex-col max-h-[90vh]"
            >
              {/* 모달 상단 배너 (페이지 헤더 느낌) */}
              <div className="relative h-32 md:h-40 px-6 md:px-10 flex flex-col justify-end pb-6"
                style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent-1) 20%, transparent), color-mix(in srgb, var(--accent-1) 5%, transparent))' }}>
                <div className="absolute top-4 right-4">
                  <button onClick={() => setSelectedBooster(null)}
                    className="w-10 h-10 rounded-full flex items-center justify-center transition-all bg-black/10 hover:bg-black/20 dark:bg-white/10 dark:hover:bg-white/20 text-foreground">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center shadow-lg bg-white dark:bg-zinc-800">
                    <Zap className="w-8 h-8 md:w-10 md:h-10" style={{ color: 'var(--accent-1)', filter: 'drop-shadow(0 0 10px color-mix(in srgb, var(--accent-1) 50%, transparent))' }} />
                  </div>
                  <div>
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white mb-2 shadow-sm" style={{ backgroundColor: 'var(--accent-1)' }}>
                      가동 중인 부스터
                    </span>
                    <h2 className="text-2xl md:text-3xl font-extrabold leading-tight" style={{ color: 'var(--accent-2)' }}>
                      {selectedBooster.title}
                    </h2>
                  </div>
                </div>
              </div>

              {/* 본문 콘텐츠 (2단 레이아웃) */}
              <div className="p-6 md:p-10 flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* 왼쪽: 실시간 퍼포먼스 */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-500 mb-4 uppercase tracking-wider">🔥 실시간 퍼포먼스</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-2xl p-4 md:p-5 border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02]">
                        <p className="text-xs text-zinc-500 font-medium mb-1">총 예상 뷰 증가</p>
                        <p className="text-3xl font-black text-green-500">+{selectedBooster.viewsDiff}</p>
                        <p className="text-xs text-zinc-400 mt-1">조회수</p>
                      </div>
                      <div className="rounded-2xl p-4 md:p-5 border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02]">
                        <p className="text-xs text-zinc-500 font-medium mb-1">월드컵 순위 변동</p>
                        <p className="text-3xl font-black">
                          {selectedBooster.rankDiff > 0 ? (
                            <span className="text-red-500">▲{selectedBooster.rankDiff}</span>
                          ) : selectedBooster.rankDiff < 0 ? (
                            <span className="text-blue-500">▼{Math.abs(selectedBooster.rankDiff)}</span>
                          ) : (
                            <span className="text-green-500">—</span>
                          )}
                        </p>
                        <p className="text-xs text-zinc-400 mt-1">랭킹 계단</p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-500 mb-4 uppercase tracking-wider">⚡ 남은 가동 시간</h3>
                    <div className="rounded-2xl p-6 border border-[var(--accent-1)] shadow-inner" style={{ backgroundColor: 'color-mix(in srgb, var(--accent-1) 5%, transparent)', borderColor: 'color-mix(in srgb, var(--accent-1) 30%, transparent)' }}>
                      <div className="flex justify-between items-end mb-2">
                        <span className="text-4xl font-black font-mono tracking-tighter" style={{ color: 'var(--accent-1)' }}>{selectedBooster.timeLeft}</span>
                        <span className="font-bold text-sm" style={{ color: 'var(--accent-2)' }}>60% 완료</span>
                      </div>
                      <div className="w-full bg-black/10 dark:bg-white/10 rounded-full h-3 md:h-4 overflow-hidden mt-4">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: '60%' }}
                          transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
                          className="h-full rounded-full relative overflow-hidden"
                          style={{ backgroundColor: 'var(--accent-1)' }}
                        >
                          <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite] -skew-x-12 translate-x-[-100%]" />
                        </motion.div>
                      </div>
                      <p className="text-xs text-zinc-500 mt-3 leading-relaxed">부스터가 완료되면 상세 분석 리포트가 알림으로 전송됩니다.</p>
                    </div>
                  </div>
                </div>

                {/* 오른쪽: 상세 정보 및 액션 */}
                <div className="space-y-6 flex flex-col">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-500 mb-4 uppercase tracking-wider">📊 부스터 효과 분석</h3>
                    <ul className="space-y-3">
                      <li className="flex items-center gap-3 p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02]">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 text-blue-500">📈</div>
                        <div className="flex-1">
                          <p className="text-sm font-bold" style={{ color: 'var(--accent-2)' }}>노출 빈도 급증</p>
                          <p className="text-[11px] text-zinc-500">추천 알고리즘 가중치 +250% 적용 중</p>
                        </div>
                      </li>
                      <li className="flex items-center gap-3 p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02]">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'color-mix(in srgb, var(--accent-1) 15%, transparent)', color: 'var(--accent-1)' }}>🎯</div>
                        <div className="flex-1">
                          <p className="text-sm font-bold" style={{ color: 'var(--accent-2)' }}>타겟 유저 도달률 향상</p>
                          <p className="text-[11px] text-zinc-500">관심사 일치 유저에게 우선 노출 중</p>
                        </div>
                      </li>
                    </ul>
                  </div>

                  <div className="mt-auto pt-6 border-t border-black/5 dark:border-white/5 space-y-3">
                    <button
                      onClick={() => setSelectedBooster(null)}
                      className="w-full py-4 text-center rounded-2xl text-base font-bold text-white shadow-lg transition-all hover:scale-[1.02] hover:brightness-110 active:scale-95"
                      style={{ backgroundColor: 'var(--accent-1)' }}
                    >
                      페이지 닫기
                    </button>
                    <button
                      onClick={() => {
                        if (selectedBooster) handleDismissBooster({ preventDefault: () => { }, stopPropagation: () => { } } as any, selectedBooster.id)
                        setSelectedBooster(null)
                      }}
                      className="w-full py-3 text-center rounded-2xl text-sm font-bold text-red-500 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
                    >
                      부스터 강제 종료
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 사이드 뷰 드로어 */}
      <AnimatePresence>
        {sideViewUrl && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSideViewUrl(null)}
              className="fixed inset-0 z-[300] bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 bg-white dark:bg-zinc-900 shadow-2xl z-[350] flex flex-col border-l border-black/5 dark:border-white/5"
              style={{ width: `${sideViewWidth}px`, maxWidth: '100vw' }}
            >
              {/* Width Resizer Handle */}
              <div
                className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-black/10 dark:hover:bg-white/10 transition-colors z-[360]"
                onPointerDown={(e) => {
                  e.preventDefault()
                  setIsResizing(true)
                  const startX = e.clientX
                  const startWidth = sideViewWidth
                  let currentWidth = startWidth
                  const onPointerMove = (moveEvent: PointerEvent) => {
                    const deltaX = moveEvent.clientX - startX
                    currentWidth = Math.max(300, Math.min(window.innerWidth - 50, startWidth - deltaX))
                    setSideViewWidth(currentWidth)
                  }
                  const onPointerUp = () => {
                    setIsResizing(false)
                    localStorage.setItem('worldcuvi_sideview_width', currentWidth.toString())
                    document.removeEventListener('pointermove', onPointerMove)
                    document.removeEventListener('pointerup', onPointerUp)
                  }
                  document.addEventListener('pointermove', onPointerMove)
                  document.addEventListener('pointerup', onPointerUp)
                }}
              />
              <div className="flex items-center justify-between p-4 border-b border-black/5 dark:border-white/5" style={{ backgroundColor: 'color-mix(in srgb, var(--accent-1) 10%, transparent)' }}>
                <h3 className="font-bold text-lg" style={{ color: 'var(--accent-2)' }}>상세 보기 (사이드 뷰)</h3>
                <button onClick={() => setSideViewUrl(null)} className="w-8 h-8 rounded-full flex items-center justify-center transition-all bg-black/5 dark:bg-white/5 text-foreground hover:bg-black/10 dark:hover:bg-white/10" style={{ color: 'var(--accent-2)' }}>
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden relative bg-zinc-50 dark:bg-zinc-950">
                <iframe src={sideViewUrl} className={`w-full h-full border-none ${isResizing ? 'pointer-events-none' : ''}`} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  )
}

