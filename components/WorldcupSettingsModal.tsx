'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, Loader2, Save, EyeOff, Trash2, AlertCircle } from 'lucide-react'
import { useAccent } from './ThemeProvider'
import { createClient } from '@/lib/supabase/client'
import PremiumHover from './PremiumHover'

interface WorldcupSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  worldcup: {
    id: string
    title: string
    category: string
    desc: string
  }
  onUpdate: (updatedData: any) => void
  onDeleted: () => void
}

const CATEGORIES = ['애니메이션', '스포츠', '게임', '연예인/인플루언서', '음식', '음악', '동물/힐링', '영화/드라마', '명언/망언', '기타']

export default function WorldcupSettingsModal({ isOpen, onClose, worldcup, onUpdate, onDeleted }: WorldcupSettingsModalProps) {
  const { accentPrimary } = useAccent()
  const [title, setTitle] = useState(worldcup.title)
  const [category, setCategory] = useState(worldcup.category)
  const [desc, setDesc] = useState(worldcup.desc)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  
  const supabase = createClient()

  if (!isOpen) return null

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    const { error } = await supabase
      .from('worldcups')
      .update({ 
        title, 
        category, 
        description: desc 
      })
      .eq('id', worldcup.id)

    if (!error) {
      onUpdate({ title, category, desc })
      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        onClose()
      }, 1500)
    } else {
      alert('업데이트 중 오류가 발생했습니다: ' + error.message)
    }
    setLoading(false)
  }

  const handleStatusUpdate = async (newStatus: 'hidden' | 'active' | 'deleted') => {
    if (newStatus === 'deleted' && !showDeleteConfirm) {
      setShowDeleteConfirm(true)
      return
    }

    setLoading(true)
    const { error } = await supabase
      .from('worldcups')
      .update({ status: newStatus })
      .eq('id', worldcup.id)

    if (!error) {
      if (newStatus === 'deleted' || newStatus === 'hidden') {
        alert(newStatus === 'deleted' ? '월드컵이 삭제되었습니다.' : '월드컵이 숨김 처리되었습니다.')
        onDeleted()
      } else {
        alert('상태가 업데이트되었습니다.')
      }
    } else {
      alert('상태 업데이트 중 오류가 발생했습니다: ' + error.message)
    }
    setLoading(false)
    setShowDeleteConfirm(false)
  }

  return (
    <AnimatePresence>
      <motion.div 
        key="settings-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm" 
        onClick={onClose} 
      />
      <motion.div
        key="settings-modal"
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl border border-black/5 dark:border-white/10 overflow-hidden z-[1000]"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-black italic tracking-tighter" style={{ color: accentPrimary }}>WORLDCUP SETTINGS</h3>
            <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-zinc-400 tracking-widest block px-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-black/5 dark:border-white/5 rounded-2xl px-5 py-4 text-lg font-bold focus:outline-none focus:ring-2 transition-all"
                style={{ '--tw-ring-color': `${accentPrimary}20`, color: 'var(--accent-2)' } as any}
                placeholder="월드컵 제목"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-zinc-400 tracking-widest block px-1">Category</label>
              <div className="relative">
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-black/5 dark:border-white/5 rounded-2xl px-5 py-4 text-sm font-bold appearance-none focus:outline-none focus:ring-2 transition-all"
                  style={{ '--tw-ring-color': `${accentPrimary}20`, color: 'var(--accent-2)' } as any}
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                  <motion.div animate={{ y: [0, 2, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
                    <Check className="w-4 h-4 text-zinc-400 rotate-90" />
                  </motion.div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-zinc-400 tracking-widest block px-1">Description</label>
              <textarea
                value={desc}
                onChange={e => setDesc(e.target.value)}
                rows={3}
                className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-black/5 dark:border-white/5 rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:ring-2 transition-all resize-none"
                style={{ '--tw-ring-color': `${accentPrimary}20`, color: 'var(--accent-2)' } as any}
                placeholder="월드컵에 대한 설명을 입력하세요..."
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-black/5 dark:border-white/5">
              <PremiumHover className="flex-1">
                <button
                  type="submit"
                  disabled={loading || success}
                  className="w-full h-14 flex items-center justify-center gap-2 rounded-2xl text-white font-black text-sm uppercase transition-all shadow-lg"
                  style={{ backgroundColor: accentPrimary }}
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : success ? <Check className="w-5 h-5" /> : <><Save className="w-5 h-5" /> SAVE CHANGES</>}
                </button>
              </PremiumHover>
            </div>
          </form>

          <div className="mt-8 pt-8 border-t border-black/5 dark:border-white/5 space-y-4">
             <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/50 p-6 rounded-[2rem]">
               <div>
                  <h4 className="font-black text-sm mb-1" style={{ color: 'var(--accent-2)' }}>관리자 위험 구역</h4>
                  <p className="text-[10px] text-zinc-500">주의: 월드컵을 숨기거나 영구 삭제할 수 있습니다.</p>
               </div>
               <div className="flex gap-2">
                  <button
                    onClick={() => handleStatusUpdate('hidden')}
                    className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-orange-500/10 hover:text-orange-500 transition-all text-zinc-400"
                    title="숨기기"
                  >
                    <EyeOff className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleStatusUpdate('deleted')}
                    className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-red-500/10 hover:text-red-500 transition-all text-zinc-400"
                    title="삭제하기"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
               </div>
             </div>

             {showDeleteConfirm && (
               <motion.div
                 initial={{ opacity: 0, height: 0 }}
                 animate={{ opacity: 1, height: 'auto' }}
                 className="p-6 bg-red-500/10 border border-red-500/20 rounded-[2rem] flex flex-col items-center gap-4 text-center"
               >
                 <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6" />
                 </div>
                 <div>
                    <p className="text-sm font-black text-red-600 dark:text-red-400">정말로 삭제하시겠습니까?</p>
                    <p className="text-xs text-red-500/60 mt-1">이 작업은 취소할 수 없습니다.</p>
                 </div>
                 <div className="flex gap-2 w-full">
                    <button 
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 py-3 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-sm font-bold opacity-70 hover:opacity-100 transition-all"
                    >
                      취소
                    </button>
                    <button 
                      onClick={() => handleStatusUpdate('deleted')}
                      className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-black shadow-lg shadow-red-500/20"
                    >
                      진짜 삭제
                    </button>
                 </div>
               </motion.div>
             )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
