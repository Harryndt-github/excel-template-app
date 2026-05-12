/* ============================================================
   PolicyRanker v2 — ML-Enhanced Scoring Engine
   Kỹ thuật: Sigmoid · Cosine Similarity · Softmax · Dynamic Weights
   Thuần JavaScript — không API, không external libs
   ============================================================ */

const PolicyRanker = {

  PROJECT_TYPE_MAP: {
    'nha_o':     ['nhà ở','chung cư','căn hộ'],
    'lien_ke':   ['liền kề','biệt thự','townhouse'],
    'dat_nen':   ['đất nền','đất'],
    'thuong_mai':['thương mại','officetel','shophouse'],
    'nghi_duong':['nghỉ dưỡng','resort','condotel'],
  },

  // ── Math Utilities ─────────────────────────────────────────

  /** Sigmoid: f(x) = 1 / (1 + e^(-k*x)) → output [0,1] */
  _sigmoid(x, k = 1) {
    return 1 / (1 + Math.exp(-k * x));
  },

  /** Softmax → phân phối xác suất (%), stable với max-shift */
  _softmax(scores) {
    const max = Math.max(...scores);
    const exps = scores.map(s => Math.exp(s - max));
    const sum  = exps.reduce((a, b) => a + b, 0);
    return exps.map(e => +(e / sum * 100).toFixed(1));
  },

  /** Cosine Similarity giữa 2 vector số */
  _cosine(a, b) {
    const dot  = a.reduce((s, v, i) => s + v * b[i], 0);
    const magA = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
    const magB = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
    return (magA && magB) ? dot / (magA * magB) : 0;
  },

  // ── Dynamic Rule-based Weights ──────────────────────────────

  _computeWeights(input) {
    const W = { nim: 30, termFit: 25, ltvFit: 20, projectFit: 15, grace: 10 };
    const reasons = [];

    // LTV cao → tăng trọng số ltvFit
    if (input.ltv > 70) {
      const boost = Math.min(15, (input.ltv - 70) * 0.6);
      W.ltvFit += boost;
      reasons.push(`LTV ${input.ltv}% cao → +ltvFit`);
    }
    // Kỳ hạn dài (>20 năm) → tăng termFit
    if (input.loanTermMonths > 240) {
      const boost = Math.min(12, (input.loanTermMonths - 240) / 10);
      W.termFit += boost;
      reasons.push(`Kỳ hạn ${input.loanTermMonths}T dài → +termFit`);
    }
    // Risk cao → tăng NIM + grace
    if (input.riskLevel === 'HIGH') {
      W.nim += 12; W.grace += 6;
      reasons.push('Rủi ro cao → +NIM +grace');
    } else if (input.riskLevel === 'LOW') {
      W.nim -= 5; W.projectFit += 5;
      reasons.push('Rủi ro thấp → +projectFit');
    }

    // Normalize về tổng 100
    const total = Object.values(W).reduce((a, b) => a + b, 0);
    Object.keys(W).forEach(k => { W[k] = +(W[k] * 100 / total).toFixed(1); });
    return { weights: W, reasons };
  },

  // ── Vector Embedding ────────────────────────────────────────

  _customerVector(input) {
    const riskMap    = { LOW: 0.2, MED: 0.5, HIGH: 0.8 };
    const purposeMap = { mua_nha: 0.2, xay_sua: 0.4, chuyen_nhuong: 0.6, dau_tu: 0.8 };
    const typeMap    = { nha_o: 0.1, lien_ke: 0.3, dat_nen: 0.5, thuong_mai: 0.7, nghi_duong: 0.9 };
    return [
      Math.min((parseFloat(input.ltv) || 70) / 100, 1),
      Math.min((parseInt(input.loanTermMonths) || 240) / 360, 1),
      Math.min((parseFloat(input.targetNIM) || 3) / 8, 1),
      riskMap[input.riskLevel] || 0.5,
      purposeMap[input.purpose] || 0.3,
      typeMap[input.projectType] || 0.3,
    ];
  },

  _policyVector(fields, effectiveNim, input) {
    const typeMap = { nha_o: 0.1, lien_ke: 0.3, dat_nen: 0.5, thuong_mai: 0.7, nghi_duong: 0.9 };
    return [
      Math.min((parseFloat(fields['f_ltv']) || 80) / 100, 1),
      Math.min(((parseFloat(fields['f_max_term']) || 25) * 12) / 360, 1),
      Math.min((effectiveNim || 0) / 8, 1),
      0.5, // policy risk class — default neutral
      typeMap[input.projectType] || 0.3,
      typeMap[input.projectType] || 0.3,
    ];
  },

  // ── Sigmoid-based Dimension Scoring ────────────────────────

  _scoreDimensions({ nim, targetNIM, loanTermMonths, policyMaxTerm, ltv, policyLtv, projectType, projectName, graceBase }) {
    const bd = {};

    // NIM: sigmoid với offset +1 để nim = target → ~82 điểm
    bd.nim = Math.round(this._sigmoid((nim - targetNIM + 1) * 1.5) * 100);

    // Term fit: sigmoid mượt, không rớt cứng 100→0
    const termDelta = policyMaxTerm - loanTermMonths;
    bd.termFit = Math.round(this._sigmoid(termDelta * 0.1) * 100);

    // LTV fit: sigmoid, vượt LTV giảm dần
    const ltvDelta = policyLtv - ltv;
    bd.ltvFit = Math.round(this._sigmoid(ltvDelta * 0.3) * 100);

    // Project fit: keyword match + sigmoid penalty
    const keywords = this.PROJECT_TYPE_MAP[projectType] || [];
    bd.projectFit = keywords.some(kw => projectName.toLowerCase().includes(kw)) ? 100 : 55;

    // Grace: sigmoid trên số tháng ân hạn
    bd.grace = Math.round(this._sigmoid((graceBase - 12) * 0.15) * 100);

    return bd;
  },

  // ── Main Rank Function ──────────────────────────────────────

  rank(input) {
    const { loanTermMonths, ltv, projectType, purpose, targetNIM, costOfFund, riskLevel, customerRank } = input;
    const projects = (typeof RateCenter !== 'undefined') ? RateCenter.getProjects() : [];

    // Dynamic weights
    const weightResult = this._computeWeights(input);
    const W = weightResult.weights;

    // Customer vector cho cosine similarity
    const custVec = this._customerVector(input);

    const candidates = [];

    projects.forEach(proj => {
      (proj.packages || []).forEach(pkg => {
        const fields = {};
        (pkg.fields || []).forEach(f => { fields[f.id] = f.value; });

        const buckets = (typeof RateRuleEngine !== 'undefined')
          ? RateRuleEngine.normalizeBuckets(pkg.rateBuckets || [])
              .filter(b => b.rate !== '' && b.rate !== undefined)
          : [];

        const months  = Math.ceil(Number(loanTermMonths) || 24);
        const sorted  = [...buckets].sort((a, b) => a.maxMonths - b.maxMonths);
        const fitBucket  = sorted.find(b => months <= b.maxMonths) || sorted[sorted.length - 1];
        const bucketRate = fitBucket ? parseFloat(fitBucket.rate) || 0 : 0;

        let adjDelta = 0;
        if (typeof RateRuleEngine !== 'undefined' && typeof RateRuleEngine.evaluateAdjustments === 'function') {
          const contractData = {
            'Xếp hạng khách hàng': customerRank || '',
            'Mục đích vay': purpose || '',
          };
          adjDelta = (RateRuleEngine.evaluateAdjustments(pkg, contractData) || {}).totalDelta || 0;
        }

        const effectiveRate = bucketRate + adjDelta;
        const cof           = parseFloat(costOfFund) || 4.5;
        const nim           = +(effectiveRate - cof).toFixed(2);
        const policyLtv     = parseFloat(fields['f_ltv']) || 80;
        const policyMaxTerm = (parseFloat(fields['f_max_term']) || 25) * 12;
        const graceBase     = pkg.graceRules?.baseMonths || 0;

        // Sigmoid dimension scores
        const bd = this._scoreDimensions({
          nim, targetNIM: parseFloat(targetNIM) || 3,
          loanTermMonths: months, policyMaxTerm,
          ltv: parseFloat(ltv) || 70, policyLtv,
          projectType, projectName: proj.name + ' ' + pkg.name,
          graceBase,
        });

        // Weighted score
        const weightedTotal =
          bd.nim        * W.nim / 100 +
          bd.termFit    * W.termFit / 100 +
          bd.ltvFit     * W.ltvFit / 100 +
          bd.projectFit * W.projectFit / 100 +
          bd.grace      * W.grace / 100;

        // Cosine similarity (0–100)
        const policyVec   = this._policyVector(fields, nim, input);
        const cosineScore = +(this._cosine(custVec, policyVec) * 100).toFixed(1);

        // Blend: 75% weighted + 25% cosine
        const blended = +(weightedTotal * 0.75 + cosineScore * 0.25).toFixed(1);

        candidates.push({
          projectId: proj.id, projectName: proj.name,
          pkgId: pkg.id, policyName: pkg.name,
          fitBucket, bucketRate, adjDelta, effectiveRate,
          nim, policyLtv, policyMaxTerm, graceBase,
          scoreBreakdown: bd,
          cosineScore,
          score: { total: blended, _breakdown: bd },
          feeRules: pkg.feeRules || [],
          fields,
        });
      });
    });

    candidates.sort((a, b) => b.score.total - a.score.total);
    const top5 = candidates.slice(0, 5);

    // Softmax → confidence %
    if (top5.length > 0) {
      const probs = this._softmax(top5.map(c => c.score.total));
      top5.forEach((c, i) => { c.confidence = probs[i]; });
    }

    return { input, top5, allCount: candidates.length, weightResult };
  },
};

