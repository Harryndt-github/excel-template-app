/* ============================================================
   PolicyGenerator — Matrix Builder from Historical Rate Data
   Input: New project info + NIM target
   Output: Suggested rate policy matrix (buckets, fees, grace)
   Thuần JavaScript — không LLM, không API
   ============================================================ */

const PolicyGenerator = {

  // ── Phân tích toàn bộ dữ liệu lịch sử từ Rate Center ────────
  analyzeHistorical() {
    const projects = RateCenter.getProjects();
    const allPolicies = [];
    projects.forEach(proj => {
      (proj.packages || []).forEach(pkg => {
        const fields = {};
        (pkg.fields || []).forEach(f => { fields[f.id] = f.value; });
        const buckets = RateRuleEngine.normalizeBuckets(pkg.rateBuckets || [])
          .filter(b => b.rate !== '' && b.rate !== undefined && b.rate !== null)
          .map(b => ({ months: Number(b.maxMonths), rate: parseFloat(b.rate) || 0, margin: parseFloat(b.margin) || 0 }));
        if (!buckets.length) return;
        allPolicies.push({
          projectName: proj.name,
          policyName: pkg.name,
          maxLtv: parseFloat(fields['f_ltv']) || 70,
          maxTermYears: parseFloat(fields['f_max_term']) || 25,
          minTerm: parseFloat(fields['f_min_term']) || 0,
          graceBase: pkg.graceRules?.baseMonths || 0,
          fees: pkg.feeRules || [],
          buckets,
        });
      });
    });
    return allPolicies;
  },

  // ── Tính thống kê rate theo từng bucket month ────────────────
  _calcBucketStats(policies, targetMonths) {
    const rates = [];
    policies.forEach(p => {
      p.buckets.forEach(b => {
        if (b.months === targetMonths && b.rate > 0) rates.push(b.rate);
      });
    });
    if (!rates.length) return null;
    rates.sort((a, b) => a - b);
    const avg = rates.reduce((s, r) => s + r, 0) / rates.length;
    const min = rates[0];
    const max = rates[rates.length - 1];
    const median = rates[Math.floor(rates.length / 2)];
    return { avg: +avg.toFixed(2), min, max, median, count: rates.length };
  },

  // ── Main: Generate policy matrix ─────────────────────────────
  generate(input) {
    const { projectType, developer, legalStatus, targetNIM, costOfFund,
            maxLtv, maxTermMonths, graceMonths, riskLevel } = input;
    const historical = this.analyzeHistorical();

    if (!historical.length) {
      return { error: 'Chưa có dữ liệu lịch sử. Hãy nhập ít nhất 1 chính sách trong tab Lãi suất trước.' };
    }

    // Hệ số điều chỉnh theo rủi ro dự án
    const riskAdj = { 'THAP': -0.3, 'TRUNG_BINH': 0, 'CAO': 0.5 }[riskLevel] || 0;

    // Các bucket chuẩn để đề xuất
    const stdBuckets = [6, 12, 18, 24, 36, 48, 60];
    const suggestedBuckets = [];

    // Lãi suất sàn = chi phí vốn + NIM mục tiêu
    const baseRate = (parseFloat(costOfFund) || 4) + (parseFloat(targetNIM) || 3);

    stdBuckets.forEach((months, idx) => {
      if (months > maxTermMonths) return;
      const stats = this._calcBucketStats(historical, months);

      // Spread tăng dần theo kỳ hạn (đặc trưng ngân hàng VN)
      const termSpread = idx * 0.15;

      let suggestedRate;
      if (stats && stats.count >= 2) {
        // Có đủ dữ liệu: lấy median + điều chỉnh NIM + rủi ro
        const nimDelta = baseRate - stats.median;
        suggestedRate = +(stats.median + nimDelta * 0.5 + riskAdj + termSpread).toFixed(2);
      } else if (stats) {
        suggestedRate = +(stats.avg + riskAdj + termSpread).toFixed(2);
      } else {
        // Không có dữ liệu → dùng công thức
        suggestedRate = +(baseRate + termSpread + riskAdj).toFixed(2);
      }

      // Giới hạn hợp lý
      suggestedRate = Math.max(baseRate - 1, Math.min(suggestedRate, baseRate + 6));

      suggestedBuckets.push({
        months,
        label: `≤ ${months} tháng`,
        suggestedRate,
        margin: +(suggestedRate - (parseFloat(costOfFund) || 4)).toFixed(2),
        nim: +(suggestedRate - (parseFloat(costOfFund) || 4) - (parseFloat(targetNIM) || 3)).toFixed(2),
        stats,
        hasHistory: !!stats,
      });
    });

    // Phí TNTH đề xuất
    const avgFeeInHTLS = this._avgFee(historical, 'inHTLS');
    const avgFeePost60 = this._avgFee(historical, 'afterHTLS_to60');
    const avgFeeFrom61 = this._avgFee(historical, 'from61');

    // Ân hạn gốc đề xuất
    const avgGrace = historical.length
      ? Math.round(historical.reduce((s, p) => s + p.graceBase, 0) / historical.length)
      : 0;
    const suggestedGrace = graceMonths !== '' ? parseInt(graceMonths) : avgGrace;

    // NIM tổng thể dự kiến
    const avgSugRate = suggestedBuckets.length
      ? suggestedBuckets.reduce((s, b) => s + b.suggestedRate, 0) / suggestedBuckets.length
      : baseRate;
    const estimatedNIM = +(avgSugRate - (parseFloat(costOfFund) || 4)).toFixed(2);

    return {
      input,
      historical,
      suggestedBuckets,
      suggestedFees: { inHTLS: avgFeeInHTLS, afterHTLS_to60: avgFeePost60, from61: avgFeeFrom61 },
      suggestedGrace,
      estimatedNIM,
      baseRate: +baseRate.toFixed(2),
      historyCount: historical.length,
    };
  },

  _avgFee(policies, phase) {
    const fees = [];
    policies.forEach(p => {
      const rule = (p.fees || []).find(f => f.phase === phase);
      if (rule && rule.fee !== '' && rule.fee !== undefined) fees.push(parseFloat(rule.fee) || 0);
    });
    if (!fees.length) return '';
    return +(fees.reduce((s, f) => s + f, 0) / fees.length).toFixed(2);
  },

  // ── Áp dụng chính sách vào Rate Center ──────────────────────
  applyToRateCenter(result, projectId) {
    const { input, suggestedBuckets, suggestedFees, suggestedGrace } = result;
    const proj = RateCenterState.projects.find(p => p.id === projectId);
    if (!proj) return false;

    const newPkg = {
      id: _rcId(),
      name: input.policyName || `CS - ${input.projectType} (Đề xuất)`,
      color: '#10b981',
      fields: RC_DEFAULT_FIELDS.map(f => {
        const fd = { ...f, value: '' };
        if (f.id === 'f_policy_name') fd.value = fd.name = input.policyName || '';
        if (f.id === 'f_ltv') fd.value = String(input.maxLtv || '');
        if (f.id === 'f_max_term') fd.value = String(Math.round((input.maxTermMonths || 300) / 12));
        return fd;
      }),
      rateBuckets: suggestedBuckets.map(b => ({
        id: _rcId(), maxMonths: b.months,
        label: b.label, rate: String(b.suggestedRate), margin: String(b.margin), note: '',
      })),
      feeRules: [
        { id: _rcId(), phase: 'inHTLS',         label: 'Trong HTLS',        fee: String(suggestedFees.inHTLS || '') },
        { id: _rcId(), phase: 'afterHTLS_to60', label: 'Sau HTLS đến T60', fee: String(suggestedFees.afterHTLS_to60 || '') },
        { id: _rcId(), phase: 'from61',         label: 'Từ T61 trở đi',    fee: String(suggestedFees.from61 || '') },
      ],
      graceRules: { ...RC_DEFAULT_GRACE_RULES, baseMonths: suggestedGrace },
      projectExceptions: [], eligibilityConditions: [], tiers: [], conditions: [], customFields: [],
    };

    if (!proj.packages) proj.packages = [];
    proj.packages.push(newPkg);
    RateCenter.save();
    return newPkg.id;
  },
};

