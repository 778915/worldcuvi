export function calculateBoostPriority(
  baseScore: number,
  stackCount: number,
  elapsedHours: number,
  isNewContent: boolean
): number {
  /**
   * 부스터 노출 알고리즘 최적화 우선순위 로직
   * 공식: (기본 점수 * 중첩 개수) / (경과 시간 + 1) * (신규 콘텐츠 가중치)
   * 
   * - 기본 점수: 월드컵의 자체 화제성 인덱스 (조회수, 참여도 기반 판별값)
   * - 중첩 개수 (stackCount): 다수의 유저가 한 월드컵에 부스터를 밀어줄 수록 기하급수적 상승
   * - 경과 시간 (elapsedHours): 현재 최대 3시간 지속. 시간이 지날수록 부모 항을 나누어 점차 하락함. (+1 을 줘서 0시간일때 무한대 방지)
   * - 신규 콘텐츠 (isNewContent): 작성된 지 1달 이내의 신규 월드컵이면 1.2배의 가중치를 부여하여 뉴비 진입 장벽 완화
   */
  const timeDecay = Math.max(0, elapsedHours) + 1; // 0 이하 방지, 최소 분모 1
  const freshnessMultiplier = isNewContent ? 1.2 : 1.0;

  const rawPriority = (baseScore * stackCount) / timeDecay;
  
  return rawPriority * freshnessMultiplier;
}
