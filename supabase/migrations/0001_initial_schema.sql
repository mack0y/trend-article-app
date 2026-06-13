-- Supabase schema for trend-article-app
-- Run this migration after creating your Supabase project

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- Profiles table
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  email text not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email, role)
  values (new.id, new.email, 'user');
  return new;
end;
$$ language plpgsql;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- Trends table
create table if not exists trends (
  id uuid primary key default uuid_generate_v4(),
  title text not null unique,
  summary text,
  category text default 'General',
  impact_score integer default 0,
  source_links jsonb default '[]'::jsonb,
  status text not null default 'new' check (status in ('new', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trend sources table
create table if not exists trend_sources (
  id uuid primary key default uuid_generate_v4(),
  trend_id uuid not null references trends(id) on delete cascade,
  source_name text,
  source_url text,
  published_at timestamptz,
  snippet text,
  created_at timestamptz not null default now()
);

-- Articles table
create table if not exists articles (
  id uuid primary key default uuid_generate_v4(),
  trend_id uuid not null references trends(id) on delete cascade,
  title text not null,
  slug text unique not null,
  summary text,
  content text,
  image_prompt text,
  image_url text,
  seo_description text,
  tags text[] default '{}',
  status text not null default 'draft' check (status in ('draft', 'reviewing', 'published', 'archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for performance
create index if not exists idx_trends_status on trends(status);
create index if not exists idx_trends_created_at on trends(created_at desc);
create index if not exists idx_trend_sources_trend_id on trend_sources(trend_id);
create index if not exists idx_articles_status on articles(status);
create index if not exists idx_articles_slug on articles(slug);
create index if not exists idx_articles_published_at on articles(published_at desc nulls last);
create index if not exists idx_articles_trend_id on articles(trend_id);

-- Update timestamps trigger
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace trigger update_trends_updated_at
  before update on trends
  for each row execute procedure update_updated_at();

create or replace trigger update_articles_updated_at
  before update on articles
  for each row execute procedure update_updated_at();

-- Security definer function to check admin status without RLS recursion
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Row Level Security policies

-- Profiles: users can read own profile, admins can read all
alter table profiles enable row level security;

create policy "Users can read own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Admins can read all profiles"
  on profiles for select
  using (public.is_admin());

-- Trends: public can read published, admins can do everything
alter table trends enable row level security;

create policy "Public can read published trends"
  on trends for select
  using (status = 'published');

create policy "Admins can read all trends"
  on trends for select
  using (public.is_admin());

create policy "Admins can insert trends"
  on trends for insert
  with check (public.is_admin());

create policy "Admins can update trends"
  on trends for update
  using (public.is_admin());

create policy "Admins can delete trends"
  on trends for delete
  using (public.is_admin());

-- Trend sources: public can read, admins can do everything
alter table trend_sources enable row level security;

create policy "Public can read trend sources"
  on trend_sources for select
  using (true);

create policy "Admins can manage trend sources"
  on trend_sources for all
  using (public.is_admin());

-- Articles: public can read published, admins can do everything
alter table articles enable row level security;

create policy "Public can read published articles"
  on articles for select
  using (status = 'published');

create policy "Admins can read all articles"
  on articles for select
  using (public.is_admin());

create policy "Admins can insert articles"
  on articles for insert
  with check (public.is_admin());

create policy "Admins can update articles"
  on articles for update
  using (public.is_admin());

create policy "Admins can delete articles"
  on articles for delete
  using (public.is_admin());

-- Create an admin user (run this after creating a user in Supabase Auth)
-- Replace 'your-email@example.com' with your actual email
-- update profiles set role = 'admin' where email = 'your-email@example.com';
