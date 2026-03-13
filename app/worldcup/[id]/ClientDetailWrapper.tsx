'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Share2, Trophy, User, Calendar, Tag, Info, Settings, Play, Users, X as XIcon, Facebook, Link2, Check, ExternalLink } from 'lucide-react'
import FeedbackSection from '@/components/FeedbackSection'
import PremiumUserBadge from '@/components/PremiumUserBadge'
import CommentSection from '@/components/CommentSection'
import CreatorBadge from '@/components/CreatorBadge'
import { createClient } from '@/lib/supabase/client'
import { useAccent } from '@/components/ThemeProvider'
import { useAuth } from '@/components/AuthProvider'
import { motion, AnimatePresence } from 'framer-motion'
import PremiumHover from '@/components/PremiumHover'
import WorldcupSettingsModal from '@/components/WorldcupSettingsModal'
import VideoThumbnail from '@/components/VideoThumbnail'

interface WorldcupDetail {
  id: string
  title: string
  description: string
  category: string
  thumbnail_url: string
  creatorId: string
  creator?: {
    nickname: string
    is_plus_subscriber: boolean
    is_creator: boolean
    creator_grade: string
  }
  total_plays: number
  total_views: number
  participant_count: number
  like_count: number
  unlike_count: number
  // Alignment properties for existing JSX
  thumb: string
  desc: string
  isPlus: boolean
  isCreator: boolean
  creatorGrade: string
  plays: number
  views: number
  participants: number
  emoji: string
}

