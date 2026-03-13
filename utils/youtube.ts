import ytpl from 'ytpl'
import { createAdminClient } from '@/lib/supabase/server' // [수정] 마스터 키 클라이언트 임포트

/**
 * YouTube Data API v3 및 ytpl(크롤링) 통합 유틸리티
 * 1. API 우선 시도 -> 실패 시 크롤링 비상구 가동
 * 2. 유튜브 봇 탐지 회피용 위장 헤더 적용
 * 3. Supabase Admin Client를 통한 RLS 우회 캐싱
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
  recommended_titles?: string[]
}

/**
 * [위장복 설정] 유튜브 봇 인식을 피하기 위한 일반 사용자용 헤더
 */
const REQUEST_OPTIONS = {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
    'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Referer': 'https://www.youtube.com/'
  }
}

/**
 * 비상용 파서 (oEmbed): API 할당량이 완전히 터졌을 때 제목/썸네일만 긁어옴
 */
export async function fetchYouTubeMetadataEmergency(videoId: string): Promise<YouTubeMetadata | null> {
  try {
    const thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`)
    const data = await res.json()

    return {
      videoId,
      title: data.title || 'YouTube Video',
      videoCategoryId: '',
      topicDetails: {},
      tags: [],
      description: '',
      thumbnail,
      viewCount: '0',
      likeCount: '0',
      commentCount: '0',
      topComments: [],
      channelTitle: data.author_name || 'YouTube',
      isOfficial: false
    }
  } catch (e) {
    return {
      videoId,
      title: '영상을 찾을 수 없음',
      videoCategoryId: '',
      topicDetails: {},
      tags: [],
      description: '',
      thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      viewCount: '0',
      likeCount: '0',
      commentCount: '0',
      topComments: [],
      channelTitle: 'YouTube',
      isOfficial: false
    }
  }
}

/**
 * 단일 영상 메타데이터 페치 (API 우선)
 */
export async function fetchYouTubeMetadata(videoId: string): Promise<YouTubeMetadata | null> {
  if (!YOUTUBE_API_KEY) return fetchYouTubeMetadataEmergency(videoId)

  try {
    // 0. 캐시 체크
    const cached = await getCachedMetadata(videoId)
    if (cached && !Array.isArray(cached)) return cached

    // 1. API 호출
    const videoUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet,topicDetails,statistics&key=${YOUTUBE_API_KEY}`
    const videoRes = await fetch(videoUrl)
    const videoData = await videoRes.json()

    if (videoData.error || !videoData.items || videoData.items.length === 0) {
      return fetchYouTubeMetadataEmergency(videoId)
    }

    const item = videoData.items[0]
    const result = {
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
      topComments: [],
      channelId: item.snippet.channelId,
      channelTitle: item.snippet.channelTitle,
    }

    saveMetadataToCache(videoId, result, 'video')
    return result
  } catch (error) {
    return fetchYouTubeMetadataEmergency(videoId)
  }
}

/**
 * 유튜브 검색 (API 전용)
 */
export async function searchYouTube(
  query: string,
  maxResults: number = 20,
  order: 'relevance' | 'viewCount' | 'date' = 'relevance'
): Promise<YouTubeMetadata[]> {
  if (!YOUTUBE_API_KEY) return []

  try {
    const url = `https://www.googleapis.com/youtube/v3/search?q=${encodeURIComponent(query)}&part=snippet&type=video&maxResults=${maxResults}&order=${order}&key=${YOUTUBE_API_KEY}`
    const res = await fetch(url)
    const data = await res.json()

    if (data.error) {
      if (data.error.errors?.[0]?.reason === 'quotaExceeded') throw new Error('YOUTUBE_QUOTA_EXCEEDED')
      return []
    }

    return (data.items || [])
      .filter((item: any) => item.id && item.id.videoId)
      .map((item: any) => ({
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
        isOfficial: false
      }))
  } catch (error) {
    console.error('Search failed:', error)
    return []
  }
}

/**
 * 재생목록 가져오기 (정식 API 버전)
 */
