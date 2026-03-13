import { NextRequest, NextResponse } from 'next/server'
import { huntGroupTheme } from '@/utils/color-hunter'

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { q } = await req.json()
    if (!q) return NextResponse.json({ error: '검색어가 없습니다.' }, { status: 400 })

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY
    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: 'AI 서비스가 준비되지 않았습니다.' }, { status: 503 })
    }

    // [수정] 최신 Gemini 3 Flash 모델 적용
    const modelName = 'gemini-3-flash'
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`

    const systemInstruction = `
      당신은 '월드커비'의 초정밀 검색 의도 파싱 AI입니다. 유저의 검색어에서 핵심 엔티티(그룹/가수, 곡/콘텐츠)를 정밀하게 추출하세요.
      
      [추출 규칙]
      1. group: 가수, 아이돌 그룹, 버튜버 이름, 유튜버 이름 등 (예: '시라유키 히나', '아이브')
      2. song: 노래 제목, 커버곡 제목, 콘텐츠 제목 등 (예: '계절범죄', 'Love Dive')
      3. isGroupSearch: 특정 곡이 아닌 그룹 전체나 멤버 자체를 찾는 검색인 경우 true
      
      결과는 반드시 {"group": string|null, "song": string|null, "isGroupSearch": boolean} 형태의 JSON으로만 출력하세요.
    `

    // 1. Gemini API 호출 (재시도 로직 포함)
    let aiRes: Response | null = null
    let retryCount = 0
    const maxRetries = 2

    while (retryCount <= maxRetries) {
      aiRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemInstruction}\n\n입력: "${q}"` }] }],
          generationConfig: {
            response_mime_type: "application/json",
            temperature: 0.1, // 의도 파싱은 정확도가 중요하므로 온도를 낮춤
          }
        })
      })

      if (aiRes.ok) break;
      if (aiRes.status === 429 && retryCount < maxRetries) {
        await new Promise(r => setTimeout(r, 1000 * (retryCount + 1)));
        retryCount++;
        continue;
      }
      break;
    }

    if (!aiRes || !aiRes.ok) throw new Error(`Gemini API error: ${aiRes?.status}`)

    const data = await aiRes.json()

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('AI가 의도를 파악하지 못했습니다.')
    }

    const aiText = data.candidates[0].content.parts[0].text

    // JSON 안전 파싱
    let intent;
    try {
      const cleanJson = aiText.replace(/```json\n?|```/g, '').trim();
      intent = JSON.parse(cleanJson);
    } catch (e) {
      intent = { group: q, song: null, isGroupSearch: true }; // 실패 시 검색어 전체를 그룹으로 간주하는 폴백
    }

    // 2. 테마 색상 사냥 (그룹이 발견된 경우)
    let theme = { primary_color: '#FF0000', secondary_color: '#000000' }
    if (intent.group) {
      try {
        theme = await huntGroupTheme(intent.group)
      } catch (e) {
        console.warn('Theme hunting failed, using default colors.');
      }
    }

    return NextResponse.json({
      ...intent,
      theme
    })

  } catch (error: any) {
    console.error('AI Intent Parsing Error:', error)
    // 에러 발생 시에도 UI가 깨지지 않도록 기본 구조 반환
    return NextResponse.json({
      group: null,
      song: null,
      isGroupSearch: false,
      theme: { primary_color: '#FF0000', secondary_color: '#000000' },
      is_fallback: true
    })
  }
}