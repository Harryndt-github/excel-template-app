-- Production-like Master Data schema for UAT with real data.
-- Purpose:
-- - Store Master Data as queryable relational tables, not one JSON blob.
-- - Keep flexible custom fields via jsonb where business fields may change.
-- - Store template/policy configuration only. Do NOT store uploaded contract data.
-- - Use "scope" as workspace/environment key, e.g. "uat_ivb".

create extension if not exists pgcrypto;

-- ================================================================
-- 1. Generic Master Data Model
-- Mirrors MasterDataState:
-- entities: [{id, name, color, fields, x, y}]
-- fields:   [{id, name, type, excelColumn}]
-- records:  { entityId: [{ fieldId: value }]}
-- links:    [{fromEntity, toEntity, fromField, toField}]
-- ================================================================

create table if not exists public.md_entities (
  scope text not null,
  entity_id text not null,
  entity_name text not null,
  entity_code text,
  color text,
  icon text,
  canvas_x numeric,
  canvas_y numeric,
  sort_order int default 0,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (scope, entity_id),
  unique (scope, entity_name)
);

create table if not exists public.md_fields (
  scope text not null,
  entity_id text not null,
  field_id text not null,
  field_name text not null,
  field_code text,
  field_type text not null default 'text',
  excel_column text,
  is_required boolean not null default false,
  is_key boolean not null default false,
  sort_order int default 0,
  options jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (scope, entity_id, field_id),
  foreign key (scope, entity_id)
    references public.md_entities(scope, entity_id)
    on delete cascade
);

create table if not exists public.md_records (
  scope text not null,
  entity_id text not null,
  record_id text not null default gen_random_uuid()::text,
  business_key text,
  display_name text,
  data jsonb not null default '{}'::jsonb,
  source_file text,
  source_sheet text,
  import_batch_id text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (scope, entity_id, record_id),
  foreign key (scope, entity_id)
    references public.md_entities(scope, entity_id)
    on delete cascade
);

-- Optional row-per-value index table for fast query/filter by field.
-- Keep md_records.data as source-of-truth snapshot; populate this table from app/ETL.
create table if not exists public.md_record_values (
  scope text not null,
  entity_id text not null,
  record_id text not null,
  field_id text not null,
  value_text text,
  value_number numeric,
  value_date date,
  value_json jsonb,
  updated_at timestamptz not null default now(),
  primary key (scope, entity_id, record_id, field_id),
  foreign key (scope, entity_id, record_id)
    references public.md_records(scope, entity_id, record_id)
    on delete cascade,
  foreign key (scope, entity_id, field_id)
    references public.md_fields(scope, entity_id, field_id)
    on delete cascade
);

create table if not exists public.md_connections (
  scope text not null,
  connection_id text not null,
  from_entity_id text not null,
  to_entity_id text not null,
  from_field_id text not null,
  to_field_id text not null,
  label text,
  relation_type text default 'lookup',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (scope, connection_id),
  foreign key (scope, from_entity_id)
    references public.md_entities(scope, entity_id)
    on delete cascade,
  foreign key (scope, to_entity_id)
    references public.md_entities(scope, entity_id)
    on delete cascade
);

-- ================================================================
-- 2. Real Estate / Product / Price Master
-- Used to validate max loan amount = valid selling price * policy LTV.
-- ================================================================

create table if not exists public.developers (
  scope text not null,
  developer_id text not null,
  developer_code text,
  developer_name text not null,
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (scope, developer_id),
  unique (scope, developer_code)
);

create table if not exists public.real_estate_projects (
  scope text not null,
  project_id text not null,
  developer_id text,
  project_code text,
  project_name text not null,
  project_group text,
  project_type text,
  province text,
  district text,
  ward text,
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (scope, project_id),
  unique (scope, project_code),
  foreign key (scope, developer_id)
    references public.developers(scope, developer_id)
    on delete set null
);

create table if not exists public.project_products (
  scope text not null,
  product_id text not null,
  project_id text not null,
  product_code text,
  product_name text,
  product_type text,
  unit_code text,
  block_name text,
  floor_no text,
  area numeric,
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (scope, product_id),
  unique (scope, project_id, unit_code),
  foreign key (scope, project_id)
    references public.real_estate_projects(scope, project_id)
    on delete cascade
);

create table if not exists public.price_lists (
  scope text not null,
  price_id text not null,
  project_id text not null,
  product_id text,
  unit_code text,
  selling_price numeric not null,
  currency text not null default 'VND',
  effective_from date,
  effective_to date,
  source_file text,
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (scope, price_id),
  foreign key (scope, project_id)
    references public.real_estate_projects(scope, project_id)
    on delete cascade,
  foreign key (scope, product_id)
    references public.project_products(scope, product_id)
    on delete set null
);

