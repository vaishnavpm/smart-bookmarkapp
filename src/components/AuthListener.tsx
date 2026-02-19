'use client'

import { useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'

/**
 * Invisible component that listens for auth state changes across all tabs.
 *
 * How cross-tab detection works:
 *   Supabase stores the session in localStorage. When Tab A calls signOut(),
 *   it removes the session from localStorage. The browser fires a `storage`
 *   event in every other same-origin tab. Supabase's onAuthStateChange picks
 *   this up and fires with event = 'SIGNED_OUT' — so Tab B redirects to
 *   /login automatically, without any polling.
 */
export default function AuthListener() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        router.push('/login')
        router.refresh()
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase, router])

  return null
}
