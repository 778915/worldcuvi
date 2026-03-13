'use client'

import React from 'react'
import { Sparkles } from 'lucide-react'
import './CreatorBadge.css'

interface CreatorBadgeProps {
  className?: string
  grade?: string
}

const CreatorBadge = ({ className = '', grade = 'Bronze' }: CreatorBadgeProps) => {
  const getTierColor = () => {
    switch(grade.toLowerCase()) {
      case 'gold': return '#FFD700'
      case 'silver': return '#C0C0C0'
      case 'bronze': return '#CD7F32'
      default: return 'var(--accent-1)'
    }
  }

  const tierColor = getTierColor()

  return (
    <div className={`creator-badge group ${className}`} style={{ '--tier-color': tierColor } as any}>
      <div className="creator-badge-inner" style={{ background: `linear-gradient(135deg, ${tierColor}, color-mix(in srgb, ${tierColor} 80%, black))` }}>
        <Sparkles className="creator-icon" />
      </div>
      <div className="creator-tooltip">
        <span className="grade-pill" style={{ background: tierColor }}>{grade}</span> Official Creator
      </div>
    </div>
  )
}

export default CreatorBadge
