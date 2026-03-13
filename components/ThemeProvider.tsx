'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

// ── 스킨 컬러 팔레트 ──────────────────────────────────────────
export const SKIN_COLORS = [
  { id: 'red',    primary: '#ef4444', text: '#dc2626', label: '레드' },
  { id: 'orange', primary: '#f97316', text: '#ea580c', label: '오렌지' },
  { id: 'yellow', primary: '#eab308', text: '#ca8a04', label: '옐로우' },
  { id: 'green',  primary: '#22c55e', text: '#16a34a', label: '그린' },
  { id: 'blue',   primary: '#3b82f6', text: '#2563eb', label: '블루' },
  { id: 'indigo', primary: '#6366f1', text: '#4f46e5', label: '인디고' },
  { id: 'purple', primary: '#a855f7', text: '#9333ea', label: '퍼플' },
] as const

export type SkinColorId = typeof SKIN_COLORS[number]['id'] | 'custom'
const STORAGE_PRIMARY_ID_KEY = 'worldcuvi-skin-primary-id'
const STORAGE_PRIMARY_HEX_KEY = 'worldcuvi-skin-primary-hex'
const STORAGE_TEXT_ID_KEY = 'worldcuvi-skin-text-id'
const STORAGE_TEXT_HEX_KEY = 'worldcuvi-skin-text-hex'

interface ThemeColorContextType {
  accentPrimaryId: SkinColorId
  accentTextId: SkinColorId
  accentPrimary: string
  accentText: string
  setAccentPrimary: (id: SkinColorId, customHex?: string) => void
  setAccentText: (id: SkinColorId, customHex?: string) => void
}

const ThemeColorContext = createContext<ThemeColorContextType>({
  accentPrimaryId: 'purple',
  accentTextId: 'purple',
  accentPrimary: '#a855f7',
  accentText: '#9333ea',
  setAccentPrimary: () => {},
  setAccentText: () => {},
})

export function useAccent() {
  return useContext(ThemeColorContext)
}

function applyAccentPrimary(hex: string) {
  document.documentElement.style.setProperty('--accent-primary', hex)
  document.documentElement.style.setProperty('--accent-1', hex)
}
function applyAccentText(hex: string) {
  document.documentElement.style.setProperty('--accent-text', hex)
  document.documentElement.style.setProperty('--accent-2', hex)
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [accentPrimaryId, setAccentPrimaryId] = useState<SkinColorId>('purple')
  const [customPrimaryHex, setCustomPrimaryHex] = useState<string>('#a855f7')
  const [accentTextId, setAccentTextId] = useState<SkinColorId>('purple')
  const [customTextHex, setCustomTextHex] = useState<string>('#9333ea')

  useEffect(() => {
    // Primary 로드
    const savedPId = localStorage.getItem(STORAGE_PRIMARY_ID_KEY) as SkinColorId | null
    const savedPHex = localStorage.getItem(STORAGE_PRIMARY_HEX_KEY)
    if (savedPId === 'custom' && savedPHex) {
      setAccentPrimaryId('custom')
      setCustomPrimaryHex(savedPHex)
      applyAccentPrimary(savedPHex)
    } else if (savedPId) {
      const found = SKIN_COLORS.find((c) => c.id === savedPId)
      if (found) {
        setAccentPrimaryId(found.id)
        applyAccentPrimary(found.primary)
      } else applyAccentPrimary('#a855f7')
    } else applyAccentPrimary('#a855f7')

    // Text 로드
    const savedTId = localStorage.getItem(STORAGE_TEXT_ID_KEY) as SkinColorId | null
    const savedTHex = localStorage.getItem(STORAGE_TEXT_HEX_KEY)
    if (savedTId === 'custom' && savedTHex) {
      setAccentTextId('custom')
      setCustomTextHex(savedTHex)
      applyAccentText(savedTHex)
    } else if (savedTId) {
      const found = SKIN_COLORS.find((c) => c.id === savedTId)
      if (found) {
        setAccentTextId(found.id)
        applyAccentText(found.text) // OR found.primary based on right click selection
      } else applyAccentText('#9333ea')
    } else applyAccentText('#9333ea')
  }, [])

  const handleSetAccentPrimary = (id: SkinColorId, hex?: string) => {
    setAccentPrimaryId(id)
    localStorage.setItem(STORAGE_PRIMARY_ID_KEY, id)
    if (id === 'custom') {
      const target = hex || customPrimaryHex
      setCustomPrimaryHex(target)
      applyAccentPrimary(target)
      localStorage.setItem(STORAGE_PRIMARY_HEX_KEY, target)
    } else {
      const found = SKIN_COLORS.find((c) => c.id === id)!
      applyAccentPrimary(found.primary)
    }
  }

  const handleSetAccentText = (id: SkinColorId, hex?: string) => {
    setAccentTextId(id)
    localStorage.setItem(STORAGE_TEXT_ID_KEY, id)
    if (id === 'custom') {
      const target = hex || customTextHex
      setCustomTextHex(target)
      applyAccentText(target)
      localStorage.setItem(STORAGE_TEXT_HEX_KEY, target)
    } else {
      const found = SKIN_COLORS.find((c) => c.id === id)!
      // Use found.primary when selected, or text variant? The prompt asks for Accent 2 selection.
      applyAccentText(found.primary) 
    }
  }

  const currentPrimary = accentPrimaryId === 'custom' ? customPrimaryHex : SKIN_COLORS.find((c) => c.id === accentPrimaryId)?.primary ?? '#a855f7'
  const currentText = accentTextId === 'custom' ? customTextHex : SKIN_COLORS.find((c) => c.id === accentTextId)?.primary ?? '#9333ea' // use primary color for both if standard is clicked

  return (
    <ThemeColorContext.Provider value={{
      accentPrimaryId, accentTextId,
      accentPrimary: currentPrimary, accentText: currentText,
      setAccentPrimary: handleSetAccentPrimary, setAccentText: handleSetAccentText
    }}>
      <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        {children}
      </NextThemesProvider>
    </ThemeColorContext.Provider>
  )
}