export default function ClientDetailWrapper() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const { user } = useAuth()
  const { accentText } = useAccent()
  const supabase = createClient()

  const [detail, setDetail] = useState<WorldcupDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  // This will need to be adjusted based on the new `detail` structure
  // For now, assuming `detail.creator` exists and has `is_creator`
  const isCreator = user?.id === detail?.creatorId

  useEffect(() => {
    const fetchData = async () => {
      // 1. 조회수 증가 (RPC)
      supabase.rpc('increment_worldcup_view', { target_id: id });

      // 2. 데이터 가져오기 (Users 조인)
      const { data, error } = await supabase
        .from('worldcups')
        .select(`
          *,
          users:creator_id (
            nickname,
            is_plus_subscriber,
            is_creator,
            creator_grade
          )
        `)
        .eq('id', id)
        .single()

      if (data) {
        const detailData: WorldcupDetail = {
          id: data.id,
          title: data.title,
          description: data.description || '창작자가 작성한 설명이 없습니다.',
          category: data.category || '기타',
          thumbnail_url: data.thumbnail_url || 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800',
          creatorId: data.creator_id,
          creator: data.users ? {
            nickname: data.users.nickname,
            is_plus_subscriber: data.users.is_plus_subscriber,
            is_creator: data.users.is_creator,
            creator_grade: data.users.creator_grade
          } : undefined,
          total_plays: data.total_plays || 0,
          total_views: data.total_views || 0,
          participant_count: data.participant_count || 0,
          like_count: data.like_count || 0,
          unlike_count: data.unlike_count || 0,
          // Aliases
          thumb: data.thumbnail_url || 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800',
          desc: data.description || '창작자가 작성한 설명이 없습니다.',
          isPlus: data.users?.is_plus_subscriber || false,
          isCreator: data.users?.is_creator || true,
          creatorGrade: data.users?.creator_grade || 'Bronze',
          plays: data.total_plays || 0,
          views: data.total_views || 0,
          participants: data.participant_count || 0,
          emoji: '🏆'
        }
        setDetail(detailData)
      }
 else if (error) {
        console.error('Data fetch error detail:', error);
      }
      setLoading(false)
    }

    fetchData()
  }, [id])

  const handleShare = async (platform?: 'twitter' | 'facebook' | 'native') => {
    const shareUrl = window.location.href
    const shareTitle = `${detail?.title} | WorldCuvi`

    if (platform === 'native' && navigator.share) {
      try {
        await navigator.share({ title: shareTitle, url: shareUrl })
        return
      } catch (err) { console.error('Sharing failed:', err) }
    }

    if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(shareUrl)}`, '_blank')
    } else if (platform === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank')
    } else {
      // Copy Link
      navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
    setShowShareMenu(false)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-[var(--accent-1)] border-t-transparent animate-spin rounded-full" />
    </div>
  )

  if (!detail && !loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-6 text-center">
      <div className="w-24 h-24 bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center justify-center text-4xl mb-4">
        🔍
      </div>
      <h2 className="text-2xl font-black">월드컵을 찾을 수 없습니다</h2>
      <p className="text-zinc-500 max-w-md">존재하지 않거나 삭제된 월드컵일 수 있습니다.</p>
      <Link href="/worldcup" className="px-8 py-3 bg-[var(--accent-1)] text-white font-bold rounded-2xl hover:scale-105 transition-all">
        목록으로 돌아가기
      </Link>
    </div>
  )

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-4xl mx-auto px-6 py-12">
         <div className="flex items-center justify-between mb-8">
          <Link 
            href="/worldcup" 
            className="inline-flex items-center gap-2 transition-colors group font-bold"
            style={{ color: 'var(--accent-2)' }}
          >
            <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            뒤로 가기
          </Link>

          {isCreator && (
            <button 
              onClick={() => setShowSettings(true)}
              className="p-3 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-black/5 dark:border-white/10 text-zinc-500 hover:text-[var(--accent-1)] transition-all hover:scale-110 active:rotate-90"
              title="관리 설정"
            >
              <Settings className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* Hero Section */}
        <PremiumHover 
          onClick={() => router.push(`/worldcup/${id}/play`)}
          className="detail-photo-container relative aspect-[1.91/1] rounded-3xl overflow-hidden mb-12 shadow-2xl group border border-white/10 dark:bg-black"
        >
        <VideoThumbnail 
          videoId={undefined} 
          thumbnailUrl={detail?.thumbnail_url || ''} 
          title={detail?.title || ''} 
        />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
          
          {/* Play Overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 transform scale-90 group-hover:scale-100">
            <div className="flex flex-col items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-xl border-2 border-white/50 flex items-center justify-center shadow-2xl shadow-black/50">
                <Play className="w-10 h-10 text-white fill-white ml-1" />
              </div>
              <span className="text-white font-black text-2xl tracking-[0.5rem] drop-shadow-2xl">PLAY NOW</span>
            </div>
          </div>

          <div className="absolute inset-0 flex flex-col justify-end p-8 pointer-events-none">
            <div className="flex items-center gap-3 mb-4">
              <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-white text-xs font-bold border border-white/20">
                {detail?.category}
              </span>
              <span className="flex items-center gap-1.5 text-white/80 text-xs font-medium">
                <Users className="w-4 h-4" />
                {detail?.participant_count.toLocaleString() || '0'}명 참여 중
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white mb-4 flex items-center gap-3">
              {detail?.emoji} {detail?.title}
            </h1>
            <p className="text-zinc-200 text-lg font-medium max-w-2xl">{detail?.description}</p>
          </div>
        </PremiumHover>

        {/* Action Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12">
          <div className="flex items-center gap-8">
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--accent-2)' }}>PLAYS</p>
              <p className="text-2xl font-black text-foreground">{detail!.total_plays.toLocaleString()}</p>
            </div>
            <div className="w-px h-8 bg-black/10 dark:bg-white/10" />
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--accent-2)' }}>VIEWS</p>
              <p className="text-2xl font-black text-foreground">{detail!.total_views.toLocaleString()}</p>
            </div>
            <div className="w-px h-8 bg-black/10 dark:bg-white/10" />
            <div className="text-center">
              <p className="text-xs font-black uppercase tracking-[0.2em] mb-3" style={{ color: 'var(--accent-2)' }}>CREATOR</p>
              <div className="flex items-center gap-4 group/creator">
                {detail!.creator?.is_plus_subscriber ? (
                  <PremiumUserBadge size="avatar" className="transition-all duration-500 group-hover/creator:scale-110 shadow-2xl" />
                ) : (
                  <div 
                    className="relative w-12 h-12 rounded-full flex items-center justify-center text-base font-black shadow-2xl transition-all duration-500 group-hover/creator:scale-110"
                    style={{ 
                      background: detail!.isCreator ? `linear-gradient(135deg, ${(detail!.creatorGrade?.toLowerCase() === 'gold' ? '#FFD700' : detail!.creatorGrade?.toLowerCase() === 'silver' ? '#C0C0C0' : detail!.creatorGrade?.toLowerCase() === 'bronze' ? '#CD7F32' : 'var(--accent-1)')}, color-mix(in srgb, ${(detail!.creatorGrade?.toLowerCase() === 'gold' ? '#FFD700' : detail!.creatorGrade?.toLowerCase() === 'silver' ? '#C0C0C0' : detail!.creatorGrade?.toLowerCase() === 'bronze' ? '#CD7F32' : 'var(--accent-1)')} 60%, black))` : 'var(--accent-1)',
                      color: (detail!.creatorGrade?.toLowerCase() === 'gold' || detail!.creatorGrade?.toLowerCase() === 'silver') ? '#4b3200' : 'white',
                      boxShadow: detail!.isCreator ? `0 0 20px color-mix(in srgb, ${(detail!.creatorGrade?.toLowerCase() === 'gold' ? '#FFD700' : detail!.creatorGrade?.toLowerCase() === 'silver' ? '#C0C0C0' : detail!.creatorGrade?.toLowerCase() === 'bronze' ? '#CD7F32' : 'var(--accent-1)')} 30%, transparent)` : 'none'
                    }}
                  >
                    <span className="relative z-10">{detail!.creator ? detail!.creator.nickname.charAt(0).toUpperCase() : '?'}</span>
                    <div 
                      className="absolute -inset-1 rounded-full border border-white/20 opacity-50 animate-[spin_8s_linear_infinite]"
                      style={{ borderColor: (detail!.creatorGrade?.toLowerCase() === 'gold' ? 'rgba(255,215,0,0.4)' : detail!.creatorGrade?.toLowerCase() === 'silver' ? 'rgba(192,192,192,0.4)' : detail!.creatorGrade?.toLowerCase() === 'bronze' ? 'rgba(205,127,50,0.4)' : 'rgba(255,255,255,0.2)') }}
                    />
                  </div>
                )}
                
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 mb-0.5">
                    {detail!.isCreator && <CreatorBadge grade={detail!.creatorGrade} className="scale-75 origin-left" />}
                  </div>
                  <p 
                    className={`text-lg font-bold leading-tight ${detail!.isPlus ? 'plus-nickname' : (detail!.isCreator ? 'creator-name' : 'text-[var(--accent-2)]')}`}
                    style={detail!.isCreator ? { '--tier-color': (detail!.creatorGrade?.toLowerCase() === 'gold' ? '#FFD700' : detail!.creatorGrade?.toLowerCase() === 'silver' ? '#C0C0C0' : detail!.creatorGrade?.toLowerCase() === 'bronze' ? '#CD7F32' : 'var(--accent-1)') } as React.CSSProperties : {}}
                  >
                    {detail!.creator?.nickname || 'Anonymous'}
                  </p>
                </div>
              </div>
            </div>
          </div>
  
          <div className="flex items-center gap-3 w-full md:w-auto relative">
            <PremiumHover 
              onClick={() => router.push(`/worldcup/${id}/play`)}
              className="flex-1 md:flex-none rounded-2xl"
            >
              <button 
                className="w-full h-full flex items-center justify-center gap-3 px-8 py-4 bg-[var(--accent-1)] text-white rounded-2xl font-black text-xl shadow-lg shadow-[var(--accent-1)]/20 active:scale-95 transition-all"
              >
                <Play className="w-6 h-6 fill-current" />
                시작하기
              </button>
            </PremiumHover>
            <div className="relative">
              <PremiumHover className="rounded-2xl" onClick={() => setShowShareMenu(!showShareMenu)}>
                <button 
                  className="w-14 h-14 flex items-center justify-center rounded-2xl bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 text-[var(--accent-1)] hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all shadow-xl"
                >
                  <Share2 className="w-6 h-6" />
                </button>
              </PremiumHover>
              
              <AnimatePresence>
                {showShareMenu && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 bottom-full mb-4 w-48 bg-white dark:bg-zinc-900 rounded-2xl border border-black/5 dark:border-white/10 shadow-2xl p-2 z-[60]"
                  >
                    <button onClick={() => handleShare('native')} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-white/5 rounded-xl transition-colors text-sm font-bold sm:hidden">
                      <ExternalLink className="w-4 h-4 text-violet-500" /> 시스템 공유
                    </button>
                    <button onClick={() => handleShare('twitter')} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-white/5 rounded-xl transition-colors text-sm font-bold">
                      <XIcon className="w-4 h-4 text-black dark:text-white" /> X (Twitter)
                    </button>
                    <button onClick={() => handleShare('facebook')} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-white/5 rounded-xl transition-colors text-sm font-bold">
                      <Facebook className="w-4 h-4 text-blue-600" /> Facebook
                    </button>
                    <button onClick={() => handleShare()} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-white/5 rounded-xl transition-colors text-sm font-bold text-[var(--accent-1)]">
                      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Link2 className="w-4 h-4" />}
                      {copied ? '복사 완료!' : '링크 복사'}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
  
        <FeedbackSection worldcupId={detail!.id} />
        <CommentSection worldcupId={detail!.id} />
      </div>

      {showSettings && (
        <WorldcupSettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          worldcup={{
            id: detail!.id,
            title: detail!.title,
            category: detail!.category,
            desc: detail!.description
          }}
          onUpdate={(updatedData) => {
            setDetail((prev: WorldcupDetail | null) => {
              if (!prev) return null
              return {
                ...prev,
                ...updatedData,
                description: updatedData.desc || prev.description,
                desc: updatedData.desc || prev.desc
              }
            })
          }}
          onDeleted={() => {
            router.push('/worldcup')
            router.refresh()
          }}
        />
      )}
    </div>
  )
}
