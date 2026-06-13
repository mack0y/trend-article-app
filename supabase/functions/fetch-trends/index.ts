import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GoogleTrendItem {
  title: string
  approx_traffic: string
  traffic_score: number
  news_items: { title: string; url: string; source: string }[]
  pub_date: string
}

interface TrendArticle {
  title: string
  url: string
  snippet: string
  published_at: string
  source_name: string
}

interface NormalizedTrend {
  title: string
  summary: string
  category: string
  impact_score: number
  source_links: { name: string; url: string }[]
  traffic_label: string
}

function parseXmlValue(xml: string, tag: string): string[] {
  const regex = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'g')
  const matches: string[] = []
  let match
  while ((match = regex.exec(xml)) !== null) {
    matches.push(match[1])
  }
  return matches
}

function parseGoogleTrendsRss(xml: string): GoogleTrendItem[] {
  const items: GoogleTrendItem[] = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/g
  let itemMatch

  while ((itemMatch = itemRegex.exec(xml)) !== null) {
    const itemXml = itemMatch[1]
    const titles = parseXmlValue(itemXml, 'title')
    const traffics = parseXmlValue(itemXml, 'ht:approx_traffic')
    const pubDates = parseXmlValue(itemXml, 'pubDate')

    if (titles.length === 0) continue

    // Parse news items within this trend
    const newsItems: { title: string; url: string; source: string }[] = []
    const newsItemRegex = /<ht:news_item>([\s\S]*?)<\/ht:news_item>/g
    let newsMatch
    while ((newsMatch = newsItemRegex.exec(itemXml)) !== null) {
      const newsXml = newsMatch[1]
      const nTitles = parseXmlValue(newsXml, 'ht:news_item_title')
      const nUrls = parseXmlValue(newsXml, 'ht:news_item_url')
      const nSources = parseXmlValue(newsXml, 'ht:news_item_source')
      if (nTitles.length > 0 && nUrls.length > 0) {
        newsItems.push({
          title: nTitles[0].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1'),
          url: nUrls[0],
          source: nSources[0] || 'Google News',
        })
      }
    }

    // Calculate numeric score from traffic label
    const trafficStr = traffics[0] || '0+'
    const trafficNum = parseInt(trafficStr.replace(/[+,]/g, ''), 10) || 0
    let trafficScore = 0
    if (trafficNum >= 100000) trafficScore = 100
    else if (trafficNum >= 50000) trafficScore = 90
    else if (trafficNum >= 10000) trafficScore = 80
    else if (trafficNum >= 5000) trafficScore = 70
    else if (trafficNum >= 1000) trafficScore = 60
    else if (trafficNum >= 500) trafficScore = 50
    else if (trafficNum >= 100) trafficScore = 40
    else trafficScore = 30

    items.push({
      title: titles[0].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1'),
      approx_traffic: trafficStr,
      traffic_score: trafficScore,
      news_items: newsItems,
      pub_date: pubDates[0] || new Date().toISOString(),
    })
  }

  return items
}

function parseRssItems(xml: string): TrendArticle[] {
  const items: TrendArticle[] = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/g
  let itemMatch

  while ((itemMatch = itemRegex.exec(xml)) !== null) {
    const itemXml = itemMatch[1]
    const titles = parseXmlValue(itemXml, 'title')
    const links = parseXmlValue(itemXml, 'link')
    const descriptions = parseXmlValue(itemXml, 'description')
    const pubDates = parseXmlValue(itemXml, 'pubDate')
    const sources = parseXmlValue(itemXml, 'source')

    if (titles.length > 0 && links.length > 0) {
      items.push({
        title: titles[0].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]*>/g, ''),
        url: links[0],
        snippet: descriptions[0]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]*>/g, '').slice(0, 500) || '',
        published_at: pubDates[0] || new Date().toISOString(),
        source_name: sources[0] || 'Google News',
      })
    }
  }

  return items
}

