'use client'

import Link from 'next/link'
import { Trophy, Flame, Star, Crown, ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'

import { MOCK_BANNERS, MOCK_TRENDING_WORLDCUPS, MOCK_NEW_WORLDCUPS, MOCK_PODIUM_WORLDCUPS } from '@/constants/mockData'
import BoosterStatusButton from '@/components/BoosterStatusButton'
import { motion, AnimatePresence } from 'framer-motion'
import BoosterButton from '@/components/BoosterButton'

export default function HomePage() {
  const [currentBanner, setCurrentBanner] = useState(0)
  const [isBannerHovered, setIsBannerHovered] = useState(false)
  const [hoveredLeft, setHoveredLeft] = useState(false)
  const [hoveredRight, setHoveredRight] = useState(false)
  const [hoveredPodium, setHoveredPodium] = useState<number | null>(null)
  const bannerRef = useRef<HTMLElement>(null)

  useEffect(() => {
    let interval: NodeJS.Timeout
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          interval = setInterval(() => {
            setCurrentBanner((prev) => (prev + 1) % MOCK_BANNERS.length)
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
  }, [])

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background">
      
      {/* ── 섹션 1: 히어로 배너 (대형 슬라이더 한 장만 표시) ── */}
      <section ref={bannerRef} className="max-w-7xl mx-auto px-6 pt-24 pb-12">
        <div 
          className="relative w-full h-[250px] md:h-[400px] rounded-2xl overflow-hidden shadow-xl cursor-pointer transition-all duration-300 hover:brightness-90 hover:ring-4 hover:ring-[var(--accent-1)]"
          onMouseEnter={() => setIsBannerHovered(true)}
          onMouseLeave={() => setIsBannerHovered(false)}
          onClick={(e) => {
            // 버튼들(화살표, 닷)을 클릭한 경우는 버블링 무시
            if ((e.target as HTMLElement).closest('button')) return;
            const rect = e.currentTarget.getBoundingClientRect();
            if (e.clientX < rect.left + rect.width / 2) {
              setCurrentBanner((prev) => (prev === 0 ? MOCK_BANNERS.length - 1 : prev - 1))
            } else {
              setCurrentBanner((prev) => (prev + 1) % MOCK_BANNERS.length)
            }
          }}
        >
          {MOCK_BANNERS.map((banner, idx) => (
            <div
              key={banner.id}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out p-8 md:p-12 flex flex-col justify-end group/banner bg-gradient-to-br ${banner.bg} ${
                idx === currentBanner ? 'opacity-100 z-10' : 'opacity-0 z-0'
              }`}
            >
              <div className="absolute inset-0 bg-black/20 group-hover/banner:bg-transparent transition-colors" />
              <div className="absolute top-6 left-6 md:top-8 md:left-8 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs md:text-sm font-bold shadow-sm">{banner.type}</div>
              <h2 className="relative text-white font-extrabold text-3xl md:text-5xl mb-3 md:mb-4 whitespace-pre-line leading-tight">{banner.title}</h2>
              <p className="relative text-white/90 text-sm md:text-lg">{banner.desc}</p>
            </div>
          ))}
          {/* 하단 페이지네이션 닷 */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {MOCK_BANNERS.map((_, idx) => (
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

          {/* 좌우 이동 및 자동 넘김 정지 화살표 */}
          <button
            onClick={(e) => { e.stopPropagation(); setCurrentBanner((prev) => (prev === 0 ? MOCK_BANNERS.length - 1 : prev - 1)); }}
            onMouseEnter={() => setHoveredLeft(true)}
            onMouseLeave={() => setHoveredLeft(false)}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center text-white transition-all cursor-pointer hover:bg-black/50 hover:scale-110"
            style={{ color: hoveredLeft ? 'var(--accent-1)' : 'white', opacity: isBannerHovered ? 1 : 0 }}
          >
            <ChevronLeft className="w-7 h-7" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setCurrentBanner((prev) => (prev + 1) % MOCK_BANNERS.length); }}
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
              <h2 className="text-3xl font-black mb-2">실시간 급상승 트렌드</h2>
              <p className="text-zinc-500 font-medium">지금 가장 핫한 월드컵을 확인해보세요</p>
            </div>
            <div className="flex items-center gap-2"></div>
          </div>
          
          <div className="flex items-end justify-center gap-2 md:gap-8 min-h-[16rem] md:min-h-[22rem] mt-8">
            {/* 2위 (Left) */}
            <div 
              className="w-1/3 max-w-[200px] flex flex-col items-center relative card-hover cursor-pointer translate-y-8 transition-transform"
              onMouseEnter={() => setHoveredPodium(2)}
              onMouseLeave={() => setHoveredPodium(null)}
              style={hoveredPodium === 2 ? { transform: 'scale(1.05)' } : {}}
            >
              <div
                className="relative w-16 h-16 md:w-20 md:h-20 rounded-full border-4 border-background z-10 -mb-6 md:-mb-8 bg-zinc-800 breathing-glow-silver outline outline-0 transition-all"
                style={hoveredPodium === 2 ? { 
                  outline: '3px solid #C0C0C0', outlineOffset: '2px', 
                  boxShadow: '0 0 50px rgba(192, 192, 192, 0.8)',
                  filter: 'brightness(1.2)' 
                } : { outlineColor: 'transparent' }}
              >
                <img src={MOCK_PODIUM_WORLDCUPS[0].creatorImg} alt="Creator 2" className="w-full h-full object-cover rounded-full" />
              </div>
              <div
                className="w-full bg-gray-100 dark:bg-zinc-800 rounded-t-2xl border border-gray-200 dark:border-zinc-700 overflow-hidden flex flex-col outline outline-0 transition-all"
                style={hoveredPodium === 2 ? { 
                  outline: '2px solid #C0C0C0',
                  boxShadow: '0 0 30px rgba(192, 192, 192, 0.5)' 
                } : { outlineColor: 'transparent' }}
              >
                <div className="w-full aspect-video bg-zinc-200 dark:bg-zinc-700 relative mt-6 md:mt-8">
                  <img src={MOCK_PODIUM_WORLDCUPS[0].thumb} alt="Thumb 2" className="absolute inset-0 w-full h-full object-cover" />
                </div>
                <div className="p-3 text-center">
                  <span className="text-gray-500 font-bold block mb-1 text-xs md:text-sm">2ND</span>
                  <h3 className="font-bold text-xs md:text-sm line-clamp-2" style={{ color: '#bf953f' }}>{MOCK_PODIUM_WORLDCUPS[0].title}</h3>
                  <p className="text-[10px] md:text-xs text-accent mt-2 font-medium">{MOCK_PODIUM_WORLDCUPS[0].plays.toLocaleString()} Plays</p>
                </div>
              </div>
            </div>

            {/* 1위 (Center) */}
            <div 
              className="w-1/3 max-w-[240px] flex flex-col items-center relative card-hover cursor-pointer z-20 transition-transform"
              onMouseEnter={() => setHoveredPodium(1)}
              onMouseLeave={() => setHoveredPodium(null)}
              style={hoveredPodium === 1 ? { transform: 'scale(1.06)' } : {}}
            >
              <div className="absolute -top-6 md:-top-8 w-10 h-10 md:w-12 md:h-12 text-yellow-400 animate-bounce z-20"><Crown className="w-full h-full fill-yellow-400" /></div>
              <div
                className="relative w-24 h-24 md:w-28 md:h-28 rounded-full border-4 border-background z-10 -mb-8 md:-mb-10 bg-zinc-800 breathing-glow-gold outline outline-0 transition-all shadow-2xl"
                style={hoveredPodium === 1 ? { 
                  outline: '4px solid #FFD700', outlineOffset: '2px', 
                  boxShadow: '0 0 70px rgba(255, 215, 0, 0.9)',
                  filter: 'brightness(1.25)' 
                } : { outlineColor: 'transparent' }}
              >
                <img src={MOCK_PODIUM_WORLDCUPS[1].creatorImg} alt="Creator 1" className="w-full h-full object-cover rounded-full" />
              </div>
              <div
                className="w-full bg-white dark:bg-zinc-900 rounded-t-2xl border-2 border-yellow-400/50 shadow-xl overflow-hidden flex flex-col outline outline-0 transition-all"
                style={hoveredPodium === 1 ? { 
                  outline: '3px solid #FFD700',
                  boxShadow: '0 0 40px rgba(255, 215, 0, 0.6)' 
                } : { outlineColor: 'transparent' }}
              >
                <div className="w-full aspect-video bg-zinc-200 dark:bg-zinc-700 relative mt-8 md:mt-10">
                  <img src={MOCK_PODIUM_WORLDCUPS[1].thumb} alt="Thumb 1" className="absolute inset-0 w-full h-full object-cover" />
                </div>
                <div className="p-4 md:p-5 text-center">
                  <span className="text-yellow-500 font-extrabold block mb-1 text-sm md:text-lg">1ST</span>
                  <h3 className="font-bold text-sm md:text-base line-clamp-2" style={{ color: '#bf953f' }}>{MOCK_PODIUM_WORLDCUPS[1].title}</h3>
                  <p className="text-xs md:text-sm text-accent mt-2 font-bold">{MOCK_PODIUM_WORLDCUPS[1].plays.toLocaleString()} Plays</p>
                </div>
              </div>
            </div>

            {/* 3위 (Right) */}
            <div 
              className="w-1/3 max-w-[200px] flex flex-col items-center relative card-hover cursor-pointer translate-y-12 transition-transform"
              onMouseEnter={() => setHoveredPodium(3)}
              onMouseLeave={() => setHoveredPodium(null)}
              style={hoveredPodium === 3 ? { transform: 'scale(1.05)' } : {}}
            >
              <div
                className="relative w-14 h-14 md:w-16 md:h-16 rounded-full border-4 border-background z-10 -mb-5 md:-mb-6 bg-zinc-800 breathing-glow-bronze outline outline-0 transition-all"
                style={hoveredPodium === 3 ? { 
                  outline: '3px solid #CD7F32', outlineOffset: '2px', 
                  boxShadow: '0 0 50px rgba(205, 127, 50, 0.8)',
                  filter: 'brightness(1.2)' 
                } : { outlineColor: 'transparent' }}
              >
                <img src={MOCK_PODIUM_WORLDCUPS[2].creatorImg} alt="Creator 3" className="w-full h-full object-cover rounded-full" />
              </div>
              <div
                className="w-full bg-gray-100 dark:bg-zinc-800 rounded-t-2xl border border-gray-200 dark:border-zinc-700 overflow-hidden flex flex-col outline outline-0 transition-all"
                style={hoveredPodium === 3 ? { 
                  outline: '2px solid #CD7F32',
                  boxShadow: '0 0 30px rgba(205, 127, 50, 0.5)' 
                } : { outlineColor: 'transparent' }}
              >
                <div className="w-full aspect-video bg-zinc-200 dark:bg-zinc-700 relative mt-5 md:mt-6">
                  <img src={MOCK_PODIUM_WORLDCUPS[2].thumb} alt="Thumb 3" className="absolute inset-0 w-full h-full object-cover" />
                </div>
                <div className="p-3 text-center">
                  <span className="text-amber-700 font-bold block mb-1 text-xs md:text-sm">3RD</span>
                  <h3 className="font-bold text-xs md:text-sm line-clamp-2" style={{ color: '#bf953f' }}>{MOCK_PODIUM_WORLDCUPS[2].title}</h3>
                  <p className="text-[10px] md:text-xs text-accent mt-2 font-medium">{MOCK_PODIUM_WORLDCUPS[2].plays.toLocaleString()} Plays</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 섹션 3: 내부 홍보 배너 ── */}
      <section className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/plus" className="btn-hover card-hover bg-zinc-900 dark:bg-zinc-800 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between border border-black/5 dark:border-white/5 shadow-sm group hover:bg-[var(--accent-1)]/10 hover:border-[var(--accent-1)] transition-all duration-300">
            <div className="mb-4 md:mb-0">
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                <h3 className="font-bold text-white text-lg group-hover:text-[var(--accent-2)] transition-colors">WorldCuvi Plus 출시</h3>
              </div>
              <p className="text-zinc-400 text-sm">광고 제거 및 특별한 커스텀 뱃지를 받아보세요</p>
            </div>
            <ArrowUpRight className="w-6 h-6 text-zinc-500 group-hover:text-[var(--accent-1)] transition-colors" />
          </Link>
          <Link href="/creator/apply" className="btn-hover card-hover bg-gradient-to-br from-[var(--accent-1)]/10 to-transparent rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between border shadow-sm group hover:bg-[var(--accent-1)]/20 hover:border-[var(--accent-1)] transition-all duration-300"
                style={{ borderColor: 'color-mix(in srgb, var(--accent-1) 20%, transparent)' }}>
            <div className="mb-4 md:mb-0">
              <div className="flex items-center gap-2 mb-2">
                <Flame className="w-5 h-5" style={{ color: 'var(--accent-1)' }} />
                <h3 className="font-bold text-lg text-[#bf953f]">공식 창작자 모집</h3>
              </div>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm">월드컵을 만들고 수익을 창출하세요 (조회수 1위 시 보너스)</p>
            </div>
            <ArrowUpRight className="w-6 h-6 group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform" style={{ color: 'var(--accent-1)' }} />
          </Link>
        </div>
      </section>

      {/* ── 섹션 4: 급상승 (10개, 1줄 5개 Grid) ── */}
      <section className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center gap-2 mb-6">
          <Flame className="w-6 h-6" style={{ color: 'var(--accent-2)' }} />
          <h2 className="text-2xl font-bold text-foreground">실시간 급상승 트렌드</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {MOCK_TRENDING_WORLDCUPS
            // score = (view + like*5 - unlike*10) / (hours+2)^1.5 기준으로 정렬되었다고 가정
            .slice()
            .sort((a, b) => (b.score || 0) - (a.score || 0))
            .map((wc) => (
              <WorldCupCard key={wc.id} wc={wc} />
            ))}
        </div>
      </section>

      {/* ── 섹션 5: 신규 작품 (10개, 1줄 5개 Grid) ── */}
      <section className="max-w-7xl mx-auto px-6 py-8 mb-12">
        <div className="flex items-center gap-2 mb-6">
          <Star className="w-6 h-6" style={{ color: 'var(--accent-2)' }} />
          <h2 className="text-2xl font-bold text-foreground">새로 올라온 월드컵</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {MOCK_NEW_WORLDCUPS.map((wc) => (
            <WorldCupCard key={wc.id} wc={wc} />
          ))}
        </div>
      </section>

      {/* ── Adsterra Native Banner (Production Only) ── */}
      {process.env.NODE_ENV === 'production' && (
        <section className="max-w-7xl mx-auto px-6 my-5">
          <div 
            id="container-12e4a722c648fd701cb97127a6784086" 
            className="w-full min-h-[100px] flex items-center justify-center bg-black/5 dark:bg-white/5 rounded-2xl overflow-hidden"
          >
            <script async={true} data-cfasync="false" src="https://pl28905499.effectivegatecpm.com/12e4a722c648fd701cb97127a6784086/invoke.js"></script>
          </div>
        </section>
      )}
    </div>
  )
}

function WorldCupCard({ wc }: { wc: any }) {
  // SSR/CSR 불일치 방지를 위해 ID 기반의 고정된 더미 데이터 생성
  const charCodeSum = wc.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0)
  const dummyBoosterCount = [0, 2, 8][charCodeSum % 3]

  return (
    <Link href={`/worldcup/${wc.id}`} className="card-hover group relative bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm flex flex-col">
      <div className="aspect-video relative overflow-hidden bg-zinc-200 dark:bg-zinc-800">
        {wc.thumb && <img src={wc.thumb} alt={wc.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />}
      </div>
      <div className="p-3 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-1.5">
          <span 
            className="text-[10px] px-1.5 py-0.5 rounded border font-semibold"
            style={{ 
              backgroundColor: 'color-mix(in srgb, var(--accent-1) 10%, transparent)', 
              borderColor: 'color-mix(in srgb, var(--accent-1) 20%, transparent)',
              color: 'var(--accent-2)'
            }}
          >{wc.category}</span>
          
          <BoosterButton 
            boosterCount={dummyBoosterCount} 
            label={dummyBoosterCount > 0 ? `부스터 ${dummyBoosterCount}` : '부스터 0'}
            className="!h-7 !px-2 !min-w-[70px] !text-[10px] scale-90 origin-right -mr-1" 
          />
        </div>
        <h3 className="font-semibold text-sm line-clamp-2 group-hover:brightness-110 mb-auto transition-colors" style={{ color: 'var(--accent-2)' }}>{wc.title}</h3>
        <p className="text-[11px] font-bold mt-2" style={{ color: 'var(--accent-2)' }}>{wc.plays.toLocaleString()} 플레이</p>
      </div>
    </Link>
  )
}
