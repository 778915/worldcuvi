import { NextRequest, NextResponse } from 'next/server'
import { huntGroupTheme } from '@/utils/color-hunter'

export async function POST(req: NextRequest) {
  try {
    const { q } = await req.json()
    if (!q) return NextResponse.json({ error: 'Query is missing' }, { status: 400 })

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY
    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: 'AI 서비스가 준비되지 않았습니다.' }, { status: 503 })
    }

    const modelName = 'gemini-flash-latest'
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`

    const systemInstruction = `
      당신은 '월드커비'의 초정밀 검색 의도 파싱 AI입니다. 유저의 검색어에서 핵심 엔티티(그룹/가수, 곡/콘텐츠)를 정밀하게 추출하세요.
      
      [추출 규칙]
      1. group: 가수, 아이돌 그룹, 버튜버 그룹, 유튜버 이름 등 (예: '스텔라이브', '아이브')
      2. song: 노래 제목, 콘텐츠 제목 등 (예: '계절범죄', 'Love Dive')
      3. isGroupSearch: 특정 곡이 아닌 그룹 전체나 멤버를 찾는 검색인 경우 true
      
      결과는 반드시 {"group": string|null, "song": string|null, "isGroupSearch": boolean} 형태의 JSON으로만 출력하세요.
    `

    const aiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemInstruction}\n\n입력: "${q}"` }] }],
        generationConfig: {
          response_mime_type: "application/json",
          temperature: 0.1,
        }
      })
    })

    if (!aiRes.ok) throw new Error(`Gemini API error: ${aiRes.status}`)

    const data = await aiRes.json()
    const aiText = data.candidates[0].content.parts[0].text
    const intent = JSON.parse(aiText)

    // 테마 색상 사냥 (그룹이 발견된 경우)
    let theme = { primary_color: '#FF0000', secondary_color: '#000000' }
    if (intent.group) {
      theme = await huntGroupTheme(intent.group)
    }

    return NextResponse.json({
      ...intent,
      theme
    })

  } catch (error: any) {
    console.error('AI Intent Parsing Error:', error)
    return NextResponse.json({ 
      group: null, 
      song: null, 
      isGroupSearch: false,
      theme: { primary_color: '#FF0000', secondary_color: '#000000' }
    })
  }
}