-- ================================================================
-- 3. Sales Policy / Rate Center
-- Mirrors RateCenterState.projects[].packages[].
-- ================================================================

create table if not exists public.sales_policies (
  scope text not null,
  policy_id text not null,
  project_id text not null,
  policy_code text,
  policy_name text not null,
  effective_from date,
  effective_to date,
  min_loan_term_months int,
  max_loan_term_years numeric,
  max_ltv_percent numeric,
  max_loan_amount numeric,
  policy_conditions text,
  policy_note text,
  color text,
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (scope, policy_id),
  unique (scope, project_id, policy_code),
  foreign key (scope, project_id)
    references public.real_estate_projects(scope, project_id)
    on delete cascade
);

create table if not exists public.interest_rate_buckets (
  scope text not null,
  bucket_id text not null,
  policy_id text not null,
  max_months int not null,
  bucket_label text,
  preferential_rate numeric,
  preferential_end_date date,
  standard_fixed_rate numeric,
  standard_margin numeric,
  margin numeric,
  note text,
  sort_order int default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (scope, bucket_id),
  unique (scope, policy_id, max_months),
  foreign key (scope, policy_id)
    references public.sales_policies(scope, policy_id)
    on delete cascade
);

create table if not exists public.interest_support_policies (
  scope text not null,
  support_policy_id text not null,
  support_policy_code text,
  support_policy_name text not null,
  default_support_months int,
  support_end_date date,
  support_payer text default 'Chủ đầu tư',
  customer_payer text default 'Khách hàng',
  principal_payer text default 'Khách hàng',
  principal_rule text,
  note text,
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (scope, support_policy_id),
  unique (scope, support_policy_code)
);

create table if not exists public.fee_policies (
  scope text not null,
  fee_policy_id text not null,
  fee_policy_code text,
  fee_policy_name text not null,
  note text,
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (scope, fee_policy_id),
  unique (scope, fee_policy_code)
);

create table if not exists public.sales_policy_support_config (
  scope text not null,
  policy_id text not null,
  has_interest_support boolean not null default false,
  support_policy_id text,
  fee_policy_id text,
  default_support_months int,
  support_payer text,
  customer_payer text,
  principal_payer text,
  principal_rule text,
  note text,
  metadata jsonb not null default '{}'::jsonb,
  primary key (scope, policy_id),
  foreign key (scope, policy_id)
    references public.sales_policies(scope, policy_id)
    on delete cascade,
  foreign key (scope, support_policy_id)
    references public.interest_support_policies(scope, support_policy_id)
    on delete set null,
  foreign key (scope, fee_policy_id)
    references public.fee_policies(scope, fee_policy_id)
    on delete set null
);

create table if not exists public.fee_policy_rules (
  scope text not null,
  rule_id text not null,
  fee_policy_id text,
  policy_id text,
  phase text not null,
  phase_label text,
  fee_percent numeric,
  cutoff_month int default 60,
  sort_order int default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (scope, rule_id),
  foreign key (scope, fee_policy_id)
    references public.fee_policies(scope, fee_policy_id)
    on delete cascade,
  foreign key (scope, policy_id)
    references public.sales_policies(scope, policy_id)
    on delete cascade
);

create table if not exists public.grace_rules (
  scope text not null,
  policy_id text not null,
  base_months int default 0,
  with_htls boolean default true,
  with_supplement boolean default false,
  use_max_by_group boolean default false,
  max_group_a int,
  max_group_b int,
  max_group_default int,
  note text,
  metadata jsonb not null default '{}'::jsonb,
  primary key (scope, policy_id),
  foreign key (scope, policy_id)
    references public.sales_policies(scope, policy_id)
    on delete cascade
);

create table if not exists public.project_policy_exceptions (
  scope text not null,
  exception_id text not null,
  policy_id text not null,
  project_name_match text not null,
  max_grace_months int,
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (scope, exception_id),
  foreign key (scope, policy_id)
    references public.sales_policies(scope, policy_id)
    on delete cascade
);

create table if not exists public.rate_adjustment_rules (
  scope text not null,
  adjustment_id text not null,
  policy_id text not null,
  rule_name text not null,
  rate_delta numeric not null default 0,
  note text,
  is_active boolean not null default true,
  sort_order int default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (scope, adjustment_id),
  foreign key (scope, policy_id)
    references public.sales_policies(scope, policy_id)
    on delete cascade
);

