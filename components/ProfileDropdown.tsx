'use client'

import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import Image from 'next/image'
import Link from 'next/link'
import { Moon, Sun, Settings, Power, Plus, Star, X } from 'lucide-react'
import PremiumSubscribeButton from './PremiumSubscribeButton'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './AuthProvider'
import { useAccent, SKIN_COLORS } from './ThemeProvider'
import { useState, useEffect } from 'react'
import { HexColorPicker } from 'react-colorful'
import PlusUserBadge from './PlusUserBadge'
import './PlusUserBadge.css'

interface Props {
  onClose: () => void
}

export default function ProfileDropdown({ onClose }: Props) {
  const { user, profile } = useAuth()
  const { theme, setTheme } = useTheme()
  const { accentPrimaryId, accentTextId, accentPrimary, accentText, setAccentPrimary, setAccentText } = useAccent()
  const router = useRouter()
  const supabase = createClient()

  // 로컬 색상 상태
  const [localPrimary, setLocalPrimary] = useState(() => accentPrimary)
  const [localText, setLocalText] = useState(() => accentText)

  // ★ 커스텀 팔레트 상태 (OS 팝업 대신 우리가 만든 팝업 사용)
  const [pickerState, setPickerState] = useState<{ isOpen: boolean; target: 'primary' | 'text' }>({
    isOpen: false,
    target: 'primary',
  })

  // 최근 사용 색상 기록 (최대 18개)
  const HISTORY_KEY = 'worldcuvi-color-history'
  const [colorHistory, setColorHistory] = useState<string[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]')
    } catch {
      return []
    }
  })

  const pushHistory = (hex: string) => {
    setColorHistory(prev => {
      const next = [hex, ...prev.filter(c => c.toLowerCase() !== hex.toLowerCase())].slice(0, 18)
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
      return next
    })
  }

  // 팔레트 닫을 때 히스토리에 딱 1번만 저장하는 함수
  const handleClosePicker = () => {
    const finalHex = pickerState.target === 'primary' ? localPrimary : localText
    pushHistory(finalHex)
    setPickerState({ ...pickerState, isOpen: false })
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    onClose()
    router.push('/')
    router.refresh()
  }

  const avatarSrc = profile?.profile_img || user?.user_metadata?.avatar_url || null
  const nickname = profile?.nickname || user?.user_metadata?.full_name || user?.email?.split('@')[0] || '유저'
  const isCreator = profile?.is_creator ?? false

  // ★ 구독 상태 (프로필 연동)
  const isSubscribed = profile?.is_plus_subscriber ?? false
  const [daysLeft, setDaysLeft] = useState(30)

  const handlePurchase = () => {
    if (confirm('9900 포인트로 WorldCuvi PLUS 30일 구독권을 구매하시겠습니까?')) {
      // setIsSubscribed(true) // Removed as it's now profile-linked
      setDaysLeft(30)
      alert('구독이 활성화되었습니다! (프로필 정보가 갱신될 때까지 시간이 걸릴 수 있습니다)')
    }
  }

  return (
    <div className="w-full sm:w-72 flex flex-col bg-white dark:bg-zinc-900 relative">
      {/* ── 프로필 헤더 ── */}
      <div className="flex flex-col items-center gap-2 pt-6 pb-4 px-4">
        {/* 아바타 */}
        <div className="relative w-16 h-16 rounded-full overflow-hidden ring-2 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900"
          style={{ '--tw-ring-color': accentPrimary } as React.CSSProperties}
        >
          {avatarSrc ? (
            <Image src={avatarSrc} alt="프로필" fill className="object-cover" />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-white text-2xl font-bold"
              style={{ background: accentPrimary }}
            >
              {nickname[0].toUpperCase()}
            </div>
          )}
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-0.5">
            <p className={`font-semibold text-sm ${isSubscribed ? 'plus-nickname' : 'text-gray-900 dark:text-white'}`}>
              {nickname}
            </p>
            {isSubscribed && <PlusUserBadge className="scale-90" />}
          </div>
          <p className="text-xs text-gray-400">{user?.email}</p>
          <button
            onClick={() => alert('결제 모달이 오픈됩니다. (미구현)')}
            className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition-colors btn-hover"
          >
            <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] text-white font-bold bg-yellow-500 shadow-sm">P</span>
            <span className="text-sm font-bold" style={{ color: accentText }}>{(profile?.points || 0).toLocaleString()} P</span>
          </button>
        </div>

        {/* 3 아이콘 버튼 */}
        <div className="flex items-center gap-2 mt-1">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-9 h-9 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:scale-110 transition-transform"
            aria-label="테마 전환"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <Link
            href="/settings"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:scale-110 transition-transform"
            aria-label="환경설정"
          >
            <Settings className="w-4 h-4" />
          </Link>
          <button
            onClick={handleSignOut}
            className="w-9 h-9 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:scale-110 transition-transform"
            aria-label="로그아웃"
          >
            <Power className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="h-px bg-gray-100 dark:bg-zinc-800 mx-4" />

      {/* ── 플러스 구독 ── */}
      <div className="px-4 py-3.5">
        <div className="flex flex-col items-center gap-2">
          <PremiumSubscribeButton 
            onClick={isSubscribed ? undefined : handlePurchase}
            label={isSubscribed ? 'WorldCuvi PLUS+' : 'GO PLUS'}
            className="!w-full !max-w-none !h-12 !text-xs"
          />
          {isSubscribed && (
            <p className="text-[10px] font-bold text-yellow-600 dark:text-yellow-500 flex items-center gap-1 animate-pulse">
              <Star className="w-3 h-3 fill-current" />
              {daysLeft < 7 ? `구독 만료까지 ${daysLeft}일` : '구독 중'}
            </p>
          )}
        </div>
      </div>

      <div className="h-px bg-gray-100 dark:bg-zinc-800 mx-4" />

      {/* ── 스킨 컬러 ── */}
      <div className="px-4 py-3.5 relative">
        <p className="text-xs font-medium text-gray-500 dark:text-zinc-400 mb-2.5">스킨 컬러</p>
        <div className="grid grid-cols-4 gap-2 relative">
          {SKIN_COLORS.map((color) => {
            const isPrimaryActive = color.id === accentPrimaryId
            const isTextActive = color.id === accentTextId
            return (
              <button
                key={color.id}
                onClick={(e) => { e.preventDefault(); setAccentPrimary(color.id) }}
                onContextMenu={(e) => { e.preventDefault(); setAccentText(color.id) }}
                title={`${color.label} (좌클릭: 색상1, 우클릭: 색상2)`}
                className="w-10 h-10 rounded-xl transition-transform hover:scale-110 relative mx-auto"
                style={{ backgroundColor: color.primary }}
              >
                {isPrimaryActive && (
                  <span className="absolute inset-0 rounded-xl ring-2 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900 pointer-events-none"
                    style={{ '--tw-ring-color': color.primary } as React.CSSProperties}
                  />
                )}
                {isTextActive && (
                  <span className="absolute -inset-1 rounded-xl ring-1 border border-dashed border-zinc-400 pointer-events-none" />
                )}
              </button>
            )
          })}

          {/* ★ 끝판왕 커스텀 컬러 버튼 (우리가 통제함) */}
          <div
            className="relative w-10 h-10 rounded-xl overflow-hidden transition-transform hover:scale-110 mx-auto cursor-pointer select-none"
            title="커스텀 컬러 (좌클릭: 강조색1, 우클릭: 강조색2)"
            onClick={() => {
              setPickerState({ isOpen: true, target: 'primary' })
            }}
            onContextMenu={(e) => {
              e.preventDefault()
              setPickerState({ isOpen: true, target: 'text' })
            }}
          >
            {/* 시각 디스플레이: 좌=강조색1, 우=강조색2 */}
            <div className="absolute inset-0 flex pointer-events-none">
              <div className="w-1/2 h-full" style={{ backgroundColor: accentPrimaryId === 'custom' ? localPrimary : '#9ca3af' }} />
              <div className="w-1/2 h-full" style={{ backgroundColor: accentTextId === 'custom' ? localText : '#6b7280' }} />
            </div>

            {accentPrimaryId !== 'custom' && accentTextId !== 'custom' && (
              <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white bg-gradient-to-br from-gray-300 to-gray-500 dark:from-zinc-600 dark:to-zinc-800 pointer-events-none">+</span>
            )}
            {accentPrimaryId === 'custom' && (
              <span className="absolute inset-0 rounded-xl ring-2 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900 pointer-events-none" style={{ '--tw-ring-color': localPrimary } as React.CSSProperties} />
            )}
            {accentTextId === 'custom' && (
              <span className="absolute -inset-1 rounded-xl ring-1 border border-dashed border-zinc-400 pointer-events-none" />
            )}
          </div>
        </div>

        {/* ★ 우리가 만든 '진짜' 커스텀 팔레트 팝업 */}
        {pickerState.isOpen && (
          <>
            {/* 투명 오버레이 (바탕 클릭 시 닫기/저장) */}
            <div className="fixed inset-0 z-40" onClick={handleClosePicker} />

            {/* 팔레트 UI */}
            <div 
              className="absolute right-4 top-16 z-50 p-3 bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl border border-black/5 dark:border-white/5 animate-[fadeScaleIn_0.15s_ease-out]"
              onMouseLeave={handleClosePicker}
              onContextMenu={(e) => e.preventDefault()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleClosePicker()
              }}
              tabIndex={0} // 키 이벤트를 받기 위해 필요
            >
              <div className="flex justify-between items-center mb-3 px-1">
                <span className="text-xs font-bold" style={{ color: pickerState.target === 'primary' ? localPrimary : localText }}>
                  {pickerState.target === 'primary' ? '강조색 1 튜닝 중 🎨' : '강조색 2 튜닝 중 🎨'}
                </span>
                <button
                  onClick={handleClosePicker}
                  className="w-6 h-6 rounded-full flex items-center justify-center bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-zinc-500" />
                </button>
              </div>

              <HexColorPicker
                color={pickerState.target === 'primary' ? localPrimary : localText}
                onChange={(newHex) => {
                  if (pickerState.target === 'primary') {
                    setLocalPrimary(newHex)
                    setAccentPrimary('custom', newHex) // 실시간 미리보기 (저장은 아님)
                  } else {
                    setLocalText(newHex)
                    setAccentText('custom', newHex)
                  }
                }}
              />
              <p className="text-[10px] text-zinc-400 text-center mt-3 mb-1">엔터 혹은 마우스를 떼면 저장됩니다</p>
            </div>
          </>
        )}

        {/* 최근 사용 색상 기록 */}
        {colorHistory.length > 0 && (
          <div className="mt-3">
            <p className="text-[10px] font-medium text-gray-400 dark:text-zinc-500 mb-1.5">최근 색상</p>
            <div className="grid grid-cols-9 gap-1.5">
              {colorHistory.map((hex, i) => (
                <button
                  key={i}
                  onClick={() => { setLocalPrimary(hex); setAccentPrimary('custom', hex) }}
                  onContextMenu={(e) => { e.preventDefault(); setLocalText(hex); setAccentText('custom', hex) }}
                  title={`${hex} (좌클릭: 강조색1, 우클릭: 강조색2)`}
                  className="w-full aspect-square rounded-lg border-2 border-white dark:border-zinc-800 shadow-sm hover:scale-125 transition-transform"
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between px-2 bg-black/5 dark:bg-white/5 py-1.5 rounded-lg">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: accentPrimary }} />
            <span className="text-[10px] text-zinc-600 dark:text-zinc-400 font-medium">강조색 1(좌)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-zinc-600 dark:text-zinc-400 font-medium">강조색 2(우)</span>
            <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: accentText }} />
          </div>
        </div>
      </div>

      <div className="h-px bg-gray-100 dark:bg-zinc-800 mx-4" />

      {/* ── 월드컵 활동 ── */}
      <div className="px-4 py-3.5">
        <div className="flex items-center justify-between bg-gray-50 dark:bg-zinc-800/60 rounded-xl px-3.5 py-3">
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-zinc-400">
              {isCreator ? '생성 · 관리 · 통계' : '나만의 이상형 월드컵을 만들어보세요'}
            </p>
          </div>
          <Link
            href={isCreator ? '/dashboard' : '/create'}
            onClick={onClose}
            className="ml-2 shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg text-white transition-opacity hover:opacity-90 btn-hover"
            style={{ backgroundColor: accentPrimary }}
          >
            {isCreator ? '이동' : '시작'}
          </Link>
        </div>
      </div>

      <div className="h-px bg-gray-100 dark:bg-zinc-800 mx-4" />

      {/* ── 다른 계정으로 로그인 ── */}
      <div className="px-4 py-3">
        <button
          onClick={() => {
            handleSignOut();
            setTimeout(() => {
              const loginBtn = document.getElementById('header-login-btn');
              if (loginBtn) loginBtn.click();
            }, 500);
          }}
          className="flex items-center gap-2 text-sm text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200 transition-colors w-full text-left"
        >
          <span className="w-5 h-5 rounded-full border border-gray-300 dark:border-zinc-600 flex items-center justify-center">
            <Plus className="w-3 h-3" />
          </span>
          다른 계정으로 로그인 (재인증)
        </button>
      </div>
    </div>
  )
}