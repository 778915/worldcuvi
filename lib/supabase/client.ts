import { createBrowserClient } from '@supabase/ssr'

const PLACEHOLDER_URL = 'https://your-project.supabase.co'
const PLACEHOLDER_KEY = 'your-anon-key-here'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? PLACEHOLDER_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? PLACEHOLDER_KEY

  // 환경변수 미설정 시 placeholder로 클라이언트 생성 (모의 클라이언트)
  // 실제 Supabase 호출은 실패하지만 URL validation 오류는 발생하지 않음
  return createBrowserClient(url, key)
}
