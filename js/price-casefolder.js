/* ============================================
   Thông tin giá (BRD Bảng 6, mục 5.4)
   + Case Folder (BRD Bảng 7, mục 5.5)
   2 view mới trong trang Master Data, dùng chung
   factory CRUD theo pattern project-info.js.
   ============================================ */

/* ── BRD Bảng 6: Thông tin giá — theo từng mã căn ── */
const PRICE_INFO_FIELDS = [
  // Định danh căn
  { key: 'ma_can',                 label: 'Mã căn',                                      required: true,  section: 'unit' },
  { key: 'ma_can_giao_dich',       label: 'Mã căn giao dịch',                            required: false, section: 'unit' },
  { key: 'ten_du_an',              label: 'Tên dự án',                                   required: false, section: 'unit' },
  { key: 'loai_hinh_can_ho',       label: 'Loại hình căn hộ',                            required: false, section: 'unit' },
  { key: 'trang_thai_chuyen_nhuong', label: 'Trạng thái chuyển nhượng (Y/N)',            required: false, section: 'unit' },
  { key: 'ngay_ban_giao_du_kien',  label: 'Ngày bàn giao dự kiến',                       required: false, section: 'unit' },
  // Giá theo xác nhận CĐT
  { key: 'gia_net_hdmb',           label: 'Giá NET trên HĐMB',                           required: false, section: 'price' },
  { key: 'gia_vat_hdmb',           label: 'Giá VAT trên HĐMB',                           required: false, section: 'price' },
  { key: 'kpbt',                   label: 'KPBT (nếu có)',                               required: false, section: 'price' },
  { key: 'gia_hdmb',               label: 'Giá HĐMB',                                    required: false, section: 'price' },
  { key: 'gia_tren_vbcn',          label: 'Giá trên VBCN',                               required: false, section: 'price' },
  { key: 'gia_tri_hop_dong_vay',   label: 'Giá trị hợp đồng vay',                        required: false, section: 'price' },
  { key: 'so_tien_tt_nhan_ban_giao', label: 'Số tiền KH thanh toán khi nhận bàn giao',   required: false, section: 'price' },
  // HTLS & giải ngân
  { key: 'ngay_chan_htls_cdt',     label: 'Ngày chặn HTLS của CĐT',                      required: false, section: 'gn' },
  { key: 'gn_ma',                  label: 'GN MA',                                       required: false, section: 'gn' },
  { key: 'gn_cdt',                 label: 'GN CĐT',                                      required: false, section: 'gn' },
  { key: 'gn_f1',                  label: 'GN F1',                                       required: false, section: 'gn' },
  { key: 'tong_gn',                label: 'Tổng GN',                                     required: false, section: 'gn' },
  // HĐMB & khách hàng
  { key: 'so_hdmb',                label: 'Số HĐMB',                                     required: false, section: 'kh' },
  { key: 'ngay_ky_hdmb',           label: 'Ngày ký HĐMB',                                required: false, section: 'kh' },
  { key: 'ngay_ky_ttdc_vbtt',      label: 'Ngày ký TTĐC/VBTT (cơ sở tính tiến độ)',      required: false, section: 'kh' },
  { key: 'ho_ten_kh',              label: 'Họ tên khách hàng',                           required: false, section: 'kh' },
  { key: 'id_kh_hdmb',             label: 'ID Khách hàng trên HĐMB',                     required: false, section: 'kh' },
  { key: 'dia_chi_ho_khau',        label: 'Địa chỉ hộ khẩu của khách hàng',              required: false, section: 'kh' },
  { key: 'dien_thoai_hd',          label: 'Điện thoại trên HĐ / Ngày cấp CMND',          required: false, section: 'kh' },
  { key: 'email_hd',               label: 'Email trên HĐ / Nơi cấp CMND',                required: false, section: 'kh' },
  { key: 'dia_chi_lien_he_hd',     label: 'Địa chỉ liên hệ trên HĐ',                     required: false, section: 'kh' },
  { key: 'banca_mh',               label: 'Có tham gia Banca MH',                        required: false, section: 'kh' },
  // Chuyển nhượng F1
  { key: 'ho_ten_f1',              label: 'Họ tên F1',                                   required: false, section: 'f1' },
  { key: 'gia_tri_gd_f1_f2',       label: 'Giá trị giao dịch thực tế giữa F1 và F2',     required: false, section: 'f1' },
  { key: 'note',                   label: 'Note',                                        required: false, section: 'f1' },
];
const PRICE_INFO_SECTIONS = {
  unit:  { label: 'Định danh căn',            keys: ['ma_can','ma_can_giao_dich','ten_du_an','loai_hinh_can_ho','trang_thai_chuyen_nhuong','ngay_ban_giao_du_kien'] },
  price: { label: 'Giá theo xác nhận CĐT',    keys: ['gia_net_hdmb','gia_vat_hdmb','kpbt','gia_hdmb','gia_tren_vbcn','gia_tri_hop_dong_vay','so_tien_tt_nhan_ban_giao'] },
  gn:    { label: 'HTLS & giải ngân',          keys: ['ngay_chan_htls_cdt','gn_ma','gn_cdt','gn_f1','tong_gn'] },
  kh:    { label: 'HĐMB & khách hàng',         keys: ['so_hdmb','ngay_ky_hdmb','ngay_ky_ttdc_vbtt','ho_ten_kh','id_kh_hdmb','dia_chi_ho_khau','dien_thoai_hd','email_hd','dia_chi_lien_he_hd','banca_mh'] },
  f1:    { label: 'Chuyển nhượng F1 & ghi chú', keys: ['ho_ten_f1','gia_tri_gd_f1_f2','note'] },
};

