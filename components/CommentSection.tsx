'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './AuthProvider'
import { useAccent } from './ThemeProvider'
import PlusUserBadge from './PlusUserBadge'
import './PlusUserBadge.css'
import { MessageSquare, Send } from 'lucide-react'

interface Comment {
  id: string
  content: string
  created_at: string
  user_id: string
  profiles: {
    nickname: string
    is_plus_subscriber: boolean
  }
}

export default function CommentSection({ worldcupId }: { worldcupId: string }) {
  const { user } = useAuth()
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)
  const { accentText } = useAccent()
  const supabase = createClient()

  const fetchComments = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('comments')
      .select(`
        id, content, created_at, user_id,
        profiles:user_id (nickname, is_plus_subscriber)
      `)
      .eq('worldcup_id', worldcupId)
      .order('created_at', { ascending: false })

    if (data) setComments(data as any[])
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !newComment.trim()) return

    const { error } = await supabase
      .from('comments')
      .insert({
        worldcup_id: worldcupId,
        user_id: user.id,
        content: newComment.trim()
      })

    if (!error) {
      setNewComment('')
      fetchComments()
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
          <button 
            type="submit"
            disabled={!newComment.trim()}
            className="absolute bottom-4 right-4 flex items-center gap-2 px-6 py-2.5 bg-[var(--accent-1)] text-white font-bold rounded-xl hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all shadow-lg shadow-[var(--accent-1)]/20"
          >
            <Send className="w-4 h-4" />
            등록
          </button>
        </form>
      ) : (
        <div className="mb-10 p-8 text-center rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-dashed border-zinc-300 dark:border-zinc-700">
          <p className="text-sm text-zinc-500 mb-4">로그인 후 댓글을 남길 수 있습니다.</p>
          <button className="px-6 py-2 bg-zinc-800 text-white rounded-xl text-sm font-bold">로그인하기</button>
        </div>
      )}

      {/* Comment List */}
      <div className="space-y-6">
        {loading ? (
          <div className="text-center py-10 opacity-50">불러오는 중...</div>
        ) : comments.length > 0 ? (
          comments.map((comment) => {
            const isPlus = comment.profiles?.is_plus_subscriber
            return (
              <div key={comment.id} className="group relative flex gap-4 p-4 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 flex-shrink-0 flex items-center justify-center font-bold text-zinc-400">
                  {comment.profiles?.nickname?.[0] || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={`text-sm font-bold transition-all ${isPlus ? 'plus-nickname' : 'text-foreground'}`}>
                      {comment.profiles?.nickname || '알 수 없음'}
                    </span>
                    {isPlus && <PlusUserBadge className="scale-75" />}
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-600 ml-auto">
                      {new Date(comment.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed break-words">
                    {comment.content}
                  </p>
                </div>
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
