import { createClient } from '@/lib/supabase/server'

interface GroupTheme {
  primary_color: string
  secondary_color: string
}

export async function huntGroupTheme(groupName: string, channelId?: string): Promise<GroupTheme> {
  const supabase = await createClient()

  // 1. Check Cache
  const { data: cached } = await supabase
    .from('group_themes')
    .select('primary_color, secondary_color')
    .eq('group_name', groupName)
    .single()

  if (cached) return cached

  let primary = '#FF0000' // Default
  let secondary = '#000000'
  let sourceUrl = ''

  try {
    // 2. Namuwiki Crawling (Simulated/Simple Pattern Matching)
    // 실제 운영 시에는 프록시나 전용 크롤러가 필요할 수 있음
    const namuUrl = `https://namu.wiki/w/${encodeURIComponent(groupName)}`
    const res = await fetch(namuUrl)
    const html = await res.text()
    
    // 나무위키 상징 색 패턴 매칭 (예: [color=#HEX])
    const colorRegex = /color=(#[0-9A-Fa-f]{6})/g
    const matches = [...html.matchAll(colorRegex)]
    if (matches.length > 0) {
      primary = matches[0][1]
      secondary = matches[1]?.[1] || primary
      sourceUrl = namuUrl
    } else {
      // 3. YouTube Fallback
      if (channelId) {
        const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY
        const ytRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?id=${channelId}&part=brandingSettings&key=${YOUTUBE_API_KEY}`)
        const ytData = await ytRes.json()
        const bannerUrl = ytData.items?.[0]?.brandingSettings?.image?.bannerExternalUrl
        
        if (bannerUrl) {
          // 배너 이미지 분석 (서버사이드 라이브러리 없이 간단하게 처리하기는 어려움)
          // 여기서는 유튜브 브랜드 가이드 기반 혹은 배너 URL 존재 시 특정 '활기찬 색'으로 대체 유도
          // 실제 프로덕션이라면 sharp 등으로 픽셀 분석을 하겠지만, 여기서는 '임시 랜덤화' 혹은 '브랜드 다크'
          primary = '#6366f1' // Indigo
          secondary = '#a855f7' // Purple
          sourceUrl = `https://youtube.com/channel/${channelId}`
        }
      }
    }

    // 4. Save to DB
    if (sourceUrl) {
      await supabase.from('group_themes').upsert({
        group_name: groupName,
        primary_color: primary,
        secondary_color: secondary,
        source_url: sourceUrl,
        updated_at: new Date().toISOString()
      })
    }
  } catch (e) {
    console.error('Color Hunter Error:', e)
  }

  return { primary_color: primary, secondary_color: secondary }
}

// 밝기 계산하여 텍스트 색상 결정 (WCAG 가이드라인 반영)
export function getContrastColor(hex: string): 'black' | 'white' {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000
  return (yiq >= 128) ? 'black' : 'white'
}
