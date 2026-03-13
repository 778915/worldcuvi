import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

export async function POST(req: Request) {
  try {
    const { channelId, channelTitle, action } = await req.json()
    if (!channelId) return NextResponse.json({ error: 'channelId is required' }, { status: 400 })

    const supabase = createClient()

    // 1. 채널 레코드 존재 여부 확인 및 초기화
    const { data: channel } = await supabase
      .from('channels')
      .select('*')
      .eq('channel_id', channelId)
      .single()

    if (!channel) {
      await supabase.from('channels').insert({
        channel_id: channelId,
        channel_title: channelTitle || 'Unknown Channel',
        trust_score: 1.0, // 초기 점수
        pending_count: 0,
        removal_count: 0,
        confirmed_count: 0
      })
    }

    // 2. 액션에 따른 데이터 계산
    let update: any = {}
    
    if (action === 'add') {
      update = {
        pending_count: (channel?.pending_count || 0) + 1,
        trust_score: (channel?.trust_score || 1.0) + 0.1
      }
    } else if (action === 'remove') {
      // 삭제 시 점수 차감 (최소 0점 유지)
      const currentScore = channel?.trust_score ?? 1.0
      update = {
        removal_count: (channel?.removal_count || 0) + 1,
        trust_score: Math.max(0, currentScore - 0.1)
      }
    } else if (action === 'finalize') {
      update = {
        confirmed_count: (channel?.confirmed_count || 0) + 1,
        trust_score: (channel?.trust_score || 1.0) + 1.0
      }
    }

    // 3. 업데이트 반영
    const { error } = await supabase
      .from('channels')
      .update(update)
      .eq('channel_id', channelId)

    if (error) throw error

    return NextResponse.json({ success: true, trust_score: update.trust_score })
  } catch (error: any) {
    console.error('Track Action Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
