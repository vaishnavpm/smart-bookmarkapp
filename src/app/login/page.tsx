import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabaseServer'
import LoginButton from '@/components/LoginButton'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  const { error } = await searchParams

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          {/* Logo */}
          <div className="mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <svg
                className="w-8 h-8 text-white"
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
            <h1 className="text-2xl font-bold text-gray-900">Smart Bookmarks</h1>
            <p className="text-gray-500 mt-2 text-sm leading-relaxed">
              Save and access your favorite links from anywhere, instantly.
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-5 p-3 bg-red-50 border border-red-100 rounded-xl">
              <p className="text-sm text-red-600">
                Sign-in failed. Please try again.
              </p>
            </div>
          )}

          <LoginButton />

          <p className="text-xs text-gray-400 mt-6 leading-relaxed">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Your bookmarks are private and only visible to you.
        </p>
      </div>
    </main>
  )
}
