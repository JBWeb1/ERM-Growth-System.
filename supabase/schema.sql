-- ERM-Growth System — Supabase schema (Phase 2). Run in the SQL editor.
create extension if not exists "pgcrypto";

create table clients (
  id uuid primary key default gen_random_uuid(), name text not null, industry text,
  country text check (country in ('US','ZA')), currency text check (currency in ('USD','ZAR')) default 'USD',
  contact_name text, contact_email text, contact_phone text, package text, retainer numeric default 0,
  status text check (status in ('Lead','Active','Paused','Churned')) default 'Active',
  contract_start date, contract_end date, brand_color text, brand_color2 text, logo_url text, notes text,
  created_at timestamptz default now()
);
create table profiles (
  id uuid primary key references auth.users on delete cascade, name text,
  role text check (role in ('admin','team','client')) not null default 'client',
  client_id uuid references clients(id)
);
create table social_accounts (
  id uuid primary key default gen_random_uuid(), client_id uuid not null references clients(id) on delete cascade,
  platform text check (platform in ('tiktok','instagram','facebook','youtube')) not null, handle text, external_id text,
  refresh_token_enc text,  -- encrypted; only readable by server functions
  connected_at timestamptz, unique (client_id, platform)
);
create table metric_snapshots (  -- one row per client/platform/day
  client_id uuid not null references clients(id) on delete cascade, platform text not null, day date not null,
  views bigint default 0, likes bigint default 0, comments bigint default 0, shares bigint default 0, saves bigint default 0,
  followers_gained int default 0, followers_total bigint, watch_seconds bigint default 0, reach bigint default 0,
  captured_at timestamptz default now(), primary key (client_id, platform, day)
);
create table posts (
  id uuid primary key default gen_random_uuid(), client_id uuid not null references clients(id) on delete cascade,
  platform text not null, external_id text, title text, url text, thumbnail_url text, published_at timestamptz,
  unique (client_id, platform, external_id)
);
create table post_snapshots (post_id uuid references posts(id) on delete cascade, day date, views bigint, likes bigint, comments bigint, shares bigint, saves bigint, primary key (post_id, day));
create table goals (id uuid primary key default gen_random_uuid(), client_id uuid references clients(id) on delete cascade, metric text, label text, target numeric);
create table content_items (id uuid primary key default gen_random_uuid(), client_id uuid references clients(id) on delete cascade, title text, platform text, publish_date date, status text default 'planned', approval text, notes text, comments jsonb default '[]');
create table messages (id uuid primary key default gen_random_uuid(), client_id uuid references clients(id) on delete cascade, sender text check (sender in ('agency','client')), body text, created_at timestamptz default now());
create table requests (id uuid primary key default gen_random_uuid(), client_id uuid references clients(id) on delete cascade, type text, title text, details text, platform text, due date, status text default 'New', created_at timestamptz default now());
-- staff-only CRM tables
create table leads (id uuid primary key default gen_random_uuid(), name text, contact text, email text, phone text, stage text default 'New', source text, value numeric, currency text, follow_up date, notes text);
create table tasks (id uuid primary key default gen_random_uuid(), client_id uuid references clients(id), title text, assignee uuid references profiles(id), due date, status text default 'todo', priority text default 'med');
create table invoices (id uuid primary key default gen_random_uuid(), no text unique, client_id uuid references clients(id), description text, amount numeric, currency text, issued date, due date, status text default 'draft', recurring text);
create table proposals (id uuid primary key default gen_random_uuid(), lead_id uuid references leads(id), title text, template text, value numeric, currency text, status text default 'draft', sent_at date, opens int default 0);
create table templates (id uuid primary key default gen_random_uuid(), type text, name text, subject text, body text);
create table comms (id uuid primary key default gen_random_uuid(), client_id uuid references clients(id), channel text, direction text, subject text, at timestamptz default now(), by uuid references profiles(id));
create table report_schedules (id uuid primary key default gen_random_uuid(), client_id uuid references clients(id), freq text, day int, range text, recipients text, active boolean default true);

-- helpers
create function is_staff() returns boolean language sql stable security definer as $$ select exists(select 1 from profiles where id = auth.uid() and role in ('admin','team')) $$;
create function is_admin() returns boolean language sql stable security definer as $$ select exists(select 1 from profiles where id = auth.uid() and role = 'admin') $$;
create function my_client() returns uuid language sql stable security definer as $$ select client_id from profiles where id = auth.uid() $$;

-- RLS: every table on
do $$ declare t text; begin
  foreach t in array array['clients','profiles','social_accounts','metric_snapshots','posts','post_snapshots','goals','content_items','messages','requests','leads','tasks','invoices','proposals','templates','comms','report_schedules'] loop
    execute format('alter table %I enable row level security', t); end loop; end $$;

-- clients see ONLY their own rows
create policy clients_read on clients for select using (is_staff() or id = my_client());
create policy clients_write on clients for all using (is_staff()) with check (is_staff());
create policy profile_self on profiles for select using (id = auth.uid() or is_staff());
create policy profile_admin on profiles for all using (is_admin()) with check (is_admin());
create policy social_staff on social_accounts for all using (is_staff()) with check (is_staff()); -- clients never read tokens
create policy snap_read on metric_snapshots for select using (is_staff() or client_id = my_client());
create policy snap_write on metric_snapshots for all using (is_staff()) with check (is_staff());
create policy posts_read on posts for select using (is_staff() or client_id = my_client());
create policy posts_write on posts for all using (is_staff()) with check (is_staff());
create policy psnap_read on post_snapshots for select using (is_staff() or exists(select 1 from posts p where p.id = post_id and p.client_id = my_client()));
create policy goals_read on goals for select using (is_staff() or client_id = my_client());
create policy goals_write on goals for all using (is_staff()) with check (is_staff());
create policy content_read on content_items for select using (is_staff() or client_id = my_client());
create policy content_client_update on content_items for update using (client_id = my_client()) with check (client_id = my_client()); -- approve / comment
create policy content_staff on content_items for all using (is_staff()) with check (is_staff());
create policy msg_read on messages for select using (is_staff() or client_id = my_client());
create policy msg_client_insert on messages for insert with check (client_id = my_client() and sender = 'client');
create policy msg_staff on messages for all using (is_staff()) with check (is_staff());
create policy req_read on requests for select using (is_staff() or client_id = my_client());
create policy req_client_insert on requests for insert with check (client_id = my_client());
create policy req_staff on requests for all using (is_staff()) with check (is_staff());
-- staff-only CRM
create policy leads_staff on leads for all using (is_staff()) with check (is_staff());
create policy tasks_staff on tasks for all using (is_staff()) with check (is_staff());
create policy comms_staff on comms for all using (is_staff()) with check (is_staff());
create policy tpl_staff on templates for all using (is_staff()) with check (is_staff());
create policy sched_staff on report_schedules for all using (is_staff()) with check (is_staff());
-- billing: admin only (team members can't see money)
create policy inv_admin on invoices for all using (is_admin()) with check (is_admin());
create policy prop_admin on proposals for all using (is_admin()) with check (is_admin());
