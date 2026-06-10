-- Migration: add video_templates table
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/ptmemcasyjwjukjqqklj/sql/new

-- ── 1. Bảng video_templates ────────────────────────────────────
create table if not exists public.video_templates (
  scope         text        not null,
  video_id      text        not null,
  video_name    text        not null,
  file_name     text,
  file_size     bigint      not null default 0,
  storage_path  text,                             -- path trong Supabase Storage bucket
  description   text        not null default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  primary key (scope, video_id)
);

-- ── 2. Row Level Security ──────────────────────────────────────
alter table public.video_templates enable row level security;

drop policy if exists "uat anon all video_templates" on public.video_templates;

create policy "uat anon all video_templates"
on public.video_templates
for all
to anon
using (true)
with check (true);

-- ── 3. Storage bucket: cho phép MP4 trong bucket uat-templates ─
-- Bucket uat-templates đã tồn tại — chỉ cần thêm policy cho file MP4
insert into storage.buckets (id, name, public)
values ('uat-templates', 'uat-templates', false)
on conflict (id) do nothing;

-- Xóa policy cũ nếu có, tạo lại để bao gồm cả .mp4
drop policy if exists "uat anon upload templates"  on storage.objects;
drop policy if exists "uat anon read templates"    on storage.objects;
drop policy if exists "uat anon delete templates"  on storage.objects;
drop policy if exists "uat anon update templates"  on storage.objects;

create policy "uat anon upload templates"
on storage.objects for insert to anon
with check (bucket_id = 'uat-templates');

create policy "uat anon read templates"
on storage.objects for select to anon
using (bucket_id = 'uat-templates');

create policy "uat anon delete templates"
on storage.objects for delete to anon
using (bucket_id = 'uat-templates');

create policy "uat anon update templates"
on storage.objects for update to anon
using (bucket_id = 'uat-templates')
with check (bucket_id = 'uat-templates');
