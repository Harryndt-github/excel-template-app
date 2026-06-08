/* ============================================
   Project Info Module — Thông tin Dự án
   ============================================ */

const PROJECT_INFO_FIELDS = [
  // Định danh dự án
  { key: 'ten_du_an',                   label: 'Tên dự án',                             required: true,  section: 'proj' },
  { key: 'ma_du_an',                    label: 'Mã dự án',                              required: false, section: 'proj' },
  { key: 'dia_chi_du_an',               label: 'Địa chỉ dự án',                         required: false, section: 'proj' },
  { key: 'loai_hinh_tai_san',           label: 'Loại hình tài sản',                     required: false, section: 'proj' },
  { key: 'trang_thai_tai_san',          label: 'Trạng thái tài sản',                    required: false, section: 'proj' },
  { key: 'so_hdmb',                     label: 'Số HĐMB',                               required: false, section: 'proj' },

  // Chủ đầu tư
  { key: 'ten_cdt',                     label: 'Tên CĐT',                               required: true,  section: 'cdt'  },
  { key: 'dia_chi_cdt',                 label: 'Địa chỉ CĐT',                           required: false, section: 'cdt'  },
  { key: 'dien_thoai_fax',              label: 'Điện thoại & Fax',                      required: false, section: 'cdt'  },
  { key: 'ma_so_thue',                  label: 'Mã số thuế',                            required: false, section: 'cdt'  },
  { key: 'so_tai_khoan',                label: 'Số tài khoản',                          required: false, section: 'cdt'  },
  { key: 'nguoi_dai_dien',              label: 'Người đại diện',                        required: false, section: 'cdt'  },
  { key: 'chuc_vu',                     label: 'Chức vụ',                               required: false, section: 'cdt'  },
  { key: 'so_uy_quyen',                 label: 'Số uỷ quyền',                           required: false, section: 'cdt'  },
  { key: 'dai_dien_ky_cdt',             label: 'Đại diện ký CĐT',                      required: false, section: 'cdt'  },
  { key: 'dang_ky_kinh_doanh',          label: 'Đăng ký kinh doanh',                   required: false, section: 'cdt'  },

  // Tài khoản giải ngân
  { key: 'thong_tin_tk_giai_ngan',      label: 'Thông tin TK giải ngân',                required: false, section: 'bank' },
  { key: 'stk_giai_ngan',               label: 'STK giải ngân',                         required: false, section: 'bank' },

  // Khoản vay
  { key: 'muc_dich_vay',                label: 'Mục đích vay',                          required: false, section: 'loan' },
  { key: 'ma_chinh_sach',               label: 'Mã chính sách',                         required: false, section: 'loan' },
  { key: 'ma_chuong_trinh',             label: 'Mã chương trình',                       required: false, section: 'loan' },
  { key: 'ma_hop_dong',                 label: 'Mã hợp đồng',                           required: false, section: 'loan' },
  { key: 'don_vi_htls',                 label: 'Đơn vị HTLS',                           required: false, section: 'loan' },
  { key: 'muc_dich_vay_hdtd',           label: 'Mục đích vay soạn trên HĐTD',          required: false, section: 'loan' },
  { key: 'muc_dich_vay_bu_dap_hdtd',    label: 'Mục đích vay bù đắp soạn trên HĐTD',  required: false, section: 'loan' },

  // Tài liệu
  { key: 'folder_soan_chi_ho',          label: 'Folder soạn chi hộ',                    required: false, section: 'docs' },
  { key: 'mau_thoa_thuan_qlts',         label: 'Mẫu thoả thuận quản lý tài sản',       required: false, section: 'docs' },
];

