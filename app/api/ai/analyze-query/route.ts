import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { q } = await req.json()
    if (!q) return NextResponse.json({ error: 'Query is missing' }, { status: 400 })

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY
    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: 'AI 서비스가 준비되지 않았습니다.' }, { status: 503 })
    }

    const modelName = 'gemini-flash-latest' // 속도를 위해 Flash 사용
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`

    const systemInstruction = `
      당신은 '월드커비'의 검색 의도 분석기입니다. 사용자의 검색어에서 '그룹명(또는 아티스트)'과 '곡 제목'을 추출하세요.
      
      [분석 규칙]
      1. group: 가수, 아이돌 그룹, 버튜버 그룹, 유튜버 이름 등 (예: '스텔라이브', '아이브', '침착맨')
      2. song: 노래 제목, 콘텐츠 제목 등 (예: '계절범죄', 'Love Dive')
      3. isGroupSearch: 특정 곡이 아닌 그룹 전체나 멤버를 찾는 검색인 경우 true
      
      [입력 예시]
      - "스텔라이브 계절범죄" -> { "group": "스텔라이브", "song": "계절범죄", "isGroupSearch": false }
      - "아이브 노래 모음" -> { "group": "아이브", "song": null, "isGroupSearch": true }
      - "계절범죄 커버" -> { "group": null, "song": "계절범죄", "isGroupSearch": false }
      
      결과는 오직 순수 JSON으로만 출력하세요.
    `

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemInstruction}\n\n입력: "${q}"` }] }],
        generationConfig: {
          response_mime_type: "application/json",
          temperature: 0.1, // 정확도를 위해 낮게 설정
        }
      })
    })

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`)
    }

    const data = await response.json()
    const aiText = data.candidates[0].content.parts[0].text
    const result = JSON.parse(aiText)

    return NextResponse.json(result)

  } catch (error: any) {
    console.error('AI Query Analysis Error:', error)
    return NextResponse.json({ 
      group: null, 
      song: null, 
      isGroupSearch: false,
      error: error.message 
    })
  }
}
