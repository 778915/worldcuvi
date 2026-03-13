'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Trophy, Search, SlidersHorizontal, Play, Clock, Flame, Star, Zap } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useAccent } from '@/components/ThemeProvider'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import VideoThumbnail from '@/components/VideoThumbnail'
import PremiumHover from '@/components/PremiumHover'

const CATEGORIES = ['전체', '애니메이션', '스포츠', '게임', '연예인/인플루언서', '음식', '음악', '동물/힐링', '영화/드라마', '명언/망언', '기타']

function formatPlays(n: number = 0) {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만`
  return n.toLocaleString()
}

export default function WorldcupPage() {
  return (
    <React.Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-[var(--accent-1)] border-t-transparent animate-spin rounded-full"></div>
      </div>
    }>
      <WorldcupListContent />
    </React.Suspense>
  )
}

function WorldcupListContent() {
  const { accentText } = useAccent()
  const searchParams = useSearchParams()
  const categoryParam = searchParams.get('category')
  
  const [worldcups, setWorldcups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState(categoryParam || '전체')
  const supabase = createClient()

  useEffect(() => {
    if (categoryParam) {
      setActiveCategory(categoryParam)
    }
  }, [categoryParam])

  const fetchWorldcups = async () => {
    setLoading(true)
    let query = supabase
      .from('worldcups')
      .select(`
        *,
        creator:creator_id (nickname, creator_grade)
      `)
      .eq('status', 'active')
      
    if (activeCategory !== '전체') {
      query = query.eq('category', activeCategory)
    }

    if (search) {
      query = query.ilike('title', `%${search}%`)
    }

    const { data, error } = await query.order('created_at', { ascending: false })
    if (data) setWorldcups(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchWorldcups()

    // [추가] 실시간 신규 등록 감지 (즉각 반영 요구사항)
    const channel = supabase
      .channel('public:worldcups')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'worldcups' }, async (payload: any) => {
        // [수정] 신규 등록 시 작성자 정보(nickname) 수동 보충
        const { data: creatorData } = await supabase
          .from('users')
          .select('nickname, creator_grade')
          .eq('id', payload.new.creator_id)
          .single();
        
        const newWc = { ...payload.new, creator: creatorData };
        setWorldcups(prev => [newWc, ...prev])
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeCategory, search])

  return (
    <div className="min-h-[calc(100vh-4rem)] max-w-7xl mx-auto px-6 py-12">
      {/* 헤더 */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-2">
          <Trophy className="w-6 h-6 text-[var(--accent-2)]" />
          <h1 className="text-3xl font-extrabold text-[var(--accent-2)]">월드컵 탐색</h1>
        </div>
        <p style={{ color: 'var(--accent-2)' }}>다양한 주제의 이상형 월드컵을 발견하고 즐겨보세요</p>
      </div>

      {/* 검색 + 필터 */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--accent-2)]" />
          <input
            id="worldcup-search"
            type="text"
            placeholder="월드컵 제목으로 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-100 dark:bg-zinc-900 border border-black/5 dark:border-white/10 rounded-xl pl-11 pr-4 py-3.5 text-[var(--accent-2)] placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-[var(--accent-1)]/20 transition-all font-medium"
          />
        </div>
        <button className="flex items-center gap-2 px-6 py-3.5 bg-zinc-100 dark:bg-zinc-900 border border-black/5 dark:border-white/10 rounded-xl text-[var(--accent-2)] hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all font-bold">
          <SlidersHorizontal className="w-5 h-5" />
          필터
        </button>
      </div>

      {/* 카테고리 탭 */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-8 scrollbar-hide">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            id={`category-${cat}`}
            onClick={() => setActiveCategory(cat)}
            className={`shrink-0 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm ${
              activeCategory === cat
                ? 'bg-[var(--accent-1)] text-white shadow-[var(--accent-1)]/20 shadow-lg'
                : 'bg-zinc-100 dark:bg-zinc-900 border border-black/5 dark:border-white/10 text-[var(--accent-2)] hover:bg-zinc-200 dark:hover:bg-zinc-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 정렬 + 결과 수 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-orange-500" />
          <span className="text-[var(--accent-2)] text-sm font-medium">{worldcups.length}개의 월드컵</span>
        </div>
      </div>

      {/* 카드 그리드 */}
      {loading && worldcups.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-[var(--accent-1)] border-t-transparent animate-spin rounded-full"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {worldcups.map((wc) => (
              <motion.div
                layout
                key={wc.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <PremiumHover className="rounded-[2rem] overflow-hidden">
                  <div className="group relative bg-white dark:bg-zinc-950 border border-black/5 dark:border-white/10 h-full">
                    <VideoThumbnail 
                      videoId={wc.thumbnail_youtube_id} 
                      thumbnailUrl={wc.thumbnail_url} 
                      title={wc.title} 
                    />
                    <Link href={`/worldcup/${wc.id}`} className="p-6 block">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-black bg-[var(--accent-1)]/10 text-[var(--accent-1)] px-3 py-1 rounded-full uppercase tracking-tighter border border-[var(--accent-1)]/10">
                          {wc.category || '전체'}
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
                          <Clock className="w-3.5 h-3.5" />
                          {formatPlays(wc.total_plays)} PLAYS
                        </div>
                      </div>
                      <h3 className="font-black text-[var(--accent-2)] text-lg leading-tight group-hover:text-[var(--accent-1)] transition-colors mb-2 line-clamp-2">
                         {wc.title}
                      </h3>
                      <div className="flex items-center gap-2">
                         <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-black text-zinc-400 uppercase">
                            {wc.creator?.nickname?.[0] || 'U'}
                         </div>
                         <span className="text-xs text-zinc-500 font-medium">@{wc.creator?.nickname || 'Anonymous'}</span>
                      </div>
                    </Link>
                  </div>
                </PremiumHover>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
