'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  ChevronLeft, 
  Trophy, 
  Users, 
  Heart, 
  Play, 
  Settings, 
  ExternalLink,
  BarChart3,
  Plus,
  ArrowUpRight,
  Trash2
} from 'lucide-react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/AuthProvider'
import { useAccent } from '@/components/ThemeProvider'
import CreatorBadge from '@/components/CreatorBadge'

export default function CreatorDashboard() {
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClient()
  const { accentText, accentPrimary } = useAccent()

  const [profile, setProfile] = useState<any>(null)
  const [worldcups, setWorldcups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return

      // Fetch Profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      setProfile(profileData)

      // Fetch My Worldcups
      const { data: wcData } = await supabase
        .from('worldcups')
        .select('*')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false })
      
      setWorldcups(wcData || [])
      setLoading(false)
    }

    fetchData()
  }, [user])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-violet-600 border-t-transparent animate-spin rounded-full" />
    </div>
  )

  if (!profile?.is_creator) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-3xl bg-violet-600/10 flex items-center justify-center text-violet-600 mb-6">
          <Trophy className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-black mb-4">아직 크리에이터가 아니신가요?</h1>
        <p className="text-zinc-500 mb-8 max-w-md">월드컵을 하나라도 완성하면 공식 크리에이터로 승격됩니다. 지금 바로 첫 월드컵을 만들어보세요!</p>
        <Link 
          href="/create"
          className="px-8 py-4 bg-violet-600 text-white rounded-2xl font-black text-lg hover:scale-105 transition-all"
        >
          첫 월드컵 만들기
        </Link>
      </div>
    )
  }

  const totalPlays = worldcups.reduce((acc, curr) => acc + (curr.play_count || 0), 0)
  const totalLikes = worldcups.reduce((acc, curr) => acc + (curr.like_count || 0), 0)

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-foreground pb-24">
      <div className="max-w-6xl mx-auto px-6 pt-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => router.back()}
              className="w-12 h-12 rounded-2xl bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 flex items-center justify-center text-zinc-400 hover:text-foreground transition-all"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-black">Creator Dashboard</h1>
                <CreatorBadge grade={profile.creator_grade} className="scale-110" />
              </div>
              <p className="text-zinc-500 font-bold">환영합니다, {profile.nickname} 크리에이터님! 👋</p>
            </div>
          </div>
          <Link 
            href="/create"
            className="hidden md:flex items-center gap-2 px-6 py-3 bg-violet-600 text-white rounded-xl font-black text-sm shadow-xl shadow-violet-600/20 hover:scale-105 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            새 월드컵 제작
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {[
            { label: 'Total Plays', value: totalPlays.toLocaleString(), icon: Play, color: 'text-violet-600' },
            { label: 'Total Likes', value: totalLikes.toLocaleString(), icon: Heart, color: 'text-red-500' },
            { label: 'My Worldcups', value: worldcups.length, icon: Trophy, color: 'text-amber-500' },
            { label: 'Creator Grade', value: profile.creator_grade || 'Bronze', icon: BarChart3, color: 'text-emerald-500' },
          ].map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-black/5 dark:border-white/5 shadow-sm"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl bg-gray-50 dark:bg-black flex items-center justify-center ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-zinc-300" />
              </div>
              <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">{stat.label}</p>
              <p className="text-2xl font-black">{stat.value}</p>
            </motion.div>
          ))}
        </div>

        {/* My Content List */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xl font-black flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-violet-600" />
              내 월드컵 관리 ({worldcups.length})
            </h2>
            <div className="flex items-center gap-4 text-xs font-bold text-zinc-400">
              <span>정렬: 최신순</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {worldcups.length > 0 ? worldcups.map((wc, i) => (
              <motion.div 
                key={wc.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + (i * 0.05) }}
                className="group bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-black/5 dark:border-white/5 flex items-center gap-6 hover:border-violet-600/30 transition-all shadow-sm"
              >
                <div className="w-32 aspect-video rounded-2xl overflow-hidden bg-zinc-100 shrink-0">
                  <img src={wc.thumbnail_url} alt={wc.title} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-black truncate group-hover:text-violet-600 transition-colors mb-1">{wc.title}</h3>
                  <div className="flex items-center gap-4 text-xs font-bold text-zinc-400">
                    <span className="flex items-center gap-1"><Play className="w-3 h-3" /> {wc.play_count || 0}</span>
                    <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {wc.like_count || 0}</span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {wc.participant_count || 0}</span>
                    <span className="ml-2 px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-black/40">{new Date(wc.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-2">
                  <Link 
                    href={`/worldcup/${wc.id}`}
                    className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-black/50 flex items-center justify-center text-zinc-400 hover:text-foreground transition-all"
                  >
                    <ExternalLink className="w-5 h-5" />
                  </Link>
                  <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-black font-black text-sm hover:scale-105 active:scale-95 transition-all shadow-lg shadow-zinc-500/10">
                    <Settings className="w-4 h-4" />
                    수정
                  </button>
                  <button 
                    onClick={async () => {
                      if (!confirm("정말 삭제하시겠습니까? 관련 데이터가 모두 삭제됩니다.")) return;
                      const { error } = await supabase
                        .from('worldcups')
                        .delete()
                        .eq('id', wc.id);
                      
                      if (!error) {
                        setWorldcups(worldcups.filter(w => w.id !== wc.id));
                      } else {
                        alert("삭제 중 오류가 발생했습니다.");
                      }
                    }}
                    className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all border border-red-500/20"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            )) : (
              <div className="py-24 text-center bg-white dark:bg-zinc-900 rounded-[3rem] border border-dashed border-zinc-200 dark:border-zinc-800">
                <Trophy className="w-12 h-12 text-zinc-200 dark:text-zinc-700 mx-auto mb-4" />
                <p className="text-zinc-400 font-bold">아직 제작한 월드컵이 없습니다.</p>
                <Link href="/create" className="text-violet-600 font-black mt-2 inline-block hover:underline">첫 작품을 만들어보세요!</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
