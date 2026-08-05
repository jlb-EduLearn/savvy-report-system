-- Run in Supabase: SQL Editor → New query → Run

create table if not exists app_data (
  id int primary key,
  schools jsonb not null default '[]'::jsonb,
  updated_at timestamptz default now()
);

insert into app_data (id, schools)
values (1, '[]'::jsonb)
on conflict (id) do nothing;

alter table app_data enable row level security;

create policy "public read app_data"
  on app_data for select
  using (true);

create policy "public insert app_data"
  on app_data for insert
  with check (true);

create policy "public update app_data"
  on app_data for update
  using (true);
