import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ProtectedRoute({ children }) {
  const [checking, setChecking] = useState(true)
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    let mounted = true

    async function checkAccess() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session || !mounted) {
        setAllowed(false)
        setChecking(false)
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (mounted) {
        setAllowed(profile?.role === 'admin')
        setChecking(false)
      }
    }

    checkAccess()

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!nextSession) {
        setAllowed(false)
        setChecking(false)
        return
      }

      supabase
        .from('profiles')
        .select('role')
        .eq('id', nextSession.user.id)
        .single()
        .then(({ data }) => {
          if (mounted) {
            setAllowed(data?.role === 'admin')
            setChecking(false)
          }
        })
    })

    return () => {
      mounted = false
      authListener.subscription.unsubscribe()
    }
  }, [])

  if (checking) {
    return <div className="page-card">Checking access...</div>
  }

  return allowed ? children : <Navigate to="/admin/login" replace />
}
