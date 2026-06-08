-- Migration: Tạo bảng project_infos cho module Thông tin Dự án
-- Chạy file này trong Supabase Dashboard > SQL Editor

-- ================================================================
-- 1. Tạo bảng
-- ================================================================

create table if not exists public.project_infos (
  scope            text        not null default 'default',
  project_info_id  text        not null,
  data             jsonb       not null default '{}'::jsonb,
  updated_at       timestamptz not null default now(),
  primary key (scope, project_info_id)
);

comment on table public.project_infos is
  'Lưu thông tin dự án (CĐT, TK giải ngân, mục đích vay…) cho module Thông tin Dự án trong Master Data.';

-- ================================================================
-- 2. Index hỗ trợ tìm kiếm JSON
-- ================================================================

create index if not exists idx_project_infos_scope
  on public.project_infos (scope);

create index if not exists idx_project_infos_data_gin
  on public.project_infos using gin (data);

-- ================================================================
-- 3. Row Level Security (UAT — permissive anon, thay bằng policy
--    xác thực trước khi lên production)
-- ================================================================

alter table public.project_infos enable row level security;

drop policy if exists "uat anon all project_infos" on public.project_infos;

create policy "uat anon all project_infos"
  on public.project_infos
  for all
  to anon
  using (true)
  with check (true);
