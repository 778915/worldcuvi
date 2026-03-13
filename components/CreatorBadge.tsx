'use client'

import React from 'react'
import { Sparkles } from 'lucide-react'
import './CreatorBadge.css'

interface CreatorBadgeProps {
  className?: string
  grade?: string
}

const CreatorBadge = ({ className = '', grade = 'Bronze' }: CreatorBadgeProps) => {
  return (
    <div className={`creator-badge group ${className}`}>
      <div className="creator-badge-inner">
        <Sparkles className="creator-icon" />
      </div>
      <div className="creator-tooltip">
        <span className="grade-pill">{grade}</span> Official Creator
      </div>
    </div>
  )
}

export default CreatorBadge
