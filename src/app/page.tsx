import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabaseServer'

// Root page — redirects based on auth state.
// Middleware handles most redirects; this is a fallback.
export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  } else {
    redirect('/login')
  }
}
