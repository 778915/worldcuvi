import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { titles } = await req.json()
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY

    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: 'AI 서비스가 준비되지 않았습니다.' }, { status: 503 })
    }

    // 수석 마케터의 자아를 주입하는 시스템 지시문
    const systemInstruction = `
      당신은 'WorldCuvi(월드커비)'라는 트렌디한 이상형 월드컵 플랫폼의 수석 콘텐츠 마케터야. 
      유저가 선택한 유튜브 영상들의 '원본 제목' 리스트를 줄 테니, 이걸 분석해서 사람들이 무조건 클릭하고 싶어지는 [자극적이고 힙한 월드컵 제목] 3가지를 제안해.

      [조건]
      1. 밋밋한 설명은 집어치우고, 유튜브 썸네일이나 쇼츠에서 쓸 법한 '도파민 터지는' 문구를 써.
      2. 길이는 10~25자 사이로 간결하게.
      3. 상황에 따라 "~ 레전드 매치", "~ 월드컵", "당신의 최애 ~는?", "숨막히는 ~ 대결" 같은 포맷을 적절히 섞어.
      4. 부가 설명 절대 금지. 오직 결과물만 아래와 같은 JSON 배열 형식으로 딱 떨어지게 출력해.

      [예시 출력]
      ["🔥 2024년 폼 미친 레전드 드립 월드컵", "당신의 뇌를 지배할 수능 금지곡 매치", "보기만 해도 혈압 오르는 빌런 총집합"]
    `

    const prompt = `[입력된 영상 원본 제목들]\n${titles.join(', ')}`

    // [수정] 최신 Gemini 3 Flash 모델로 주소 변경
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash:generateContent?key=${GEMINI_API_KEY}`

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemInstruction}\n\n${prompt}` }] }],
        generationConfig: {
          response_mime_type: "application/json",
          temperature: 0.85, // 창의적인 제목을 위해 온도를 살짝 높였습니다.
        }
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Gemini API error: ${response.status} - ${JSON.stringify(errorData)}`)
    }

    const data = await response.json()

    // AI가 거부했거나 결과가 없을 경우에 대한 방어 로직
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('AI가 제목을 생성하지 못했습니다.')
    }

    const aiText = data.candidates[0].content.parts[0].text

    // JSON 파싱 (사족 제거 로직 포함)
    let result;
    try {
      const cleanJson = aiText.replace(/```json\n?|```/g, '').trim();
      result = JSON.parse(cleanJson);
    } catch (e) {
      // 파싱 실패 시 원본 제목이라도 배열로 감싸서 반환 (UI 붕괴 방지)
      result = [titles[0] || "제목 없는 월드컵", "새로운 월드컵 매치", "레전드 후보들의 대결"];
    }

    return NextResponse.json(result)

  } catch (error: any) {
    console.error('Suggest Title Error:', error)
    // 에러 발생 시에도 프론트엔드가 배열을 받을 수 있게 폴백 데이터 제공
    return NextResponse.json(
      ["내 취향 저격 월드컵", "당신이 선택할 최고의 주인공은?", "레전드 매치 월드컵"],
      { status: 200 } // 에러지만 유저 경험을 위해 정상 데이터처럼 응답할 수 있습니다.
    )
  }
}