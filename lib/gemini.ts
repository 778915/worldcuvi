// lib/gemini.ts

// 어떤 종류의 모델을 쓸지 약속합니다.
export type GeminiTier = 'plus' | 'standard' | 'task-specific';

export function getGeminiConfig(tier: GeminiTier = 'standard') {
    // .env 파일에 저장된 API 키를 가져옵니다.
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    // 각 등급에 맞는 모델 이름을 정합니다.
    const modelMap = {
        'plus': 'gemini-flash-latest',       // 유료 유저용
        'standard': 'gemini-flash-latest', // 일반 유저용
        'task-specific': 'gemini-flash-latest' // 검색어 분석용
    };

    const modelName = modelMap[tier];

    return {
        modelName,
        // 구글 서버로 가는 최신 주소입니다.
        url: `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`,
        headers: { 'Content-Type': 'application/json' }
    };
}

/**
 * AI가 대답한 문장에서 지저분한 것을 빼고 깔끔한 데이터만 추출합니다.
 */
export function extractJsonFromAi(text: string) {
    try {
        const cleanJson = text.replace(/```json\n?|```/g, '').trim();
        return JSON.parse(cleanJson);
    } catch (e) {
        console.error('AI 데이터 변환 실패:', text);
        return null;
    }
}