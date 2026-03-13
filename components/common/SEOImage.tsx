'use client'

import React from 'react'
import Image, { ImageProps } from 'next/image'

interface SEOImageProps extends Omit<ImageProps, 'alt'> {
  alt?: string
  worldcupTitle?: string
  candidateName?: string
}

/**
 * SEO Optimized Image Component
 * Automatically generates alt text if not provided.
 * Supports priority for LCP optimization.
 */
const SEOImage = ({
  alt,
  worldcupTitle,
  candidateName,
  ...props
}: SEOImageProps) => {
  // Auto-generate alt text if not provided
  const generatedAlt = alt || (
    worldcupTitle || candidateName 
      ? `월드커비: ${worldcupTitle || ''} ${candidateName || ''}`.trim()
      : '월드커비 - 최고의 월드컵 대결'
  )

  return (
    <Image
      alt={generatedAlt}
      {...props}
    />
  )
}

export default SEOImage
