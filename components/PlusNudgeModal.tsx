'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Crown, Zap, ShieldCheck, Sparkles, BrainCircuit } from 'lucide-react'
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
      title: '차원이 다른 AI 분석 성능',
      desc: '대기 시간 없는 초고속 실시간 분석은 물론,\n최상위 모델인 Gemini Pro의 정밀 분석을 제공합니다.',
    }
  }

  const benefits = [
    { icon: Crown, text: '최대 128강 생성 권한', color: 'text-yellow-500' },
    { icon: BrainCircuit, text: 'Gemini 3 Pro 정밀 분석', color: 'text-purple-400' },
    { icon: ShieldCheck, text: '모든 광고 완전 제거', color: 'text-blue-400' },
    { icon: Sparkles, text: '전용 골드 배지 & 이펙트', color: 'text-amber-400' },
  ]

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        {/* Backdrop: 더 깊이감 있는 블러 적용 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/90 backdrop-blur-xl"
        />

        {/* Modal Body */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 30 }}
          className="relative w-full max-w-lg bg-zinc-950 border border-yellow-500/20 rounded-[3rem] overflow-hidden shadow-[0_0_80px_rgba(189,149,63,0.15)]"
        >
          {/* Top Decorative Line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-8 right-8 w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/10 transition-all z-10"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="p-10 pt-16 text-center">
            {/* Premium Icon Badge */}
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-700 flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-yellow-500/30"
            >
              <Crown className="w-12 h-12 text-white fill-current" />
            </motion.div>

            <h2 className="text-3xl font-black text-white mb-4 tracking-tight">
              {content[reason].title}
            </h2>
            <p className="text-zinc-400 text-lg mb-12 whitespace-pre-line leading-relaxed font-medium">
              {content[reason].desc}
            </p>

            {/* Benefits Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-12 text-left">
              {benefits.map((b, i) => (
                <div key={i} className="flex items-center gap-3 p-5 rounded-[1.5rem] bg-white/[0.03] border border-white/[0.05] hover:border-yellow-500/30 transition-colors group">
                  <b.icon className={`w-5 h-5 ${b.color} group-hover:scale-110 transition-transform`} />
                  <span className="text-[15px] font-bold text-zinc-200">{b.text}</span>
                </div>
              ))}
            </div>

            {/* Main CTA Button: 골드 그라데이션 강화 */}
            <button
              onClick={() => {
                onClose()
                router.push('/plus')
              }}
              className="group relative w-full py-6 rounded-[1.5rem] bg-gradient-to-b from-[#fceabb] via-[#f8b500] to-[#fceabb] text-black font-black text-xl overflow-hidden shadow-[0_10px_40px_rgba(189,149,63,0.4)]"
            >
              <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="relative flex items-center justify-center gap-2">
                <Zap className="w-5 h-5 fill-current" />
                지금 바로 PLUS 시작하기
              </span>
            </button>

            <button
              onClick={onClose}
              className="mt-8 text-sm text-zinc-600 font-bold hover:text-zinc-400 transition-colors uppercase tracking-widest"
            >
              나중에 할게요
            </button>
          </div>

          {/* Background Ambient Light */}
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-yellow-500/10 blur-[100px] pointer-events-none" />
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-amber-500/10 blur-[100px] pointer-events-none" />
        </motion.div>
      </div>
    </AnimatePresence>
  )
}