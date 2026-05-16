-- UAT schema for ExcelMapper cloud sync.
-- Purpose:
-- - Store template/master-data configuration only.
-- - Store original DOCX templates in a private Supabase Storage bucket.
-- - Do NOT store uploaded contract/customer Excel data.
--
-- Run this in Supabase SQL Editor. It creates:
-- - public.uat_app_state for configuration JSON
-- - private Storage bucket "uat-templates" for original DOCX files
-- - UAT-only anon policies for static-site testing

create table if not exists public.uat_app_state (
  scope text not null default 'default',
  state_key text not null,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (scope, state_key)
);

alter table public.uat_app_state enable row level security;

-- UAT-only policy.
-- This is intentionally permissive so the current static web app can be tested
-- without a login flow. For production, replace these policies with authenticated
-- user/team policies and never expose admin/service keys in the browser.
drop policy if exists "uat anon read app state" on public.uat_app_state;
drop policy if exists "uat anon write app state" on public.uat_app_state;
drop policy if exists "uat anon update app state" on public.uat_app_state;

create policy "uat anon read app state"
on public.uat_app_state
for select
to anon
using (true);

create policy "uat anon write app state"
on public.uat_app_state
for insert
to anon
with check (true);

create policy "uat anon update app state"
on public.uat_app_state
for update
to anon
using (true)
with check (true);

insert into storage.buckets (id, name, public)
values ('uat-templates', 'uat-templates', false)
on conflict (id) do nothing;

drop policy if exists "uat anon upload templates" on storage.objects;
drop policy if exists "uat anon read templates" on storage.objects;
drop policy if exists "uat anon update templates" on storage.objects;
drop policy if exists "uat anon delete templates" on storage.objects;

create policy "uat anon upload templates"
on storage.objects
for insert
to anon
with check (bucket_id = 'uat-templates');

create policy "uat anon read templates"
on storage.objects
for select
to anon
using (bucket_id = 'uat-templates');

create policy "uat anon update templates"
on storage.objects
for update
to anon
using (bucket_id = 'uat-templates')
with check (bucket_id = 'uat-templates');

create policy "uat anon delete templates"
on storage.objects
for delete
to anon
using (bucket_id = 'uat-templates');
