'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Trophy } from 'lucide-react'
import { useUI } from './UIProvider'

export default function LoginModal() {
  const { loginModalOpen, closeLoginModal } = useUI()
  const supabase = createClient()
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeLoginModal() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [closeLoginModal])

  useEffect(() => {
    document.body.style.overflow = loginModalOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [loginModalOpen])

  const signIn = async (provider: 'google' | 'discord') => {
    // 💡 redirectTo URL을 환경변수 또는 현재 도메인 기반으로 동적 생성
    const getRedirectUrl = () => {
      if (typeof window === 'undefined') return ''
      
      const origin = window.location.origin
      // Vercel Preview URL 또는 실제 도메인이 worldcuvi.world인 경우 해당 도메인 사용
      if (origin.includes('worldcuvi.world') || origin.includes('vercel.app')) {
        return `${origin}/auth/callback`
      }
      
      // 로컬 개발 환경인 경우
      return `${origin}/auth/callback`
    }

    const options: Parameters<typeof supabase.auth.signInWithOAuth>[0]['options'] = {
      redirectTo: getRedirectUrl(),
    }

    // Google은 YouTube 채널 정보 조회 스코프 추가 (창작자 본인 확인용)
    if (provider === 'google') {
      options.scopes = 'openid email profile https://www.googleapis.com/auth/youtube.readonly'
      options.queryParams = { access_type: 'offline', prompt: 'consent' }
    }

    await supabase.auth.signInWithOAuth({ provider, options })
  }

  if (!loginModalOpen) return null

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) closeLoginModal() }}
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 backdrop-blur-md"
      aria-modal="true"
      role="dialog"
    >
      <style>{`
        .force-hover-btn { position: relative; z-index: 50; transition: all 0.3s ease; }
        .force-hover-btn:hover { transform: scale(1.15) !important; filter: brightness(1.2) !important; }
        #modal-login-google:hover { box-shadow: 0 0 25px rgba(255,255,255,0.6) !important; border-color: rgba(255,255,255,0.8) !important; }
        #modal-login-discord:hover { box-shadow: 0 0 25px rgba(88,101,242,0.8) !important; border-color: rgba(88,101,242,0.8) !important; }
      `}</style>
      <div className="relative w-72 rounded-2xl bg-zinc-900/90 border border-white/10 shadow-2xl shadow-black/60 px-8 py-10 flex flex-col items-center gap-8 animate-[fadeScaleIn_0.2s_ease]">

        {/* 로고 */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <p className="text-zinc-400 text-xs tracking-widest uppercase">환영합니다</p>
        </div>

        {/* 소셜 버튼 */}
        <div className="flex items-center gap-6">

          {/* Google — 흰빛 glow */}
          <button
            id="modal-login-google"
            onClick={() => signIn('google')}
            aria-label="Google로 로그인"
            className="force-hover-btn w-14 h-14 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center cursor-pointer"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          </button>

          {/* 구분선 */}
          <span className="w-px h-5 bg-zinc-700" />

          {/* Discord — 파란 glow */}
          <button
            id="modal-login-discord"
            onClick={() => signIn('discord')}
            aria-label="Discord로 로그인"
            className="force-hover-btn w-14 h-14 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center cursor-pointer"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#5865F2">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.03.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
          </button>
        </div>

        <p className="text-zinc-700 text-[11px]">계속하면 이용약관에 동의한 것으로 간주됩니다</p>
      </div>
    </div>
  )
}
