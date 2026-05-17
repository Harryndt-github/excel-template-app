/* ================================================================
   UAT Cloud Storage — Supabase-only persistence layer
   - Supabase là storage duy nhất (không dùng localStorage cho dữ liệu)
   - localStorage chỉ giữ config kết nối (URL + key)
   - Khi khởi động: show loading overlay → pullAll → render toàn bộ UI
   - Khi có thay đổi: queueSync debounce 1200ms → pushAll
   - Nếu chưa cấu hình Supabase: dữ liệu chỉ tồn tại trong phiên (in-memory)
   ================================================================ */

const UatStorage = {
  configKey: 'excelmapper_uat_supabase_config',
  scope: 'default',
  bucket: 'uat-templates',
  client: null,
  syncTimer: null,
  isSyncing: false,
  lastStatus: 'Chưa cấu hình',

  init() {
    this.loadConfig();
    this.renderStatus();
    if (!this.client) {
      this._showNoStorageToast();
      return;
    }
    this._showLoadingOverlay('Đang tải dữ liệu từ Supabase…');
    // Delay 300ms để các module khác (App, WordEditor, MasterData, RateCenter)
    // hoàn tất DOMContentLoaded và init với state rỗng trước
    setTimeout(() => {
      this.pullAll()
        .catch(err => {
          console.error('[UatStorage] Auto pull on init failed:', err);
          this.toast('Không thể tải dữ liệu từ Supabase: ' + err.message, 'error');
        })
        .finally(() => this._hideLoadingOverlay());
    }, 300);
  },

  loadConfig() {
    const fromWindow = window.UAT_SUPABASE_CONFIG || {};
    let stored = {};
    try {
      stored = JSON.parse(localStorage.getItem(this.configKey) || '{}');
    } catch (_) {}
    const cfg = Object.assign({}, fromWindow, stored);
    this.url  = cfg.url  || cfg.supabaseUrl  || '';
    this.key  = cfg.key  || cfg.anonKey || cfg.publishableKey || '';
    this.scope  = cfg.scope  || 'default';
    this.bucket = cfg.bucket || 'uat-templates';
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

  // ── Dev-only helpers (dùng qua console) ──────────────────────
  _devSetConfig(url, key, scope, bucket) {
    const cfg = {
      url: (url || '').trim(), key: (key || '').trim(),
      scope: (scope || 'default').trim(), bucket: (bucket || 'uat-templates').trim(),
    };
    localStorage.setItem(this.configKey, JSON.stringify(cfg));
    this.loadConfig();
    this.renderStatus();
    console.info('[UatStorage] Config updated:', cfg.url, '| scope:', cfg.scope);
  },

  _devClearConfig() {
    localStorage.removeItem(this.configKey);
    this.loadConfig();
    this.renderStatus();
    console.info('[UatStorage] Config cleared');
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
      'position:fixed', 'top:0', 'right:0', 'bottom:0', 'left:0', 'z-index:9999',
      'background:rgba(12,12,31,0.93)',
      'display:flex', 'flex-direction:column', 'align-items:center', 'justify-content:center', 'gap:20px',
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
      this.toast(
        '⚠️ Supabase chưa được cấu hình — dữ liệu sẽ mất khi reload trang. Liên hệ admin để cấu hình js/config.js.',
        'warning'
      );
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

  // ── Sync queue (debounced push) ──────────────────────────────
  queueSync(reason) {
    if (!this.client || this.isSyncing) return;
    clearTimeout(this.syncTimer);
    this.syncTimer = setTimeout(() => this.pushAll(reason || 'auto').catch(err => {
      console.warn('[UatStorage] Auto sync failed:', err);
      this.toast('Đồng bộ Supabase thất bại: ' + err.message, 'warning');
    }), 1200);
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
      for (const item of this.collectPayloads()) {
        await this.upsertState(item.key, item.payload);
      }
      this.lastStatus = `Synced ${new Date().toLocaleTimeString('vi-VN')}`;
      if (reason !== 'auto') this.toast('Đã đẩy dữ liệu lên Supabase', 'success');
      this.renderStatus();
      return true;
    } finally {
      this.isSyncing = false;
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
      const { data, error } = await this.client
        .from('uat_app_state')
        .select('state_key,payload')
        .eq('scope', this.scope);
      if (error) throw error;

      const byKey = {};
      (data || []).forEach(row => { byKey[row.state_key] = row.payload || {}; });

      // ── Word templates ───────────────────────────────────────
      if (byKey.word_templates && typeof WordState !== 'undefined') {
        WordState.templates  = byKey.word_templates.templates  || [];
        WordState.exportCount = byKey.word_templates.exportCount || 0;
        await this.restoreNativeDocxTemplates(WordState.templates);
        if (typeof WordEditor !== 'undefined') WordEditor.renderTemplatesList();
      }

      // ── Rate center ──────────────────────────────────────────
      if (byKey.rate_center && typeof RateCenterState !== 'undefined') {
        Object.assign(RateCenterState, byKey.rate_center);
        if (typeof RateCenter !== 'undefined') RateCenter.render();
      }

      // ── Master data ──────────────────────────────────────────
      if (byKey.master_data && typeof MasterDataState !== 'undefined') {
        MasterDataState.entities    = byKey.master_data.entities    || [];
        MasterDataState.connections = byKey.master_data.connections || [];
        MasterDataState.records     = byKey.master_data.records     || {};
        if (typeof MasterData !== 'undefined' && typeof MasterData.setView === 'function') {
          MasterData.setView(MasterDataState.viewMode || 'config');
        }
      }

      // ── Excel templates (merge: newest-wins, keep local-only) ──
      if (byKey.excel_templates && typeof AppState !== 'undefined') {
        const remoteTemplates = byKey.excel_templates.templates || [];
        const remoteById = {};
        remoteTemplates.forEach(t => { remoteById[t.id] = t; });

        const merged = [];
        (AppState.templates || []).forEach(local => {
          if (remoteById[local.id]) {
            const remote = remoteById[local.id];
            const keep = new Date(remote.updatedAt || 0) >= new Date(local.updatedAt || 0) ? remote : local;
            merged.push(keep);
            delete remoteById[local.id];
          } else {
            merged.push(local); // local-only: keep
          }
        });
        Object.values(remoteById).forEach(t => merged.push(t)); // remote-only: add
        AppState.templates  = merged;
        AppState.exportCount = byKey.excel_templates.exportCount || AppState.exportCount || 0;
        if (typeof App !== 'undefined') App.updateDashboard();
      }

      this.renderStatus();
      return true;
    } finally {
      this.isSyncing = false;
    }
  },

  // ── Payload helpers ──────────────────────────────────────────
  collectPayloads() {
    return [
      {
        key: 'word_templates',
        payload: {
          templates:   typeof WordState !== 'undefined' ? this.cleanWordTemplates(WordState.templates || []) : [],
          exportCount: typeof WordState !== 'undefined' ? (WordState.exportCount || 0) : 0,
        },
      },
      {
        key: 'rate_center',
        payload: typeof RateCenterState !== 'undefined' ? {
          projects:        RateCenterState.projects        || [],
          supportPolicies: RateCenterState.supportPolicies || [],
          feePolicies:     RateCenterState.feePolicies     || [],
          selectedProject: RateCenterState.selectedProject || null,
          selectedPackage: RateCenterState.selectedPackage || null,
          activeTab:       RateCenterState.activeTab       || 'buckets',
        } : {},
      },
      {
        key: 'master_data',
        payload: typeof MasterDataState !== 'undefined' ? {
          entities:    MasterDataState.entities    || [],
          connections: MasterDataState.connections || [],
          records:     MasterDataState.records     || {},
        } : {},
      },
      {
        key: 'excel_templates',
        payload: typeof AppState !== 'undefined' ? {
          templates:   AppState.templates   || [],
          exportCount: AppState.exportCount || 0,
        } : {},
      },
    ];
  },

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

  async upsertState(key, payload) {
    const { error } = await this.client
      .from('uat_app_state')
      .upsert({
        scope: this.scope, state_key: key, payload,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'scope,state_key' });
    if (error) throw error;
  },

  async uploadNativeDocxTemplates() {
    if (typeof WordState === 'undefined' || typeof DocxStore === 'undefined') return;
    for (const tpl of (WordState.templates || [])) {
      if (!tpl.nativeDocx) continue;
      const arrayBuffer = await DocxStore.load(tpl._idbKey || tpl.id);
      if (!arrayBuffer) continue;
      const storagePath = tpl.storagePath || `templates/${this.scope}/${tpl.id}.docx`;
      const { error } = await this.client.storage.from(this.bucket).upload(
        storagePath,
        new Blob([arrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }),
        { contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', upsert: true }
      );
      if (error) throw error;
      tpl.storagePath = storagePath;
      tpl._idbKey     = tpl.id;
      tpl._docxInIDB  = true;
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
