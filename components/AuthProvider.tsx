'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

export interface UserProfile {
  nickname: string | null
  profile_img: string | null
  is_creator: boolean
  is_plus_subscriber: boolean
  points: number
}

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: UserProfile | null
  loading: boolean
  refreshProfile: () => Promise<void> // 수동 갱신 기능 추가
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  refreshProfile: async () => { },
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  // 프로필 정보 가져오기
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('nickname, profile_img, is_creator, is_plus_subscriber, points')
        .eq('id', userId)
        .single()

      if (error) throw error
      if (data) setProfile(data as UserProfile)
    } catch (e) {
      console.error('Error fetching profile:', e)
    }
  }

  useEffect(() => {
    // 1. 초기 세션 체크
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      setLoading(false)
    })

    // 2. 인증 상태 변경 감지 (로그인/로그아웃)
    const { data: { subscription: authListener } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })

    // 3. [핵심] 프로필 실시간 구독 (포인트/구독상태 실시간 반영)
    let profileListener: any = null

    if (user) {
      profileListener = supabase
        .channel(`public:users:id=eq.${user.id}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${user.id}`
        }, (payload) => {
          console.log('>>> [REALTIME] Profile Updated!', payload.new)
          setProfile(payload.new as UserProfile)
        })
        .subscribe()
    }

    return () => {
      authListener.unsubscribe()
      if (profileListener) supabase.removeChannel(profileListener)
    }
  }, [user?.id]) // 유저 ID가 바뀔 때마다 구독 갱신

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      loading,
      refreshProfile: () => user ? fetchProfile(user.id) : Promise.resolve()
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)