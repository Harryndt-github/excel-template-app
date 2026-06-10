/* ================================================================
   Video Template Manager
   - Stores MP4 files in IndexedDB (VideoStore)
   - Metadata synced via UatStorage (video_templates)
   - Upload (drag-drop + browse), preview, download, delete
   ================================================================ */

const VideoStore = {
  DB_NAME: 'excelmapper_video_templates',
  DB_VERSION: 1,
  STORE_NAME: 'video_files',
  _db: null,

  async open() {
    if (this._db) return this._db;
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      req.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(this.STORE_NAME))
          db.createObjectStore(this.STORE_NAME);
      };
      req.onsuccess = e => { this._db = e.target.result; resolve(this._db); };
      req.onerror  = e => reject(e.target.error);
    });
  },

  async save(id, arrayBuffer) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE_NAME, 'readwrite');
      tx.objectStore(this.STORE_NAME).put(arrayBuffer, id);
      tx.oncomplete = () => resolve(true);
      tx.onerror = e => reject(e.target.error);
    });
  },

  async load(id) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const req = db.transaction(this.STORE_NAME, 'readonly')
        .objectStore(this.STORE_NAME).get(id);
      req.onsuccess = e => resolve(e.target.result || null);
      req.onerror  = e => reject(e.target.error);
    });
  },

  async remove(id) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE_NAME, 'readwrite');
      tx.objectStore(this.STORE_NAME).delete(id);
      tx.oncomplete = () => resolve(true);
      tx.onerror = e => reject(e.target.error);
    });
  },

  async has(id) { return !!(await this.load(id)); },
};

// ── State ─────────────────────────────────────────────────────────

const VideoTemplateState = {
  templates: [],  // [{id, name, fileName, size, createdAt, description, storagePath, _inIDB}]
};

// ── Module ────────────────────────────────────────────────────────

