/* ================================================================
   UAT Cloud Storage — Supabase relational persistence layer
   Dùng bảng từ real_master_data_schema.sql (không còn uat_app_state).
   ================================================================ */

const UatStorage = {
  configKey: 'excelmapper_uat_supabase_config',
  scope: 'default',
  bucket: 'uat-templates',
  client: null,
  syncTimer: null,
  isSyncing: false,
  lastStatus: 'Chưa cấu hình',

  // ── Init ─────────────────────────────────────────────────────
  init() {
    this.loadConfig();
    this.renderStatus();
    if (!this.client) { this._showNoStorageToast(); return; }
    this._showLoadingOverlay('Đang tải dữ liệu từ Supabase…');
    setTimeout(() => {
      this.pullAll()
        .catch(err => {
          console.error('[UatStorage] Auto pull failed:', err);
          this.toast('Không thể tải dữ liệu từ Supabase: ' + err.message, 'error');
        })
        .finally(() => this._hideLoadingOverlay());
    }, 300);
  },

  loadConfig() {
    const fromWindow = window.UAT_SUPABASE_CONFIG || {};
    let stored = {};
    try { stored = JSON.parse(localStorage.getItem(this.configKey) || '{}'); } catch (_) {}
    // localStorage override chỉ khi có giá trị thực — tránh empty string ghi đè config.js
    this.url    = (stored.url    || '').trim() || fromWindow.url    || fromWindow.supabaseUrl  || '';
    this.key    = (stored.key    || stored.anonKey || stored.publishableKey || '').trim()
                  || fromWindow.key || fromWindow.anonKey || fromWindow.publishableKey || '';
    this.scope  = (stored.scope  || '').trim() || fromWindow.scope  || 'default';
    this.bucket = (stored.bucket || '').trim() || fromWindow.bucket || 'uat-templates';
    this.connect();
  },

  connect() {
    if (!this.url || !this.key || !window.supabase || !window.supabase.createClient) {
      this.client = null;
      this.lastStatus = 'Chưa cấu hình Supabase';
      return false;
    }
    this.client = window.supabase.createClient(this.url, this.key);
    this.lastStatus = `Supabase: ${this.scope}`;
    return true;
  },

  // ── Dev helpers ──────────────────────────────────────────────
  _devSetConfig(url, key, scope, bucket) {
    const cfg = {
      url: (url || '').trim(), key: (key || '').trim(),
      scope: (scope || 'default').trim(), bucket: (bucket || 'uat-templates').trim(),
    };
    localStorage.setItem(this.configKey, JSON.stringify(cfg));
    this.loadConfig(); this.renderStatus();
    console.info('[UatStorage] Config updated:', cfg.url, '| scope:', cfg.scope);
  },

  _devClearConfig() {
    localStorage.removeItem(this.configKey);
    this.loadConfig(); this.renderStatus();
    console.info('[UatStorage] Config cleared');
  },

  _devDiagnose() {
    const stored = JSON.parse(localStorage.getItem(this.configKey) || '{}');
    console.group('[UatStorage] Diagnose');
    console.log('window.UAT_SUPABASE_CONFIG:', window.UAT_SUPABASE_CONFIG);
    console.log('localStorage config:', stored);
    console.log('Active url:', this.url);
    console.log('Active key:', this.key ? this.key.slice(0, 20) + '…' : '(empty)');
    console.log('Active scope:', this.scope);
    console.log('Client connected:', !!this.client);
    console.groupEnd();
  },

  // ── Loading overlay ──────────────────────────────────────────
  _showLoadingOverlay(message) {
    if (document.getElementById('uat-loading-overlay')) return;
    if (!document.getElementById('_uat_spin_style')) {
      const s = document.createElement('style');
      s.id = '_uat_spin_style';
      s.textContent = '@keyframes _uat_spin{to{transform:rotate(360deg)}}';
      document.head.appendChild(s);
    }
    const el = document.createElement('div');
    el.id = 'uat-loading-overlay';
    el.style.cssText = [
      'position:fixed','top:0','right:0','bottom:0','left:0','z-index:9999',
      'background:rgba(12,12,31,0.93)',
      'display:flex','flex-direction:column','align-items:center','justify-content:center','gap:20px',
    ].join(';');
    el.innerHTML = `
      <div style="width:52px;height:52px;border:4px solid rgba(99,102,241,0.25);border-top-color:#6366f1;border-radius:50%;animation:_uat_spin 0.8s linear infinite;"></div>
      <p id="uat-loading-msg" style="color:#e2e8f0;font-size:1rem;font-family:Inter,sans-serif;margin:0;">${message || 'Đang tải…'}</p>
      <p style="color:#64748b;font-size:0.78rem;font-family:Inter,sans-serif;margin:0;">Đang đồng bộ dữ liệu từ Supabase</p>
    `;
    document.body.appendChild(el);
  },

  _hideLoadingOverlay() {
    const el = document.getElementById('uat-loading-overlay');
    if (el) el.remove();
  },

  _showNoStorageToast() {
    setTimeout(() => {
      this.toast('⚠️ Supabase chưa được cấu hình — dữ liệu sẽ mất khi reload trang. Liên hệ admin để cấu hình js/config.js.', 'warning');
    }, 500);
  },

  // ── UI helpers ───────────────────────────────────────────────
  toast(message, type) {
    if (typeof App !== 'undefined' && App.toast) App.toast(message, type || 'info');
    else console.log(`[UatStorage] ${message}`);
  },

  renderStatus() {
    const el = document.getElementById('uat-sync-status');
    if (!el) return;
    const active = !!this.client;
    el.textContent = active ? `Supabase: ${this.scope}` : 'Chưa cấu hình';
    el.style.background = active ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.14)';
    el.style.color      = active ? '#10b981' : '#ef4444';
    el.title = active
      ? `Dữ liệu được lưu trên Supabase (scope: ${this.scope})`
      : 'Supabase chưa cấu hình — dữ liệu chỉ tồn tại trong phiên này, sẽ mất khi reload';
  },

  // ── Sync queue ───────────────────────────────────────────────
  queueSync(reason) {
    if (!this.client || this.isSyncing) return;
    clearTimeout(this.syncTimer);
    this.syncTimer = setTimeout(() => this.pushAll(reason || 'auto').catch(err => {
      console.warn('[UatStorage] Auto sync failed:', err);
      this.toast('Đồng bộ Supabase thất bại: ' + err.message, 'warning');
    }), 1200);
  },

  // ── Helpers ──────────────────────────────────────────────────
  _throwIfErr(res, label) {
    if (res && res.error) {
      console.error(`[UatStorage] ${label}:`, res.error);
      throw res.error;
    }
  },

  _pkgFieldVal(pkg, fieldId) {
    const f = (pkg.fields || []).find(f => f.id === fieldId);
    return f ? (f.value || '') : '';
  },

  _numOrNull(v) {
    if (v === '' || v == null) return null;
    const n = Number(v);
    return isNaN(n) ? null : n;
  },

  _strOrNull(v) {
    const s = String(v || '').trim();
    return s || null;
  },

  // ── Push ─────────────────────────────────────────────────────
  async pushAll(reason) {
    if (!this.client && !this.connect()) {
      this.toast('Chưa cấu hình Supabase.', 'warning');
      return false;
    }
    this.isSyncing = true;
    this.renderStatus();
    try {
      if (reason !== 'auto') this.toast('Đang đẩy dữ liệu lên Supabase…', 'info');
      await this.uploadNativeDocxTemplates();
      await this._pushMasterData();
      await this._pushRateCenter();
      await this._pushTemplates();
      this.lastStatus = `Synced ${new Date().toLocaleTimeString('vi-VN')}`;
      if (reason !== 'auto') this.toast('Đã đẩy dữ liệu lên Supabase', 'success');
      this.renderStatus();
      return true;
    } finally {
      this.isSyncing = false;
    }
  },

  async _pushMasterData() {
    if (typeof MasterDataState === 'undefined') return;
    const entities    = MasterDataState.entities    || [];
    const records     = MasterDataState.records     || {};
    const connections = MasterDataState.connections || [];
    const now = new Date().toISOString();

    if (entities.length) {
      this._throwIfErr(
        await this.client.from('md_entities').upsert(
          entities.map((e, i) => ({
            scope: this.scope, entity_id: e.id, entity_name: e.name,
            color: e.color || null, canvas_x: e.x ?? null, canvas_y: e.y ?? null,
            sort_order: i, updated_at: now,
          })),
          { onConflict: 'scope,entity_id' }
        ), 'push md_entities'
      );

      const fieldRows = [];
      entities.forEach(e => {
        (e.fields || []).forEach((f, i) => fieldRows.push({
          scope: this.scope, entity_id: e.id, field_id: f.id,
          field_name: f.name, field_type: f.type || 'text',
          excel_column: f.excelColumn || null, sort_order: i, updated_at: now,
        }));
      });
      if (fieldRows.length) {
        this._throwIfErr(
          await this.client.from('md_fields').upsert(fieldRows, { onConflict: 'scope,entity_id,field_id' }),
          'push md_fields'
        );
      }
    }

    const recordRows = [];
    for (const [entityId, entityRecords] of Object.entries(records)) {
      (entityRecords || []).forEach(rec => {
        const rid = rec._dbId || (entityId + '_' + Math.random().toString(36).slice(2, 9));
        rec._dbId = rid;
        const clean = { ...rec }; delete clean._dbId;
        recordRows.push({ scope: this.scope, entity_id: entityId, record_id: rid, data: clean, updated_at: now });
      });
    }
    if (recordRows.length) {
      this._throwIfErr(
        await this.client.from('md_records').upsert(recordRows, { onConflict: 'scope,entity_id,record_id' }),
        'push md_records'
      );
    }

    if (connections.length) {
      this._throwIfErr(
        await this.client.from('md_connections').upsert(
          connections.map(c => ({
            scope: this.scope, connection_id: c.id,
            from_entity_id: c.fromEntity, to_entity_id: c.toEntity,
            from_field_id: c.fromField, to_field_id: c.toField,
            label: c.label || null, updated_at: now,
          })),
          { onConflict: 'scope,connection_id' }
        ), 'push md_connections'
      );
    }
  },

  async _pushRateCenter() {
    if (typeof RateCenterState === 'undefined') return;
    const projects    = RateCenterState.projects       || [];
    const supportPols = RateCenterState.supportPolicies || [];
    const feePols     = RateCenterState.feePolicies    || [];
    const now = new Date().toISOString();

    if (supportPols.length) {
      this._throwIfErr(
        await this.client.from('interest_support_policies').upsert(
          supportPols.map(sp => ({
            scope: this.scope, support_policy_id: sp.id,
            support_policy_code: this._strOrNull(sp.code),
            support_policy_name: sp.name || 'Chính sách hỗ trợ',
            default_support_months: this._numOrNull(sp.defaultSupportMonths),
            support_end_date: this._strOrNull(sp.supportEndDate),
            note: this._strOrNull(sp.note),
            metadata: sp.metadata || {}, updated_at: now,
          })),
          { onConflict: 'scope,support_policy_id' }
        ), 'push interest_support_policies'
      );
    }

    if (feePols.length) {
      this._throwIfErr(
        await this.client.from('fee_policies').upsert(
          feePols.map(fp => ({
            scope: this.scope, fee_policy_id: fp.id,
            fee_policy_code: this._strOrNull(fp.code),
            fee_policy_name: fp.name || 'Chính sách phí',
            note: this._strOrNull(fp.note),
            metadata: fp.metadata || {}, updated_at: now,
          })),
          { onConflict: 'scope,fee_policy_id' }
        ), 'push fee_policies'
      );
    }

    if (!projects.length) return;

    this._throwIfErr(
      await this.client.from('real_estate_projects').upsert(
        projects.map(pr => ({
          scope: this.scope, project_id: pr.id, project_name: pr.name,
          metadata: { color: pr.color, icon: pr.icon }, updated_at: now,
        })),
        { onConflict: 'scope,project_id' }
      ), 'push real_estate_projects'
    );

    for (const pr of projects) {
      const pkgs = pr.packages || [];
      if (!pkgs.length) continue;

      this._throwIfErr(
        await this.client.from('sales_policies').upsert(
          pkgs.map(pkg => ({
            scope: this.scope, policy_id: pkg.id, project_id: pr.id,
            policy_name: pkg.name,
            policy_code:          this._strOrNull(this._pkgFieldVal(pkg, 'f_policy_code')),
            effective_from:       this._strOrNull(this._pkgFieldVal(pkg, 'f_effective_from')),
            effective_to:         this._strOrNull(this._pkgFieldVal(pkg, 'f_effective_to')),
            policy_conditions:    this._strOrNull(this._pkgFieldVal(pkg, 'f_legal_note')),
            policy_note:          this._strOrNull(this._pkgFieldVal(pkg, 'f_policy_note')),
            min_loan_term_months: this._numOrNull(this._pkgFieldVal(pkg, 'f_min_term')),
            max_ltv_percent:      this._numOrNull(this._pkgFieldVal(pkg, 'f_ltv')),
            max_loan_term_years:  this._numOrNull(this._pkgFieldVal(pkg, 'f_max_term')),
            max_loan_amount:      this._numOrNull(this._pkgFieldVal(pkg, 'f_max_loan_amount')),
            color: pkg.color || null,
            metadata: {
              color: pkg.color,
              interestSupportRules:  pkg.interestSupportRules  || {},
              eligibilityConditions: pkg.eligibilityConditions || [],
              tiers: pkg.tiers || [], conditions: pkg.conditions || [],
              customFields: pkg.customFields || [],
            },
            updated_at: now,
          })),
          { onConflict: 'scope,policy_id' }
        ), 'push sales_policies'
      );

      for (const pkg of pkgs) {
        if ((pkg.rateBuckets || []).length) {
          this._throwIfErr(
            await this.client.from('interest_rate_buckets').upsert(
              pkg.rateBuckets.map((b, i) => ({
                scope: this.scope, bucket_id: b.id, policy_id: pkg.id,
                max_months: Number(b.maxMonths) || 0,
                bucket_label: b.label || null,
                preferential_rate: this._numOrNull(b.rate),
                margin: this._numOrNull(b.margin),
                note: this._strOrNull(b.note),
                sort_order: i, updated_at: now,
              })),
              { onConflict: 'scope,bucket_id' }
            ), 'push interest_rate_buckets'
          );
        }

        if ((pkg.feeRules || []).length) {
          this._throwIfErr(
            await this.client.from('fee_policy_rules').upsert(
              pkg.feeRules.map((f, i) => ({
                scope: this.scope, rule_id: f.id, policy_id: pkg.id,
                phase: f.phase, phase_label: f.label || null,
                fee_percent: this._numOrNull(f.fee),
                cutoff_month: pkg.feeCutoffMonth || 60,
                sort_order: i, updated_at: now,
              })),
              { onConflict: 'scope,rule_id' }
            ), 'push fee_policy_rules'
          );
        }

        if (pkg.graceRules) {
          const gr = pkg.graceRules;
          this._throwIfErr(
            await this.client.from('grace_rules').upsert([{
              scope: this.scope, policy_id: pkg.id,
              base_months: gr.baseMonths || 0,
              with_htls: gr.withHTLS !== false,
              with_supplement: gr.withSupplement || false,
              use_max_by_group: gr.useMaxByGroup || false,
              max_group_a: this._numOrNull((gr.maxByGroup || {}).A),
              max_group_b: this._numOrNull((gr.maxByGroup || {}).B),
              max_group_default: this._numOrNull((gr.maxByGroup || {}).default),
              note: this._strOrNull(gr.note),
              metadata: { maxByGroup: gr.maxByGroup || {} },
            }], { onConflict: 'scope,policy_id' }),
            'push grace_rules'
          );
        }

        if ((pkg.projectExceptions || []).length) {
          this._throwIfErr(
            await this.client.from('project_policy_exceptions').upsert(
              pkg.projectExceptions.map(e => ({
                scope: this.scope, exception_id: e.id, policy_id: pkg.id,
                project_name_match: e.projectName || '',
                max_grace_months: this._numOrNull(e.maxGrace),
                note: this._strOrNull(e.note), updated_at: now,
              })),
              { onConflict: 'scope,exception_id' }
            ), 'push project_policy_exceptions'
          );
        }

        if ((pkg.rateAdjustments || []).length) {
          this._throwIfErr(
            await this.client.from('rate_adjustment_rules').upsert(
              pkg.rateAdjustments.map((a, i) => ({
                scope: this.scope, adjustment_id: a.id, policy_id: pkg.id,
                rule_name: a.name || 'Điều chỉnh',
                rate_delta: Number(a.delta) || 0,
                note: this._strOrNull(a.note),
                is_active: a.isActive !== false,
                sort_order: i, updated_at: now,
              })),
              { onConflict: 'scope,adjustment_id' }
            ), 'push rate_adjustment_rules'
          );

          for (const a of pkg.rateAdjustments) {
            if (!(a.conditions || []).length) continue;
            this._throwIfErr(
              await this.client.from('rate_adjustment_conditions').upsert(
                a.conditions.map((c, i) => ({
                  scope: this.scope,
                  condition_id: c.id || (a.id + '_c' + i),
                  adjustment_id: a.id,
                  field_name: c.fieldName || c.field_name || '',
                  operator: c.operator || 'equals',
                  expected_value: c.expectedValue != null ? String(c.expectedValue) : null,
                  sort_order: i,
                })),
                { onConflict: 'scope,condition_id' }
              ), 'push rate_adjustment_conditions'
            );
          }
        }
      }
    }
  },

  async _pushTemplates() {
    const now = new Date().toISOString();
    const rows = [];

    if (typeof WordState !== 'undefined') {
      this.cleanWordTemplates(WordState.templates || []).forEach(tpl => {
        rows.push({
          scope: this.scope, template_id: tpl.id,
          template_name: tpl.name || 'Word Template',
          template_type: 'docx',
          storage_bucket: this.bucket,
          storage_path: tpl.storagePath || null,
          source_file_name: tpl.fileName || null,
          placeholders: tpl.placeholders || [],
          manual_fields: tpl.manualFields || [],
          metadata: { ...tpl, placeholders: undefined, manualFields: undefined },
          updated_at: now,
        });
      });
    }

    if (typeof AppState !== 'undefined') {
      (AppState.templates || []).forEach(tpl => {
        rows.push({
          scope: this.scope, template_id: tpl.id,
          template_name: tpl.name || 'Excel Template',
          template_type: 'excel',
          storage_bucket: null, storage_path: null,
          source_file_name: tpl.fileName || null,
          placeholders: tpl.placeholders || [],
          manual_fields: tpl.manualFields || [],
          metadata: { ...tpl, exportCount: AppState.exportCount || 0 },
          updated_at: tpl.updatedAt || now,
        });
      });
    }

    if (rows.length) {
      this._throwIfErr(
        await this.client.from('document_templates').upsert(rows, { onConflict: 'scope,template_id' }),
        'push document_templates'
      );
    }
  },

  // ── Pull ─────────────────────────────────────────────────────
  async pullAll() {
    if (!this.client && !this.connect()) {
      this.toast('Chưa cấu hình Supabase.', 'warning');
      return false;
    }
    this.isSyncing = true;
    try {
      const [mdData, rcData, tplData] = await Promise.all([
        this._pullMasterData(),
        this._pullRateCenter(),
        this._pullTemplates(),
      ]);
      this._restoreMasterData(mdData);
      this._restoreRateCenter(rcData);
      this._restoreTemplates(tplData);
      this.renderStatus();
      return true;
    } finally {
      this.isSyncing = false;
    }
  },

  async _pullMasterData() {
    const [eRes, fRes, rRes, cRes] = await Promise.all([
      this.client.from('md_entities').select('*').eq('scope', this.scope).order('sort_order'),
      this.client.from('md_fields').select('*').eq('scope', this.scope).order('sort_order'),
      this.client.from('md_records').select('*').eq('scope', this.scope),
      this.client.from('md_connections').select('*').eq('scope', this.scope),
    ]);
    this._throwIfErr(eRes, 'pull md_entities');
    this._throwIfErr(fRes, 'pull md_fields');
    this._throwIfErr(rRes, 'pull md_records');
    this._throwIfErr(cRes, 'pull md_connections');
    return { entities: eRes.data || [], fields: fRes.data || [], records: rRes.data || [], connections: cRes.data || [] };
  },

  _restoreMasterData({ entities, fields, records, connections }) {
    if (!entities.length && !connections.length) return;

    const fieldsByEntity = {};
    for (const f of fields) {
      (fieldsByEntity[f.entity_id] = fieldsByEntity[f.entity_id] || []).push({
        id: f.field_id, name: f.field_name,
        type: f.field_type || 'text', excelColumn: f.excel_column || '',
      });
    }

    MasterDataState.entities = entities.map(e => ({
      id: e.entity_id, name: e.entity_name,
      color: e.color || '#6366f1',
      x: e.canvas_x || 0, y: e.canvas_y || 0,
      fields: fieldsByEntity[e.entity_id] || [],
    }));

    const recsByEntity = {};
    for (const r of records) {
      const rec = { ...(r.data || {}), _dbId: r.record_id };
      (recsByEntity[r.entity_id] = recsByEntity[r.entity_id] || []).push(rec);
    }
    MasterDataState.records = recsByEntity;

    MasterDataState.connections = connections.map(c => ({
      id: c.connection_id,
      fromEntity: c.from_entity_id, toEntity: c.to_entity_id,
      fromField: c.from_field_id, toField: c.to_field_id,
      label: c.label || '',
    }));

    if (typeof MasterData !== 'undefined' && typeof MasterData.setView === 'function') {
      MasterData.setView(MasterDataState.viewMode || 'config');
    }
  },

  async _pullRateCenter() {
    const [prRes, polRes, bktRes, feeRes, grRes, exRes, adjRes, condRes, spRes, fpRes] = await Promise.all([
      this.client.from('real_estate_projects').select('*').eq('scope', this.scope),
      this.client.from('sales_policies').select('*').eq('scope', this.scope),
      this.client.from('interest_rate_buckets').select('*').eq('scope', this.scope).order('sort_order'),
      this.client.from('fee_policy_rules').select('*').eq('scope', this.scope).order('sort_order'),
      this.client.from('grace_rules').select('*').eq('scope', this.scope),
      this.client.from('project_policy_exceptions').select('*').eq('scope', this.scope),
      this.client.from('rate_adjustment_rules').select('*').eq('scope', this.scope).order('sort_order'),
      this.client.from('rate_adjustment_conditions').select('*').eq('scope', this.scope).order('sort_order'),
      this.client.from('interest_support_policies').select('*').eq('scope', this.scope),
      this.client.from('fee_policies').select('*').eq('scope', this.scope),
    ]);
    const labels = ['projects','policies','buckets','feeRules','grace','exceptions','adjustments','conditions','supportPols','feePols'];
    [prRes, polRes, bktRes, feeRes, grRes, exRes, adjRes, condRes, spRes, fpRes].forEach((r, i) => this._throwIfErr(r, 'pull ' + labels[i]));
    return {
      projects: prRes.data || [], policies: polRes.data || [],
      buckets: bktRes.data || [], feeRules: feeRes.data || [],
      graceRules: grRes.data || [], exceptions: exRes.data || [],
      adjustments: adjRes.data || [], conditions: condRes.data || [],
      supportPolicies: spRes.data || [], feePolicies: fpRes.data || [],
    };
  },

  _restoreRateCenter({ projects, policies, buckets, feeRules, graceRules, exceptions, adjustments, conditions, supportPolicies, feePolicies }) {
    if (!projects.length && !policies.length && !supportPolicies.length && !feePolicies.length) return;

    const bktByPolicy = {}, feeByPolicy = {}, grByPolicy = {}, exByPolicy = {}, adjByPolicy = {}, condByAdj = {};
    for (const b of buckets)     { (bktByPolicy[b.policy_id]   = bktByPolicy[b.policy_id]   || []).push(b); }
    for (const f of feeRules)    { (feeByPolicy[f.policy_id]   = feeByPolicy[f.policy_id]   || []).push(f); }
    for (const g of graceRules)  { grByPolicy[g.policy_id]     = g; }
    for (const e of exceptions)  { (exByPolicy[e.policy_id]    = exByPolicy[e.policy_id]    || []).push(e); }
    for (const a of adjustments) { (adjByPolicy[a.policy_id]   = adjByPolicy[a.policy_id]   || []).push(a); }
    for (const c of conditions)  { (condByAdj[c.adjustment_id] = condByAdj[c.adjustment_id] || []).push(c); }

    const pkgsByProject = {};
    for (const p of policies) {
      const gr   = grByPolicy[p.policy_id];
      const meta = p.metadata || {};
      const feeCutoffs = (feeByPolicy[p.policy_id] || []).map(f => f.cutoff_month || 60);
      const pkg = {
        id: p.policy_id, name: p.policy_name, color: p.color || meta.color || '#6366f1',
        fields: [
          { id: 'f_policy_code',     value: p.policy_code          || '' },
          { id: 'f_effective_from',  value: p.effective_from       || '' },
          { id: 'f_effective_to',    value: p.effective_to         || '' },
          { id: 'f_legal_note',      value: p.policy_conditions    || '' },
          { id: 'f_policy_note',     value: p.policy_note          || '' },
          { id: 'f_min_term',        value: p.min_loan_term_months != null ? String(p.min_loan_term_months) : '' },
          { id: 'f_ltv',             value: p.max_ltv_percent      != null ? String(p.max_ltv_percent)      : '' },
          { id: 'f_max_term',        value: p.max_loan_term_years  != null ? String(p.max_loan_term_years)  : '' },
          { id: 'f_max_loan_amount', value: p.max_loan_amount      != null ? String(p.max_loan_amount)      : '' },
        ],
        rateBuckets: (bktByPolicy[p.policy_id] || []).map(b => ({
          id: b.bucket_id, maxMonths: b.max_months,
          rate:   b.preferential_rate  != null ? String(b.preferential_rate)  : (b.standard_fixed_rate != null ? String(b.standard_fixed_rate) : ''),
          margin: b.margin             != null ? String(b.margin)             : '',
          label:  b.bucket_label || `≤ ${b.max_months} tháng`,
          note:   b.note || '',
        })),
        feeRules: (feeByPolicy[p.policy_id] || []).map(f => ({
          id: f.rule_id, phase: f.phase, label: f.phase_label || '',
          fee: f.fee_percent != null ? String(f.fee_percent) : '',
        })),
        feeCutoffMonth: feeCutoffs.length ? Math.max(...feeCutoffs) : 60,
        graceRules: gr ? {
          baseMonths: gr.base_months || 0,
          withHTLS: gr.with_htls !== false,
          withSupplement: gr.with_supplement || false,
          useMaxByGroup: gr.use_max_by_group || false,
          maxByGroup: { A: gr.max_group_a || 36, B: gr.max_group_b || 24, default: gr.max_group_default || 0 },
          note: gr.note || '',
        } : undefined,
        projectExceptions: (exByPolicy[p.policy_id] || []).map(e => ({
          id: e.exception_id, projectName: e.project_name_match,
          maxGrace: e.max_grace_months, note: e.note || '',
        })),
        rateAdjustments: (adjByPolicy[p.policy_id] || []).map(a => ({
          id: a.adjustment_id, name: a.rule_name,
          delta: a.rate_delta, note: a.note || '',
          isActive: a.is_active !== false,
          conditions: (condByAdj[a.adjustment_id] || []).map(c => ({
            id: c.condition_id, fieldName: c.field_name,
            operator: c.operator, expectedValue: c.expected_value || '',
          })),
        })),
        interestSupportRules:  meta.interestSupportRules  || {},
        eligibilityConditions: meta.eligibilityConditions || [],
        tiers: meta.tiers || [], conditions: meta.conditions || [],
        customFields: meta.customFields || [],
      };
      (pkgsByProject[p.project_id] = pkgsByProject[p.project_id] || []).push(pkg);
    }

    RateCenterState.projects = projects.map(pr => ({
      id: pr.project_id, name: pr.project_name,
      color: (pr.metadata || {}).color || '#6366f1',
      icon:  (pr.metadata || {}).icon  || '🏢',
      packages: pkgsByProject[pr.project_id] || [],
    }));

    RateCenterState.supportPolicies = supportPolicies.map(sp => ({
      id: sp.support_policy_id, code: sp.support_policy_code || '',
      name: sp.support_policy_name,
      defaultSupportMonths: sp.default_support_months,
      supportEndDate: sp.support_end_date || '',
      note: sp.note || '', metadata: sp.metadata || {},
    }));

    RateCenterState.feePolicies = feePolicies.map(fp => ({
      id: fp.fee_policy_id, code: fp.fee_policy_code || '',
      name: fp.fee_policy_name, note: fp.note || '',
      metadata: fp.metadata || {},
    }));

    if (typeof RateCenter !== 'undefined') RateCenter.render();
  },

  async _pullTemplates() {
    const res = await this.client.from('document_templates').select('*').eq('scope', this.scope);
    this._throwIfErr(res, 'pull document_templates');
    return res.data || [];
  },

  _restoreTemplates(templates) {
    if (!templates.length) return;

    const wordTpls  = templates.filter(t => t.template_type === 'docx');
    const excelTpls = templates.filter(t => t.template_type === 'excel');

    if (wordTpls.length && typeof WordState !== 'undefined') {
      WordState.templates = wordTpls.map(t => ({
        ...(t.metadata || {}), id: t.template_id,
        name: t.template_name, storagePath: t.storage_path,
        placeholders: t.placeholders || [], manualFields: t.manual_fields || [],
      }));
      this.restoreNativeDocxTemplates(WordState.templates);
      if (typeof WordEditor !== 'undefined') WordEditor.renderTemplatesList();
    }

    if (excelTpls.length && typeof AppState !== 'undefined') {
      const remoteById = {};
      excelTpls.forEach(t => {
        remoteById[t.template_id] = { ...(t.metadata || {}), id: t.template_id, name: t.template_name, updatedAt: t.updated_at };
      });

      const merged = [];
      (AppState.templates || []).forEach(local => {
        if (remoteById[local.id]) {
          merged.push(new Date(remoteById[local.id].updatedAt || 0) >= new Date(local.updatedAt || 0) ? remoteById[local.id] : local);
          delete remoteById[local.id];
        } else {
          merged.push(local);
        }
      });
      Object.values(remoteById).forEach(t => merged.push(t));
      AppState.templates = merged;
      if (typeof App !== 'undefined') App.updateDashboard();
    }
  },

  // ── DocX Storage ─────────────────────────────────────────────
  cleanWordTemplates(templates) {
    return (templates || []).map(tpl => {
      const copy = JSON.parse(JSON.stringify(tpl));
      if (copy.nativeDocx) {
        copy.originalDocxBase64 = '';
        copy._docxInIDB  = true;
        copy._idbKey     = copy.id;
        copy.storagePath = copy.storagePath || `templates/${this.scope}/${copy.id}.docx`;
      }
      return copy;
    });
  },

  async uploadNativeDocxTemplates() {
    if (typeof WordState === 'undefined' || typeof DocxStore === 'undefined') return;
    for (const tpl of (WordState.templates || [])) {
      if (!tpl.nativeDocx) continue;
      const arrayBuffer = await DocxStore.load(tpl._idbKey || tpl.id);
      if (!arrayBuffer) continue;
      const storagePath = tpl.storagePath || `templates/${this.scope}/${tpl.id}.docx`;
      this._throwIfErr(
        await this.client.storage.from(this.bucket).upload(
          storagePath,
          new Blob([arrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }),
          { contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', upsert: true }
        ), 'upload docx ' + storagePath
      );
      tpl.storagePath = storagePath;
      tpl._idbKey    = tpl.id;
      tpl._docxInIDB = true;
    }
  },

  async restoreNativeDocxTemplates(templates) {
    if (typeof DocxStore === 'undefined') return;
    for (const tpl of (templates || [])) {
      if (!tpl.nativeDocx || !tpl.storagePath) continue;
      const hasLocal = await DocxStore.has(tpl._idbKey || tpl.id);
      if (hasLocal) continue;
      const { data, error } = await this.client.storage.from(this.bucket).download(tpl.storagePath);
      if (error) throw error;
      const arrayBuffer = await data.arrayBuffer();
      await DocxStore.save(tpl.id, arrayBuffer);
      tpl._idbKey    = tpl.id;
      tpl._docxInIDB = true;
    }
  },
};

document.addEventListener('DOMContentLoaded', () => UatStorage.init());
