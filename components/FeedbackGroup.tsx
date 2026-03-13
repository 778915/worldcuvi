'use client'

import React, { useState } from 'react'
import './FeedbackGroup.css'
import { useAccent } from './ThemeProvider'

interface FeedbackGroupProps {
  initialValue?: 'like' | 'unlike' | null
  onFeedback?: (value: 'like' | 'unlike' | null) => void
  disabled?: boolean
}

export default function FeedbackGroup({ 
  initialValue = null, 
  onFeedback,
  disabled = false
}: FeedbackGroupProps) {
  const [selectedValue, setSelectedValue] = useState<'like' | 'unlike' | null>(initialValue)
  const { accentText } = useAccent()

  const handleToggle = (value: 'like' | 'unlike') => {
    if (disabled) return
    
    const newValue = selectedValue === value ? null : value
    setSelectedValue(newValue)
    if (onFeedback) {
      onFeedback(newValue)
    }
  }

  return (
    <div className={`feedback-container ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      {/* Like Button */}
      <div className="feedback-item" onClick={() => handleToggle('like')}>
        <input
          type="radio"
          name="feedback"
          value="like"
          checked={selectedValue === 'like'}
          readOnly
          className="feedback-radio"
        />
        <label className="feedback-label" style={{ color: accentText }}>
          <svg
            className="feedback-icon"
            viewBox="0 0 27 27"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M0.7229 26.5H5.92292V10.9008H0.7229V26.5ZM26.6299 15.2618L24.372 23.7566C23.9989 25.3696 22.5621 26.5 20.9072 26.5H8.52293V10.9278L10.7573 2.87293C10.9669 1.50799 12.1418 0.5 13.524 0.5C15.0699 0.5 16.323 1.7527 16.323 3.29837V10.8998H23.1651C25.4519 10.9009 27.1453 13.0335 26.6299 15.2618Z"
            />
          </svg>
          추천
        </label>
      </div>

      {/* Unlike Button */}
      <div className="feedback-item" onClick={() => handleToggle('unlike')}>
        <input
          type="radio"
          name="feedback"
          value="unlike"
          checked={selectedValue === 'unlike'}
          readOnly
          className="feedback-radio"
        />
        <label className="feedback-label" style={{ color: accentText }}>
          <svg
            className="feedback-icon"
            viewBox="0 0 27 27"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M26.7229 0.5L21.5229 0.5L21.5229 16.0992L26.7229 16.0992L26.7229 0.5ZM0.815853 11.7382L3.07376 3.24339C3.44687 1.63037 4.88372 0.500027 6.53861 0.500027L18.9229 0.500028L18.9229 16.0722L16.6885 24.1271C16.4789 25.492 15.304 26.5 13.9218 26.5C12.3759 26.5 11.1228 25.2473 11.1228 23.7016L11.1228 16.1002L4.28068 16.1002C1.99391 16.0991 0.300502 13.9664 0.815853 11.7382Z"
            />
          </svg>
          비추천
        </label>
      </div>
    </div>
  )
}
