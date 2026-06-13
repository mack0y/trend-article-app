# PH Trend Article Generator — Project Memory

## What It Is

A web application that tracks Philippines-focused trending topics and global events that may affect the Philippines, then generates English articles using AI assistance.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite 8 (JSX, no TypeScript) |
| Styling | Single CSS file (`App.css`) with CSS custom properties |
| Routing | React Router v7 with configurable base path |
| Backend | Supabase (PostgreSQL + Auth + Edge Functions) |
| LLM | OpenRouter free models (Llama 3.1 8B Instruct) |
| Trend Sources | GDELT API + Google News RSS |
| Hosting | GitHub Pages (frontend) + Supabase (backend) |

## Project Structure

```
trend-article-app/
├── .env                          # Supabase URL + anon key (configured)
├── .env.example                  # Template for env vars
├── package.json                  # Dependencies and scripts
├── vite.config.js                # Vite config with React plugin
├── index.html                    # Entry HTML
├── src/
│   ├── main.jsx                  # React root mount
│   ├── App.jsx                   # Router + route definitions
│   ├── App.css                   # All styles (528 lines)
│   ├── index.css                 # Minimal reset
│   ├── lib/
│   │   ├── supabase.js           # Supabase client init
│   │   ├── api.js                # invokeFunction() + getPublicArticleUrl()
│   │   └── auth.js               # getCurrentUser(), getCurrentProfile(), isAdmin()
│   ├── components/
│   │   ├── Layout.jsx            # Header nav + footer shell
│   │   ├── ProtectedRoute.jsx    # Auth check + role verification
│   │   ├── TrendCard.jsx         # Trend display card
│   │   └── ArticleCard.jsx       # Article display card
│   └── pages/
│       ├── Home.jsx              # Hero + latest articles/trends
│       ├── Trends.jsx            # All trends list
│       ├── TrendDetail.jsx       # Single trend + sources
│       ├── Articles.jsx          # Published articles list
│       ├── ArticleDetail.jsx     # Single article (Markdown rendered)
│       ├── AdminLogin.jsx        # Email/password login
│       ├── AdminTrends.jsx       # Admin trend management + refresh
│       ├── GenerateArticle.jsx   # Article generation + editor + publish
│       └── AdminArticles.jsx     # Admin article list + toggle status
├── supabase/
│   ├── config.toml               # Project ID: nvxykufajzppjtkmbtte
│   ├── migrations/
│   │   └── 0001_initial_schema.sql  # Full DB schema (219 lines)
│   └── functions/
│       ├── fetch-trends/
│       │   └── index.ts          # GDELT + Google News fetcher (293 lines)
│       └── generate-article/
│           └── index.ts          # OpenRouter LLM article generator (195 lines)
└── dist/                         # Build output
```

## Database Schema

### Tables

1. **profiles** — User profiles auto-created on signup
   - `id` (uuid, FK → auth.users), `email`, `role` (user/admin), `created_at`

2. **trends** — Trending topics fetched from external sources
   - `id` (uuid), `title`, `summary`, `category`, `impact_score` (0-100), `source_links` (jsonb), `status` (new/published/archived), `created_at`, `updated_at`

3. **trend_sources** — Individual source articles for each trend
   - `id` (uuid), `trend_id` (FK → trends), `source_name`, `source_url`, `published_at`, `snippet`, `created_at`

4. **articles** — Generated articles
   - `id` (uuid), `trend_id` (FK → trends), `title`, `slug` (unique), `summary`, `content` (markdown), `image_prompt`, `image_url`, `seo_description`, `tags` (text[]), `status` (draft/reviewing/published/archived), `published_at`, `created_at`, `updated_at`

### Triggers

- `on_auth_user_created` — Auto-creates profile row when user signs up
- `update_trends_updated_at` — Auto-updates `updated_at` on trend updates
- `update_articles_updated_at` — Auto-updates `updated_at` on article updates

### RLS Policies

