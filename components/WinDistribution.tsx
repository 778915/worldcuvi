"use client";

import { useMemo } from "react";
import { Trophy } from "lucide-react";

// DB에서 가져올 후보자 데이터 타입
interface Candidate {
  id: string;
  title: string;
  thumbnail_url?: string; // 유튜브 썸네일 등
  win_count: number;
}

export function WinDistribution({ candidates }: { candidates: Candidate[] }) {
  // 1. 전체 우승 횟수 총합 구하기
  const totalWins = useMemo(() => {
    return candidates.reduce((sum, candidate) => sum + candidate.win_count, 0);
  }, [candidates]);

  // 2. 우승 비율 계산 및 1등부터 줄 세우기(내림차순 정렬)
  const rankedCandidates = useMemo(() => {
    return [...candidates]
      .map((c) => ({
        ...c,
        winRate: totalWins > 0 ? (c.win_count / totalWins) * 100 : 0, // 백분율 계산
      }))
      .sort((a, b) => b.win_count - a.win_count); // 1등이 맨 위로 오게 정렬
  }, [candidates, totalWins]);

  if (totalWins === 0) {
    return (
      <div className="p-8 text-center text-zinc-500 bg-zinc-900/50 rounded-2xl border border-zinc-800">
        아직 우승 데이터가 없습니다. 당신이 첫 번째 결과를 만들어주세요!
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-6 md:p-8 max-w-3xl mx-auto w-full">
      <h3 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
        <Trophy className="w-6 h-6 text-amber-500" />
        종합 우승 랭킹
      </h3>

      <div className="space-y-4">
        {rankedCandidates.map((candidate, index) => {
          // 1등은 특별하게 금색으로 칠해줍니다!
          const isFirst = index === 0;
          
          return (
            <div key={candidate.id} className="relative overflow-hidden rounded-xl bg-black border border-zinc-800 p-4 z-0">
              
              {/* 🚀 뒷배경 프로그레스 바 (게이지 채워지는 효과) */}
              <div 
                className={`absolute left-0 top-0 bottom-0 z-[-1] transition-all duration-1000 ease-out opacity-20 ${
                  isFirst ? 'bg-amber-500' : 'bg-indigo-500'
                }`}
                style={{ width: `${candidate.winRate}%` }}
              />

              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {/* 등수 표시 */}
                  <span className={`font-black text-lg w-6 ${isFirst ? 'text-amber-500' : 'text-zinc-500'}`}>
                    {index + 1}
                  </span>
                  
                  {/* 영상 제목 */}
                  <span className={`font-bold truncate ${isFirst ? 'text-white' : 'text-zinc-300'}`}>
                    {candidate.title}
                  </span>
                </div>

                {/* 퍼센트 및 횟수 표시 */}
                <div className="text-right whitespace-nowrap">
                  <div className={`font-black text-lg ${isFirst ? 'text-amber-500' : 'text-indigo-400'}`}>
                    {candidate.winRate.toFixed(1)}%
                  </div>
                  <div className="text-xs text-zinc-500">
                    {candidate.win_count.toLocaleString()}회 우승
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
