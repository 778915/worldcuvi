import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchYouTubeMetadata } from '@/utils/youtube'

export async function POST(req: NextRequest) {
  let title = '제목 없음'
  try {
    const { metadata: clientMetadata, bypassCache = false } = await req.json()
    let { videoCategoryId, topicDetails, tags, videoId } = clientMetadata
    title = clientMetadata.title || title

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY
    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY is missing.')
      return NextResponse.json({ error: 'AI 서비스가 준비되지 않았습니다.' }, { status: 503 })
    }

    // 0. 서버 사이드 YouTube 메타데이터 보완 (클라이언트에서 부족하게 보낸 경우)
    if (videoId && (!videoCategoryId || !tags)) {
      const enriched = await fetchYouTubeMetadata(videoId)
      if (enriched) {
        videoCategoryId = enriched.videoCategoryId
        topicDetails = enriched.topicDetails
        tags = enriched.tags
        if (!title) title = enriched.title
      }
    }

    const supabase = await createClient()

    // 1. 사용자 구독 상태 확인 (Plus 여부)
    const { data: { user: authUser } } = await supabase.auth.getUser()
    let isPlus = false
    if (authUser) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_plus_subscriber')
        .eq('id', authUser.id)
        .single()
      isPlus = profile?.is_plus_subscriber ?? false
    }

    // 2. 캐시 식별자 생성
    const cacheKey = videoId || `hash:${title.replace(/\s+/g, '')}`

    // 3. 캐시 조회 (7일 이내 데이터)
    if (!bypassCache) {
      try {
        const { data: cachedData } = await supabase
          .from('ai_analysis_cache')
          .select('*')
          .eq('video_id_hash', cacheKey)
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .single()

        if (cachedData) {
          return NextResponse.json({ 
            ...cachedData.result_json, 
            cached: true, 
            model: isPlus ? 'Gemini Pro Latest (Cached)' : 'Gemini Flash Latest (Cached)' 
          })
        }
      } catch (e) {
        // 캐시 조회 실패는 무시하고 AI 호출 진행
        console.warn('Cache lookup failed or table missing:', e)
      }
    }

    // 4. 모델 결정 및 URL 생성
    // 구글이 권장하는 최신 모델 연결용 'latest' 키워드 적용
    const modelName = isPlus ? 'gemini-pro-latest' : 'gemini-flash-latest'
    const finalGeminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`
    
    // 5. Gemini API 호출
    const systemInstruction = `
      당신은 '월드커비'의 초정밀 월드컵 생성 지원 AI입니다. 유튜브 API 데이터[제목, 카테고리, 태그, 통계, 댓글 반응]를 분석하여 'AI 분석 보고서'를 JSON으로 생성하세요.
      
      [분석 과제]
      1. determined_genre: 주제를 가장 잘 나타내는 메임 장르.
      2. sub_tags: 감성적인 수식어(예: #청아함, #고퀄리티)를 포함한 세부 태그 5-8개.
      3. identity: 아티스트와 콘텐츠의 정체성을 1문장으로 정의 (예: '스텔라이브 시라유키 히나의 전설적인 J-POP 커버').
      4. public_reaction: 좋아요 수와 댓글 뉘앙스를 분석한 대중 반응 요약.
      5. suitability_reason: 월드컵 후보로서의 경쟁력 분석.
      6. is_vs_mode: 대결 구도(A vs B) 여부.
      7. search_keywords: 이 월드컵을 풍성하게 채울 수 있는 최적의 유튜브 검색어 3개 (예: '시라유키 히나 커버곡', '시라유키 히나 멜트 반응').
      
      [분석 모델: ${isPlus ? 'Gemini Pro Latest' : 'Gemini Flash Latest'}]
      
      You are an AI Worldcup Curator. Analyze the provided YouTube metadata and comments to:
      1. Determine the exact genre and identity of the content.
      2. Analyze public reaction and sentiment.
      3. Judge suitability for a Worldcup.
      4. Suggest a "Hip and Intuitive" title for the Worldcup. (e.g., '귀르가즘 보장! 시라유키 히나 커버곡 월드컵')
      
      Output structure:
      - identity: 1-sentence description of the artist/content (string).
      - public_reaction: 1-sentence summary of fan response (string).
      - suitability_reason: Why this is good/bad for a Worldcup (string).
      - determined_genre: The core category (string).
      - sub_tags: 5-8 emotional or descriptive tags (string array).
      - word_cloud: 10-15 key words from comments with priority (object: {text: string, value: number}).
      - is_vs_mode: Whether to enable VS mode (boolean).
      - search_keywords: 3-5 keywords for finding candidate videos (string array).
      - recommended_title: A creative, hip, and catchy title. DO NOT just return the original video title. Instead, create a curation-style title that reflects the identity and fan reactions found in the analysis. Be creative and vary the naming style.
      - confidence_score: AI's confidence in this analysis (0-100).
      
      Output ONLY valid JSON.
    `

    const prompt = `
      [영상 데이터]
      제목: ${title}
      카테고리: ${videoCategoryId}
      태그: ${tags?.join(', ')}
      조회수: ${clientMetadata.viewCount || 'N/A'}, 좋아요: ${clientMetadata.likeCount || 'N/A'}
      핵심 댓글 반응: ${clientMetadata.topComments?.join(' | ') || 'N/A'}
    `

    // 5. Gemini API 호출 (Exponential Backoff 재시도 로직 포함)
    let response: Response | null = null
    let retryCount = 0
    const maxRetries = 3
    
    while (retryCount <= maxRetries) {
      response = await fetch(finalGeminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemInstruction}\n\n${prompt}` }] }],
          generationConfig: {
            response_mime_type: "application/json",
            temperature: 0.7,
          }
        })
      })

      if (response.ok) break

      if (response.status === 429 && retryCount < maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000
        console.warn(`Gemini 429 detected. Retrying in ${delay}ms... (Attempt ${retryCount + 1}/${maxRetries})`)
        await new Promise(resolve => setTimeout(resolve, delay))
        retryCount++
        continue
      }
      
      const errorData = await response.json().catch(() => ({}))
      
      if (response.status === 404) {
        console.error('>>> [DIAGNOSTIC] Gemini 404 detected. Fetching available models...')
        const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`
        const modelsList = await fetch(listUrl).then(r => r.json()).catch(() => ({ error: 'Failed' }))
        console.error('Available Models List:', JSON.stringify(modelsList, null, 2))
      }

      console.error('Gemini API Error details:', errorData)
      throw new Error(`Gemini API failed with status ${response.status}: ${JSON.stringify(errorData)}`)
    }

    if (!response || !response.ok) {
      throw new Error('AI 분석 요청에 실패했습니다.')
    }

    const aiResultRaw = await response.json()
    const candidates = aiResultRaw.candidates
    if (!candidates || candidates.length === 0) {
      throw new Error('AI가 결과를 반환하지 않았습니다. (Safety filtering etc.)')
    }

    const aiText = candidates[0].content.parts[0].text
    if (!aiText) throw new Error('AI 응답 본문이 비어있습니다.')

    let aiResultJson
    try {
      const cleanJson = aiText.replace(/```json\n?|```/g, '').trim()
      aiResultJson = JSON.parse(cleanJson)
    } catch (e) {
      throw new Error('AI 응답이 유효한 JSON 형식이 아닙니다.')
    }

    // 6. 캐시 저장 시도
    try {
      await supabase.from('ai_analysis_cache').upsert({
        video_id_hash: cacheKey,
        result_json: aiResultJson,
        created_at: new Date().toISOString()
      })
    } catch (e) {
      console.warn('Failed to save to cache:', e)
    }

    return NextResponse.json({ ...aiResultJson, cached: false, model: modelName })

  } catch (error: any) {
    console.error('AI Analysis Route Exception:', error)
    
    // Quota exhausted (429) or other AI failures: provide a basic fallback so the user can still create the Worldcup
    if (error.message?.includes('429') || error.message?.includes('status 429')) {
      return NextResponse.json({
        identity: `유튜브 영상 '${title}' 기반 데이터`,
        public_reaction: '분석 서비스를 일시적으로 사용할 수 없어 기본 데이터로 대체합니다.',
        suitability_reason: '수동 모드로 전환하여 계속 진행할 수 있습니다.',
        determined_genre: '기타',
        sub_tags: ['#수동모드', '#기본데이터'],
        word_cloud: [{ text: title, value: 50 }],
        is_vs_mode: false,
        search_keywords: [title],
        recommended_title: title,
        confidence_score: 0,
        is_fallback: true,
        error_code: 'QUOTA_EXHAUSTED'
      })
    }

    return NextResponse.json({ 
      error: error.message || 'AI 분석 처리 중 내부 오류가 발생했습니다.',
      details: process.env.NODE_ENV === 'development' ? error.toString() : undefined
    }, { status: 500 })
  }
}
