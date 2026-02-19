'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import AddBookmarkForm from '@/components/AddBookmarkForm'
import BookmarkCard from '@/components/BookmarkCard'
import type { Bookmark } from '@/lib/types'

const PAGE_SIZE = 10

interface BookmarkListProps {
  initialBookmarks: Bookmark[]
  userId: string
}

export default function BookmarkList({ initialBookmarks, userId }: BookmarkListProps) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(initialBookmarks)
  const [isAdding, setIsAdding] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()

  const totalPages = Math.max(1, Math.ceil(bookmarks.length / PAGE_SIZE))

  // Clamp current page when bookmarks are deleted and the page no longer exists
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [bookmarks.length, currentPage, totalPages])

  const paginatedBookmarks = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return bookmarks.slice(start, start + PAGE_SIZE)
  }, [bookmarks, currentPage])

  // Redirect to login if the session is gone (e.g. expired mid-action)
  const redirectIfUnauthenticated = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      router.refresh()
    }
  }, [supabase, router])

  // ─── Realtime (cross-tab sync) ────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('bookmarks-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bookmarks' },
        (payload) => {
          const incoming = payload.new as Bookmark
          setBookmarks((prev) => {
            if (prev.some((b) => b.id === incoming.id)) return prev
            return [incoming, ...prev]
          })
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'bookmarks' },
        (payload) => {
          const deletedId = (payload.old as { id: string }).id
          setBookmarks((prev) => prev.filter((b) => b.id !== deletedId))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, userId])

  // ─── Add (optimistic) ─────────────────────────────────────────────────────
  const handleAdd = async (title: string, url: string) => {
    setIsAdding(true)

    const tempId = `optimistic-${Date.now()}`
    const optimistic: Bookmark = {
      id: tempId,
      user_id: userId,
      title,
      url,
      created_at: new Date().toISOString(),
    }

    setBookmarks((prev) => [optimistic, ...prev])
    setCurrentPage(1)

    const { data, error } = await supabase
      .from('bookmarks')
      .insert({ title, url, user_id: userId })
      .select()
      .single()

    if (error) {
      setBookmarks((prev) => prev.filter((b) => b.id !== tempId))
      await redirectIfUnauthenticated()
      console.error('Error adding bookmark:', error.message)
    } else if (data) {
      setBookmarks((prev) =>
        prev.map((b) => (b.id === tempId ? (data as Bookmark) : b))
      )
    }

    setIsAdding(false)
  }

  // ─── Delete (optimistic) ──────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    const snapshot = bookmarks

    setBookmarks((prev) => prev.filter((b) => b.id !== id))

    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      setBookmarks(snapshot)
      await redirectIfUnauthenticated()
      console.error('Error deleting bookmark:', error.message)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">My Bookmarks</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          {bookmarks.length} saved {bookmarks.length === 1 ? 'link' : 'links'}
        </p>
      </div>

      <AddBookmarkForm onAdd={handleAdd} isLoading={isAdding} existingBookmarks={bookmarks} />

      {bookmarks.length === 0 ? (
        <div className="text-center py-16 glass rounded-2xl">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{
              background: 'linear-gradient(135deg, var(--accent-start), var(--accent-end))',
              boxShadow: '0 0 25px var(--accent-glow)',
              animation: 'pulse-glow 3s ease-in-out infinite',
            }}
          >
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
              />
            </svg>
          </div>
          <h3 className="text-white font-medium">No bookmarks yet</h3>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Add your first bookmark using the form above
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-3">
            {paginatedBookmarks.map((bookmark) => (
              <BookmarkCard
                key={bookmark.id}
                bookmark={bookmark}
                onDelete={handleDelete}
              />
            ))}
          </div>

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer hover:scale-[1.02]"
                style={{
                  color: 'var(--text-secondary)',
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--glass-border)',
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Prev
              </button>

              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Page <span className="font-medium text-white">{currentPage}</span> of{' '}
                <span className="font-medium text-white">{totalPages}</span>
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer hover:scale-[1.02]"
                style={{
                  color: 'var(--text-secondary)',
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--glass-border)',
                }}
              >
                Next
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
