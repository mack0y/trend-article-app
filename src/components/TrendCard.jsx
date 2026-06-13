import { Link } from 'react-router-dom'

export default function TrendCard({ trend }) {
  return (
    <article className="trend-card">
      <div className="card-topline">
        <span className="pill">{trend.category || 'Trend'}</span>
        <span className="muted">{new Date(trend.created_at).toLocaleString()}</span>
      </div>

      <h3>{trend.title}</h3>
      <p>{trend.summary}</p>

      <div className="card-actions">
        <Link className="text-link" to={`/trends/${trend.id}`}>
          View sources
        </Link>
        <Link className="primary-link" to={`/admin/generate/${trend.id}`}>
          Generate article
        </Link>
      </div>
    </article>
  )
}