create table if not exists public.rate_adjustment_conditions (
  scope text not null,
  condition_id text not null,
  adjustment_id text not null,
  field_name text not null,
  operator text not null default 'equals',
  expected_value text,
  sort_order int default 0,
  metadata jsonb not null default '{}'::jsonb,
  primary key (scope, condition_id),
  foreign key (scope, adjustment_id)
    references public.rate_adjustment_rules(scope, adjustment_id)
    on delete cascade
);

-- ================================================================
-- 4. Template Repository and Mapping
-- Contract/customer Excel data is never persisted; only mapping config is stored.
-- DOCX binary should remain in Supabase Storage bucket "uat-templates".
-- ================================================================

create table if not exists public.document_templates (
  scope text not null,
  template_id text not null,
  template_name text not null,
  template_type text not null default 'docx',
  storage_bucket text default 'uat-templates',
  storage_path text,
  source_file_name text,
  placeholders jsonb not null default '[]'::jsonb,
  manual_fields jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (scope, template_id)
);

create table if not exists public.template_mappings (
  scope text not null,
  mapping_id text not null,
  template_id text not null,
  placeholder_name text not null,
  source_type text not null, -- excel | master_data | rate_center | manual | calculated
  source_entity_id text,
  source_field_id text,
  source_key text,
  default_value text,
  transform_rule jsonb not null default '{}'::jsonb,
  is_required boolean not null default false,
  sort_order int default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (scope, mapping_id),
  foreign key (scope, template_id)
    references public.document_templates(scope, template_id)
    on delete cascade
);

-- ================================================================
-- 5. Import/Audit
-- ================================================================

create table if not exists public.import_batches (
  scope text not null,
  import_batch_id text not null default gen_random_uuid()::text,
  import_type text not null,
  source_file text,
  source_sheet text,
  total_rows int default 0,
  success_rows int default 0,
  error_rows int default 0,
  status text default 'completed',
  errors jsonb not null default '[]'::jsonb,
  created_by text,
  created_at timestamptz not null default now(),
  primary key (scope, import_batch_id)
);

create table if not exists public.audit_logs (
  audit_id bigserial primary key,
  scope text not null,
  actor_id text,
  action text not null,
  table_name text,
  record_key text,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

-- ================================================================
-- 6. Indexes
-- ================================================================

create index if not exists idx_md_records_data_gin on public.md_records using gin (data);
create index if not exists idx_md_record_values_text on public.md_record_values (scope, entity_id, field_id, value_text);
create index if not exists idx_md_record_values_number on public.md_record_values (scope, entity_id, field_id, value_number);
create index if not exists idx_price_lists_lookup on public.price_lists (scope, project_id, product_id, unit_code, effective_from, effective_to);
create index if not exists idx_sales_policies_project on public.sales_policies (scope, project_id, is_active);
create index if not exists idx_interest_buckets_policy on public.interest_rate_buckets (scope, policy_id, max_months);
create index if not exists idx_template_mappings_template on public.template_mappings (scope, template_id);

-- ================================================================
-- 7. RLS - UAT permissive policies
-- Replace with authenticated team policies before production.
-- ================================================================

alter table public.md_entities enable row level security;
alter table public.md_fields enable row level security;
alter table public.md_records enable row level security;
alter table public.md_record_values enable row level security;
alter table public.md_connections enable row level security;
alter table public.developers enable row level security;
alter table public.real_estate_projects enable row level security;
alter table public.project_products enable row level security;
alter table public.price_lists enable row level security;
alter table public.sales_policies enable row level security;
alter table public.interest_rate_buckets enable row level security;
alter table public.interest_support_policies enable row level security;
alter table public.fee_policies enable row level security;
alter table public.sales_policy_support_config enable row level security;
alter table public.fee_policy_rules enable row level security;
alter table public.grace_rules enable row level security;
alter table public.project_policy_exceptions enable row level security;
alter table public.rate_adjustment_rules enable row level security;
alter table public.rate_adjustment_conditions enable row level security;
alter table public.document_templates enable row level security;
alter table public.template_mappings enable row level security;
alter table public.import_batches enable row level security;
alter table public.audit_logs enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'md_entities','md_fields','md_records','md_record_values','md_connections',
    'developers','real_estate_projects','project_products','price_lists',
    'sales_policies','interest_rate_buckets','interest_support_policies','fee_policies',
    'sales_policy_support_config','fee_policy_rules','grace_rules','project_policy_exceptions',
    'rate_adjustment_rules','rate_adjustment_conditions',
    'document_templates','template_mappings','import_batches','audit_logs'
  ]
  loop
    execute format('drop policy if exists "uat anon all %I" on public.%I', t, t);
    execute format('create policy "uat anon all %I" on public.%I for all to anon using (true) with check (true)', t, t);
  end loop;
end $$;