/* ── BRD Bảng 7: Case Folder — chính sách bán hàng theo dự án/CĐT ── */
const CASE_FOLDER_FIELDS = [
  // Định danh
  { key: 'ten_case',               label: 'Tên Case Folder',                             required: true,  section: 'id' },
  { key: 'ma_du_an',               label: 'Mã dự án',                                    required: false, section: 'id' },
  { key: 'muc_dich_vay',           label: 'Mục đích vay',                                required: false, section: 'id' },
  { key: 'csbh',                   label: 'CSBH',                                        required: false, section: 'id' },
  // HTLS
  { key: 'ngay_chan_htls',         label: 'Ngày chặn HTLS',                              required: false, section: 'htls' },
  { key: 'thang_chan_htls',        label: 'Tháng chặn HTLS',                             required: false, section: 'htls' },
  { key: 'ty_le_htls',             label: 'Tỷ lệ HTLS',                                  required: false, section: 'htls' },
  { key: 'muc_ls_cdt_ho_tro',      label: 'Mức lãi suất CĐT hỗ trợ',                     required: false, section: 'htls' },
  { key: 'cdt_chi_lai_vay_1',      label: 'CĐT chi lãi vay 1',                           required: false, section: 'htls' },
  { key: 'kh_chi_lai_vay_1',       label: 'KH chi lãi vay 1',                            required: false, section: 'htls' },
  // Tỷ lệ HĐV & vốn tự có
  { key: 'ty_le_hop_dong_vay',     label: 'Tỷ lệ hợp đồng vay',                          required: false, section: 'tyle' },
  { key: 'ty_le_hdv_tien_do_1',    label: 'Tỷ lệ HĐV - Tiến độ 1',                       required: false, section: 'tyle' },
  { key: 'ty_le_hdv_tien_do_2',    label: 'Tỷ lệ HĐV - Tiến độ 2',                       required: false, section: 'tyle' },
  { key: 'ngay_tien_do_2',         label: 'Ngày tiến độ 2',                              required: false, section: 'tyle' },
  { key: 'ty_le_hdv_tien_do_3',    label: 'Tỷ lệ HĐV - Tiến độ 3',                       required: false, section: 'tyle' },
  { key: 'ngay_tien_do_3',         label: 'Ngày tiến độ 3',                              required: false, section: 'tyle' },
  { key: 'tien_do_tts_thuong',     label: 'Tiến độ TTS thường',                          required: false, section: 'tyle' },
  { key: 'tien_do_tts_ban_giao',   label: 'Tiến độ TTS đã có TB bàn giao (vay 100%)',    required: false, section: 'tyle' },
  { key: 'ty_le_vtc_net',          label: 'Tỷ lệ VTC – NET',                             required: false, section: 'tyle' },
  { key: 'ty_le_vtc_vat',          label: 'Tỷ lệ VTC – VAT',                             required: false, section: 'tyle' },
  // Tỷ lệ giải ngân theo lần
  { key: 'ty_le_gn_lan_1',         label: 'Tỷ lệ GN lần 1',                              required: false, section: 'gn' },
  { key: 'ty_le_gn_lan_2',         label: 'Tỷ lệ GN lần 2',                              required: false, section: 'gn' },
  { key: 'ty_le_gn_lan_3',         label: 'Tỷ lệ GN lần 3',                              required: false, section: 'gn' },
  { key: 'ty_le_gn_lan_4',         label: 'Tỷ lệ GN lần 4',                              required: false, section: 'gn' },
  { key: 'ty_le_gn_lan_5',         label: 'Tỷ lệ GN lần 5',                              required: false, section: 'gn' },
  // Phí TNTH
  { key: 'ho_tro_phi_tnth',        label: 'Có hỗ trợ phí TNTH không',                    required: false, section: 'tnth' },
  { key: 'tgian_ho_tro_phi_tnth_max', label: 'Tgian hỗ trợ phí TNTH tối đa',             required: false, section: 'tnth' },
  // Ân hạn gốc
  { key: 'an_han_goc_toi_da',      label: 'Ân hạn gốc tối đa',                           required: false, section: 'ahg' },
  { key: 'thoi_gian_ahg_bo_sung',  label: 'Thời gian AHG bổ sung',                       required: false, section: 'ahg' },
  { key: 'cs_ahg_tren_30',         label: 'CSBH có CS AHG trên 30 tháng không',          required: false, section: 'ahg' },
  // Giai đoạn 2
  { key: 'ngay_htls_gd2',          label: 'Ngày HTLS giai đoạn 2',                       required: false, section: 'gd2' },
  { key: 'ngay_chan_htls_gd2',     label: 'Ngày chặn HTLS giai đoạn 2',                  required: false, section: 'gd2' },
  { key: 'thang_chan_htls_gd2',    label: 'Tháng chặn HTLS giai đoạn 2',                 required: false, section: 'gd2' },
  { key: 'cdt_chi_lai_vay_2',      label: 'CĐT chi lãi vay 2',                           required: false, section: 'gd2' },
  { key: 'kh_chi_lai_vay_2',       label: 'KH chi lãi vay 2',                            required: false, section: 'gd2' },
  { key: 'blls_ket_thuc_gd1',      label: 'BLLS bắt đầu từ thời điểm kết thúc GĐ1',      required: false, section: 'gd2' },
  // Khác
  { key: 'du_kien_ban_giao',       label: 'Dự kiến bàn giao',                            required: false, section: 'khac' },
  { key: 'ap_dung_cs_dam_bao_ls',  label: 'Áp dụng CS đảm bảo LS',                       required: false, section: 'khac' },
  { key: 'sp_kinh_doanh_luu_tru',  label: 'Có theo SP kinh doanh lưu trú?',              required: false, section: 'khac' },
  { key: 'lich_tra_no_tien_thue',  label: 'Lịch trả nợ (có tiền thuê làm nguồn thu)',    required: false, section: 'khac' },
  { key: 'ngay_dao_han_stk',       label: 'Ngày đáo hạn STK',                            required: false, section: 'khac' },
];
const CASE_FOLDER_SECTIONS = {
  id:   { label: 'Định danh Case Folder',     keys: ['ten_case','ma_du_an','muc_dich_vay','csbh'] },
  htls: { label: 'Hỗ trợ lãi suất',           keys: ['ngay_chan_htls','thang_chan_htls','ty_le_htls','muc_ls_cdt_ho_tro','cdt_chi_lai_vay_1','kh_chi_lai_vay_1'] },
  tyle: { label: 'Tỷ lệ HĐV & vốn tự có',     keys: ['ty_le_hop_dong_vay','ty_le_hdv_tien_do_1','ty_le_hdv_tien_do_2','ngay_tien_do_2','ty_le_hdv_tien_do_3','ngay_tien_do_3','tien_do_tts_thuong','tien_do_tts_ban_giao','ty_le_vtc_net','ty_le_vtc_vat'] },
  gn:   { label: 'Tỷ lệ giải ngân theo lần',  keys: ['ty_le_gn_lan_1','ty_le_gn_lan_2','ty_le_gn_lan_3','ty_le_gn_lan_4','ty_le_gn_lan_5'] },
  tnth: { label: 'Phí trả nợ trước hạn',      keys: ['ho_tro_phi_tnth','tgian_ho_tro_phi_tnth_max'] },
  ahg:  { label: 'Ân hạn gốc',                keys: ['an_han_goc_toi_da','thoi_gian_ahg_bo_sung','cs_ahg_tren_30'] },
  gd2:  { label: 'HTLS giai đoạn 2 & BLLS',   keys: ['ngay_htls_gd2','ngay_chan_htls_gd2','thang_chan_htls_gd2','cdt_chi_lai_vay_2','kh_chi_lai_vay_2','blls_ket_thuc_gd1'] },
  khac: { label: 'Thông tin khác',            keys: ['du_kien_ban_giao','ap_dung_cs_dam_bao_ls','sp_kinh_doanh_luu_tru','lich_tra_no_tien_thue','ngay_dao_han_stk'] },
};

