import { NextRequest, NextResponse } from 'next/server'
import { searchYouTube } from '@/utils/youtube'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

// 검색어 해시 생성 (쿼리 + 정렬 조합)
function generateQueryHash(query: string, order: string): string {
  return crypto.createHash('sha256').update(`${query.trim().toLowerCase()}:${order}`).digest('hex')
}

// 인기 검색어 판별 로직
function getExpirationHours(query: string): number {
  const popularKeywords = ['스텔라이브', '이세돌', '아이브', '뉴진스', '방탄', 'bts', 'stellive', 'isegye', '커버', '노래']
  const isPopular = popularKeywords.some(k => query.toLowerCase().includes(k))
  return isPopular ? 48 : 24
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const query = searchParams.get('q')
    const order = (searchParams.get('order') as any) || 'relevance'

    if (!query) {
      return NextResponse.json({ error: 'Query is missing' }, { status: 400 })
    }

    const supabase = await createClient()
    const queryHash = generateQueryHash(query, order)

    // 1. 캐시 조회 (만료되지 않은 데이터)
    const { data: cached } = await supabase
      .from('cached_searches')
      .select('results, hit_count')
      .eq('query_hash', queryHash)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (cached) {
      console.log(`>>> [CACHE HIT] Query: "${query}", Hits: ${cached.hit_count + 1}`)
      
      // 비동기적으로 Hit 카운트 업데이트 (응답 속도에 영향을 주지 않음)
      supabase
        .from('cached_searches')
        .update({ hit_count: (cached.hit_count || 1) + 1 })
        .eq('query_hash', queryHash)
        .then()

      return NextResponse.json(cached.results)
    }

    // 2. 캐시 미스: 유튜브 API 호출
    console.log(`>>> [CACHE MISS] Calling YouTube API for: "${query}"`)
    const rawResults = await searchYouTube(query, 20, order)

    // 3. 데이터 다이어트 (필요한 정보만 추출하여 저장)
    const optimizedResults = rawResults.map(v => ({
      videoId: v.videoId,
      title: v.title,
      thumbnail: v.thumbnail,
      channelId: v.channelId,
      channelTitle: v.channelTitle,
      isOfficial: v.isOfficial,
      publishedAt: v.publishedAt
    }))

    // 4. 캐시 저장
    const expirationHours = getExpirationHours(query)
    const expiresAt = new Date(Date.now() + expirationHours * 60 * 60 * 1000).toISOString()

    await supabase.from('cached_searches').upsert({
      query_hash: queryHash,
      query_text: query,
      results: optimizedResults,
      expires_at: expiresAt,
      created_at: new Date().toISOString()
    })

    // 5. 만료된 오래된 캐시 비동기 정화
    supabase
      .from('cached_searches')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .then()

    return NextResponse.json(optimizedResults)
  } catch (error: any) {
    console.error('YouTube Search Route Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
