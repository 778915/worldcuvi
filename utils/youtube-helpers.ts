/**
 * 브라우저와 서버 어디서든 안전하게 쓸 수 있는 순수 URL 분석 함수들만 모아둡니다.
 * 서버 전용 모듈(next/headers 등)과의 의존성을 완전히 제거했습니다.
 */

export function extractVideoId(url: string): string | null {
  if (!url) return null;
  // Shorts, 일반 영상, 모바일 주소 등을 모두 포함하는 정규표현식
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  
  // 만약 위 정규식으로 안 잡힐 경우 (Shorts 등) 추가 체크
  if (!match || match[2].length !== 11) {
    const shortsRegex = /\/shorts\/([^?&/ ]{11})/;
    const shortsMatch = url.match(shortsRegex);
    return shortsMatch ? shortsMatch[1] : null;
  }
  
  return (match && match[2].length === 11) ? match[2] : null;
}

export function extractPlaylistId(url: string): string | null {
  if (!url) return null;
  const regExp = /[?&]list=([^#&?]+)/;
  const match = url.match(regExp);
  return match ? match[1] : null;
}