export async function fetchPlaylistItems(playlistId: string, maxResults: number = 50): Promise<YouTubeMetadata[]> {
  if (!YOUTUBE_API_KEY || !playlistId) return fetchPlaylistItemsScraping(playlistId, maxResults)

  const cached = await getCachedMetadata(playlistId)
  if (cached && Array.isArray(cached)) return cached

  try {
    const url = `https://www.googleapis.com/youtube/v3/playlistItems?playlistId=${playlistId}&part=snippet&maxResults=${maxResults}&key=${YOUTUBE_API_KEY}`
    const res = await fetch(url)
    const data = await res.json()

    if (data.error) {
      // 할당량 초과 시 크롤링으로 전환
      if (data.error.errors?.[0]?.reason === 'quotaExceeded') return fetchPlaylistItemsScraping(playlistId, maxResults)
      throw new Error(data.error.message)
    }

    const results = data.items.map((item: any) => ({
      videoId: item.snippet.resourceId.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail: item.snippet.thumbnails?.maxres?.url || item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
      tags: [],
      videoCategoryId: '',
      topicDetails: {},
      publishedAt: item.snippet.publishedAt,
      channelId: item.snippet.channelId,
      channelTitle: item.snippet.channelTitle,
      isOfficial: false
    }))

    if (results.length > 0) saveMetadataToCache(playlistId, results, 'playlist')
    return results
  } catch (error) {
    return fetchPlaylistItemsScraping(playlistId, maxResults)
  }
}

/**
 * [핵심] 재생목록 크롤링 버전 (ytpl + 위장 헤더)
 */
export async function fetchPlaylistItemsScraping(playlistId: string, maxResults: number = 50): Promise<YouTubeMetadata[]> {
  const cached = await getCachedMetadata(playlistId)
  if (cached && Array.isArray(cached)) return cached

  try {
    console.log(`>>> [SCRAPING START] playlistId: ${playlistId}, Disguised as User...`)

    const playlist = await Promise.race([
      ytpl(playlistId, {
        limit: maxResults,
        requestOptions: REQUEST_OPTIONS
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('YOUTUBE_TIMEOUT')), 10000))
    ]) as ytpl.Result

    const results = playlist.items.map(item => ({
      videoId: item.id,
      title: item.title,
      description: '',
      thumbnail: item.bestThumbnail?.url || item.thumbnails?.[0]?.url || `https://img.youtube.com/vi/${item.id}/hqdefault.jpg`,
      tags: [],
      videoCategoryId: '',
      topicDetails: {},
      publishedAt: '',
      channelId: item.author.channelID,
      channelTitle: item.author.name,
      isOfficial: false
    }))

    if (results.length > 0) saveMetadataToCache(playlistId, results, 'playlist')
    return results
  } catch (error: any) {
    console.error('ytpl Scraping Failed:', error.message)
    throw new Error(`유튜브가 접근을 차단했습니다. (Details: ${error.message})`)
  }
}

/**
 * 채널 업로드 목록 (UU 트릭)
 */
export async function fetchChannelUploads(channelId: string, maxResults: number = 50): Promise<YouTubeMetadata[]> {
  if (!channelId) return []
  const uploadsPlaylistId = channelId.replace(/^UC/, 'UU')
  return fetchPlaylistItems(uploadsPlaylistId, maxResults)
}


/**
 * Supabase 캐시 처리 (마스터 권한 적용)
 */
async function getCachedMetadata(id: string): Promise<any | null> {
  try {
    const supabase = await createAdminClient() // [수정] createAdminClient 사용
    const { data } = await supabase.from('youtube_cache').select('metadata, expires_at').eq('id', id).single()
    if (!data || new Date(data.expires_at) < new Date()) return null
    return data.metadata
  } catch (e) { return null }
}

async function saveMetadataToCache(id: string, metadata: any, type: 'video' | 'playlist' = 'video') {
  try {
    const supabase = await createAdminClient() // [수정] createAdminClient 사용
    await supabase.from('youtube_cache').upsert({
      id, type, title: metadata.title || '', thumbnail: metadata.thumbnail || '',
      channel_id: metadata.channelId || '', channel_title: metadata.channelTitle || '',
      metadata, expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    })
  } catch (e) {
    console.error('Cache save failed (Check Admin Key):', e)
  }
}