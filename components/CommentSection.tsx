'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useAuth } from './AuthProvider'
import { useAccent } from './ThemeProvider'
import PremiumUserBadge from './PremiumUserBadge'
import './PremiumUserBadge.css'
import { MessageSquare, Send, MoreVertical, Pencil, Trash, X, Check } from 'lucide-react'
import PremiumHover from './PremiumHover'

interface Comment {
  id: string
  content: string
  created_at: string
  user_id: string
  users: {
    nickname: string
    is_plus_subscriber: boolean
  }
}

export default function CommentSection({ worldcupId }: { worldcupId: string }) {
  const { user } = useAuth()
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const { accentText } = useAccent()
  const supabase = createClient()
  const router = useRouter()

  const fetchComments = async () => {
    setLoading(true)
    try {
      // 1. 댓글 기본 정보 가져오기
      const { data: commentData, error: commentError } = await supabase
        .from('comments')
        .select('id, content, created_at, user_id')
        .eq('worldcup_id', worldcupId)
        .order('created_at', { ascending: false })

      if (commentError) throw commentError;
      if (!commentData || commentData.length === 0) {
        setComments([]);
        return;
      }

      // 2. 유니크한 유저 ID 목록 추출
      const userIds = Array.from(new Set(commentData.map(c => c.user_id)));

      // 3. 유저 정보 일괄 가져오기 (조인이 안 될 때를 대비한 수동 조인)
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, nickname, is_plus_subscriber')
        .in('id', userIds)

      if (userError) throw userError;

      // 4. 데이터 매핑
      const userMap = new Map(userData.map(u => [u.id, u]));
      const joinedComments = commentData.map(c => ({
        ...c,
        users: userMap.get(c.user_id) || { nickname: '알 수 없음', is_plus_subscriber: false }
      }));

      setComments(joinedComments as any[])
    } catch (err) {
      console.error("Fetch comments failed:", err);
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !newComment.trim()) return

    try {
      const { error } = await supabase
        .from('comments')
        .insert({
          worldcup_id: worldcupId,
          user_id: user.id,
          content: newComment.trim()
        })

      if (error) throw error;
      
      setNewComment('')
      fetchComments()
    } catch (err) {
      console.error("Comment submission failed:", err);
      alert("댓글 등록에 실패했습니다.");
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm("정말 이 댓글을 삭제하시겠습니까? (삭제 후 복구할 수 없습니다.) 🗑️")) return
    
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', id)
        .eq('user_id', user?.id)

      if (error) throw error
      fetchComments()
    } catch (err) {
      console.error("Delete failed:", err)
      alert("삭제 중 오류가 발생했습니다.")
    }
  }

  const handleUpdate = async (id: string) => {
    if (!editText.trim()) return
    
    try {
      const { error } = await supabase
        .from('comments')
        .update({ content: editText.trim() })
        .eq('id', id)
        .eq('user_id', user?.id)

      if (error) throw error
      setEditingId(null)
      fetchComments()
    } catch (err) {
      console.error("Update failed:", err)
      alert("수정 중 오류가 발생했습니다.")
    }
  }

  useEffect(() => {
    fetchComments()
  }, [worldcupId])

  return (
    <div className="mt-12 bg-white dark:bg-black rounded-3xl border border-black/5 dark:border-white/10 p-8 shadow-xl">
      <h3 className="text-xl font-bold mb-8 flex items-center gap-2" style={{ color: accentText }}>
        <MessageSquare className="w-6 h-6" style={{ color: accentText }} />
        댓글 <span style={{ color: accentText }}>{comments.length}</span>
      </h3>

      {/* Comment Input */}
      {user ? (
        <form onSubmit={handleSubmit} className="mb-10 relative">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="따뜻한 댓글을 남겨주세요."
            className="w-full h-32 p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-black/5 dark:border-white/5 focus:ring-2 ring-[var(--accent-1)] focus:outline-none transition-all resize-none text-sm text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
          />
          <PremiumHover disabled={!newComment.trim()} className="absolute bottom-4 right-4 rounded-xl">
            <button 
              type="submit"
              disabled={!newComment.trim()}
              className="flex items-center gap-2 px-6 py-2.5 bg-[var(--accent-1)] text-white font-bold rounded-xl disabled:opacity-50 transition-all shadow-lg shadow-[var(--accent-1)]/20"
            >
              <Send className="w-4 h-4" />
              등록
            </button>
          </PremiumHover>
        </form>
      ) : (
        <div className="mb-10 p-8 text-center rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-dashed border-zinc-300 dark:border-zinc-700">
          <p className="text-sm text-zinc-500 mb-4">로그인 후 댓글을 남길 수 있습니다.</p>
          <PremiumHover onClick={() => router.push('/login')} className="inline-block rounded-xl">
            <button className="px-6 py-2 bg-zinc-800 text-white rounded-xl text-sm font-bold">로그인하기</button>
          </PremiumHover>
        </div>
      )}

      {/* Comment List */}
      <div className="space-y-6">
        {loading ? (
          <div className="text-center py-10 opacity-50">불러오는 중...</div>
        ) : comments.length > 0 ? (
          comments.map((comment) => {
            const isPlus = comment.users?.is_plus_subscriber
            return (
              <div 
                key={comment.id} 
                className="group relative flex gap-5 p-8 rounded-[2.5rem] bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-white/5 hover:border-[var(--accent-1)]/50 hover:bg-white dark:hover:bg-black transition-all duration-500 z-0 hover:z-10 shadow-sm"
              >
                {/* User Avatar */}
                <div 
                  className="w-16 h-16 rounded-2xl bg-white dark:bg-zinc-800 flex-shrink-0 flex items-center justify-center font-black text-2xl border-2 border-zinc-100 dark:border-zinc-700 shadow-md transform -rotate-2 group-hover:rotate-0 transition-transform duration-500"
                  style={{ color: accentText }}
                >
                  {comment.users?.nickname?.[0] || '?'}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-col mb-4 pr-24">
                    <div className="flex items-center gap-2">
                      <span className={`text-xl font-black tracking-tighter transition-all ${isPlus ? 'plus-nickname' : 'text-foreground'}`}>
                        {comment.users?.nickname || '알 수 없음'}
                      </span>
                      {isPlus && <PremiumUserBadge className="scale-100" />}
                    </div>
                    <span className="text-xs text-zinc-400 dark:text-zinc-600 font-black uppercase tracking-widest mt-1">
                      {new Date(comment.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  
                  {editingId === comment.id ? (
                    <div className="mt-2">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full p-6 rounded-3xl bg-zinc-50 dark:bg-zinc-900 border-2 border-[var(--accent-1)] focus:outline-none text-lg leading-relaxed resize-none h-40 shadow-2xl shadow-[var(--accent-1)]/10"
                        autoFocus
                      />
                      <div className="flex justify-end gap-3 mt-4">
                        <button 
                          onClick={() => setEditingId(null)} 
                          className="px-6 py-3 rounded-xl text-base font-black text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/10 transition-all"
                        >
                          취소
                        </button>
                        <button 
                          onClick={() => handleUpdate(comment.id)} 
                          className="px-10 py-3 rounded-xl text-base font-black bg-[var(--accent-1)] text-white hover:scale-110 active:scale-95 transition-all shadow-xl shadow-[var(--accent-1)]/30"
                        >
                          저장
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[17px] text-zinc-800 dark:text-zinc-200 leading-relaxed break-words font-semibold pr-16">
                      {comment.content}
                    </p>
                  )}
                </div>

                {/* Top Right Owner Actions - Persistent for owner, high-end interaction */}
                {user?.id === comment.user_id && editingId !== comment.id && (
                  <div className="absolute top-8 right-8 flex items-center gap-3 opacity-60 group-hover:opacity-100 transition-all duration-300 z-30 translate-x-4 group-hover:translate-x-0">
                    <PremiumHover className="rounded-2xl shrink-0" onClick={() => { setEditingId(comment.id); setEditText(comment.content); }}>
                      <button 
                        className="p-3 bg-white dark:bg-zinc-800 hover:bg-[var(--accent-1)] hover:text-white rounded-2xl text-zinc-400 transition-all shadow-xl border border-zinc-100 dark:border-white/5 active:scale-95" 
                        title="수정"
                      >
                        <Pencil className="w-5 h-5" />
                      </button>
                    </PremiumHover>
                    <PremiumHover className="rounded-2xl shrink-0" onClick={() => handleDelete(comment.id)}>
                      <button 
                        className="p-3 bg-white dark:bg-zinc-800 hover:bg-[var(--accent-1)] hover:text-white rounded-2xl text-zinc-400 transition-all shadow-xl border border-zinc-100 dark:border-white/5 active:scale-95" 
                        title="삭제"
                      >
                        <X className="w-6 h-6 font-black" />
                      </button>
                    </PremiumHover>
                  </div>
                )}
              </div>
            )
          })
        ) : (
          <div className="text-center py-20 text-sm font-medium" style={{ color: accentText }}>
            아직 댓글이 없습니다. 첫 번째 댓글을 남겨보세요!
          </div>
        )}
      </div>
    </div>
  )
}
