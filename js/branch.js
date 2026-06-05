/* ============================================
   Branch Module — Khai báo thông tin Chi Nhánh
   ============================================ */

const BRANCH_FIELDS = [
  { key: 'ma_chi_nhanh',         label: 'Mã chi nhánh',                     required: true  },
  { key: 'ma_cn_me',             label: 'Mã CN mẹ theo giấy phép',           required: false },
  { key: 'ten_chi_nhanh',        label: 'Tên chi nhánh',                     required: true  },
  { key: 'dia_chi',              label: 'Địa chỉ chi nhánh',                 required: false },
  { key: 'dang_ky_kinh_doanh',   label: 'Đăng ký kinh doanh',               required: false },
  { key: 'dia_ban',              label: 'Địa bàn',                           required: false },
  { key: 'phong_cong_chung',     label: 'Phòng công chứng hợp tác',         required: false },
  { key: 'hub',                  label: 'HUB',                               required: false },
  { key: 'may_le_hub',           label: 'Máy lẻ HUB',                       required: false },
  { key: 'dia_chi_hub',          label: 'Địa chỉ HUB',                      required: false },
  { key: 'noi_nhap_kho',         label: 'Nơi nhập kho',                     required: false },
  { key: 'ma_phong_ban',         label: 'Mã phòng ban',                      required: false },
  { key: 'ma_ao',                label: 'Mã AO',                             required: false },
  { key: 'ma_chi_nhanh_t24',     label: 'Mã chi nhánh (T24)',               required: false },
  { key: 'so_uy_quyen_hsgn',     label: 'Số uỷ quyền ký kết HSGN + HSTS',  required: false },
  { key: 'so_uy_quyen_sao_thuy', label: 'Số uỷ quyền Sao Thuỷ',            required: false },
];

const BranchState = {
  list: [],
  selectedId: null,
};

