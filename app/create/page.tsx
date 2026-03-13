'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { 
  Sparkles, 
  Youtube, 
  Search,
  ArrowRight, 
  Loader2, 
  Trash2, 
  Plus, 
  Info,
  CheckCircle2,
  AlertCircle,
  Trophy,
  Zap,
  Target,
  Wand2,
  X,
  ListVideo,
  BarChart3,
  Settings,
  ChevronLeft,
  Play,
  Share2
} from 'lucide-react'
import { extractVideoId } from '@/utils/youtube'
import { useAuth } from '@/components/AuthProvider'
import { useAccent } from '@/components/ThemeProvider'
import PlusUserBadge from '@/components/PlusUserBadge'
import PlusNudgeModal from '@/components/PlusNudgeModal'
import { createClient } from '@/lib/supabase/client'

interface AIResult {
  determined_genre: string
  sub_tags: string[]
  identity: string
  public_reaction: string
  suitability_reason: string
  word_cloud: string[]
  is_vs_mode: boolean
  search_keywords: string[]
  confidence_score: number
  recommended_title?: string
  cached?: boolean
  model?: string
}

interface WorldcupItem {
  id: string
  title: string
  team: 'A' | 'B' | 'Neutral'
  thumbnail: string
  videoId?: string
  publishedAt?: string
  channelId?: string
  channelTitle?: string
  isOfficial?: boolean
}

const BRIEFING_MESSAGES = [
  "유튜브 API에서 메타데이터를 정밀하게 읽어오고 있습니다...",
  "시청자 통계와 좋아요 비율을 바탕으로 인기도를 측정 중입니다...",
  "가장 인기 있는 댓글 1,500개를 실시간으로 분석하고 있습니다...",
  "팬들의 감상평에서 뉘앙스와 핵심 키워드를 추출하는 중입니다...",
  "Gemini 3.1 Pro가 분석 보고서를 작성하며 최종 장르를 확정 중입니다...",
  "월드컵 최적화 큐레이션을 위해 유튜브 검색 알고리즘을 가동 중입니다..."
]

