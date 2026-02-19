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
    <main className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Decorative background orbs */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        <div className="glass-strong rounded-2xl p-8 text-center shadow-2xl">
          {/* Logo */}
          <div className="mb-8">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style={{
                background: 'linear-gradient(135deg, var(--accent-start), var(--accent-end))',
                boxShadow: '0 0 30px var(--accent-glow)',
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
                  strokeWidth={2}
                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white">Smart Bookmarks</h1>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Save and access your favorite links from anywhere, instantly.
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div
              className="mb-5 p-3 rounded-xl"
              style={{
                background: 'var(--danger-soft)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
              }}
            >
              <p className="text-sm text-red-400">
                Sign-in failed. Please try again.
              </p>
            </div>
          )}

          <LoginButton />

          <p className="text-xs mt-6 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>

        <p className="text-center text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
          Your bookmarks are private and only visible to you.
        </p>
      </div>
    </main>
  )
}
