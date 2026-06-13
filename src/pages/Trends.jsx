import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import TrendCard from '../components/TrendCard'

export default function Trends() {
  const [trends, setTrends] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadTrends() {
      try {
        const { data, error } = await supabase
          .from('trends')
          .select('*')
          .in('status', ['published', 'new'])
          .order('created_at', { ascending: false })

        if (error) throw error
        setTrends(data || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadTrends()
  }, [])

  return (
    <section className="page-stack">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Trending topics</p>
          <h1>Trending topics</h1>
        </div>
        <Link className="primary-button" to="/admin/trends">
          Admin refresh
        </Link>
      </div>

      {error && <div className="error-box">{error}</div>}
      {loading && <div className="page-card">Loading trends...</div>}

      {!loading && trends.length === 0 && (
        <div className="empty-state">No trends found yet.</div>
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
