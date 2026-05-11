/* ============================================================
   PolicyRanker — Xếp hạng Top-5 chính sách tối ưu
   Input: 6 tham số hồ sơ khách hàng
   Output: Top-5 chính sách xếp hạng theo NIM / Rủi ro / Kỳ hạn / LTV
   Thuần JavaScript — không LLM, không API
   ============================================================ */

const PolicyRanker = {
  // Trọng số scoring (tổng = 100)
  WEIGHTS: {
    nim:        30,  // NIM thực tế so với mục tiêu
    termFit:    25,  // Kỳ hạn phù hợp
    ltvFit:     20,  // LTV nằm trong giới hạn
    projectFit: 15,  // Loại dự án phù hợp
    grace:      10,  // Ân hạn gốc
  },

  PROJECT_TYPE_MAP: {
    'nha_o':     ['nhà ở','chung cư','căn hộ'],
    'lien_ke':   ['liền kề','biệt thự','townhouse'],
    'dat_nen':   ['đất nền','đất'],
    'thuong_mai':['thương mại','officetel','shophouse'],
    'nghi_duong':['nghỉ dưỡng','resort','condotel'],
  },

  /**
   * Xếp hạng tất cả chính sách từ Rate Center theo 6 tham số đầu vào.
   * @returns { top5: Array, allScored: Array, input }
   */
  rank(input) {
    const { loanTermMonths, ltv, projectType, purpose, targetNIM, costOfFund, riskLevel, customerRank } = input;
    const projects = (typeof RateCenter !== 'undefined') ? RateCenter.getProjects() : [];
    const candidates = [];

    projects.forEach(proj => {
      (proj.packages || []).forEach(pkg => {
        const fields = {};
        (pkg.fields || []).forEach(f => { fields[f.id] = f.value; });

        const buckets = (typeof RateRuleEngine !== 'undefined')
          ? RateRuleEngine.normalizeBuckets(pkg.rateBuckets || [])
            .filter(b => b.rate !== '' && b.rate !== undefined)
          : [];

        // Tìm bucket phù hợp với kỳ hạn
        const months = Math.ceil(Number(loanTermMonths) || 24);
        const sorted = [...buckets].sort((a, b) => a.maxMonths - b.maxMonths);
        const fitBucket = sorted.find(b => months <= b.maxMonths) || sorted[sorted.length - 1];
        const bucketRate = fitBucket ? parseFloat(fitBucket.rate) || 0 : 0;

        // Tính điều chỉnh lãi suất (adjustment rules)
        let adjDelta = 0;
        if (typeof RateRuleEngine !== 'undefined' && typeof RateRuleEngine.evaluateAdjustments === 'function') {
          const contractData = {
            'Xếp hạng khách hàng': customerRank || '',
            'Mục đích vay': purpose || '',
          };
          const adjResult = RateRuleEngine.evaluateAdjustments(pkg, contractData);
          adjDelta = adjResult.totalDelta || 0;
        }

        const effectiveRate = bucketRate + adjDelta;
        const cof = parseFloat(costOfFund) || 4.5;
        const nim = +(effectiveRate - cof).toFixed(2);
        const policyLtv = parseFloat(fields['f_ltv']) || 80;
        const policyMaxTerm = (parseFloat(fields['f_max_term']) || 25) * 12;
        const graceBase = pkg.graceRules?.baseMonths || 0;

        const score = this._score({
          nim, targetNIM: parseFloat(targetNIM) || 3,
          loanTermMonths: months, policyMaxTerm,
          ltv: parseFloat(ltv) || 70, policyLtv,
          projectType, projectName: proj.name + ' ' + pkg.name,
          graceBase,
        });

        candidates.push({
          projectId: proj.id, projectName: proj.name,
          pkgId: pkg.id, policyName: pkg.name,
          fitBucket, bucketRate, adjDelta, effectiveRate,
          nim, policyLtv, policyMaxTerm, graceBase,
          score, scoreBreakdown: score._breakdown,
          feeRules: pkg.feeRules || [],
          fields,
        });
      });
    });

    candidates.sort((a, b) => b.score.total - a.score.total);
    return {
      input,
      top5: candidates.slice(0, 5),
      allCount: candidates.length,
    };
  },

  _score({ nim, targetNIM, loanTermMonths, policyMaxTerm, ltv, policyLtv, projectType, projectName, graceBase }) {
    const W = this.WEIGHTS;
    const breakdown = {};

    // NIM: ideal = target NIM; mỗi 0.5% lệch trừ 10 điểm
    const nimDiff = Math.abs(nim - targetNIM);
    breakdown.nim = Math.max(0, 100 - nimDiff * 20);

    // Term fit: kỳ hạn <= maxTerm → 100đ; vượt quá → 0đ
    breakdown.termFit = loanTermMonths <= policyMaxTerm ? 100 : 0;

    // LTV: yêu cầu <= policy max → 100đ; vượt → giảm dần
    breakdown.ltvFit = ltv <= policyLtv ? 100 : Math.max(0, 100 - (ltv - policyLtv) * 5);

    // Project type fit
    const keywords = (this.PROJECT_TYPE_MAP[projectType] || []);
    const nameLower = projectName.toLowerCase();
    breakdown.projectFit = keywords.some(kw => nameLower.includes(kw)) ? 100 : 60;

    // Grace: >24T → 100đ, 12-24T → 70đ, <12T → 40đ
    breakdown.grace = graceBase >= 24 ? 100 : graceBase >= 12 ? 70 : 40;

    const total = +(
      breakdown.nim        * W.nim / 100 +
      breakdown.termFit    * W.termFit / 100 +
      breakdown.ltvFit     * W.ltvFit / 100 +
      breakdown.projectFit * W.projectFit / 100 +
      breakdown.grace      * W.grace / 100
    ).toFixed(1);

    return { total, _breakdown: breakdown };
  },
};

