/**
 * YouTube Data API v3 관련 유틸리티
 * API Key는 서버에서만 사용되도록 주의
 */

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY

export interface YouTubeMetadata {
  videoId: string
  title: string
  videoCategoryId: string
  topicDetails: any
  tags: string[]
  description: string
  thumbnail: string
  viewCount?: string
  likeCount?: string
  commentCount?: string
  topComments?: string[]
  publishedAt?: string
  channelId?: string
  channelTitle?: string
  subscriberCount?: string
  isOfficial?: boolean
}

export async function fetchYouTubeMetadata(videoId: string): Promise<YouTubeMetadata | null> {
  if (!YOUTUBE_API_KEY) {
    console.warn('YOUTUBE_API_KEY is missing.')
    return null
  }

  try {
    // 1. 기본 정보 및 통계 가져오기
    const videoUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet,topicDetails,statistics&key=${YOUTUBE_API_KEY}`
    const videoRes = await fetch(videoUrl)
    const videoData = await videoRes.json()

    if (!videoData.items || videoData.items.length === 0) return null
    const item = videoData.items[0]

    // 2. 댓글 스레드 가져오기 (가장 인기 있는 댓글 5개)
    let topComments: string[] = []
    try {
      const commentUrl = `https://www.googleapis.com/youtube/v3/commentThreads?videoId=${videoId}&part=snippet&maxResults=5&order=relevance&key=${YOUTUBE_API_KEY}`
      const commentRes = await fetch(commentUrl)
      const commentData = await commentRes.json()
      if (commentData.items) {
        topComments = commentData.items.map((c: any) => c.snippet.topLevelComment.snippet.textDisplay)
      }
    } catch (e) {
      console.warn('Failed to fetch comments for video:', videoId)
    }

    return {
      videoId,
      title: item.snippet.title,
      videoCategoryId: item.snippet.categoryId,
      topicDetails: item.topicDetails || {},
      tags: item.snippet.tags || [],
      description: item.snippet.description,
      thumbnail: item.snippet.thumbnails?.maxres?.url || item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
      viewCount: item.statistics.viewCount,
      likeCount: item.statistics.likeCount,
      commentCount: item.statistics.commentCount,
      topComments
    }
  } catch (error) {
    console.error('YouTube API Error:', error)
    return null
  }
}

export async function searchYouTube(
  query: string, 
  maxResults: number = 20, 
  order: 'relevance' | 'viewCount' | 'date' = 'relevance'
): Promise<YouTubeMetadata[]> {
  if (!YOUTUBE_API_KEY) return []

  try {
    const url = `https://www.googleapis.com/youtube/v3/search?q=${encodeURIComponent(query)}&part=snippet&type=video&maxResults=${maxResults}&order=${order}&key=${YOUTUBE_API_KEY}`
    console.log('>>> [YOUTUBE SEARCH] URL:', url.replace(YOUTUBE_API_KEY || '', 'HIDDEN_KEY'))
    
    const res = await fetch(url)
    const data = await res.json()

    if (data.error) {
      if (data.error.errors?.[0]?.reason === 'quotaExceeded') {
        throw new Error('YOUTUBE_QUOTA_EXCEEDED')
      }
      throw new Error(data.error.message || 'YouTube API error')
    }

    if (!data.items || data.items.length === 0) {
      return []
    }

    // 2. 검색 결과에서 채널 ID 추출
    const channelIds = Array.from(new Set(data.items.map((item: any) => item.snippet.channelId))).join(',')
    
    // 3. 채널 상세 정보 가져오기 (공식 여부 판별용)
    let channelMap: Record<string, { subscriberCount: string, verified: boolean }> = {}
    try {
      const channelUrl = `https://www.googleapis.com/youtube/v3/channels?id=${channelIds}&part=snippet,statistics&key=${YOUTUBE_API_KEY}`
      const channelRes = await fetch(channelUrl)
      const channelData = await channelRes.json()
      
      if (channelData.items) {
        channelData.items.forEach((c: any) => {
          channelMap[c.id] = {
            subscriberCount: c.statistics.subscriberCount,
            // verified 여부는 snippet이나 status에 직접 없을 수 있어, 
            // 보통 customUrl이나 특정 로직으로 판별하거나 snippet에 일부 정보가 있음
            // 여기서는 snippet.title과 statistics를 조합하여 판별
            verified: c.snippet.title.toLowerCase().includes('official') || 
                      c.snippet.title.toLowerCase().includes('ch.') || 
                      parseInt(c.statistics.subscriberCount) > 50000 
          }
        })
      }
    } catch (e) {
      console.warn('Failed to fetch channel details:', e)
    }

    return data.items
      .filter((item: any) => item.id && item.id.videoId)
      .map((item: any) => {
        const cInfo = channelMap[item.snippet.channelId]
        return {
          videoId: item.id.videoId,
          title: item.snippet.title,
          description: item.snippet.description,
          thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
          tags: [],
          videoCategoryId: '',
          topicDetails: {},
          publishedAt: item.snippet.publishedAt,
          channelId: item.snippet.channelId,
          channelTitle: item.snippet.channelTitle,
          subscriberCount: cInfo?.subscriberCount,
          isOfficial: cInfo?.verified || false
        }
      })
  } catch (error) {
    console.error('YouTube Search API Error:', error)
    return []
  }
}

export async function fetchChannelUploads(channelId: string, maxResults: number = 50): Promise<YouTubeMetadata[]> {
  if (!YOUTUBE_API_KEY || !channelId) return []

  try {
    // UU Trick: UC로 시작하는 채널 ID를 UU로 바꾸면 업로드 플레이리스트 ID가 됨
    const uploadsPlaylistId = channelId.replace(/^UC/, 'UU')
    const url = `https://www.googleapis.com/youtube/v3/playlistItems?playlistId=${uploadsPlaylistId}&part=snippet&maxResults=${maxResults}&key=${YOUTUBE_API_KEY}`
    
    const res = await fetch(url)
    const data = await res.json()

    if (!data.items) return []

    return data.items.map((item: any) => ({
      videoId: item.snippet.resourceId.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
      tags: [],
      videoCategoryId: '',
      topicDetails: {},
      publishedAt: item.snippet.publishedAt,
      channelId: item.snippet.channelId,
      channelTitle: item.snippet.channelTitle,
      isOfficial: false // 업로드 목록에서는 기본적으로 알 수 없으나, 채널 스캔이므로 공식 채널에서 왔을 확률이 높음
    }))
  } catch (error) {
    console.error('YouTube Playlist API Error:', error)
    return []
  }
}

export function extractVideoId(url: string): string | null {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
  const match = url.match(regex)
  return match ? match[1] : null
}