- **Public** can read: published trends, published articles, all trend_sources
- **Users** can read: own profile
- **Admins** can: full CRUD on all tables

## Edge Functions

### fetch-trends (Deno)

- Fetches from 4 sources:
  1. GDELT Philippines query (24h, 50 records)
  2. GDELT global impact query (48h, 30 records)
  3. Google News RSS Philippines (1d)
  4. Google News RSS global impact (2d)
- Deduplicates by normalized title
- Categorizes trends (Disaster, Economy, Politics, Technology, Health, etc.)
- Calculates impact score (0-100) based on keyword matching + source count
- Upserts to `trends` table, inserts to `trend_sources`
- Uses `SUPABASE_SERVICE_ROLE_KEY` for DB access

### generate-article (Deno)

- Takes `trend_id` as input
- Fetches trend + sources from DB
- Sends structured prompt to OpenRouter (Llama 3.1 8B free)
- Expects JSON response with: title, summary, content (markdown), seo_description, tags, image_prompt
- Creates slug from title, saves as draft to `articles` table
- Uses `response_format: { type: 'json_object' }` for reliable parsing

## Frontend Routes

### Public

| Path | Component | Description |
|------|-----------|-------------|
| `/` | Home | Hero section + latest 6 articles + 6 trends |
| `/trends` | Trends | All published/new trends |
| `/trends/:id` | TrendDetail | Trend info + sources list |
| `/articles` | Articles | All published articles |
| `/articles/:slug` | ArticleDetail | Full article with Markdown rendering |

### Admin (Protected)

| Path | Component | Description |
|------|-----------|-------------|
| `/admin/login` | AdminLogin | Email/password login form |
| `/admin/trends` | AdminTrends | All trends + refresh button |
| `/admin/generate/:trendId` | GenerateArticle | Article generation + editor |
| `/admin/articles` | AdminArticles | Article management table |

## Workflow

1. Admin clicks "Refresh trends" → calls `fetch-trends` edge function
2. Trends appear in admin list, sorted by impact score
3. Admin clicks "Generate article" on a trend → goes to GenerateArticle page
4. Admin clicks "Generate with LLM" → calls `generate-article` edge function
5. Article appears in form fields, admin can edit title/summary/content/image prompt/SEO/tags
6. Admin can save draft, copy image prompt (for external image generation), or publish
7. Published articles appear on public pages

## Current Configuration

- **Supabase Project**: `nvxykufajzppjtkmbtte`
- **Supabase URL**: `https://nvxykufajzppjtkmbtte.supabase.co`
- **Supabase Anon Key**: Configured in `.env`
- **Supabase Access Token**: Configured via `supabase login` (see `.env` for credentials)
- **Base Path**: `/` (for custom domain, change to `/repo-name` for GitHub Pages)
- **OpenRouter Key**: Configured as Supabase secret
- **OpenRouter Model**: `meta-llama/llama-3.1-8b-instruct:free` (configured as Supabase secret)

## What's Done

- [x] Full frontend codebase (React + Vite)
- [x] Full backend schema (Supabase migrations)
- [x] Edge functions (fetch-trends, generate-article)
- [x] Auth + RLS policies
- [x] CSS styling (clean, responsive)
- [x] `.env` configured with Supabase credentials
- [x] Supabase CLI installed (v2.106.0)
- [x] Supabase project linked (`supabase link --project-ref nvxykufajzppjtkmbtte`)
- [x] `fetch-trends` function deployed
- [x] `generate-article` function deployed
- [x] `OPENROUTER_API_KEY` secret set
- [x] `OPENROUTER_MODEL` secret set
- [x] DB tables exist (migration partially ran — policies already existed)
- [x] Dev server runs at `http://localhost:5173/`
- [x] Admin user created via SQL (direct INSERT into auth.users)
- [x] Admin role set via SQL (`UPDATE profiles SET role = 'admin'`)
- [x] `supabase/config.toml` updated (removed old `[project]` section, added function configs)

## What's Pending (Immediate)

