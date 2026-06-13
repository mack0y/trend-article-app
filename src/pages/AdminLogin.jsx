import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(event) {
    event.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    navigate('/admin/trends')
  }

  return (
    <section className="page-stack narrow">
      <p className="eyebrow">Admin access</p>
      <h1>Log in</h1>
      <p>Use this area to refresh trends, generate articles, edit drafts, and publish.</p>

      {error && <div className="error-box">{error}</div>}

      <form className="form-card" onSubmit={handleLogin}>
        <label>
          Email
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>

        <button className="primary-button full-width" type="submit" disabled={loading}>
          {loading ? 'Signing in...' : 'Log in'}
        </button>
      </form>
    </section>
  )
}
