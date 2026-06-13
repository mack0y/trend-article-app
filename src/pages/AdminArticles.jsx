import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function AdminArticles() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function loadArticles() {
    setLoading(true)
    setError('')

    try {
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setArticles(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function toggleStatus(article) {
    const nextStatus = article.status === 'published' ? 'draft' : 'published'

    const { error } = await supabase
      .from('articles')
      .update({
        status: nextStatus,
        published_at: nextStatus === 'published' ? new Date().toISOString() : null,
      })
      .eq('id', article.id)

    if (error) {
      setError(error.message)
      return
    }

    setMessage(`Article ${nextStatus}.`)
    await loadArticles()
  }

  useEffect(() => {
    loadArticles()
  }, [])

  return (
    <section className="page-stack">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>Articles</h1>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}
      {message && <div className="success-box">{message}</div>}
      {loading && <div className="page-card">Loading articles...</div>}

      {!loading && articles.length === 0 && (
        <div className="empty-state">No articles yet. Generate an article from the trends page.</div>
      )}

      {!loading && articles.length > 0 && (
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Published</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {articles.map((article) => (
                <tr key={article.id}>
                  <td>{article.title}</td>
                  <td>
                    <span className="pill">{article.status}</span>
                  </td>
                  <td>{article.published_at ? new Date(article.published_at).toLocaleDateString() : '—'}</td>
                  <td className="action-cell">
                    <Link className="text-link" to={`/admin/generate/${article.trend_id}`}>
                      Edit
                    </Link>
                    {article.status === 'published' && (
                      <Link className="text-link" to={`/articles/${article.slug}`}>
                        View
                      </Link>
                    )}
                    <button className="text-button" type="button" onClick={() => toggleStatus(article)}>
                      {article.status === 'published' ? 'Unpublish' : 'Publish'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
