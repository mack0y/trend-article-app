import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function createSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const openrouterApiKey = Deno.env.get('OPENROUTER_API_KEY') ?? ''
    const openrouterModel = Deno.env.get('OPENROUTER_MODEL') ?? 'poolside/laguna-m.1:free'

    if (!openrouterApiKey) {
      throw new Error('OPENROUTER_API_KEY environment variable is not set.')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { trend_id } = await req.json()

    if (!trend_id) {
      throw new Error('trend_id is required.')
    }

    // Fetch trend and sources
    const { data: trend, error: trendError } = await supabase
      .from('trends')
      .select('*')
      .eq('id', trend_id)
      .single()

    if (trendError || !trend) {
      throw new Error('Trend not found.')
    }

    const { data: sources } = await supabase
      .from('trend_sources')
      .select('*')
      .eq('trend_id', trend_id)
      .order('published_at', { ascending: false })

    const sourceText = sources
      ?.map((s) => `- ${s.source_name}: ${s.source_url}\n  Snippet: ${s.snippet || 'N/A'}`)
      .join('\n') || 'No sources available.'

    const trafficInfo = trend.impact_score >= 80 ? 'massive surge' :
      trend.impact_score >= 60 ? 'significant spike' :
      trend.impact_score >= 40 ? 'notable increase' :
      'growing interest'

    const prompt = `You are a top Filipino journalist writing for "PH Trend Writer." Your articles are engaging, insightful, and read like a trusted friend explaining an important story.

## THE STORY

Topic: ${trend.title}
Category: ${trend.category}
Context: This topic is currently being searched by many Filipinos on Google (${trafficInfo}).
Summary: ${trend.summary}

## SOURCE ARTICLES (use these as reference material)

${sourceText}

## YOUR ARTICLE STRUCTURE

### 1. HEADLINE (max 65 characters)
A short, punchy headline about the STORY ITSELF — not about Google Trends. Make people want to click.

### 2. THE HOOK (first paragraph)
Start with the story, not the search trend. Use ONE of:
- A vivid moment or scene
- A striking fact from the news
- A question the reader is already asking

IMPORTANT: Do NOT start with "[Topic] is trending on Google..." or "Many Filipinos are searching for..." The Google Trends fact is just how we found the story, not what the story is about.

### 3. WHAT HAPPENED
Lay out the key facts. What's the actual news or development? Be specific about events, announcements, or changes.

### 4. THE BACKSTORY
Give context. How did we get here? What led to this moment? Assume the reader has heard about it but doesn't know the details.

### 5. WHY THIS MATTERS TO FILIPINOS
Connect the story to the reader's life. Answer: "How does this affect me?" Think about:
- Safety and daily life
- Prices and finances
- Family and community
- Future plans

### 6. WHAT'S NEXT
What should readers watch for? Upcoming events, decisions, or developments.

### 7. BOTTOM LINE
One or two sentences that give the reader a clear takeaway.

## WRITING STYLE
- Conversational Filipino English — like a smart friend explaining it
- Short paragraphs (2-4 sentences). People read on phones.
- Bold for key points: **like this**
- 500-800 words total
- Never sound like a textbook

## OUTPUT FORMAT (JSON only)

{
  "title": "headline about the actual story",
  "summary": "2 sentences hooking the reader (max 160 chars)",
  "content": "full article in markdown",
  "seo_description": "SEO description (max 155 chars)",
  "tags": ["tag1", "tag2", "tag3", "tag4"],
  "image_prompt": "detailed prompt for a featured image"
}`

    // Call OpenRouter API
    const openrouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openrouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/trend-article-app',
        'X-Title': 'PH Trend Writer',
      },
      body: JSON.stringify({
        model: openrouterModel,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.8,
        max_tokens: 3000,
        response_format: { type: 'json_object' },
      }),
    })

    if (!openrouterResponse.ok) {
      const errorData = await openrouterResponse.json()
      throw new Error(`OpenRouter API error: ${errorData.error?.message || openrouterResponse.status}`)
    }

    const completion = await openrouterResponse.json()
    const content = completion.choices?.[0]?.message?.content

    if (!content) {
      throw new Error('No content returned from LLM.')
    }

    let article
    try {
      article = JSON.parse(content)
    } catch {
      throw new Error('Failed to parse LLM response as JSON.')
    }

    // Validate required fields
    if (!article.title || !article.content) {
      throw new Error('LLM response missing required fields (title, content).')
    }

    // Create article slug
    const slug = createSlug(article.title)

    // Save article as draft
    const { data: savedArticle, error: saveError } = await supabase
      .from('articles')
      .insert({
        trend_id,
        title: article.title,
        slug,
        summary: article.summary || article.title,
        content: article.content,
        image_prompt: article.image_prompt || '',
        seo_description: article.seo_description || '',
        tags: article.tags || [],
        status: 'draft',
      })
      .select()
      .single()

    if (saveError) throw saveError

    return new Response(
      JSON.stringify({
        message: 'Article generated successfully.',
        article: savedArticle,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
