'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Zap, Star, ShieldCheck, CreditCard } from 'lucide-react'
import { useUI } from './UIProvider'

export default function BoosterModal() {
  const { boosterModalOpen, closeBoosterModal } = useUI()

  if (!boosterModalOpen) return null

  const boosterTypes = [
    { id: '1', title: '실시간 급상승 부스터', desc: '1시간 동안 노출 확률 200% 증가', price: 900, icon: Zap, color: 'text-yellow-400' },
    { id: '2', title: '명예의 전당 부스터', desc: '시상대 진입 시 파티클 효과 강화', price: 2500, icon: Star, color: 'text-purple-400' },
    { id: '3', title: '공식 인증 창작자 패스', desc: '월드컵 썸네일에 인증 마크 부여', price: 5000, icon: ShieldCheck, color: 'text-blue-400' },
  ]

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeBoosterModal}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Content */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-lg bg-zinc-950 border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                부스터 샵
              </h2>
              <p className="text-sm text-zinc-500 mt-1">작품에 더 강력한 에너지를 불어넣으세요</p>
            </div>
            <button 
              onClick={closeBoosterModal}
              className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* List */}
          <div className="p-6 space-y-4">
            {boosterTypes.map((type) => (
              <div 
                key={type.id}
                className="group relative p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all cursor-pointer overflow-hidden"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center shrink-0 border border-white/5`}>
                    <type.icon className={`w-6 h-6 ${type.color}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <h3 className="font-bold text-white text-base">{type.title}</h3>
                      <span className="text-sm font-mono text-zinc-400">{type.price.toLocaleString()} P</span>
                    </div>
                    <p className="text-sm text-zinc-500 mt-1">{type.desc}</p>
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite]" />
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="p-6 bg-white/[0.02] border-t border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-zinc-500 text-sm">
              <CreditCard className="w-4 h-4" />
              보유 포인트: <span className="text-white font-bold">1,250 P</span>
            </div>
            <button className="px-6 py-2.5 rounded-xl bg-white text-black font-bold text-sm hover:scale-105 active:scale-95 transition-all">
              충전하기
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