const VideoTemplateModule = {
  // Supabase Free giới hạn file tối đa 50 MB. Có thể tăng theo plan/bucket
  // khi triển khai production, nhưng UI UAT không nên hứa quá cấu hình hiện tại.
  _MAX_MB: 50,
  STORAGE_KEY: 'excelmapper_video_template_meta_v1',

  async init() {
    await this.loadLocalState();
    this.renderList();
    this._initDropZone();
  },

  async loadLocalState() {
    try {
      const saved = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
      if (Array.isArray(saved) && saved.length) {
        const current = new Map((VideoTemplateState.templates || []).map(t => [t.id, t]));
        for (const t of saved) {
          if (!t || !t.id || current.has(t.id)) continue;
          const inIDB = await VideoStore.has(t.id).catch(() => false);
          current.set(t.id, {
            ...t,
            _inIDB: inIDB,
            syncStatus: t.storagePath ? 'synced' : (t.syncStatus || 'pending'),
          });
        }
        VideoTemplateState.templates = Array.from(current.values());
      }
    } catch (e) {
      console.warn('[VideoTemplate] Cannot restore local metadata:', e.message);
    }
  },

  persistLocalState() {
    try {
      const metadata = (VideoTemplateState.templates || []).map(t => ({
        id: t.id,
        name: t.name,
        fileName: t.fileName,
        size: t.size,
        createdAt: t.createdAt,
        description: t.description || '',
        storagePath: t.storagePath || null,
        syncStatus: t.syncStatus || (t.storagePath ? 'synced' : 'pending'),
      }));
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(metadata));
    } catch (e) {
      console.warn('[VideoTemplate] Cannot persist local metadata:', e.message);
    }
  },

  _uid() {
    return `vid_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  },

  _esc(str) {
    const d = document.createElement('div');
    d.textContent = String(str || '');
    return d.innerHTML;
  },

  _fmtSize(bytes) {
    if (!bytes) return '—';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  },

  _fmtDate(iso) {
    if (!iso) return '';
    try { return new Date(iso).toLocaleDateString('vi-VN'); } catch { return iso; }
  },

  // ── Drop zone ─────────────────────────────────────────────────

  _initDropZone() {
    const zone = document.getElementById('video-upload-drop');
    if (!zone) return;
    ['dragover', 'dragenter'].forEach(ev =>
      zone.addEventListener(ev, e => { e.preventDefault(); zone.classList.add('dragover'); })
    );
    ['dragleave', 'dragend'].forEach(ev =>
      zone.addEventListener(ev, () => zone.classList.remove('dragover'))
    );
    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.classList.remove('dragover');
      const files = Array.from(e.dataTransfer.files).filter(f => this._isMP4(f));
      if (!files.length) { App.toast('Chỉ hỗ trợ file MP4', 'warning'); return; }
      files.forEach(f => this.handleUpload(f));
    });
  },

  _isMP4(file) {
    return file.type === 'video/mp4' || file.name.toLowerCase().endsWith('.mp4');
  },

  // ── Upload ────────────────────────────────────────────────────

  async handleUpload(file) {
    if (!file) return;
    if (!this._isMP4(file)) { App.toast('Chỉ hỗ trợ file MP4', 'warning'); return; }
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > this._MAX_MB) {
      App.toast(`File quá lớn (${sizeMB.toFixed(1)} MB). Giới hạn ${this._MAX_MB} MB`, 'warning');
      return;
    }

    const btn = document.getElementById('video-upload-input');
    try {
      App.toast('Đang đọc file video...', 'info');
      const arrayBuffer = await file.arrayBuffer();
      const id = this._uid();
      await VideoStore.save(id, arrayBuffer);

      const tpl = {
        id,
        name: file.name.replace(/\.mp4$/i, ''),
        fileName: file.name,
        size: file.size,
        createdAt: new Date().toISOString(),
        description: '',
        _inIDB: true,
        syncStatus: 'pending',
      };
      VideoTemplateState.templates.unshift(tpl);
      this.persistLocalState();
      this.renderList();
      App.toast(`Đã lưu "${this._esc(tpl.name)}" trên thiết bị. Đang đồng bộ...`, 'info');
      this.saveState();
    } catch (err) {
      console.error('[VideoTemplate] Upload error:', err);
      App.toast('Lỗi khi upload video: ' + err.message, 'error');
    } finally {
      if (btn) btn.value = '';
    }
  },

  saveState() {
    this.persistLocalState();
    if (typeof UatStorage !== 'undefined') {
      UatStorage.syncVideoTemplates({ silent: true }).catch(err => {
        console.error('[VideoTemplate] Auto sync failed:', err);
      });
    }
  },

  // ── Actions ───────────────────────────────────────────────────

  async deleteTemplate(id) {
    if (!confirm('Xóa video template này?')) return;
    const tpl = VideoTemplateState.templates.find(t => t.id === id);
    if (tpl && typeof UatStorage !== 'undefined' && UatStorage.client) {
      try {
        await UatStorage.deleteVideoTemplateRemote(tpl);
      } catch (e) {
        App.toast('Không thể xóa video trên cloud: ' + e.message, 'error');
        return;
      }
    }
    VideoTemplateState.templates = VideoTemplateState.templates.filter(t => t.id !== id);
    await VideoStore.remove(id).catch(() => {});
    this.persistLocalState();
    this.renderList();
    App.toast('Đã xóa video template', 'success');
  },

  async downloadTemplate(id) {
    const tpl = VideoTemplateState.templates.find(t => t.id === id);
    if (!tpl) return;
    const ab = await VideoStore.load(id);
    if (!ab) {
      App.toast('File video không có trong bộ nhớ — hãy upload lại', 'warning');
      return;
    }
    const blob = new Blob([ab], { type: 'video/mp4' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = tpl.fileName || `${tpl.name}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  },

  async previewTemplate(id) {
    const tpl = VideoTemplateState.templates.find(t => t.id === id);
    if (!tpl) return;

    const modal   = document.getElementById('modal-video-preview');
    const titleEl = document.getElementById('video-preview-title');
    const infoEl  = document.getElementById('video-preview-info');
    const videoEl = document.getElementById('video-preview-player');
    if (!modal || !videoEl) return;

    // Release previous object URL
    if (videoEl._blobUrl) { URL.revokeObjectURL(videoEl._blobUrl); videoEl._blobUrl = null; }

    const ab = await VideoStore.load(id);
    if (!ab) {
      App.toast('File video không có trong bộ nhớ — hãy upload lại', 'warning');
      return;
    }
    const blob = new Blob([ab], { type: 'video/mp4' });
    const url = URL.createObjectURL(blob);
    videoEl._blobUrl = url;
    videoEl.src = url;
    videoEl.load();

    if (titleEl) titleEl.textContent = tpl.name;
    if (infoEl) infoEl.textContent = `${tpl.fileName || ''} · ${this._fmtSize(tpl.size)} · ${this._fmtDate(tpl.createdAt)}`;
    modal.style.display = 'flex';
  },

  closePreview() {
    const modal   = document.getElementById('modal-video-preview');
    const videoEl = document.getElementById('video-preview-player');
    if (videoEl) {
      videoEl.pause();
      if (videoEl._blobUrl) { URL.revokeObjectURL(videoEl._blobUrl); videoEl._blobUrl = null; }
      videoEl.src = '';
    }
    if (modal) modal.style.display = 'none';
  },

  // ── Render ────────────────────────────────────────────────────

  // Chạy diagnostic từ thiết bị này — xem step nào fail
  async runDiagnostic() {
    if (typeof UatStorage === 'undefined' || !UatStorage.client) {
      App.toast('Supabase chưa được kết nối', 'warning'); return;
    }
    const results = [];
    const step = (name, ok, detail) => {
      results.push(`${ok ? '✅' : '❌'} ${name}${detail ? ': ' + detail : ''}`);
    };

    App.toast('Đang chạy diagnostic...', 'info');

    // 1. GET (select) — request đơn giản nhất
    try {
      const { data, error } = await UatStorage.client
        .from('video_templates').select('scope').limit(1);
      step('GET video_templates', !error, error ? error.message : `ok (${(data||[]).length} rows)`);
    } catch(e) { step('GET video_templates', false, e.message); }

    // 2. Raw fetch DELETE — bypass Supabase SDK
    try {
      const resp = await fetch(
        `${UatStorage.url}/rest/v1/video_templates?scope=eq.__diag_test__`,
        { method: 'DELETE', headers: {
          'apikey': UatStorage.key,
          'Authorization': 'Bearer ' + UatStorage.key,
          'Content-Type': 'application/json',
        }}
      );
      step('Raw fetch DELETE', resp.ok || resp.status === 204, `HTTP ${resp.status}`);
    } catch(e) { step('Raw fetch DELETE', false, e.message); }

    // 3. Supabase SDK DELETE
    try {
      const { error } = await UatStorage.client
        .from('video_templates').delete().eq('scope', '__diag_test__');
      step('SDK DELETE video_templates', !error, error ? error.message : 'ok');
    } catch(e) { step('SDK DELETE video_templates', false, e.message); }

    // 4. SDK INSERT test row
    try {
      const { error } = await UatStorage.client
        .from('video_templates').insert([{
          scope: '__diag_test__', video_id: 'diag_' + Date.now(),
          video_name: 'Diagnostic Test', file_size: 1,
        }]);
      step('SDK INSERT video_templates', !error, error ? error.message : 'ok');
      // Cleanup
      await UatStorage.client.from('video_templates').delete().eq('scope', '__diag_test__');
    } catch(e) { step('SDK INSERT video_templates', false, e.message); }

    // 5. Storage list — xác nhận bucket/policy đọc file
    try {
      const { data, error } = await UatStorage.client.storage
        .from(UatStorage.bucket)
        .list(`templates/${UatStorage.scope}/videos`, { limit: 1 });
      step('Storage list', !error, error ? error.message : `ok (${(data || []).length} objects)`);
    } catch(e) { step('Storage list', false, e.message); }

    // 6. TUS library — bắt buộc cho MP4 > 6 MB
    step('TUS resumable client', !!(window.tus && window.tus.Upload),
      window.tus && window.tus.Upload ? 'ready' : 'missing');

    // 7. Signed upload token — xác nhận policy INSERT của bucket hoạt động.
    try {
      const path = `templates/${UatStorage.scope}/videos/__diagnostic__.mp4`;
      const { data, error } = await UatStorage.client.storage
        .from(UatStorage.bucket)
        .createSignedUploadUrl(path, { upsert: true });
      step('Storage signed upload token', !error && !!data?.token,
        error ? error.message : (data?.token ? 'ready' : 'missing token'));
    } catch(e) { step('Storage signed upload token', false, e.message); }

    const msg = results.join('\n');
    console.log('[VIDEO DIAGNOSTIC]\n' + msg);
    alert('Kết quả chẩn đoán:\n\n' + msg + '\n\nCopy kết quả này gửi cho admin.');
  },

  renderList() {
    const list  = document.getElementById('video-templates-list');
    const empty = document.getElementById('video-no-templates');
    const count = document.getElementById('video-count-badge');
    if (!list) return;

    const tpls = VideoTemplateState.templates || [];
    if (count) count.textContent = tpls.length ? `${tpls.length} video` : '';

    if (!tpls.length) {
      list.innerHTML = '';
      if (empty) empty.style.display = '';
      return;
    }
    if (empty) empty.style.display = 'none';

    list.innerHTML = tpls.map(tpl => `
      <div class="template-card" style="position:relative;overflow:hidden;">
        <!-- Colored top bar -->
        <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#e11d48,#f97316);border-radius:3px 3px 0 0;"></div>

        <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:14px;padding-top:4px;">
          <!-- Icon -->
          <div style="width:46px;height:46px;border-radius:12px;background:linear-gradient(135deg,#e11d48 0%,#f97316 100%);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 3px 10px rgba(225,29,72,0.28);">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
          </div>
          <div style="flex:1;min-width:0;">
            <div style="font-weight:700;font-size:0.92rem;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${this._esc(tpl.name)}">${this._esc(tpl.name)}</div>
            <div style="font-size:0.75rem;color:var(--text-muted);margin-top:3px;display:flex;flex-wrap:wrap;gap:4px 10px;">
              <span>MP4</span>
              <span>·</span>
              <span>${this._fmtSize(tpl.size)}</span>
              <span>·</span>
              <span>${this._fmtDate(tpl.createdAt)}</span>
            </div>
          </div>
        </div>

        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <button class="action-btn" onclick="VideoTemplateModule.previewTemplate('${tpl.id}')" title="Xem video">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            Xem
          </button>
          <button class="action-btn" onclick="VideoTemplateModule.downloadTemplate('${tpl.id}')" title="Tải xuống MP4">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Tải xuống
          </button>
          <button class="action-btn" style="color:#ef4444;" onclick="VideoTemplateModule.deleteTemplate('${tpl.id}')" title="Xóa">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/></svg>
            Xóa
          </button>
        </div>

        ${tpl.syncStatus === 'uploading' ? `
        <div style="margin-top:10px;font-size:0.75rem;color:#0284c7;padding:5px 9px;background:rgba(2,132,199,0.08);border:1px solid rgba(2,132,199,0.2);border-radius:7px;">
          ⏳ Đang đồng bộ ${Number(tpl.syncProgress || 0).toFixed(0)}%
        </div>` : tpl.syncStatus === 'error' ? `
        <div style="margin-top:10px;font-size:0.75rem;color:#ef4444;padding:5px 9px;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:7px;">
          ⚠ Đồng bộ thất bại — bấm Đồng bộ để thử lại
        </div>` : !tpl._inIDB ? `
        <div style="margin-top:10px;font-size:0.75rem;color:#f59e0b;padding:5px 9px;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);border-radius:7px;">
          ⚠ File chưa có trên thiết bị này — bấm Đồng bộ để tải từ Supabase
        </div>` : tpl.storagePath ? `
        <div style="margin-top:10px;font-size:0.75rem;color:#10b981;padding:5px 9px;background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);border-radius:7px;">
          ✓ Đã đồng bộ — có thể sử dụng trên thiết bị khác
        </div>` : `
        <div style="margin-top:10px;font-size:0.75rem;color:#f59e0b;padding:5px 9px;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);border-radius:7px;">
          ⏳ Chờ đồng bộ lên cloud
        </div>`}
      </div>
    `).join('');
  },
};

document.addEventListener('DOMContentLoaded', () => {
  VideoTemplateModule.init().catch(error => {
    console.error('[VideoTemplate] Init failed:', error);
  });
});
