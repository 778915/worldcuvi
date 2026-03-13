'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, ChevronLeft, Zap, Play, SkipForward, Info } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAccent } from '@/components/ThemeProvider'
import { WinDistribution } from '@/components/WinDistribution'

interface Item {
  id: string
  title: string
  video_id: string
  thumbnail_url?: string
  win_count: number
}

export default function WorldcupPlayPage() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()
  const { accentPrimary } = useAccent()

  const [items, setItems] = useState<Item[]>([])
  const [roundItems, setRoundItems] = useState<Item[]>([])
  const [nextRoundItems, setNextRoundItems] = useState<Item[]>([])
  const [currentMatch, setCurrentMatch] = useState<[Item, Item] | null>(null)
  const [winner, setWinner] = useState<Item | null>(null)
  const [loading, setLoading] = useState(true)
  const [roundName, setRoundName] = useState('')

  useEffect(() => {
    const fetchItems = async () => {
      const { data, error } = await supabase
        .from('candidates')
        .select('*')
        .eq('worldcup_id', id)

      if (data && data.length >= 2) {
        // Shuffle and take power of 2
        const shuffled = data.sort(() => Math.random() - 0.5)
        const count = [2, 4, 8, 16, 32, 64, 128].reverse().find(n => n <= shuffled.length) || 2
        const initialItems = shuffled.slice(0, count)
        setItems(initialItems)
        setRoundItems(initialItems)
        startNextMatch(initialItems)

        // Increment total_plays for worldcup
        await supabase.rpc('increment_worldcup_play', { target_id: id });
      }
      setLoading(false)
    }
    fetchItems()
  }, [id])

  const startNextMatch = async (currentItems: Item[]) => {
    if (currentItems.length === 1) {
      setWinner(currentItems[0])
      // Record final win
      await supabase.rpc('record_candidate_win', { target_candidate_id: currentItems[0].id });
      
      // Refresh all items to get updated win counts for rankings
      const { data } = await supabase
        .from('candidates')
        .select('*')
        .eq('worldcup_id', id)
      if (data) setItems(data)
      
      return
    }

    if (currentItems.length === 0) return

    setRoundName(currentItems.length === 2 ? '결승' : `${currentItems.length}강`)
    setCurrentMatch([currentItems[0], currentItems[1]])

    // Record match appearance for both
    await supabase.rpc('record_candidate_match', { target_candidate_id: currentItems[0].id });
    await supabase.rpc('record_candidate_match', { target_candidate_id: currentItems[1].id });
  }

  const handlePick = (picked: Item) => {
    const updatedNextRound = [...nextRoundItems, picked]
    setNextRoundItems(updatedNextRound)

    const remainingItems = roundItems.slice(2)
    setRoundItems(remainingItems)

    if (remainingItems.length === 0) {
      // Round finished
      setRoundItems(updatedNextRound)
      setNextRoundItems([])
      startNextMatch(updatedNextRound)
    } else {
      startNextMatch(remainingItems)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="w-16 h-16 border-4 border-violet-600 border-t-transparent animate-spin rounded-full" />
    </div>
  )

  if (winner) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        className="w-32 h-32 rounded-3xl bg-violet-600 flex items-center justify-center mb-8 shadow-2xl shadow-violet-600/40"
      >
        <Trophy className="w-16 h-16 text-white" />
      </motion.div>
      <h1 className="text-4xl font-black text-white mb-2">우승!</h1>
      <p className="text-zinc-400 text-lg mb-8">{winner.title}</p>
      
      <div className="w-full max-w-lg aspect-video rounded-3xl overflow-hidden mb-12 shadow-2xl ring-4 ring-violet-600/20">
        <iframe
          width="100%"
          height="100%"
          src={`https://www.youtube.com/embed/${winner.video_id}?autoplay=1`}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      </div>

      <div className="flex gap-4 mb-16">
        <button 
          onClick={() => window.location.reload()}
          className="px-10 py-4 bg-zinc-800 text-white rounded-2xl font-bold hover:bg-zinc-700 transition-all"
        >
          다시 하기
        </button>
        <button 
          onClick={() => router.push(`/worldcup/${id}`)}
          className="px-10 py-4 bg-violet-600 text-white rounded-2xl font-bold hover:bg-violet-500 transition-all shadow-xl shadow-violet-600/20"
        >
          목록으로
        </button>
      </div>

      <WinDistribution candidates={items.map(it => ({
        id: it.id,
        title: it.title,
        win_count: it.win_count
      }))} />
    </div>
  )

  if (!currentMatch) return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      데이터가 부족합니다.
    </div>
  )

  return (
    <div className="min-h-screen bg-black flex flex-col overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 inset-x-0 p-6 flex items-center justify-between z-50 pointer-events-none">
        <button 
          onClick={async () => {
            // Record skip for remaining items if tournament is aborted
            if (currentMatch) {
              await supabase.rpc('record_candidate_skip', { target_candidate_id: currentMatch[0].id });
              await supabase.rpc('record_candidate_skip', { target_candidate_id: currentMatch[1].id });
            }
            router.back();
          }}
          className="pointer-events-auto h-12 px-6 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 text-white flex items-center gap-2 hover:bg-white/10 transition-all"
        >
          <ChevronLeft className="w-5 h-5" />
          중단하기
        </button>
        <div className="text-center">
          <p className="text-violet-400 text-xs font-black tracking-widest uppercase mb-1">{roundName}</p>
          <h2 className="text-white text-xl font-black italic">어느 쪽이 더 좋은가요?</h2>
        </div>
        <div className="h-12 w-32" />
      </div>

      {/* Main Game Grid */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2">
        {currentMatch.map((match, idx) => (
          <div 
            key={match.id}
            onClick={() => handlePick(match)}
            className="group relative flex flex-col items-center justify-center cursor-pointer transition-all hover:z-10"
          >
            {/* Background Preview */}
            <div className="absolute inset-0 z-0">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${match.video_id}?autoplay=1&mute=1&controls=0&loop=1&playlist=${match.video_id}`}
                className="w-full h-full object-cover scale-150 blur-xl opacity-30 grayscale group-hover:grayscale-0 group-hover:opacity-60 transition-all duration-700"
                style={{ pointerEvents: 'none' }}
              ></iframe>
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/20" />
            </div>

            {/* Content */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative z-10 p-8 flex flex-col items-center"
            >
              <div className="w-full max-w-lg aspect-video rounded-[2.5rem] overflow-hidden shadow-[0_40px_80px_-15px_rgba(0,0,0,0.8)] border border-white/10 group-hover:scale-105 transition-transform duration-500 ring-4 ring-transparent group-hover:ring-violet-600/30">
                <img 
                  src={`https://i.ytimg.com/vi/${match.video_id}/hqdefault.jpg`} 
                  className="w-full h-full object-cover"
                  alt={match.title}
                />
              </div>
              <h3 className="mt-8 text-3xl font-black text-white text-center drop-shadow-2xl">{match.title}</h3>
              <div className="mt-4 px-6 py-2 rounded-xl bg-white/5 border border-white/10 text-zinc-400 text-sm font-bold opacity-0 group-hover:opacity-100 transition-all">
                CLICK TO SELECT
              </div>
            </motion.div>

            {/* VS Overlay (Center) */}
            {idx === 0 && (
              <div className="absolute top-1/2 left-full -translate-x-1/2 -translate-y-1/2 z-20 hidden md:flex items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-black border-4 border-violet-600 flex items-center justify-center text-white font-black text-2xl italic tracking-tighter shadow-[0_0_30px_rgba(124,58,237,0.5)]">
                  VS
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer Info */}
      <div className="p-6 h-20 flex items-center justify-center bg-zinc-950/80 backdrop-blur-md border-t border-white/5">
        <div className="flex items-center gap-8 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-violet-600 animate-pulse" />
            LIVE TOURNAMENT
          </div>
          <div className="w-px h-4 bg-white/10" />
          <div>{items.length} CANDIDATES LOADED</div>
        </div>
      </div>
    </div>
  )
}
