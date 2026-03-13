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
import { extractVideoId, extractPlaylistId } from '@/utils/youtube-helpers'
import { useAuth } from '@/components/AuthProvider'
import { useAccent } from '@/components/ThemeProvider'
import PremiumUserBadge from '@/components/PremiumUserBadge'
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
  recommended_titles?: string[]
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
  isBye?: boolean
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
  const { user, profile, refreshProfile } = useAuth()
  const { accentPrimary, accentText, accentBackground } = useAccent()
  const supabase = createClient()
  const isPlus = profile?.is_plus_subscriber ?? false

  const [step, setStep] = useState(1) // 1: Input, 2: Analyzing, 3: Edit
  const [title, setTitle] = useState('')
  const [seedUrl, setSeedUrl] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [isTitleUpgraded, setIsTitleUpgraded] = useState(false)

  // 1. 월드컵 기본 정보 (주인님이 말씀하신 썸네일, 제목 등)
  const [worldcupData, setWorldcupData] = useState({
    title: "",
    description: "",
    thumbnail_url: "", // 여기서 선택된 썸네일 주소가 저장됩니다.
    is_public: true,
  });

  // 2. 주인님이 작성하신 AI 분석 결과 (방금 그 코드!)
  const [aiResult, setAiResult] = useState<AIResult>({
    determined_genre: "",
    sub_tags: [],
    identity: "",
    public_reaction: "",
    suitability_reason: "",
    word_cloud: [],
    is_vs_mode: true,
    search_keywords: [],
    confidence_score: 0,
    recommended_titles: []
  });

  // 3. 댓글 상태 (새로 추가할 기능)
  const [comments, setComments] = useState([]);
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

  const [searchError, setSearchError] = useState<string | null>(null)

  // Playlist States
  const [playlistItems, setPlaylistItems] = useState<WorldcupItem[]>([])
  const [showPlaylistModal, setShowPlaylistModal] = useState(false)
  const [selectedPlaylistItems, setSelectedPlaylistItems] = useState<string[]>([])
  const [isFetchingPlaylist, setIsFetchingPlaylist] = useState(false)

  // Magic Scan States
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, video: WorldcupItem } | null>(null)
  const [teamContextMenu, setTeamContextMenu] = useState<{ x: number, y: number, item: WorldcupItem } | null>(null)
  const [magicScanResults, setMagicScanResults] = useState<WorldcupItem[]>([])
  const [isScanningChannel, setIsScanningChannel] = useState(false)
  const [selectedScanItems, setSelectedScanItems] = useState<string[]>([])

  // persistence
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [detectedGroup, setDetectedGroup] = useState<string | null>(null)
  const [detectedSong, setDetectedSong] = useState<string | null>(null)
  const [themeColors, setThemeColors] = useState({ primary: '#ef4444', secondary: '#ef4444' })

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

  // [추가] 제목 동기화 Enforcement (상태 업데이트 누락 방지)
  useEffect(() => {
    if (step === 3 && aiResult?.recommended_titles && aiResult.recommended_titles.length > 0) {
      const suggestedTitle = aiResult.recommended_titles[0];
      if (title !== suggestedTitle && suggestedTitle !== '제목 없음' && !isTitleUpgraded) {
        setTitle(suggestedTitle);
        setIsTitleUpgraded(true);
        setTimeout(() => setIsTitleUpgraded(false), 3000);
      }
    }
  }, [aiResult, step]);

  // [Draft] localStorage 실시간 저장
  useEffect(() => {
    if (step >= 2 && items.length > 0) {
      const draft = {
        title,
        items,
        aiResult,
        teamNames,
        worldcupData,
        step
      };
      localStorage.setItem('worldcuvi-creation-draft', JSON.stringify(draft));
    }
  }, [title, items, aiResult, teamNames, worldcupData, step]);

  // [Draft] 마운트 시 저장본 확인
  useEffect(() => {
    const saved = localStorage.getItem('worldcuvi-creation-draft');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.items?.length > 0 && step === 1) {
          setHasDraft(true);
          setShowRestoreModal(true);
        }
      } catch (e) {
        console.error('Draft load failed:', e);
      }
    }
  }, []);

  const restoreDraft = () => {
    const saved = localStorage.getItem('worldcuvi-creation-draft');
    if (saved) {
      const parsed = JSON.parse(saved);
      setTitle(parsed.title || '');
      setItems(parsed.items || []);
      setAiResult(parsed.aiResult || null);
      setTeamNames(parsed.teamNames || { A: 'Team A', B: 'Team B' });
      setWorldcupData(parsed.worldcupData || { title: "", description: "", thumbnail_url: "", is_public: true });
      setStep(parsed.step || 3);
      setGamificationMsg('이전에 작성 중이던 월드컵을 성공적으로 복구했습니다! 💾');
      setTimeout(() => setGamificationMsg(''), 3000);
    }
    setShowRestoreModal(false);
  };

  const clearDraft = () => {
    localStorage.removeItem('worldcuvi-creation-draft');
    setShowRestoreModal(false);
    setHasDraft(false);
  };

  // [부전승] 자동 계산 로직
  useEffect(() => {
    if (items.length <= 1) return;

    // 현재 개수보다 작은 가장 큰 2의 거듭제곱 (16강 이상일 경우 16)
    const getTargetSize = (n: number) => {
      if (n > 16) return 16;
      let t = 1;
      while (t * 2 <= n) t *= 2;
      return t;
    };

    const n = items.length;
    const t = getTargetSize(n);
    const totalByesNeeded = 2 * t - n;

    if (totalByesNeeded <= 0) {
      if (items.some(it => it.isBye)) {
        setItems(prev => prev.map(it => ({ ...it, isBye: false })));
      }
      return;
    }

    // VS 모드 균형 고려한 부전승 배정
    const assignByes = () => {
      const teamA = items.filter(it => it.team === 'A');
      const teamB = items.filter(it => it.team === 'B');

      let newItems = [...items].map(it => ({ ...it, isBye: false }));

      if (aiResult?.is_vs_mode) {
        // VS 모드 부전승 배정 원칙:
        // 1. 전체 부전승 수(totalByesNeeded)를 맞춘다.
        // 2. 두 팀의 매치 참여 인원수를 동일하게 맞춘다.
        // 매치 참여 인원 (n - totalByesNeeded) = 2 * MatchPairs
        const matchPairs = (n - totalByesNeeded) / 2;

        // 각 팀에서 남는 사람들은 부전승
        const aByesCount = Math.max(0, teamA.length - matchPairs);
        const bByesCount = Math.max(0, teamB.length - matchPairs);

        const shuffle = (arr: any[]) => [...arr].sort(() => Math.random() - 0.5);

        const aIndices = newItems.reduce((acc, it, idx) => it.team === 'A' ? [...acc, idx] : acc, [] as number[]);
        const bIndices = newItems.reduce((acc, it, idx) => it.team === 'B' ? [...acc, idx] : acc, [] as number[]);

        const aByesIdx = shuffle(aIndices).slice(0, aByesCount);
        const bByesIdx = shuffle(bIndices).slice(0, bByesCount);

        [...aByesIdx, ...bByesIdx].forEach(idx => { newItems[idx].isBye = true; });
      } else {
        // 일반 모드: 전체에서 랜덤 배정
        const indices = Array.from({ length: n }, (_, i) => i).sort(() => Math.random() - 0.5);
        indices.slice(0, totalByesNeeded).forEach(idx => { newItems[idx].isBye = true; });
      }

      // 상태 변경이 실제로 필요할 때만 업데이트 (무한 루프 방지)
      const currentByeIds = items.filter(it => it.isBye).map(it => it.id).sort().join(',');
      const newByeIds = newItems.filter(it => it.isBye).map(it => it.id).sort().join(',');

      if (currentByeIds !== newByeIds) {
        setItems(newItems);
        setGamificationMsg(n > 16
          ? `랜덤 부전승 제도가 적용되었습니다. ${totalByesNeeded}개 항목이 16강으로 직행합니다! ✨`
          : `랜덤 부전승 제도가 적용되었습니다. ${totalByesNeeded}개 항목이 다음 라운드로 직행합니다! ✨`
        );
      }
    };

    assignByes();
  }, [items.length, aiResult?.is_vs_mode]);

  const handleStartAnalysis = async (e?: React.FormEvent, overrideVideoId?: string, overrideThumbnail?: string, overrideTitle?: string, bulkItems?: WorldcupItem[], bypassCache = false) => {
    e?.preventDefault()

    // URL에서 ID 추출
    const videoIdFromUrl = extractVideoId(seedUrl)
    const playlistIdFromUrl = extractPlaylistId(seedUrl)

    // [수정 1] 플레이리스트/동영상 URL 우선순위 판별
    // 단일 영상 ID(v=)가 확실히 있으면, 재생목록(list=)이 같이 있어도 무조건 단일 영상 우선 처리!
    const targetVideoId = overrideVideoId || videoIdFromUrl

    if (targetVideoId) {
      // 단일 영상이 감지되었으므로 재생목록 호출을 건너뛰고 아래 AI 분석 로직으로 진행
      // [Title Shield] 초기 제목이 빈 상태면 AI가 더 정확하게 제목을 뽑을 수 있도록 유도
      if (!title || title === '제목 없음') {
        const initialTitle = overrideTitle || '유튜브 영상'
        // setTitle을 미리 하지 않고 AI가 결과로 줄 때까지 기다리거나, briefing 중에는 임시로만 보여줌
      }
    } else if (playlistIdFromUrl) {
      handlePlaylistFetch(playlistIdFromUrl)
      return
    } else {
      alert('올바른 유튜브 영상 또는 재생목록 주소를 입력해주세요.')
      return
    }

    setIsAnalyzing(true)
    setAnalysisProgress(10)
    setStep(2)

    // [추가] 새로운 분석 시작 전 기존 결과 초기화하여 "내용 안 바뀜" 현상 방지
    setAiResult(prev => ({ ...prev, recommended_titles: [] }))

    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metadata: {
            title: overrideTitle || title,
            videoId: targetVideoId,
          },
          items: items, // [추가] 현재 선택된 후보 정보를 넘겨 정교한 정교화(Refine) 유도
          bypassCache: !!bypassCache
        })
      })

      const data = await res.json()

      if (data.error && !data.is_fallback) throw new Error(data.error)

      if (data.is_fallback) {
        setGamificationMsg('AI 분석 한도 초과로 수동 모드로 전환합니다. 직접 월드컵을 완성해 보세요! 🛠️')
      }

      // [보정] AI 결과 데이터가 비어있거나 부정확할 경우를 대비한 노멀라이즈
      const normalizedData: AIResult = {
        determined_genre: data.determined_genre || data.project_name || "기획된 월드컵",
        identity: data.identity || (data.analysis_summary?.focus_point) || "AI 콘텐츠 기획",
        sub_tags: data.sub_tags || (data.marketing_strategy?.viral_tag ? [data.marketing_strategy.viral_tag] : ["#월드커비"]),
        public_reaction: data.public_reaction || (data.analysis_summary?.market_trend) || "관심을 끌 수 있는 기획입니다.",
        suitability_reason: data.suitability_reason || (data.marketing_strategy?.expected_effect) || "대중적인 소재로 제작되었습니다.",
        word_cloud: data.word_cloud || data.sub_tags || [],
        is_vs_mode: true, // [강제] 월드컵 토너먼트를 위해 항상 VS 모드 레이아웃 활성화
        search_keywords: data.search_keywords || (data.analysis_summary?.keyword_strategy) || [overrideTitle || title],
        confidence_score: data.confidence_score || 90,
        recommended_titles: data.recommended_titles || (data.world_cup_plan?.title ? [data.world_cup_plan.title] : [])
      }

      setAiResult(normalizedData)
      setAnalysisProgress(100)

      // AI Content Marketer: Spicy Title Suggestions
      const videoTitles = items.map(it => it.title)
      const titlesToAnalyze = videoTitles.length > 0 ? videoTitles : [overrideTitle || normalizedData.recommended_titles?.[0] || data.title]

      if (titlesToAnalyze.length > 0) {
        fetch('/api/gemini/suggest-title', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ titles: titlesToAnalyze })
        })
          .then(res => res.json())
          .then(spicyTitles => {
            if (Array.isArray(spicyTitles) && spicyTitles.length > 0) {
              setTimeout(() => {
                setAiResult((prev: any) => prev ? ({
                  ...prev,
                  recommended_titles: spicyTitles
                }) : prev)
                setGamificationMsg('수석 마케터 AI가 "도파민 제목"을 직접 추출했습니다! 🔥')

                // [Sync] setTitle is now handled by useEffect for consistency
              }, 1000)
            }
          })
          .catch(err => console.error('Spicy title suggestion failed:', err))
      }

      if (overrideTitle) {
        setTitle(overrideTitle)
      }

      // [수정 2] 개별 후보 영상 제목 오염 방지
      // seedItem.title은 영상의 '원래 제목'이어야 함. 메인 월드컵 제목(title)으로 덮어씌워지는 것 방지.
      const seedItem: WorldcupItem = {
        id: Date.now().toString(),
        title: overrideTitle || (data && data.title ? data.title : '유튜브 영상'),
        team: data && data.is_vs_mode ? 'A' : 'Neutral',
        thumbnail: overrideThumbnail || (data && data.thumbnail) || `https://img.youtube.com/vi/${targetVideoId}/hqdefault.jpg`,
        videoId: targetVideoId
      }
      setItems(prev => {
        const baseItems = bulkItems && bulkItems.length > 0 ? bulkItems : [seedItem];
        
        // [중요] 기존 후보가 있다면 중복(videoId) 제거 후 병합 (Incremental Add)
        const existingVideoIds = new Set(prev.map(it => it.videoId));
        const newUniqueItems = baseItems.filter(it => !existingVideoIds.has(it.videoId));
        
        if (newUniqueItems.length === 0) return prev; // 모두 중복이면 기존 상태 유지

        let finalNewBatch = newUniqueItems;

        // [추가] VS 모드 자동 배분 로직 (대기실에 몰려있는 것을 방지)
        // 기존 팀 구성 비율을 고려하여 A/B에 균등하게 분배
        if (data && data.is_vs_mode) {
          const teamACount = prev.filter(it => it.team === 'A').length;
          const teamBCount = prev.filter(it => it.team === 'B').length;
          
          finalNewBatch = newUniqueItems.map((it, idx) => {
            // 현재 A팀이 더 적으면 A로, B팀이 적으면 B로, 같으면 번갈아가며
            const balancedTeam = (teamACount + idx) % 2 === 0 ? 'A' : 'B';
            return {
              ...it,
              team: balancedTeam
            };
          });
        }
        
        return [...prev, ...finalNewBatch];
      });

      if (data.confidence_score > 90) {
        setGamificationMsg('AI가 제작자의 의도를 완벽히 파악했습니다! 🎯')
      }

      if (normalizedData.is_vs_mode) {
        const teamA = items.filter(it => it.team === 'A')
        const teamB = items.filter(it => it.team === 'B')
        const diff = teamA.length - teamB.length
        if (diff !== 0) console.log(`Balancing teams... Diff: ${diff}`)
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

  const handlePlaylistFetch = async (playlistId: string) => {
    setIsFetchingPlaylist(true)
    try {
      console.log('>>> [DEBUG] Playlist Fetch Start:', playlistId)
      const res = await fetch(`/api/youtube/playlist?playlistId=${playlistId}`)
      const data = await res.json()
      console.log('>>> [DEBUG] Playlist Data Received:', data)

      if (data.error) throw new Error(data.error)
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('재생목록이 비어있거나 비공개 상태입니다. ⚠️')
      }

      // [이슈 1 해결] 불도저 필터링: 비공개/삭제된 영상 제거
      const validVideos = data.filter((v: any) => {
        if (!v.title) return false;
        const t = v.title.toLowerCase();
        return !t.includes('private') &&
          !t.includes('deleted') &&
          !t.includes('비공개') &&
          !t.includes('삭제된');
      });

      const formatted = validVideos.map((v: any) => ({
        ...v,
        id: `${Date.now()}-${Math.random()}`,
        team: 'Neutral'
      }))

      setPlaylistItems([])
      setSelectedPlaylistItems(formatted.map((v: any) => v.videoId))
      setShowPlaylistModal(true)

      // [수정 4] 플레이리스트 실시간 로딩(Popping) 연출 및 모달 제어
      // await 블로킹을 피해 모달이 먼저 뜨게 하고, 백그라운드에서 하나씩 추가
      const popItems = async () => {
        for (let i = 0; i < formatted.length; i++) {
          await new Promise(resolve => setTimeout(resolve, 40))
          setPlaylistItems(prev => {
            if (prev.some(it => it.videoId === formatted[i].videoId)) return prev
            return [...prev, formatted[i]]
          })
        }
      }
      popItems()

      console.log('>>> [DEBUG] Playlist Population Started')
    } catch (err: any) {
      console.error(err)
      const videoId = extractVideoId(seedUrl)
      if (videoId) {
        setGamificationMsg('재생목록을 가져올 수 없어 단일 영상 분석으로 자동 전환합니다. 🔄')
        setTimeout(() => handleStartAnalysis(undefined, videoId), 1500)
      } else {
        alert('재생목록을 가져오는 중 오류가 발생했습니다. 할당량이 소진되었을 수 있습니다.')
      }
    } finally {
      setIsFetchingPlaylist(false)
    }
  }

  const addSelectedPlaylistItems = () => {
    const selected = playlistItems.filter(v => selectedPlaylistItems.includes(v.videoId || ''))
    if (selected.length === 0) {
      alert('최소 하나 이상의 영상을 선택해주세요.')
      return
    }
    const first = selected[0]
    setShowPlaylistModal(false)
    handleStartAnalysis(undefined, first.videoId, first.thumbnail, first.title, selected)
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
    if (deletedItem) {
      setGamificationMsg(`'${deletedItem.title}' 제외 완료. 취향을 반영해 리스트를 보정합니다... ♻️`)
      setTimeout(() => setGamificationMsg(''), 3000)
    }
  }

  const handleRefineAI = async () => {
    // 1. 기존 분석 결과 리셋 ("내용 안 바뀜" 방지)
    setAiResult({
      determined_genre: "",
      sub_tags: [],
      identity: "",
      public_reaction: "",
      suitability_reason: "",
      word_cloud: [],
      is_vs_mode: true,
      search_keywords: [],
      confidence_score: 0,
      recommended_titles: []
    })

    const videoId = items[0]?.videoId || extractVideoId(seedUrl)
    if (videoId) {
      setGamificationMsg('수석 마케터 AI가 분석을 처음부터 다시 정교화하는 중... 🧠')
      // 2. bypassCache 옵션을 true로 전달하여 새로운 데이터 강제 요청
      handleStartAnalysis(undefined, videoId, undefined, title, items, true)
    }
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
    const newItems: WorldcupItem[] = []
    selectedVideos.forEach(v => {
      if (!items.some(it => it.videoId === v.videoId)) {
        let team: 'A' | 'B' | 'Neutral' = 'Neutral'
        if (aiResult?.is_vs_mode) {
          const teamA = [...items, ...newItems].filter(it => it.team === 'A').length
          const teamB = [...items, ...newItems].filter(it => it.team === 'B').length
          team = teamA <= teamB ? 'A' : 'B'
        }
        newItems.push({ ...v, id: `${Date.now()}-${Math.random()}`, team })
        trackAction(v.channelId || '', v.channelTitle || '', 'add')
      }
    })
    setItems(prev => [...prev, ...newItems])
    setMagicScanResults([])
    setSelectedScanItems([])
    setGamificationMsg(`${newItems.length}개의 후보가 일괄 추가되었습니다! 🚀`)
  }

  useEffect(() => {
    const handleClick = () => {
      setContextMenu(null);
      setTeamContextMenu(null);
    }
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

    // [수정 3] 검색 모달에서 직접 URL 입력 시 즉시 감지 및 추가 로직
    // [개선] 껍데기만 추가하지 않고, 실제 제목과 채널명을 API에서 가져와서 추가합니다.
    const vid = extractVideoId(q)
    if (vid) {
      console.log('>>> [DEBUG] Direct Video URL detected in search:', vid)
      setSearchQuery('')

      // 비동기로 정보를 가져와서 추가
      fetch(`/api/youtube/video-details?videoId=${vid}`)
        .then(res => res.json())
        .then(metadata => {
          if (metadata.error) throw new Error(metadata.error)

          const realItem: WorldcupItem = {
            id: Date.now().toString(),
            title: metadata.title || '유튜브 영상',
            team: 'Neutral',
            thumbnail: metadata.thumbnail || `https://img.youtube.com/vi/${vid}/hqdefault.jpg`,
            videoId: vid,
            channelTitle: metadata.channelTitle || 'YouTube',
            channelId: metadata.channelId,
            publishedAt: metadata.publishedAt
          }
          handleAddVideo(realItem)
        })
        .catch(err => {
          console.error('Failed to fetch direct video metadata:', err)
          // 실패 시 최소한의 정보로라도 추가 (기존 방식 유지)
          const fallbackItem: WorldcupItem = {
            id: Date.now().toString(),
            title: '직접 입력한 유튜브 영상',
            team: 'Neutral',
            thumbnail: `https://img.youtube.com/vi/${vid}/hqdefault.jpg`,
            videoId: vid,
            channelTitle: 'YouTube'
          }
          handleAddVideo(fallbackItem)
        })
        .finally(() => {
          setIsSearching(false)
        })

      return
    }

    // [추가] 검색창에서 플레이리스트 URL 감지 시 즉시 가져오기
    const pid = extractPlaylistId(q)
    if (pid) {
      console.log('>>> [DEBUG] Direct Playlist URL detected in search:', pid)
      setShowSearchModal(false)
      setSearchQuery('')
      handlePlaylistFetch(pid)
      setIsSearching(false)
      return
    }

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

    // Intent Analysis
    fetch('/api/ai/parse-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q })
    }).then(res => res.json()).then(data => {
      if (data.group) setDetectedGroup(data.group)
      if (data.song) setDetectedSong(data.song)
      if (data.theme) setThemeColors({ primary: data.theme.primary_color, secondary: data.theme.secondary_color })
    }).catch(e => console.error('Intent analysis error:', e))

    try {
      setIsSearching(true)
      const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(finalQuery)}&order=${order}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      // [이슈 1 해결] 불도저 필터링: 비공개/삭제된 영상 제거
      const validVideos = data.filter((v: any) => {
        if (!v.title) return false;
        const t = v.title.toLowerCase();
        return !t.includes('private') &&
          !t.includes('deleted') &&
          !t.includes('비공개') &&
          !t.includes('삭제된');
      });

      const selectedChannelIds = new Set(items.map(it => it.channelId).filter(Boolean))
      const formatted = validVideos.map((v: any, index: number) => ({
        ...v,
        id: `${Date.now()}-${Math.random()}-${index}`,
        team: 'Neutral' as const
      }))
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
    <>
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
              className="h-full"
              style={{ width: `${analysisProgress}%`, backgroundColor: 'var(--accent-1)' }}
              transition={{ duration: 0.5 }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="min-h-screen pb-24 transition-colors duration-500" style={{ backgroundColor: 'var(--accent-3)', color: 'var(--accent-2)' }}>
        <div className="max-w-6xl mx-auto px-6 pt-12">
          {/* Header */}
          <div className="flex items-center justify-between mb-12">
            <div className="flex-1">
              <h1 className="text-3xl font-black flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--accent-1)', color: 'var(--accent-3)' }}>
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
                      color: [accentText, accentPrimary, accentText]
                    } : {}}
                    className="bg-transparent border-none text-2xl font-black focus:outline-none w-full text-balance px-2 py-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 focus:bg-black/5 dark:focus:bg-white/5 transition-colors"
                    style={{ color: 'var(--accent-2)' }}
                  />
                  <AnimatePresence>
                    {isTitleUpgraded && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="absolute -bottom-6 left-0 flex items-center gap-1.5 font-black text-[10px] uppercase tracking-widest"
                        style={{ color: 'var(--accent-1)' }}
                      >
                        <Sparkles className="w-3 h-3 animate-pulse" />
                        Magic Title Upgraded
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </h1>
              {!title && <p className="mt-2 font-medium" style={{ color: 'var(--accent-2)' }}>AI와 함께 가장 완벽한 월드컵을 설계하세요</p>}
            </div>
            <div className="flex items-center gap-3">
              {isPlus ? (
                <PremiumUserBadge />
              ) : (
                <button
                  onClick={() => { setNudgeReason('ads'); setShowNudge(true); }}
                  className="px-4 py-2 rounded-xl bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 text-sm font-bold border border-yellow-500/20 transition-all font-black uppercase tracking-widest"
                  style={{ 
                    boxShadow: '0 0 30px rgba(255, 215, 0, 0.4)',
                    color: '#FFD700',
                    borderColor: '#FFD700'
                  }}
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
              className="max-w-2xl mx-auto backdrop-blur-xl rounded-[2.5rem] p-10 shadow-xl"
              style={{ backgroundColor: 'var(--accent-3)', border: '1px solid var(--accent-1)', opacity: 0.9 }}
            >
              <form onSubmit={handleStartAnalysis} className="space-y-8">
                <div className="space-y-3">
                  <label className="block text-sm font-black uppercase tracking-widest px-1" style={{ color: 'var(--accent-2)' }}>월드컵 제목</label>
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

                    <Trophy className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 transition-colors z-10" style={{ color: 'var(--accent-1)' }} />
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value)
                        setIsTitleUpgraded(false)
                      }}
                      placeholder="월드컵 제목을 입력해주세요"
                      className="w-full pl-16 pr-6 py-4 rounded-2xl border-2 focus:outline-none transition-all text-xl font-bold relative z-10 shadow-sm"
                      style={{ backgroundColor: 'var(--accent-3)', color: 'var(--accent-2)', borderColor: 'var(--accent-1)' }}
                    />
                  </div>

                  <AnimatePresence>
                    {aiResult && aiResult.recommended_titles && aiResult.recommended_titles.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="mt-6 space-y-3"
                      >
                        <div className="flex items-center gap-2 px-1">
                          <Wand2 className="w-4 h-4 text-violet-500" />
                          <span className="text-[10px] font-black text-violet-500 uppercase tracking-[0.2em]">AI Title Suggestions</span>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          {aiResult.recommended_titles.map((recTitle, idx) => (
                            <motion.button
                              key={idx}
                              type="button"
                              whileHover={{ x: 5, backgroundColor: 'rgba(var(--accent-1), 0.1)' }}
                              onClick={() => {
                                setTitle(recTitle)
                                setIsTitleUpgraded(true)
                                setTimeout(() => setIsTitleUpgraded(false), 2000)
                              }}
                              className={`text-left p-4 rounded-2xl border transition-all text-sm font-bold flex items-center justify-between group ${title === recTitle
                                ? 'shadow-lg'
                                : 'hover:border-violet-500/30'
                                }`}
                              style={{
                                backgroundColor: title === recTitle ? 'var(--accent-1)' : 'var(--accent-3)',
                                color: title === recTitle ? 'var(--accent-3)' : 'var(--accent-2)',
                                borderColor: 'var(--accent-1)'
                              }}
                            >
                              <span className="line-clamp-1">{recTitle}</span>
                              {title === recTitle ? <CheckCircle2 className="w-4 h-4" /> : <Play className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />}
                            </motion.button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-black uppercase tracking-widest px-1" style={{ color: 'var(--accent-2)' }}>씨드 영상 (YouTube URL)</label>
                  <div className="flex gap-4">
                    <div className="relative flex-1">
                      <Youtube className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 transition-colors" style={{ color: 'var(--accent-1)' }} />
                      <input
                        type="text"
                        value={seedUrl}
                        onChange={(e) => setSeedUrl(e.target.value)}
                        placeholder="유튜브 주소를 붙여넣으세요"
                        className="w-full pl-16 pr-6 py-5 rounded-2xl border-2 focus:outline-none transition-all text-sm font-bold shadow-sm"
                        style={{ backgroundColor: 'var(--accent-3)', color: 'var(--accent-2)', borderColor: 'var(--accent-1)' }}
                      />
                    </div>
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setSearchMode('seed')
                        setSearchQuery(title || '')
                        setShowSearchModal(true)
                      }}
                      className="px-8 rounded-2xl bg-white dark:bg-slate-800 text-zinc-600 dark:text-zinc-300 font-black hover:bg-zinc-50 dark:hover:bg-slate-700 transition-all flex items-center gap-2 border border-zinc-200 dark:border-violet-500/20 shadow-sm"
                    >
                      <Youtube className="w-5 h-5 text-red-600" />
                      검색하기
                    </motion.button>
                  </div>
                  <p className="text-xs mt-1 flex items-center gap-1.5 px-1 font-medium" style={{ color: 'var(--accent-2)' }}>
                    <Info className="w-3.5 h-3.5" />
                    AI가 이 영상을 분석하여 장르와 후보 리스트를 자동으로 구성합니다.
                  </p>
                </div>

                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.02, opacity: 0.9 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={isAnalyzing || !seedUrl}
                  className="w-full py-6 rounded-3xl font-black text-xl transition-all flex items-center justify-center gap-3 shadow-2xl relative overflow-hidden group"
                  style={{ backgroundColor: 'var(--accent-1)', color: 'var(--accent-3)' }}
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
                      <span style={{ color: 'var(--accent-3)' }}>AI 분석 시작하기</span>
                      <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" style={{ color: 'var(--accent-3)' }} />
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
                <div className="absolute inset-0 rounded-full border-4 opacity-20" style={{ borderColor: 'var(--accent-1)' }} />
                <div className="absolute inset-0 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: 'var(--accent-1)' }} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 animate-pulse" style={{ color: 'var(--accent-1)' }} />
                </div>
              </div>
              <h2 className="text-3xl font-black mb-4">AI가 데이터를 정밀 분석 중입니다...</h2>
              <div className="h-20 flex items-center justify-center">
                <motion.p
                  key={briefingIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-lg font-black italic tracking-tight"
                  style={{ color: 'var(--accent-1)' }}
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
              <div className="rounded-[2.5rem] border p-10 shadow-xl relative overflow-hidden group"
                style={{ backgroundColor: 'var(--accent-3)', color: 'var(--accent-2)', borderColor: 'var(--accent-1)' }}>
                <div className="absolute top-0 right-0 w-64 h-64 blur-[100px] -mr-32 -mt-32 rounded-full opacity-20" style={{ backgroundColor: 'var(--accent-1)' }} />

                <div className="relative z-10 grid grid-cols-1 md:grid-cols-4 gap-12 items-start">
                  <div className="md:col-span-3 space-y-6">
                    <div className="flex items-center gap-3">
                      <span className="px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em]" style={{ backgroundColor: 'var(--accent-1)', color: 'var(--accent-3)' }}>AI Analysis Report</span>
                      {aiResult.cached && (
                        <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 text-[10px] font-bold border border-emerald-500/20">CACHED</span>
                      )}
                    </div>

                    <div>
                      <input
                        type="text"
                        value={aiResult.determined_genre || ""}
                        onChange={(e) => setAiResult({ ...aiResult, determined_genre: e.target.value })}
                        className="bg-zinc-100 dark:bg-white/5 border-none text-3xl font-black mb-2 px-3 py-1 rounded-xl w-full focus:ring-2 ring-violet-500 outline-none transition-all text-zinc-900 dark:text-white"
                        placeholder="장르 입력"
                      />
                      <input
                        type="text"
                        value={aiResult.identity}
                        onChange={(e) => setAiResult({ ...aiResult, identity: e.target.value })}
                        className="bg-transparent border-none text-lg font-bold w-full px-3 py-1 focus:bg-zinc-100 dark:focus:bg-white/5 rounded-xl outline-none"
                        style={{ color: 'var(--accent-2)' }}
                        placeholder="정체성 정의"
                      />
                    </div>

                    <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-widest mb-2 flex items-center gap-2" style={{ color: 'var(--accent-2)', opacity: 0.7 }}>
                          <Target className="w-3.5 h-3.5" /> 대중 반응 분석
                        </h4>
                        <textarea
                          value={aiResult.public_reaction}
                          onChange={(e) => setAiResult({ ...aiResult, public_reaction: e.target.value })}
                          className="w-full bg-zinc-50 dark:bg-black/20 border-none rounded-2xl p-4 text-sm font-medium text-zinc-600 dark:text-zinc-400 leading-relaxed italic focus:ring-2 ring-violet-500/30 outline-none resize-none"
                          rows={2}
                        />
                      </div>
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-widest mb-2 flex items-center gap-2" style={{ color: 'var(--accent-2)', opacity: 0.7 }}>
                          <Sparkles className="w-3.5 h-3.5" /> 월드컵 경쟁력
                        </h4>
                        <textarea
                          value={aiResult.suitability_reason}
                          onChange={(e) => setAiResult({ ...aiResult, suitability_reason: e.target.value })}
                          className="w-full bg-zinc-50 dark:bg-black/20 border-none rounded-2xl p-4 text-sm font-medium text-zinc-600 dark:text-zinc-400 leading-relaxed focus:ring-2 ring-violet-500/30 outline-none resize-none"
                          rows={2}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center text-center space-y-4">
                    <div className="w-full aspect-square rounded-[2rem] border flex flex-col items-center justify-center shadow-inner" style={{ backgroundColor: 'var(--accent-3)', borderColor: 'var(--accent-1)' }}>
                      <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--accent-2)', opacity: 0.5 }}>Confidence</p>
                      <p className="text-5xl font-black" style={{ color: 'var(--accent-1)' }}>{aiResult?.confidence_score}%</p>
                    </div>
                    <div className="text-[10px] font-bold" style={{ color: 'var(--accent-2)', opacity: 0.5 }}>
                      Engine: {aiResult?.model || 'Gemini 3.1 Pro'}
                    </div>
                  </div>
                </div>

                {/* VS Mode Balance Check View */}
                <div className="mt-12">
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
                          className="flex items-center gap-2 px-6 py-2 rounded-xl bg-[var(--accent-1)]/10 text-[var(--accent-1)] font-bold text-sm border border-[var(--accent-1)]/20 transition-all shadow-lg shadow-violet-500/5"
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
                        className="flex items-center gap-2 px-6 py-2 rounded-xl font-bold text-sm shadow-xl active:scale-95 transition-all"
                        style={{ backgroundColor: 'var(--accent-1)', color: 'var(--accent-3)' }}
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
                        <div id="team-a-zone" className="space-y-4 p-4 rounded-3xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 transition-all group/zone-a hover:border-[var(--accent-1)]/50 hover:bg-[var(--accent-1)]/5 relative">
                          <div className="flex items-center justify-between px-2">
                            <input
                              type="text"
                              value={teamNames.A}
                              onChange={(e) => setTeamNames({ ...teamNames, A: e.target.value })}
                              className="bg-transparent border-none text-xl font-black focus:outline-none w-full"
                              style={{ color: 'var(--accent-1)' }}
                            />
                            <span className="text-xs font-bold text-zinc-400 shrink-0">{items.filter(it => it.team === 'A').length} items</span>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            {items.filter(it => it.team === 'A').map(item => (
                              <ItemCard
                                key={item.id}
                                item={item}
                                onDelete={handleDeleteItem}
                                onMove={handleMoveItem}
                                onOpenMenu={(x, y) => setTeamContextMenu({ x, y, item })}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Team B */}
                        <div id="team-b-zone" className="space-y-4 p-4 rounded-3xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 transition-all group/zone-b hover:border-[var(--accent-1)]/50 hover:bg-[var(--accent-1)]/5 relative">
                          <div className="flex items-center justify-between px-2 flex-row-reverse">
                            <input
                              type="text"
                              value={teamNames.B}
                              onChange={(e) => setTeamNames({ ...teamNames, B: e.target.value })}
                              className="bg-transparent border-none text-xl font-black focus:outline-none w-full text-right"
                              style={{ color: 'var(--accent-1)' }}
                            />
                            <span className="text-xs font-bold text-zinc-400 shrink-0">{items.filter(it => it.team === 'B').length} items</span>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            {items.filter(it => it.team === 'B').map(item => (
                              <ItemCard
                                key={item.id}
                                item={item}
                                onDelete={handleDeleteItem}
                                onMove={handleMoveItem}
                                onOpenMenu={(x, y) => setTeamContextMenu({ x, y, item })}
                              />
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
                          <div id="waiting-room-zone" className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 p-4 rounded-3xl border-2 border-dashed border-transparent transition-all hover:border-zinc-400/20 hover:bg-zinc-400/5">
                            {items.filter(it => it.team === 'Neutral').map(item => (
                              <ItemCard
                                key={item.id}
                                item={item}
                                onDelete={handleDeleteItem}
                                onMove={handleMoveItem}
                                onOpenMenu={(x, y) => setTeamContextMenu({ x, y, item })}
                              />
                            ))}
                          </div>
                          <p className="text-xs text-zinc-400 px-2 italic">* VS 모드에서는 후보들을 각 팀으로 배정해야 공정한 대결이 가능합니다. (카드를 클릭하거나 우클릭하여 팀을 변경하세요!)</p>
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

                {/* [추가] 썸네일/배너 선택 섹션 */}
                <div className="mt-12 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-[var(--accent-1)]/20 p-8">
                  <h3 className="text-xl font-black mb-6 flex items-center gap-2" style={{ color: 'var(--accent-2)' }}>
                    <Wand2 className="w-5 h-5" style={{ color: 'var(--accent-1)' }} />
                    대표 썸네일 설정
                  </h3>
                  <div className="flex overflow-x-auto gap-4 pb-4 px-2 scrollbar-thin scrollbar-thumb-violet-500/30 scrollbar-track-transparent snap-x">
                    {items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setWorldcupData({ ...worldcupData, thumbnail_url: item.thumbnail })}
                        className={`relative flex-shrink-0 aspect-video w-48 md:w-56 rounded-xl overflow-hidden border-4 transition-all snap-start ${worldcupData.thumbnail_url === item.thumbnail
                          ? "border-[var(--accent-1)] ring-4 ring-[var(--accent-1)]/20 scale-95"
                          : "border-zinc-100 dark:border-zinc-800 hover:border-violet-300"
                          }`}
                      >
                        <img src={item.thumbnail} className="w-full h-full object-cover" alt="thumbnail option" />
                        {worldcupData.thumbnail_url === item.thumbnail && (
                          <div className="absolute inset-0 bg-[var(--accent-1)]/20 flex items-center justify-center">
                            <CheckCircle2 className="w-6 h-6 text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                  {/* 커스텀 배너 입력 (Option) */}
                  <div className="mt-8 pt-8 border-t border-zinc-100 dark:border-zinc-800">
                    <label className="text-xs font-bold text-zinc-400 mb-2 block uppercase tracking-widest">직접 입력 (Custom Banner URL)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={worldcupData.thumbnail_url}
                        onChange={(e) => setWorldcupData({ ...worldcupData, thumbnail_url: e.target.value })}
                        placeholder="이미지 주소를 직접 입력할 수도 있습니다"
                        className="flex-1 px-4 py-3 rounded-xl bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 focus:ring-2 ring-[var(--accent-1)]/30 outline-none text-sm text-zinc-900 dark:text-white"
                      />
                      {worldcupData.thumbnail_url && (
                        <div className="w-12 h-12 rounded-lg overflow-hidden border border-violet-500/50 flex-shrink-0">
                          <img src={worldcupData.thumbnail_url} className="w-full h-full object-cover" alt="preview" onError={(e) => e.currentTarget.src = 'https://via.placeholder.com/150'} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Final Action */}
              <div className="flex flex-col items-center gap-4 pt-12">
                <button
                  disabled={items.length < 4 || !worldcupData.thumbnail_url}
                  onClick={async () => {
                    try {
                      setIsAnalyzing(true);
                      setAnalysisProgress(10);

                      if (user?.id) {
                        const { error: upgradeError } = await supabase
                          .from('users')
                          .update({ is_creator: true })
                          .eq('id', user.id)

                        if (upgradeError) {
                          console.error("Creator upgrade failed:", upgradeError);
                        } else {
                          // [추가] UI 즉시 갱신을 위해 프로필 리프레시
                          await refreshProfile();
                        }
                      }

                      setAnalysisProgress(40);

                      // [추가] 사장님 지침에 따른 철저한 유효성 검사
                      if (!title || title === '제목 없음') throw new Error('월드컵 제목을 입력해주세요! AI 제목을 선택하거나 직접 입력할 수 있습니다. ✍️');
                      if (items.length < 2) throw new Error('월드컵을 만드려면 최소 2개 이상의 후보가 필요합니다! ➕');
                      if (!worldcupData.thumbnail_url) {
                        // 썸네일이 없으면 첫 번째 후보의 썸네일로 자동 지정
                        if (items[0]) worldcupData.thumbnail_url = items[0].thumbnail;
                        else throw new Error('월드컵 대표 썸네일을 선택해주세요! 🖼️');
                      }

                      // 2. RPC를 이용한 원자적 생성 (사장님 스키마에 완벽하게 맞춘 최신 버전!)
                      const { data: newId, error } = await supabase.rpc('create_worldcup_with_candidates', {
                        p_title: title,
                        p_description: aiResult.identity,
                        p_thumbnail_url: worldcupData.thumbnail_url,
                        p_category: aiResult.determined_genre, // 👈 아까 스키마에 있던 장르(category) 추가!
                        p_creator_id: user?.id,
                        p_candidates: items.map(it => ({       // 👈 p_items 가 아니라 p_candidates 입니다!
                          title: it.title,
                          youtube_video_id: it.videoId,        // 👈 사장님 스키마 컬럼명 완벽 일치!
                          start_time: 0
                        }))
                      });

                      if (error) throw error;

                      setAnalysisProgress(80);

                      // 3. 모든 후보 채널 Finalize 트래킹
                      items.forEach(item => {
                        trackAction(item.channelId || '', item.channelTitle || '', 'finalize')
                      })

                      setAnalysisProgress(100);

                      // 4. [Draft] 성공적으로 생성되었으므로 임시 저장 데이터 삭제
                      localStorage.removeItem('worldcuvi-creation-draft');

                      // 5. [State Sync] 크리에이터 권한 반영을 위해 서버 상태 갱신 후 이동
                      router.refresh();

                      // 6. 생성된 실제 ID로 이동
                      router.push(`/worldcup/${newId}`)
                    } catch (err: any) {
                      // 🚨 깡통 객체를 강제로 뜯어서 진짜 메시지를 보여주는 마법의 코드
                      console.error("Creation failed [상세]:", err.message || JSON.stringify(err, null, 2) || err);

                      // 유저에겐 친절하게, 사장님에겐 정확하게!
                      alert(`월드컵 생성 중 오류가 발생했습니다.\n사유: ${err.message || "알 수 없는 오류"}`);
                    } finally {
                      setIsAnalyzing(false);
                    }
                  }}
                  className="px-16 py-6 rounded-[2rem] bg-[var(--accent-1)] text-white font-black text-2xl shadow-2xl shadow-[var(--accent-1)]/40 hover:scale-105 active:scale-95 transition-all flex items-center gap-4 disabled:opacity-30 disabled:hover:scale-100 disabled:cursor-not-allowed group"
                >
                  {isAnalyzing ? (
                    <Loader2 className="w-8 h-8 animate-spin" />
                  ) : (
                    <Trophy className="w-8 h-8 fill-current group-hover:rotate-12 transition-transform" />
                  )}
                  월드컵 생성하기
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
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden border"
                style={{ backgroundColor: 'var(--accent-3)', borderColor: 'var(--accent-1)' }}
              >
                <div className="p-10">
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-3xl font-black flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: 'var(--accent-1)' }}>
                        <Youtube className="w-6 h-6" />
                      </div>
                      후보 직접 추가
                    </h2>
                    <button onClick={() => setShowSearchModal(false)} className="w-10 h-10 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors">
                      <X className="w-5 h-5 text-zinc-400" />
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
                        className="w-full pl-8 pr-32 py-5 rounded-2xl border-2 focus:outline-none transition-all text-lg font-bold"
                        style={{ backgroundColor: 'var(--accent-3)', color: 'var(--accent-2)', borderColor: 'var(--accent-1)' }}
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
                        className="absolute right-3 top-1/2 -translate-y-1/2 px-6 py-3 rounded-xl text-white font-black text-sm transition-all disabled:opacity-50 shadow-lg"
                        style={{ backgroundColor: 'var(--accent-1)' }}
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
                            handleSearch(undefined, newOrder)
                          }}
                          className={`px-6 py-3 rounded-xl text-sm font-black transition-all relative ${searchOrder === order.id
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
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddVideo(video);
                          }}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setContextMenu({ x: e.clientX, y: e.clientY, video });
                          }}
                          className="group cursor-pointer relative"
                        >
                          {/* Hover Preview Tooltip */}
                          <div className="absolute -inset-4 z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full mb-4 w-[280px] bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl border border-black/10 dark:border-white/10 p-3 scale-90 group-hover:scale-100 transition-transform origin-bottom backdrop-blur-xl">
                              <img
                                src={video.thumbnail}
                                className="w-full aspect-video rounded-xl object-cover mb-2"
                                alt="preview"
                                onError={(e) => {
                                  const fallbackSrc = `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`;
                                  if (e.currentTarget.src !== fallbackSrc) {
                                    e.currentTarget.src = fallbackSrc;
                                  }
                                }}
                              />
                              <p className="text-xs font-bold leading-tight line-clamp-2 mb-1">{video.title}</p>
                              <div className="flex items-center justify-between text-[10px] font-black text-zinc-400">
                                <span>{video.publishedAt ? new Date(video.publishedAt).toLocaleDateString() : 'Date N/A'}</span>
                                <span className="text-red-500">CLICK TO SELECT</span>
                              </div>
                              <div className="absolute bottom-[-8px] left-1/2 -translate-x-1/2 w-4 h-4 bg-white dark:bg-zinc-800 rotate-45 border-r border-b border-black/10 dark:border-white/10" />
                            </div>
                          </div>

                          <div className="relative aspect-video rounded-[1.5rem] overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-black/5 dark:border-white/5 mb-3 group-hover:shadow-xl transition-all">
                            <img
                              src={video.thumbnail}
                              alt={video.title}
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                              onError={(e) => {
                                const fallbackSrc = `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`;
                                if (e.currentTarget.src !== fallbackSrc) {
                                  e.currentTarget.src = fallbackSrc;
                                }
                              }}
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                              <Plus className="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition-all scale-50 group-hover:scale-110" />
                            </div>
                            {/* [추가] 유튜브 원본 링크 버튼 */}
                            <a
                              href={`https://www.youtube.com/watch?v=${video.videoId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="absolute bottom-3 right-3 w-8 h-8 rounded-xl bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg transition-all z-20 opacity-0 group-hover:opacity-100"
                              title="유튜브에서 보기"
                            >
                              <Youtube className="w-4 h-4" />
                            </a>
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
                    {searchResults.length === 0 && !isSearching && (
                      <div className="col-span-full py-24 text-center space-y-6">
                        <div className="w-20 h-20 bg-zinc-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-black/5 dark:border-white/5">
                          <Youtube className="w-10 h-10 text-zinc-200 dark:text-zinc-600" />
                        </div>
                        <p className="font-bold text-lg" style={{ color: 'var(--accent-2)' }}>검색 결과가 없습니다. 다른 키워드로 검색해 보세요.</p>
                      </div>
                    )}
                  </div>

                  {/* Magic Scan Overlay */}
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
                            <div className="w-12 h-12 rounded-2xl bg-[var(--accent-1)] flex items-center justify-center text-white shadow-lg shadow-[var(--accent-1)]/20">
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
                              className="px-8 py-3 rounded-xl bg-[var(--accent-1)] text-white font-black shadow-lg shadow-[var(--accent-1)]/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-30 flex items-center gap-3"
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
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleScanItem(v.videoId || '');
                              }}
                              className={`group cursor-pointer relative rounded-2xl overflow-hidden border-2 transition-all ${selectedScanItems.includes(v.videoId || '')
                                ? 'border-[var(--accent-1)] ring-4 ring-[var(--accent-1)]/20 scale-95'
                                : 'border-transparent hover:border-[var(--accent-1)]/30'
                                }`}
                            >
                              <img
                                src={v.thumbnail}
                                className="w-full aspect-video object-cover"
                                alt="thumb"
                                onError={(e) => {
                                  const fallbackSrc = `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`;
                                  if (e.currentTarget.src !== fallbackSrc) {
                                    e.currentTarget.src = fallbackSrc;
                                  }
                                }}
                              />
                              <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                                <p className="text-[10px] font-black text-white line-clamp-2 leading-tight">{v.title}</p>
                              </div>
                              {selectedScanItems.includes(v.videoId || '') && (
                                <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[var(--accent-1)] text-white flex items-center justify-center shadow-lg">
                                  <CheckCircle2 className="w-4 h-4" />
                                </div>
                              )}
                              {/* [추가] 유튜브 원본 링크 버튼 */}
                              <a
                                href={`https://www.youtube.com/watch?v=${v.videoId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="absolute bottom-2 right-2 w-7 h-7 rounded-lg bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg transition-all z-10 opacity-0 group-hover:opacity-100"
                                title="유튜브에서 보기"
                              >
                                <Youtube className="w-4 h-4" />
                              </a>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Magic Scan Loading */}
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
                          className="w-20 h-20 rounded-[2rem] border-4 border-[var(--accent-1)] border-t-transparent shadow-2xl shadow-[var(--accent-1)]/20 mb-8"
                        />
                        <h3 className="text-3xl font-black italic mb-4">채널 터는 중... ✨</h3>
                        <p className="text-lg font-bold text-zinc-500 text-center max-w-md">업로드 플레이리스트(UU) 우회 경로를 통해 전수 조사하고 있습니다.</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>

              {/* Context Menu */}
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
                      <p className="text-xs font-bold truncate text-zinc-600 dark:text-zinc-300">{contextMenu.video.channelTitle}</p>
                    </div>
                    <div className="p-1.5">
                      <button
                        onClick={() => { if (contextMenu) handleMagicScan(contextMenu.video.channelId || ''); setContextMenu(null); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--accent-1)] hover:text-white transition-all text-sm font-black text-[var(--accent-1)]"
                      >
                        <Sparkles className="w-4 h-4" /> Magic Scan (채널 털기)
                      </button>
                      <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-white/5 transition-all text-sm font-bold text-zinc-500">
                        <ListVideo className="w-4 h-4" /> 재생목록 보기
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </AnimatePresence>

        {/* Playlist Selector Modal */}
        <AnimatePresence>
          {showPlaylistModal && (
            <div className="fixed inset-0 z-[250] flex items-center justify-center p-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowPlaylistModal(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm dark:bg-black/80"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-5xl bg-white dark:bg-[#121214] rounded-[3rem] shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 max-h-[90vh] flex flex-col"
              >
                <div className="p-10 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[var(--accent-1)] flex items-center justify-center text-white">
                      <ListVideo className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black italic">
                        {isFetchingPlaylist ? 'Playlist Analyzing...' : 'Playlist Detected'}
                      </h3>
                      <p className="text-sm font-bold text-zinc-400">
                        {isFetchingPlaylist ? '재생목록을 분석 중입니다... 뚝딱뚝딱 ✨' : `${playlistItems.length}개의 영상을 발견했습니다.`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        if (selectedPlaylistItems.length === playlistItems.length) setSelectedPlaylistItems([])
                        else setSelectedPlaylistItems(playlistItems.map(v => v.videoId || ''))
                      }}
                      className="px-4 py-2 rounded-xl text-sm font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                    >
                      {selectedPlaylistItems.length === playlistItems.length ? '전체 해제' : '전체 선택'}
                    </button>
                    <button onClick={() => setShowPlaylistModal(false)} className="w-10 h-10 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors">
                      <X className="w-5 h-5 text-zinc-400" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-10 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 custom-scrollbar">
                  {playlistItems.map((v) => (
                    <motion.div
                      key={v.id}
                      onClick={() => {
                        setSelectedPlaylistItems(prev =>
                          prev.includes(v.videoId || '')
                            ? prev.filter(id => id !== v.videoId)
                            : [...prev, v.videoId || '']
                        )
                      }}
                      className={`group cursor-pointer relative rounded-2xl overflow-hidden border-2 transition-all ${selectedPlaylistItems.includes(v.videoId || '')
                        ? 'border-[var(--accent-1)] ring-4 ring-[var(--accent-1)]/20 scale-95 shadow-xl'
                        : 'border-zinc-100 dark:border-zinc-800 hover:border-[var(--accent-1)]/30'
                        }`}
                    >
                      <div className="aspect-video relative overflow-hidden bg-zinc-200 dark:bg-zinc-800">
                        <img
                          src={v.thumbnail}
                          className="w-full h-full object-cover"
                          alt="thumb"
                          onError={(e) => {
                            const fallbackSrc = `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`;
                            if (e.currentTarget.src !== fallbackSrc) {
                              e.currentTarget.src = fallbackSrc;
                            }
                          }}
                        />
                      </div>
                      <div className="p-3 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800">
                        <p className="text-[10px] font-black line-clamp-2 leading-tight h-8">{v.title}</p>
                      </div>
                      {selectedPlaylistItems.includes(v.videoId || '') && (
                        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[var(--accent-1)] text-white flex items-center justify-center shadow-lg">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      )}
                      {/* [추가] 유튜브 원본 링크 버튼 */}
                      <a
                        href={`https://www.youtube.com/watch?v=${v.videoId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="absolute bottom-2 right-2 w-7 h-7 rounded-lg bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg transition-all z-10 opacity-0 group-hover:opacity-100"
                        title="유튜브에서 보기"
                      >
                        <Youtube className="w-4 h-4" />
                      </a>
                    </motion.div>
                  ))}
                </div>

                <div className="p-8 bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-800 flex justify-center shrink-0">
                  <button
                    disabled={selectedPlaylistItems.length === 0}
                    onClick={addSelectedPlaylistItems}
                    className="px-12 py-4 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-black font-black text-lg shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-30 flex items-center gap-3"
                  >
                    {selectedPlaylistItems.length}개 후보로 시작하기
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Team Management Context Menu */}
        <AnimatePresence>
          {teamContextMenu && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              style={{
                top: teamContextMenu.y,
                left: Math.min(teamContextMenu.x, typeof window !== 'undefined' ? window.innerWidth - 240 : 0)
              }}
              className="fixed z-[300] w-64 bg-white/95 dark:bg-zinc-900/95 rounded-2xl shadow-2xl border border-black/10 dark:border-white/10 overflow-hidden backdrop-blur-xl p-2 space-y-1"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-3 py-2 border-b border-black/5 dark:border-white/5 mb-1 text-left">
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Team Selection</p>
                <p className="text-xs font-bold truncate text-zinc-600 dark:text-zinc-300">{teamContextMenu.item.title}</p>
              </div>

              <button
                onClick={() => { if (teamContextMenu) handleMoveItem(teamContextMenu.item.id, 'A'); setTeamContextMenu(null); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all text-sm font-black ${
                  teamContextMenu.item.team === 'A' ? 'bg-[var(--accent-1)] text-white' : 'hover:bg-[var(--accent-1)]/10 text-[var(--accent-1)]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-[var(--accent-1)] border border-white" />
                  {teamNames.A}로 이동
                </div>
                {teamContextMenu.item.team === 'A' && <CheckCircle2 className="w-4 h-4" />}
              </button>

              <button
                onClick={() => { if (teamContextMenu) handleMoveItem(teamContextMenu.item.id, 'B'); setTeamContextMenu(null); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all text-sm font-black ${
                  teamContextMenu.item.team === 'B' ? 'bg-[var(--accent-1)] text-white' : 'hover:bg-[var(--accent-1)]/10 text-[var(--accent-1)]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-[var(--accent-1)] border border-white" />
                  {teamNames.B}로 이동
                </div>
                {teamContextMenu.item.team === 'B' && <CheckCircle2 className="w-4 h-4" />}
              </button>

              <button
                onClick={() => { if (teamContextMenu) handleMoveItem(teamContextMenu.item.id, 'Neutral'); setTeamContextMenu(null); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all text-sm font-black ${
                  teamContextMenu.item.team === 'Neutral' ? 'bg-zinc-600 text-white' : 'hover:bg-zinc-500/10 text-zinc-500'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-zinc-400" />
                  대기실로 이동
                </div>
                {teamContextMenu.item.team === 'Neutral' && <CheckCircle2 className="w-4 h-4" />}
              </button>

              <div className="h-px bg-black/5 dark:bg-white/5 my-1" />

              <button
                onClick={() => { if (teamContextMenu) handleDeleteItem(teamContextMenu.item.id); setTeamContextMenu(null); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-500/10 text-red-500 transition-all text-sm font-black"
              >
                <Trash2 className="w-4 h-4" /> 후보 삭제
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <PlusNudgeModal isOpen={showNudge} onClose={() => setShowNudge(false)} reason={nudgeReason} />
      </div>
    </>
  )
}

// TypingEffect, ScanLog, getContrastColor 등 기존 하단 유틸리티 함수 및 컴포넌트 전체 유지
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

function getContrastColor(hex: string): 'black' | 'white' {
  if (!hex || hex.length < 7) return 'white'
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000
  return (yiq >= 128) ? 'black' : 'white'
}

function ItemCard({ item, onDelete, onMove, onOpenMenu }: {
  item: WorldcupItem,
  onDelete: (id: string) => void,
  onMove?: (id: string, team: 'A' | 'B' | 'Neutral') => void,
  onOpenMenu?: (x: number, y: number) => void
}) {
  const { accentPrimary } = useAccent()

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
          scale: 1.05,
          zIndex: 40,
          boxShadow: [
            `0 0 0 0px ${accentPrimary}00`,
            `0 0 15px 5px ${accentPrimary}4d`,
            `0 0 0 0px ${accentPrimary}00`
          ]
        }
      }}
      transition={{
        boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" },
        scale: { type: "spring", damping: 15 }
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation(); // 👈 전역 퀵 메뉴(CustomQuickMenu) 간섭 차단
        if (!onOpenMenu) return;
        onOpenMenu(e.clientX, e.clientY);
      }}
      onClick={(e) => {
        e.stopPropagation(); // 👈 전역 퀵 메뉴 간섭 차단
        if (!onOpenMenu) return;
        onOpenMenu(e.clientX, e.clientY);
      }}
      className={`group relative aspect-video rounded-[1.5rem] overflow-hidden border transition-all duration-300 shadow-lg cursor-pointer hover:z-50 z-20`}
      style={{ backgroundColor: 'var(--accent-3)', borderColor: `${accentPrimary}4d` }}
    >
      <img
        src={item.thumbnail}
        alt={item.title}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500"
        onError={(e) => {
          const fallbackSrc = `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`;
          if (e.currentTarget.src !== fallbackSrc) {
            e.currentTarget.src = fallbackSrc;
          }
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-60 transition-opacity group-hover:opacity-80" />
      <div className="absolute inset-x-0 bottom-0 p-4 transform translate-y-1 transition-transform group-hover:translate-y-0 text-center">
        <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--accent-1)' }}>CANDIDATE</p>
        <p className="text-sm font-black text-white truncate drop-shadow-lg shadow-black">{item.title}</p>
      </div>

      {item.isBye && (
        <div className="absolute top-3 left-3 px-3 py-1 bg-amber-500 text-white text-[10px] font-black rounded-full shadow-lg z-30 animate-bounce">
          부전승 (Bye)
        </div>
      )}
    </motion.div>
  )
}