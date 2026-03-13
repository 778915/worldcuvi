'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, User, Check, Loader2 } from 'lucide-react'
import { useAuth } from './AuthProvider'
import { useUI } from './UIProvider'
import { useAccent } from './ThemeProvider'
import { createClient } from '@/lib/supabase/client'
import PremiumHover from './PremiumHover'

export default function SettingsModal() {
  const { user, profile, refreshProfile } = useAuth()
  const { settingsModalOpen, settingsModalPos, closeSettingsModal } = useUI()
  const { accentPrimary, accentText } = useAccent()
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (profile?.nickname) {
      setNickname(profile.nickname)
    }
  }, [profile])

  if (!settingsModalOpen) return null

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setLoading(true)
    
    const { error } = await supabase
      .from('users')
      .update({ nickname })
      .eq('id', user.id)

    if (!error) {
      await refreshProfile()
      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        closeSettingsModal()
      }, 1500)
    } else {
      alert('Error updating nickname: ' + error.message)
    }
    setLoading(false)
  }

  const modalStyle: React.CSSProperties = settingsModalPos ? {
    position: 'fixed',
    left: Math.min(settingsModalPos.x, typeof window !== 'undefined' ? window.innerWidth - 320 : settingsModalPos.x),
    top: Math.min(settingsModalPos.y, typeof window !== 'undefined' ? window.innerHeight - 400 : settingsModalPos.y),
    zIndex: 1000,
  } : {
    position: 'fixed',
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 1000,
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[999]" onClick={closeSettingsModal} />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 10 }}
        style={modalStyle}
        className="w-[300px] bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-black/5 dark:border-white/10 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-black italic tracking-tighter" style={{ color: accentPrimary }}>SETTINGS</h3>
            <button onClick={closeSettingsModal} className="text-zinc-400 hover:text-zinc-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest block mb-2 px-1">Internal Nickname</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-black/5 dark:border-white/5 rounded-2xl pl-10 pr-4 py-3 text-sm font-black focus:outline-none focus:ring-2 transition-all"
                  style={{ '--tw-ring-color': `${accentPrimary}20`, color: 'var(--accent-2)' } as any}
                  placeholder="Set your nickname..."
                  maxLength={20}
                />
              </div>
            </div>

            <PremiumHover className="w-full">
              <button
                type="submit"
                disabled={loading || success}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white font-black text-sm uppercase transition-all shadow-lg"
                style={{ backgroundColor: accentPrimary }}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : success ? (
                  <>
                    <Check className="w-4 h-4" />
                    SAVED!
                  </>
                ) : (
                  'UPDATE PROFILE'
                )}
              </button>
            </PremiumHover>
          </form>
        </div>
        
        <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-800/30 border-t border-black/5 dark:border-white/5">
          <p className="text-[9px] text-zinc-400 leading-relaxed font-medium">
            Your internal nickname is used across WorldCuvi for rankings, comments, and creation logs.
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