/* ── Factory: tạo module CRUD list+form theo pattern project-info ── */
function _createMDListModule(cfg) {
  const state = { list: [], selectedId: null };
  const M = {
    STORAGE_KEY: cfg.storageKey,
    state,

    _esc(t) {
      const d = document.createElement('div');
      d.textContent = String(t ?? '');
      return d.innerHTML;
    },
    _uid() { return cfg.prefix + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6); },
    _toast(msg, type) { if (typeof App !== 'undefined' && App.toast) App.toast(msg, type || 'info'); },

    init() { this.loadState(); },
    loadState() {
      try {
        const raw = localStorage.getItem(this.STORAGE_KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          state.list = Array.isArray(saved.list) ? saved.list : [];
          state.selectedId = saved.selectedId || null;
          if (!state.list.some(r => r.id === state.selectedId)) state.selectedId = state.list[0]?.id || null;
        }
      } catch (e) { /* dùng mặc định */ }
    },
    saveState() {
      try { localStorage.setItem(this.STORAGE_KEY, JSON.stringify({ list: state.list, selectedId: state.selectedId })); } catch (e) { /* quota */ }
    },

    render() {
      const panel = document.getElementById(cfg.panelId);
      if (!panel) return;
      panel.innerHTML = `
        <div class="pi-layout">
          <div class="pi-list-panel">
            <div class="pi-list-hd">
              <span style="font-weight:700;font-size:0.88rem;color:var(--text-primary);">${cfg.icon} ${cfg.listLabel}</span>
              <button class="md-cfg-add-btn" onclick="${cfg.globalName}.addRecord()">＋ Thêm</button>
            </div>
            <div style="padding:8px 10px;border-bottom:1px solid var(--border,rgba(148,163,184,0.2));display:flex;gap:6px;flex-wrap:wrap;">
              <input id="${cfg.prefix}-search" type="text" placeholder="${cfg.searchPlaceholder}"
                style="flex:1;min-width:120px;padding:6px 10px;border-radius:8px;border:1px solid var(--border);background:var(--bg-secondary);color:var(--text-primary);font-size:0.8rem;box-sizing:border-box;font-family:inherit;"
                oninput="${cfg.globalName}._renderList(this.value)">
              <label class="btn btn-outline" style="font-size:0.72rem;padding:5px 9px;cursor:pointer;" title="Import hàng loạt từ Excel">📥
                <input type="file" accept=".xlsx,.xls,.csv" hidden onchange="${cfg.globalName}._handleImportFile(this.files[0]);this.value=''">
              </label>
              <button class="btn btn-outline" style="font-size:0.72rem;padding:5px 9px;" title="Tải template XLSX"
                onclick="${cfg.globalName}._downloadTemplate()">⬇</button>
            </div>
            <div id="${cfg.prefix}-list-items" style="overflow-y:auto;flex:1;padding:6px;"></div>
          </div>
          <div class="pi-form-panel" id="${cfg.prefix}-form-panel">
            <div class="pi-empty-state">
              <div style="font-size:2.8rem;margin-bottom:12px;">${cfg.icon}</div>
              <p style="font-size:0.9rem;color:var(--text-muted);">Chọn bản ghi để xem / chỉnh sửa<br>hoặc bấm <b>＋ Thêm</b> để tạo mới</p>
            </div>
          </div>
        </div>`;
      this._renderList();
      if (state.selectedId) this._renderForm(state.selectedId);
    },

    _renderList(filter) {
      const container = document.getElementById(`${cfg.prefix}-list-items`);
      if (!container) return;
      const q = (filter || '').toLowerCase().trim();
      const items = q
        ? state.list.filter(r => cfg.searchKeys.some(k => (r[k] || '').toLowerCase().includes(q)))
        : state.list;
      if (!items.length) {
        container.innerHTML = `<div style="padding:24px 16px;text-align:center;color:var(--text-muted);font-size:0.82rem;">
          ${q ? 'Không tìm thấy bản ghi nào' : 'Chưa có bản ghi nào.<br>Bấm <b>＋ Thêm</b> hoặc 📥 import Excel.'}</div>`;
        return;
      }
      container.innerHTML = items.map(r => {
        const active = r.id === state.selectedId;
        return `<div class="pi-list-item${active ? ' active' : ''}" onclick="${cfg.globalName}.selectRecord('${r.id}')">
          <div style="display:flex;align-items:flex-start;gap:8px;">
            <div style="flex:1;min-width:0;">
              <div style="font-weight:700;font-size:0.83rem;color:${active ? cfg.color : 'var(--text-primary)'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                ${this._esc(r[cfg.titleKey] || '(Chưa đặt tên)')}
              </div>
              ${cfg.subtitleKeys.map(k => r[k] ? `<div style="font-size:0.74rem;color:var(--text-secondary);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${this._esc(r[k])}</div>` : '').join('')}
            </div>
            <button class="pi-delete-btn" onclick="event.stopPropagation();${cfg.globalName}.deleteRecord('${r.id}')" title="Xóa">×</button>
          </div>
        </div>`;
      }).join('');
    },

    selectRecord(id) {
      state.selectedId = id;
      this.saveState();
      this._renderList();
      this._renderForm(id);
    },
    addRecord() {
      const id = this._uid();
      const rec = { id };
      cfg.fields.forEach(f => { rec[f.key] = ''; });
      state.list.push(rec);
      state.selectedId = id;
      this.saveState();
      this._renderList();
      this._renderForm(id);
    },
    deleteRecord(id) {
      const rec = state.list.find(r => r.id === id);
      const name = rec ? (rec[cfg.titleKey] || 'bản ghi này') : 'bản ghi này';
      if (!confirm(`Xóa "${name}"?`)) return;
      state.list = state.list.filter(r => r.id !== id);
      if (state.selectedId === id) state.selectedId = state.list[0]?.id || null;
      this.saveState();
      this._renderList();
      if (state.selectedId) this._renderForm(state.selectedId);
      else {
        const fp = document.getElementById(`${cfg.prefix}-form-panel`);
        if (fp) fp.innerHTML = `<div class="pi-empty-state"><div style="font-size:2.8rem;margin-bottom:12px;">${cfg.icon}</div><p style="font-size:0.9rem;color:var(--text-muted);">Chưa có bản ghi nào được chọn</p></div>`;
      }
      this._toast('Đã xóa bản ghi', 'info');
    },
    duplicateRecord(id) {
      const src = state.list.find(r => r.id === id);
      if (!src) return;
      const dup = { ...src, id: this._uid() };
      dup[cfg.titleKey] = (src[cfg.titleKey] || '') + ' (Bản sao)';
      state.list.push(dup);
      state.selectedId = dup.id;
      this.saveState();
      this._renderList();
      this._renderForm(dup.id);
      this._toast('Đã nhân bản', 'success');
    },

    _renderForm(id) {
      const rec = state.list.find(r => r.id === id);
      if (!rec) return;
      const fp = document.getElementById(`${cfg.prefix}-form-panel`);
      if (!fp) return;
      const renderSection = (secKey) => {
        const sec = cfg.sections[secKey];
        const fields = sec.keys.map(k => cfg.fields.find(f => f.key === k)).filter(Boolean);
        return `
          <div class="pi-section-title">${sec.label}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px 20px;margin-bottom:14px;">
            ${fields.map(f => `<div>
              <label style="display:block;font-size:0.76rem;font-weight:600;color:var(--text-secondary);margin-bottom:4px;">
                ${this._esc(f.label)}${f.required ? ' <span style="color:#ef4444">*</span>' : ''}
              </label>
              <input class="pi-field-input" id="${cfg.prefix}f-${rec.id}-${f.key}"
                value="${this._esc(rec[f.key] || '')}" placeholder="${this._esc(f.label)}..."
                oninput="${cfg.globalName}._onInput('${rec.id}','${f.key}',this.value)">
            </div>`).join('')}
          </div>`;
      };
      fp.innerHTML = `
        <div class="pi-form-scroll">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;flex-wrap:wrap;padding-bottom:16px;border-bottom:1px solid var(--border,rgba(148,163,184,0.2));">
            <div style="width:40px;height:40px;border-radius:10px;background:${cfg.color}22;display:flex;align-items:center;justify-content:center;font-size:1.3rem;flex-shrink:0;">${cfg.icon}</div>
            <div style="flex:1;min-width:0;">
              <h3 style="margin:0;font-size:1rem;font-weight:700;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                ${rec[cfg.titleKey] ? this._esc(rec[cfg.titleKey]) : '<span style="color:var(--text-muted)">Bản ghi mới</span>'}
              </h3>
            </div>
            <div style="display:flex;gap:8px;flex-shrink:0;">
              <button class="btn btn-primary" onclick="${cfg.globalName}.saveRecord('${id}')">💾 Lưu</button>
              <button class="btn btn-outline" onclick="${cfg.globalName}.duplicateRecord('${id}')">Nhân bản</button>
            </div>
          </div>
          ${Object.keys(cfg.sections).map(renderSection).join('')}
          <div style="display:flex;gap:8px;padding-top:16px;border-top:1px solid var(--border,rgba(148,163,184,0.2));">
            <button class="btn btn-primary" onclick="${cfg.globalName}.saveRecord('${id}')">💾 Lưu</button>
            <button class="btn btn-outline" style="color:#ef4444;border-color:rgba(239,68,68,0.3);"
              onclick="${cfg.globalName}.deleteRecord('${id}')">Xóa</button>
          </div>
        </div>`;
    },

    _onInput(recId, fieldKey, value) {
      const rec = state.list.find(r => r.id === recId);
      if (!rec) return;
      rec[fieldKey] = value;
      if (fieldKey === cfg.titleKey || cfg.subtitleKeys.includes(fieldKey)) this._renderList();
    },
    saveRecord(id) {
      const rec = state.list.find(r => r.id === id);
      if (!rec) return;
      cfg.fields.forEach(f => {
        const el = document.getElementById(`${cfg.prefix}f-${id}-${f.key}`);
        if (el) rec[f.key] = el.value;
      });
      const missing = cfg.fields.filter(f => f.required && !rec[f.key]);
      if (missing.length) { this._toast(`Vui lòng điền: ${missing.map(f => f.label).join(', ')}`, 'warning'); return; }
      this.saveState();
      this._renderList();
      this._toast('Đã lưu bản ghi', 'success');
    },

    /* ── Import XLSX hàng loạt (header = label hoặc key) ── */
    _handleImportFile(file) {
      if (!file) return;
      if (typeof XLSX === 'undefined') { this._toast('Thiếu thư viện XLSX', 'error'); return; }
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
          const sheet = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
          let imported = 0;
          rows.forEach(row => {
            const rec = { id: this._uid() };
            cfg.fields.forEach(f => { rec[f.key] = String(row[f.label] ?? row[f.key] ?? '').trim(); });
            if (rec[cfg.titleKey]) { state.list.push(rec); imported++; }
          });
          if (imported > 0) {
            if (!state.selectedId) state.selectedId = state.list[0]?.id || null;
            this.saveState();
            this._renderList();
            this._toast(`Đã import ${imported} bản ghi từ "${file.name}"`, 'success');
          } else {
            this._toast(`Không tìm thấy dữ liệu hợp lệ — cần cột "${cfg.fields.find(f => f.key === cfg.titleKey).label}"`, 'warning');
          }
        } catch (err) { this._toast('Lỗi đọc file: ' + err.message, 'error'); }
      };
      reader.readAsArrayBuffer(file);
    },
    _downloadTemplate() {
      if (typeof XLSX === 'undefined') { this._toast('Thiếu thư viện XLSX', 'error'); return; }
      const wb = XLSX.utils.book_new();
      const headers = cfg.fields.map(f => f.label);
      const ws = XLSX.utils.aoa_to_sheet([headers]);
      ws['!cols'] = headers.map(() => ({ wch: 26 }));
      XLSX.utils.book_append_sheet(wb, ws, cfg.sheetName);
      XLSX.writeFile(wb, `template_${cfg.prefix}.xlsx`);
      this._toast('Đã tải template XLSX', 'success');
    },

    /* ── API tích hợp ── */
    getSelected() {
      const id = state.selectedId || state.list[0]?.id;
      return id ? state.list.find(r => r.id === id) : null;
    },
    getMappingData() {
      const rec = (typeof this.getMatched === 'function' && this.getMatched()) || this.getSelected();
      if (!rec) return {};
      const result = {};
      cfg.fields.forEach(f => { result[`[${cfg.mapLabel}] ${f.label}`] = rec[f.key] || ''; });
      return result;
    },
  };
  return M;
}

/* ── Module 1: Thông tin giá ── */
const PriceInfoModule = _createMDListModule({
  globalName: 'PriceInfoModule',
  storageKey: 'price_info_module_v1',
  prefix: 'price',
  panelId: 'md-view-priceinfo',
  color: '#0ea5e9',
  icon: '💰',
  listLabel: 'Thông tin giá theo căn',
  searchPlaceholder: 'Tìm mã căn / dự án / KH...',
  sheetName: 'Thong tin gia',
  mapLabel: 'Thông tin giá',
  fields: PRICE_INFO_FIELDS,
  sections: PRICE_INFO_SECTIONS,
  titleKey: 'ma_can',
  subtitleKeys: ['ten_du_an', 'ho_ten_kh'],
  searchKeys: ['ma_can', 'ma_can_giao_dich', 'ten_du_an', 'ho_ten_kh', 'so_hdmb'],
});
// Tra cứu theo mã căn (normalize, bỏ dấu/hoa thường)
PriceInfoModule._normKey = function (s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd').toLowerCase().replace(/\s+/g, '');
};
PriceInfoModule.lookupByMaCan = function (maCan) {
  if (!maCan) return null;
  const k = this._normKey(maCan);
  return this.state.list.find(r => this._normKey(r.ma_can) === k || this._normKey(r.ma_can_giao_dich) === k) || null;
};
// Bản ghi khớp mã căn đang xử lý (từ Extract LMS) — dùng cho mapping & validator
PriceInfoModule.getMatched = function () {
  const ex = (typeof AppState !== 'undefined' && AppState.extractedData) || {};
  const maCan = (ex.thong_tin_vay || {})['Mã căn vay vốn'] || (ex.tai_san || {})['Mã căn'] || '';
  return this.lookupByMaCan(maCan);
};

/* ── Module 2: Case Folder ── */
const CaseFolderModule = _createMDListModule({
  globalName: 'CaseFolderModule',
  storageKey: 'case_folder_module_v1',
  prefix: 'casefolder',
  panelId: 'md-view-casefolder',
  color: '#8b5cf6',
  icon: '📁',
  listLabel: 'Case Folder (CSBH)',
  searchPlaceholder: 'Tìm CSBH / mã dự án...',
  sheetName: 'Case Folder',
  mapLabel: 'Case Folder',
  fields: CASE_FOLDER_FIELDS,
  sections: CASE_FOLDER_SECTIONS,
  titleKey: 'ten_case',
  subtitleKeys: ['csbh', 'ma_du_an'],
  searchKeys: ['ten_case', 'csbh', 'ma_du_an', 'muc_dich_vay'],
});
CaseFolderModule._normKey = PriceInfoModule._normKey;
CaseFolderModule.lookupByCSBH = function (csbh) {
  if (!csbh) return null;
  const k = this._normKey(csbh);
  return this.state.list.find(r => this._normKey(r.csbh) === k) || null;
};
// Bản ghi khớp CSBH của hồ sơ đang xử lý (Extract LMS), fallback theo mã dự án
CaseFolderModule.getMatched = function () {
  const ex = (typeof AppState !== 'undefined' && AppState.extractedData) || {};
  const tv = ex.thong_tin_vay || {};
  const byCSBH = this.lookupByCSBH(tv['Chính sách bán hàng']);
  if (byCSBH) return byCSBH;
  const maDuAn = tv['Mã dự án vay vốn'] || (ex.tai_san || {})['Mã dự án'] || '';
  if (!maDuAn) return null;
  const k = this._normKey(maDuAn);
  return this.state.list.find(r => this._normKey(r.ma_du_an) === k) || null;
};

document.addEventListener('DOMContentLoaded', () => {
  PriceInfoModule.init();
  CaseFolderModule.init();
});

window.PriceInfoModule = PriceInfoModule;
window.CaseFolderModule = CaseFolderModule;
