import { NextRequest, NextResponse } from 'next/server'
import { huntGroupTheme } from '@/utils/color-hunter'
import { getGeminiConfig, extractJsonFromAi } from '@/lib/gemini' // 👈 중앙 제어실 연결

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { q } = await req.json()
    if (!q) return NextResponse.json({ error: '검색어가 없습니다.' }, { status: 400 })

    // 1. [교정] 중앙 제어실 사용
    // 검색 의도 분석은 'task-specific' 설정을 사용합니다. (1.5 Flash 최신 버전)
    const { url, headers, modelName } = getGeminiConfig('task-specific');

    const systemInstruction = `
      당신은 '월드커비'의 초정밀 검색 의도 파싱 AI입니다. 유저의 검색어에서 핵심 엔티티(그룹/가수, 곡/콘텐츠)를 정밀하게 추출하세요.
      
      [추출 규칙]
      1. group: 가수, 아이돌 그룹, 버튜버 이름, 유튜버 이름 등 (예: '시라유키 히나', '아이브')
      2. song: 노래 제목, 커버곡 제목, 콘텐츠 제목 등 (예: '계절범죄', 'Love Dive')
      3. isGroupSearch: 특정 곡이 아닌 그룹 전체나 멤버 자체를 찾는 검색인 경우 true
      
      결과는 반드시 {"group": string|null, "song": string|null, "isGroupSearch": boolean} 형태의 JSON으로만 출력하세요.
    `

    // 2. Gemini API 호출 (재시도 로직 포함)
    let aiRes: Response | null = null
    let retryCount = 0
    const maxRetries = 2

    while (retryCount <= maxRetries) {
      aiRes = await fetch(url, {
        method: 'POST',
        headers, // 중앙 제어실에서 가져온 헤더 사용
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemInstruction}\n\n입력: "${q}"` }] }],
          generationConfig: {
            response_mime_type: "application/json",
            temperature: 0.1, // 정확도를 위해 온도를 낮춤
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
    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!aiText) {
      throw new Error('AI가 의도를 파악하지 못했습니다.')
    }

    // 3. [교정] 중앙 제어실의 데이터 추출 도구 사용
    let intent = extractJsonFromAi(aiText);

    // 만약 데이터 추출에 실패하면 검색어 전체를 그룹으로 간주하는 안전장치(폴백)
    if (!intent) {
      intent = { group: q, song: null, isGroupSearch: true };
    }

    // 4. 테마 색상 사냥 (그룹이 발견된 경우 기존 로직 수행)
    let theme = { primary_color: '#FF0000', secondary_color: '#000000' }
    if (intent.group) {
      try {
        theme = await huntGroupTheme(intent.group)
      } catch (e) {
        console.warn('테마 색상을 가져오지 못해 기본 색상을 사용합니다.');
      }
    }

    return NextResponse.json({
      ...intent,
      theme,
      model: modelName // 어떤 모델이 일했는지 살짝 표시
    })

  } catch (error: any) {
    console.error('AI 의도 분석 중 에러:', error)
    // 에러가 나도 화면은 안 깨지게 기본 구조를 반환합니다.
    return NextResponse.json({
      group: null,
      song: null,
      isGroupSearch: false,
      theme: { primary_color: '#FF0000', secondary_color: '#000000' },
      is_fallback: true
    })
  }
}