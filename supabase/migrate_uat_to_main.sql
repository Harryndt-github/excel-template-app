-- Migrate tất cả dữ liệu từ scope 'uat' sang scope 'main'
-- Chạy file này trong Supabase Dashboard > SQL Editor
-- ON CONFLICT DO NOTHING: bỏ qua nếu 'main' đã có dữ liệu cùng ID

BEGIN;

-- 1. md_entities
INSERT INTO public.md_entities
  (scope, entity_id, entity_name, entity_code, color, icon, canvas_x, canvas_y, sort_order, is_active, metadata, created_at, updated_at)
SELECT 'main', entity_id, entity_name, entity_code, color, icon, canvas_x, canvas_y, sort_order, is_active, metadata, created_at, updated_at
FROM public.md_entities WHERE scope = 'uat'
ON CONFLICT (scope, entity_id) DO NOTHING;

-- 2. md_fields
INSERT INTO public.md_fields
  (scope, entity_id, field_id, field_name, field_code, field_type, excel_column, is_required, is_key, sort_order, options, metadata, created_at, updated_at)
SELECT 'main', entity_id, field_id, field_name, field_code, field_type, excel_column, is_required, is_key, sort_order, options, metadata, created_at, updated_at
FROM public.md_fields WHERE scope = 'uat'
ON CONFLICT (scope, entity_id, field_id) DO NOTHING;

-- 3. md_records
INSERT INTO public.md_records
  (scope, entity_id, record_id, business_key, display_name, data, source_file, source_sheet, import_batch_id, is_active, created_at, updated_at)
SELECT 'main', entity_id, record_id, business_key, display_name, data, source_file, source_sheet, import_batch_id, is_active, created_at, updated_at
FROM public.md_records WHERE scope = 'uat'
ON CONFLICT (scope, entity_id, record_id) DO NOTHING;

-- 4. md_connections
INSERT INTO public.md_connections
  (scope, connection_id, from_entity_id, to_entity_id, from_field_id, to_field_id, label, relation_type, metadata, created_at, updated_at)
SELECT 'main', connection_id, from_entity_id, to_entity_id, from_field_id, to_field_id, label, relation_type, metadata, created_at, updated_at
FROM public.md_connections WHERE scope = 'uat'
ON CONFLICT (scope, connection_id) DO NOTHING;

-- 5. interest_support_policies
INSERT INTO public.interest_support_policies
  (scope, support_policy_id, support_policy_code, support_policy_name, default_support_months, support_end_date, support_payer, customer_payer, principal_payer, principal_rule, note, metadata, is_active, created_at, updated_at)
SELECT 'main', support_policy_id, support_policy_code, support_policy_name, default_support_months, support_end_date, support_payer, customer_payer, principal_payer, principal_rule, note, metadata, is_active, created_at, updated_at
FROM public.interest_support_policies WHERE scope = 'uat'
ON CONFLICT (scope, support_policy_id) DO NOTHING;

-- 6. fee_policies
INSERT INTO public.fee_policies
  (scope, fee_policy_id, fee_policy_code, fee_policy_name, note, metadata, is_active, created_at, updated_at)
SELECT 'main', fee_policy_id, fee_policy_code, fee_policy_name, note, metadata, is_active, created_at, updated_at
FROM public.fee_policies WHERE scope = 'uat'
ON CONFLICT (scope, fee_policy_id) DO NOTHING;

-- 7. real_estate_projects
INSERT INTO public.real_estate_projects
  (scope, project_id, developer_id, project_code, project_name, project_group, project_type, province, district, ward, metadata, is_active, created_at, updated_at)
SELECT 'main', project_id, developer_id, project_code, project_name, project_group, project_type, province, district, ward, metadata, is_active, created_at, updated_at
FROM public.real_estate_projects WHERE scope = 'uat'
ON CONFLICT (scope, project_id) DO NOTHING;

-- 8. sales_policies
INSERT INTO public.sales_policies
  (scope, policy_id, project_id, policy_code, policy_name, effective_from, effective_to, min_loan_term_months, max_loan_term_years, max_ltv_percent, max_loan_amount, policy_conditions, policy_note, color, metadata, is_active, created_at, updated_at)
