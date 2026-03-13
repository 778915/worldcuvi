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
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        const dateLimit = thirtyDaysAgo.toISOString()

        const { data, error } = await supabase
            .from('worldcups')
            .select('*')
            .eq('is_public', true)
            .gte('created_at', dateLimit)
            .order('created_at', { ascending: false })
            .limit(49) // 만들기 카드 1개를 위해 49개만 가져옴

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
                <p className="text-zinc-500">
                    최근 30일 이내에 등록된 매치들입니다.
                </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                {/* ➕ [복구] 메이페이지와 동일한 월드컵 만들기 카드 */}
                <Link href="/create" className="group relative bg-white dark:bg-zinc-900 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl overflow-hidden flex flex-col items-center justify-center aspect-[16/10] sm:h-full transition-all hover:border-[var(--accent-1)] hover:bg-[var(--accent-1)]/5 min-h-[150px]">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:bg-[var(--accent-1)] group-hover:text-white transition-all">
                            <Plus className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-bold text-zinc-500 group-hover:text-[var(--accent-1)]">월드컵 만들기</p>
                    </div>
                </Link>


                {/* 로딩 중일 때 스켈레톤 */}
                {loading ? (
                    [...Array(9)].map((_, i) => (
                        <div key={i} className="aspect-[16/10] bg-zinc-100 dark:bg-zinc-800 animate-pulse rounded-xl" />
                    ))
                ) : (
                    // 실제 월드컵 리스트 연동
                    worldcups.map((wc) => {
                        const dDay = getRemainingDays(wc.created_at)
                        return (
                            <Link href={`/worldcup/${wc.id}`} key={wc.id} className="group">
                                <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-zinc-100 shadow-sm transition-all group-hover:shadow-md group-hover:-translate-y-1">
                                    <img
                                        src={wc.thumbnail_url || '/default-thumb.png'}
                                        alt={wc.title}
                                        className="object-cover w-full h-full transition-transform group-hover:scale-105"
                                    />
                                    <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-md">
                                        {dDay === 0 ? '오늘 종료' : `D-${dDay}`}
                                    </div>
                                </div>
                                <div className="mt-3">
                                    <h3 className="font-bold text-sm line-clamp-2 group-hover:text-yellow-500 transition-colors">
                                        {wc.title}
                                    </h3>
                                    <div className="flex items-center justify-between mt-1 text-[11px] text-zinc-400">
                                        <span>👍 {wc.like_count}</span>
                                        <span>{new Date(wc.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </Link>
                        )
                    })
                )}
            </div>
        </div>
    )
}