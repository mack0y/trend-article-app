# PH Trend Article Generator

A web application that tracks Philippines-focused trending topics and global events that may affect the Philippines, then generates English articles using AI assistance.

## Features

- **Trend Tracking**: Fetches latest trends from GDELT and Google News RSS
- **Philippines Focus**: Filters for Philippine news and global impact stories
- **AI Article Generation**: Uses OpenRouter free LLM models to generate articles
- **Image Prompts**: Generates detailed prompts for featured images
- **Publishing**: Publishes articles directly to your website
- **GitHub Pages**: Static frontend hosted on GitHub Pages
- **Supabase Backend**: Database, auth, and edge functions

## Tech Stack

- **Frontend**: React + Vite (hosted on GitHub Pages)
- **Backend**: Supabase (Database + Auth + Edge Functions)
- **LLM**: OpenRouter free models
- **Trend Sources**: GDELT API + Google News RSS

## Setup

### 1. Supabase Setup

1. Create a new Supabase project
2. Run the migration SQL in `supabase/migrations/0001_initial_schema.sql`
3. Create an admin user in Supabase Auth
4. Update the profile role to admin:

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'your-email@example.com';
```

### 2. Edge Functions Setup

Set the following secrets in Supabase Dashboard > Edge Functions:

```bash
OPENROUTER_API_KEY=your-openrouter-api-key
OPENROUTER_MODEL=meta-llama/llama-3.1-8b-instruct:free
```

Deploy the functions:

```bash
supabase functions deploy fetch-trends
supabase functions deploy generate-article
```

### 3. Frontend Setup

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Copy `.env.example` to `.env` and fill in your Supabase credentials:

```bash
cp .env.example .env
```

4. Start the development server:

```bash
npm run dev
```

### 4. GitHub Pages Deployment

1. Build the project:

```bash
npm run build
```

2. Deploy to GitHub Pages:

```bash
# Option A: Manual deployment
# Copy the contents of dist/ to your gh-pages branch

# Option B: Using gh-pages package
npx gh-pages -d dist
```

### 5. Custom Domain Setup

1. In your GitHub repo, go to Settings > Pages
2. Under "Custom domain", enter your domain
3. Create a CNAME file in the `public/` folder with your domain
4. Update DNS records to point to GitHub Pages

## Environment Variables

### Frontend (.env)

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_BASE_PATH=/
```

### Edge Functions (Supabase Secrets)

```
OPENROUTER_API_KEY=your-openrouter-api-key
OPENROUTER_MODEL=meta-llama/llama-3.1-8b-instruct:free
```

## Usage

### Public Pages

- `/` - Homepage with latest articles and trends
- `/trends` - Browse all trending topics
- `/articles` - Read published articles

### Admin Pages

- `/admin/login` - Login to admin area
- `/admin/trends` - View and refresh trends
- `/admin/generate/:trendId` - Generate and edit articles
- `/admin/articles` - Manage published articles

## Workflow

1. Refresh trends (automatic every 3 hours or manual)
2. Select a trending topic
3. Generate article with AI
4. Review and edit the article
5. Copy the image prompt
6. Publish the article

## Trend Sources

- **GDELT API**: Global news monitoring (free, no API key)
- **Google News RSS**: Philippines and global headlines (free, no API key)

## License

MIT
