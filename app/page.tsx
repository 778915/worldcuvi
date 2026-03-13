'use client'

import Link from 'next/link'
import { Trophy, Flame, Star, Crown, ArrowUpRight, ChevronLeft, ChevronRight, Plus, Play, Clock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import BoosterStatusButton from '@/components/BoosterStatusButton'
import { motion, AnimatePresence } from 'framer-motion'
import BoosterButton from '@/components/BoosterButton'
import { createClient } from '@/lib/supabase/client'
import VideoThumbnail from '@/components/VideoThumbnail'
import PremiumHover from '@/components/PremiumHover'
import SEOImage from '@/components/common/SEOImage'

const FALLBACK_BANNERS = [
  { id: 'f1', type: 'Welcome', title: '월드컵의 세계로\n여러분을 초대합니다!', desc: '당신의 최애를 직접 투표하고 참여해보세요.', bg: 'from-violet-600 to-indigo-600', href: '#' },
  { id: 'f2', type: 'Creator', title: '당신만의 월드컵을\n지금 바로 만들어보세요!', desc: '나만의 주제로 월드컵을 생성하고 공유할 수 있습니다.', bg: 'from-blue-600 to-cyan-600', href: '/create' }
]

const FALLBACK_PODIUM = [
  { id: 'p2', rank: 2, title: '대기 중인 월드컵', total_plays: 0, thumbnail_url: '' },
  { id: 'p1', rank: 1, title: '당신의 월드컵이\n이곳에 오를 수 있습니다!', total_plays: 0, thumbnail_url: '' },
  { id: 'p3', rank: 3, title: '대기 중인 월드컵', total_plays: 0, thumbnail_url: '' }
]

export default function HomePage() {
  const [currentBanner, setCurrentBanner] = useState(0)
  const [isBannerHovered, setIsBannerHovered] = useState(false)
  const [hoveredLeft, setHoveredLeft] = useState(false)
  const [hoveredRight, setHoveredRight] = useState(false)
  const [hoveredPodium, setHoveredPodium] = useState<number | null>(null)
  const bannerRef = useRef<HTMLElement>(null)
  
  const [banners, setBanners] = useState<any[]>([])
  const [newWorldcups, setNewWorldcups] = useState<any[]>([])
  const [trendingWorldcups, setTrendingWorldcups] = useState<any[]>([])
  const [podiumWorldcups, setPodiumWorldcups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const fetchHomeData = async () => {
    try {
      setLoading(true)
      
      // 1. 배너 데이터 (플레이 수 상위 5개)
      const { data: bannerData } = await supabase
        .from('worldcups')
        .select(`
          *,
          creator:creator_id (nickname)
        `)
        .eq('status', 'active')
        .order('total_plays', { ascending: false })
        .limit(5)
      
      if (bannerData && bannerData.length > 0) {
        const formattedBanners = bannerData.map((wc, idx) => ({
          id: wc.id,
          type: `TOP ${idx + 1}`,
          title: wc.title,
          desc: wc.description || '지금 가장 핫한 월드컵을 플레이해보세요!',
          bg: [
            'from-violet-600 to-indigo-600',
            'from-blue-600 to-cyan-600',
            'from-emerald-600 to-teal-600',
            'from-orange-600 to-amber-600',
            'from-pink-600 to-rose-600'
          ][idx % 5],
          href: `/worldcup/${wc.id}`
        }))
        setBanners(formattedBanners)
      } else {
        setBanners(FALLBACK_BANNERS)
      }

      // 2. 신규 월드컵 (최신순 10개)
      const { data: newData } = await supabase
        .from('worldcups')
        .select(`
          *,
          creator:creator_id (nickname)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(10)
      if (newData) setNewWorldcups(newData)

      // 3. 급상승 월드컵 (플레이 수 기준 10개)
      const { data: trendingData } = await supabase
        .from('worldcups')
        .select(`
          *,
          creator:creator_id (nickname)
        `)
        .eq('status', 'active')
        .order('total_plays', { ascending: false })
        .limit(10)
      if (trendingData) setTrendingWorldcups(trendingData)

      // 4. 시상대 데이터
      if (trendingData && trendingData.length >= 3) {
        setPodiumWorldcups([trendingData[1], trendingData[0], trendingData[2]])
      } else {
        setPodiumWorldcups(FALLBACK_PODIUM)
      }
    } catch (e) {
      console.error('Error fetching home data:', e)
      setBanners(FALLBACK_BANNERS)
      setPodiumWorldcups(FALLBACK_PODIUM)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setMounted(true)
    fetchHomeData()

    const channel = supabase
      .channel('home:worldcups')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'worldcups' }, async (payload: any) => {
        // [수정] 즉시 반영을 위해 작성자 정보(nickname) 수동 보충 (조인 데이터는 페이로드에 안 옴)
        const { data: creatorData } = await supabase
          .from('users')
          .select('nickname')
          .eq('id', payload.new.creator_id)
          .single();
        
        const newWc = { ...payload.new, creator: creatorData };
        setNewWorldcups(prev => [newWc, ...prev.slice(0, 9)]);
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    const bannerList = banners.length > 0 ? banners : FALLBACK_BANNERS
    
    let interval: NodeJS.Timeout
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          interval = setInterval(() => {
            setCurrentBanner((prev) => (prev + 1) % bannerList.length)
          }, 5000)
        } else {
          clearInterval(interval)
          setCurrentBanner(0)
        }
      },
      { threshold: 0.1 }
    )

    if (bannerRef.current) {
      observer.observe(bannerRef.current)
    }

    return () => {
      observer.disconnect()
      clearInterval(interval)
    }
  }, [banners])

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background">
      <h1 className="sr-only">월드커비 - 유튜브 영상 이상형 월드컵 플랫폼</h1>
      
      {/* ── 섹션 1: 히어로 배너 ── */}
      <section ref={bannerRef} className="max-w-7xl mx-auto px-6 pt-24 pb-12">
        <div 
          className="relative w-full h-[250px] md:h-[400px] rounded-2xl overflow-hidden shadow-xl cursor-pointer transition-all duration-300 hover:brightness-90 card-hover"
          onMouseEnter={() => setIsBannerHovered(true)}
          onMouseLeave={() => setIsBannerHovered(false)}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest('button')) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const bannerList = banners.length > 0 ? banners : FALLBACK_BANNERS
            if (e.clientX < rect.left + rect.width / 2) {
              setCurrentBanner((prev) => (prev === 0 ? bannerList.length - 1 : prev - 1))
            } else {
              setCurrentBanner((prev) => (prev + 1) % bannerList.length)
            }
          }}
        >
          {(banners.length > 0 ? banners : FALLBACK_BANNERS).map((banner, idx) => (
            <Link
              key={banner.id}
              href={banner.href}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out p-8 md:p-12 flex flex-col justify-end group/banner bg-gradient-to-br ${banner.bg} ${
                idx === currentBanner ? 'opacity-100 z-10' : 'opacity-0 z-0'
              }`}
            >
              <div className="absolute inset-0 bg-black/20 group-hover/banner:bg-transparent transition-colors" />
              <div className="absolute top-6 left-6 md:top-8 md:left-8 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs md:text-sm font-bold shadow-sm">{banner.type}</div>
              <h2 className="relative text-white font-extrabold text-3xl md:text-5xl mb-3 md:mb-4 whitespace-pre-line leading-tight">{banner.title}</h2>
              <p className="relative text-white/90 text-sm md:text-lg">{banner.desc}</p>
            </Link>
          ))}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {(banners.length > 0 ? banners : FALLBACK_BANNERS).map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentBanner(idx)}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  idx === currentBanner ? 'bg-white w-6' : 'bg-white/40 hover:bg-white/70'
                }`}
                aria-label={`${idx + 1}번 배너로 이동`}
              />
            ))}
          </div>

          <button
            onClick={(e) => { 
              e.stopPropagation(); 
              const bannerList = banners.length > 0 ? banners : FALLBACK_BANNERS
              setCurrentBanner((prev) => (prev === 0 ? bannerList.length - 1 : prev - 1)); 
            }}
            onMouseEnter={() => setHoveredLeft(true)}
            onMouseLeave={() => setHoveredLeft(false)}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center text-white transition-all cursor-pointer hover:bg-black/50 hover:scale-110"
            style={{ color: hoveredLeft ? 'var(--accent-1)' : 'white', opacity: isBannerHovered ? 1 : 0 }}
          >
            <ChevronLeft className="w-7 h-7" />
          </button>
          <button
            onClick={(e) => { 
              e.stopPropagation(); 
              const bannerList = banners.length > 0 ? banners : FALLBACK_BANNERS
              setCurrentBanner((prev) => (prev + 1) % bannerList.length); 
            }}
            onMouseEnter={() => setHoveredRight(true)}
            onMouseLeave={() => setHoveredRight(false)}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center text-white transition-all cursor-pointer hover:bg-black/50 hover:scale-110"
            style={{ color: hoveredRight ? 'var(--accent-1)' : 'white', opacity: isBannerHovered ? 1 : 0 }}
          >
            <ChevronRight className="w-7 h-7" />
          </button>
        </div>
      </section>

      {/* ── 섹션 2: 금주의 시상대 ── */}
      <section className="bg-black/[0.02] dark:bg-white/[0.02] border-y border-black/5 dark:border-white/5 py-16">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <h2 className="text-3xl font-black mb-2 italic">TOP TRENDING 🔥</h2>
              <p className="font-medium" style={{ color: 'var(--accent-2)' }}>지금 이 순간 가장 많은 선택을 받고 있는 월드컵입니다</p>
            </div>
          </div>
          
          <div className="flex items-end justify-center gap-2 md:gap-8 min-h-[16rem] md:min-h-[22rem] mt-8">
            <PodiumItem wc={(podiumWorldcups.length >= 3 ? podiumWorldcups : FALLBACK_PODIUM)[0]} rank={2} hovered={hoveredPodium === 2} onHover={setHoveredPodium} />
            <PodiumItem wc={(podiumWorldcups.length >= 3 ? podiumWorldcups : FALLBACK_PODIUM)[1]} rank={1} hovered={hoveredPodium === 1} onHover={setHoveredPodium} />
            <PodiumItem wc={(podiumWorldcups.length >= 3 ? podiumWorldcups : FALLBACK_PODIUM)[2]} rank={3} hovered={hoveredPodium === 3} onHover={setHoveredPodium} />
          </div>
        </div>
      </section>

      {/* ── 섹션 3: 내부 홍보 배너 ── */}
      <section className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {/* Plus Membership Card - Gold/Crown Theme */}
          <PremiumHover onClick={() => router.push('/plus')} className="rounded-[2.5rem] overflow-hidden">
            <div className="relative h-48 border border-[#bf953f]/30 hover:border-[#fcf6ba] transition-all duration-500 shadow-2xl overflow-hidden rounded-[2.5rem]">
              <div className="absolute inset-0 bg-gradient-to-br from-[#bf953f] via-[#fcf6ba] to-[#aa771c] opacity-90 group-hover:scale-110 transition-transform duration-1000" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.4),transparent)] animate-pulse" />
              
              <div className="relative h-full p-8 flex flex-col justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-black/10 backdrop-blur-md flex items-center justify-center shadow-inner group-hover:rotate-12 transition-transform">
                    <Crown className="w-8 h-8 text-[#4b3200] fill-[#4b3200] animate-bounce" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-[#4b3200] leading-none mb-1">Plus Membership</h3>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-black/10 rounded-md text-[10px] font-black text-[#4b3200]/70 uppercase tracking-widest">Premium</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-end justify-between">
                  <p className="text-[#4b3200] font-bold max-w-[200px] leading-snug">No ads, special badges, and up to 128 rounds!</p>
                  <div className="w-12 h-12 rounded-full bg-black/10 flex items-center justify-center group-hover:bg-black/20 transition-all">
                    <ArrowUpRight className="w-6 h-6 text-[#4b3200]" />
                  </div>
                </div>
              </div>
              
              {/* Shimmer Effect */}
              <div className="absolute top-0 -left-[100%] w-1/2 h-full bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-[-25deg] group-hover:left-[150%] transition-all duration-1000" />
            </div>
          </PremiumHover>

          {/* Become a Creator Card - Purple/Particles Theme */}
          <PremiumHover onClick={() => router.push('/create')} className="rounded-[2.5rem] overflow-hidden">
            <div className="relative h-48 border border-violet-500/30 hover:border-violet-400 transition-all duration-500 shadow-2xl overflow-hidden rounded-[2.5rem]">
              <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] group-hover:brightness-125 transition-all duration-500" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(139,92,246,0.2),transparent)]" />
              
              {/* Rising Particles (Client Only to fix Hydration) */}
              {mounted && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  {[...Array(12)].map((_, i) => (
                    <div 
                      key={i}
                      className="absolute w-1 h-1 bg-white rounded-full animate-[boosterParticle_2s_infinite] opacity-0"
                      style={{
                        left: `${Math.random() * 100}%`,
                        bottom: '-10px',
                        animationDelay: `${Math.random() * 2}s`,
                        animationDuration: `${1.5 + Math.random() * 1.5}s`
                      }}
                    />
                  ))}
                </div>
              )}

              <div className="relative h-full p-8 flex flex-col justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-violet-600/30 backdrop-blur-md flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.3)] border border-violet-400/30 group-hover:-rotate-12 transition-transform">
                    <Flame className="w-8 h-8 text-violet-400 fill-violet-400 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white leading-none mb-1">Become a Creator</h3>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-violet-600/40 rounded-md text-[10px] font-black text-violet-200 uppercase tracking-widest">Rewards</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-end justify-between">
                  <p className="text-zinc-400 font-bold max-w-[200px] leading-snug">Create your own worldcup and earn rewards based on plays!</p>
                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-all">
                    <ArrowUpRight className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>

              {/* Breathing Aura */}
              <div className="absolute inset-0 bg-violet-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 animate-pulse" />
            </div>
          </PremiumHover>
        </div>
      </section>

      {/* ── 섹션 4: 급상승 ── */}
      <section className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center gap-2 mb-6">
          <Flame className="w-6 h-6 text-orange-500" />
          <h2 className="text-2xl font-black italic">TRENDING NOW</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          <CreateWorldCupCard />
          {trendingWorldcups.map((wc) => (
            <WorldCupCard key={wc.id} wc={wc} />
          ))}
        </div>
      </section>

      {/* ── 섹션 5: 신규 작품 ── */}
      <section className="max-w-7xl mx-auto px-6 py-8 mb-12">
        <div className="flex items-center gap-2 mb-6">
          <Star className="w-6 h-6 text-yellow-500" />
          <h2 className="text-2xl font-black italic">NEW ARRIVALS</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          <CreateWorldCupCard />
          <AnimatePresence mode="popLayout">
            {newWorldcups.map((wc) => (
              <motion.div
                layout
                key={wc.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <WorldCupCard wc={wc} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </section>
    </main>
  )
}

function PodiumItem({ wc, rank, hovered, onHover }: { wc: any, rank: number, hovered: boolean, onHover: (r: number | null) => void }) {
  const styles = {
    1: { border: 'border-yellow-400', glow: 'breathing-glow-gold', text: '1ST', color: '#FFD700', bounce: true, offset: 'translate-y-0' },
    2: { border: 'border-zinc-300', glow: 'breathing-glow-silver', text: '2ND', color: '#C0C0C0', bounce: false, offset: 'translate-y-4' },
    3: { border: 'border-amber-700', glow: 'breathing-glow-bronze', text: '3RD', color: '#CD7F32', bounce: false, offset: 'translate-y-8' }
  }[rank as 1|2|3]

  return (
    <div 
      className={`w-1/3 max-w-[240px] flex flex-col items-center relative transition-all duration-500 ${styles.offset} ${hovered ? 'scale-105 z-30' : 'z-10'}`}
      onMouseEnter={() => onHover(rank)}
      onMouseLeave={() => onHover(null)}
    >
      {styles.bounce && <div className="absolute -top-8 w-12 h-12 text-yellow-400 animate-bounce z-20"><Crown className="w-full h-full fill-yellow-400" /></div>}
      <div className={`relative w-24 h-24 md:w-28 md:h-28 rounded-full border-4 border-white/20 z-10 -mb-8 md:-mb-10 bg-zinc-800 ${styles.glow} overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]`}>
        {wc.creator_avatar_url ? (
          <SEOImage 
            src={wc.creator_avatar_url} 
            alt={wc.creator?.nickname} 
            worldcupTitle={wc.title}
            fill
            className="w-full h-full object-cover rounded-full" 
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-3xl">👤</div>
        )}
      </div>
      <div className={`w-full bg-white dark:bg-zinc-900 rounded-t-3xl border-4 ${styles.border} shadow-2xl overflow-hidden flex flex-col`}>
        <VideoThumbnail 
          videoId={wc.thumbnail_youtube_id} 
          thumbnailUrl={wc.thumbnail_url} 
          title={wc.title} 
          className="mt-10" 
        />
        <Link href={`/worldcup/${wc.id}`} className="p-4 md:p-5 text-center bg-white dark:bg-zinc-900 group">
          <span className="font-black block mb-1 text-sm md:text-lg italic tracking-tighter" style={{ color: styles.color }}>{styles.text}</span>
          <h3 className="font-black text-xs md:text-sm line-clamp-2 text-zinc-800 dark:text-zinc-100 italic group-hover:text-[var(--accent-1)] transition-colors">{wc.title}</h3>
          <p className="text-[10px] md:text-xs mt-2 font-black uppercase tracking-widest" style={{ color: 'var(--accent-2)' }}>{wc.total_plays?.toLocaleString()} PLAYS</p>
        </Link>
      </div>
    </div>
  )
}

function CreateWorldCupCard() {
  const router = useRouter()
  return (
    <PremiumHover onClick={() => router.push('/create')} className="rounded-[2rem] overflow-hidden">
      <div className="relative w-full h-full min-h-[160px] bg-white dark:bg-zinc-900 border-2 border-dashed border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center aspect-video transition-all">
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:bg-[var(--accent-1)] group-hover:text-white transition-all">
            <Plus className="w-5 h-5" />
          </div>
          <p className="text-xs font-black text-zinc-400 group-hover:text-[var(--accent-1)] uppercase tracking-widest">Create New</p>
        </div>
      </div>
    </PremiumHover>
  )
}

function WorldCupCard({ wc }: { wc: any }) {
  const router = useRouter()
  return (
    <article>
      <PremiumHover onClick={() => router.push(`/worldcup/${wc.id}`)} className="rounded-[2rem] overflow-hidden h-full">
        <div className="relative h-full bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 flex flex-col transition-all duration-500">
          <VideoThumbnail 
            videoId={wc.thumbnail_youtube_id} 
            thumbnailUrl={wc.thumbnail_url} 
            title={wc.title} 
            onPlayClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              router.push(`/worldcup/${wc.id}/play`)
            }}
          />
          <div className="p-4 flex-1 flex flex-col bg-white dark:bg-zinc-900">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter border" style={{ backgroundColor: 'color-mix(in srgb, var(--accent-1) 10%, transparent)', color: 'var(--accent-1)', borderColor: 'color-mix(in srgb, var(--accent-1) 10%, transparent)' }}>
                {wc.category || 'GENERAL'}
              </span>
              <div className="flex items-center gap-1 text-[9px] text-zinc-400 font-bold uppercase tracking-widest">
                <Clock className="w-3 h-3" />
                {wc.total_plays.toLocaleString()}
              </div>
            </div>
            <h3 className="font-black text-xs md:text-sm line-clamp-2 text-zinc-800 dark:text-zinc-100 italic transition-colors group-hover:text-[var(--accent-1)]">{wc.title}</h3>
            <div className="mt-3 flex items-center justify-between">
                <span className="text-[9px] text-zinc-400 font-bold italic">@{wc.creator?.nickname || 'Anonymous'}</span>
                <div className="flex items-center gap-1">
                    <div className="w-1 h-1 rounded-full bg-red-600 animate-pulse" />
                    <span className="text-[8px] font-black text-zinc-500 uppercase">LIVE</span>
                </div>
            </div>
          </div>
        </div>
      </PremiumHover>
    </article>
  )
}
