'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, ThumbsUp, ThumbsDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './AuthProvider'
import { useUI } from './UIProvider'
import { useAccent } from './ThemeProvider'
import './FeedbackSection.css'

interface FeedbackSectionProps {
  worldcupId: string
  initialLikes?: number
  initialUnlikes?: number
}

export default function FeedbackSection({ 
  worldcupId, 
  initialLikes = 0, 
  initialUnlikes = 0 
}: FeedbackSectionProps) {
  const { user } = useAuth()
  const [likes, setLikes] = useState(initialLikes)
  const [unlikes, setUnlikes] = useState(initialUnlikes)
  const [vote, setVote] = useState<'like' | 'unlike' | null>(null)
  const [showTooltip, setShowTooltip] = useState(false)
  const { openBoosterModal } = useUI()
  const { accentText } = useAccent()
  const supabase = createClient()
  const tooltipTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const fetchUserVote = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from('worldcup_feedback_logs')
        .select('is_like')
        .eq('worldcup_id', worldcupId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setVote(data.is_like ? 'like' : 'unlike');
      }
    };
    fetchUserVote();
  }, [worldcupId, user]);

  // Fetch counts from DB to ensure they are cumulative
  const fetchCounts = async () => {
    const { data, error } = await supabase
      .from('worldcups')
      .select('like_count, unlike_count')
      .eq('id', worldcupId)
      .single();
    
    if (data) {
      setLikes(data.like_count || 0);
      setUnlikes(data.unlike_count || 0);
    }
  };

  useEffect(() => {
    fetchCounts();
  }, [worldcupId]);

  const handleFeedback = async (type: 'like' | 'unlike') => {
    if (!user) {
      alert("로그인이 필요한 기능입니다.");
      return;
    }

    // Optimistic UI update for immediate feedback
    const prevVote = vote;
    const isRemove = vote === type;
    const isSwitch = vote !== null && vote !== type;

    try {
      // Immediate UI update before server response
      if (isRemove) {
        setVote(null);
        if (type === 'like') setLikes(v => Math.max(0, v - 1));
        else setUnlikes(v => Math.max(0, v - 1));
      } else if (isSwitch) {
        setVote(type);
        if (type === 'like') {
          setLikes(v => v + 1);
          setUnlikes(v => Math.max(0, v - 1));
        } else {
          setUnlikes(v => v + 1);
          setLikes(v => Math.max(0, v - 1));
        }
      } else {
        setVote(type);
        if (type === 'like') setLikes(v => v + 1);
        else setUnlikes(v => v + 1);
      }

      const { data: res, error } = await supabase.rpc('handle_worldcup_feedback', {
        target_worldcup_id: worldcupId,
        target_user_id: user.id,
        p_is_like: type === 'like'
      });

      if (error) throw error;
      
      // Secondary fetch to reconcile with DB truth
      fetchCounts();
      if (res === 'added' && type === 'like') triggerTooltip();

    } catch (err: any) {
      console.error("Feedback failed:", err.message);
      // Revert on error
      setVote(prevVote);
      fetchCounts();
    }
  }

  const triggerTooltip = () => {
    setShowTooltip(true)
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current)
    tooltipTimerRef.current = setTimeout(() => {
      setShowTooltip(false)
    }, 2000)
  }

  return (
    <div className="relative flex items-center justify-center gap-16 py-14 border border-black/5 dark:border-white/10 bg-white dark:bg-zinc-950 rounded-[3rem] mt-16 shadow-[0_40px_80px_-15px_rgba(0,0,0,0.3)] group/fb">
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#bf953f] to-transparent opacity-40 group-hover/fb:opacity-100 transition-opacity duration-700 pointer-events-none" />
      
      {/* Tooltip Overlay */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-6 z-[60]"
          >
            <div 
              onClick={() => {
                setShowTooltip(false)
                openBoosterModal()
              }}
              className="feedback-tooltip group bg-zinc-900 border border-white/10 px-6 py-3 rounded-2xl cursor-pointer hover:bg-zinc-800 transition-all flex items-center gap-3 whitespace-nowrap"
            >
              <Zap className="w-5 h-5 text-yellow-500 fill-yellow-500 animate-pulse" />
              <span className="text-white text-sm font-bold">
                이 작품이 마음에 드시나요? <span className="text-yellow-400">부스터를 선물해보세요! ⚡️</span>
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 추천 */}
      <div 
        onClick={() => handleFeedback('like')}
        className={`group flex flex-col items-center gap-4 cursor-pointer transition-all premium-hover ${vote === 'like' ? 'text-[var(--accent-1)] scale-110' : 'text-zinc-500'}`}
      >
        <div className={`p-6 rounded-3xl transition-all ${vote === 'like' ? 'bg-[var(--accent-1)]/30 shadow-[0_0_40px_10px_rgba(168,85,247,0.4)] border-2 border-[var(--accent-1)]' : 'bg-white dark:bg-zinc-900 border border-transparent dark:border-white/5 shadow-inner'}`}>
          <ThumbsUp className={`w-10 h-10 transition-transform ${vote === 'like' ? 'fill-[var(--accent-1)] animate-pulse' : ''}`} />
        </div>
        <div className="flex flex-col items-center leading-tight">
          <span className="text-base font-black tracking-tighter" style={{ color: accentText }}>추천</span>
          <RollingNumber value={likes} className="text-sm font-black opacity-90 mt-1" style={{ color: accentText }} />
        </div>
      </div>

      {/* 비추천 */}
      <div 
        onClick={() => handleFeedback('unlike')}
        className={`group flex flex-col items-center gap-4 cursor-pointer transition-all premium-hover ${vote === 'unlike' ? 'text-white scale-110' : 'text-zinc-500'}`}
      >
        <div className={`p-6 rounded-3xl transition-all ${vote === 'unlike' ? 'bg-zinc-400/40 shadow-[0_0_40px_10px_rgba(156,163,175,0.4)] border-2 border-zinc-400' : 'bg-white dark:bg-zinc-900 border border-transparent dark:border-white/5 shadow-inner'}`}>
          <ThumbsDown className={`w-10 h-10 transition-transform ${vote === 'unlike' ? 'fill-white animate-pulse' : ''}`} />
        </div>
        <div className="flex flex-col items-center leading-tight">
          <span className="text-base font-black tracking-tighter" style={{ color: accentText }}>비추천</span>
          <RollingNumber value={unlikes} className="text-sm font-black opacity-90 mt-1" style={{ color: accentText }} />
        </div>
      </div>
    </div>
  )
}

function RollingNumber({ value, className, style }: { value: number, className?: string, style?: React.CSSProperties }) {
  const formatted = value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toString()
  const characters = formatted.split('')

  return (
    <div className={`flex items-baseline justify-center h-[1.2em] leading-[1.2em] ${className}`} style={style}>
      {characters.map((char, i) => {
        const isDigit = !isNaN(parseInt(char))
        
        return (
          <span key={i} className="rolling-number-container" style={{ width: isDigit ? '0.6em' : 'auto' }}>
            {!isDigit ? (
              <span className="rolling-symbol">{char}</span>
            ) : (
              <motion.span 
                key={`${i}-${char}`} // Animate specific digit change
                initial={{ y: '100%' }}
                animate={{ y: '0%' }}
                transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
                className="rolling-number-list flex flex-col items-center"
              >
                <span className="rolling-digit h-[1.2em] flex items-center justify-center">{char}</span>
              </motion.span>
            )}
          </span>
        )
      })}
    </div>
  )
}
