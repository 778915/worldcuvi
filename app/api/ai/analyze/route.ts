import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchYouTubeMetadata } from '@/utils/youtube'

export const dynamic = 'force-dynamic';

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

    // 0. 서버 사이드 YouTube 메타데이터 보완
    if (videoId && (!videoCategoryId || !tags || tags.length === 0)) {
      const enriched = await fetchYouTubeMetadata(videoId)
      if (enriched) {
        videoCategoryId = enriched.videoCategoryId || videoCategoryId
        topicDetails = enriched.topicDetails || topicDetails
        tags = enriched.tags && enriched.tags.length > 0 ? enriched.tags : tags
        if (!title || title === '제목 없음') title = enriched.title
      }
    }

    const supabase = await createClient()

    // 1. 사용자 구독 상태 확인
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

    // 2. 캐시 식별자
    const cacheKey = videoId || `hash:${title.replace(/\s+/g, '')}`

    // 3. 캐시 조회
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
            model: isPlus ? 'Gemini 3 Pro (Cached)' : 'Gemini 3 Flash (Cached)'
          })
        }
      } catch (e) {
        console.warn('Cache lookup skipped.');
      }
    }

    // 4. [수정] 최신 Gemini 3 모델로 변경
    // 구글의 최신 엔진인 gemini-3-flash와 gemini-3-pro를 사용합니다.
    const modelName = isPlus ? 'gemini-3-pro' : 'gemini-3-flash'
    const finalGeminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`

    // 5. 시스템 프롬프트
    const systemInstruction = `
      당신은 '월드커비'의 수석 마케터이자 콘텐츠 분석가입니다. 
      유튜브 데이터를 분석하여 유저들이 열광할만한 월드컵을 기획하세요.

      [규칙]
      1. 반드시 JSON 형식으로만 응답하십시오.
      2. recommended_titles는 반드시 3개의 서로 다른 스타일(자극적, 직관적, 감성적) 제목을 포함해야 합니다.
      3. search_keywords는 후보 영상을 찾기 위한 최적의 검색어 5개입니다.
    `

    const prompt = `
      [분석 대상 데이터]
      제목: ${title}
      카테고리 ID: ${videoCategoryId}
      태그: ${tags?.join(', ')}
      조회수: ${clientMetadata.viewCount || 'N/A'}, 좋아요: ${clientMetadata.likeCount || 'N/A'}
      핵심 댓글 반응: ${clientMetadata.topComments?.join(' | ') || 'N/A'}
    `

    // 6. Gemini 호출
    let response: Response | null = null
    let retryCount = 0
    const maxRetries = 2

    while (retryCount <= maxRetries) {
      response = await fetch(finalGeminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemInstruction}\n\n${prompt}` }] }],
          generationConfig: {
            response_mime_type: "application/json",
            temperature: 0.75,
          }
        })
      })

      if (response.ok) break;

      if (response.status === 429 && retryCount < maxRetries) {
        const delay = Math.pow(2, retryCount) * 1500;
        await new Promise(resolve => setTimeout(resolve, delay));
        retryCount++;
        continue;
      }
      break;
    }

    if (!response || !response.ok) {
      if (response?.status === 429) throw new Error('QUOTA_EXHAUSTED');
      throw new Error(`AI_API_ERROR: ${response?.status}`);
    }

    const aiResultRaw = await response.json()
    const candidates = aiResultRaw.candidates

    if (!candidates || candidates.length === 0 || !candidates[0].content) {
      return NextResponse.json(createFallbackResult(title, 'SAFETY_BLOCKED'));
    }

    const aiText = candidates[0].content.parts[0].text
    let aiResultJson;
    try {
      const cleanJson = aiText.replace(/```json\n?|```/g, '').trim();
      aiResultJson = JSON.parse(cleanJson);
    } catch (e) {
      throw new Error('INVALID_AI_JSON');
    }

    // 7. 결과 저장
    try {
      await supabase.from('ai_analysis_cache').upsert({
        video_id_hash: cacheKey,
        result_json: aiResultJson,
        created_at: new Date().toISOString()
      })
    } catch (e) { }

    return NextResponse.json({ ...aiResultJson, cached: false, model: modelName })

  } catch (error: any) {
    console.error('>>> AI Route Exception:', error.message);
    return NextResponse.json(createFallbackResult(title, error.message));
  }
}

function createFallbackResult(title: string, reason: string) {
  return {
    identity: `'${title}' 기반 콘텐츠`,
    public_reaction: '분석 서비스를 일시적으로 사용할 수 없습니다.',
    suitability_reason: '수동 모드로 계속 진행할 수 있습니다.',
    determined_genre: '기타',
    sub_tags: ['#수동모드', '#월드커비'],
    word_cloud: [{ text: title, value: 100 }],
    is_vs_mode: false,
    search_keywords: [title],
    recommended_titles: [title, `${title} 월드컵`, `레전드 ${title} 매치`],
    confidence_score: 0,
    is_fallback: true,
    error_detail: reason
  };
}