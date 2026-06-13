import { useEffect, useState } from 'react'
import ArticleCard from '../components/ArticleCard'
import { supabase } from '../lib/supabase'

export default function Articles() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadArticles() {
      try {
        const { data, error } = await supabase
          .from('articles')
          .select('*')
          .eq('status', 'published')
          .order('published_at', { ascending: false, nullsFirst: false })

        if (error) throw error
        setArticles(data || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadArticles()
  }, [])

  return (
    <section className="page-stack">
      <div>
        <p className="eyebrow">Published articles</p>
        <h1>Articles</h1>
      </div>

      {error && <div className="error-box">{error}</div>}
      {loading && <div className="page-card">Loading articles...</div>}

      {!loading && articles.length === 0 && (
        <div className="empty-state">No published articles yet.</div>
      )}

      {!loading && articles.length > 0 && (
        <div className="article-list">
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </section>
  )
}
