'use client'

import React, { useMemo, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import './BoosterButton.css'

interface BoosterButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string
  isFullPower?: boolean
  boosterCount?: number
}

// 단계별 색상 및 설정 정의
const LEVELS = {
  0: { // Lv.0: Grayscale (0개)
    main: '#3f3f46', // zinc-700
    glow: 'rgba(63, 63, 70, 0.4)',
    speed: 0,
    particleCount: 0,
    pulseScale: 1,
    pulseGlow: '0 0 0px transparent'
  },
  1: { // Lv.1: Blue Side (1~2개)
    main: '#3b82f6',
    glow: 'rgba(59, 130, 246, 0.5)',
    speed: 1.2,
    particleCount: 8,
    pulseScale: 1.015,
    pulseGlow: '0 0 10px rgba(59, 130, 246, 0.4)'
  },
  2: { // Lv.2: Purple Side (3~4개)
    main: '#7a5af8', 
    glow: 'rgba(122, 90, 248, 0.6)',
    speed: 1,
    particleCount: 12,
    pulseScale: 1.03,
    pulseGlow: '0 0 18px rgba(122, 90, 248, 0.5)'
  },
  3: { // Lv.3: Red Side (5개 이상)
    main: '#ef4444',
    glow: 'rgba(239, 68, 68, 0.8)',
    speed: 0.7,
    particleCount: 20,
    pulseScale: 1.05,
    pulseGlow: '0 0 25px rgba(239, 68, 68, 0.7)'
  }
}

export default function BoosterButton({ 
  label = 'Booster', 
  className = '', 
  isFullPower = false, 
  boosterCount = 0,
  ...props 
}: BoosterButtonProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // 현재 레벨 결정
  const level = useMemo(() => {
    if (isFullPower || boosterCount >= 5) return 3
    if (boosterCount >= 3) return 2
    if (boosterCount >= 1) return 1
    return 0 // 0개일 때
  }, [isFullPower, boosterCount])

  const config = LEVELS[level as keyof typeof LEVELS]

  return (
    <motion.button 
      type="button" 
      className={`booster-button ${level === 3 ? 'full-power' : ''} ${className}`} 
      animate={{
        '--booster-main': config.main,
        '--booster-glow': config.glow,
        boxShadow: config.pulseGlow,
        scale: [1, config.pulseScale, 1],
        filter: level === 0 ? 'grayscale(100%)' : 'grayscale(0%)'
      } as any}
      transition={{ 
        '--booster-main': { duration: 0.5 },
        '--booster-glow': { duration: 0.5 },
        scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
        boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" }
      }}
      {...props as any}
    >
      <span className="booster-fold"></span>

      <div className="booster-points_wrapper">
        <AnimatePresence>
          {mounted && [...Array(config.particleCount)].map((_, i) => (
            <motion.i
              key={`${level}-${i}`}
              className="booster-point"
              initial={{ y: 0, opacity: 0 }}
              animate={{ 
                y: -55, 
                opacity: [0, 1, 0],
                backgroundColor: '#fff'
              }}
              transition={{
                duration: (1.5 + Math.random() * 1.5) * config.speed,
                repeat: Infinity,
                delay: Math.random() * 2,
                ease: "easeInOut"
              }}
              style={{
                left: `${(i * (100 / config.particleCount)) + (Math.random() * 10)}%`,
              }}
            />
          ))}
        </AnimatePresence>
      </div>

      <span className="booster-inner">
        <svg
          className="booster-icon"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.5"
        >
          <polyline points="13.18 1.37 13.18 9.64 21.45 9.64 10.82 22.63 10.82 14.36 2.55 14.36 13.18 1.37"></polyline>
        </svg>
        {mounted ? label : '...'}
      </span>
    </motion.button>
  )
}