- [x] Fix login error — was two issues: (1) Router basename transformed by Git Bash on Windows, (2) NULL columns in auth.users (`email_change`, `email_change_token_new`) causing GoTrue "Database error querying schema", (3) Password hash needed regeneration via `crypt()`
- [x] Admin login (`admin@example.com` / `admin`) works — verified via GoTrue API, returns valid access token
- [x] Refresh trends works — added unique constraint on `trends.title` for upsert dedup, 30 trends fetched from GDELT + Google News RSS
- [x] Trends now visible on public page — set status to `published` (was `new`, blocked by RLS)
- [x] Titles/summaries cleaned up — added `cleanTitle()`/`cleanSummary()` in fetch-trends to strip source suffixes, HTML entities, and URLs from RSS data
- [x] Fixed regex bug — `[—–-]` was a descending range that would crash Deno, changed to `[-—–]`
- [x] **Major change: Google Trends as primary source** — `fetch-trends` now fetches `https://trends.google.com/trending/rss?geo=PH` for real Philippines trending topics with traffic-based scoring. Also fetches related Google News articles for each trend. GDELT kept as fallback.
- [x] **Engaging article prompt** — `generate-article` rewritten to produce hook-driven articles: catchy intro, "why this matters to you" section, conversational Filipino English, short paragraphs, 7-section structure
- [x] Both edge functions re-deployed and verified — trends now show actual Google Trends PH data (earthquake, impeachment trial, etc.)
- [x] **Type-aware article prompt** — LLM adapts writing style based on trend category: News/Crisis → BBC-style explainer, Sports/Entertainment → narrative recap, Everyday Life → service journalism, General → flexible explainer. CRITICAL RULE: never mention Google Trends in the article.
- [x] **Featured image prompt generation** — LLM now generates a detailed DALL-E/Midjourney-ready image prompt (subject, setting, mood, lighting, colors, 30-80 words, no text in image)
- [x] **Image upload via Supabase Storage** — `article-images` bucket created (public), with RLS policies for authenticated admin upload/delete. GenerateArticle page has upload zone with preview and remove button.
- [x] **Article image display** — ArticleDetail shows hero image at top when `image_url` is set. ArticleCard shows thumbnail on article list.
- [x] **No section labels in articles** — Added "CRITICAL: NO SECTION LABELS" instruction to LLM prompt. Section labels (The Hook, What Happened, etc.) are internal guidelines only — never visible in published articles.
- [x] **Test article live** — Manually created test article for "earthquake near me" trend (5.7 Magnitude Quake Rattles Tonga). Content has proper newlines, no section labels, flows naturally. Renders correctly in browser.

## What's Pending (Future Improvements)

- [ ] No tests exist
- [ ] No trend auto-refresh/cron
- [ ] No search/filter for trends/articles
- [ ] No pagination
- [ ] No markdown preview in editor
- [ ] No mobile hamburger nav
- [ ] No SEO meta tags in index.html
- [ ] No CI/CD pipeline
- [ ] Consider TypeScript migration

## Key Code Details

- `createSlug()` is duplicated in both `generate-article/index.ts` and `GenerateArticle.jsx`
- `ProtectedRoute` checks both session and profile role via `onAuthStateChange`
- Articles render markdown via `react-markdown` library
- All styles are in a single `App.css` file with CSS custom properties for theming
- Edge functions use Deno (import from `deno.land` and `esm.sh`)
- Frontend uses Vite with `@vitejs/plugin-react`

## Deployment Notes

- **PowerShell execution policy** blocks `supabase.ps1` — had to use `cmd /c` with batch files for CLI commands
- **`cmd /c "set VAR=val && command"`** doesn't propagate env vars correctly — used `.bat` files with `set` on separate lines instead
- **`config.toml`** had outdated `[project]` section — removed it, kept only `[functions.*]` config
- **Supabase CLI link** worked but deploy initially failed due to config.toml format issue
- Admin user created via raw SQL INSERT into `auth.users` (dashboard "Add user" failed with unknown error)
