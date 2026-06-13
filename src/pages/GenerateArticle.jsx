import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { invokeFunction } from '../lib/api'

function createSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

export default function GenerateArticle() {
  const { trendId } = useParams()
  const navigate = useNavigate()

  const [trend, setTrend] = useState(null)
  const [article, setArticle] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [form, setForm] = useState({
    title: '',
    summary: '',
    content: '',
    image_prompt: '',
    image_url: '',
    seo_description: '',
    tags: [],
  })

  useEffect(() => {
    async function loadTrend() {
      const { data, error } = await supabase.from('trends').select('*').eq('id', trendId).single()
      if (error) {
        setError(error.message)
        return
      }
      setTrend(data)
    }

    async function loadExistingArticle() {
      const { data } = await supabase
        .from('articles')
        .select('*')
        .eq('trend_id', trendId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (data) {
        setArticle(data)
        setForm({
          title: data.title || '',
          summary: data.summary || '',
          content: data.content || '',
          image_prompt: data.image_prompt || '',
          image_url: data.image_url || '',
          seo_description: data.seo_description || '',
          tags: Array.isArray(data.tags) ? data.tags : [],
        })
      }
    }

    if (trendId) {
      loadTrend()
      loadExistingArticle()
    }
  }, [trendId])

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function updateTags(value) {
    const tags = value
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)

    setForm((current) => ({ ...current, tags }))
  }

  async function uploadImage(event) {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError('')

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${trendId || 'article'}-${Date.now()}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('article-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('article-images')
        .getPublicUrl(filePath)

      setForm((current) => ({ ...current, image_url: urlData.publicUrl }))
      setMessage('Image uploaded successfully.')
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }

    // Reset input so same file can be re-selected
    event.target.value = ''
  }

  async function removeImage() {
    if (!form.image_url) return

    // Extract path from URL
    const path = form.image_url.split('/').pop()
    if (path) {
      await supabase.storage.from('article-images').remove([path])
    }

    setForm((current) => ({ ...current, image_url: '' }))
    setMessage('Image removed.')
  }

  async function generateArticle() {
    if (!trendId) return

    setLoading(true)
    setError('')
    setMessage('')

    try {
      const result = await invokeFunction('generate-article', { trend_id: trendId })
      const generated = result.article || result

      setArticle(generated)
      setForm((current) => ({
        title: generated.title || '',
        summary: generated.summary || '',
        content: generated.content || '',
        image_prompt: generated.image_prompt || '',
        image_url: current.image_url || generated.image_url || '',
        seo_description: generated.seo_description || '',
        tags: Array.isArray(generated.tags) ? generated.tags : [],
      }))

      setMessage('Article generated. Review and edit before publishing.')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function saveDraft() {
    if (!trendId) return null

    setSaving(true)
    setError('')

    try {
      const payload = {
        trend_id: trendId,
        title: form.title,
        slug: createSlug(form.title),
        summary: form.summary,
        content: form.content,
        image_prompt: form.image_prompt,
        image_url: form.image_url,
        seo_description: form.seo_description,
        tags: form.tags,
        status: article?.id ? article.status || 'draft' : 'draft',
      }

      let result
      if (article?.id) {
        result = await supabase.from('articles').update(payload).eq('id', article.id).select().single()
      } else {
        result = await supabase.from('articles').insert(payload).select().single()
      }

      if (result.error) throw result.error
      setArticle(result.data)
      setMessage('Draft saved.')
      return result.data
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setSaving(false)
    }
  }

  async function publishArticle() {
    setSaving(true)
    setError('')

    try {
      let articleId = article?.id

      if (!articleId) {
        const saved = await saveDraft()
        articleId = saved?.id
      }

      if (!articleId) {
        throw new Error('Please save a draft before publishing.')
      }

      const { data, error } = await supabase
        .from('articles')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
        })
        .eq('id', articleId)
        .select()
        .single()

      if (error) throw error
      setMessage('Article published.')
      navigate(`/articles/${data.slug}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function copyPrompt() {
    await navigator.clipboard.writeText(form.image_prompt || '')
    setMessage('Image prompt copied.')
  }

  return (
    <section className="page-stack narrow">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Admin article generator</p>
          <h1>Generate article</h1>
        </div>
        <Link className="secondary-button" to="/admin/trends">
          Back to trends
        </Link>
      </div>

      {trend && (
        <div className="page-card">
          <h2>Selected trend</h2>
          <h3>{trend.title}</h3>
          <p>{trend.summary}</p>
        </div>
      )}

      {error && <div className="error-box">{error}</div>}
      {message && <div className="success-box">{message}</div>}

      <div className="page-actions">
        <button className="primary-button" type="button" onClick={generateArticle} disabled={loading || saving}>
          {loading ? 'Generating...' : 'Generate with LLM'}
        </button>
        <button className="secondary-button" type="button" onClick={saveDraft} disabled={saving}>
          {saving ? 'Saving...' : 'Save draft'}
        </button>
        <button className="primary-button" type="button" onClick={publishArticle} disabled={saving}>
          Publish article
        </button>
      </div>

      <div className="form-card article-form">
        <label>
          Article title
          <input value={form.title} onChange={(event) => updateField('title', event.target.value)} />
        </label>

        <label>
          Summary
          <textarea
            value={form.summary}
            onChange={(event) => updateField('summary', event.target.value)}
            rows={3}
          />
        </label>

        {/* Featured image */}
        <div className="image-section">
          <label>Featured image</label>

          {form.image_url ? (
            <div className="image-preview">
              <img src={form.image_url} alt="Article featured image" />
              <button className="text-button" type="button" onClick={removeImage}>
                Remove image
              </button>
            </div>
          ) : (
            <div className="image-upload-zone">
              <label className="upload-button secondary-button" role="button">
                {uploading ? 'Uploading...' : 'Upload image'}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={uploadImage}
                  disabled={uploading}
                  hidden
                />
              </label>
              <span className="muted">PNG, JPEG, WebP or GIF. Max 5MB.</span>
            </div>
          )}
        </div>

        {/* Image prompt */}
        <label>
          Image prompt (for DALL-E / Midjourney)
          <textarea
            value={form.image_prompt}
            onChange={(event) => updateField('image_prompt', event.target.value)}
            rows={4}
          />
        </label>

        <div className="inline-actions">
          <button className="secondary-button" type="button" onClick={copyPrompt} disabled={!form.image_prompt}>
            Copy image prompt
          </button>
          <span className="muted">Use this prompt to generate a photo in DALL-E or Midjourney, then upload the result above.</span>
        </div>

        <label>
          Content
          <textarea
            value={form.content}
            onChange={(event) => updateField('content', event.target.value)}
            rows={24}
            className="markdown-editor"
          />
        </label>

        <label>
          SEO description
          <input
            value={form.seo_description}
            onChange={(event) => updateField('seo_description', event.target.value)}
          />
        </label>

        <label>
          Tags, comma separated
          <input
            value={form.tags.join(', ')}
            onChange={(event) => updateTags(event.target.value)}
            placeholder="Philippines, economy, trending"
          />
        </label>
      </div>
    </section>
  )
}
