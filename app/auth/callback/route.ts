import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // users 테이블에 upsert (첫 로그인 시 자동 등록)
        const { error: upsertError } = await supabase
          .from('users')
          .upsert(
            {
              id: user.id,
              email: user.email,
              nickname:
                user.user_metadata?.full_name ||
                user.user_metadata?.name ||
                user.email?.split('@')[0] ||
                'User',
              profile_img:
                user.user_metadata?.avatar_url ||
                user.user_metadata?.picture ||
                null,
              // 기본값 세팅 (DB default가 있으면 생략해도 무방)
              points: 0,
              is_creator: false,
              is_plus_subscriber: false,
            },
            {
              onConflict: 'id',       // 이미 존재하면 email/nickname/profile_img만 업데이트
              ignoreDuplicates: false,
            }
          )

        if (upsertError) {
          console.error('[Auth Callback] upsert error:', upsertError.message)
        }
      }

      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // 오류 시 로그인 페이지로 리다이렉트
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
