import { NextRequest, NextResponse } from 'next/server'
import { getGeminiConfig, extractJsonFromAi } from '@/lib/gemini' // 👈 중앙 제어실 연결

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { q } = await req.json()
    if (!q) return NextResponse.json({ error: 'Query is missing' }, { status: 400 })

    // [교정] 중앙 제어실 사용
    // 검색어 분석은 가벼운 작업이므로 'task-specific' 모델(1.5 Flash 최신)을 할당합니다.
    const { url, headers } = getGeminiConfig('task-specific');

    const systemInstruction = `
      당신은 '월드커비'의 초정밀 검색 의도 분석 AI입니다. 사용자의 검색어에서 '그룹명(아티스트)'과 '곡 제목'을 정밀하게 추출하세요.
      
      [분석 규칙]
      1. group: 가수, 아이돌 그룹, 버튜버, 유튜버 이름 등
      2. song: 노래 제목, 콘텐츠 제목 등
      3. isGroupSearch: 특정 곡이 아닌 그룹 전체나 멤버의 목록을 찾는 검색인 경우 true
      
      [응답 형식]
      결과는 반드시 아래 구조의 순수 JSON으로만 답변하세요.
      { "group": string|null, "song": string|null, "isGroupSearch": boolean }
    `

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemInstruction}\n\n입력: "${q}"` }] }],
        generationConfig: {
          response_mime_type: "application/json",
          temperature: 0.1, // 분석 정확도를 위해 온도 최저 설정
        }
      })
    })

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`)
    }

    const data = await response.json()
    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!aiText) {
      throw new Error('AI가 결과를 생성하지 못했습니다.')
    }

    // [교정] JSON 추출 공통 함수 사용 (지저분한 정규식 필요 없음)
    const result = extractJsonFromAi(aiText);

    if (!result) {
      // 파싱 실패 시 안전한 기본값 반환
      return NextResponse.json({ group: q, song: null, isGroupSearch: true });
    }

    return NextResponse.json(result)

  } catch (error: any) {
    console.error('AI Query Analysis Error:', error)
    // 에러 발생 시에도 검색 기능이 멈추지 않도록 안전한 폴백 반환
    return NextResponse.json({
      group: null,
      song: null,
      isGroupSearch: false,
      is_error: true
    })
  }
}