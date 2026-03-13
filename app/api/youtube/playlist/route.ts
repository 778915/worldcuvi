import { NextRequest, NextResponse } from 'next/server'
import { fetchChannelUploads, fetchPlaylistItems } from '@/utils/youtube'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const channelId = searchParams.get('channelId')
    const playlistId = searchParams.get('playlistId')

    if (!channelId && !playlistId) {
      return NextResponse.json({ error: 'ID is missing' }, { status: 400 })
    }

    const results = playlistId 
      ? await fetchPlaylistItems(playlistId, 50)
      : await fetchChannelUploads(channelId!, 50)
    return NextResponse.json(results)
  } catch (error: any) {
    console.error('YouTube Playlist Route Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
