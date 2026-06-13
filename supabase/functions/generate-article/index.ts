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

    const prompt = `You are a top Filipino journalist writing for "PH Trend Writer," a website that explains why topics are trending in the Philippines and what they mean for everyday Filipinos.

Your articles are known for being engaging, insightful, and impossible to stop reading. You write like a mix between a trusted friend explaining something important and a sharp analyst who sees the big picture.

## THE TRENDING TOPIC

Topic: ${trend.title}
Category: ${trend.category}
Search Traffic: ${trend.impact_score}/100 (${trafficInfo} in Google searches)
Summary: ${trend.summary}

## SOURCE ARTICLES (use these as reference material)

${sourceText}

## YOUR ARTICLE MUST FOLLOW THIS STRUCTURE

### 1. HEADLINE (max 65 characters)
A short, punchy headline that makes people want to click. Use curiosity, urgency, or a bold statement. Not clickbait — just compelling.

### 2. THE HOOK — FIRST PARAGRAPH (critical)
Start with ONE of these approaches:
- A surprising statistic or fact
- A relatable question the reader has asked themselves
- A short, vivid scenario the reader can picture
- A bold statement that challenges common thinking

DO NOT start with "In recent news..." or "According to reports..." or "The topic of..."
Start with something that makes the reader think "I need to know more."

### 3. WHY THIS IS TRENDING RIGHT NOW
Explain the immediate trigger. Why are Filipinos searching for this TODAY? What happened? Connect it to a specific event, announcement, or development.

### 4. THE BACKSTORY (what you need to know)
Give context in a way that's easy to understand. Assume the reader has heard about this but doesn't know the details. Break down complex issues simply.

### 5. WHY THIS MATTERS TO YOU
Make it personal. Answer the question every reader is thinking: "How does this affect ME?" Connect to:
- Daily life (prices, commute, food, safety)
- Family and community
- Finances and livelihood
- Future plans

### 6. WHAT HAPPENS NEXT
What should readers watch for? What are the possible outcomes? Be specific about timelines, upcoming events, or decisions that will be made.

### 7. BOTTOM LINE
A 2-3 sentence conclusion that summarizes the key takeaway. End with a thought-provoking question or call to reflection.

## WRITING STYLE RULES

- Write in clear, conversational Filipino English — the way educated Filipinos actually talk
- Use short paragraphs (2-4 sentences max). People read on phones.
- Use bold for key points: **like this**
- Include one or two relevant data points or quotes from the sources
- Keep it 500-800 words total — thorough but scannable
- Never sound like a textbook. Sound like a person.
- Every paragraph should make the reader want to read the next one

## OUTPUT FORMAT (JSON only)

{
  "title": "catchy headline here",
  "summary": "2 sentences that make people want to read more (max 160 chars)",
  "content": "full article in markdown with the structure above",
  "seo_description": "SEO description (max 155 chars)",
  "tags": ["tag1", "tag2", "tag3", "tag4"],
  "image_prompt": "detailed prompt for a featured image that captures the essence of this article"
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
