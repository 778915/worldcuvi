import { NextRequest, NextResponse } from 'next/server'
import { fetchPlaylistItems } from '@/utils/youtube'

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const channelId = searchParams.get('channelId')
    const playlistId = searchParams.get('playlistId')

    if (!channelId && !playlistId) {
      return NextResponse.json({ error: 'ID가 누락되었습니다.' }, { status: 400 })
    }

    const targetPlaylistId = playlistId || channelId?.replace(/^UC/, 'UU');
    if (!targetPlaylistId) {
      return NextResponse.json({ error: '유효하지 않은 ID 형식입니다.' }, { status: 400 });
    }

    console.log(`🚀 [PLAYLIST START] ID: ${targetPlaylistId}`);

    /**
     * 핵심: utils/youtube.ts 내의 fetchPlaylistItems는 
     * 이제 AdminClient(마스터 키)를 사용하여 RLS를 무시하고 캐시를 저장합니다.
     */
    const results = await fetchPlaylistItems(targetPlaylistId, 50);

    // [중요] 빈 배열([])이 올 경우 404 에러로 명확히 처리하여 '0개' 화면 방지
    if (!results || results.length === 0) {
      console.error(`❌ [PLAYLIST EMPTY] No data for: ${targetPlaylistId}`);
      return NextResponse.json({
        error: '데이터가 존재하지 않습니다.',
        details: '유튜브가 접근을 차단했거나, 목록이 비어있습니다. (잠시 후 다시 시도해보세요)'
      }, { status: 404 });
    }

    console.log(`✅ [PLAYLIST SUCCESS] ${results.length} items found.`);
    return NextResponse.json(results);

  } catch (error: any) {
    console.error("🔥 [PLAYLIST CRITICAL ERROR]:", error);
    return NextResponse.json({
      error: "서버 내부 에러",
      details: error.message || "알 수 없는 에러"
    }, { status: 500 });
  }
}