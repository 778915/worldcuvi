import React from 'react'
import { Metadata, ResolvingMetadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import ClientDetailWrapper from './ClientDetailWrapper'

type Props = {
  params: Promise<{ id: string }>
}

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data: wc } = await supabase
    .from('worldcups')
    .select('title, description, thumbnail_url')
    .eq('id', id)
    .single()

  if (!wc) return { title: 'WorldCuvi' }

  const baseUrl = 'https://worldcuvi.world'

  return {
    title: `${wc.title} | WorldCuvi`,
    description: wc.description || '재미있는 이상형 월드컵을 플레이해보세요!',
    openGraph: {
      title: wc.title,
      description: wc.description || '재미있는 이상형 월드컵을 플레이해보세요!',
      images: [
        {
          url: wc.thumbnail_url,
          width: 1200,
          height: 630, // 1.91:1 Ratio for Kakao/FB/X
          alt: wc.title,
        },
      ],
      url: `${baseUrl}/worldcup/${id}`,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: wc.title,
      description: wc.description || '재미있는 이상형 월드컵을 플레이해보세요!',
      images: [wc.thumbnail_url],
    },
  }
}

import Script from 'next/script'

export default async function WorldcupDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: wc } = await supabase
    .from('worldcups')
    .select('title, description, like_count')
    .eq('id', id)
    .single()

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": wc?.title || 'Worldcup',
    "operatingSystem": "Web",
    "applicationCategory": "GameApplication",
    "description": wc?.description || '재미있는 이상형 월드컵을 플레이해보세요!',
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "ratingCount": Math.max(wc?.like_count || 0, 10)
    },
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "KRW"
    }
  }

  return (
    <main>
      <Script
        id="structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ClientDetailWrapper />
    </main>
  )
}
