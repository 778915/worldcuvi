import { createBrowserClient } from '@supabase/ssr'

/**
 * [Client-Side Supabase Client]
 * 브라우저 환경에서 실행되며, 공개 키(ANON_KEY)를 사용합니다.
 * RLS(Row Level Security) 정책에 따라 유저가 허용된 데이터만 접근할 수 있습니다.
 */

export function createClient() {
  // 환경변수가 없을 경우에 대한 런타임 경고 (개발 단계에서 버그 잡기용)
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '⚠️ Supabase 환경 변수가 설정되지 않았습니다. PLACEHOLDER를 사용합니다.'
      )
    }
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  // createBrowserClient는 내부적으로 싱글톤 패턴을 어느 정도 처리하지만,
  // 클라이언트 사이드에서 일관된 인스턴스를 보장합니다.
  return createBrowserClient(url, key)
}