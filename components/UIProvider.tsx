'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface UIContextType {
  loginModalOpen: boolean
  openLoginModal: () => void
  closeLoginModal: () => void
  searchDockOpen: boolean
  searchDockQuery: string
  searchDockFilter: string
  searchDockPlaceholder: string
  searchDockPos: { x: number; y: number } | null
  openSearchDock: (filter?: string, placeholder?: string, pos?: { x: number; y: number }) => void
  closeSearchDock: () => void
  setSearchDockQuery: (q: string) => void
  boosterModalOpen: boolean
  openBoosterModal: () => void
  closeBoosterModal: () => void
  settingsModalOpen: boolean
  settingsModalPos: { x: number; y: number } | null
  openSettingsModal: (pos?: { x: number; y: number }) => void
  closeSettingsModal: () => void
}

const UIContext = createContext<UIContextType>({
  loginModalOpen: false,
  openLoginModal: () => {},
  closeLoginModal: () => {},
  searchDockOpen: false,
  searchDockQuery: '',
  searchDockFilter: '',
  searchDockPlaceholder: '',
  searchDockPos: null,
  openSearchDock: () => {},
  closeSearchDock: () => {},
  setSearchDockQuery: () => {},
  boosterModalOpen: false,
  openBoosterModal: () => {},
  closeBoosterModal: () => {},
  settingsModalOpen: false,
  settingsModalPos: null,
  openSettingsModal: () => {},
  closeSettingsModal: () => {},
})

export function UIProvider({ children }: { children: ReactNode }) {
  const [loginModalOpen, setLoginModalOpen] = useState(false)
  const [searchDockOpen, setSearchDockOpen] = useState(false)
  const [searchDockQuery, setSearchDockQuery] = useState('')
  const [searchDockFilter, setSearchDockFilter] = useState('')
  const [searchDockPlaceholder, setSearchDockPlaceholder] = useState('')
  const [searchDockPos, setSearchDockPos] = useState<{ x: number; y: number } | null>(null)
  const [boosterModalOpen, setBoosterModalOpen] = useState(false)
  const [settingsModalOpen, setSettingsModalOpen] = useState(false)
  const [settingsModalPos, setSettingsModalPos] = useState<{ x: number; y: number } | null>(null)

  return (
    <UIContext.Provider
      value={{
        loginModalOpen,
        openLoginModal: () => setLoginModalOpen(true),
        closeLoginModal: () => setLoginModalOpen(false),
        searchDockOpen,
        searchDockQuery,
        searchDockFilter,
        searchDockPlaceholder,
        searchDockPos,
        openSearchDock: (filter?: string, placeholder?: string, pos?: { x: number; y: number }) => {
          setSearchDockFilter(filter || '')
          setSearchDockPlaceholder(placeholder || '')
          setSearchDockQuery('') // 항상 입력창 초기화
          if (pos !== undefined) setSearchDockPos(pos)
          setSearchDockOpen(true)
        },
        closeSearchDock: () => {
          setSearchDockOpen(false)
          setSearchDockPos(null)
          setSearchDockFilter('')
          setSearchDockPlaceholder('')
        },
        setSearchDockQuery,
        boosterModalOpen,
        openBoosterModal: () => setBoosterModalOpen(true),
        closeBoosterModal: () => setBoosterModalOpen(false),
        settingsModalOpen,
        settingsModalPos,
        openSettingsModal: (pos?: { x: number; y: number }) => {
          if (pos) setSettingsModalPos(pos)
          setSettingsModalOpen(true)
        },
        closeSettingsModal: () => {
          setSettingsModalOpen(false)
          setSettingsModalPos(null)
        },
      }}
    >
      {children}
    </UIContext.Provider>
  )
}

export const useUI = () => useContext(UIContext)