SELECT 'main', policy_id, project_id, policy_code, policy_name, effective_from, effective_to, min_loan_term_months, max_loan_term_years, max_ltv_percent, max_loan_amount, policy_conditions, policy_note, color, metadata, is_active, created_at, updated_at
FROM public.sales_policies WHERE scope = 'uat'
ON CONFLICT (scope, policy_id) DO NOTHING;

-- 9. interest_rate_buckets
INSERT INTO public.interest_rate_buckets
  (scope, bucket_id, policy_id, max_months, bucket_label, preferential_rate, preferential_end_date, standard_fixed_rate, standard_margin, margin, note, sort_order, metadata, created_at, updated_at)
SELECT 'main', bucket_id, policy_id, max_months, bucket_label, preferential_rate, preferential_end_date, standard_fixed_rate, standard_margin, margin, note, sort_order, metadata, created_at, updated_at
FROM public.interest_rate_buckets WHERE scope = 'uat'
ON CONFLICT (scope, bucket_id) DO NOTHING;

-- 10. fee_policy_rules
INSERT INTO public.fee_policy_rules
  (scope, rule_id, fee_policy_id, policy_id, phase, phase_label, fee_percent, cutoff_month, sort_order, metadata, created_at, updated_at)
SELECT 'main', rule_id, fee_policy_id, policy_id, phase, phase_label, fee_percent, cutoff_month, sort_order, metadata, created_at, updated_at
FROM public.fee_policy_rules WHERE scope = 'uat'
ON CONFLICT (scope, rule_id) DO NOTHING;

-- 11. grace_rules
INSERT INTO public.grace_rules
  (scope, policy_id, base_months, with_htls, with_supplement, use_max_by_group, max_group_a, max_group_b, max_group_default, note, metadata)
SELECT 'main', policy_id, base_months, with_htls, with_supplement, use_max_by_group, max_group_a, max_group_b, max_group_default, note, metadata
FROM public.grace_rules WHERE scope = 'uat'
ON CONFLICT (scope, policy_id) DO NOTHING;

-- 12. project_policy_exceptions
INSERT INTO public.project_policy_exceptions
  (scope, exception_id, policy_id, project_name_match, max_grace_months, note, metadata, created_at, updated_at)
SELECT 'main', exception_id, policy_id, project_name_match, max_grace_months, note, metadata, created_at, updated_at
FROM public.project_policy_exceptions WHERE scope = 'uat'
ON CONFLICT (scope, exception_id) DO NOTHING;

-- 13. rate_adjustment_rules
INSERT INTO public.rate_adjustment_rules
  (scope, adjustment_id, policy_id, rule_name, rate_delta, note, is_active, sort_order, metadata, created_at, updated_at)
SELECT 'main', adjustment_id, policy_id, rule_name, rate_delta, note, is_active, sort_order, metadata, created_at, updated_at
FROM public.rate_adjustment_rules WHERE scope = 'uat'
ON CONFLICT (scope, adjustment_id) DO NOTHING;

-- 14. rate_adjustment_conditions
INSERT INTO public.rate_adjustment_conditions
  (scope, condition_id, adjustment_id, field_name, operator, expected_value, sort_order, metadata)
SELECT 'main', condition_id, adjustment_id, field_name, operator, expected_value, sort_order, metadata
FROM public.rate_adjustment_conditions WHERE scope = 'uat'
ON CONFLICT (scope, condition_id) DO NOTHING;

-- 15. document_templates
INSERT INTO public.document_templates
  (scope, template_id, template_name, template_type, storage_bucket, storage_path, source_file_name, placeholders, manual_fields, metadata, is_active, created_at, updated_at)
SELECT 'main', template_id, template_name, template_type, storage_bucket, storage_path, source_file_name, placeholders, manual_fields, metadata, is_active, created_at, updated_at
FROM public.document_templates WHERE scope = 'uat'
ON CONFLICT (scope, template_id) DO NOTHING;

COMMIT;
