import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchYouTubeMetadata } from '@/utils/youtube'
import { getGeminiConfig, extractJsonFromAi } from '@/lib/gemini'

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let title = '제목 없음'
  try {
    const { metadata: clientMetadata, bypassCache: rawBypassCache = false, items = [] } = await req.json()
    const bypassCache = rawBypassCache === true || rawBypassCache === 'true';
    let { videoCategoryId, topicDetails, tags, videoId } = clientMetadata
    title = clientMetadata.title || title

    // 0. 유튜브 데이터 보완 (비어있는 정보 채우기)
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

    // 1. 사용자 구독 상태 확인 (유료인지 무료인지)
    const { data: { user: authUser } } = await supabase.auth.getUser()
    let isPlus = false
    if (authUser) {
      const { data: profile } = await supabase
        .from('users')
        .select('is_plus_subscriber')
        .eq('id', authUser.id)
        .single()
      isPlus = profile?.is_plus_subscriber ?? false
    }

    // 2. [교정 완료] 중앙 제어실에서 모델 설정 가져오기
    // 유료면 'plus', 아니면 'standard'라고 명확하게 글자로 알려줍니다.
    const tier = isPlus ? 'plus' : 'standard';
    const { modelName, url, headers } = getGeminiConfig(tier);

    // 3. 기존에 분석한 적이 있는지 확인 (캐시 로직)
    const cacheKey = videoId || `hash:${title.replace(/\s+/g, '')}`
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
            model: `${modelName} (Cached)`
          })
        }
      } catch (e) {
        console.warn('캐시 조회 실패, 새로 분석합니다.');
      }
    }

    // 4. AI에게 시킬 일 (프롬프트) 준비
    const systemInstruction = `당신은 '월드커비'의 수석 마케터이자 콘텐츠 분석가입니다. 
유튜브 데이터를 분석하여 유저들이 열광할만한 월드컵을 기획하세요. 
반드시 다음 JSON 규격을 엄격히 지켜 응답하십시오 (필드명 변경 금지):

{
  "determined_genre": "반드시 다음 중 하나 선택: ['애니메이션', '스포츠', '게임', '연예인/인플루언서', '음식', '음악', '동물/힐링', '영화/드라마', '명언/망언', '기타']",
  "sub_tags": ["#태그1", "#태그2"],
  "identity": "이 월드컵의 한 줄 정의",
  "public_reaction": "대중 및 팬들의 예상 반응 분석",
  "suitability_reason": "이 월드컵이 왜 경쟁력이 있는지 설명",
  "word_cloud": ["키워드1", "키워드2", "키워드3"],
  "is_vs_mode": true,
  "confidence_score": 95,
  "recommended_titles": ["추천 제목 1", "추천 제목 2"]
}

[중요] determined_genre에는 반드시 지정된 리스트의 문자열만 넣으세요. 설명이나 다른 말을 덧붙이지 마십시오.`
    const prompt = `당신은 토너먼트 형식의 '월드컵' 기획자입니다. 
분석 대상 데이터:
제목: ${title}
카테고리: ${videoCategoryId}
태그: ${tags?.join(', ')}
조회수: ${clientMetadata.viewCount || 'N/A'}
댓글반응: ${clientMetadata.topComments?.join(' | ') || 'N/A'}
현재 선택된 후보 목록: ${items.length > 0 ? items.map((it: any) => it.title).join(', ') : '전체 분석'}

(참고: 후보 목록이 제공된 경우, 제외된 후보를 분석에서 배제하고 현재 후보들의 특성에 맞춰 장르와 전략을 정교하게 다듬어주세요.)`

    // 5. 구글 제미니 호출
    let response: Response | null = null
    let retryCount = 0
    const maxRetries = 2

    while (retryCount <= maxRetries) {
      response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemInstruction}\n\n${prompt}` }] }],
          generationConfig: { response_mime_type: "application/json", temperature: 0.7 }
        })
      })

      if (response.ok) break;
      if (response.status === 429 && retryCount < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1500));
        retryCount++;
        continue;
      }
      break;
    }

    if (!response || !response.ok) {
      throw new Error(`AI API 서버 응답 실패: ${response?.status}`);
    }

    const aiResultRaw = await response.json()
    const aiText = aiResultRaw.candidates?.[0]?.content?.parts?.[0]?.text

    if (!aiText) {
      return NextResponse.json(createFallbackResult(title, 'AI 응답 없음'));
    }

    // 6. 데이터 깔끔하게 정리 (JSON 추출)
    let aiResultJson = extractJsonFromAi(aiText);
    if (!aiResultJson) throw new Error('데이터 형식 오류');

    // [보정 로직] AI가 "0" 또는 다른 키로 감싸서 보내는 경우 처리
    if (aiResultJson["0"]) aiResultJson = aiResultJson["0"];
    
    // [보정 로직 2] 필드명이 다를 경우 매핑 (Planner 형식 대응)
    if (!aiResultJson.identity && aiResultJson.project_name) {
      aiResultJson.identity = aiResultJson.project_name;
    }
    if (!aiResultJson.public_reaction && aiResultJson.analysis_summary?.market_trend) {
      aiResultJson.public_reaction = aiResultJson.analysis_summary.market_trend;
    }
    if (!aiResultJson.suitability_reason && aiResultJson.marketing_strategy?.expected_effect) {
      aiResultJson.suitability_reason = aiResultJson.marketing_strategy.expected_effect;
    }
    if (!aiResultJson.determined_genre && aiResultJson.analysis_summary?.focus_point) {
      aiResultJson.determined_genre = aiResultJson.analysis_summary.focus_point;
    }
    if (!aiResultJson.recommended_titles && aiResultJson.world_cup_plan?.title) {
        aiResultJson.recommended_titles = [aiResultJson.world_cup_plan.title];
    }
    if (!aiResultJson.sub_tags && aiResultJson.analysis_summary?.keyword_strategy) {
        aiResultJson.sub_tags = aiResultJson.analysis_summary.keyword_strategy.map((k: string) => `#${k}`);
    }
    if (!aiResultJson.word_cloud && aiResultJson.analysis_summary?.keyword_strategy) {
        aiResultJson.word_cloud = aiResultJson.analysis_summary.keyword_strategy;
    }
    if (!aiResultJson.confidence_score) {
        aiResultJson.confidence_score = 92; // Default if missing
    }

    // 7. 다음번을 위해 분석 결과 저장
    try {
      await supabase.from('ai_analysis_cache').upsert({
        video_id_hash: cacheKey,
        result_json: aiResultJson,
        created_at: new Date().toISOString()
      })
    } catch (e) { }

    return NextResponse.json({ ...aiResultJson, cached: false, model: modelName })

  } catch (error: any) {
    console.error('>>> 분석 중 에러 발생:', error.message);
    return NextResponse.json(createFallbackResult(title, error.message));
  }
}

// 에러 났을 때 보여줄 임시 결과
function createFallbackResult(title: string, reason: string) {
  return {
    identity: `'${title}' 기반 콘텐츠`,
    public_reaction: '서비스를 잠시 사용할 수 없어 기본 모드로 전환합니다.',
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