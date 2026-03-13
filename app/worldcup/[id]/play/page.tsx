'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, ChevronLeft, Play } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAccent } from '@/components/ThemeProvider'
import { WinDistribution } from '@/components/WinDistribution'
import Script from 'next/script'

interface Item {
  id: string
  title: string
  youtube_video_id: string
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
  const [matchIndex, setMatchIndex] = useState(0)
  const [totalMatches, setTotalMatches] = useState(0)

  useEffect(() => {
    const fetchItems = async () => {
      const { data, error } = await supabase
        .from('candidates')
        .select('*')
        .eq('worldcup_id', id)

      if (data && data.length >= 2) {
        // [수정] 셔플 로직 개선 및 파워 오브 2 선택
        const shuffled = [...data].sort(() => Math.random() - 0.5)
        const count = [2, 4, 8, 16, 32, 64, 128].reverse().find(n => n <= shuffled.length) || 2
        const initialItems = shuffled.slice(0, count)
        setItems(initialItems)
        setRoundItems(initialItems)
        setTotalMatches(initialItems.length / 2)
        setMatchIndex(1)
        startNextMatch(initialItems)
      }
      setLoading(false)
    }
    fetchItems()
  }, [id])

  const startNextMatch = async (currentItems: Item[]) => {
    if (currentItems.length === 1) {
      setWinner(currentItems[0])
      // Record final win and Increment total_plays (End of Game)
      await Promise.all([
        supabase.rpc('record_candidate_win', { target_candidate_id: currentItems[0].id }),
        supabase.rpc('increment_worldcup_play', { target_id: id })
      ]);
      
      // [수정] 즉시 데이터 반영을 위해 우승 데이터를 로컬 상태에도 갱신
      setItems(prev => prev.map(it => it.id === currentItems[0].id ? { ...it, win_count: it.win_count + 1 } : it))
      
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
      setTotalMatches(updatedNextRound.length / 2)
      setMatchIndex(1)
      startNextMatch(updatedNextRound)
    } else {
      setMatchIndex(prev => prev + 1)
      startNextMatch(remainingItems)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="w-16 h-16 border-4 border-violet-600 border-t-transparent animate-spin rounded-full shadow-[0_0_20px_rgba(124,58,237,0.5)]" />
    </div>
  )

  if (winner) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-1000">
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1.1, rotate: 0 }}
        transition={{ type: 'spring', damping: 10 }}
        className="w-32 h-32 rounded-3xl bg-violet-600 flex items-center justify-center mb-8 shadow-2xl shadow-violet-600/60 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
        <Trophy className="w-16 h-16 text-white relative z-10" />
      </motion.div>
      <h1 className="text-5xl font-black text-white mb-2 italic tracking-tighter">CROWNED WINNER! 👑</h1>
      <p className="text-violet-400 text-xl font-bold mb-10 [text-shadow:0_0_10px_rgba(167,139,250,0.5)]">{winner.title}</p>
      
      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="w-full max-w-2xl aspect-video rounded-[2.5rem] overflow-hidden mb-12 shadow-2xl ring-4 ring-violet-600/30 group relative"
      >
        <iframe
          width="100%"
          height="100%"
          src={`https://www.youtube.com/embed/${winner.youtube_video_id}?autoplay=1&rel=0&showinfo=0&iv_load_policy=3`}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
        ></iframe>
      </motion.div>

      <div className="flex gap-6 mb-20">
        <motion.button 
          whileHover={{ scale: 1.05, backgroundColor: '#27272a' }}
          whileTap={{ scale: 0.95 }}
          onClick={() => window.location.reload()}
          className="px-12 py-4 bg-zinc-800 text-white rounded-3xl font-black text-lg transition-all border border-white/5"
        >
          다시 하기 🔄
        </motion.button>
        <motion.button 
          whileHover={{ scale: 1.1, backgroundColor: '#7c3aed' }}
          whileTap={{ scale: 0.95 }}
          onClick={() => router.push(`/worldcup/${id}`)}
          className="px-12 py-4 bg-violet-600 text-white rounded-3xl font-black text-lg transition-all shadow-2xl shadow-violet-600/40"
        >
          목록으로 🏁
        </motion.button>
      </div>

      <div className="w-full max-w-4xl opacity-90">
        <WinDistribution candidates={items.map(it => ({
          id: it.id,
          title: it.title,
          win_count: it.win_count
        }))} />
      </div>

      {/* Result Ads */}
      {process.env.NODE_ENV === 'production' && (
        <div className="mt-12 w-full flex flex-col items-center gap-6">
          <Script async data-cfasync="false" src="https://pl28905499.effectivegatecpm.com/12e4a722c648fd701cb97127a6784086/invoke.js" />
          <div id="container-12e4a722c648fd701cb97127a6784086"></div>
          <Script src="https://pl28905487.effectivegatecpm.com/da/2c/c8/da2cc85d141f9144e72f86860df06c50.js" />
        </div>
      )}
    </div>
  )

  if (!currentMatch) return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white font-black italic">
      NO CANDIDATES FOUND. ⚠️
    </div>
  )

  return (
    <div className="min-h-screen bg-black flex flex-col overflow-hidden select-none">
      {/* Header */}
      <div className="absolute top-0 inset-x-0 p-8 pt-24 md:pt-32 flex items-center justify-between z-50 pointer-events-none">
        <motion.button 
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          onClick={async () => {
            if (currentMatch) {
              await supabase.rpc('record_candidate_skip', { target_candidate_id: currentMatch[0].id });
              await supabase.rpc('record_candidate_skip', { target_candidate_id: currentMatch[1].id });
            }
            router.back();
          }}
          className="pointer-events-auto h-14 px-8 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 text-white flex items-center gap-2 hover:bg-white/10 transition-all font-black text-sm"
        >
          <ChevronLeft className="w-5 h-5" />
          ABORT
        </motion.button>
        <div className="text-center">
          <motion.div
            key={roundName}
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex flex-col items-center"
          >
            <p className="text-violet-500 text-[10px] font-black tracking-[0.3em] uppercase mb-1 drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]">
               STAGE: {matchIndex} / {totalMatches} ({roundName})
            </p>
            <h2 className="text-white text-3xl font-black italic tracking-tighter [text-shadow:0_4px_8px_rgba(0,0,0,0.5)]">Pick Your Favorite!</h2>
          </motion.div>
        </div>
        <div className="h-14 w-32" />
      </div>

      {/* Main Game Grid */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2">
        <AnimatePresence mode="wait">
          {currentMatch.map((match, idx) => (
            <motion.div 
              key={match.id}
              initial={{ opacity: 0, x: idx === 0 ? -100 : 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', damping: 20, stiffness: 100 }}
              className="group relative flex flex-col items-center justify-center transition-all hover:z-10 pt-20"
            >
              <div className="absolute inset-0 z-0 overflow-hidden">
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${match.youtube_video_id}?autoplay=1&mute=1&controls=0&loop=1&playlist=${match.youtube_video_id}&iv_load_policy=3&rel=0&showinfo=0`}
                  className="w-full h-full object-cover scale-[1.6] blur-2xl opacity-20 grayscale group-hover:grayscale-0 group-hover:opacity-50 transition-all duration-1000"
                  style={{ pointerEvents: 'none' }}
                ></iframe>
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,black_100%)] opacity-60" />
              </div>

              <motion.div 
                className="relative z-10 w-full max-w-2xl px-8 flex flex-col items-center card-hover"
              >
                <div className="w-full aspect-video rounded-[2.5rem] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.9)] border-2 border-white/5 group-hover:border-violet-500/50 transition-all duration-500 ring-8 ring-transparent group-hover:ring-violet-600/20 relative bg-black">
                  {/* Real Player Implementation - Manual Play & Sound */}
                  <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${match.youtube_video_id}?rel=0&showinfo=0&controls=1&iv_load_policy=3`}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  ></iframe>
                </div>

                {/* Vote Area (Title + Button) */}
                <div 
                  onClick={() => handlePick(match)}
                  className="w-full flex flex-col items-center cursor-pointer py-6"
                >
                  <h3 className="text-3xl font-black text-white text-center drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] leading-tight italic group-hover:text-violet-400 transition-colors">{match.title}</h3>
                  <motion.div 
                    initial={{ opacity: 0.6, y: 0 }}
                    whileHover={{ opacity: 1, y: -5, scale: 1.1 }}
                    className="mt-6 px-10 py-4 rounded-[2rem] bg-violet-600 text-white text-base font-black tracking-widest shadow-2xl shadow-violet-600/40"
                  >
                    SELECT THIS ONE 🏆
                  </motion.div>
                </div>
              </motion.div>

              {idx === 0 && (
                <div className="absolute top-1/2 left-full -translate-x-1/2 -translate-y-1/2 z-20 hidden md:flex items-center justify-center">
                  <motion.div 
                    animate={{ 
                      scale: [1, 1.1, 1],
                      rotate: [0, 5, -5, 0]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-24 h-24 rounded-full bg-black border-[6px] border-violet-600 flex items-center justify-center text-white font-black text-3xl italic tracking-tighter shadow-[0_0_50px_rgba(124,58,237,0.8)] z-30"
                  >
                    VS
                  </motion.div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Footer Info */}
      <div className="p-8 h-24 flex items-center justify-center bg-zinc-950/90 backdrop-blur-2xl border-t border-white/5">
        <div className="flex items-center gap-12 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
          <div className="flex items-center gap-3">
            <motion.span 
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="w-2.5 h-2.5 rounded-full bg-red-600" 
            />
            LIVE TOURNAMENT ENGINE V3
          </div>
          <div className="w-px h-6 bg-white/10" />
          {process.env.NODE_ENV === 'production' && (
            <div className="flex flex-col items-center gap-2">
              <div className="mb-2">
                <Script id="at-options">
                  {`
                    window.atOptions = {
                      'key' : '734ebf8d7e06601268fbfd18671e28e3',
                      'format' : 'iframe',
                      'height' : 90,
                      'width' : 728,
                      'params' : {}
                    };
                  `}
                </Script>
                <Script src="https://www.highperformanceformat.com/734ebf8d7e06601268fbfd18671e28e3/invoke.js" />
              </div>
              <div className="flex items-center gap-2 font-black text-zinc-500 uppercase tracking-widest text-[10px]">
                <Trophy className="w-4 h-4 text-yellow-600" />
                {items.length} ELITE CANDIDATES
              </div>
            </div>
          )}
          {process.env.NODE_ENV !== 'production' && (
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-600" />
              {items.length} ELITE CANDIDATES
            </div>
          )}
          <div className="w-px h-6 bg-white/10" />
          <div className="flex items-center gap-2">
            <Play className="w-4 h-4 text-violet-600" />
             SUPER DYNAMIC MODE
          </div>
        </div>
      </div>
    </div>
  )
}
