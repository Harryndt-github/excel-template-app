/* ============================================
   Lịch trả nợ chi tiết (BRD 3.5.1)
   + Niên kim / annuity (BRD 3.5.4)
   - RepaymentEngine: tính toán thuần (PMT, lịch từng kỳ,
     lãi suất 2 giai đoạn GĐ1 cố định / GĐ2 thả nổi, ân hạn gốc)
   - RepaymentModule: trang UI, prefill từ Extract LMS + Rule Engine,
     xuất Excel, đẩy kết quả vào mapping derived
   Quy ước lãi: lãi tháng = dư nợ đầu kỳ × lãi suất năm / 12.
   ============================================ */

const RepaymentEngine = {
  /* PMT niên kim: P*r(1+r)^n / ((1+r)^n - 1); r = lãi suất tháng */
  pmt(principal, annualRatePct, nMonths) {
    const P = Number(principal) || 0;
    const n = Math.max(1, Math.round(Number(nMonths) || 0));
    const r = (Number(annualRatePct) || 0) / 100 / 12;
    if (P <= 0) return 0;
    if (r === 0) return P / n;
    const f = Math.pow(1 + r, n);
    return P * r * f / (f - 1);
  },

  /**
   * Lịch trả nợ chi tiết từng kỳ (tháng).
   * opts: {
   *   loanAmount, termMonths,
   *   method: 'declining' | 'annuity',
   *   graceMonths,          — ân hạn gốc: chỉ trả lãi, không trả gốc
   *   rate1, rate1Months,   — lãi suất GĐ1 (%/năm) áp dụng đến hết tháng rate1Months
   *   rate2,                — lãi suất GĐ2 (%/năm); trống → dùng rate1 đến hết
   *   startDate,            — ngày giải ngân (Date|string) để tính ngày trả từng kỳ
   * }
   * → { rows: [{ky, ngayTra, laiSuat, duNoDau, goc, lai, tong, duNoCuoi}], summary }
   */
  buildSchedule(opts) {
    const P = Number(opts.loanAmount) || 0;
    const term = Math.round(Number(opts.termMonths) || 0);
    const grace = Math.max(0, Math.min(Math.round(Number(opts.graceMonths) || 0), term - 1));
    const method = opts.method === 'annuity' ? 'annuity' : 'declining';
    const rate1 = Number(opts.rate1) || 0;
    const rate1Months = Math.max(0, Math.round(Number(opts.rate1Months) || 0));
    const rate2 = (opts.rate2 === '' || opts.rate2 === undefined || opts.rate2 === null)
      ? null : Number(opts.rate2);
    if (P <= 0 || term <= 0) return { rows: [], summary: null, error: 'Thiếu số tiền vay hoặc kỳ hạn' };

    const start = opts.startDate ? new Date(opts.startDate) : null;
    const payDate = (ky) => {
      if (!start || isNaN(start)) return '';
      const d = new Date(start);
      const day = d.getDate();
      d.setDate(1);
      d.setMonth(d.getMonth() + ky);
      const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      d.setDate(Math.min(day, last));
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    };
    const rateAt = (ky) => (rate1Months > 0 && ky > rate1Months && rate2 !== null) ? rate2 : rate1;

    const rows = [];
    let balance = P;
    let totalInterest = 0;
    const repayMonths = term - grace;            // số kỳ trả gốc
    const decliningPrincipal = P / repayMonths;  // gốc đều mỗi kỳ (dư nợ giảm dần)
    let annuityPMT = 0;                          // PMT hiện hành (tính lại khi đổi giai đoạn / hết ân hạn)
    let pmtGd1 = 0, pmtGd2 = 0;

    for (let ky = 1; ky <= term; ky++) {
      const rate = rateAt(ky);
      const monthlyRate = rate / 100 / 12;
      const interest = balance * monthlyRate;
      let principalPay = 0;

      if (ky > grace) {
        if (method === 'declining') {
          principalPay = decliningPrincipal;
        } else {
          // Niên kim: tính lại PMT khi vào kỳ trả gốc đầu tiên hoặc khi lãi suất đổi giai đoạn
          const isFirstRepay = ky === grace + 1;
          const isRateSwitch = rate1Months > 0 && ky === rate1Months + 1 && rate2 !== null;
          if (isFirstRepay || isRateSwitch) {
            const remaining = term - ky + 1;
            annuityPMT = this.pmt(balance, rate, remaining);
            if (isFirstRepay) pmtGd1 = annuityPMT;
            if (isRateSwitch) pmtGd2 = annuityPMT;
          }
          principalPay = annuityPMT - interest;
        }
        // Kỳ cuối: trả nốt dư nợ còn lại (xử lý sai số làm tròn)
        if (ky === term || principalPay > balance) principalPay = balance;
      }

      const newBalance = balance - principalPay;
      rows.push({
        ky,
        ngayTra: payDate(ky),
        laiSuat: rate,
        duNoDau: Math.round(balance),
        goc: Math.round(principalPay),
        lai: Math.round(interest),
        tong: Math.round(principalPay + interest),
        duNoCuoi: Math.round(newBalance),
      });
      totalInterest += interest;
      balance = newBalance;
    }

    const lastRow = rows[rows.length - 1];
    const firstRepayRow = rows[grace] || lastRow;
    const summary = {
      method,
      soKyTraGoc: repayMonths,
      graceMonths: grace,
      // Niên kim: PMT từng giai đoạn; dư nợ giảm dần: gốc đều + tổng trả kỳ đầu
      pmtGd1: Math.round(method === 'annuity' ? pmtGd1 : 0),
      pmtGd2: Math.round(method === 'annuity' ? pmtGd2 : 0),
      gocMoiKy: Math.round(method === 'declining' ? decliningPrincipal : 0),
      traKyDau: firstRepayRow.tong,
      traKyCuoi: lastRow.tong,
      tongLai: Math.round(totalInterest),
      tongTra: Math.round(P + totalInterest),
    };
    return { rows, summary };
  },
};

