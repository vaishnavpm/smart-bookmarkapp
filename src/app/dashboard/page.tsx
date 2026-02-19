import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabaseServer'
import BookmarkList from '@/components/BookmarkList'
import LogoutButton from '@/components/LogoutButton'
import UserAvatar from '@/components/UserAvatar'
import AuthListener from '@/components/AuthListener'
import type { Bookmark } from '@/lib/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: bookmarks, error: bookmarksError } = await supabase
    .from('bookmarks')
    .select('id, user_id, title, url, created_at')
    .order('created_at', { ascending: false })

  if (bookmarksError) {
    console.error('Error fetching bookmarks:', bookmarksError.message)
  }

  const displayName: string =
    user.user_metadata?.full_name ?? user.email ?? 'User'
  const avatarUrl: string | undefined = user.user_metadata?.avatar_url

  return (
    <main className="min-h-screen relative">
      {/* Detects SIGNED_OUT across all tabs and redirects to /login */}
      <AuthListener />

      {/* Subtle background orbs for dashboard */}
      <div className="orb orb-1" style={{ opacity: 0.15 }} />
      <div className="orb orb-2" style={{ opacity: 0.12 }} />

      {/* Top navigation bar */}
      <nav
        className="sticky top-0 z-10"
        style={{
          background: 'rgba(10, 14, 26, 0.8)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--glass-border)',
        }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, var(--accent-start), var(--accent-end))',
                boxShadow: '0 0 15px var(--accent-glow)',
              }}
            >
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                />
              </svg>
            </div>
            <span className="font-semibold text-white">Smart Bookmarks</span>
          </div>

          {/* User section */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2.5">
              <UserAvatar name={displayName} avatarUrl={avatarUrl} />
              <span
                className="text-sm font-medium truncate max-w-[160px]"
                style={{ color: 'var(--text-secondary)' }}
              >
                {displayName}
              </span>
            </div>
            {/* Avatar only on mobile */}
            <div className="flex sm:hidden">
              <UserAvatar name={displayName} avatarUrl={avatarUrl} />
            </div>
            <LogoutButton />
          </div>
        </div>
      </nav>

      {/* Page content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 relative z-[1]">
        {bookmarksError && (
          <div
            className="mb-6 p-4 rounded-xl"
            style={{
              background: 'var(--danger-soft)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
            }}
          >
            <p className="text-sm text-red-400 font-medium">
              Could not load your bookmarks. Please refresh the page.
            </p>
          </div>
        )}
        <BookmarkList
          initialBookmarks={(bookmarks as Bookmark[]) ?? []}
          userId={user.id}
        />
      </div>
    </main>
  )
}
