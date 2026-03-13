export interface WorldCup {
  id: string | number;
  rank?: number;
  title: string;
  plays: number;
  category: string;
  creatorImg?: string;
  thumb?: string;
  emoji?: string;
  color?: string;
  score?: number;
  likes?: number;
  unlikes?: number;
}

export interface Banner {
  id: number;
  type: string;
  title: string;
  desc: string;
  bg: string;
}

export interface Notification {
  id: number;
  title: string;
  time: string;
  link: string;
  type?: 'reply' | 'rank' | 'follow' | 'booster' | 'gift';
}

export interface Booster {
  id: number;
  title: string;
  link: string;
  timeLeft: string;
  viewsDiff: number;
  rankDiff: number;
}

export const MOCK_TRENDING_WORLDCUPS: WorldCup[] = [];

export const MOCK_NEW_WORLDCUPS: WorldCup[] = [];

export const MOCK_PODIUM_WORLDCUPS: WorldCup[] = [
  { id: 'p2', rank: 2, title: '2024 K-POP 아이돌', plays: 95200, category: '연예', creatorImg: 'https://i.pravatar.cc/150?u=2', thumb: 'https://images.unsplash.com/photo-1543857778-c4a1a3e0b2eb?q=80&w=400&h=225&fit=crop' },
  { id: 'p1', rank: 1, title: '역대 최고 축구 선수', plays: 128400, category: '스포츠', creatorImg: 'https://i.pravatar.cc/150?u=1', thumb: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=400&h=225&fit=crop' },
  { id: 'p3', rank: 3, title: '한국 음식 최강자', plays: 72000, category: '음식', creatorImg: 'https://i.pravatar.cc/150?u=3', thumb: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?q=80&w=400&h=225&fit=crop' }
];

export const MOCK_BANNERS: Banner[] = [
  { id: 1, type: '안내', title: '당신이 가장 좋아하는\n영상에 투표하세요!', desc: '다양한 테마의 월드컵에 참여하고 당신의 취향을 공유해보세요', bg: 'from-violet-600 to-indigo-600' },
  { id: 2, type: '랭킹 #1', title: '주간 인기 월드컵 1', desc: '이번 주 가장 핫한 작품', bg: 'from-blue-600 to-cyan-600' },
  { id: 3, type: '랭킹 #2', title: '주간 인기 월드컵 2', desc: '놓치기 아쉬운 트렌드', bg: 'from-emerald-600 to-teal-600' },
  { id: 4, type: '랭킹 #3', title: '주간 인기 월드컵 3', desc: '유저들의 끝없는 선택', bg: 'from-orange-600 to-amber-600' },
  { id: 5, type: '랭킹 #4', title: '주간 인기 월드컵 4', desc: '화제의 중심', bg: 'from-pink-600 to-rose-600' },
  { id: 6, type: 'AD', title: '스폰서 추천 1', desc: '광고 입찰 슬롯', bg: 'from-zinc-700 to-zinc-900' },
  { id: 7, type: 'AD', title: '스폰서 추천 2', desc: '광고 입찰 슬롯', bg: 'from-zinc-800 to-black' },
];

export const MOCK_NOTIFICATIONS: Notification[] = [];
export const MOCK_BOOSTERS: Booster[] = [];