function categorizeTrend(title: string): string {
  const text = title.toLowerCase()
  if (text.match(/impeachment|duterte|marcos|senate|congress|president|governor|election|policy|law|bill|politics/)) return 'Politics'
  if (text.match(/typhoon|earthquake|flood|disaster|storm|volcano|landslide|evacuation/)) return 'Disaster'
  if (text.match(/oil|energy|fuel|inflation|economy|gdp|trade|peso|dollar|price/)) return 'Economy'
  if (text.match(/health|covid|dengue|vaccine|hospital|disease/)) return 'Health'
  if (text.match(/tech|ai|artificial|startup|digital|cyber/)) return 'Technology'
  if (text.match(/china|us|united states|asean|japan|korea|global|international/)) return 'Global'
  if (text.match(/crime|police|arrest|drug|murder|robbery/)) return 'Crime'
  if (text.match(/food|rice|agriculture|farm/)) return 'Food & Agriculture'
  if (text.match(/education|school|university/)) return 'Education'
  if (text.match(/movie|music|concert|celebrity|entertainment/)) return 'Entertainment'
  if (text.match(/climate|environment|warming|pollution/)) return 'Environment'
  if (text.match(/ofw|overseas|worker|bpo|call center|outsourcing/)) return 'Business'
  if (text.match(/house|housing|real estate|rent|property/)) return 'Real Estate'
  return 'General'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // --- STEP 1: Fetch Google Trends for Philippines ---
    const googleTrendsUrl = 'https://trends.google.com/trending/rss?geo=PH'
    let googleTrends: GoogleTrendItem[] = []

    try {
      const gtResponse = await fetch(googleTrendsUrl)
      if (gtResponse.ok) {
        const gtXml = await gtResponse.text()
        googleTrends = parseGoogleTrendsRss(gtXml)
        console.log(`Google Trends: ${googleTrends.length} trending topics found`)
      }
    } catch (e) {
      console.log('Google Trends RSS error:', e)
    }

    // --- STEP 2: For each trending topic, fetch related news articles ---
    const allTrends: NormalizedTrend[] = []

    for (const gt of googleTrends) {
      const category = categorizeTrend(gt.title)
      const sourceLinks = gt.news_items.map(n => ({ name: n.source, url: n.url }))

      // Fetch additional news for this topic from Google News
      const newsQuery = encodeURIComponent(gt.title)
      const newsUrl = `https://news.google.com/rss/search?q=${newsQuery}+Philippines&hl=en-PH&gl=PH&ceid=PH:en`
      let newsSnippets: string[] = []

      try {
        const newsResponse = await fetch(newsUrl)
        if (newsResponse.ok) {
          const newsXml = await newsResponse.text()
          const newsArticles = parseRssItems(newsXml)
          for (const article of newsArticles) {
            // Add unique sources
            if (!sourceLinks.some(s => s.url === article.url)) {
              sourceLinks.push({ name: article.source_name, url: article.url })
            }
            if (article.snippet) newsSnippets.push(article.snippet)
          }
        }
      } catch (e) {
        console.log(`Google News fetch for "${gt.title}" error:`, e)
      }

      // Build summary from news snippets and Google Trends news items
      const newsTitles = gt.news_items.map(n => n.title).join('. ')
      const summary = newsTitles || `"${gt.title}" is trending in the Philippines with ${gt.approx_traffic} searches.`

      allTrends.push({
        title: gt.title,
        summary: summary.slice(0, 300),
        category,
        impact_score: gt.traffic_score,
        source_links: sourceLinks.slice(0, 15),
        traffic_label: gt.approx_traffic,
      })
    }

    // --- STEP 3: Also fetch GDELT for supplementary global context ---
    let gdeltSources: TrendArticle[] = []
    try {
      const gdeltQuery = encodeURIComponent('(Philippines OR Manila) when:24h')
      const gdeltUrl = `https://api.gdeltproject.org/api/v2/doc/doc?query=${gdeltQuery}&mode=artlist&format=json&maxrecords=20&timespan=24h&sort=datedesc`
      const gdeltResponse = await fetch(gdeltUrl)
      if (gdeltResponse.ok) {
        const gdeltData = await gdeltResponse.json()
        if (gdeltData.articles) {
          for (const article of gdeltData.articles) {
            gdeltSources.push({
              title: article.title || 'Untitled',
              url: article.url || '',
              snippet: article.excerpt || '',
              published_at: article.seendate ? new Date(article.seendate).toISOString() : new Date().toISOString(),
              source_name: article.domain || 'GDELT',
            })
          }
        }
      }
    } catch (e) {
      console.log('GDELT fetch error:', e)
    }

    // --- STEP 4: Save trends to Supabase ---
    // Clear old trends first
    await supabase.from('trend_sources').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('trends').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    let savedCount = 0
    for (const trend of allTrends) {
      const { error } = await supabase
        .from('trends')
        .insert({
          title: trend.title,
          summary: trend.summary,
          category: trend.category,
          impact_score: trend.impact_score,
          source_links: trend.source_links,
          status: 'published',
        })
        .select()
        .single()

      if (!error) savedCount++
    }

    // Also save a few GDELT items as supplementary trends if Google Trends returned nothing
    if (allTrends.length === 0 && gdeltSources.length > 0) {
      for (const article of gdeltSources.slice(0, 10)) {
        const category = categorizeTrend(article.title)
        await supabase
          .from('trends')
          .insert({
            title: article.title,
            summary: article.snippet.slice(0, 300) || article.title,
            category,
            impact_score: 40,
            source_links: [{ name: article.source_name, url: article.url }],
            status: 'published',
          })
      }
      savedCount = Math.min(gdeltSources.length, 10)
    }

    // Save sources for each trend
    for (const trend of allTrends) {
      const { data: trendData } = await supabase
        .from('trends')
        .select('id')
        .eq('title', trend.title)
        .single()

      if (trendData) {
        for (const source of trend.source_links) {
          await supabase
            .from('trend_sources')
            .insert({
              trend_id: trendData.id,
              source_name: source.name,
              source_url: source.url,
              published_at: new Date().toISOString(),
              snippet: '',
            })
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: `Trends refreshed. ${savedCount} topics from Google Trends PH.`,
        trends_count: savedCount,
        google_trends_count: googleTrends.length,
        gdelt_count: gdeltSources.length,
        traffic_labels: googleTrends.map(t => `${t.title}: ${t.approx_traffic}`),
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