const PROJECT_INFO_SECTIONS = {
  proj: { label: 'Thông tin Dự án',       keys: ['ten_du_an','ma_du_an','dia_chi_du_an','loai_hinh_tai_san','trang_thai_tai_san','so_hdmb'] },
  cdt:  { label: 'Thông tin Chủ đầu tư', keys: ['ten_cdt','dia_chi_cdt','dien_thoai_fax','ma_so_thue','so_tai_khoan','nguoi_dai_dien','chuc_vu','so_uy_quyen','dai_dien_ky_cdt','dang_ky_kinh_doanh'] },
  bank: { label: 'Tài khoản giải ngân',   keys: ['thong_tin_tk_giai_ngan','stk_giai_ngan'] },
  loan: { label: 'Thông tin khoản vay',   keys: ['muc_dich_vay','ma_chinh_sach','ma_chuong_trinh','ma_hop_dong','don_vi_htls','muc_dich_vay_hdtd','muc_dich_vay_bu_dap_hdtd'] },
  docs: { label: 'Tài liệu',              keys: ['folder_soan_chi_ho','mau_thoa_thuan_qlts'] },
};

const ProjectInfoState = {
  list: [],
  selectedId: null,
};

const ProjectInfoModule = {
  STORAGE_KEY: 'project_info_module_v1',
  COLOR: '#f97316',

  _esc(t) {
    const d = document.createElement('div');
    d.textContent = String(t ?? '');
    return d.innerHTML;
  },
  _uid() {
    return 'pi_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
  },

  /* ── Persistence ── */
  init() { this.loadState(); },

  _persistLocalState() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
        list: ProjectInfoState.list,
        selectedId: ProjectInfoState.selectedId,
      }));
    } catch (e) {}
  },

  loadState() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        ProjectInfoState.list = Array.isArray(saved.list) ? saved.list : [];
        ProjectInfoState.selectedId = saved.selectedId || null;
        if (!ProjectInfoState.list.some(p => p.id === ProjectInfoState.selectedId)) {
          ProjectInfoState.selectedId = ProjectInfoState.list[0]?.id || null;
        }
      }
    } catch (e) {}
  },

  saveState() {
    this._persistLocalState();
    if (typeof UatStorage !== 'undefined' && UatStorage.client) {
      clearTimeout(this._saveTimer);
      this._saveTimer = setTimeout(() => UatStorage.upsertState('project_info_data'), 800);
    }
  },

  /* ── Render entry-point called by MasterData.setView('projectinfo') ── */
  render() {
    const panel = document.getElementById('md-view-projectinfo');
    if (!panel) return;
    panel.innerHTML = `
      <div class="pi-layout">
        <div class="pi-list-panel">
          <div class="pi-list-hd">
            <span style="font-weight:700;font-size:0.88rem;color:var(--text-primary);">🏗️ Danh sách Dự án</span>
            <button class="md-cfg-add-btn" onclick="ProjectInfoModule.addProject()">＋ Thêm</button>
          </div>
          <div style="padding:8px 10px;border-bottom:1px solid rgba(249,115,22,0.1);">
            <input id="pi-search" type="text" placeholder="Tìm mã / tên dự án..."
              style="width:100%;padding:6px 10px;border-radius:8px;border:1px solid var(--border);background:var(--bg-secondary);color:var(--text-primary);font-size:0.8rem;box-sizing:border-box;font-family:inherit;"
              oninput="ProjectInfoModule._filterList(this.value)">
          </div>
          <div id="pi-list-items" style="overflow-y:auto;flex:1;padding:6px;"></div>
        </div>
        <div class="pi-form-panel" id="pi-form-panel">
          <div class="pi-empty-state">
            <div style="font-size:2.8rem;margin-bottom:12px;">🏗️</div>
            <p style="font-size:0.9rem;color:var(--text-muted);">Chọn dự án để xem / chỉnh sửa<br>hoặc bấm <b>＋ Thêm</b> để tạo mới</p>
          </div>
        </div>
      </div>`;
    this._renderList();
    if (ProjectInfoState.selectedId) this._renderForm(ProjectInfoState.selectedId);
  },

  /* ── List ── */
  _renderList(filter) {
    const container = document.getElementById('pi-list-items');
    if (!container) return;
    const q = (filter || '').toLowerCase().trim();
    const items = q
      ? ProjectInfoState.list.filter(p =>
          (p.ten_du_an || '').toLowerCase().includes(q) ||
          (p.ma_du_an || '').toLowerCase().includes(q) ||
          (p.ten_cdt || '').toLowerCase().includes(q))
      : ProjectInfoState.list;

    if (items.length === 0) {
      container.innerHTML = `<div style="padding:24px 16px;text-align:center;color:var(--text-muted);font-size:0.82rem;">
        ${q ? 'Không tìm thấy dự án nào' : 'Chưa có dự án nào.<br>Bấm <b>＋ Thêm</b> để tạo mới.'}
      </div>`;
      return;
    }
    container.innerHTML = items.map(p => {
      const active = p.id === ProjectInfoState.selectedId;
      return `<div class="pi-list-item${active ? ' active' : ''}" onclick="ProjectInfoModule.selectProject('${p.id}')">
        <div style="display:flex;align-items:flex-start;gap:8px;">
          <div style="flex:1;min-width:0;">
            <div style="font-weight:700;font-size:0.83rem;color:${active ? '#f97316' : 'var(--text-primary)'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
              ${this._esc(p.ten_du_an || '(Chưa đặt tên)')}
            </div>
            ${p.ten_cdt ? `<div style="font-size:0.77rem;color:var(--text-secondary);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${this._esc(p.ten_cdt)}</div>` : ''}
            ${p.ma_du_an ? `<div style="font-size:0.71rem;color:var(--text-muted);margin-top:1px;">${this._esc(p.ma_du_an)}</div>` : ''}
          </div>
          <button class="pi-delete-btn" onclick="event.stopPropagation();ProjectInfoModule.deleteProject('${p.id}')" title="Xóa">×</button>
        </div>
      </div>`;
    }).join('');
  },

  _filterList(q) { this._renderList(q); },

  /* ── CRUD ── */
  selectProject(id) {
    ProjectInfoState.selectedId = id;
    this._persistLocalState();
    this._renderList();
    this._renderForm(id);
  },

  addProject() {
    const id = this._uid();
    const proj = { id };
    PROJECT_INFO_FIELDS.forEach(f => { proj[f.key] = ''; });
    ProjectInfoState.list.push(proj);
    ProjectInfoState.selectedId = id;
    this.saveState();
    this._renderList();
    this._renderForm(id);
  },

  deleteProject(id) {
    const proj = ProjectInfoState.list.find(p => p.id === id);
    const name = proj ? (proj.ten_du_an || proj.ma_du_an || 'dự án này') : 'dự án này';
    if (!confirm(`Xóa "${name}"?`)) return;
    ProjectInfoState.list = ProjectInfoState.list.filter(p => p.id !== id);
    if (ProjectInfoState.selectedId === id) {
      ProjectInfoState.selectedId = ProjectInfoState.list[0]?.id || null;
    }
    this.saveState();
    this._renderList();
    if (ProjectInfoState.selectedId) {
      this._renderForm(ProjectInfoState.selectedId);
    } else {
      const fp = document.getElementById('pi-form-panel');
      if (fp) fp.innerHTML = `<div class="pi-empty-state"><div style="font-size:2.8rem;margin-bottom:12px;">🏗️</div><p style="font-size:0.9rem;color:var(--text-muted);">Chưa có dự án nào được chọn</p></div>`;
    }
    if (typeof App !== 'undefined') App.toast('Đã xóa dự án', 'info');
  },

  duplicateProject(id) {
    const src = ProjectInfoState.list.find(p => p.id === id);
    if (!src) return;
    const dup = { ...src, id: this._uid(), ten_du_an: (src.ten_du_an || '') + ' (Bản sao)' };
    ProjectInfoState.list.push(dup);
    ProjectInfoState.selectedId = dup.id;
    this.saveState();
    this._renderList();
    this._renderForm(dup.id);
    if (typeof App !== 'undefined') App.toast('Đã nhân bản dự án', 'success');
  },

  /* ── Form ── */
  _renderForm(id) {
    const proj = ProjectInfoState.list.find(p => p.id === id);
    if (!proj) return;
    const fp = document.getElementById('pi-form-panel');
    if (!fp) return;

    const renderSection = (sectionKey) => {
      const sec = PROJECT_INFO_SECTIONS[sectionKey];
      const fields = sec.keys.map(k => PROJECT_INFO_FIELDS.find(f => f.key === k)).filter(Boolean);
      return `
        <div class="pi-section-title">${sec.label}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px 20px;margin-bottom:14px;">
          ${fields.map(f => this._fieldHtml(proj, f)).join('')}
        </div>`;
    };

    fp.innerHTML = `
      <div class="pi-form-scroll">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;flex-wrap:wrap;padding-bottom:16px;border-bottom:1px solid rgba(249,115,22,0.12);">
          <div style="width:40px;height:40px;border-radius:10px;background:rgba(249,115,22,0.15);display:flex;align-items:center;justify-content:center;font-size:1.3rem;flex-shrink:0;">🏗️</div>
          <div style="flex:1;min-width:0;">
            <h3 style="margin:0;font-size:1rem;font-weight:700;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
              ${proj.ten_du_an ? this._esc(proj.ten_du_an) : '<span style="color:var(--text-muted)">Dự án mới</span>'}
            </h3>
            <div style="font-size:0.78rem;color:var(--text-muted);margin-top:2px;">${this._esc(proj.ten_cdt || 'Chưa có CĐT')}</div>
          </div>
          <div style="display:flex;gap:8px;flex-shrink:0;">
            <button class="btn btn-primary" onclick="ProjectInfoModule.saveProject('${id}')">💾 Lưu</button>
            <button class="btn btn-outline" onclick="ProjectInfoModule.duplicateProject('${id}')">Nhân bản</button>
          </div>
        </div>

        ${renderSection('proj')}
        ${renderSection('cdt')}
        ${renderSection('bank')}
        ${renderSection('loan')}
        ${renderSection('docs')}

        <div style="display:flex;gap:8px;padding-top:16px;border-top:1px solid rgba(249,115,22,0.12);">
          <button class="btn btn-primary" onclick="ProjectInfoModule.saveProject('${id}')">💾 Lưu dự án</button>
          <button class="btn btn-outline" style="color:#ef4444;border-color:rgba(239,68,68,0.3);"
            onclick="ProjectInfoModule.deleteProject('${id}')">Xóa</button>
        </div>
      </div>`;
  },

  _fieldHtml(proj, f) {
    return `<div>
      <label style="display:block;font-size:0.76rem;font-weight:600;color:var(--text-secondary);margin-bottom:4px;letter-spacing:0.02em;">
        ${this._esc(f.label)}${f.required ? ' <span style="color:#ef4444">*</span>' : ''}
      </label>
      <input class="pi-field-input"
        id="pif-${proj.id}-${f.key}"
        value="${this._esc(proj[f.key] || '')}"
        placeholder="${this._esc(f.label)}..."
        oninput="ProjectInfoModule._onInput('${proj.id}','${f.key}',this.value)">
    </div>`;
  },

  _onInput(projId, fieldKey, value) {
    const proj = ProjectInfoState.list.find(p => p.id === projId);
    if (!proj) return;
    proj[fieldKey] = value;
    if (fieldKey === 'ten_du_an' || fieldKey === 'ten_cdt' || fieldKey === 'ma_du_an') {
      this._renderList();
    }
  },

  saveProject(id) {
    const proj = ProjectInfoState.list.find(p => p.id === id);
    if (!proj) return;
    PROJECT_INFO_FIELDS.forEach(f => {
      const el = document.getElementById(`pif-${id}-${f.key}`);
      if (el) proj[f.key] = el.value;
    });
    this.saveState();
    this._renderList();
    if (typeof App !== 'undefined') App.toast('Đã lưu thông tin dự án', 'success');
  },

  /* ── Template integration ── */
  getMappingData() {
    const id = ProjectInfoState.selectedId || ProjectInfoState.list[0]?.id;
    if (!id) return {};
    const proj = ProjectInfoState.list.find(p => p.id === id);
    if (!proj) return {};
    const result = {};
    PROJECT_INFO_FIELDS.forEach(f => {
      result[`[Thông tin dự án] ${f.label}`] = proj[f.key] || '';
    });
    return result;
  },

  getSelectedProject() {
    const id = ProjectInfoState.selectedId || ProjectInfoState.list[0]?.id;
    return id ? ProjectInfoState.list.find(p => p.id === id) : null;
  },
};

document.addEventListener('DOMContentLoaded', () => {
  ProjectInfoModule.init();
});
