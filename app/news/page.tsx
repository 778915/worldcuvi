'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Plus } from 'lucide-react' // 플러스 아이콘 사용

interface Worldcup {
    id: string;
    title: string;
    thumbnail_url: string;
    like_count: number;
    total_views: number;
    created_at: string;
}

export default function NewsPage() {
    const supabase = createClient()
    const [worldcups, setWorldcups] = useState<Worldcup[]>([])
    const [loading, setLoading] = useState(true)

    const getRemainingDays = (createdAt: string) => {
        const created = new Date(createdAt)
        const now = new Date()
        const diffTime = now.getTime() - created.getTime()
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
        return Math.max(0, 30 - diffDays)
    }

    const fetchNewWorldcups = async () => {
        setLoading(true)
        // [수정] 30일 제한을 제거하여 콘텐츠 유실 방지. 단, 최신순으로 정렬하여 신규 노출은 보장함.
        const { data, error } = await supabase
            .from('worldcups')
            .select('*, creator:creator_id(nickname)')
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(49)

        if (!error && data) setWorldcups(data as Worldcup[])
        setLoading(false)
    }

    useEffect(() => {
        fetchNewWorldcups()
    }, [])

    return (
        <div className="max-w-[1400px] mx-auto px-4 py-8">
            <div className="mb-10">
                <h1 className="text-3xl font-bold mb-2">✨ 신규 월드컵</h1>
                <p style={{ color: 'var(--accent-2)' }}>
                    최근 30일 이내에 등록된 매치들입니다.
                </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                <CreateWorldCupCard />

                {loading ? (
                    [...Array(9)].map((_, i) => (
                        <div key={i} className="aspect-video bg-zinc-100 dark:bg-zinc-800 animate-pulse rounded-[2rem]" />
                    ))
                ) : (
                    worldcups.map((wc) => (
                        <WorldCupCard key={wc.id} wc={wc} />
                    ))
                )}
            </div>
        </div>
    )
}

function CreateWorldCupCard() {
    return (
      <Link href="/create" className="group relative bg-white dark:bg-zinc-950 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[2rem] overflow-hidden flex flex-col items-center justify-center aspect-video transition-all hover:border-[var(--accent-1)] hover:bg-[var(--accent-1)]/5 premium-hover">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:bg-[var(--accent-1)] group-hover:text-white transition-all">
            <Plus className="w-5 h-5" />
          </div>
          <p className="text-xs font-black text-zinc-400 group-hover:text-[var(--accent-1)] uppercase tracking-widest">월드컵 만들기</p>
        </div>
      </Link>
    )
}

function WorldCupCard({ wc }: { wc: any }) {
    // D-Day 계산
    const created = new Date(wc.created_at)
    const now = new Date()
    const diffTime = now.getTime() - created.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    const dDay = Math.max(0, 30 - diffDays)

    return (
      <div className="premium-hover group relative bg-white dark:bg-zinc-950 border border-black/5 dark:border-white/10 rounded-[2rem] overflow-hidden shadow-sm flex flex-col transition-all duration-500">
        <div className="relative">
            <img 
                src={wc.thumbnail_url || '/default-thumb.png'} 
                alt={wc.title}
                className="w-full aspect-video object-cover"
            />
            <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest z-10 border border-white/10">
                {dDay === 0 ? 'D-DAY' : `D-${dDay}`}
            </div>
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <Link href={`/worldcup/${wc.id}`} className="p-4 flex-1 flex flex-col bg-white dark:bg-zinc-950">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter border" style={{ backgroundColor: 'color-mix(in srgb, var(--accent-1) 10%, transparent)', color: 'var(--accent-1)', borderColor: 'color-mix(in srgb, var(--accent-1) 10%, transparent)' }}>
              {wc.category || 'GENERAL'}
            </span>
            <div className="flex items-center gap-1 text-[9px] text-zinc-400 font-bold uppercase tracking-widest">
              <span className="w-1 h-1 rounded-full bg-zinc-400" />
              {wc.total_plays?.toLocaleString() || 0}
            </div>
          </div>
          <h3 className="font-black text-xs md:text-sm line-clamp-2 text-zinc-800 dark:text-zinc-100 italic transition-colors group-hover:text-[var(--accent-1)]">{wc.title}</h3>
          <div className="mt-3 flex items-center justify-between">
              <span className="text-[9px] text-zinc-400 font-bold italic">@{wc.creator?.nickname || 'Anonymous'}</span>
              <div className="text-[8px] font-black text-zinc-500 uppercase">
                {new Date(wc.created_at).toLocaleDateString()}
              </div>
          </div>
        </Link>
      </div>
    )
}