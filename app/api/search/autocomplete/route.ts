import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const q = searchParams.get('q')?.trim().toLowerCase()

        // 검색어가 너무 짧으면 빈 배열 반환
        if (!q || q.length < 1) return NextResponse.json([])

        const supabase = await createAdminClient()

        // 1. 월드컵 제목에서 검색 (직접적인 매칭)
        const { data: worldcups } = await supabase
            .from('worldcups')
            .select('title')
            .ilike('title', `%${q}%`)
            .limit(5)

        // 2. 과거 인기 검색어에서 검색 (데이터 기반)
        const { data: popularQueries } = await supabase
            .from('cached_searches')
            .select('query_text, hit_count')
            .ilike('query_text', `%${q}%`)
            .order('hit_count', { ascending: false })
            .limit(5)

        // 3. 중복 제거 및 포맷팅 (Set 사용)
        const suggestions = new Set<string>()

        worldcups?.forEach(w => suggestions.add(w.title))
        popularQueries?.forEach(p => suggestions.add(p.query_text))

        // 상위 8개만 골라서 반환
        return NextResponse.json(Array.from(suggestions).slice(0, 8))

    } catch (error: any) {
        console.error('Autocomplete Error:', error)
        return NextResponse.json([]) // 에러 시에는 그냥 빈 결과를 줘서 UI가 안 깨지게 합니다.
    }
}