import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { supabase } from '../lib/supabase'

export default function ArticleDetail() {
  const { slug } = useParams()
  const [article, setArticle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadArticle() {
      try {
        const { data, error } = await supabase
          .from('articles')
          .select('*, trends(title, summary, category)')
          .eq('slug', slug)
          .eq('status', 'published')
          .single()

        if (error) throw error
        setArticle(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    if (slug) loadArticle()
  }, [slug])

  if (loading) return <div className="page-card">Loading article...</div>
  if (error) return <div className="error-box">{error}</div>
  if (!article) return <div className="page-card">Article not found.</div>

  return (
    <article className="article-page">
      {/* Featured image hero */}
      {article.image_url && (
        <div className="article-hero">
          <img src={article.image_url} alt={article.title} />
        </div>
      )}

      <header className="article-header">
        <p className="eyebrow">{article.trends?.category || 'Article'}</p>
        <h1>{article.title}</h1>
        <p className="lead">{article.summary}</p>

        <div className="meta-row">
          <span>Published {new Date(article.published_at).toLocaleDateString()}</span>
          {article.tags?.length > 0 && <span>{article.tags.join(' · ')}</span>}
        </div>
      </header>

      {article.image_prompt && !article.image_url && (
        <section className="page-card prompt-card">
          <p className="muted">Image prompt: {article.image_prompt}</p>
        </section>
      )}

      <div className="markdown-body">
        <ReactMarkdown>{article.content}</ReactMarkdown>
      </div>

      <Link className="secondary-button" to="/articles">
        Back to articles
      </Link>
    </article>
  )
}
