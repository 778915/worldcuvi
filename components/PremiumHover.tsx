'use client'

import React from 'react'
import { motion } from 'framer-motion'

interface PremiumHoverProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  disabled?: boolean
}

/**
 * PremiumHover - A modular wrapper to apply the standard 1.1x scale 
 * and breathing aura effect requested by the user.
 */
export default function PremiumHover({ 
  children, 
  className = '', 
  onClick,
  disabled = false 
}: PremiumHoverProps) {
  if (disabled) return <div className={className}>{children}</div>

  return (
    <motion.div
      className={`relative cursor-pointer ${className}`}
      whileHover={{ 
        scale: 1.1,
        zIndex: 50,
      }}
      transition={{ 
        type: "spring", 
        stiffness: 400, 
        damping: 17 
      }}
      onClick={onClick}
    >
      {/* The Breathing Aura Layer */}
      <motion.div
        className="absolute inset-0 rounded-[inherit] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        animate={{
          boxShadow: [
            "0 0 15px 5px color-mix(in srgb, var(--accent-1) 25%, transparent)",
            "0 0 40px 15px color-mix(in srgb, var(--accent-1) 50%, transparent)",
            "0 0 15px 5px color-mix(in srgb, var(--accent-1) 25%, transparent)"
          ]
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      {children}
    </motion.div>
  )
}
