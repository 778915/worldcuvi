import React from 'react'
import { Metadata, ResolvingMetadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import ClientDetailWrapper from './ClientDetailWrapper'

type Props = {
  params: { id: string }
}

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const supabase = await createClient()
  const { data: wc } = await supabase
    .from('worldcups')
    .select('title, description, thumbnail_url')
    .eq('id', params.id)
    .single()

  if (!wc) return { title: 'WorldCuvi' }

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
      url: `https://worldcuvi.com/worldcup/${params.id}`,
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

export default function WorldcupDetailPage() {
  return <ClientDetailWrapper />
}