// ── UI Controller ──────────────────────────────────────────────
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
        <div class="pa-form-sub">Nhập tham số hồ sơ → Sigmoid · Cosine · Softmax xếp hạng Top-5</div>
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
      🏆 Phân tích &amp; Xếp hạng Top-5 chính sách
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
      loanTermMonths: parseInt(document.getElementById('pr-term')?.value)        || 240,
      ltv:            parseFloat(document.getElementById('pr-ltv')?.value)       || 70,
      projectType:    document.getElementById('pr-project-type')?.value          || 'nha_o',
      purpose:        document.getElementById('pr-purpose')?.value               || 'mua_nha',
      costOfFund:     parseFloat(document.getElementById('pr-cof')?.value)       || 4.5,
      targetNIM:      parseFloat(document.getElementById('pr-nim')?.value)       || 3.0,
      riskLevel:      document.getElementById('pr-risk')?.value                  || 'MED',
      customerRank:   document.getElementById('pr-customer-rank')?.value         || '',
    };
    const result = PolicyRanker.rank(input);
    this._lastResult = result;
    this._renderResult(result);
  },

  _renderResult(result) {
    const el = document.getElementById('pa-results');
    if (!el) return;
    const { top5, allCount, input, weightResult } = result;

    if (!allCount) {
      el.innerHTML = `<div class="pa-alert pa-alert-warn">⚠️ Chưa có chính sách nào trong Rate Center.</div>`;
      return;
    }

    const W       = weightResult.weights;
    const reasons = weightResult.reasons;
    const medals  = ['🥇','🥈','🥉','4️⃣','5️⃣'];

    // Dynamic weights summary
    const weightBadges = Object.entries(W).map(([k,v]) => {
      const labels = { nim:'NIM', termFit:'Kỳ hạn', ltvFit:'LTV', projectFit:'Dự án', grace:'Ân hạn' };
      return `<span style="display:inline-flex;align-items:center;gap:3px;padding:2px 8px;border-radius:99px;background:rgba(99,102,241,0.12);color:#818cf8;font-size:0.72rem;margin:2px;">${labels[k]||k} <b style="color:#c7d2fe">${v}%</b></span>`;
    }).join('');

    const reasonHtml = reasons.length
      ? `<div style="margin-top:6px;font-size:0.71rem;color:#94a3b8;">${reasons.map(r=>`⚡ ${r}`).join(' &nbsp;·&nbsp; ')}</div>`
      : '';

    const weightPanel = `
<div style="padding:12px 18px;border-bottom:1px solid rgba(99,102,241,0.1);background:rgba(99,102,241,0.04);">
  <div style="font-size:0.72rem;color:#94a3b8;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em;">Dynamic Weights</div>
  <div>${weightBadges}</div>
  ${reasonHtml}
</div>`;

    const cards = top5.map((p, i) => {
      const bd        = p.scoreBreakdown;
      const nimColor  = p.nim >= input.targetNIM ? '#10b981' : '#f59e0b';
      const adjBadge  = p.adjDelta !== 0
        ? `<span style="font-size:0.7rem;padding:1px 6px;border-radius:99px;background:rgba(245,158,11,0.15);color:#f59e0b;margin-left:4px;">${p.adjDelta>0?'+':''}${p.adjDelta}% ĐC</span>`
        : '';
      const feeInHTLS = (p.feeRules.find(f => f.phase === 'inHTLS')?.fee) || '—';
      const confColor = p.confidence >= 40 ? '#10b981' : p.confidence >= 20 ? '#f59e0b' : '#94a3b8';

      return `
<div class="pg-rank-card ${i===0?'pg-rank-card-gold':''}">
  <div class="pg-rank-header">
    <span class="pg-rank-medal">${medals[i]}</span>
    <div class="pg-rank-names">
      <div class="pg-rank-policy">${p.policyName}</div>
      <div class="pg-rank-project">${p.projectName}</div>
    </div>
    <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
      <div class="pg-rank-score">
        <span class="pg-rank-score-val">${p.score.total}</span>
        <span class="pg-rank-score-unit">/ 100</span>
      </div>
      <div style="font-size:0.68rem;padding:1px 8px;border-radius:99px;background:rgba(16,185,129,0.12);color:${confColor};">
        Softmax <b>${p.confidence}%</b>
      </div>
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
      <span class="pg-rank-metric-label">Cosine Match</span>
      <span class="pg-rank-metric-val" style="color:#8b5cf6">${p.cosineScore}/100</span>
    </div>
  </div>

  <!-- Score breakdown bars -->
  <div class="pg-score-breakdown">
    ${[
      ['NIM',     bd.nim,        W.nim,        '#6366f1'],
      ['Kỳ hạn',  bd.termFit,    W.termFit,    '#10b981'],
      ['LTV',     bd.ltvFit,     W.ltvFit,     '#06b6d4'],
      ['Dự án',   bd.projectFit, W.projectFit, '#8b5cf6'],
      ['Ân hạn',  bd.grace,      W.grace,      '#f59e0b'],
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
${weightPanel}
<div style="padding:10px 18px;border-bottom:1px solid rgba(99,102,241,0.1);">
  <div style="font-size:0.82rem;color:var(--text-muted);">
    Phân tích <b style="color:var(--accent)">${allCount}</b> chính sách ·
    Kỳ hạn: <b>${input.loanTermMonths}T</b> · LTV: <b>${input.ltv}%</b> ·
    COF: <b>${input.costOfFund}%</b> · NIM mục tiêu: <b>${input.targetNIM}%</b>
  </div>
</div>
<div style="padding:14px 18px;overflow-y:auto;">${cards || '<div class="pa-alert pa-alert-warn">Không tìm được chính sách phù hợp.</div>'}</div>`;
  },
};

// Alias giữ tương thích với master-data.js
const PolicyGeneratorUI = PolicyAdvisorUI;
