'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'

// ── 스킨 컬러 팔레트 (표준 가이드) ──────────────────────────
export const SKIN_COLORS = [
  { id: 'red', primary: '#ef4444', text: '#dc2626', label: '레드' },
  { id: 'orange', primary: '#f97316', text: '#ea580c', label: '오렌지' },
  { id: 'yellow', primary: '#eab308', text: '#ca8a04', label: '옐로우' },
  { id: 'green', primary: '#22c55e', text: '#16a34a', label: '그린' },
  { id: 'blue', primary: '#3b82f6', text: '#2563eb', label: '블루' },
  { id: 'indigo', primary: '#6366f1', text: '#4f46e5', label: '인디고' },
  { id: 'purple', primary: '#a855f7', text: '#9333ea', label: '퍼플' },
] as const

export type SkinColorId = typeof SKIN_COLORS[number]['id'] | 'custom'

const KEYS = {
  P_ID: 'worldcuvi-skin-primary-id',
  P_HEX: 'worldcuvi-skin-primary-hex',
  T_ID: 'worldcuvi-skin-text-id',
  T_HEX: 'worldcuvi-skin-text-hex',
}

interface ThemeColorContextType {
  accentPrimaryId: SkinColorId
  accentTextId: SkinColorId
  accentPrimary: string
  accentText: string
  setAccentPrimary: (id: SkinColorId, customHex?: string) => void
  setAccentText: (id: SkinColorId, customHex?: string) => void
  applyGroupTheme: (primary: string, secondary: string) => void // AI 테마 적용 기능 추가
}

const ThemeColorContext = createContext<ThemeColorContextType>({
  accentPrimaryId: 'purple',
  accentTextId: 'purple',
  accentPrimary: '#a855f7',
  accentText: '#9333ea',
  setAccentPrimary: () => { },
  setAccentText: () => { },
  applyGroupTheme: () => { },
})

export const useAccent = () => useContext(ThemeColorContext)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false) // 하이드레이션 방지
  const [accentPrimaryId, setAccentPrimaryId] = useState<SkinColorId>('purple')
  const [accentPrimary, setAccentPrimary] = useState('#a855f7')
  const [accentTextId, setAccentTextId] = useState<SkinColorId>('purple')
  const [accentText, setAccentText] = useState('#9333ea')

  // CSS 변수 주입 함수
  const updateRootStyles = useCallback((primary: string, text: string) => {
    const root = document.documentElement.style
    root.setProperty('--accent-primary', primary)
    root.setProperty('--accent-1', primary)
    root.setProperty('--accent-text', text)
    root.setProperty('--accent-2', text)
  }, [])

  // 1. 초기 로드
  useEffect(() => {
    const savedPId = localStorage.getItem(KEYS.P_ID) as SkinColorId | null
    const savedPHex = localStorage.getItem(KEYS.P_HEX)
    const savedTId = localStorage.getItem(KEYS.T_ID) as SkinColorId | null
    const savedTHex = localStorage.getItem(KEYS.T_HEX)

    let p = '#a855f7'
    let t = '#9333ea'

    if (savedPId === 'custom' && savedPHex) {
      setAccentPrimaryId('custom'); p = savedPHex
    } else if (savedPId) {
      const found = SKIN_COLORS.find(c => c.id === savedPId)
      if (found) { setAccentPrimaryId(found.id); p = found.primary }
    }

    if (savedTId === 'custom' && savedTHex) {
      setAccentTextId('custom'); t = savedTHex
    } else if (savedTId) {
      const found = SKIN_COLORS.find(c => c.id === savedTId)
      if (found) { setAccentTextId(found.id); t = found.text }
    }

    setAccentPrimary(p)
    setAccentText(t)
    updateRootStyles(p, t)
    setMounted(true)
  }, [updateRootStyles])

  const handleSetAccentPrimary = (id: SkinColorId, hex?: string) => {
    let targetHex = hex || accentPrimary
    if (id !== 'custom') {
      targetHex = SKIN_COLORS.find(c => c.id === id)?.primary || '#a855f7'
    }
    setAccentPrimaryId(id)
    setAccentPrimary(targetHex)
    localStorage.setItem(KEYS.P_ID, id)
    if (id === 'custom') localStorage.setItem(KEYS.P_HEX, targetHex)
    updateRootStyles(targetHex, accentText)
  }

  const handleSetAccentText = (id: SkinColorId, hex?: string) => {
    let targetHex = hex || accentText
    if (id !== 'custom') {
      targetHex = SKIN_COLORS.find(c => c.id === id)?.text || '#9333ea'
    }
    setAccentTextId(id)
    setAccentText(targetHex)
    localStorage.setItem(KEYS.T_ID, id)
    if (id === 'custom') localStorage.setItem(KEYS.T_HEX, targetHex)
    updateRootStyles(accentPrimary, targetHex)
  }

  // AI 검색 등으로 아티스트 테마를 즉시 적용하는 마법
  const applyGroupTheme = (primary: string, secondary: string) => {
    setAccentPrimaryId('custom')
    setAccentPrimary(primary)
    setAccentTextId('custom')
    setAccentText(secondary)
    updateRootStyles(primary, secondary)
    // 저장까지 원하시면 아래 주석 해제
    // localStorage.setItem(KEYS.P_ID, 'custom'); localStorage.setItem(KEYS.P_HEX, primary);
  }

  return (
    <ThemeColorContext.Provider value={{
      accentPrimaryId, accentTextId,
      accentPrimary, accentText,
      setAccentPrimary: handleSetAccentPrimary,
      setAccentText: handleSetAccentText,
      applyGroupTheme
    }}>
      <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        {/* 하이드레이션 이전 깜빡임 방지 */}
        <div style={{ visibility: mounted ? 'visible' : 'hidden' }}>
          {children}
        </div>
      </NextThemesProvider>
    </ThemeColorContext.Provider>
  )
}