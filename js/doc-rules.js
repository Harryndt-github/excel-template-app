/* ============================================
   UC01 - Rule Engine xác định mẫu biểu
   BRD 3.2: Mã DocumentType + quy tắc đặt tên file
   BRD 3.3 (Bảng 2): điều kiện xác định mẫu biểu
   BRD mục 7 (Bảng 9-10): rule chọn bộ Word merge
   ============================================ */

// BRD 3.2 — danh mục mã DocumentType
const DOC_TYPES = [
  { code: 'HDTD',             label: 'Hợp đồng tín dụng' },
  { code: 'HDTC',             label: 'Hợp đồng thế chấp' },
  { code: 'HDUQNSC',          label: 'Hợp đồng ủy quyền nhà sẵn có' },
  { code: 'PNK',              label: 'Phiếu nhập kho' },
  { code: 'TTQLTS_VIN',       label: 'Thỏa thuận quản lý tài sản – Vin' },
  { code: 'TTQLTS_ECOPARK',   label: 'Thỏa thuận quản lý tài sản – Ecopark' },
  { code: 'TTQLTS_MASTERISE', label: 'Thỏa thuận quản lý tài sản – Masterise' },
  { code: 'TTQLTS_EURO',      label: 'Thỏa thuận quản lý tài sản – Eurowindow' },
  { code: 'KUNN',             label: 'Khế ước nhận nợ' },
  { code: 'thuguiKH',         label: 'Thư gửi khách hàng' },
];

// BRD Bảng 10 — trạng thái tài sản hợp lệ cho khoản sơ cấp
const DOC_SOCAP_STATUSES = ['Đặt cọc', 'Ký quỹ', 'HĐMB', 'Nhà có sẵn', 'Nhà đã có sổ', 'Trái phiếu', 'Cổ phiếu'];

