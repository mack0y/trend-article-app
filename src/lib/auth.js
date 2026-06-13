import { supabase } from './supabase'

export async function getCurrentUser() {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  return session?.user ?? null
}

export async function getCurrentProfile() {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('id, email, role')
    .eq('id', user.id)
    .single()

  return data
}

export async function isAdmin() {
  const profile = await getCurrentProfile()
  return profile?.role === 'admin'
}