const RepaymentModule = {
  STORAGE_KEY: 'repayment_module_v1',
  _inputs: {},
  _result: null,

  _esc(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  },
  _num(v) {
    if (v === null || v === undefined || v === '') return NaN;
    if (typeof v === 'number') return v;
    let s = String(v).replace(/[%\s,]/g, '').replace(/(%\/năm|\/năm)/g, '');
    const dots = (s.match(/\./g) || []).length;
    if (dots > 1) s = s.replace(/\./g, '');
    const n = parseFloat(s);
    return isNaN(n) ? NaN : n;
  },
  _fmt(n) { return isNaN(n) ? '' : new Intl.NumberFormat('vi-VN').format(Math.round(n)); },
  _toast(msg, type) { if (typeof App !== 'undefined' && App.toast) App.toast(msg, type || 'info'); },

  loadState() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) this._inputs = JSON.parse(raw) || {};
    } catch (e) { /* mặc định */ }
  },
  saveState() {
    try { localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this._inputs)); } catch (e) { /* quota */ }
  },

  _getDerived() {
    const gen = (typeof Generator !== 'undefined' && Generator._runtimeDerivedData) || {};
    const uc02 = (typeof UC02Module !== 'undefined' && UC02Module._derived) || {};
    return Object.assign({}, gen, uc02);
  },

  /* Prefill từ Extract LMS + Rule Engine; override bằng giá trị user đã nhập */
  _autoInputs() {
    const ex = (typeof AppState !== 'undefined' && AppState.extractedData) || {};
    const tv = ex.thong_tin_vay || {};
    const d = this._getDerived();
    const pttn = String(tv['Phương thức trả nợ'] || '').toLowerCase();
    return {
      loanAmount: this._num(tv['Tổng số tiền vay']) || this._num(tv['Số tiền giải ngân']) || '',
      termMonths: this._num(tv['Thời hạn vay']) || this._num(tv['Thời gian vay']) || '',
      method: pttn.includes('niên kim') || pttn.includes('nien kim') ? 'annuity' : 'declining',
      graceMonths: this._num(d['Ân hạn gốc áp dụng']) || this._num(tv['Thời gian ân hạn gốc']) || 0,
      rate1: this._num(d['Lãi suất cố định']) || this._num(tv['Lãi suất cố định']) || '',
      rate1Months: this._num(d['Tháng chặn HTLS']) || this._num(tv['Tháng chặn HTLS']) || '',
      rate2: this._num(d['Lãi suất giai đoạn 2']) || '',
      startDate: (typeof UC02Module !== 'undefined' && UC02Module._state.engine.gnDate) || '',
    };
  },
  _effectiveInputs() {
    const auto = this._autoInputs();
    const out = { ...auto };
    Object.keys(this._inputs).forEach(k => {
      const v = this._inputs[k];
      if (v !== '' && v !== undefined && v !== null) out[k] = v;
    });
    return out;
  },

  initPage() {
    this.loadState();
    const container = document.getElementById('repayment-container');
    if (!container) return;
    const eff = this._effectiveInputs();
    const input = (key, label, placeholder, type) => `
      <div>
        <label style="display:block;margin-bottom:4px;font-size:0.78rem;font-weight:600;color:var(--text-secondary);">${this._esc(label)}</label>
        <input type="${type || 'text'}" class="mapping-select" id="rp-${key}" placeholder="${this._esc(placeholder || '')}"
          value="${this._esc(eff[key] ?? '')}" oninput="RepaymentModule.onInput('${key}', this.value)">
      </div>`;

    container.innerHTML = `
      <div style="margin-bottom:16px;padding:14px 18px;border:1px solid rgba(14,165,233,0.22);border-radius:14px;background:rgba(14,165,233,0.04);">
        <div style="font-size:0.9rem;font-weight:700;color:#0ea5e9;margin-bottom:10px;">
          📅 Tham số tính lịch trả nợ <span style="font-weight:400;font-size:0.76rem;color:var(--text-muted);">(tự lấy từ Extract LMS + Rule Engine — sửa tay nếu cần)</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px;">
          ${input('loanAmount', 'Số tiền nhận nợ (đ)', 'VD: 2000000000')}
          ${input('termMonths', 'Kỳ hạn vay (tháng)', 'VD: 240', 'number')}
          <div>
            <label style="display:block;margin-bottom:4px;font-size:0.78rem;font-weight:600;color:var(--text-secondary);">Phương thức trả nợ</label>
            <select class="mapping-select" id="rp-method" onchange="RepaymentModule.onInput('method', this.value)">
              <option value="declining" ${eff.method !== 'annuity' ? 'selected' : ''}>Thông thường (gốc đều, dư nợ giảm dần)</option>
              <option value="annuity" ${eff.method === 'annuity' ? 'selected' : ''}>Niên kim (gốc + lãi đều nhau)</option>
            </select>
          </div>
          ${input('graceMonths', 'Ân hạn gốc (tháng)', '0', 'number')}
          ${input('rate1', 'Lãi suất GĐ1 (%/năm)', 'VD: 10.85')}
          ${input('rate1Months', 'Số tháng áp dụng GĐ1', 'VD: 24 (= thời gian CĐLS)', 'number')}
          ${input('rate2', 'Lãi suất GĐ2 (%/năm)', 'Trống = dùng GĐ1 đến hết')}
          ${input('startDate', 'Ngày giải ngân', '', 'date')}
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px;">
          <button onclick="RepaymentModule.calculate()" style="padding:8px 18px;border-radius:8px;border:none;background:#0ea5e9;color:#fff;font-weight:700;cursor:pointer;font-size:0.85rem;font-family:inherit;">▶ Tính lịch trả nợ</button>
          <button onclick="RepaymentModule.exportXLSX()" style="padding:8px 16px;border-radius:8px;border:1px solid rgba(14,165,233,0.4);background:transparent;color:#0ea5e9;font-weight:600;cursor:pointer;font-size:0.85rem;font-family:inherit;">📤 Xuất Excel</button>
          <button onclick="RepaymentModule.pushToMapping()" title="Đưa Số tiền niên kim / trả mỗi kỳ / kỳ cuối vào nguồn Rule Engine cho UC02 & Word mapping"
            style="padding:8px 16px;border-radius:8px;border:1px solid rgba(16,185,129,0.4);background:transparent;color:#059669;font-weight:600;cursor:pointer;font-size:0.85rem;font-family:inherit;">⚙️ Đẩy vào mapping</button>
        </div>
      </div>
      <div id="rp-summary"></div>
      <div id="rp-table" style="max-height:520px;overflow-y:auto;"></div>
    `;
    if (this._result) { this._renderSummary(); this._renderTable(); }
  },

  onInput(key, value) {
    this._inputs[key] = value;
    this.saveState();
  },

  calculate() {
    const eff = this._effectiveInputs();
    const opts = {
      loanAmount: this._num(eff.loanAmount),
      termMonths: this._num(eff.termMonths),
      method: eff.method,
      graceMonths: this._num(eff.graceMonths) || 0,
      rate1: this._num(eff.rate1) || 0,
      rate1Months: this._num(eff.rate1Months) || 0,
      rate2: eff.rate2 === '' || eff.rate2 === undefined ? '' : this._num(eff.rate2),
      startDate: eff.startDate,
    };
    if (isNaN(opts.loanAmount) || opts.loanAmount <= 0 || isNaN(opts.termMonths) || opts.termMonths <= 0) {
      this._toast('Nhập số tiền nhận nợ và kỳ hạn vay trước', 'warning');
      return;
    }
    if (opts.graceMonths >= opts.termMonths) {
      this._toast('Ân hạn gốc phải nhỏ hơn kỳ hạn vay', 'warning');
      return;
    }
    this._result = RepaymentEngine.buildSchedule(opts);
    if (this._result.error) { this._toast(this._result.error, 'error'); return; }
    this._renderSummary();
    this._renderTable();
    this.pushToMapping(true);
    this._toast(`Đã tính lịch trả nợ ${opts.termMonths} kỳ (${opts.method === 'annuity' ? 'niên kim' : 'gốc đều'})`, 'success');
  },

  _renderSummary() {
    const el = document.getElementById('rp-summary');
    if (!el || !this._result || !this._result.summary) return;
    const s = this._result.summary;
    const chip = (label, val) => val
      ? `<div style="padding:10px 14px;border-radius:10px;background:rgba(14,165,233,0.07);border:1px solid rgba(14,165,233,0.15);">
           <div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:2px;">${this._esc(label)}</div>
           <div style="font-size:0.95rem;font-weight:700;color:var(--text-primary);">${this._esc(val)}</div>
         </div>` : '';
    el.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin-bottom:14px;">
        ${chip('Phương thức', s.method === 'annuity' ? 'Niên kim' : 'Gốc đều (dư nợ giảm dần)')}
        ${chip('Số kỳ trả gốc', s.soKyTraGoc + ' kỳ' + (s.graceMonths ? ` (ân hạn ${s.graceMonths} tháng)` : ''))}
        ${s.method === 'annuity' ? chip('Số tiền niên kim GĐ1', this._fmt(s.pmtGd1) + ' đ/kỳ') : chip('Gốc trả mỗi kỳ', this._fmt(s.gocMoiKy) + ' đ/kỳ')}
        ${s.method === 'annuity' && s.pmtGd2 ? chip('Số tiền niên kim GĐ2', this._fmt(s.pmtGd2) + ' đ/kỳ') : ''}
        ${chip('Trả kỳ đầu (sau ân hạn)', this._fmt(s.traKyDau) + ' đ')}
        ${chip('Trả kỳ cuối', this._fmt(s.traKyCuoi) + ' đ')}
        ${chip('Tổng lãi dự kiến', this._fmt(s.tongLai) + ' đ')}
        ${chip('Tổng gốc + lãi', this._fmt(s.tongTra) + ' đ')}
      </div>`;
  },

  _renderTable() {
    const el = document.getElementById('rp-table');
    if (!el || !this._result) return;
    const rows = this._result.rows;
    el.innerHTML = `
      <table class="mapping-table">
        <thead><tr>
          <th>Kỳ</th><th>Ngày trả</th><th>LS (%/năm)</th><th>Dư nợ đầu kỳ</th>
          <th>Gốc</th><th>Lãi</th><th>Tổng trả</th><th>Dư nợ cuối kỳ</th>
        </tr></thead>
        <tbody>
          ${rows.map(r => `
            <tr style="font-size:0.8rem;${r.goc === 0 ? 'opacity:0.65;' : ''}">
              <td>${r.ky}</td>
              <td style="white-space:nowrap;">${this._esc(r.ngayTra)}</td>
              <td>${r.laiSuat}</td>
              <td style="text-align:right;">${this._fmt(r.duNoDau)}</td>
              <td style="text-align:right;">${this._fmt(r.goc)}</td>
              <td style="text-align:right;">${this._fmt(r.lai)}</td>
              <td style="text-align:right;font-weight:600;">${this._fmt(r.tong)}</td>
              <td style="text-align:right;">${this._fmt(r.duNoCuoi)}</td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  },

  /* Đẩy kết quả vào Generator._runtimeDerivedData → dùng được ở UC02 (derived::) và Word mapping */
  pushToMapping(silent) {
    if (!this._result || !this._result.summary) {
      if (!silent) this._toast('Tính lịch trả nợ trước', 'warning');
      return;
    }
    const s = this._result.summary;
    const derived = {
      'Số tiền niên kim': s.method === 'annuity' ? s.pmtGd1 : '',
      'Số tiền niên kim GĐ2': s.method === 'annuity' ? s.pmtGd2 : '',
      'Số tiền trả mỗi kỳ': s.method === 'annuity' ? s.pmtGd1 : s.gocMoiKy,
      'Số tiền trả kỳ đầu': s.traKyDau,
      'Số tiền trả kỳ cuối': s.traKyCuoi,
      'Số kỳ trả nợ gốc (lịch)': s.soKyTraGoc,
      'Tổng lãi dự kiến': s.tongLai,
      'Tổng gốc và lãi dự kiến': s.tongTra,
    };
    if (typeof Generator !== 'undefined') {
      Generator._runtimeDerivedData = Object.assign({}, Generator._runtimeDerivedData || {}, derived);
    }
    if (typeof UC02Module !== 'undefined') UC02Module._optionsCache = null;
    if (!silent) this._toast('Đã đẩy kết quả lịch trả nợ vào nguồn ⚙️ Rule Engine (mapping UC02/Word)', 'success');
  },

  exportXLSX() {
    if (typeof XLSX === 'undefined') { this._toast('Thư viện XLSX chưa load', 'error'); return; }
    if (!this._result || !this._result.rows.length) { this._toast('Tính lịch trả nợ trước', 'warning'); return; }
    const s = this._result.summary;
    const header = ['Kỳ', 'Ngày trả', 'Lãi suất (%/năm)', 'Dư nợ đầu kỳ', 'Gốc', 'Lãi', 'Tổng trả', 'Dư nợ cuối kỳ'];
    const aoa = [header, ...this._result.rows.map(r => [r.ky, r.ngayTra, r.laiSuat, r.duNoDau, r.goc, r.lai, r.tong, r.duNoCuoi])];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [{ wch: 6 }, { wch: 12 }, { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, ws, 'LichTraNo');
    const wsSum = XLSX.utils.aoa_to_sheet([
      ['Phương thức', s.method === 'annuity' ? 'Niên kim' : 'Gốc đều (dư nợ giảm dần)'],
      ['Số kỳ trả gốc', s.soKyTraGoc],
      ['Ân hạn gốc (tháng)', s.graceMonths],
      ['Số tiền niên kim GĐ1', s.pmtGd1 || ''],
      ['Số tiền niên kim GĐ2', s.pmtGd2 || ''],
      ['Gốc trả mỗi kỳ', s.gocMoiKy || ''],
      ['Trả kỳ đầu (sau ân hạn)', s.traKyDau],
      ['Trả kỳ cuối', s.traKyCuoi],
      ['Tổng lãi dự kiến', s.tongLai],
      ['Tổng gốc + lãi', s.tongTra],
    ]);
    wsSum['!cols'] = [{ wch: 28 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsSum, 'TomTat');
    const d = new Date();
    const ts = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}${String(d.getSeconds()).padStart(2, '0')}`;
    XLSX.writeFile(wb, `LICHTRANO.${ts}.xlsx`);
    this._toast('Đã xuất lịch trả nợ', 'success');
  },
};

window.RepaymentEngine = RepaymentEngine;
window.RepaymentModule = RepaymentModule;
