import { NextRequest, NextResponse } from 'next/server'
import { fetchChannelUploads } from '@/utils/youtube'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const channelId = searchParams.get('channelId')

    if (!channelId) {
      return NextResponse.json({ error: 'Channel ID is missing' }, { status: 400 })
    }

    const results = await fetchChannelUploads(channelId, 50)
    return NextResponse.json(results)
  } catch (error: any) {
    console.error('YouTube Playlist Route Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