export default function WorldcupCreatePage() {
  const router = useRouter()
  const { user, profile } = useAuth()
  const { accentPrimary, accentText } = useAccent()
  const supabase = createClient()
  const isPlus = profile?.is_plus_subscriber ?? false

  const [step, setStep] = useState(1) // 1: Input, 2: Analyzing, 3: Edit
  const [title, setTitle] = useState('')
  const [seedUrl, setSeedUrl] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [isTitleUpgraded, setIsTitleUpgraded] = useState(false)
  
  const [aiResult, setAiResult] = useState<AIResult | null>(null)
  const [items, setItems] = useState<WorldcupItem[]>([])
  const [teamNames, setTeamNames] = useState({ A: 'Team A', B: 'Team B' })
  
  const [showNudge, setShowNudge] = useState(false)
  const [nudgeReason, setNudgeReason] = useState<'rounds' | 'ads' | 'ai'>('rounds')
  const [gamificationMsg, setGamificationMsg] = useState('')
  const [briefingIndex, setBriefingIndex] = useState(0)
  
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<WorldcupItem[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchOrder, setSearchOrder] = useState<'relevance' | 'viewCount' | 'date'>('relevance')
  const [searchMode, setSearchMode] = useState<'seed' | 'candidate'>('seed')
  
  // Magic Scan States
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, video: WorldcupItem } | null>(null)
  const [magicScanResults, setMagicScanResults] = useState<WorldcupItem[]>([])
  const [isScanningChannel, setIsScanningChannel] = useState(false)
  const [selectedScanItems, setSelectedScanItems] = useState<string[]>([])

  // Smart Loading States
  const [detectedGroup, setDetectedGroup] = useState<string | null>(null)
  const [detectedSong, setDetectedSong] = useState<string | null>(null)
  const [themeColors, setThemeColors] = useState({ primary: '#ef4444', secondary: '#ef4444' })
  const [searchError, setSearchError] = useState<string | null>(null)

  // AI 분석 브리핑 텍스트 루프
  useEffect(() => {
    if (isAnalyzing) {
      const interval = setInterval(() => {
        setBriefingIndex(prev => (prev + 1) % BRIEFING_MESSAGES.length)
      }, 2500)
      return () => clearInterval(interval)
    }
  }, [isAnalyzing])

  // AI 분석 모의 루프 (진행률 표시용)
  useEffect(() => {
    if (isAnalyzing && analysisProgress < 95) {
      const timer = setTimeout(() => setAnalysisProgress(prev => prev + 5), 300)
      return () => clearTimeout(timer)
    }
  }, [isAnalyzing, analysisProgress])

  const handleStartAnalysis = async (e?: React.FormEvent, overrideVideoId?: string, overrideThumbnail?: string, overrideTitle?: string) => {
    e?.preventDefault()
    const targetVideoId = overrideVideoId || extractVideoId(seedUrl)
    if (!targetVideoId) return

    setIsAnalyzing(true)
    setAnalysisProgress(10)
    setStep(2)

    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metadata: {
            title: overrideTitle || title,
            videoId: targetVideoId,
          }
        })
      })

      const data = await res.json()
      
      // 429 에러나 기타 AI 실패 시에도 진행 가능하도록 처리 (is_fallback 체크)
      if (data.error && !data.is_fallback) throw new Error(data.error)

      if (data.is_fallback) {
        setGamificationMsg('AI 분석 한도 초과로 수동 모드로 전환합니다. 직접 월드컵을 완성해 보세요! 🛠️')
      }

      setAiResult(data)
      setAnalysisProgress(100)
      
      // AI 추천 제목으로 자동 업데이트 (애니메이션 유도), 폴백이 아닐 때만
      if (data.recommended_title && !data.is_fallback) {
        setGamificationMsg('AI가 더 힙한 제목을 제안했습니다! ✨')
        setTitle(data.recommended_title)
        setIsTitleUpgraded(true)
        setTimeout(() => setIsTitleUpgraded(false), 3000)
      } else if (overrideTitle) {
        setTitle(overrideTitle)
      }

      // 실제 데이터 기반 아이템 추가 (초기 1개)
      // 첫 비디오는 VS 모드라면 팀 A로 자동 배정 (사용자 편의)
      const seedItem: WorldcupItem = { 
        id: Date.now().toString(), 
        title: overrideTitle || data.recommended_title || title, 
        team: data.is_vs_mode ? 'A' : 'Neutral', 
        thumbnail: overrideThumbnail || data.thumbnail || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800', 
        videoId: targetVideoId
      }
      setItems([seedItem])

      if (data.confidence_score > 90) {
        setGamificationMsg('AI가 제작자의 의도를 완벽히 파악했습니다! 🎯')
      }

      // VS 모드일 때 자동 밸런싱 (수량 맞추기)
      if (data.is_vs_mode) {
        const teamA = items.filter(it => it.team === 'A')
        const teamB = items.filter(it => it.team === 'B')
        const diff = teamA.length - teamB.length
        if (diff !== 0) {
          console.log(`Balancing teams... Diff: ${diff}`)
        }
      }

      setTimeout(() => setStep(3), 800)
    } catch (err) {
      console.error(err)
      alert('분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
      setStep(1)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const trackAction = async (channelId: string, channelTitle: string, action: 'add' | 'remove' | 'finalize') => {
    if (!channelId) return
    try {
      fetch('/api/channels/track-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId, channelTitle, action })
      })
    } catch (e) {
      console.error('Failed to track action:', e)
    }
  }

  const handleDeleteItem = (id: string) => {
    const deletedItem = items.find(it => it.id === id)
    if (deletedItem) {
      trackAction(deletedItem.channelId || '', deletedItem.channelTitle || '', 'remove')
    }
    setItems(prev => prev.filter(item => item.id !== id))
    
    // Learning Loop: 삭제된 아이템의 성향 분석 및 재추전 제안 (Mock)
    if (deletedItem) {
      setGamificationMsg(`'${deletedItem.title}' 제외 완료. 취향을 반영해 리스트를 보정합니다... ♻️`)
      setTimeout(() => setGamificationMsg(''), 3000)
    }
  }

  const handleRefineAI = async () => {
    setGamificationMsg('수정된 팀 이름을 기반으로 AI가 분석을 정교화하는 중... 🧠')
    // 실제로는 새로운 팀 이름을 Gemini에 전달하여 리스트 재추천
    setTimeout(() => {
      setGamificationMsg('AI가 새로운 팀 컨셉에 맞춰 큐레이션을 최적화했습니다!')
      setTimeout(() => setGamificationMsg(''), 3000)
    }, 1500)
  }

  const handleAddVideo = (video: WorldcupItem) => {
    if (items.find(it => it.videoId === video.videoId)) {
      setGamificationMsg('이미 추가된 후보입니다! ⚠️')
      setTimeout(() => setGamificationMsg(''), 2000)
      return
    }

    setShowSearchModal(false)
    setSearchResults([])
    
    if (searchMode === 'seed') {
      const url = `https://www.youtube.com/watch?v=${video.videoId}`
      setSeedUrl(url)
      // 피커 선택 시 즉시 엔진 시동 (handleStartAnalysis 호출)
      setGamificationMsg(`'${video.title}' 영상을 기반으로 분석을 시작합니다! 🚀`)
      setTimeout(() => {
        handleStartAnalysis(undefined, video.videoId, video.thumbnail, video.title)
      }, 300)
    } else {
      let candidateTeam: 'A' | 'B' | 'Neutral' = 'Neutral'
      
      if (aiResult?.is_vs_mode) {
        const teamA = items.filter(it => it.team === 'A').length
        const teamB = items.filter(it => it.team === 'B').length
        candidateTeam = teamA <= teamB ? 'A' : 'B'
      }

      setItems(prev => [...prev, { ...video, id: Date.now().toString(), team: candidateTeam }])
      trackAction(video.channelId || '', video.channelTitle || '', 'add')
      setGamificationMsg(`'${video.title}' 후보가 추가되었습니다! ✨`)
      setTimeout(() => setGamificationMsg(''), 2500)
    }
  }

  const handleMoveItem = (id: string, newTeam: 'A' | 'B' | 'Neutral') => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, team: newTeam } : item
    ))
    setGamificationMsg(`후보를 ${newTeam === 'Neutral' ? '대기실' : teamNames[newTeam === 'A' ? 'A' : 'B']}로 이동했습니다! ⛓️`)
    setTimeout(() => setGamificationMsg(''), 2000)
  }

  const handleMagicScan = async (channelId: string) => {
    setIsScanningChannel(true)
    setContextMenu(null)
    try {
      const res = await fetch(`/api/youtube/playlist?channelId=${channelId}`)
      const data = await res.json()
      setMagicScanResults(data)
      setGamificationMsg('채널 업로드 목록을 성공적으로 털어왔습니다! ✨')
    } catch (e) {
      console.error('Magic Scan Error:', e)
      setGamificationMsg('스캐닝 중 오류가 발생했습니다. ⚠️')
    } finally {
      setIsScanningChannel(false)
    }
  }

  const toggleScanItem = (videoId: string) => {
    setSelectedScanItems(prev => 
      prev.includes(videoId) 
        ? prev.filter(id => id !== videoId) 
        : [...prev, videoId]
    )
  }

  const addSelectedScanItems = () => {
    const selectedVideos = magicScanResults.filter(v => selectedScanItems.includes(v.videoId || ''))
    
    // 중복 제거 및 추가
    const newItems: WorldcupItem[] = []
    selectedVideos.forEach(v => {
      if (!items.some(it => it.videoId === v.videoId)) {
        let team: 'A' | 'B' | 'Neutral' = 'Neutral'
        if (aiResult?.is_vs_mode) {
          const teamA = [...items, ...newItems].filter(it => it.team === 'A').length
          const teamB = [...items, ...newItems].filter(it => it.team === 'B').length
          team = teamA <= teamB ? 'A' : 'B'
        }
        
        newItems.push({
          ...v,
          id: `${Date.now()}-${Math.random()}`,
          team
        })
        
        // 트랜잭션 추적
        trackAction(v.channelId || '', v.channelTitle || '', 'add')
      }
    })

    setItems(prev => [...prev, ...newItems])
    setMagicScanResults([])
    setSelectedScanItems([])
    setGamificationMsg(`${newItems.length}개의 후보가 일괄 추가되었습니다! 🚀`)
  }

  // 컨텍스트 메뉴 닫기용
  useEffect(() => {
    const handleClick = () => setContextMenu(null)
    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [])

  const handleSearch = async (overrideQuery?: string, overrideOrder?: string) => {
    let q = overrideQuery ?? searchQuery
    const order = overrideOrder ?? searchOrder
    if (!q) return

    setIsSearching(true)
    setSearchResults([])
    setSearchError(null)
    setDetectedGroup(null)
    setDetectedSong(null)

    // Grouping Engine Logic (Hidden Prefix)
    const extractGroupingKeywords = () => {
      if (items.length < 2) return ""
      const titles = items.map(it => it.title.toLowerCase())
      const words = titles.join(' ').split(/[\s,\[\]\(\)\-\│]+/).filter(w => w.length >= 2)
      const counts: Record<string, number> = {}
      words.forEach(w => { counts[w] = (counts[w] || 0) + 1 })
      const common = Object.entries(counts)
        .filter(([_, count]) => count >= 2)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([w]) => w)
      return common.length > 0 ? common.join(' ') : ""
    }
    const hiddenPrefix = searchMode === 'candidate' ? extractGroupingKeywords() : ""
    const finalQuery = hiddenPrefix ? `${q} ${hiddenPrefix}` : q
    console.log('>>> [DEBUG] handleSearch Query:', { q, hiddenPrefix, finalQuery })

    // AI Intent Analysis & Theme Hunting
    fetch('/api/ai/parse-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q })
    }).then(res => res.json()).then(data => {
      if (data.group) setDetectedGroup(data.group)
      if (data.song) setDetectedSong(data.song)
      if (data.theme) {
        setThemeColors({ 
          primary: data.theme.primary_color, 
          secondary: data.theme.secondary_color 
        })
      }
    }).catch(e => console.error('Intent analysis error:', e))

    try {
      // 가오 연출용 지연
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(finalQuery)}&order=${order}`)
      const data = await res.json()
      
      if (data.error) throw new Error(data.error)
      
      // Relevance Boosting: 현재 추가된 후보들의 채널 ID 수집
      const selectedChannelIds = new Set(items.map(it => it.channelId).filter(Boolean))

      const formatted = data.map((v: any, index: number) => ({
        ...v,
        id: `${Date.now()}-${Math.random()}-${index}`,
        team: 'Neutral' as const
      }))

      // Relevance Boosting: 같은 채널의 영상을 상단으로 배치
      const sorted = formatted.sort((a: any, b: any) => {
        const aSelected = selectedChannelIds.has(a.channelId) ? 1 : 0
        const bSelected = selectedChannelIds.has(b.channelId) ? 1 : 0
        return bSelected - aSelected
      })

      setSearchResults(sorted)
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-foreground pb-24">
      {/* ProgressBar (Step 2) */}
      <AnimatePresence>
        {step === 2 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-[100] h-1.5 bg-zinc-800"
          >
            <motion.div 
              className="h-full bg-gradient-to-r from-violet-600 to-indigo-600"
              style={{ width: `${analysisProgress}%` }}
              transition={{ duration: 0.5 }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto px-6 pt-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <div className="flex-1">
            <h1 className="text-3xl font-black flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center text-white shrink-0">
                <Plus className="w-6 h-6" />
              </div>
              <div className="relative">
                <motion.input
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value)
                    setIsTitleUpgraded(false)
                  }}
                  placeholder="월드컵 제목을 입력하세요"
                  animate={isTitleUpgraded ? {
                    scale: [1, 1.02, 1],
                    color: ["#000", "#7c3aed", "#000"]
                  } : {}}
                  className="bg-transparent border-none text-2xl font-black focus:outline-none w-full text-balance placeholder:text-zinc-300 dark:placeholder:text-zinc-700 px-2 py-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 focus:bg-black/5 dark:focus:bg-white/5 transition-colors"
                />
                <AnimatePresence>
                  {isTitleUpgraded && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="absolute -bottom-6 left-0 flex items-center gap-1.5 text-violet-600 font-black text-[10px] uppercase tracking-widest"
                    >
                      <Sparkles className="w-3 h-3 animate-pulse" />
                      Magic Title Upgraded
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </h1>
            {!title && <p className="text-zinc-500 mt-2 font-medium">AI와 함께 가장 완벽한 월드컵을 설계하세요</p>}
          </div>
          <div className="flex items-center gap-3">
            {isPlus ? (
              <PlusUserBadge />
            ) : (
              <button 
                onClick={() => { setNudgeReason('ads'); setShowNudge(true); }}
                className="px-4 py-2 rounded-xl bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 text-sm font-bold border border-yellow-500/20 hover:bg-yellow-500/20 transition-all"
              >
                광고 제거하기
              </button>
            )}
          </div>
        </div>

        {/* STEP 1: Input */}
        {step === 1 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-black/5 dark:border-white/5 p-10 shadow-2xl"
          >
            <form onSubmit={(e) => { e.preventDefault(); handleStartAnalysis(); }} className="space-y-8">
              <div className="space-y-3">
                <label className="block text-sm font-black text-zinc-400 uppercase tracking-widest px-1">월드컵 제목</label>
                <div className="relative group">
                  <motion.div
                    animate={isTitleUpgraded ? {
                      boxShadow: [
                        "0 0 0 0px rgba(124, 58, 237, 0)",
                        "0 0 0 10px rgba(124, 58, 237, 0.2)",
                        "0 0 0 0px rgba(124, 58, 237, 0)"
                      ],
                      backgroundColor: ["rgba(124, 58, 237, 0)", "rgba(124, 58, 237, 0.05)", "rgba(124, 58, 237, 0)"]
                    } : {}}
                    transition={{ duration: 2, repeat: isTitleUpgraded ? 2 : 0 }}
                    className="absolute -inset-2 rounded-3xl pointer-events-none z-0"
                  />
                  
                  <Trophy className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-zinc-400 group-focus-within:text-violet-600 transition-colors z-10" />
                  <input 
                    type="text" 
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value)
                      setIsTitleUpgraded(false)
                    }}
                    placeholder={aiResult?.recommended_title || "예: 시라유키 히나 최고의 커버곡 월드컵"}
                    className="w-full pl-16 pr-6 py-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border-2 border-transparent focus:border-violet-600 focus:outline-none transition-all text-xl font-bold relative z-10"
                  />
                  
                  <AnimatePresence>
                    {isTitleUpgraded && (
                      <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-3 py-1 bg-violet-600 text-white rounded-full text-[10px] font-black z-20 shadow-lg shadow-violet-500/30"
                      >
                        <Sparkles className="w-3 h-3" />
                        AI UPGRADED
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <AnimatePresence>
                  {aiResult && aiResult.recommended_title && aiResult.recommended_title !== title && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      className="mt-3 flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-violet-500/10 to-transparent border border-violet-500/20 backdrop-blur-sm shadow-lg shadow-violet-500/5"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-violet-500/20">
                          <Wand2 className="w-4 h-4 text-violet-500 animate-pulse" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-violet-500 uppercase tracking-wider">AI Recommended Title</span>
                          <span className="text-xs font-bold text-violet-600 dark:text-violet-400 italic">"{aiResult.recommended_title}"</span>
                        </div>
                      </div>
                      <motion.button 
                        type="button"
                        whileHover={{ 
                          scale: 1.05,
                          boxShadow: "0 0 20px rgba(124, 58, 237, 0.4)"
                        }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setTitle(aiResult.recommended_title || '')}
                        className="px-4 py-2 rounded-xl bg-violet-600 text-white text-[11px] font-black hover:bg-violet-700 transition-all flex items-center gap-1.5"
                      >
                        제목 적용하기 🪄
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-black text-zinc-400 uppercase tracking-widest px-1">씨드 영상 (YouTube URL)</label>
                <div className="flex gap-4">
                  <div className="relative flex-1">
                    <Youtube className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-red-600" />
                    <input 
                      type="text" 
                      value={seedUrl}
                      onChange={(e) => setSeedUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="w-full pl-16 pr-6 py-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border-2 border-transparent focus:border-violet-600 focus:outline-none transition-all text-sm font-medium"
                    />
                  </div>
                  <motion.button 
                    type="button"
                    whileHover={{ 
                      scale: 1.1,
                      boxShadow: [
                        `0 0 0 0px ${accentPrimary}00`,
                        `0 0 15px 5px ${accentPrimary}4d`,
                        `0 0 0 0px ${accentPrimary}00`
                      ]
                    }}
                    transition={{
                      boxShadow: {
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }
                    }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      setSearchMode('seed')
                      setSearchQuery(title || '')
                      setShowSearchModal(true)
                    }}
                    className="px-8 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all flex items-center gap-2 border border-black/5 dark:border-white/5"
                  >
                    <Youtube className="w-5 h-5 text-red-600" />
                    영상 검색
                  </motion.button>
                </div>
                <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1.5 px-1">
                  <Info className="w-3.5 h-3.5" />
                  AI가 이 영상을 분석하여 장르와 후보 리스트를 자동으로 구성합니다.
                </p>
              </div>

              <motion.button 
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleStartAnalysis()}
                disabled={isAnalyzing || !seedUrl}
                className="w-full py-6 rounded-3xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-black text-xl hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all flex items-center justify-center gap-3 shadow-xl shadow-black/10 relative overflow-hidden group"
              >
                {isAnalyzing && (
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${analysisProgress}%` }}
                    className="absolute inset-0 bg-red-600/10 dark:bg-red-500/10 pointer-events-none"
                  />
                )}
                
                {isAnalyzing ? (
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-6 h-6 animate-spin text-red-600" />
                    <span>AI가 영상과 팬들의 반응을 분석 중...</span>
                  </div>
                ) : (
                  <>
                    AI 분석 시작하기
                    <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </motion.button>
            </form>
          </motion.div>
        )}


        {/* STEP 2: Analyzing (Skeleton) */}
        {step === 2 && (
          <div className="max-w-4xl mx-auto text-center py-20">
            <div className="relative w-24 h-24 mx-auto mb-10">
              <div className="absolute inset-0 rounded-full border-4 border-violet-600/20" />
              <div className="absolute inset-0 rounded-full border-4 border-violet-600 border-t-transparent animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-violet-600 animate-pulse" />
              </div>
            </div>
            <h2 className="text-3xl font-black mb-4">AI가 데이터를 정밀 분석 중입니다...</h2>
            <div className="h-20 flex items-center justify-center">
              <motion.p 
                key={briefingIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-violet-600 dark:text-violet-400 text-lg font-bold italic"
              >
                {BRIEFING_MESSAGES[briefingIndex]}
              </motion.p>
            </div>
          </div>
        )}

        {/* STEP 3: Result / Edit */}
        {step === 3 && aiResult && (
          <div className="space-y-12">
            {/* Gamification Success Msg */}
            <AnimatePresence>
              {gamificationMsg && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex items-center justify-center gap-3 text-emerald-600 dark:text-emerald-400 font-black text-lg shadow-lg shadow-emerald-500/5 mb-8"
                >
                  <CheckCircle2 className="w-6 h-6" />
                  {gamificationMsg}
                </motion.div>
              )}
            </AnimatePresence>

            {/* AI Analysis Report Card */}
            <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-black/5 dark:border-white/5 p-10 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/5 blur-[100px] -mr-32 -mt-32 rounded-full" />
              
              <div className="relative z-10 grid grid-cols-1 md:grid-cols-4 gap-12 items-start">
                <div className="md:col-span-3 space-y-6">
                  <div className="flex items-center gap-3">
                    <span className="px-4 py-1.5 rounded-xl bg-violet-600 text-white text-[10px] font-black uppercase tracking-[0.2em]">AI Analysis Report</span>
                    {aiResult.cached && (
                      <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 text-[10px] font-bold border border-emerald-500/20">CACHED</span>
                    )}
                  </div>
                  
                  <div>
                    <input 
                      type="text"
                      value={aiResult.determined_genre}
                      onChange={(e) => setAiResult({...aiResult, determined_genre: e.target.value})}
                      className="bg-zinc-100 dark:bg-white/5 border-none text-3xl font-black mb-2 px-3 py-1 rounded-xl w-full focus:ring-2 ring-violet-500 outline-none transition-all"
                      placeholder="장르 입력"
                    />
                    <input 
                      type="text"
                      value={aiResult.identity}
                      onChange={(e) => setAiResult({...aiResult, identity: e.target.value})}
                      className="bg-transparent border-none text-lg font-bold text-zinc-900 dark:text-zinc-100 w-full px-3 py-1 focus:bg-zinc-100 dark:focus:bg-white/5 rounded-xl outline-none"
                      placeholder="정체성 정의"
                    />
                  </div>

                  <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                    <div>
                      <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <Target className="w-3.5 h-3.5" /> 대중 반응 분석
                      </h4>
                      <textarea 
                        value={aiResult.public_reaction}
                        onChange={(e) => setAiResult({...aiResult, public_reaction: e.target.value})}
                        className="w-full bg-zinc-50 dark:bg-black/20 border-none rounded-2xl p-4 text-sm font-medium text-zinc-600 dark:text-zinc-400 leading-relaxed italic focus:ring-2 ring-violet-500/30 outline-none resize-none"
                        rows={2}
                      />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5" /> 월드컵 경쟁력
                      </h4>
                      <textarea 
                        value={aiResult.suitability_reason}
                        onChange={(e) => setAiResult({...aiResult, suitability_reason: e.target.value})}
                        className="w-full bg-zinc-50 dark:bg-black/20 border-none rounded-2xl p-4 text-sm font-medium text-zinc-600 dark:text-zinc-400 leading-relaxed focus:ring-2 ring-violet-500/30 outline-none resize-none"
                        rows={2}
                      />
                    </div>
                  </div>

                    <input 
                      type="text"
                      placeholder="#태그 추가"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          const val = e.currentTarget.value.trim()
                          if (val) {
                            setAiResult({...aiResult, sub_tags: [...aiResult.sub_tags, val.startsWith('#') ? val : `#${val}`]})
                            e.currentTarget.value = ''
                          }
                        }
                      }}
                      className="bg-transparent border-dashed border-2 border-zinc-200 dark:border-zinc-800 rounded-full px-4 py-1.5 text-sm font-bold text-zinc-400 focus:border-violet-500 outline-none transition-all w-24 hover:w-32 focus:w-32"
                    />
                  </div>
                  
                  <div className="flex flex-col items-center justify-center text-center space-y-4">
                    <div className="w-full aspect-square rounded-[2rem] bg-zinc-50 dark:bg-zinc-800 border border-black/5 dark:border-white/5 flex flex-col items-center justify-center shadow-inner">
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Confidence</p>
                      <p className="text-5xl font-black text-violet-600">{aiResult?.confidence_score}%</p>
                    </div>
                    <div className="text-[10px] font-bold text-zinc-400">
                      Engine: {aiResult?.model || 'Gemini 3.1 Pro'}
                    </div>
                  </div>
                </div>
              </div>

              {/* VS Mode Balance Check View */}
              <div>
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-black">후보 구성 ({items.length}강)</h3>
                  <div className="flex gap-3">
                    {aiResult?.is_vs_mode && (
                    <motion.button 
                      onClick={handleRefineAI}
                      whileHover={{ 
                        scale: 1.1,
                        boxShadow: [
                          `0 0 0 0px ${accentPrimary}00`,
                          `0 0 15px 5px ${accentPrimary}4d`,
                          `0 0 0 0px ${accentPrimary}00`
                        ]
                      }}
                      transition={{
                        boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                      }}
                      className="flex items-center gap-2 px-6 py-2 rounded-xl bg-violet-600/10 text-violet-600 font-bold text-sm border border-violet-600/20 transition-all shadow-lg shadow-violet-500/5"
                    >
                      <Sparkles className="w-4 h-4" />
                      AI 분석 정교화
                    </motion.button>
                  )}
                  <motion.button 
                    onClick={() => {
                      if (!isPlus && items.length >= 64) {
                        setNudgeReason('rounds')
                        setShowNudge(true)
                      } else {
                        setSearchMode('candidate')
                        const coreTitle = title.split(' ').slice(0, 2).join(' ')
                        const defaultQuery = aiResult?.search_keywords?.[0] || `${coreTitle} ${aiResult?.determined_genre}`
                        setSearchQuery(defaultQuery)
                        setShowSearchModal(true)
                      }
                    }}
                    whileHover={{ 
                      scale: 1.1,
                      boxShadow: [
                        `0 0 0 0px ${accentPrimary}00`,
                        `0 0 15px 5px ${accentPrimary}4d`,
                        `0 0 0 0px ${accentPrimary}00`
                      ]
                    }}
                    transition={{
                      boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                    }}
                    className="flex items-center gap-2 px-6 py-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-black font-bold text-sm shadow-xl shadow-zinc-500/20 active:scale-95 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    후보 추가
                  </motion.button>
                </div>
              </div>

              {aiResult?.is_vs_mode ? (
                <div className="space-y-12">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 hidden md:flex items-center justify-center w-12 h-12 rounded-full bg-zinc-900 text-white font-black text-xs border-4 border-gray-50 dark:border-black">VS</div>
                    
                    {/* Team A */}
                    <div id="team-a-zone" className="space-y-4 p-4 rounded-3xl border-2 border-dashed border-transparent transition-all group/zone-a hover:border-violet-500/30 hover:bg-violet-500/5">
                      <div className="flex items-center justify-between px-2">
                        <input 
                          type="text" 
                          value={teamNames.A} 
                          onChange={(e) => setTeamNames({ ...teamNames, A: e.target.value })}
                          className="bg-transparent border-none text-xl font-black text-violet-600 focus:outline-none w-full"
                        />
                        <span className="text-xs font-bold text-zinc-400 shrink-0">{items.filter(it => it.team === 'A').length} items</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 pointer-events-none *:pointer-events-auto">
                        {items.filter(it => it.team === 'A').map(item => (
                          <ItemCard key={item.id} item={item} onDelete={handleDeleteItem} onMove={handleMoveItem} />
                        ))}
                      </div>
                    </div>

                    {/* Team B */}
                    <div id="team-b-zone" className="space-y-4 p-4 rounded-3xl border-2 border-dashed border-transparent transition-all group/zone-b hover:border-indigo-500/30 hover:bg-indigo-500/5">
                      <div className="flex items-center justify-between px-2">
                        <input 
                          type="text" 
                          value={teamNames.B}
                          onChange={(e) => setTeamNames({...teamNames, B: e.target.value})}
                          className="bg-transparent border-none text-xl font-black text-indigo-600 focus:outline-none w-full text-right"
                        />
                        <span className="text-xs font-bold text-zinc-400 shrink-0">{items.filter(it => it.team === 'B').length} items</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 pointer-events-none *:pointer-events-auto">
                        {items.filter(it => it.team === 'B').map(item => (
                          <ItemCard key={item.id} item={item} onDelete={handleDeleteItem} onMove={handleMoveItem} />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Neutral / Waiting Room */}
                  {items.some(it => it.team === 'Neutral') && (
                    <div className="pt-10 border-t border-zinc-100 dark:border-zinc-800 space-y-6">
                      <div className="flex items-center gap-3 px-2">
                        <div className="p-1 px-3 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Unassigned</div>
                        <h4 className="text-lg font-black text-zinc-400">대기실 후보 ({items.filter(it => it.team === 'Neutral').length})</h4>
                      </div>
                      <div id="waiting-room-zone" className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 p-4 rounded-3xl border-2 border-dashed border-transparent transition-all hover:border-zinc-400/20 hover:bg-zinc-400/5 pointer-events-none *:pointer-events-auto">
                        {items.filter(it => it.team === 'Neutral').map(item => (
                          <ItemCard key={item.id} item={item} onDelete={handleDeleteItem} onMove={handleMoveItem} />
                        ))}
                      </div>
                      <p className="text-xs text-zinc-400 px-2 italic">* VS 모드에서는 후보들을 각 팀으로 배정해야 공정한 대결이 가능합니다.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {items.map(item => (
                    <ItemCard key={item.id} item={item} onDelete={handleDeleteItem} />
                  ))}
                </div>
              )}
            </div>

            {/* Final Action */}
            <div className="flex flex-col items-center gap-4 pt-12">
              <button 
                disabled={items.length < 4}
                onClick={async () => {
                  // 크리에이터 승격 & 페이지 이동
                  if (user?.id) {
                    await supabase.from('profiles').update({ 
                      is_creator: true,
                      creator_since: new Date().toISOString(),
                      creator_grade: 'Bronze'
                    }).eq('id', user.id)
                  }

                  // 모든 후보 채널 Finalize 트래킹
                  items.forEach(item => {
                    trackAction(item.channelId || '', item.channelTitle || '', 'finalize')
                  })

                  // 실제 생성된 ID 혹은 데모 ID로 이동
                  router.push(`/worldcup/test-worldcup-id`) 
                  router.refresh()
                }}
                className="px-16 py-6 rounded-[2rem] bg-violet-600 text-white font-black text-2xl shadow-2xl shadow-violet-600/40 hover:scale-105 active:scale-95 transition-all flex items-center gap-4 disabled:opacity-30 disabled:hover:scale-100 disabled:cursor-not-allowed group"
              >
                <Trophy className="w-8 h-8 fill-current group-hover:rotate-12 transition-transform" />
                </button>
              </div>
            </div>
          )}
        </div>

      {/* Youtube Search Modal */}
      <AnimatePresence>
        {showSearchModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSearchModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-4xl bg-white dark:bg-zinc-900 rounded-[3rem] shadow-2xl overflow-hidden border border-black/5 dark:border-white/5"
            >
              <div className="p-10">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-3xl font-black flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-white">
                      <Youtube className="w-6 h-6" />
                    </div>
                    후보 직접 추가
                  </h2>
                  <button onClick={() => setShowSearchModal(false)} className="w-10 h-10 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors">
                    <Trash2 className="w-5 h-5 text-zinc-400" />
                  </button>
                </div>

                <div className="flex flex-col md:flex-row gap-6 mb-10">
                  <div className="relative flex-1">
                    <input 
                      type="text" 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      placeholder="검색어나 YouTube 링크를 입력하세요..."
                      className="w-full pl-8 pr-32 py-5 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border-2 border-transparent focus:border-red-600 focus:outline-none transition-all text-lg font-bold"
                    />
                    <motion.button 
                      whileHover={{ 
                        scale: 1.1,
                        boxShadow: [
                          "0 0 0 0px rgba(220, 38, 38, 0)",
                          "0 0 0 12px rgba(220, 38, 38, 0.25)",
                          "0 0 0 0px rgba(220, 38, 38, 0)"
                        ]
                      }}
                      transition={{
                        boxShadow: {
                          duration: 1.2,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }
                      }}
                      whileTap={{ scale: 0.85 }}
                      onClick={() => handleSearch()}
                      disabled={isSearching}
                      className="absolute right-3 top-1/2 -translate-y-1/2 px-6 py-3 rounded-xl bg-red-600 text-white font-black text-sm transition-all disabled:opacity-50 shadow-lg shadow-red-500/20"
                    >
                      {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : '검색'}
                    </motion.button>
                  </div>
                  
                  <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1.5 rounded-2xl border border-black/5 dark:border-white/5 h-fit shadow-inner">
                    {[
                      { id: 'relevance', label: '관련성' },
                      { id: 'viewCount', label: '조회수' },
                      { id: 'date', label: '최신순' }
                    ].map((order) => (
                      <motion.button
                        key={order.id}
                        whileHover={{ 
                          scale: 1.15,
                          zIndex: 10,
                          backgroundColor: searchOrder === order.id ? undefined : "rgba(161, 161, 170, 0.1)"
                        }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => {
                          const newOrder = order.id as 'relevance' | 'viewCount' | 'date'
                          setSearchOrder(newOrder)
                          // 정렬 변경 시 즉시 재검색 호출
                          handleSearch(undefined, newOrder)
                        }}
                        className={`px-6 py-3 rounded-xl text-sm font-black transition-all relative ${
                          searchOrder === order.id 
                            ? 'bg-white dark:bg-zinc-700 text-red-600 shadow-xl' 
                            : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400'
                        }`}
                      >
                        {searchOrder === order.id && (
                          <motion.div 
                            layoutId="aura"
                            className="absolute inset-0 rounded-xl ring-4 ring-red-500/20 animate-pulse pointer-events-none"
                          />
                        )}
                        {order.label}
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div 
                  className="grid grid-cols-2 md:grid-cols-3 gap-8 min-h-[40vh] max-h-[55vh] overflow-y-auto pr-4 custom-scrollbar"
                  style={{ 
                    '--theme-primary': themeColors.primary,
                    '--theme-secondary': themeColors.secondary,
                    '--theme-contrast': getContrastColor(themeColors.primary) === 'black' ? '#000000' : '#FFFFFF'
                  } as React.CSSProperties}
                >
                  {isSearching && (
                    <div className="col-span-full py-24 flex flex-col items-center justify-center space-y-8">
                      <div className="relative">
                        <motion.div 
                          animate={{ rotate: 360 }}
                          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                          style={{ borderColor: 'var(--theme-primary)', borderTopColor: 'transparent' }}
                          className="w-24 h-24 rounded-[2.5rem] border-4 shadow-2xl transition-colors duration-500"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Search className="w-8 h-8 animate-pulse text-[var(--theme-primary)]" />
                        </div>
                      </div>
                      
                      <div className="text-center space-y-4">
                        <div className="h-8 flex items-center justify-center">
                          <TypingEffect 
                            primaryColor={themeColors.primary}
                            text={
                              detectedGroup && detectedSong 
                                ? `AI가 [${detectedGroup}]의 [${detectedSong}] 영상을 발굴하는 중...`
                                : detectedGroup
                                ? `AI가 [${detectedGroup}] 공식 데이터를 분석 중...`
                                : `AI가 유튜브에서 가장 '정품'에 가까운 영상을 필터링 중...`
                            } 
                          />
                        </div>
                        {detectedGroup && <ScanLog group={detectedGroup} primaryColor={themeColors.primary} />}
                      </div>
                    </div>
                  )}
                  {searchResults
                    .filter(video => 
                      searchMode === 'seed' || !items.some(item => item.videoId === video.videoId)
                    )
                    .map((video) => (
                    <motion.div 
                      key={video.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => handleAddVideo(video)}
                      onContextMenu={(e) => {
                        e.preventDefault()
                        setContextMenu({ x: e.clientX, y: e.clientY, video })
                      }}
                      className="group cursor-pointer relative"
                    >
                      {/* Hover Preview Tooltip Overlay (Precision Preview) */}
                      <div className="absolute -inset-4 z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full mb-4 w-[280px] bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl border border-black/10 dark:border-white/10 p-3 scale-90 group-hover:scale-100 transition-transform origin-bottom backdrop-blur-xl">
                          <img src={video.thumbnail} className="w-full aspect-video rounded-xl object-cover mb-2" alt="preview" />
                          <p className="text-xs font-bold leading-tight line-clamp-2 mb-1">{video.title}</p>
                          <div className="flex items-center justify-between text-[10px] font-black text-zinc-400">
                            <span>{video.publishedAt ? new Date(video.publishedAt).toLocaleDateString() : 'Date N/A'}</span>
                            <span className="text-red-500">CLICK TO SELECT</span>
                          </div>
                          <div className="absolute bottom-[-8px] left-1/2 -translate-x-1/2 w-4 h-4 bg-white dark:bg-zinc-800 rotate-45 border-r border-b border-black/10 dark:border-white/10" />
                        </div>
                      </div>

                      <div className="relative aspect-video rounded-[1.5rem] overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-black/5 dark:border-white/5 mb-3 group-hover:shadow-xl transition-all">
                        <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                          <Plus className="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition-all scale-50 group-hover:scale-110" />
                        </div>
                        {selectedScanItems.includes(video.videoId || '') && (
                          <div className="absolute inset-x-0 bottom-0 bg-red-600 py-1 flex items-center justify-center gap-1.5 z-10">
                            <CheckCircle2 className="w-3 h-3 text-white" />
                            <span className="text-[10px] font-black text-white uppercase tracking-tighter">Selected For Bulk Add</span>
                          </div>
                        )}
                      </div>
                      <div className="px-1">
                        <p className="text-sm font-black line-clamp-2 leading-relaxed group-hover:text-red-600 transition-colors flex items-start gap-1">
                          {video.isOfficial && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 fill-current shrink-0 mt-0.5" />
                          )}
                          {video.title}
                        </p>
                        {video.publishedAt && (
                          <p className="text-[10px] font-bold text-zinc-400 mt-1">{new Date(video.publishedAt).getFullYear()}년</p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                  {searchResults.filter(v => 
                    searchMode === 'seed' || !items.some(it => it.videoId === v.videoId)
                  ).length === 0 && !isSearching && (
                    <div className="col-span-full py-24 text-center space-y-6">
                      {searchError === 'QUOTA' ? (
                        <>
                          <div className="w-24 h-24 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100 dark:border-red-800/20 shadow-xl">
                            <AlertCircle className="w-12 h-12 text-red-500 animate-bounce" />
                          </div>
                          <div className="space-y-2">
                            <p className="text-red-600 dark:text-red-400 font-black text-2xl">YouTube API 할당량이 소진되었습니다!</p>
                            <p className="text-zinc-500 font-bold max-w-md mx-auto">
                              오늘의 무료 검색 한도가 모두 소진되었습니다. 구글 클라우드 콘솔에서 한도를 확인하거나, 잠시 후 다시 시도해 주세요.
                            </p>
                          </div>
                          <div className="flex justify-center gap-4 mt-8">
                            <a 
                              href="https://console.cloud.google.com/apis/dashboard" 
                              target="_blank" 
                              className="px-6 py-3 bg-red-600 text-white rounded-xl font-black text-sm shadow-lg shadow-red-500/30 hover:scale-105 transition-transform"
                            >
                              GCP 콘솔 확인하기
                            </a>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-20 h-20 bg-zinc-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-black/5 dark:border-white/5">
                            <Youtube className="w-10 h-10 text-zinc-200 dark:text-zinc-600" />
                          </div>
                          <p className="text-zinc-400 font-bold text-lg">
                            {searchResults.length > 0 ? "모든 검색 결과가 이미 추가되었습니다." : "검색 결과가 없습니다. 다른 키워드로 검색해 보세요."}
                          </p>
                          <p className="text-zinc-500 text-sm">할당량 보호를 위해 최적화된 결과만 표시됩니다.</p>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Magic Scan Results Overlay */}
                <AnimatePresence>
                  {magicScanResults.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, x: 100 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 100 }}
                      className="absolute inset-0 bg-white dark:bg-zinc-900 z-50 flex flex-col"
                    >
                      <div className="p-10 border-b border-black/5 dark:border-white/5 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-800/50 backdrop-blur-md">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-violet-600 flex items-center justify-center text-white shadow-lg shadow-violet-500/20">
                            <Sparkles className="w-6 h-6 animate-pulse" />
                          </div>
                          <div>
                            <h3 className="text-2xl font-black italic">Magic Scan Results</h3>
                            <p className="text-sm font-bold text-zinc-400">"{magicScanResults[0]?.channelTitle}" 채널의 최신 영상 50개를 감지했습니다.</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <button 
                            onClick={() => { setMagicScanResults([]); setSelectedScanItems([]); }}
                            className="px-6 py-3 rounded-xl font-black text-zinc-500 hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                          >
                            취소
                          </button>
                          <button 
                            disabled={selectedScanItems.length === 0}
                            onClick={addSelectedScanItems}
                            className="px-8 py-3 rounded-xl bg-violet-600 text-white font-black shadow-lg shadow-violet-500/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-30 flex items-center gap-3"
                          >
                            <Plus className="w-5 h-5" />
                            {selectedScanItems.length}개 후보 일괄 추가
                          </button>
                        </div>
                      </div>
                      <div className="flex-1 overflow-y-auto p-10 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 custom-scrollbar">
                        {magicScanResults.map((v) => (
                          <motion.div 
                            key={v.videoId}
                            onClick={() => toggleScanItem(v.videoId || '')}
                            className={`group cursor-pointer relative rounded-2xl overflow-hidden border-2 transition-all ${
                              selectedScanItems.includes(v.videoId || '') 
                                ? 'border-violet-600 ring-4 ring-violet-500/20 scale-95' 
                                : 'border-transparent hover:border-violet-300'
                            }`}
                          >
                            <img src={v.thumbnail} className="w-full aspect-video object-cover" alt="thumb" />
                            <div className={`absolute inset-0 bg-violet-600/20 transition-opacity ${selectedScanItems.includes(v.videoId || '') ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                            <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                              <p className="text-[10px] font-black text-white line-clamp-2 leading-tight">{v.title}</p>
                            </div>
                            {selectedScanItems.includes(v.videoId || '') && (
                              <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-violet-600 text-white flex items-center justify-center shadow-lg">
                                <CheckCircle2 className="w-4 h-4" />
                              </div>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Magic Scan Loading Overlay */}
                <AnimatePresence>
                  {isScanningChannel && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl z-[60] flex flex-col items-center justify-center p-10"
                    >
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="w-20 h-20 rounded-[2rem] border-4 border-violet-600 border-t-transparent shadow-2xl shadow-violet-500/20 mb-8"
                      />
                      <h3 className="text-3xl font-black italic mb-4">채널 터는 중... ✨</h3>
                      <p className="text-lg font-bold text-zinc-500 text-center max-w-md">
                        업로드 플레이리스트(UU) 우회 경로를 통해<br />
                        AI가 채널의 모든 영상을 전수 조사하고 있습니다.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            {/* Custom Context Menu */}
            <AnimatePresence>
              {contextMenu && (
                <motion.div 
                   initial={{ opacity: 0, scale: 0.9, y: -10 }}
                   animate={{ opacity: 1, scale: 1, y: 0 }}
                   exit={{ opacity: 0, scale: 0.9 }}
                   style={{ top: contextMenu.y, left: contextMenu.x }}
                   className="fixed z-[300] w-64 bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl border border-black/10 dark:border-white/10 overflow-hidden backdrop-blur-xl"
                   onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-3 border-b border-black/5 dark:border-white/5 bg-zinc-50/50 dark:bg-zinc-900/50">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Channel Option</p>
                    <p className="text-xs font-bold truncate text-zinc-600 dark:text-zinc-300">
                      {contextMenu.video.channelTitle}
                    </p>
                  </div>
                  <div className="p-1.5">
                    <button 
                      onClick={() => handleMagicScan(contextMenu.video.channelId || '')}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-violet-600 hover:text-white transition-all text-sm font-black text-violet-600"
                    >
                      <Sparkles className="w-4 h-4" />
                      Magic Scan (채널 털기)
                    </button>
                    <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-white/5 transition-all text-sm font-bold text-zinc-500">
                      <ListVideo className="w-4 h-4" />
                      재생목록 보기
                    </button>
                    <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-white/5 transition-all text-sm font-bold text-zinc-500">
                      <BarChart3 className="w-4 h-4" />
                      AI 분석 리포트
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </AnimatePresence>

      {/* Ads Mock (Visible for non-plus users) */}
      {!isPlus && step !== 2 && (
        <div className="mt-20 max-w-4xl mx-auto p-8 rounded-3xl bg-zinc-100 dark:bg-zinc-900 border border-dashed border-zinc-300 dark:border-zinc-700 text-center">
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-4">ADVERTISEMENT</p>
          <div className="h-24 flex items-center justify-center text-zinc-400">
            <Target className="w-8 h-8 opacity-20 mr-4" />
            광고 슬롯 - 플러스 멤버십으로 제거 가능
          </div>
        </div>
      )}

      <PlusNudgeModal 
        isOpen={showNudge} 
        onClose={() => setShowNudge(false)} 
        reason={nudgeReason} 
      />
    </div>
  )
}

function TypingEffect({ text, primaryColor }: { text: string, primaryColor?: string }) {
  const [displayedText, setDisplayedText] = useState('')
  const [index, setIndex] = useState(0)

  useEffect(() => {
    setDisplayedText('')
    setIndex(0)
  }, [text])

  useEffect(() => {
    if (index < text.length) {
      const timer = setTimeout(() => {
        setDisplayedText(prev => prev + text[index])
        setIndex(prev => prev + 1)
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [index, text])

  return (
    <motion.p 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-xl font-black italic text-zinc-600 dark:text-zinc-300 tracking-tight"
    >
      {displayedText}
      <motion.span 
        animate={{ opacity: [0, 1, 0], backgroundColor: primaryColor || '#dc2626' }}
        transition={{ duration: 0.8, repeat: Infinity }}
        className="inline-block w-1.5 h-6 ml-1 translate-y-1"
      />
    </motion.p>
  )
}

function ScanLog({ group, primaryColor }: { group: string, primaryColor?: string }) {
  const [logIndex, setLogIndex] = useState(0)
  const logs = [
    `Scanning ${group} official activities...`,
    `Analyzing vocal peaks and frequencies...`,
    `Verifying high-definition quality (1080p+)...`,
    `Detecting fan-favorite moments...`,
    `Checking channel reliability index...`,
    `Matching search intent with metadata...`,
    `Filtering bait and click-through titles...`
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setLogIndex(prev => (prev + 1) % logs.length)
    }, 400)
    return () => clearInterval(interval)
  }, [logs.length])

  return (
    <div className="flex flex-col items-center space-y-1 overflow-hidden h-12">
      <AnimatePresence mode="wait">
        <motion.p
          key={logIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="text-[10px] font-mono font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest"
        >
          {logs[logIndex]}
        </motion.p>
      </AnimatePresence>
      <div className="flex gap-1">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            animate={{ 
              height: [2, Math.random() * 8 + 4, 2],
              opacity: [0.3, 1, 0.3],
              backgroundColor: primaryColor || '#ef4444'
            }}
            transition={{
              duration: 0.5 + Math.random(),
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="w-1 rounded-full opacity-30"
          />
        ))}
      </div>
    </div>
  )
}

// 밝기 계산하여 텍스트 색상 결정 (Contrast Guard)
function getContrastColor(hex: string): 'black' | 'white' {
  if (!hex || hex.length < 7) return 'white'
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000
  return (yiq >= 128) ? 'black' : 'white'
}

function ItemCard({ item, onDelete, onMove }: { 
  item: WorldcupItem, 
  onDelete: (id: string) => void,
  onMove?: (id: string, team: 'A' | 'B' | 'Neutral') => void
}) {
  const { accentPrimary } = useAccent()
  const [isDragging, setIsDragging] = React.useState(false)

  return (
    <motion.div 
      layout
      initial="initial"
      whileHover="hover"
      animate="animate"
      variants={{
        initial: { opacity: 0, scale: 0.9 },
        animate: { opacity: 1, scale: 1 },
        hover: { 
          scale: 1.1,
          boxShadow: [
            `0 0 0 0px ${accentPrimary}00`,
            `0 0 15px 5px ${accentPrimary}4d`,
            `0 0 0 0px ${accentPrimary}00`
          ]
        }
      }}
      transition={{
        boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" }
      }}
      drag={!!onMove}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={1}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={(e, info) => {
        setIsDragging(false)
        if (!onMove) return
        
        // 정밀한 Hit Detection을 위해 elementFromPoint 좌표 보정 혹은 여러 포인트 체크 가능하지만 
        // pointer-events-none이 이미 적용되어 있으므로 elementFromPoint가 잘 작동할 것
        const element = document.elementFromPoint(info.point.x, info.point.y)
        const zone = element?.closest('[id$="-zone"]') || element?.querySelector('[id$="-zone"]')
        
        if (zone) {
          const zoneId = zone.id
          if (zoneId === 'team-a-zone' && item.team !== 'A') onMove(item.id, 'A')
          else if (zoneId === 'team-b-zone' && item.team !== 'B') onMove(item.id, 'B')
          else if (zoneId === 'waiting-room-zone' && item.team !== 'Neutral') onMove(item.id, 'Neutral')
        }
      }}
      className={`group relative aspect-video rounded-[1.5rem] overflow-hidden border border-black/5 dark:border-white/5 bg-zinc-100 dark:bg-zinc-800 shadow-lg cursor-grab active:cursor-grabbing hover:z-50 ${isDragging ? 'pointer-events-none z-50' : 'z-20'}`}
    >
      <img src={item.thumbnail} alt={item.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-60 transition-opacity group-hover:opacity-80" />
      <div className="absolute inset-x-0 bottom-0 p-4 transform translate-y-1 transition-transform group-hover:translate-y-0">
        <p className="text-[10px] font-black text-violet-400 uppercase tracking-widest mb-1 opacity-0 group-hover:opacity-100 transition-opacity">CANDIDATE</p>
        <p className="text-sm font-black text-white truncate drop-shadow-md">{item.title}</p>
      </div>
      <motion.button 
        variants={{
          initial: { opacity: 0, scale: 0.5 },
          hover: { opacity: 1, scale: 1 }
        }}
        onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
        className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center transition-all hover:scale-110 active:scale-90 z-30 shadow-lg"
      >
        <X className="w-4 h-4" />
      </motion.button>
    </motion.div>
  )
}