// ── UI Controller ─────────────────────────────────────────────
const PolicyGeneratorUI = {

  _lastResult: null,

  render() {
    const el = document.getElementById('pa-main');
    if (!el) return;
    el.innerHTML = this._buildFormHTML();
  },

  _buildFormHTML() {
    const projects = RateCenter.getProjects();
    const projectOptions = projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('');

    return `
<div class="pa-layout">
  <div class="pa-form-panel">
    <div class="pa-form-header">
      <div class="pa-form-icon">🏗️</div>
      <div>
        <div class="pa-form-title">Tạo Ma trận Chính sách Lãi suất</div>
        <div class="pa-form-sub">Phân tích dữ liệu lịch sử → Đề xuất bảng lãi suất cho dự án mới</div>
      </div>
    </div>

    <div class="pa-section-label">📌 Thông tin dự án mới</div>
    <div class="pa-field">
      <label>Tên chính sách muốn tạo</label>
      <input type="text" id="pg-policy-name" class="pa-input" placeholder="VD: CS Vinhomes - Ưu đãi 2025">
    </div>
    <div class="pa-grid-2">
      <div class="pa-field">
        <label>Loại dự án</label>
        <select id="pg-project-type" class="pa-input">
          <option value="nha_o">Nhà ở / Chung cư</option>
          <option value="lien_ke">Liền kề / Biệt thự</option>
          <option value="dat_nen">Đất nền</option>
          <option value="thuong_mai">Thương mại / Officetel</option>
          <option value="nghi_duong">Nghỉ dưỡng</option>
        </select>
      </div>
      <div class="pa-field">
        <label>Tình trạng pháp lý</label>
        <select id="pg-legal" class="pa-input">
          <option value="co_so_do">Có sổ đỏ / đủ pháp lý</option>
          <option value="dang_lam">Đang hoàn thiện pháp lý</option>
          <option value="hinh_thanh">Hình thành trong tương lai</option>
        </select>
      </div>
      <div class="pa-field">
        <label>Mức độ rủi ro dự án</label>
        <select id="pg-risk" class="pa-input">
          <option value="THAP">Thấp — Chủ đầu tư lớn, pháp lý rõ</option>
          <option value="TRUNG_BINH" selected>Trung bình</option>
          <option value="CAO">Cao — Hình thành tương lai</option>
        </select>
      </div>
      <div class="pa-field">
        <label>LTV tối đa (%)</label>
        <input type="number" id="pg-ltv" class="pa-input" value="70" min="30" max="100">
      </div>
    </div>

    <div class="pa-section-label">🏦 Mục tiêu lợi nhuận ngân hàng</div>
    <div class="pa-grid-2">
      <div class="pa-field">
        <label>Chi phí vốn huy động (%/năm)</label>
        <input type="number" id="pg-cof" class="pa-input" value="4.5" step="0.1">
      </div>
      <div class="pa-field">
        <label>NIM mục tiêu (%/năm)</label>
        <input type="number" id="pg-nim" class="pa-input" value="3.0" step="0.1">
      </div>
      <div class="pa-field">
        <label>Kỳ hạn tối đa (tháng)</label>
        <input type="number" id="pg-max-term" class="pa-input" value="300" min="12" max="360">
      </div>
      <div class="pa-field">
        <label>Ân hạn gốc đề xuất (tháng)</label>
        <input type="number" id="pg-grace" class="pa-input" value="" placeholder="Để trống = tự tính">
      </div>
    </div>

    <div class="pa-section-label">📁 Áp dụng vào dự án (tuỳ chọn)</div>
    <div class="pa-field">
      <label>Dự án trong Rate Center</label>
      <select id="pg-rc-project" class="pa-input">
        <option value="">-- Chọn để áp dụng sau --</option>
        ${projectOptions}
      </select>
    </div>

    <button class="pa-btn-run" onclick="PolicyGeneratorUI.run()">
      ⚡ Phân tích &amp; Tạo ma trận lãi suất
    </button>
  </div>

  <div class="pa-result-panel" id="pa-results">
    <div class="pa-result-placeholder">
      <div class="pa-result-ph-icon">📊</div>
      <div class="pa-result-ph-text">Nhập thông tin dự án mới và nhấn <b>Phân tích</b><br>để hệ thống tạo bảng lãi suất đề xuất từ dữ liệu lịch sử</div>
    </div>
  </div>
</div>`;
  },

  run() {
    const input = {
      policyName:    document.getElementById('pg-policy-name')?.value || '',
      projectType:   document.getElementById('pg-project-type')?.value || 'nha_o',
      legalStatus:   document.getElementById('pg-legal')?.value || 'co_so_do',
      riskLevel:     document.getElementById('pg-risk')?.value || 'TRUNG_BINH',
      maxLtv:        parseFloat(document.getElementById('pg-ltv')?.value) || 70,
      costOfFund:    parseFloat(document.getElementById('pg-cof')?.value) || 4.5,
      targetNIM:     parseFloat(document.getElementById('pg-nim')?.value) || 3.0,
      maxTermMonths: parseInt(document.getElementById('pg-max-term')?.value) || 300,
      graceMonths:   document.getElementById('pg-grace')?.value || '',
      rcProjectId:   document.getElementById('pg-rc-project')?.value || '',
    };

    const result = PolicyGenerator.generate(input);
    this._lastResult = result;
    this._renderResult(result);
  },

  _renderResult(result) {
    const el = document.getElementById('pa-results');
    if (!el) return;

    if (result.error) {
      el.innerHTML = `<div class="pa-alert pa-alert-warn">⚠️ ${result.error}</div>`;
      return;
    }

    const { suggestedBuckets, suggestedFees, suggestedGrace, estimatedNIM, baseRate, historyCount, input } = result;
    const nimColor = estimatedNIM >= (input.targetNIM || 3) ? '#10b981' : '#f59e0b';

    let html = `
<div class="pg-header-strip">
  <div class="pg-kpi">
    <div class="pg-kpi-val" style="color:#6366f1">${baseRate}%</div>
    <div class="pg-kpi-label">Lãi suất sàn (COF+NIM)</div>
  </div>
  <div class="pg-kpi">
    <div class="pg-kpi-val" style="color:${nimColor}">${estimatedNIM}%</div>
    <div class="pg-kpi-label">NIM bình quân ước tính</div>
  </div>
  <div class="pg-kpi">
    <div class="pg-kpi-val" style="color:#8b5cf6">${historyCount}</div>
    <div class="pg-kpi-label">Chính sách tham chiếu</div>
  </div>
  <div class="pg-kpi">
    <div class="pg-kpi-val" style="color:#06b6d4">${suggestedGrace}T</div>
    <div class="pg-kpi-label">Ân hạn gốc đề xuất</div>
  </div>
</div>

<div class="pg-section-title">📈 Bảng Lãi Suất Đề Xuất</div>
<div class="pa-alert" style="background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.2);color:#a5b4fc;font-size:0.72rem;margin-bottom:10px;">
  💡 Dựa trên phân tích ${historyCount} chính sách lịch sử · Lãi suất được tính: Median thị trường + điều chỉnh NIM mục tiêu + hệ số rủi ro dự án
</div>
<table class="pg-table">
  <thead>
    <tr>
      <th>Bucket kỳ hạn</th>
      <th>Lãi suất đề xuất</th>
      <th>Biên độ (Spread)</th>
      <th>Thị trường (min~max)</th>
      <th>Số liệu tham chiếu</th>
    </tr>
  </thead>
  <tbody>`;

    suggestedBuckets.forEach(b => {
      const mktRange = b.stats
        ? `${b.stats.min}% ~ ${b.stats.max}%`
        : '<span style="color:#6b7280">Chưa có dữ liệu</span>';
      const refCount = b.stats ? `${b.stats.count} CS (median ${b.stats.median}%)` : '—';
      const srcTag = b.hasHistory
        ? `<span class="pg-tag pg-tag-blue">Từ lịch sử</span>`
        : `<span class="pg-tag pg-tag-gray">Công thức</span>`;

      html += `
<tr>
  <td><b>${b.label}</b></td>
  <td><span class="pg-rate-cell">${b.suggestedRate}%</span>/năm</td>
  <td><span style="color:#10b981">${b.margin}%</span></td>
  <td>${mktRange} ${srcTag}</td>
  <td style="color:#6b7280;font-size:0.72rem">${refCount}</td>
</tr>`;
    });

    html += `</tbody></table>

<div class="pg-section-title" style="margin-top:18px">💼 Phí TNTH Đề Xuất</div>
<div class="pg-fee-row">
  <div class="pg-fee-item"><span class="pg-fee-label">Trong HTLS</span><span class="pg-fee-val">${suggestedFees.inHTLS || '—'}%</span></div>
  <div class="pg-fee-item"><span class="pg-fee-label">Sau HTLS → T60</span><span class="pg-fee-val">${suggestedFees.afterHTLS_to60 || '—'}%</span></div>
  <div class="pg-fee-item"><span class="pg-fee-label">Từ T61 trở đi</span><span class="pg-fee-val">${suggestedFees.from61 || '—'}%</span></div>
</div>`;

    if (historyCount > 0) {
      html += `
<div class="pg-section-title" style="margin-top:18px">📚 Chính sách lịch sử tham chiếu</div>
<div class="pg-history-list">`;
      result.historical.slice(0, 6).forEach(p => {
        const rates = p.buckets.map(b => `${b.months}T:${b.rate}%`).join(' | ');
        html += `<div class="pg-history-item"><span class="pg-history-name">${p.policyName}</span><span class="pg-history-proj">${p.projectName}</span><span class="pg-history-rates">${rates}</span></div>`;
      });
      html += `</div>`;
    }

    html += `
<div class="pg-apply-bar">
  <div class="pg-apply-info">Chính sách đề xuất sẵn sàng · Có thể áp dụng ngay vào Rate Center</div>
  <button class="pg-btn-apply" onclick="PolicyGeneratorUI.apply()">
    ✅ Tạo chính sách này trong Rate Center
  </button>
</div>`;

    el.innerHTML = html;
  },

  apply() {
    if (!this._lastResult) return;
    const projectId = document.getElementById('pg-rc-project')?.value;
    if (!projectId) {
      if (typeof App !== 'undefined') App.toast('Vui lòng chọn dự án để áp dụng', 'warning');
      return;
    }
    const pkgId = PolicyGenerator.applyToRateCenter(this._lastResult, projectId);
    if (pkgId) {
      if (typeof App !== 'undefined') App.toast('Đã tạo chính sách thành công! Xem tại tab Lãi suất.', 'success');
      RateCenter.render();
    }
  },
};

// Alias để master-data.js gọi được
const PolicyAdvisorUI = PolicyGeneratorUI;
