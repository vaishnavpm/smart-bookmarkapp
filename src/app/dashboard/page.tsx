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
    <main className="min-h-screen bg-gray-50">
      {/* Detects SIGNED_OUT across all tabs and redirects to /login */}
      <AuthListener />

      {/* Top navigation bar */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
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
            <span className="font-semibold text-gray-900">Smart Bookmarks</span>
          </div>

          {/* User section */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2.5">
              <UserAvatar name={displayName} avatarUrl={avatarUrl} />
              <span className="text-sm text-gray-700 font-medium truncate max-w-[160px]">
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {bookmarksError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl">
            <p className="text-sm text-red-600 font-medium">
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
