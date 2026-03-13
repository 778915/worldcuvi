import { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://worldcuvi.world'
  const supabase = await createClient()

  // 1. DB에서 모든 공개된 월드컵 ID 가져오기
  const { data: worldcups } = await supabase
    .from('worldcups')
    .select('id, updated_at')
    .order('created_at', { ascending: false })

  // 2. 월드컵 상세 페이지 URL 생성
  const worldcupUrls = (worldcups || []).map((wc) => ({
    url: `${baseUrl}/worldcup/${wc.id}`,
    lastModified: new Date(wc.updated_at || new Date()),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  // 3. 고정 페이지(홈, 검색 등) 추가
  const staticUrls: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1.0,
    },
    {
      url: `${baseUrl}/worldcup`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/news`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/dashboard`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    },
  ]

  return [...staticUrls, ...worldcupUrls]
}
