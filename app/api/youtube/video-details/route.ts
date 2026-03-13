import { NextRequest, NextResponse } from 'next/server'
import { fetchYouTubeMetadata } from '@/utils/youtube'

// API 라우트에서 쿼리 파라미터를 쓰므로 dynamic 모드를 강제합니다.
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const videoId = searchParams.get('videoId')

    if (!videoId) {
      return NextResponse.json({ error: '비디오 ID가 누락되었습니다.' }, { status: 400 })
    }

    /**
     * [설명] fetchYouTubeMetadata 내부에서 이미 createAdminClient를 사용하여 
     * 캐시를 읽고 쓰고 있습니다. 따라서 이 라우트는 추가 수정 없이도 
     * RLS(보안 문)를 뚫고 데이터를 아주 잘 가져올 겁니다.
     */
    const metadata = await fetchYouTubeMetadata(videoId)

    if (!metadata) {
      return NextResponse.json({ error: '영상을 찾을 수 없습니다.' }, { status: 404 })
    }

    return NextResponse.json(metadata)
  } catch (error: any) {
    console.error('🔥 [YouTube Video Details Route Error]:', error)
    return NextResponse.json({
      error: '비디오 정보를 불러오는 중 에러가 발생했습니다.',
      details: error.message
    }, { status: 500 })
  }
}