import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getGeminiConfig, extractJsonFromAi } from '@/lib/gemini' // 👈 중앙 제어실 연결

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { titles } = await req.json()

    // 1. 사용자 구독 상태 확인 (유료 유저에겐 더 똑똑한 모델을 붙여주기 위해)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    let isPlus = false
    if (user) {
      const { data: profile } = await supabase
        .from('users')
        .select('is_plus_subscriber')
        .eq('id', user.id)
        .single()
      isPlus = profile?.is_plus_subscriber ?? false
    }

    // 2. [교정 완료] 중앙 제어실에서 설정 가져오기
    // 유료면 'plus', 아니면 'standard' 설정을 자동으로 가져옵니다.
    const tier = isPlus ? 'plus' : 'standard';
    const { url, headers } = getGeminiConfig(tier);

    // AI에게 시킬 마케팅 지시문 (UI 구조에 완벽하게 맞춤!)
    const systemInstruction = `
      당신은 'WorldCuvi(월드커비)'라는 트렌디한 이상형 월드컵 플랫폼의 수석 콘텐츠 마케터 겸 분석가야. 
      유저가 선택한 유튜브 영상들의 '원본 제목' 리스트를 줄 테니, 이걸 분석해서 화면 UI에 들어갈 [AI 분석 리포트]를 JSON 형식으로 작성해.

      [필수 JSON 출력 구조] - 반드시 이 키(key)값들을 지켜서 JSON 객체 1개만 반환할 것.
      {
        "title": "도파민 터지는 10~25자 월드컵 제목 (예: 고막 녹는 텐코 시부키 YOASOBI)",
        "genre": "반드시 다음 리스트 중 하나만 선택: ['애니메이션', '스포츠', '게임', '연예인/인플루언서', '음식', '음악', '동물/힐링', '영화/드라마', '명언/망언', '기타']",
        "reaction": "이 주제에 대한 예상 대중/팬덤의 반응 및 바이럴 포인트 분석",
        "competitiveness": "이 월드컵이 사람들의 클릭을 유도하는 킬러 포인트와 경쟁력",
        "confidence": 98 // 0~100 사이의 AI 분석 확신도 (숫자만)
      }

      [조건]
      1. 제목(title)은 밋밋한 설명 말고 유튜브 썸네일처럼 자극적이고 힙하게.
      2. genre(카테고리)는 반드시 제공된 리스트에서 가장 적절한 하나를 골라 문자열 그대로 출력해. 다른 설명을 덧붙이지 마.
      3. 부가 설명 절대 금지. 오직 JSON 데이터만 출력해.
    `

    const prompt = `[입력된 영상 원본 제목들]\n${titles.join(', ')}`

    // 3. 구글 제미니 호출
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemInstruction}\n\n${prompt}` }] }],
        generationConfig: {
          response_mime_type: "application/json",
          temperature: 0.85, // 창의적인 제목을 위해 온도를 살짝 높임
        }
      })
    })

    if (!response.ok) {
      throw new Error(`Gemini API 에러: ${response.status}`)
    }

    const data = await response.json()
    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!aiText) {
      throw new Error('AI가 제목을 생성하지 못했습니다.')
    }

    // 4. [교정 완료] 중앙 제어실의 도구로 데이터 깨끗하게 뽑기
    let result = extractJsonFromAi(aiText);

    // 만약 AI가 헛소리를 해서 추출에 실패하면, 최소한의 기본 제목이라도 돌려줌 (UI 붕괴 방지)
    if (!result) {
      result = [titles[0] || "제목 없는 월드컵", "새로운 월드컵 매치", "레전드 후보들의 대결"];
    }

    return NextResponse.json(result)

  } catch (error: any) {
    console.error('제목 추천 중 에러 발생:', error)
    // 에러가 나도 유저가 당황하지 않게 기본 제목 리스트를 반환합니다.
    return NextResponse.json(
      ["내 취향 저격 월드컵", "당신이 선택할 최고의 주인공은?", "레전드 매치 월드컵"],
      { status: 200 }
    )
  }
}