// ── UI Controller ─────────────────────────────────────────────
const PolicyAdvisorUI = {
  _lastResult: null,

  render() {
    const el = document.getElementById('pa-main');
    if (!el) return;
    el.innerHTML = this._buildFormHTML();
  },

  _buildFormHTML() {
    return `
<div class="pa-layout">
  <div class="pa-form-panel">
    <div class="pa-form-header">
      <div class="pa-form-icon">🏆</div>
      <div>
        <div class="pa-form-title">Tư vấn Chính sách Tối ưu</div>
        <div class="pa-form-sub">Nhập 6 tham số hồ sơ → Hệ thống xếp hạng Top-5 chính sách phù hợp nhất</div>
      </div>
    </div>

    <div class="pa-section-label">📋 Tham số hồ sơ khách hàng</div>
    <div class="pa-grid-2">
      <div class="pa-field">
        <label>Kỳ hạn vay (tháng)</label>
        <input type="number" id="pr-term" class="pa-input" value="240" min="6" max="360" placeholder="VD: 240">
      </div>
      <div class="pa-field">
        <label>LTV yêu cầu (%)</label>
        <input type="number" id="pr-ltv" class="pa-input" value="70" min="10" max="100" placeholder="VD: 70">
      </div>
      <div class="pa-field">
        <label>Loại dự án</label>
        <select id="pr-project-type" class="pa-input">
          <option value="nha_o">Nhà ở / Chung cư</option>
          <option value="lien_ke">Liền kề / Biệt thự</option>
          <option value="dat_nen">Đất nền</option>
          <option value="thuong_mai">Thương mại / Officetel</option>
          <option value="nghi_duong">Nghỉ dưỡng</option>
        </select>
      </div>
      <div class="pa-field">
        <label>Mục đích vay</label>
        <select id="pr-purpose" class="pa-input">
          <option value="mua_nha">Mua nhà để ở</option>
          <option value="dau_tu">Đầu tư / Kinh doanh</option>
          <option value="xay_sua">Xây dựng / Sửa chữa</option>
          <option value="chuyen_nhuong">Chuyển nhượng</option>
        </select>
      </div>
    </div>

    <div class="pa-section-label">🏦 Mục tiêu ngân hàng</div>
    <div class="pa-grid-2">
      <div class="pa-field">
        <label>Chi phí vốn - COF (%/năm)</label>
        <input type="number" id="pr-cof" class="pa-input" value="4.5" step="0.1">
      </div>
      <div class="pa-field">
        <label>NIM mục tiêu (%/năm)</label>
        <input type="number" id="pr-nim" class="pa-input" value="3.0" step="0.1">
      </div>
    </div>

    <div class="pa-section-label">👤 Hồ sơ rủi ro khách hàng</div>
    <div class="pa-grid-2">
      <div class="pa-field">
        <label>Mức độ rủi ro</label>
        <select id="pr-risk" class="pa-input">
          <option value="LOW">Thấp — Khách hàng tốt</option>
          <option value="MED" selected>Trung bình</option>
          <option value="HIGH">Cao — Cần thẩm định kỹ</option>
        </select>
      </div>
      <div class="pa-field">
        <label>Xếp hạng khách hàng</label>
        <input type="text" id="pr-customer-rank" class="pa-input" placeholder="VD: Loại A, Loại B, Loại C">
      </div>
    </div>

    <button class="pa-btn-run" onclick="PolicyAdvisorUI.run()">
      🏆 Phân tích & Xếp hạng Top-5 chính sách
    </button>
  </div>

  <div class="pa-result-panel" id="pa-results">
    <div class="pa-result-placeholder">
      <div class="pa-result-ph-icon">🏆</div>
      <div class="pa-result-ph-text">Nhập tham số hồ sơ và nhấn <b>Phân tích</b><br>để xem Top-5 chính sách tối ưu nhất</div>
    </div>
  </div>
</div>`;
  },

  run() {
    const input = {
      loanTermMonths:  parseInt(document.getElementById('pr-term')?.value) || 240,
      ltv:             parseFloat(document.getElementById('pr-ltv')?.value) || 70,
      projectType:     document.getElementById('pr-project-type')?.value || 'nha_o',
      purpose:         document.getElementById('pr-purpose')?.value || 'mua_nha',
      costOfFund:      parseFloat(document.getElementById('pr-cof')?.value) || 4.5,
      targetNIM:       parseFloat(document.getElementById('pr-nim')?.value) || 3.0,
      riskLevel:       document.getElementById('pr-risk')?.value || 'MED',
      customerRank:    document.getElementById('pr-customer-rank')?.value || '',
    };
    const result = PolicyRanker.rank(input);
    this._lastResult = result;
    this._renderResult(result);
  },

  _renderResult(result) {
    const el = document.getElementById('pa-results');
    if (!el) return;
    const { top5, allCount, input } = result;

    if (!allCount) {
      el.innerHTML = `<div class="pa-alert pa-alert-warn">⚠️ Chưa có chính sách nào trong Rate Center. Hãy tạo ít nhất 1 dự án và chính sách.</div>`;
      return;
    }

    const W = PolicyRanker.WEIGHTS;
    const medals = ['🥇','🥈','🥉','4️⃣','5️⃣'];

    const cards = top5.map((p, i) => {
      const bd = p.scoreBreakdown;
      const nimColor = p.nim >= input.targetNIM ? '#10b981' : '#f59e0b';
      const adjBadge = p.adjDelta !== 0
        ? `<span style="font-size:0.7rem;padding:1px 6px;border-radius:99px;background:rgba(245,158,11,0.15);color:#f59e0b;margin-left:4px;">+${p.adjDelta}% ĐC</span>`
        : '';
      const feeInHTLS = (p.feeRules.find(f => f.phase === 'inHTLS')?.fee) || '—';

      return `
<div class="pg-rank-card ${i===0?'pg-rank-card-gold':''}">
  <div class="pg-rank-header">
    <span class="pg-rank-medal">${medals[i]}</span>
    <div class="pg-rank-names">
      <div class="pg-rank-policy">${p.policyName}</div>
      <div class="pg-rank-project">${p.projectName}</div>
    </div>
    <div class="pg-rank-score">
      <span class="pg-rank-score-val">${p.score.total}</span>
      <span class="pg-rank-score-unit">/ 100</span>
    </div>
  </div>

  <div class="pg-rank-metrics">
    <div class="pg-rank-metric">
      <span class="pg-rank-metric-label">Lãi suất bucket</span>
      <span class="pg-rank-metric-val" style="color:#6366f1">${p.bucketRate}%/năm</span>
    </div>
    <div class="pg-rank-metric">
      <span class="pg-rank-metric-label">Lãi suất hiệu lực</span>
      <span class="pg-rank-metric-val" style="color:#6366f1">${p.effectiveRate}%/năm${adjBadge}</span>
    </div>
    <div class="pg-rank-metric">
      <span class="pg-rank-metric-label">NIM ước tính</span>
      <span class="pg-rank-metric-val" style="color:${nimColor}">${p.nim}%</span>
    </div>
    <div class="pg-rank-metric">
      <span class="pg-rank-metric-label">LTV tối đa</span>
      <span class="pg-rank-metric-val">${p.policyLtv}%</span>
    </div>
    <div class="pg-rank-metric">
      <span class="pg-rank-metric-label">Kỳ hạn tối đa</span>
      <span class="pg-rank-metric-val">${Math.round(p.policyMaxTerm/12)} năm</span>
    </div>
    <div class="pg-rank-metric">
      <span class="pg-rank-metric-label">Ân hạn gốc</span>
      <span class="pg-rank-metric-val">${p.graceBase} tháng</span>
    </div>
    <div class="pg-rank-metric">
      <span class="pg-rank-metric-label">Phí TNTH (HTLS)</span>
      <span class="pg-rank-metric-val">${feeInHTLS}%</span>
    </div>
    <div class="pg-rank-metric">
      <span class="pg-rank-metric-label">Bucket khớp</span>
      <span class="pg-rank-metric-val">${p.fitBucket ? p.fitBucket.label : '—'}</span>
    </div>
  </div>

  <!-- Score breakdown bar -->
  <div class="pg-score-breakdown">
    ${[
      ['NIM', bd.nim, W.nim, '#6366f1'],
      ['Kỳ hạn', bd.termFit, W.termFit, '#10b981'],
      ['LTV', bd.ltvFit, W.ltvFit, '#06b6d4'],
      ['Dự án', bd.projectFit, W.projectFit, '#8b5cf6'],
      ['Ân hạn', bd.grace, W.grace, '#f59e0b'],
    ].map(([label, score, weight, color]) => `
      <div class="pg-score-bar-row">
        <span class="pg-score-bar-label">${label}</span>
        <div class="pg-score-bar-track">
          <div class="pg-score-bar-fill" style="width:${score}%;background:${color};opacity:0.8;"></div>
        </div>
        <span class="pg-score-bar-pts" style="color:${color}">${+(score*weight/100).toFixed(1)}</span>
      </div>`).join('')}
  </div>
</div>`;
    }).join('');

    el.innerHTML = `
<div style="padding:14px 18px;border-bottom:1px solid rgba(99,102,241,0.1);">
  <div style="font-size:0.82rem;color:var(--text-muted);">
    Phân tích <b style="color:var(--accent)">${allCount}</b> chính sách từ Rate Center · 
    Kỳ hạn: <b>${input.loanTermMonths}T</b> · LTV: <b>${input.ltv}%</b> · 
    COF: <b>${input.costOfFund}%</b> · NIM mục tiêu: <b>${input.targetNIM}%</b>
  </div>
</div>
<div style="padding:14px 18px;overflow-y:auto;">${cards || '<div class="pa-alert pa-alert-warn">Không tìm được chính sách phù hợp.</div>'}</div>`;
  },
};

// Alias giữ tương thích với master-data.js
const PolicyGeneratorUI = PolicyAdvisorUI;
