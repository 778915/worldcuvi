'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Crown, CheckCircle2, Zap, ShieldCheck, Sparkles } from 'lucide-react'
import { useUI } from './UIProvider'
import { useTheme } from 'next-themes'
import { useRouter } from 'next/navigation'

interface PlusNudgeModalProps {
  isOpen: boolean
  onClose: () => void
  reason?: 'rounds' | 'ads' | 'ai'
}

export default function PlusNudgeModal({ isOpen, onClose, reason = 'rounds' }: PlusNudgeModalProps) {
  const { theme } = useTheme()
  const router = useRouter()

  if (!isOpen) return null

  const content = {
    rounds: {
      title: '더 큰 월드컵을 원하시나요?',
      desc: '일반 유저는 최대 64강까지만 생성 가능합니다.\nPLUS로 업그레이드하고 128강 대규모 월드컵을 만드세요!',
    },
    ads: {
      title: '광고 없이 쾌적하게',
      desc: '제작 방해 없는 완벽한 몰입을 원하시나요?\nPLUS 유저는 모든 광고가 즉시 제거됩니다.',
    },
    ai: {
      title: '실시간 AI 우선 분석',
      desc: '대기 시간 없는 초고속 실시간 AI 분석.\nPLUS 유저에게는 최우선 자원이 할당됩니다.',
    }
  }

  const benefits = [
    { icon: Crown, text: '최대 128강 생성 권한' },
    { icon: ShieldCheck, text: '모든 광고 완전 제거' },
    { icon: Zap, text: '매월 부스터 3개 지급' },
    { icon: Sparkles, text: '전용 골드 배지 & 닉네임 효과' },
  ]

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-lg bg-zinc-950 border border-yellow-500/30 rounded-[2.5rem] overflow-hidden shadow-[0_0_50px_rgba(189,149,63,0.2)]"
        >
          {/* Premium Header Decoration */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent" />
          
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-zinc-500 hover:text-white transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="p-10 pt-14 text-center">
            {/* Icon */}
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center mx-auto mb-8 shadow-lg shadow-yellow-500/20 rotate-3">
              <Crown className="w-10 h-10 text-white fill-current" />
            </div>

            <h2 className="text-3xl font-black text-white mb-4 leading-tight">
              {content[reason].title}
            </h2>
            <p className="text-zinc-400 text-lg mb-10 whitespace-pre-line leading-relaxed">
              {content[reason].desc}
            </p>

            {/* Benefits List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10 text-left">
              {benefits.map((b, i) => (
                <div key={i} className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5">
                  <b.icon className="w-5 h-5 text-yellow-500" />
                  <span className="text-sm font-bold text-zinc-200">{b.text}</span>
                </div>
              ))}
            </div>

            {/* CTA Button */}
            <button 
              onClick={() => {
                onClose()
                router.push('/plus')
              }}
              className="w-full py-5 rounded-2xl bg-gradient-to-r from-[#bf953f] via-[#fcf6ba] to-[#aa771c] text-black font-black text-xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-yellow-900/40"
            >
              지금 바로 PLUS 무제한 시작
            </button>
            
            <p className="mt-6 text-xs text-zinc-500 font-medium cursor-pointer hover:text-zinc-400 underline underline-offset-4" onClick={onClose}>
              나중에 할게요
            </p>
          </div>

          {/* Background Sparkles */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none opacity-20 bg-[radial-gradient(circle_at_center,rgba(189,149,63,0.3)_0%,transparent_70%)]" />
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
