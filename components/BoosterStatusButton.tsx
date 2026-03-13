'use client'

import React, { useState, useEffect } from 'react'
import './BoosterStatusButton.css'

interface BoosterStatusButtonProps {
  boosterCount: number
  className?: string
}

export default function BoosterStatusButton({ boosterCount, className = '' }: BoosterStatusButtonProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isHighPower = boosterCount >= 5
  const isZero = boosterCount === 0
  
  const particleCount = isHighPower ? 20 : (isZero ? 0 : 10)
  const speedMultiplier = isHighPower ? 0.67 : 1 // 1.5x faster means duration is 1/1.5 = 0.67

  const getVariantClass = () => {
    if (isZero) return 'count-0'
    if (isHighPower) return 'count-high'
    return 'count-low'
  }

  return (
    <div className={`status-button ${getVariantClass()} ${className}`}>
      {!isZero && mounted && (
        <div className="status-points">
          {[...Array(particleCount)].map((_, i) => (
            <i
              key={i}
              className="status-point"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${(1.5 + Math.random() * 1.5) * speedMultiplier}s`,
                opacity: 0.4 + Math.random() * 0.5
              }}
            />
          ))}
        </div>
      )}

      <span className="status-inner">
        <svg
          className="status-icon"
          fill={isZero ? 'none' : 'currentColor'}
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <polyline 
            points="13.18 1.37 13.18 9.64 21.45 9.64 10.82 22.63 10.82 14.36 2.55 14.36 13.18 1.37"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.5"
          />
        </svg>
        <span>{isZero ? '부스터 0' : `부스터 ${boosterCount}`}</span>
      </span>
    </div>
  )
}
