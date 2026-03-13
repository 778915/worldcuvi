import { NextRequest, NextResponse } from 'next/server'
import { fetchPlaylistItems, YouTubeMetadata } from '@/utils/youtube'

// 캐시를 방지하고 항상 실시간 데이터를 요청하도록 강제
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const channelId = searchParams.get('channelId')
    const playlistId = searchParams.get('playlistId')

    // 1. 필수 파라미터 체크
    if (!channelId && !playlistId) {
      return NextResponse.json({
        error: 'ID가 누락되었습니다.',
        details: 'channelId 또는 playlistId 파라미터가 필요합니다.'
      }, { status: 400 })
    }

    // 2. 대상 ID 결정 (채널 ID일 경우 UU 트릭 적용)
    // 이제 복잡한 로직은 utils/youtube.ts가 알아서 처리하므로 여기서 중복 연산할 필요 없습니다.
    const targetPlaylistId = playlistId || channelId?.replace(/^UC/, 'UU');

    if (!targetPlaylistId) {
      return NextResponse.json({ error: '유효하지 않은 채널 ID 형식입니다.' }, { status: 400 });
    }

    console.log(`>>> [API REQUEST] Fetching items for: ${targetPlaylistId}`);

    /**
     * 3. 핵심 로직 실행
     * 이미 utils/youtube.ts의 fetchPlaylistItems 내부에 
     * [API 시도 -> 실패 시 크롤링 위장 침투] 로직이 합쳐져 있습니다. 
     * 여기서는 그 결과를 믿고 기다리기만 하면 됩니다.
     */
    const results = await fetchPlaylistItems(targetPlaylistId, 50);

    // 4. 결과 검증 및 응답
    if (!results || results.length === 0) {
      console.warn(`>>> [API WARN] No items found for: ${targetPlaylistId}`);
      return NextResponse.json({
        error: '데이터가 존재하지 않습니다.',
        details: '유튜브에서 영상을 하나도 찾지 못했습니다. 비공개 목록인지 확인해주세요.'
      }, { status: 404 });
    }

    console.log(`>>> [API SUCCESS] Returned ${results.length} items.`);
    return NextResponse.json(results);

  } catch (error: any) {
    /**
     * 5. 상세 에러 보고 (주인님이 강조하신 디버깅의 핵심)
     * 이제 "에러 꿀꺽"은 없습니다. 원인이 무엇이든 details에 실어서 보냅니다.
     */
    console.error("🔥 [YouTube API Route Error]:", error);

    return NextResponse.json(
      {
        error: "유튜브 데이터를 가져오는 중 서버 에러가 발생했습니다.",
        details: error.message || "알 수 없는 에러",
        code: error.code || "INTERNAL_SERVER_ERROR",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}