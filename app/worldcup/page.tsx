import Link from 'next/link'
import { Trophy, Search, SlidersHorizontal, Play, Clock, Flame, Star, Zap } from 'lucide-react'

const CATEGORIES = ['전체', '연예', '스포츠', '음식', '게임', '애니', '여행', '기타']

const WORLDCUPS = [
  { id: '1', title: '역대 최고 축구 선수 월드컵', emoji: '⚽', category: '스포츠', plays: 128400, color: 'from-green-500/20 to-emerald-500/10', badge: 'hot' },
  { id: '2', title: '2024 K-POP 아이돌 월드컵', emoji: '🎤', category: '연예', plays: 95200, color: 'from-pink-500/20 to-rose-500/10', badge: 'new' },
  { id: '3', title: '한국 음식 최강자 월드컵', emoji: '🍜', category: '음식', plays: 72000, color: 'from-orange-500/20 to-amber-500/10', badge: null },
  { id: '4', title: '역대 최고 애니메이션 월드컵', emoji: '🎌', category: '애니', plays: 64300, color: 'from-blue-500/20 to-cyan-500/10', badge: null },
  { id: '5', title: '드림 여행지 월드컵', emoji: '✈️', category: '여행', plays: 58100, color: 'from-violet-500/20 to-purple-500/10', badge: null },
  { id: '6', title: '최고의 게임 캐릭터 월드컵', emoji: '🎮', category: '게임', plays: 49800, color: 'from-indigo-500/20 to-blue-500/10', badge: null },
  { id: '7', title: '역대 최강 MLB 선수 월드컵', emoji: '⚾', category: '스포츠', plays: 41200, color: 'from-sky-500/20 to-blue-500/10', badge: null },
  { id: '8', title: '최고의 한국 드라마 월드컵', emoji: '📺', category: '연예', plays: 38700, color: 'from-rose-500/20 to-pink-500/10', badge: 'new' },
  { id: '9', title: '세계 디저트 최강자 월드컵', emoji: '🍰', category: '음식', plays: 32100, color: 'from-yellow-500/20 to-amber-500/10', badge: null },
]

function formatPlays(n: number) {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만`
  return n.toLocaleString()
}

const BADGE_STYLES: Record<string, string> = {
  hot: 'bg-orange-500 text-white border-orange-600 shadow-lg shadow-orange-500/20',
  new: 'bg-green-500 text-white border-green-600 shadow-lg shadow-green-500/20',
}
const BADGE_LABELS: Record<string, string> = { hot: '🔥 HOT', new: '✨ NEW' }

export default function WorldcupPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] max-w-7xl mx-auto px-6 py-12">
      {/* 헤더 */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-2">
          <Trophy className="w-6 h-6 text-[var(--accent-2)]" />
          <h1 className="text-3xl font-extrabold text-[var(--accent-2)]">월드컵 탐색</h1>
        </div>
        <p className="text-zinc-500 dark:text-zinc-400">다양한 주제의 이상형 월드컵을 발견하고 즐겨보세요</p>
      </div>

      {/* 검색 + 필터 */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--accent-2)]" />
          <input
            id="worldcup-search"
            type="text"
            placeholder="월드컵 검색..."
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
        {CATEGORIES.map((cat, i) => (
          <button
            key={cat}
            id={`category-${cat}`}
            className={`shrink-0 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm ${
              i === 0
                ? 'bg-[var(--accent-1)] text-white shadow-[var(--accent-1)]/20'
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
          <span className="text-[var(--accent-2)] text-sm font-medium">{WORLDCUPS.length}개의 월드컵</span>
        </div>
        <div className="flex items-center gap-1 text-sm">
          {[
            { icon: Flame, label: '인기순' },
            { icon: Star, label: '평점순' },
            { icon: Zap, label: '최신순' },
          ].map(({ icon: Icon, label }, i) => (
            <button
              key={label}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors font-bold ${
                i === 0 ? 'bg-[var(--accent-1)] text-white' : 'text-[var(--accent-2)] hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 카드 그리드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {WORLDCUPS.map((wc) => (
          <Link
            key={wc.id}
            href={`/worldcup/${wc.id}`}
            className="group relative bg-white dark:bg-zinc-950 border border-black/5 dark:border-white/10 rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-[var(--accent-1)]/10"
          >
            {/* 배지 */}
            {wc.badge && (
              <div className={`absolute top-3 left-3 z-10 text-xs font-bold px-2 py-0.5 rounded-full border ${BADGE_STYLES[wc.badge]}`}>
                {BADGE_LABELS[wc.badge]}
              </div>
            )}
            {/* 썸네일 */}
            <div className={`h-36 bg-gradient-to-br ${wc.color} flex items-center justify-center relative`}>
              <span className="text-6xl">{wc.emoji}</span>
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                  <Play className="w-5 h-5 text-white fill-white" />
                </div>
              </div>
            </div>
            {/* 정보 */}
            <div className="p-4 bg-white dark:bg-zinc-950">
              <div className="flex items-start justify-between gap-2 mb-3">
                <h3 className="font-bold text-[var(--accent-2)] text-base leading-snug group-hover:text-[var(--accent-1)] transition-colors line-clamp-2">
                  {wc.title}
                </h3>
                <span className="shrink-0 text-[10px] font-black bg-[var(--accent-1)]/5 border border-[var(--accent-1)]/10 text-[var(--accent-1)] px-2 py-0.5 rounded-full uppercase tracking-tighter">
                  {wc.category}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[var(--accent-2)] opacity-70 font-bold">
                <Clock className="w-3.5 h-3.5" />
                <span>{formatPlays(wc.plays)}회 플레이</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
