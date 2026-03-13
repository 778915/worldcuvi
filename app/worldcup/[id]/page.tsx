'use client'

import React from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Play, Share2, Info, Trophy, Users, Settings } from 'lucide-react'
import FeedbackSection from '@/components/FeedbackSection'
import PlusUserBadge from '@/components/PlusUserBadge'
import CommentSection from '@/components/CommentSection'
import CreatorBadge from '@/components/CreatorBadge'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { useAccent } from '@/components/ThemeProvider'
import { useAuth } from '@/components/AuthProvider'

export default function WorldcupDetailPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const { user } = useAuth()
  const { accentText } = useAccent()
  const supabase = createClient()

  const [detail, setDetail] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      // 1. 조회수 증가 (RPC)
      supabase.rpc('increment_worldcup_view', { target_id: id });

      // 2. 데이터 가져오기 (Profiles 조인)
      const { data, error } = await supabase
        .from('worldcups')
        .select(`
          *,
          profiles:creator_id (
            nickname,
            is_plus_subscriber,
            is_creator,
            creator_grade
          )
        `)
        .eq('id', id)
        .single()

      if (data) {
        setDetail({
          id: data.id,
          title: data.title,
          desc: data.description || '창작자가 작성한 설명이 없습니다.',
          creator: data.profiles?.nickname || '알 수 없는 유저',
          creatorId: data.creator_id,
          isPlus: data.profiles?.is_plus_subscriber || false,
          isCreator: data.profiles?.is_creator || true,
          creatorGrade: data.profiles?.creator_grade || 'Bronze',
          plays: data.total_plays || 0,
          views: data.total_views || 0,
          participants: data.participant_count || 0,
          likes: data.like_count || 0,
          unlikes: data.unlike_count || 0,
          thumb: data.thumbnail_url || 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800',
          category: data.category || '기타',
          score: data.score || 0,
          emoji: '🏆'
        })
      } else if (error) {
        console.error('Data fetch error:', error)
      }
      setLoading(false)
    }

    fetchData()
  }, [id])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-violet-600 border-t-transparent animate-spin rounded-full" />
    </div>
  )

  if (!detail && !loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-6 text-center">
      <div className="w-24 h-24 bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center justify-center text-4xl mb-4">
        🔍
      </div>
      <h2 className="text-2xl font-black">월드컵을 찾을 수 없습니다</h2>
      <p className="text-zinc-500 max-w-md">
        존재하지 않거나 삭제된 월드컵일 수 있습니다.<br />
        방금 만드셨다면 DB 반영까지 잠시만 기다려주세요!
      </p>
      <Link href="/worldcup" className="px-8 py-3 bg-violet-600 text-white font-bold rounded-2xl hover:scale-105 transition-all">
        목록으로 돌아가기
      </Link>
    </div>
  )

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Back Button */}
        <Link 
          href="/worldcup" 
          className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-8 group"
        >
          <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          뒤로 가기
        </Link>

        {/* Hero Section */}
        <div className="detail-photo-container relative aspect-video rounded-3xl overflow-hidden mb-8 shadow-2xl group">
          <img 
            src={detail.thumb} 
            alt={detail.title} 
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
          <div className="absolute inset-0 flex flex-col justify-end p-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-white text-xs font-bold border border-white/20">
                {detail.category}
              </span>
              <span className="flex items-center gap-1.5 text-white/80 text-xs font-medium">
                <Users className="w-4 h-4" />
                {detail.participants.toLocaleString()}명 참여 중
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white mb-4 flex items-center gap-3">
              {detail.emoji} {detail.title}
            </h1>
            <p className="text-zinc-200 text-lg font-medium max-w-2xl">{detail.desc}</p>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12">
          <div className="flex items-center gap-8">
            <div className="text-center">
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">PLAYS</p>
              <p className="text-2xl font-black text-foreground">{detail.plays.toLocaleString()}</p>
            </div>
            <div className="w-px h-8 bg-black/10 dark:bg-white/10" />
            <div className="text-center">
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">VIEWS</p>
              <p className="text-2xl font-black text-foreground">{detail.views.toLocaleString()}</p>
            </div>
            <div className="w-px h-8 bg-black/10 dark:bg-white/10" />
            <div className="text-center">
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">CREATOR</p>
              <div className="flex items-center gap-2 leading-tight">
                <div className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-sm font-bold text-zinc-400 border border-black/5 dark:border-white/5">
                  {(detail.creator && detail.creator[0]) || '?'}
                </div>
                {detail.isCreator && (
                  <CreatorBadge 
                    grade={detail.creatorGrade} 
                    className="scale-90 flex-shrink-0"
                  />
                )}
                {detail.isPlus && (
                  <PlusUserBadge 
                    className="scale-90 flex-shrink-0" 
                    onClick={() => router.push('/plus')} 
                  />
                )}
                <p className={`text-lg font-bold ${detail.isPlus ? 'plus-nickname' : (detail.isCreator ? 'creator-name' : 'text-[var(--accent-2)]')}`}>
                  {detail.creator}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button 
              onClick={() => router.push(`/worldcup/${id}/play`)}
              className="flex-1 md:flex-none flex items-center justify-center gap-3 px-8 py-4 bg-[var(--accent-1)] text-white rounded-2xl font-black text-xl shadow-lg shadow-[var(--accent-1)]/20 hover:scale-105 active:scale-95 transition-all"
            >
              <Play className="w-6 h-6 fill-current" />
              시작하기
            </button>
            {user?.id === detail.creatorId && (
              <button 
                onClick={() => router.push(`/dashboard`)}
                className="w-14 h-14 flex items-center justify-center rounded-2xl bg-zinc-900 border border-white/10 text-white hover:bg-zinc-800 transition-all shadow-xl shadow-black/20"
                title="관리 및 수정"
              >
                <Settings className="w-6 h-6" />
              </button>
            )}
            <button 
              onClick={() => {
                const url = window.location.href;
                navigator.clipboard.writeText(url);
                alert("링크가 복사되었습니다!");
              }}
              className="w-14 h-14 flex items-center justify-center rounded-2xl bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 text-zinc-500 hover:text-foreground transition-all"
            >
              <Share2 className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div className="bg-white dark:bg-black p-6 rounded-3xl border border-black/5 dark:border-white/10">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: accentText }}>
              <Trophy className="w-5 h-5" style={{ color: accentText }} />
              랭킹 정보
            </h3>
            <p className="text-zinc-500 text-sm">
              이 월드컵의 현재 랭킹 점수는 <span className="text-foreground font-bold">{Math.floor(detail.score)}</span>점이며, 
              조회수와 추천을 기반으로 실시간 산정됩니다.
            </p>
          </div>
          <div className="bg-white dark:bg-black p-6 rounded-3xl border border-black/5 dark:border-white/10">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: accentText }}>
              <Info className="w-5 h-5" style={{ color: accentText }} />
              추가 정보
            </h3>
            <p className="text-zinc-500 text-sm">
              창작자가 32강 구성을 추천하고 있습니다.
              부적절한 내용이 포함된 경우 신고해주세요.
            </p>
          </div>
        </div>

        {/* Feedback Section */}
        <FeedbackSection 
          worldcupId={id} 
          initialLikes={detail.likes} 
          initialUnlikes={detail.unlikes} 
        />

        {/* Comment Section (Real DB Linked) */}
        <CommentSection worldcupId={id} />
      </div>
    </div>
  )
}
