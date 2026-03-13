import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { q } = await req.json()
    if (!q) return NextResponse.json({ error: 'Query is missing' }, { status: 400 })

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY
    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: 'AI 서비스가 준비되지 않았습니다.' }, { status: 503 })
    }

    // [수정] 최신 Gemini 3 Flash 모델 사용
    const modelName = 'gemini-3-flash'
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`

    const systemInstruction = `
      당신은 '월드커비'의 초정밀 검색 의도 분석 AI입니다. 사용자의 검색어에서 '그룹명(아티스트)'과 '곡 제목'을 정밀하게 추출하세요.
      
      [분석 규칙]
      1. group: 가수, 아이돌 그룹, 버튜버, 유튜버 이름 등 (예: '스텔라이브', '아이브', '시라유키 히나')
      2. song: 노래 제목, 콘텐츠 제목 등 (예: '계절범죄', 'Love Dive')
      3. isGroupSearch: 특정 곡이 아닌 그룹 전체나 멤버의 목록을 찾는 검색인 경우 true
      
      [응답 형식]
      결과는 반드시 아래 구조의 순수 JSON으로만 답변하세요.
      { "group": string|null, "song": string|null, "isGroupSearch": boolean }
    `

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemInstruction}\n\n입력: "${q}"` }] }],
        generationConfig: {
          response_mime_type: "application/json",
          temperature: 0.1, // 분석의 정확도를 위해 온도를 최저로 설정
        }
      })
    })

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`)
    }

    const data = await response.json()

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('AI가 결과를 생성하지 못했습니다.')
    }

    const aiText = data.candidates[0].content.parts[0].text

    // JSON 세척 및 파싱 로직 강화
    let result;
    try {
      const cleanJson = aiText.replace(/```json\n?|```/g, '').trim();
      result = JSON.parse(cleanJson);
    } catch (e) {
      console.error('JSON Parsing Error:', aiText);
      // 파싱 실패 시 기본값 반환
      result = { group: q, song: null, isGroupSearch: true };
    }

    return NextResponse.json(result)

  } catch (error: any) {
    console.error('AI Query Analysis Error:', error)
    // 에러 발생 시 검색이 멈추지 않도록 안전한 기본값 반환
    return NextResponse.json({
      group: null,
      song: null,
      isGroupSearch: false,
      is_error: true
    })
  }
}