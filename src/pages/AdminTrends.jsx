import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { invokeFunction } from '../lib/api'
import TrendCard from '../components/TrendCard'

export default function AdminTrends() {
  const [trends, setTrends] = useState([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function loadTrends() {
    setLoading(true)
    setError('')

    try {
      const { data, error } = await supabase
        .from('trends')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setTrends(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function refreshTrends() {
    setRefreshing(true)
    setError('')
    setMessage('')

    try {
      const result = await invokeFunction('fetch-trends', { force: true })
      setMessage(result.message || 'Trends refreshed.')
      await loadTrends()
    } catch (err) {
      setError(err.message)
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadTrends()
  }, [])

  return (
    <section className="page-stack">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>Trends</h1>
        </div>
        <button className="primary-button" type="button" onClick={refreshTrends} disabled={refreshing}>
          {refreshing ? 'Refreshing...' : 'Refresh trends'}
        </button>
      </div>

      {error && <div className="error-box">{error}</div>}
      {message && <div className="success-box">{message}</div>}
      {loading && <div className="page-card">Loading trends...</div>}

      {!loading && trends.length === 0 && (
        <div className="empty-state">No trends found. Click refresh trends to fetch the latest topics.</div>
      )}

      {!loading && trends.length > 0 && (
        <div className="card-grid">
          {trends.map((trend) => (
            <TrendCard key={trend.id} trend={trend} />
          ))}
        </div>
      )}
    </section>
  )
}
