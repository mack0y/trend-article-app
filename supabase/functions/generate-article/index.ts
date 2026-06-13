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

    // Determine article type and structure based on category
    const category = trend.category || 'General'
    const isNewsCrisis = ['Disaster', 'Politics', 'Economy', 'Global', 'Health'].includes(category)
    const isSportsEntertainment = category === 'Entertainment' || ['mystics', 'warriors', 'timothee', 'chalamet', 'storm', 'valkyries', 'nba', 'wnba', 'game', 'match', 'vs '].some(k => trend.title.toLowerCase().includes(k))
    const isEverydayLife = ['Food & Agriculture', 'Real Estate', 'Education', 'Crime', 'Business'].includes(category)

    let articleStructure = ''

    if (isNewsCrisis) {
      // News/Crisis: BBC-style explainer — context, analysis, what it means
      articleStructure = `## YOUR ARTICLE — NEWS EXPLAINER STYLE

Write this like a BBC or Vox explainer: authoritative but accessible. The reader heard about this but doesn't fully understand it. You're saving them from reading 5 articles by giving them everything in one clear read.

### 1. HEADLINE (max 65 chars)
Punchy, about the story itself. Not about Google Trends.

### 2. THE HOOK (1 paragraph)
Start with the story — a vivid moment, a striking fact, a human angle. Do NOT start with "[topic] is trending" or "Filipinos are searching for..."

### 3. WHAT HAPPENED (2-3 paragraphs)
The key facts. What's the actual development? Be specific: dates, names, numbers. Quote from sources.

### 4. WHY NOW (1-2 paragraphs)
What triggered this? Why is this happening today or this week? Give the immediate context.

### 5. THE BIGGER PICTURE (1-2 paragraphs)
How did we get here? What's the history? What do readers need to understand to make sense of this?

### 6. WHAT THIS MEANS FOR FILIPINOS (1-2 paragraphs)
Connect to the reader's life. How does this affect:
- Safety, prices, daily life
- Family, work, money
- Future plans

### 7. WHAT'S NEXT (1 paragraph)
Upcoming events, decisions, or things to watch for.

### 8. BOTTOM LINE (1 paragraph)
Key takeaway in 1-2 sentences. What should the reader remember?`
    } else if (isSportsEntertainment) {
      // Sports/Entertainment: narrative recap — what happened, why it's exciting
      articleStructure = `## YOUR ARTICLE — SPORTS/ENTERTAINMENT RECAP STYLE

Write this like a sports desk recap or entertainment story. Make the reader feel like they were there. Focus on the moment, the drama, the excitement.

### 1. HEADLINE (max 65 chars)
Exciting, captures the moment. Not about Google Trends.

### 2. THE HOOK (1 paragraph)
Start with THE MOMENT — the buzzer-beater, the surprise, the dramatic scene. Drop the reader right into the action. Do NOT start with "[topic] is trending."

### 3. THE STORY (2-3 paragraphs)
What happened? Lay out the key action, the drama, the turning points. Make it feel like a story, not a report.

### 4. WHY IT MATTERS (1-2 paragraphs)
Why should Filipinos care? Connect to:
- Filipino athletes or connections
- Growing fan base in the Philippines
- Cultural significance
- What this says about the sport/entertainment industry

### 5. WHAT'S NEXT (1 paragraph)
Upcoming games, releases, or events to watch for.

### 6. BOTTOM LINE (1 paragraph)
One sentence that captures why this moment matters.`
    } else if (isEverydayLife) {
      // Everyday Life: service journalism — what you need to know and do
      articleStructure = `## YOUR ARTICLE — SERVICE JOURNALISM STYLE

Write this like a practical guide. The reader needs to know what changed and what to do about it. Be clear, direct, and helpful.

### 1. HEADLINE (max 65 chars)
Clear and practical. Tells the reader what they need to know. Not about Google Trends.

### 2. THE HOOK (1 paragraph)
Start with the reader's concern — higher prices, new rules, something that affects their daily life. Do NOT start with "[topic] is trending."

### 3. WHAT CHANGED (1-2 paragraphs)
What's new? Be specific: new prices, new laws, new requirements. Give numbers and dates.

### 4. HOW THIS AFFECTS YOU (2-3 paragraphs)
Break it down by who it affects:
- Families
- Workers
- Students
- Business owners

### 5. WHAT YOU CAN DO (1-2 paragraphs)
Practical advice. Steps to take, things to watch out for, resources to use.

### 6. WHAT'S NEXT (1 paragraph)
What to expect in the coming days or weeks.

### 7. BOTTOM LINE (1 paragraph)
The one thing the reader should remember and act on.`
    } else {
      // General: flexible explainer
      articleStructure = `## YOUR ARTICLE — ENGAGING EXPLAINER STYLE

Write this like a smart friend explaining something interesting. Make it engaging and easy to read.

### 1. HEADLINE (max 65 chars)
Makes people want to click. Not about Google Trends.

### 2. THE HOOK (1 paragraph)
Start with an interesting angle — a surprising fact, a relatable question, a vivid image. Do NOT start with "[topic] is trending."

### 3. WHAT'S THIS ABOUT (2-3 paragraphs)
The key facts. What's happening? Who's involved? Why should anyone care?

### 4. THE CONTEXT (1-2 paragraphs)
What led to this? Give enough background to understand.

### 5. WHY FILIPINOS ARE TALKING ABOUT THIS (1-2 paragraphs)
Connect to the Philippines specifically. What's the local angle?

### 6. WHAT'S NEXT (1 paragraph)
What to watch for.

### 7. BOTTOM LINE (1 paragraph)
Key takeaway. Keep it short.`
    }

    const prompt = `You are a top Filipino journalist writing for PH Trend Writer. Your articles are engaging, insightful, and read like a trusted friend explaining something important.

## MATERIAL TO WORK WITH

Topic: ${trend.title}
Category: ${category}
Summary: ${trend.summary}

## SOURCE ARTICLES (use for facts and quotes)

${sourceText}

## CRITICAL RULE

Do NOT mention Google Trends, search traffic, or trending data anywhere in the article. The topic came from search trends, but the article is about the story itself. Readers should never know this started from a search trend.

${articleStructure}

## CRITICAL: NO SECTION LABELS IN ARTICLE

The section labels above (like "THE HOOK", "WHAT HAPPENED", "BOTTOM LINE", etc.) are **internal guidelines** for your writing structure only. Do NOT include them as headings in the article. The article should flow naturally from one section to the next without any visible section markers. Readers should see a seamless, engaging article — not a numbered list or labeled sections.

## WRITING STYLE
- Conversational Filipino English — like a smart friend explaining it
- Short paragraphs (2-4 sentences). People read on phones.
- Bold for key points: **like this**
- 400-700 words total
- Never sound like a textbook
- Every paragraph makes the reader want to read the next one

## FEATURED IMAGE PROMPT

You must ALSO generate a detailed image_prompt that can be fed into DALL-E or Midjourney. This prompt should describe a compelling, photorealistic image that represents the article. Follow these rules:
- Describe the SUBJECT, SETTING, MOOD, and STYLE
- Include lighting, colors, and composition details
- Keep it between 30-80 words
- Do NOT include text, letters, or words in the image
- Should be usable as a featured hero image for the article
- Match the tone: serious for news, exciting for sports, warm for everyday life

## OUTPUT FORMAT (JSON only, no markdown fences)

{
  "title": "headline about the actual story",
  "summary": "2 sentences hooking the reader (max 160 chars)",
  "content": "full article in markdown following the structure above",
  "seo_description": "SEO description (max 155 chars)",
  "tags": ["tag1", "tag2", "tag3", "tag4"],
  "image_prompt": "describe the featured image here — DALL-E/Midjourney ready prompt, 30-80 words, no text in image"
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
