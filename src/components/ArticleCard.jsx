import { Link } from 'react-router-dom'

export default function ArticleCard({ article }) {
  return (
    <article className="article-card">
      <div className="card-topline">
        <span className="pill">{article.category || 'Article'}</span>
        <span className="muted">{new Date(article.published_at || article.created_at).toLocaleDateString()}</span>
      </div>

      <h3>{article.title}</h3>
      <p>{article.summary}</p>

      <Link className="text-link" to={`/articles/${article.slug}`}>
        Read article
      </Link>
    </article>
  )
}