const DocRules = {
  STORAGE_KEY: 'uc01_docrules_v1',
  _state: { bindings: {}, overrides: {} }, // bindings: docType → wordTemplateId; overrides: context user chọn tay

  /* ── helpers ── */
  _esc(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  },
  _norm(str) {
    return (str || '')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[đĐ]/g, 'd')
      .toLowerCase().trim().replace(/\s+/g, ' ');
  },
  _toast(msg, type) {
    if (typeof App !== 'undefined' && App.toast) App.toast(msg, type || 'info');
  },

  loadState() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this._state = { bindings: parsed.bindings || {}, overrides: parsed.overrides || {} };
      }
    } catch (e) { /* dùng mặc định */ }
  },
  saveState() {
    try { localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this._state)); } catch (e) { /* quota */ }
  },

  /* ── context: tự nhận diện từ dữ liệu đã import, cho phép override ── */
  _autoContext() {
    const ex = (typeof AppState !== 'undefined' && AppState.extractedData) || {};
    const tv = ex.thong_tin_vay || {};
    const ts = ex.tai_san || {};
    const ctt = ex.tai_san_ctt || {};
    const proj = (typeof ProjectInfoModule !== 'undefined') ? (ProjectInfoModule.getSelectedProject() || {}) : {};

    // HTLS: ưu tiên panel UC02 → panel Ghép dữ liệu
    let loanType = '';
    if (typeof UC02Module !== 'undefined' && UC02Module._state.engine.loanType) loanType = UC02Module._state.engine.loanType;
    else if (typeof Generator !== 'undefined' && Generator._runtimeConditions) loanType = Generator._runtimeConditions.loanType || '';

    // Tách khế ước: KU2 có số tiền giải ngân → nhiều KUNN
    const multiKUNN = String(tv['Số tiền giải ngân (3)'] || '').trim() !== '';

    return {
      trangThaiTaiSan: ts['Trạng thái tài sản'] || ctt['Trạng thái tài sản'] || '',
      phuongThucTraNo: tv['Phương thức trả nợ'] || '',
      hasHTLS: loanType ? loanType === 'HTLS' : '',
      loaiKhoanVay: this._norm(ctt['Trạng thái chuyển nhượng']) === 'y' ? 'thu_cap' : 'so_cap',
      phongToa: '', // không có nguồn dữ liệu — user chọn tay
      mauTTQLTS: proj.mau_thoa_thuan_qlts || '',
      tenCan: tv['Mã căn vay vốn'] || ts['Mã căn'] || '',
      maDuAn: tv['Mã dự án vay vốn'] || ts['Mã dự án'] || proj.ma_du_an || '',
      multiKUNN,
    };
  },
  buildContext() {
    const ctx = this._autoContext();
    const ov = this._state.overrides || {};
    Object.keys(ov).forEach(k => {
      if (ov[k] !== '' && ov[k] !== undefined && ov[k] !== null) {
        ctx[k] = (k === 'hasHTLS' || k === 'multiKUNN') ? ov[k] === true || ov[k] === 'true' : ov[k];
      }
    });
    return ctx;
  },

  /* ── BRD Bảng 2 + mục 7.1: TTQLTS variant theo dự án ── */
  resolveTTQLTS(ctx) {
    const v = this._norm(ctx.mauTTQLTS || '');
    if (!v) return null;
    if (v.includes('vin')) return 'TTQLTS_VIN';
    if (v.includes('eco')) return 'TTQLTS_ECOPARK';
    if (v.includes('mas')) return 'TTQLTS_MASTERISE';
    if (v.includes('euro')) return 'TTQLTS_EURO';
    return null;
  },

  /* ── BRD Bảng 9: biến thể Hợp đồng tín dụng ── */
  hdtdVariant(ctx) {
    const pttn = this._norm(ctx.phuongThucTraNo).includes('nien kim') ? 'niên kim' : 'thông thường';
    if (ctx.hasHTLS === '') return `Trả nợ ${pttn} — chưa rõ HTLS (chạy Rule Engine hoặc chọn tay)`;
    return `Trả nợ ${pttn} — ${ctx.hasHTLS ? 'có HTLS' : 'không HTLS'}`;
  },

  /* ── BRD Bảng 10: biến thể Hồ sơ tài sản ── */
  hoSoTaiSanVariant(ctx) {
    if (ctx.loaiKhoanVay === 'thu_cap') {
      if (!ctx.phongToa) return 'Thứ cấp — chọn Phong tỏa / Không phong tỏa';
      return `Thứ cấp — ${ctx.phongToa === 'phong_toa' ? 'Phong tỏa' : 'Không phong tỏa'}`;
    }
    const st = this._matchSoCapStatus(ctx.trangThaiTaiSan);
    return st ? `Sơ cấp — trạng thái TS: ${st}` : `Sơ cấp — trạng thái TS chưa khớp danh mục (${ctx.trangThaiTaiSan || 'trống'})`;
  },
  _matchSoCapStatus(value) {
    const v = this._norm(value);
    if (!v) return null;
    return DOC_SOCAP_STATUSES.find(s => {
      const n = this._norm(s);
      return v === n || v.includes(n) || n.includes(v);
    }) || null;
  },

  /* ── BRD Bảng 2: xác định danh mục hồ sơ cần soạn ── */
  determineDocuments(ctx) {
    ctx = ctx || this.buildContext();
    const ttqlts = this.resolveTTQLTS(ctx);
    const isNhaCoSan = this._norm(ctx.trangThaiTaiSan).includes(this._norm('Nhà có sẵn'));

    return DOC_TYPES.map(dt => {
      const row = { ...dt, include: false, reason: '', variant: '' };
      switch (dt.code) {
        case 'HDTD':
          row.include = true;
          row.reason = 'Tất cả trường hợp (Bảng 2)';
          row.variant = this.hdtdVariant(ctx);
          break;
        case 'HDTC':
          row.include = true;
          row.reason = 'Tất cả trường hợp (Bảng 2)';
          row.variant = this.hoSoTaiSanVariant(ctx);
          break;
        case 'PNK':
          row.include = true;
          row.reason = 'Tất cả trường hợp (Bảng 2)';
          break;
        case 'thuguiKH':
          row.include = true;
          row.reason = 'Tất cả trường hợp (Bảng 2)';
          row.variant = ctx.hasHTLS === '' ? 'Chưa rõ HTLS' : (ctx.hasHTLS ? 'Khoản vay có HTLS' : 'Khoản vay không HTLS');
          break;
        case 'HDUQNSC':
          row.include = isNhaCoSan;
          row.reason = isNhaCoSan
            ? 'Trạng thái tài sản = "Nhà có sẵn" (Bảng 2)'
            : `Không soạn — Trạng thái tài sản hiện tại: "${ctx.trangThaiTaiSan || 'trống'}"`;
          break;
        case 'TTQLTS_VIN':
        case 'TTQLTS_ECOPARK':
        case 'TTQLTS_MASTERISE':
        case 'TTQLTS_EURO':
          row.include = ttqlts === dt.code;
          row.reason = ttqlts === dt.code
            ? `Mẫu TTQLTS theo dự án "${ctx.maDuAn || ctx.mauTTQLTS}" (Bảng 2 + master data Thỏa thuận QLTS)`
            : (ttqlts ? `Dự án dùng mẫu ${ttqlts}` : 'Chưa xác định mẫu TTQLTS — chọn dự án ở trang Thông tin dự án hoặc override bên trên');
          break;
        case 'KUNN':
          row.include = !!ctx.multiKUNN;
          row.reason = ctx.multiKUNN
            ? 'Khoản vay tách khế ước / nhiều KUNN (BRD 7.1)'
            : 'Không soạn riêng — khoản vay 1 khế ước (KUNN nằm trong bộ HĐTD)';
          break;
      }
      row.fileName = row.include ? this.buildFileName(dt.code, ctx.tenCan) : '';
      return row;
    });
  },

  /* ── BRD 3.2: DocumentType.Tên căn.yyyymmddhhmmss ── */
  buildFileName(docTypeCode, tenCan, d) {
    d = d || new Date();
    const can = String(tenCan || 'NA').replace(/[\\/:*?"<>|]+/g, '').trim() || 'NA';
    const ts = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}` +
               `${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}${String(d.getSeconds()).padStart(2, '0')}`;
    return `${docTypeCode}.${can}.${ts}`;
  },

  // Tra cứu ngược: template Word đã gắn với DocumentType nào → tên file chuẩn BRD
  // (được word-template.js gọi khi xuất DOCX/PDF; trả null = dùng tên mặc định)
  fileNameForTemplate(wordTemplateId) {
    if (!wordTemplateId) return null;
    const code = Object.keys(this._state.bindings).find(c => this._state.bindings[c] === wordTemplateId);
    if (!code) return null;
    const ctx = this.buildContext();
    return this.buildFileName(code, ctx.tenCan);
  },

  /* ── UI ── */
  initPage() {
    this.loadState();
    const container = document.getElementById('uc01-container');
    if (!container) return;
    const ctx = this.buildContext();
    const ov = this._state.overrides || {};
    const auto = this._autoContext();

    const ovSelect = (key, options, label, autoVal) => `
      <div>
        <label style="display:block;margin-bottom:4px;font-size:0.78rem;font-weight:600;color:var(--text-secondary);">${this._esc(label)}</label>
        <select class="mapping-select" onchange="DocRules.onOverride('${key}', this.value)">
          <option value="">Tự nhận diện${autoVal !== '' && autoVal !== undefined ? `: ${this._esc(String(autoVal))}` : ' (chưa có dữ liệu)'}</option>
          ${options.map(o => `<option value="${this._esc(o.value)}" ${String(ov[key] ?? '') === String(o.value) ? 'selected' : ''}>${this._esc(o.label)}</option>`).join('')}
        </select>
      </div>`;

    container.innerHTML = `
      <div style="margin-bottom:16px;padding:14px 18px;border:1px solid rgba(99,102,241,0.18);border-radius:14px;background:rgba(99,102,241,0.04);">
        <div style="font-size:0.9rem;font-weight:700;color:var(--accent,#6366f1);margin-bottom:10px;">📋 Điều kiện nghiệp vụ (tự nhận diện từ Extract LMS — có thể chọn tay để override)</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;">
          ${ovSelect('trangThaiTaiSan',
            DOC_SOCAP_STATUSES.map(s => ({ value: s, label: s })),
            'Trạng thái tài sản', auto.trangThaiTaiSan)}
          ${ovSelect('phuongThucTraNo',
            [{ value: 'Thông thường', label: 'Thông thường' }, { value: 'Niên kim', label: 'Niên kim' }],
            'Phương thức trả nợ', auto.phuongThucTraNo)}
          ${ovSelect('hasHTLS',
            [{ value: 'true', label: 'Có HTLS' }, { value: 'false', label: 'Không HTLS' }],
            'Khoản vay có HTLS', auto.hasHTLS === '' ? '' : (auto.hasHTLS ? 'Có' : 'Không'))}
          ${ovSelect('loaiKhoanVay',
            [{ value: 'so_cap', label: 'Sơ cấp' }, { value: 'thu_cap', label: 'Thứ cấp' }],
            'Loại khoản vay', auto.loaiKhoanVay === 'thu_cap' ? 'Thứ cấp' : 'Sơ cấp')}
          ${ovSelect('phongToa',
            [{ value: 'phong_toa', label: 'Phong tỏa' }, { value: 'khong_phong_toa', label: 'Không phong tỏa' }],
            'Phong tỏa (khoản thứ cấp)', '')}
          ${ovSelect('mauTTQLTS',
            [{ value: 'Vin', label: 'Vin' }, { value: 'Ecopark', label: 'Ecopark' }, { value: 'Masterise', label: 'Masterise' }, { value: 'Eurowindow', label: 'Eurowindow' }],
            'Mẫu TTQLTS của dự án', auto.mauTTQLTS)}
          ${ovSelect('multiKUNN',
            [{ value: 'true', label: 'Có (tách khế ước)' }, { value: 'false', label: 'Không' }],
            'Khoản vay nhiều KUNN', auto.multiKUNN ? 'Có' : 'Không')}
          <div>
            <label style="display:block;margin-bottom:4px;font-size:0.78rem;font-weight:600;color:var(--text-secondary);">Tên căn (đặt tên file)</label>
            <input type="text" class="mapping-select" placeholder="Tự nhận diện: ${this._esc(auto.tenCan || 'trống')}"
              value="${this._esc(ov.tenCan || '')}" oninput="DocRules.onOverride('tenCan', this.value)">
          </div>
        </div>
      </div>
      <div id="uc01-checklist"></div>
    `;
    this.renderChecklist();
  },

  onOverride(key, value) {
    if (value === '' || value === undefined) delete this._state.overrides[key];
    else this._state.overrides[key] = value;
    this.saveState();
    this.renderChecklist();
  },
  onBind(code, tplId) {
    if (tplId) this._state.bindings[code] = tplId;
    else delete this._state.bindings[code];
    this.saveState();
  },

  renderChecklist() {
    const el = document.getElementById('uc01-checklist');
    if (!el) return;
    const docs = this.determineDocuments();
    const wordTpls = (typeof WordState !== 'undefined' && WordState.templates) || [];
    const included = docs.filter(d => d.include);

    const rows = docs.map(d => {
      const binding = this._state.bindings[d.code] || '';
      const tplOptions = `<option value="">-- Chọn Word template --</option>` +
        wordTpls.map(t => `<option value="${this._esc(t.id)}" ${t.id === binding ? 'selected' : ''}>${this._esc(t.name)}</option>`).join('');
      return `
        <tr style="${d.include ? '' : 'opacity:0.45;'}">
          <td style="white-space:nowrap;">
            <span style="display:inline-block;padding:2px 10px;border-radius:999px;font-size:0.72rem;font-weight:700;${d.include
              ? 'background:rgba(16,185,129,0.12);color:#059669;'
              : 'background:rgba(148,163,184,0.15);color:var(--text-muted);'}">${d.include ? 'CẦN SOẠN' : 'KHÔNG'}</span>
          </td>
          <td><b style="font-family:monospace;">${this._esc(d.code)}</b><br><span style="font-size:0.78rem;color:var(--text-secondary);">${this._esc(d.label)}</span></td>
          <td style="font-size:0.78rem;">${this._esc(d.reason)}${d.variant ? `<br><span style="color:var(--accent,#6366f1);font-weight:600;">Mẫu: ${this._esc(d.variant)}</span>` : ''}</td>
          <td>${d.include ? `<select class="mapping-select" onchange="DocRules.onBind('${d.code}', this.value)">${tplOptions}</select>` : '—'}</td>
          <td style="font-family:monospace;font-size:0.75rem;white-space:nowrap;">
            ${d.fileName ? `${this._esc(d.fileName)} <button onclick="DocRules.copyName('${d.code}')" title="Copy tên file" style="border:none;background:transparent;cursor:pointer;">📋</button>` : '—'}
          </td>
          <td>${d.include ? `<button onclick="DocRules.goCompose('${d.code}')" style="padding:5px 12px;border-radius:7px;border:none;background:var(--accent,#6366f1);color:#fff;font-weight:600;cursor:pointer;font-size:0.78rem;font-family:inherit;">Soạn ▸</button>` : ''}</td>
        </tr>`;
    }).join('');

    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
        <span style="font-size:0.85rem;color:var(--text-secondary);">Kết quả Rule Engine: <b style="color:#059669;">${included.length}</b> loại hồ sơ cần soạn — ${included.map(d => d.code).join(', ')}</span>
      </div>
      <table class="mapping-table">
        <thead><tr>
          <th style="width:8%">Trạng thái</th>
          <th style="width:16%">Mẫu biểu</th>
          <th style="width:30%">Điều kiện xác định (BRD Bảng 2, 9, 10)</th>
          <th style="width:20%">Word template gắn kèm</th>
          <th style="width:20%">Tên file chuẩn (BRD 3.2)</th>
          <th style="width:6%"></th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="margin-top:10px;font-size:0.78rem;color:var(--text-muted);">
        💡 Khi đã gắn Word template với mẫu biểu, file xuất DOCX/PDF từ trang "Ghép & Xuất PDF" sẽ tự đặt tên theo
        <b>DocumentType.Tên căn.yyyymmddhhmmss</b>. Tên file hiển thị ở trên dùng thời điểm hiện tại — timestamp thực tế lấy lúc xuất.
      </p>`;
  },

  copyName(code) {
    const ctx = this.buildContext();
    const name = this.buildFileName(code, ctx.tenCan);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(name)
        .then(() => this._toast(`Đã copy: ${name}`, 'success'))
        .catch(() => this._toast('Không copy được — trình duyệt chặn clipboard', 'warning'));
    } else {
      this._toast('Trình duyệt không hỗ trợ clipboard API', 'warning');
    }
  },

  goCompose(code) {
    const tplId = this._state.bindings[code];
    if (!tplId) {
      this._toast('Chọn Word template gắn với mẫu biểu này trước', 'warning');
      return;
    }
    if (typeof WordState !== 'undefined') WordState.selectedTemplateId = tplId;
    if (typeof App !== 'undefined') App.navigateTo('word-generate');
    this._toast(`Soạn ${code} — template đã được chọn sẵn`, 'info');
  },
};

window.DocRules = DocRules;
