'use client'

import React, { useState } from 'react'
import { Play } from 'lucide-react'
import SEOImage from '@/components/common/SEOImage'

interface VideoThumbnailProps {
  videoId?: string
  thumbnailUrl?: string
  title?: string
  className?: string
  aspectRatio?: string
  onPlayClick?: (e: React.MouseEvent) => void
}

export default function VideoThumbnail({
  videoId,
  thumbnailUrl,
  title,
  className = '',
  aspectRatio = 'aspect-video',
  onPlayClick
}: VideoThumbnailProps) {
  const [isPlaying, setIsPlaying] = useState(false)

  if (isPlaying && videoId) {
    return (
      <div className={`relative ${aspectRatio} w-full bg-black overflow-hidden ${className}`}>
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&showinfo=0&iv_load_policy=3&controls=1`}
          title={title || 'Video Player'}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      </div>
    )
  }

  return (
    <div 
      className={`relative ${aspectRatio} w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 group/vid cursor-pointer ${className}`}
      onClick={(e) => {
        if (onPlayClick) {
          e.preventDefault()
          e.stopPropagation()
          onPlayClick(e)
          return
        }
        if (videoId) {
          e.preventDefault()
          e.stopPropagation()
          setIsPlaying(true)
        }
      }}
    >
      {thumbnailUrl ? (
        <SEOImage 
          src={thumbnailUrl} 
          worldcupTitle={title}
          fill
          className="absolute inset-0 w-full h-full object-cover group-hover/vid:scale-110 transition-transform duration-700" 
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-4xl">🏆</div>
      )}
      
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/20 group-hover/vid:bg-black/40 transition-colors flex items-center justify-center">
        <div className="w-12 h-12 md:w-14 md:h-14 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center scale-90 group-hover/vid:scale-100 transition-transform duration-500 border border-white/30">
          <Play className="w-6 h-6 text-white fill-white ml-0.5" />
        </div>
      </div>
    </div>
  )
}