const BranchModule = {
  STORAGE_KEY: 'branch_module_v1',

  /* ── Helpers ── */
  _esc(t) {
    const d = document.createElement('div');
    d.textContent = String(t ?? '');
    return d.innerHTML;
  },
  _uid() {
    return 'br_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
  },

  /* ── Persistence ── */
  init() { this.loadState(); },

  loadState() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        BranchState.list = Array.isArray(saved.list) ? saved.list : [];
        BranchState.selectedId = saved.selectedId || null;
      }
    } catch (e) {}
  },

  saveState() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
        list: BranchState.list,
        selectedId: BranchState.selectedId,
      }));
    } catch (e) {}
    if (typeof UatStorage !== 'undefined' && UatStorage.client) {
      clearTimeout(this._saveTimer);
      this._saveTimer = setTimeout(() => UatStorage.upsertState('branch_data'), 800);
    }
  },

  /* ── Render entry-point called by MasterData.setView('branches') ── */
  render() {
    const panel = document.getElementById('md-view-branches');
    if (!panel) return;
    panel.innerHTML = `
      <div class="branch-layout">
        <!-- List panel -->
        <div class="branch-list-panel">
          <div class="branch-list-hd">
            <span style="font-weight:700;font-size:0.88rem;color:var(--text-primary);">🏦 Danh sách Chi Nhánh</span>
            <button class="md-cfg-add-btn" onclick="BranchModule.addBranch()">＋ Thêm</button>
          </div>
          <div style="padding:8px 10px;border-bottom:1px solid rgba(99,102,241,0.1);">
            <input id="branch-search" type="text" placeholder="Tìm mã / tên / địa bàn..."
              style="width:100%;padding:6px 10px;border-radius:8px;border:1px solid var(--border);background:var(--bg-secondary);color:var(--text-primary);font-size:0.8rem;box-sizing:border-box;font-family:inherit;"
              oninput="BranchModule._filterList(this.value)">
          </div>
          <div id="branch-list-items" style="overflow-y:auto;flex:1;padding:6px;"></div>
          <div style="padding:8px 10px;border-top:1px solid rgba(99,102,241,0.1);display:flex;gap:6px;">
            <label class="md-cfg-add-btn"
              style="flex:1;cursor:pointer;background:rgba(16,185,129,0.08);border-color:rgba(16,185,129,0.3);color:#10b981;justify-content:center;">
              📥 Import XLSX
              <input type="file" accept=".xlsx,.xls,.csv" hidden onchange="BranchModule._handleImportFile(this.files[0]);this.value=''">
            </label>
            <button class="md-cfg-add-btn"
              style="flex:1;background:rgba(6,182,212,0.08);border-color:rgba(6,182,212,0.3);color:#06b6d4;"
              onclick="BranchModule._downloadTemplate()">⬇ Template</button>
          </div>
        </div>
        <!-- Form panel -->
        <div class="branch-form-panel" id="branch-form-panel">
          <div class="branch-empty-state">
            <div style="font-size:2.8rem;margin-bottom:12px;">🏦</div>
            <p style="font-size:0.9rem;color:var(--text-muted);">Chọn chi nhánh để xem / chỉnh sửa<br>hoặc bấm <b>＋ Thêm</b> để tạo mới</p>
          </div>
        </div>
      </div>`;
    this._renderList();
    if (BranchState.selectedId) this._renderForm(BranchState.selectedId);
  },

  /* ── List ── */
  _renderList(filter) {
    const container = document.getElementById('branch-list-items');
    if (!container) return;
    const q = (filter || '').toLowerCase().trim();
    const branches = q
      ? BranchState.list.filter(b =>
          (b.ma_chi_nhanh || '').toLowerCase().includes(q) ||
          (b.ten_chi_nhanh || '').toLowerCase().includes(q) ||
          (b.dia_ban || '').toLowerCase().includes(q) ||
          (b.hub || '').toLowerCase().includes(q))
      : BranchState.list;

    if (branches.length === 0) {
      container.innerHTML = `<div style="padding:24px 16px;text-align:center;color:var(--text-muted);font-size:0.82rem;">
        ${q ? 'Không tìm thấy chi nhánh nào' : 'Chưa có chi nhánh nào.<br>Bấm <b>＋ Thêm</b> để tạo mới.'}
      </div>`;
      return;
    }
    container.innerHTML = branches.map(b => {
      const active = b.id === BranchState.selectedId;
      return `<div class="branch-list-item${active ? ' active' : ''}"
          onclick="BranchModule.selectBranch('${b.id}')">
        <div style="display:flex;align-items:flex-start;gap:8px;">
          <div style="flex:1;min-width:0;">
            <div style="font-weight:700;font-size:0.83rem;color:${active ? '#6366f1' : 'var(--text-primary)'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
              ${this._esc(b.ma_chi_nhanh || '—')}
            </div>
            <div style="font-size:0.77rem;color:var(--text-secondary);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
              ${this._esc(b.ten_chi_nhanh || '')}
            </div>
            ${b.dia_ban ? `<div style="font-size:0.71rem;color:var(--text-muted);margin-top:1px;">${this._esc(b.dia_ban)}</div>` : ''}
          </div>
          <button class="branch-delete-btn"
            onclick="event.stopPropagation();BranchModule.deleteBranch('${b.id}')"
            title="Xóa chi nhánh">×</button>
        </div>
      </div>`;
    }).join('');
  },

  _filterList(q) { this._renderList(q); },

  /* ── CRUD ── */
  selectBranch(id) {
    BranchState.selectedId = id;
    this._renderList();
    this._renderForm(id);
  },

  addBranch() {
    const id = this._uid();
    const branch = { id };
    BRANCH_FIELDS.forEach(f => { branch[f.key] = ''; });
    BranchState.list.push(branch);
    BranchState.selectedId = id;
    this.saveState();
    this._renderList();
    this._renderForm(id);
  },

  deleteBranch(id) {
    const branch = BranchState.list.find(b => b.id === id);
    const name = branch ? (branch.ten_chi_nhanh || branch.ma_chi_nhanh || 'chi nhánh này') : 'chi nhánh này';
    if (!confirm(`Xóa "${name}"?`)) return;
    BranchState.list = BranchState.list.filter(b => b.id !== id);
    if (BranchState.selectedId === id) {
      BranchState.selectedId = BranchState.list[0]?.id || null;
    }
    this.saveState();
    this._renderList();
    if (BranchState.selectedId) {
      this._renderForm(BranchState.selectedId);
    } else {
      const fp = document.getElementById('branch-form-panel');
      if (fp) fp.innerHTML = `<div class="branch-empty-state"><div style="font-size:2.8rem;margin-bottom:12px;">🏦</div><p style="font-size:0.9rem;color:var(--text-muted);">Chưa có chi nhánh nào được chọn</p></div>`;
    }
    if (typeof App !== 'undefined') App.toast('Đã xóa chi nhánh', 'info');
  },

  duplicateBranch(id) {
    const src = BranchState.list.find(b => b.id === id);
    if (!src) return;
    const dup = { ...src, id: this._uid(), ma_chi_nhanh: (src.ma_chi_nhanh || '') + '_copy', ten_chi_nhanh: (src.ten_chi_nhanh || '') + ' (Bản sao)' };
    BranchState.list.push(dup);
    BranchState.selectedId = dup.id;
    this.saveState();
    this._renderList();
    this._renderForm(dup.id);
    if (typeof App !== 'undefined') App.toast('Đã nhân bản chi nhánh', 'success');
  },

  /* ── Form ── */
  _renderForm(id) {
    const branch = BranchState.list.find(b => b.id === id);
    if (!branch) return;
    const fp = document.getElementById('branch-form-panel');
    if (!fp) return;

    // Split fields: first 2 are "key identifiers" → full width. Rest → 2-col grid.
    const keyFields = BRANCH_FIELDS.slice(0, 2);
    const restFields = BRANCH_FIELDS.slice(2);

    fp.innerHTML = `
      <div class="branch-form-scroll">
        <!-- Header -->
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;flex-wrap:wrap;padding-bottom:16px;border-bottom:1px solid rgba(99,102,241,0.12);">
          <div style="width:40px;height:40px;border-radius:10px;background:rgba(99,102,241,0.15);display:flex;align-items:center;justify-content:center;font-size:1.3rem;flex-shrink:0;">🏦</div>
          <div style="flex:1;min-width:0;">
            <h3 style="margin:0;font-size:1rem;font-weight:700;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
              ${branch.ten_chi_nhanh ? this._esc(branch.ten_chi_nhanh) : '<span style="color:var(--text-muted)">Chi nhánh mới</span>'}
            </h3>
            <div style="font-size:0.78rem;color:var(--text-muted);margin-top:2px;">${this._esc(branch.ma_chi_nhanh || 'Chưa có mã')}</div>
          </div>
          <div style="display:flex;gap:8px;flex-shrink:0;">
            <button class="btn btn-primary" onclick="BranchModule.saveBranch('${id}')">💾 Lưu</button>
            <button class="btn btn-outline" onclick="BranchModule.duplicateBranch('${id}')">Nhân bản</button>
          </div>
        </div>

        <!-- Key identifiers (full width row each) -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px 20px;margin-bottom:14px;">
          ${keyFields.map(f => this._fieldHtml(branch, f)).join('')}
        </div>

        <!-- Section: Thông tin cơ bản -->
        <div class="branch-section-title">Thông tin cơ bản</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px 20px;margin-bottom:14px;">
          ${restFields.slice(0, 6).map(f => this._fieldHtml(branch, f)).join('')}
        </div>

        <!-- Section: HUB & Kho -->
        <div class="branch-section-title">HUB & Kho</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px 20px;margin-bottom:14px;">
          ${restFields.slice(6, 10).map(f => this._fieldHtml(branch, f)).join('')}
        </div>

        <!-- Section: Mã nội bộ & Uỷ quyền -->
        <div class="branch-section-title">Mã nội bộ & Uỷ quyền</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px 20px;margin-bottom:20px;">
          ${restFields.slice(10).map(f => this._fieldHtml(branch, f)).join('')}
        </div>

        <!-- Footer actions -->
        <div style="display:flex;gap:8px;padding-top:16px;border-top:1px solid rgba(99,102,241,0.12);">
          <button class="btn btn-primary" onclick="BranchModule.saveBranch('${id}')">💾 Lưu chi nhánh</button>
          <button class="btn btn-outline" style="color:#ef4444;border-color:rgba(239,68,68,0.3);"
            onclick="BranchModule.deleteBranch('${id}')">Xóa</button>
        </div>
      </div>`;
  },

  _fieldHtml(branch, f) {
    return `<div>
      <label style="display:block;font-size:0.76rem;font-weight:600;color:var(--text-secondary);margin-bottom:4px;letter-spacing:0.02em;">
        ${this._esc(f.label)}${f.required ? ' <span style="color:#ef4444">*</span>' : ''}
      </label>
      <input class="branch-field-input"
        id="brf-${branch.id}-${f.key}"
        value="${this._esc(branch[f.key] || '')}"
        placeholder="${this._esc(f.label)}..."
        oninput="BranchModule._onInput('${branch.id}','${f.key}',this.value)">
    </div>`;
  },

  _onInput(branchId, fieldKey, value) {
    const branch = BranchState.list.find(b => b.id === branchId);
    if (!branch) return;
    branch[fieldKey] = value;
    // Update header live
    if (fieldKey === 'ten_chi_nhanh' || fieldKey === 'ma_chi_nhanh') {
      this._renderList();
    }
  },

  saveBranch(id) {
    const branch = BranchState.list.find(b => b.id === id);
    if (!branch) return;
    BRANCH_FIELDS.forEach(f => {
      const el = document.getElementById(`brf-${id}-${f.key}`);
      if (el) branch[f.key] = el.value;
    });
    // Validate required fields
    const missing = BRANCH_FIELDS.filter(f => f.required && !branch[f.key]);
    if (missing.length) {
      if (typeof App !== 'undefined') App.toast(`Vui lòng điền: ${missing.map(f => f.label).join(', ')}`, 'warning');
      return;
    }
    this.saveState();
    this._renderList();
    this._renderForm(id);
    if (typeof App !== 'undefined') App.toast(`Đã lưu: ${branch.ten_chi_nhanh || branch.ma_chi_nhanh}`, 'success');
  },

  /* ── Import XLSX ── */
  _handleImportFile(file) {
    if (!file) return;
    if (typeof XLSX === 'undefined') {
      if (typeof App !== 'undefined') App.toast('Thiếu thư viện XLSX', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        let imported = 0;
        rows.forEach(row => {
          const b = { id: this._uid() };
          BRANCH_FIELDS.forEach(f => {
            b[f.key] = String(row[f.label] ?? row[f.key] ?? '').trim();
          });
          if (b.ma_chi_nhanh || b.ten_chi_nhanh) {
            BranchState.list.push(b);
            imported++;
          }
        });
        if (imported > 0) {
          this.saveState();
          this._renderList();
          if (typeof App !== 'undefined') App.toast(`Đã import ${imported} chi nhánh từ "${file.name}"`, 'success');
        } else {
          if (typeof App !== 'undefined') App.toast('Không tìm thấy dữ liệu chi nhánh hợp lệ. Kiểm tra cột header trong file.', 'warning');
        }
      } catch (err) {
        if (typeof App !== 'undefined') App.toast('Lỗi đọc file: ' + err.message, 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  },

  /* ── Download template XLSX ── */
  _downloadTemplate() {
    if (typeof XLSX === 'undefined') {
      const csv = BRANCH_FIELDS.map(f => f.label).join(',') + '\n';
      const blob = new Blob(['﻿' + csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'template_chi_nhanh.csv';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 3000);
      return;
    }
    const wb = XLSX.utils.book_new();
    const headers = BRANCH_FIELDS.map(f => f.label);
    const ws = XLSX.utils.aoa_to_sheet([headers, headers.map(() => '')]);
    ws['!cols'] = headers.map(() => ({ wch: 25 }));
    XLSX.utils.book_append_sheet(wb, ws, 'Chi Nhánh');
    XLSX.writeFile(wb, 'template_chi_nhanh.xlsx');
    if (typeof App !== 'undefined') App.toast('Đã tải template XLSX', 'success');
  },

  /* ── Mapping data exposed to Word template system ── */
  getMappingData() {
    const id = BranchState.selectedId || BranchState.list[0]?.id;
    if (!id) return {};
    const branch = BranchState.list.find(b => b.id === id);
    if (!branch) return {};
    const result = {};
    BRANCH_FIELDS.forEach(f => {
      result[`[Chi Nhánh] ${f.label}`] = branch[f.key] || '';
    });
    return result;
  },

  getSelectedBranch() {
    const id = BranchState.selectedId || BranchState.list[0]?.id;
    return id ? BranchState.list.find(b => b.id === id) : null;
  },
};
