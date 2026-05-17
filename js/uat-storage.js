/* ================================================================
   UAT Cloud Storage Adapter
   - Optional Supabase sync for templates and master data during UAT
   - Keeps current localStorage/IndexedDB flow as the offline fallback
   - Never persists uploaded contract Excel data
   ================================================================ */

const UatStorage = {
  configKey: 'excelmapper_uat_supabase_config',
  scope: 'default',
  bucket: 'uat-templates',
  client: null,
  syncTimer: null,
  isSyncing: false,
  lastStatus: 'Local only',

  init() {
    this.loadConfig();
    this.renderStatus();
    // Delay pull so all other DOMContentLoaded modules (App, MasterData, WordEditor) finish init first
    if (this.client) {
      setTimeout(() => {
        this.pullAll().catch(err => {
          console.warn('Auto pull on init failed:', err);
          this.toast('Không thể tự đồng bộ từ Supabase: ' + err.message, 'warning');
        });
      }, 300);
    }
  },

  loadConfig() {
    const fromWindow = window.UAT_SUPABASE_CONFIG || {};
    let stored = {};
    try {
      stored = JSON.parse(localStorage.getItem(this.configKey) || '{}');
    } catch (_) {}
    const cfg = Object.assign({}, fromWindow, stored);
    this.url = cfg.url || cfg.supabaseUrl || '';
    this.key = cfg.key || cfg.anonKey || cfg.publishableKey || '';
    this.scope = cfg.scope || 'default';
    this.bucket = cfg.bucket || 'uat-templates';
    this.connect();
  },

  connect() {
    if (!this.url || !this.key || !window.supabase || !window.supabase.createClient) {
      this.client = null;
      this.lastStatus = 'Local only';
      return false;
    }
    this.client = window.supabase.createClient(this.url, this.key);
    this.lastStatus = `Cloud ready: ${this.scope}`;
    return true;
  },

  // Credentials được cấu hình bởi Dev trong js/config.js — không expose cho user.
  // Các hàm dưới chỉ dùng nội bộ / debug qua console nếu cần.
  _devSetConfig(url, key, scope, bucket) {
    const cfg = {
      url: (url || '').trim(),
      key: (key || '').trim(),
      scope: (scope || 'default').trim(),
      bucket: (bucket || 'uat-templates').trim(),
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
    console.info('[UatStorage] Cleared — local only mode');
  },

  toast(message, type) {
    if (typeof App !== 'undefined' && App.toast) App.toast(message, type || 'info');
    else console.log(`[UAT Storage] ${message}`);
  },

  renderStatus() {
    const el = document.getElementById('uat-sync-status');
    if (!el) return;
    const active = !!this.client;
    el.textContent = active ? `Supabase: ${this.scope}` : 'Local only';
    el.style.background = active ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.14)';
    el.style.color = active ? '#10b981' : '#f59e0b';
    el.title = active
      ? 'Template/master data sẽ có thể đồng bộ lên Supabase khi bấm Đẩy cloud'
      : 'Chưa cấu hình Supabase, dữ liệu chỉ lưu trong trình duyệt';
  },

  queueSync(reason) {
    if (!this.client || this.isSyncing) return;
    clearTimeout(this.syncTimer);
    this.syncTimer = setTimeout(() => this.pushAll(reason || 'auto').catch(err => {
      console.warn('UAT auto sync failed:', err);
      this.toast('Auto sync Supabase chưa thành công: ' + err.message, 'warning');
    }), 1200);
  },

  async pushAll(reason) {
    if (!this.client && !this.connect()) {
      this.toast('Chưa cấu hình Supabase. Bấm Cấu hình cloud trước.', 'warning');
      return false;
    }
    this.isSyncing = true;
    this.renderStatus();
    try {
      this.toast('Đang đẩy template/master data lên Supabase...', 'info');
      await this.uploadNativeDocxTemplates();

      const payloads = this.collectPayloads();
      for (const item of payloads) {
        await this.upsertState(item.key, item.payload);
      }

      this.lastStatus = `Synced ${new Date().toLocaleTimeString('vi-VN')}`;
      this.toast(reason === 'auto' ? 'Đã tự đồng bộ UAT' : 'Đã đẩy dữ liệu UAT lên Supabase', 'success');
      this.renderStatus();
      return true;
    } finally {
      this.isSyncing = false;
    }
  },

  async pullAll() {
    if (!this.client && !this.connect()) {
      this.toast('Chưa cấu hình Supabase. Bấm Cấu hình cloud trước.', 'warning');
      return false;
    }
    this.isSyncing = true;
    try {
      this.toast('Đang kéo template/master data từ Supabase...', 'info');
      const { data, error } = await this.client
        .from('uat_app_state')
        .select('state_key,payload')
        .eq('scope', this.scope);
      if (error) throw error;

      const byKey = {};
      (data || []).forEach(row => { byKey[row.state_key] = row.payload || {}; });

      if (byKey.word_templates && typeof WordState !== 'undefined') {
        WordState.templates = byKey.word_templates.templates || [];
        WordState.exportCount = byKey.word_templates.exportCount || 0;
        await this.restoreNativeDocxTemplates(WordState.templates);
        if (typeof WordEditor !== 'undefined') {
          WordEditor.saveState(false);
          WordEditor.renderTemplatesList();
        }
      }
      if (byKey.rate_center && typeof RateCenterState !== 'undefined') {
        Object.assign(RateCenterState, byKey.rate_center);
        if (typeof RateCenter !== 'undefined') {
          RateCenter.save(false);
          RateCenter.render();
        }
      }
      if (byKey.master_data && typeof MasterDataState !== 'undefined') {
        MasterDataState.entities = byKey.master_data.entities || [];
        MasterDataState.connections = byKey.master_data.connections || [];
        MasterDataState.records = byKey.master_data.records || {};
        if (typeof MasterData !== 'undefined') {
          MasterData.saveState(false);
          if (typeof MasterData.setView === 'function') {
            MasterData.setView(MasterDataState.viewMode || 'config');
          }
        }
      }
      if (byKey.excel_templates && typeof AppState !== 'undefined') {
        // Merge: prefer remote for templates that exist in both, keep local-only templates
        // This prevents a pull from silently deleting templates that were never pushed
        const remoteTemplates = byKey.excel_templates.templates || [];
        const remoteById = {};
        remoteTemplates.forEach(t => { remoteById[t.id] = t; });

        const merged = [];
        (AppState.templates || []).forEach(local => {
          if (remoteById[local.id]) {
            // Exists in both — prefer the version with newer updatedAt (or remote if equal)
            const remote = remoteById[local.id];
            const localTs = new Date(local.updatedAt || 0).getTime();
            const remoteTs = new Date(remote.updatedAt || 0).getTime();
            merged.push(remoteTs >= localTs ? remote : local);
            delete remoteById[local.id];
          } else {
            // Local-only — keep it (not yet pushed to cloud)
            merged.push(local);
          }
        });
        // Add remote-only templates (created on another machine)
        Object.values(remoteById).forEach(t => merged.push(t));
        AppState.templates = merged;

        AppState.exportCount = byKey.excel_templates.exportCount || AppState.exportCount || 0;
        if (typeof App !== 'undefined') {
          App.saveState(false);
          App.updateDashboard();
        }
      }

      this.toast('Đã kéo dữ liệu UAT từ Supabase về trình duyệt', 'success');
      this.renderStatus();
      return true;
    } finally {
      this.isSyncing = false;
    }
  },

  collectPayloads() {
    return [
      {
        key: 'word_templates',
        payload: {
          templates: typeof WordState !== 'undefined' ? this.cleanWordTemplates(WordState.templates || []) : [],
          exportCount: typeof WordState !== 'undefined' ? (WordState.exportCount || 0) : 0,
        }
      },
      {
        key: 'rate_center',
        payload: typeof RateCenterState !== 'undefined' ? {
          projects: RateCenterState.projects || [],
          supportPolicies: RateCenterState.supportPolicies || [],
          feePolicies: RateCenterState.feePolicies || [],
          selectedProject: RateCenterState.selectedProject || null,
          selectedPackage: RateCenterState.selectedPackage || null,
          activeTab: RateCenterState.activeTab || 'buckets',
        } : {}
      },
      {
        key: 'master_data',
        payload: typeof MasterDataState !== 'undefined' ? {
          entities: MasterDataState.entities || [],
          connections: MasterDataState.connections || [],
          records: MasterDataState.records || {},
        } : {}
      },
      {
        key: 'excel_templates',
        payload: typeof AppState !== 'undefined' ? {
          templates: AppState.templates || [],
          exportCount: AppState.exportCount || 0,
        } : {}
      }
    ];
  },

  cleanWordTemplates(templates) {
    return (templates || []).map(tpl => {
      const copy = JSON.parse(JSON.stringify(tpl));
      if (copy.nativeDocx) {
        copy.originalDocxBase64 = '';
        copy._docxInIDB = true;
        copy._idbKey = copy.id;
        copy.storagePath = copy.storagePath || `templates/${this.scope}/${copy.id}.docx`;
      }
      return copy;
    });
  },

  async upsertState(key, payload) {
    const { error } = await this.client
      .from('uat_app_state')
      .upsert({
        scope: this.scope,
        state_key: key,
        payload,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'scope,state_key' });
    if (error) throw error;
  },

  async uploadNativeDocxTemplates() {
    if (typeof WordState === 'undefined' || typeof DocxStore === 'undefined') return;
    const templates = WordState.templates || [];
    for (const tpl of templates) {
      if (!tpl.nativeDocx) continue;
      const arrayBuffer = await DocxStore.load(tpl._idbKey || tpl.id);
      if (!arrayBuffer) continue;
      const storagePath = tpl.storagePath || `templates/${this.scope}/${tpl.id}.docx`;
      const { error } = await this.client.storage
        .from(this.bucket)
        .upload(storagePath, new Blob([arrayBuffer], {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        }), {
          contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          upsert: true,
        });
      if (error) throw error;
      tpl.storagePath = storagePath;
      tpl._idbKey = tpl.id;
      tpl._docxInIDB = true;
    }
  },

  async restoreNativeDocxTemplates(templates) {
    if (typeof DocxStore === 'undefined') return;
    for (const tpl of templates || []) {
      if (!tpl.nativeDocx || !tpl.storagePath) continue;
      const hasLocal = await DocxStore.has(tpl._idbKey || tpl.id);
      if (hasLocal) continue;
      const { data, error } = await this.client.storage
        .from(this.bucket)
        .download(tpl.storagePath);
      if (error) throw error;
      const arrayBuffer = await data.arrayBuffer();
      await DocxStore.save(tpl.id, arrayBuffer);
      tpl._idbKey = tpl.id;
      tpl._docxInIDB = true;
    }
  }
};

document.addEventListener('DOMContentLoaded', () => UatStorage.init());
