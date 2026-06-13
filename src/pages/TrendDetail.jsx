import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function TrendDetail() {
  const { id } = useParams()
  const [trend, setTrend] = useState(null)
  const [sources, setSources] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadTrend() {
      try {
        const [{ data: trendData }, { data: sourceData }] = await Promise.all([
          supabase.from('trends').select('*').eq('id', id).single(),
          supabase
            .from('trend_sources')
            .select('*')
            .eq('trend_id', id)
            .order('published_at', { ascending: false, nullsFirst: true }),
        ])

        if (!trendData) throw new Error('Trend not found.')
        setTrend(trendData)
        setSources(sourceData || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    if (id) loadTrend()
  }, [id])

  if (loading) return <div className="page-card">Loading trend...</div>
  if (error) return <div className="error-box">{error}</div>
  if (!trend) return <div className="page-card">Trend not found.</div>

  return (
    <section className="page-stack narrow">
      <p className="eyebrow">{trend.category || 'Trend'}</p>
      <h1>{trend.title}</h1>
      <p className="lead">{trend.summary}</p>

      <div className="info-grid">
        <div>
          <strong>Impact score</strong>
          <span>{trend.impact_score ?? 'N/A'}</span>
        </div>
        <div>
          <strong>Updated</strong>
          <span>{new Date(trend.created_at).toLocaleString()}</span>
        </div>
      </div>

      <div className="page-actions">
        <Link className="primary-button" to={`/admin/generate/${trend.id}`}>
          Generate article
        </Link>
        <Link className="secondary-button" to="/trends">
          Back to trends
        </Link>
      </div>

      <section className="page-card">
        <h2>Sources</h2>
        {sources.length === 0 ? (
          <p>No sources saved for this trend.</p>
        ) : (
          <ul className="source-list">
            {sources.map((source) => (
              <li key={source.id}>
                <a href={source.source_url} target="_blank" rel="noreferrer">
                  {source.source_name || 'Source'}
                </a>
                {source.published_at && <span> · {new Date(source.published_at).toLocaleString()}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  )
}
