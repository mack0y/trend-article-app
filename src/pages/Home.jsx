import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import ArticleCard from '../components/ArticleCard'
import TrendCard from '../components/TrendCard'

export default function Home() {
  const [articles, setArticles] = useState([])
  const [trends, setTrends] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadHome() {
      try {
        const [{ data: articleData }, { data: trendData }] = await Promise.all([
          supabase
            .from('articles')
            .select('*')
            .eq('status', 'published')
            .order('published_at', { ascending: false, nullsFirst: false })
            .limit(6),
          supabase
            .from('trends')
            .select('*')
            .eq('status', 'published')
            .order('created_at', { ascending: false })
            .limit(6),
        ])

        setArticles(articleData || [])
        setTrends(trendData || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadHome()
  }, [])

  return (
    <section className="page-stack">
      <div className="hero-section">
        <p className="eyebrow">Philippines and global impact trends</p>
        <h1>Find trending topics, generate articles, and publish them to your site.</h1>
        <p className="hero-copy">
          This app tracks Philippines-focused trends and global stories that may affect the Philippines,
          then helps you create English articles with AI assistance.
        </p>
        <div className="hero-actions">
          <Link className="primary-button" to="/trends">
            View trends
          </Link>
          <Link className="secondary-button" to="/articles">
            Read articles
          </Link>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}
      {loading && <div className="page-card">Loading latest content...</div>}

      {!loading && (
        <>
          <section>
            <div className="section-heading">
              <h2>Latest articles</h2>
              <Link to="/articles">View all</Link>
            </div>

            {articles.length === 0 ? (
              <div className="empty-state">No published articles yet.</div>
            ) : (
              <div className="card-grid">
                {articles.map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="section-heading">
              <h2>Current trends</h2>
              <Link to="/trends">View all trends</Link>
            </div>

            {trends.length === 0 ? (
              <div className="empty-state">No trends available yet. Use the admin panel to refresh trends.</div>
            ) : (
              <div className="card-grid">
                {trends.map((trend) => (
                  <TrendCard key={trend.id} trend={trend} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </section>
  )
}
