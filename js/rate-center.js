/* ============================================================
   RateCenter v2 — Bộ máy tính rule lãi suất
   Cấu trúc: project > policy > rateBuckets + feeRules + graceRules + exceptions
   ============================================================ */

const RateCenterState = {
  projects: [],
  selectedProject: null,
  selectedPackage: null,
  activeTab: 'buckets',
};

function _rcId() { return 'rc_' + Math.random().toString(36).slice(2, 9); }
function _rcEsc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

const RC_COLORS = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#06b6d4','#3b82f6','#ef4444'];
const RC_PROJECT_ICONS = ['🏢','🏗️','🏠','🏦','🏙️','🌆','🏬','🏭'];

const RC_DEFAULT_FIELDS = [
  { id:'f_project_code', label:'Mã dự án',               unit:'',      type:'text' },
  { id:'f_policy_code',  label:'Mã chính sách',          unit:'',      type:'text' },
  { id:'f_policy_name',  label:'Chính sách bán hàng',    unit:'',      type:'text' },
  { id:'f_effective_from', label:'Thời gian áp dụng từ', unit:'',      type:'date' },
  { id:'f_effective_to', label:'Thời gian áp dụng đến',  unit:'',      type:'date' },
  { id:'f_legal_note',   label:'Điều kiện đi kèm',       unit:'',      type:'text' },
  { id:'f_policy_note',  label:'Ghi chú chính sách',     unit:'',      type:'text' },
  { id:'f_min_term',    label:'Thời gian vay tối thiểu',  unit:'tháng', type:'number' },
  { id:'f_ltv',         label:'LTV tối đa',               unit:'%',     type:'percent' },
  { id:'f_max_term',    label:'Thời gian vay tối đa',     unit:'năm',   type:'number' },
];

const RC_DEFAULT_RATE_BUCKETS = [
  { id:'rb_6',  maxMonths: 6,  rate:'', margin:'', label:'≤ 6 tháng',  note:'' },
  { id:'rb_12', maxMonths: 12, rate:'', margin:'', label:'≤ 12 tháng', note:'' },
  { id:'rb_18', maxMonths: 18, rate:'', margin:'', label:'≤ 18 tháng', note:'' },
  { id:'rb_24', maxMonths: 24, rate:'', margin:'', label:'≤ 24 tháng', note:'' },
  { id:'rb_30', maxMonths: 30, rate:'', margin:'', label:'≤ 30 tháng', note:'' },
  { id:'rb_36', maxMonths: 36, rate:'', margin:'', label:'≤ 36 tháng', note:'' },
];

const RC_DEFAULT_FEE_RULES = [
  { id:'fr_htls',   phase:'inHTLS',          fee:'', label:'Trong thời gian hỗ trợ lãi' },
  { id:'fr_post60', phase:'afterHTLS_to60',  fee:'', label:'Sau hỗ trợ lãi đến T60' },
  { id:'fr_61up',   phase:'from61',          fee:'', label:'Từ T61 trở đi' },
];

const RC_DEFAULT_GRACE_RULES = {
  baseMonths: 0,
  withHTLS: true,
  withSupplement: false,
  useMaxByGroup: false,
  maxByGroup: { A: 36, B: 24, default: 0 },
  note: '',
};

const RC_DEFAULT_INTEREST_SUPPORT_RULES = {
  enabled: true,
  supportPolicyCode: '',
  supportPolicyName: '',
  feePolicyCode: '',
  feePolicyName: '',
  defaultSupportMonths: '',
  supportPayer: 'Chủ đầu tư',
  customerPayer: 'Khách hàng',
  principalPayer: 'Khách hàng',
  principalRule: 'Khách hàng vẫn trả nợ gốc theo lịch trả nợ; hỗ trợ lãi không đồng nghĩa miễn/hoãn gốc.',
  note: '',
};

// ── RateRuleEngine ────────────────────────────────────────────
const RateRuleEngine = {

  /**
   * Chọn bucket lãi suất dựa trên số tháng áp dụng/hỗ trợ lãi đã làm tròn
   * Rule: chọn bucket nhỏ nhất có maxMonths >= htlsMonths
   */
  selectBucket(rateBuckets, htlsMonths) {
    if (!rateBuckets || !rateBuckets.length) return null;
    const months = Math.ceil(Number(htlsMonths) || 0);
    const sorted = this.normalizeBuckets(rateBuckets);
    const bucket = sorted.find(b => months <= b.maxMonths);
    return bucket || sorted[sorted.length - 1];
  },

  normalizeBuckets(rateBuckets) {
    return (rateBuckets || [])
      .map(bucket => ({
        ...bucket,
        maxMonths: Number(bucket.maxMonths) || 0,
        label: bucket.label || `≤ ${Number(bucket.maxMonths) || 0} tháng`
      }))
      .filter(bucket => bucket.maxMonths > 0)
      .sort((a, b) => a.maxMonths - b.maxMonths);
  },

  resolveEffectiveBucket(rateBuckets, selectedBucket) {
    if (!selectedBucket) return null;
    const sorted = this.normalizeBuckets(rateBuckets);
    const selectedMonths = Number(selectedBucket.maxMonths) || 0;
    const source = sorted.find(bucket =>
      bucket.maxMonths >= selectedMonths &&
      (bucket.rate !== undefined && String(bucket.rate).trim() !== '')
    );
    const base = {
      ...selectedBucket,
      rate: source ? source.rate : selectedBucket.rate,
      margin: source && String(selectedBucket.margin || '').trim() === '' ? source.margin : selectedBucket.margin,
      effectiveSourceLabel: source ? source.label : selectedBucket.label,
      inherited: !!source && source.id !== selectedBucket.id,
      effectiveRate: source ? source.rate : selectedBucket.rate,
      preferentialExpired: false,
      expiryNote: '',
    };
    return base;
  },

  /**
   * Tính phí TNTH theo giai đoạn
   * Phase xác định bởi tháng hiện tại so với thời gian hỗ trợ lãi và mốc T60
   */
  calcFee(feeRules, context) {
    if (!feeRules || !feeRules.length) return null;
    const { currentMonth, htlsMonths } = context;
    const month = Number(currentMonth) || 0;
    const htls = Number(htlsMonths) || 0;
    let phase;
    if (month <= htls) phase = 'inHTLS';
    else if (month <= 60) phase = 'afterHTLS_to60';
    else phase = 'from61';
    return feeRules.find(r => r.phase === phase) || null;
  },

  /**
   * Tính ân hạn gốc tối đa
   * Phụ thuộc: project group, exception per project, có hỗ trợ lãi, có bổ sung
   */
  calcGrace(graceRules, projectExceptions, input) {
    const { projectGroup, hasHTLS, hasSupplementGrace, projectName, htlsMonths } = input;
    const notes = [];
    let grace = Number(graceRules.baseMonths) || 0;

    // Kiểm tra exception theo tên dự án
    const exception = (projectExceptions || []).find(e =>
      e.projectName && projectName &&
      projectName.toLowerCase().includes(e.projectName.toLowerCase())
    );

    if (exception) {
      grace = Number(exception.maxGrace) || grace;
      notes.push(`Ngoại lệ dự án: ${exception.projectName} → tối đa ${grace} tháng`);
    } else if (graceRules.useMaxByGroup && projectGroup) {
      const groupMax = graceRules.maxByGroup[projectGroup] || graceRules.maxByGroup.default || 0;
      if (groupMax > 0) {
        grace = Math.min(grace || groupMax, groupMax);
        notes.push(`Nhóm ${projectGroup}: tối đa ${groupMax} tháng`);
      }
    }

    // Nếu không có exception và không có group → giới hạn bằng thời gian hỗ trợ lãi
    if (!exception && !(graceRules.useMaxByGroup && projectGroup)) {
      const htls = Number(htlsMonths) || 0;
      if (htls > 0 && (grace === 0 || grace > htls)) {
        grace = htls;
        notes.push('Không vượt quá thời gian hỗ trợ lãi (' + htls + ' tháng)');
      }
    }

    if (graceRules.withHTLS && hasHTLS) {
      notes.push('Có hỗ trợ lãi từ CĐT → ân hạn đầy đủ');
    }
    if (graceRules.withSupplement && hasSupplementGrace) {
      notes.push('Có ân hạn gốc bổ sung');
    }

    return { grace, notes };
  },

  /**
   * Tách rõ nghĩa vụ trả lãi: hỗ trợ lãi suất trong N tháng, sau đó KH trả lãi.
   * Nợ gốc mặc định luôn do khách hàng trả theo lịch, độc lập với hỗ trợ lãi.
   */
  calcInterestResponsibility(pkg, input, bucket) {
    const rules = { ...RC_DEFAULT_INTEREST_SUPPORT_RULES, ...(pkg.interestSupportRules || {}) };
    const loanTermMonths = Number(input.loanTermMonths) || 0;
    const currentMonth = Math.max(1, Number(input.currentMonth) || 1);
    const configuredSupportMonths = input.cdtSupportMonths !== undefined && input.cdtSupportMonths !== ''
      ? Number(input.cdtSupportMonths)
      : Number(input.htlsMonths || rules.defaultSupportMonths || 0);
    const hasDeveloperSupport = rules.enabled !== false && input.loanType !== 'standard' && configuredSupportMonths > 0;
    const supportMonths = hasDeveloperSupport
      ? Math.max(0, loanTermMonths ? Math.min(configuredSupportMonths, loanTermMonths) : configuredSupportMonths)
      : 0;
    const customerStartMonth = supportMonths + 1;
    const customerInterestMonths = loanTermMonths ? Math.max(loanTermMonths - supportMonths, 0) : null;
    const currentInterestPayer = hasDeveloperSupport && currentMonth <= supportMonths
      ? rules.supportPayer
      : rules.customerPayer;
    const developerRate = bucket ? (bucket.effectiveRate || bucket.rate || '') : '';
    const customerRate = bucket ? (bucket.effectiveRate || bucket.rate || '') : '';

    const notes = [];
    if (hasDeveloperSupport) {
      notes.push(`${rules.supportPayer} trả lãi trong ${supportMonths} tháng đầu`);
      notes.push(`${rules.customerPayer} bắt đầu trả lãi từ tháng ${customerStartMonth}`);
    } else {
      notes.push('Không có hỗ trợ lãi từ Chủ đầu tư; khách hàng trả lãi từ tháng 1');
    }
    notes.push(rules.principalRule);
    if (rules.note) notes.push(rules.note);

    return {
      supportMonths,
      customerStartMonth,
      customerInterestMonths,
      currentInterestPayer,
      developerRate,
      customerRate,
      principalPayer: rules.principalPayer,
      principalRule: rules.principalRule,
      notes,
    };
  },

  /**
   * Kiểm tra eligibility conditions
   */
  checkEligibility(conditions, input) {
    const failed = [];
    (conditions || []).forEach(cond => {
      const fieldVal = input[cond.field];
      let pass = true;
      if (cond.operator === 'eq' && String(fieldVal) !== String(cond.value)) pass = false;
      if (cond.operator === 'gte' && fieldVal < cond.value) pass = false;
      if (cond.operator === 'lte' && fieldVal > cond.value) pass = false;
      if (!pass) failed.push(cond.label || cond.field);
    });
    return { eligible: failed.length === 0, failed };
  },

  /**
   * Evaluate toàn bộ: nhận input hồ sơ → trả output cuối cho template
   */
  evaluate(pkg, project, input) {
    if (!pkg) return {};
    const supportRules = { ...RC_DEFAULT_INTEREST_SUPPORT_RULES, ...(pkg.interestSupportRules || {}) };
    const htlsMonths = Number(
      input.cdtSupportMonths !== undefined && input.cdtSupportMonths !== ''
        ? input.cdtSupportMonths
        : (input.htlsMonths || supportRules.defaultSupportMonths || 0)
    ) || 0;

    // 1. Bucket lãi suất
    const selectedBucket = this.selectBucket(pkg.rateBuckets, htlsMonths);
    const bucket = this.resolveEffectiveBucket(pkg.rateBuckets, selectedBucket);

    // 2. Phí TNTH
    const feeRule = this.calcFee(pkg.feeRules, { currentMonth: input.currentMonth, htlsMonths });

    // 3. Ân hạn gốc
    const { grace, notes: graceNotes } = this.calcGrace(
      pkg.graceRules || RC_DEFAULT_GRACE_RULES,
      pkg.projectExceptions,
      { ...input, htlsMonths, cdtSupportMonths: htlsMonths, projectName: project ? project.name : '' }
    );

    // 4. Nghĩa vụ trả lãi/gốc giữa CĐT và Khách hàng
    const responsibility = this.calcInterestResponsibility(pkg, { ...input, htlsMonths, cdtSupportMonths: htlsMonths }, bucket);

    // 5. Eligibility
    const { eligible, failed } = this.checkEligibility(pkg.eligibilityConditions, input);

    // 6. Derived fields for template
    const derived = {
      'Bucket HTLS':        bucket ? bucket.label : '',
      'Bucket lãi suất':    bucket ? bucket.label : '',
      'Lãi suất áp dụng':  bucket ? (bucket.effectiveRate || bucket.rate)  : '',
      'Lãi suất hiệu lực':  bucket ? (bucket.effectiveRate || bucket.rate)  : '',
      'Lãi suất bucket':    bucket ? (bucket.effectiveRate || bucket.rate)  : '',
      'Biên độ':            bucket ? bucket.margin : '',
      'Nguồn bucket lãi suất': bucket ? bucket.effectiveSourceLabel : '',
      'Kế thừa bucket lớn hơn': bucket && bucket.inherited ? 'Có' : 'Không',
      'Có hỗ trợ lãi suất': supportRules.enabled !== false ? 'Có' : 'Không',
      'Mã chính sách hỗ trợ lãi suất': supportRules.supportPolicyCode || '',
      'Chính sách hỗ trợ lãi suất': supportRules.supportPolicyName || '',
      'Mã chính sách phí TNTH': supportRules.feePolicyCode || '',
      'Chính sách phí TNTH': supportRules.feePolicyName || '',
      'Thời gian CĐT trả lãi': responsibility.supportMonths ? `${responsibility.supportMonths} tháng` : 'Không áp dụng',
      'Tháng khách hàng bắt đầu trả lãi': responsibility.customerStartMonth,
      'Thời gian khách hàng trả lãi': responsibility.customerInterestMonths === null
        ? `Từ tháng ${responsibility.customerStartMonth} đến khi tất toán`
        : `${responsibility.customerInterestMonths} tháng`,
      'Bên trả lãi hiện tại': responsibility.currentInterestPayer,
      'Lãi suất CĐT trả': responsibility.developerRate,
      'Lãi suất khách hàng trả': responsibility.customerRate,
      'Nợ gốc do ai trả': responsibility.principalPayer,
      'Nguyên tắc trả nợ gốc': responsibility.principalRule,
      'Phí TNTH hiện hành':feeRule ? feeRule.fee  : '',
      'Giai đoạn TNTH':    feeRule ? feeRule.label : '',
      'Ân hạn gốc tối đa': grace,
      'Ghi chú rule':       [...responsibility.notes, ...graceNotes].join(' | '),
      'Điều kiện đủ':       eligible ? 'Đủ điều kiện' : 'Không đủ: ' + failed.join(', '),
    };

    return derived;
  },

  /**
   * Đánh giá điều chỉnh lãi suất bổ sung dựa trên dữ liệu hợp đồng
   * @param {Object} pkg      - Chính sách (package) cần đánh giá
   * @param {Object} record   - Dữ liệu hợp đồng / khách hàng (key: label, value: string)
   * @returns {{ totalDelta, matched: [{name, delta, conditions}] }}
   */
  evaluateAdjustments(pkg, record = {}) {
    const rules = pkg.rateAdjustments || [];
    const matched = [];
    let totalDelta = 0;

    rules.forEach(rule => {
      if (!rule.conditions || !rule.conditions.length) return;
      const allMet = rule.conditions.every(cond => {
        const actual = String(record[cond.field] || '').trim().toLowerCase();
        const expected = String(cond.value || '').trim().toLowerCase();
        switch (cond.operator) {
          case 'equals':      return actual === expected;
          case 'not_equals':  return actual !== expected;
          case 'contains':    return actual.includes(expected);
          case 'starts_with': return actual.startsWith(expected);
          case 'gt':          return parseFloat(actual) > parseFloat(expected);
          case 'gte':         return parseFloat(actual) >= parseFloat(expected);
          case 'lt':          return parseFloat(actual) < parseFloat(expected);
          case 'lte':         return parseFloat(actual) <= parseFloat(expected);
          case 'in_list':     return expected.split(',').map(s => s.trim()).includes(actual);
          default:            return false;
        }
      });
      if (allMet) {
        const delta = parseFloat(rule.rateDelta) || 0;
        totalDelta += delta;
        matched.push({ name: rule.name, delta, conditions: rule.conditions, note: rule.note || '' });
      }
    });

    return { totalDelta: +totalDelta.toFixed(4), matched };
  },
};

// ── Persistence & Main Object ─────────────────────────────────
const RateCenter = {
  _storageKey: 'excelmapper_ratecenter_v2',

  load() {
    try {
      const raw = localStorage.getItem(this._storageKey);
      if (raw) Object.assign(RateCenterState, JSON.parse(raw));
    } catch(e) {}
    if (!RateCenterState.projects) RateCenterState.projects = [];
  },

  save() {
    try {
      localStorage.setItem(this._storageKey, JSON.stringify({
        projects: RateCenterState.projects,
        selectedProject: RateCenterState.selectedProject,
        selectedPackage: RateCenterState.selectedPackage,
      }));
    } catch(e) {}
  },

  render() {
    this.load();
    this._ensureDataShape();
    this.renderProjects();
    this.renderPackages(RateCenterState.selectedProject);
    this.renderDetail(RateCenterState.selectedProject, RateCenterState.selectedPackage);
  },

  _ensureDataShape() {
    let changed = false;
    (RateCenterState.projects || []).forEach(project => {
      if (!project.packages) { project.packages = []; changed = true; }
      project.packages.forEach(pkg => {
        if (!pkg.fields) { pkg.fields = []; changed = true; }
        RC_DEFAULT_FIELDS.forEach(def => {
          if (!pkg.fields.find(f => f.id === def.id)) {
            pkg.fields.push({ ...def, value: '' }); changed = true;
          }
        });
        if (!pkg.rateBuckets) { pkg.rateBuckets = RC_DEFAULT_RATE_BUCKETS.map(b => ({...b, id:_rcId()})); changed = true; }
        (pkg.rateBuckets || []).forEach(bucket => {
          const months = Number(bucket.maxMonths) || 0;
          const label = `≤ ${months} tháng`;
          if (!bucket.label || bucket.label !== label) { bucket.label = label; changed = true; }
          if (bucket.note === undefined) { bucket.note = ''; changed = true; }
        });
        pkg.rateBuckets = RateRuleEngine.normalizeBuckets(pkg.rateBuckets);
        if (!pkg.feeRules)    { pkg.feeRules    = RC_DEFAULT_FEE_RULES.map(r => ({...r, id:_rcId()})); changed = true; }
        if (!pkg.graceRules)  { pkg.graceRules  = { ...RC_DEFAULT_GRACE_RULES }; changed = true; }
        if (!pkg.interestSupportRules) { pkg.interestSupportRules = { ...RC_DEFAULT_INTEREST_SUPPORT_RULES }; changed = true; }
        Object.keys(RC_DEFAULT_INTEREST_SUPPORT_RULES).forEach(key => {
          if (pkg.interestSupportRules[key] === undefined) {
            pkg.interestSupportRules[key] = RC_DEFAULT_INTEREST_SUPPORT_RULES[key];
            changed = true;
          }
        });
        if (!pkg.rateAdjustments) { pkg.rateAdjustments = []; changed = true; }
        if (!pkg.projectExceptions)     { pkg.projectExceptions = []; changed = true; }
        if (!pkg.eligibilityConditions) { pkg.eligibilityConditions = []; changed = true; }
        if (!pkg.tiers)       { pkg.tiers = []; changed = true; }
        if (!pkg.conditions)  { pkg.conditions = []; changed = true; }
        if (!pkg.customFields){ pkg.customFields = []; changed = true; }
      });
    });
    if (changed) this.save();
  },

  // ── Projects Panel ──────────────────────────────────────────
  renderProjects() {
    const el = document.getElementById('rc-project-list');
    if (!el) return;
    const projects = RateCenterState.projects;
    if (!projects.length) {
      el.innerHTML = `<div class="rc-empty"><span class="rc-empty-icon">🏗️</span>Chưa có dự án nào.<br>Nhấn <b>+ Thêm</b> để tạo.</div>`;
      return;
    }
    el.innerHTML = projects.map(p => {
      const active = RateCenterState.selectedProject === p.id ? ' active' : '';
      const pkgCount = (p.packages||[]).length;
      return `<div class="rc-item${active}" onclick="RateCenter.selectProject('${p.id}')">
        <div class="rc-item-icon" style="background:${p.color};">${p.icon||'🏢'}</div>
        <div class="rc-item-info">
          <span class="rc-item-name">${_rcEsc(p.name)}</span>
          <span class="rc-item-meta">${pkgCount} chính sách</span>
        </div>
        <div class="rc-item-actions">
          <button class="rc-act-btn" onclick="event.stopPropagation();RateCenter.editProject('${p.id}')" title="Sửa">✎</button>
          <button class="rc-act-btn del" onclick="event.stopPropagation();RateCenter.deleteProject('${p.id}')" title="Xóa">✕</button>
        </div>
      </div>`;
    }).join('');
  },

  selectProject(id) {
    RateCenterState.selectedProject = id;
    RateCenterState.selectedPackage = null;
    this.save();
    this.renderProjects();
    this.renderPackages(id);
    this.renderDetail(id, null);
  },

  // ── Name modal helpers (replaces prompt()) ──────────────────
  _nameModalCb: null,

  _showNameModal(title, defaultVal, cb) {
    const modal = document.getElementById('rc-name-modal');
    const titleEl = document.getElementById('rc-name-modal-title');
    const input = document.getElementById('rc-name-modal-input');
    if (!modal) { const v = prompt(title, defaultVal); cb(v); return; }
    titleEl.textContent = title;
    input.value = defaultVal || '';
    modal.style.display = 'flex';
    this._nameModalCb = cb;
    setTimeout(() => input.focus(), 80);
  },

  _closeNameModal(value) {
    const modal = document.getElementById('rc-name-modal');
    if (modal) modal.style.display = 'none';
    if (typeof this._nameModalCb === 'function') {
      const cb = this._nameModalCb;
      this._nameModalCb = null;
      cb(value);
    }
  },

  addProject() {
    this._showNameModal('Tên dự án mới', '', name => {
      if (!name || !name.trim()) return;
      const color = RC_COLORS[RateCenterState.projects.length % RC_COLORS.length];
      const icon  = RC_PROJECT_ICONS[RateCenterState.projects.length % RC_PROJECT_ICONS.length];
      const proj = { id: _rcId(), name: name.trim(), color, icon, packages: [] };
      RateCenterState.projects.push(proj);
      this.save();
      this.selectProject(proj.id);
      if (typeof App !== 'undefined') App.toast('Đã thêm dự án', 'success');
    });
  },

  editProject(id) {
    const p = RateCenterState.projects.find(x => x.id === id);
    if (!p) return;
    this._showNameModal('Đổi tên dự án', p.name, name => {
      if (!name || !name.trim()) return;
      p.name = name.trim();
      this.save();
      this.renderProjects();
    });
  },

  deleteProject(id) {
    if (!confirm('Xóa dự án này và toàn bộ chính sách?')) return;
    RateCenterState.projects = RateCenterState.projects.filter(p => p.id !== id);
    if (RateCenterState.selectedProject === id) {
      RateCenterState.selectedProject = null;
      RateCenterState.selectedPackage = null;
    }
    this.save();
    this.render();
  },

  // ── Packages Panel ──────────────────────────────────────────
  renderPackages(projectId) {
    const hintEl  = document.getElementById('rc-pkg-hint');
    const titleEl = document.getElementById('rc-pkg-panel-title');
    const addBtn  = document.getElementById('rc-add-pkg-btn');
    const listEl  = document.getElementById('rc-package-list');
    if (!listEl) return;
    const proj = RateCenterState.projects.find(p => p.id === projectId);
    if (!proj) {
      if (titleEl) titleEl.textContent = 'Chính sách';
      if (hintEl)  hintEl.textContent  = '← Chọn dự án';
      if (addBtn)  addBtn.style.display = 'none';
      listEl.innerHTML = '';
      return;
    }
    if (titleEl) titleEl.textContent = proj.name;
    if (hintEl)  hintEl.textContent  = `Chính sách của ${proj.name}`;
    if (addBtn)  addBtn.style.display = '';
    const pkgs = proj.packages || [];
    if (!pkgs.length) {
      listEl.innerHTML = `<div class="rc-empty"><span class="rc-empty-icon">📦</span>Chưa có chính sách.<br>Nhấn <b>+ Chính sách</b>.</div>`;
      return;
    }
    listEl.innerHTML = pkgs.map(pkg => {
      const active = RateCenterState.selectedPackage === pkg.id ? ' active' : '';
      const bCount = (pkg.rateBuckets||[]).filter(b=>b.rate).length;
      return `<div class="rc-item${active}" onclick="RateCenter.selectPackage('${projectId}','${pkg.id}')">
        <div class="rc-pkg-dot" style="background:${pkg.color||proj.color};width:10px;height:10px;border-radius:50%;flex-shrink:0;"></div>
        <div class="rc-item-info">
          <span class="rc-item-name">${_rcEsc(pkg.name)}</span>
          <span class="rc-item-meta">${bCount} bucket lãi suất đã nhập</span>
        </div>
        <div class="rc-item-actions">
          <button class="rc-act-btn" onclick="event.stopPropagation();RateCenter.editPackage('${projectId}','${pkg.id}')" title="Sửa">✎</button>
          <button class="rc-act-btn del" onclick="event.stopPropagation();RateCenter.deletePackage('${projectId}','${pkg.id}')" title="Xóa">✕</button>
        </div>
      </div>`;
    }).join('');
  },

  selectPackage(projectId, pkgId) {
    RateCenterState.selectedProject = projectId;
    RateCenterState.selectedPackage = pkgId;
    RateCenterState.activeTab = 'buckets';
    this.save();
    this.renderProjects();
    this.renderPackages(projectId);
    this.renderDetail(projectId, pkgId);
  },

  addPackage() {
    const proj = RateCenterState.projects.find(p => p.id === RateCenterState.selectedProject);
    if (!proj) return;
    this._showNameModal('Tên chính sách bán hàng mới', '', name => {
      if (!name || !name.trim()) return;
      const colors = ['#6366f1','#8b5cf6','#10b981','#f59e0b','#ec4899','#06b6d4'];
      const pkg = {
        id: _rcId(),
        name: name.trim(),
        color: colors[(proj.packages||[]).length % colors.length],
        fields: RC_DEFAULT_FIELDS.map(f => ({ ...f, value: '' })),
        rateBuckets: RC_DEFAULT_RATE_BUCKETS.map(b => ({...b, id:_rcId()})),
        feeRules: RC_DEFAULT_FEE_RULES.map(r => ({...r, id:_rcId()})),
        graceRules: { ...RC_DEFAULT_GRACE_RULES },
        interestSupportRules: { ...RC_DEFAULT_INTEREST_SUPPORT_RULES },
        projectExceptions: [],
        eligibilityConditions: [],
        tiers: [],
        conditions: [],
        customFields: [],
      };
      const pf = pkg.fields.find(f => f.id === 'f_policy_name');
      if (pf) pf.value = pkg.name;
      if (!proj.packages) proj.packages = [];
      proj.packages.push(pkg);
      this.save();
      this.selectPackage(proj.id, pkg.id);
      if (typeof App !== 'undefined') App.toast('Đã thêm chính sách', 'success');
    });
  },

  editPackage(projectId, pkgId) {
    const proj = RateCenterState.projects.find(p => p.id === projectId);
    if (!proj) return;
    const pkg = (proj.packages||[]).find(k => k.id === pkgId);
    if (!pkg) return;
    this._showNameModal('Đổi tên chính sách', pkg.name, name => {
      if (!name || !name.trim()) return;
      pkg.name = name.trim();
      const pf = (pkg.fields||[]).find(f => f.id === 'f_policy_name');
      if (pf) pf.value = pkg.name;
      this.save();
      this.renderPackages(projectId);
      this.renderDetail(projectId, pkgId);
    });
  },

  deletePackage(projectId, pkgId) {
    if (!confirm('Xóa chính sách này?')) return;
    const proj = RateCenterState.projects.find(p => p.id === projectId);
    if (!proj) return;
    proj.packages = (proj.packages||[]).filter(k => k.id !== pkgId);
    if (RateCenterState.selectedPackage === pkgId) RateCenterState.selectedPackage = null;
    this.save();
    this.renderPackages(projectId);
    this.renderDetail(projectId, null);
  },

  _getPkg(projectId, pkgId) {
    const proj = RateCenterState.projects.find(p => p.id === projectId);
    return proj && (proj.packages||[]).find(k => k.id === pkgId);
  },

  // ── Detail Panel with 5 Tabs ────────────────────────────────
  renderDetail(projectId, pkgId) {
    const titleEl   = document.getElementById('rc-detail-title');
    const hintEl    = document.getElementById('rc-detail-hint');
    const actionsEl = document.getElementById('rc-detail-actions');
    const areaEl    = document.getElementById('rc-detail-area');
    if (!areaEl) return;
    const proj = RateCenterState.projects.find(p => p.id === projectId);
    const pkg  = proj && (proj.packages||[]).find(k => k.id === pkgId);
    if (!pkg) {
      if (titleEl)   titleEl.textContent = 'Chi tiết chính sách';
      if (hintEl)    hintEl.textContent  = '← Chọn chính sách';
      if (actionsEl) actionsEl.innerHTML = '';
      areaEl.innerHTML = `<div class="rc-empty" style="margin:40px auto;"><span class="rc-empty-icon">💰</span><b>Chọn một chính sách</b> từ danh sách để xem chi tiết.</div>`;
      return;
    }
    if (titleEl)   titleEl.textContent = pkg.name;
    if (hintEl)    hintEl.textContent  = '';

    const tab = RateCenterState.activeTab || 'buckets';
    const tabs = [
      { key:'info',       icon:'📋', label:'Thông số' },
      { key:'buckets',    icon:'📈', label:'Bảng lãi suất' },
      { key:'support',    icon:'🤝', label:'Hỗ trợ & Phí' },
      { key:'grace',      icon:'⏳', label:'Ân hạn gốc' },
      { key:'adjustments',icon:'⚡', label:'Điều chỉnh lãi suất' },
      { key:'exceptions', icon:'🚫', label:'Ngoại lệ' },
    ];

    const tabsHtml = `<div class="rc-tabs">${tabs.map(t =>
      `<button class="rc-tab${tab===t.key?' active':''}" onclick="RateCenter.switchTab('${projectId}','${pkgId}','${t.key}')">${t.icon} ${t.label}</button>`
    ).join('')}</div>`;

    let contentHtml = '';
    if (tab === 'info')        contentHtml = this._renderTabInfo(projectId, pkgId, pkg);
    if (tab === 'buckets')     contentHtml = this._renderTabBuckets(projectId, pkgId, pkg);
    if (tab === 'support')     contentHtml = this._renderTabSupport(projectId, pkgId, pkg);
    if (tab === 'grace')       contentHtml = this._renderTabGrace(projectId, pkgId, pkg);
    if (tab === 'adjustments') contentHtml = this._renderTabAdjustments(projectId, pkgId, pkg);
    if (tab === 'exceptions')  contentHtml = this._renderTabExceptions(projectId, pkgId, pkg);

    areaEl.innerHTML = tabsHtml + contentHtml;

    // Update actions bar
    if (actionsEl) {
      actionsEl.innerHTML = `
        <button class="md-cfg-add-btn" onclick="RateCenter.runRulePreview('${projectId}','${pkgId}')">
          ▶ Chạy Rule Preview
        </button>`;
    }
  },

  switchTab(projectId, pkgId, tabKey) {
    RateCenterState.activeTab = tabKey;
    this.renderDetail(projectId, pkgId);
  },

  // Tab 1: Thông số cơ bản
  _renderTabInfo(projectId, pkgId, pkg) {
    const fields = pkg.fields || RC_DEFAULT_FIELDS.map(f => ({...f, value:''}));
    const fieldsHtml = fields.map(f => `
      <div class="rc-field-item">
        <label class="rc-field-label">${_rcEsc(f.label)} <small style="color:var(--text-muted)">(${f.unit||''})</small></label>
        <input class="rc-field-input" type="${f.type==='percent'||f.type==='number'?'number':(f.type==='date'?'date':'text')}"
          step="0.01" value="${_rcEsc(f.value||'')}" placeholder="Nhập..."
          onchange="RateCenter.setFieldVal('${projectId}','${pkgId}','${f.id}',this.value)">
      </div>`).join('');
    return `<div class="rc-detail-section"><div class="rc-detail-section-title">📋 Thông số chính sách</div>
      <div class="rc-fields-grid">${fieldsHtml}</div></div>`;
  },

  // Tab 2: Bảng lãi suất (Rate Buckets)
  _renderTabBuckets(projectId, pkgId, pkg) {
    const buckets = RateRuleEngine.normalizeBuckets(pkg.rateBuckets || RC_DEFAULT_RATE_BUCKETS);
    const rows = buckets.map(b => {
      const effective = RateRuleEngine.resolveEffectiveBucket(buckets, b) || b;
      const inheritedLabel = effective.inherited
        ? `<span class="rc-inherited-badge">Kế thừa ${_rcEsc(effective.effectiveSourceLabel)}</span>`
        : '';
      return `
      <tr>
        <td>
          <div class="rc-bucket-month-cell">
            <span class="rc-bucket-prefix">≤</span>
            <input class="rc-tier-input rc-bucket-month-input" type="number" min="1" step="1" value="${_rcEsc(b.maxMonths||'')}"
              onchange="RateCenter.setBucketVal('${projectId}','${pkgId}','${b.id}','maxMonths',this.value)">
            <span class="rc-bucket-suffix">tháng</span>
          </div>
        </td>
        <td><input class="rc-tier-input" type="number" step="0.01" value="${_rcEsc(b.rate||'')}" placeholder="VD: 0"
          onchange="RateCenter.setBucketVal('${projectId}','${pkgId}','${b.id}','rate',this.value)"> %/năm</td>
        <td><input class="rc-tier-input" type="number" step="0.01" value="${_rcEsc(b.margin||'')}" placeholder="VD: 3.5"
          onchange="RateCenter.setBucketVal('${projectId}','${pkgId}','${b.id}','margin',this.value)"> %</td>
        <td>
          <div class="rc-effective-rate">
            ${inheritedLabel}
            <input class="rc-tier-input" value="${_rcEsc(b.note||'')}" placeholder="Ghi chú..."
              onchange="RateCenter.setBucketVal('${projectId}','${pkgId}','${b.id}','note',this.value)">
          </div>
        </td>
        <td><button class="rc-tier-del" onclick="RateCenter.deleteBucket('${projectId}','${pkgId}','${b.id}')" title="Xóa bucket">✕</button></td>
      </tr>`;
    }).join('');

    return `<div class="rc-detail-section">
      <div class="rc-detail-section-title">📈 Bảng lãi suất theo thời gian áp dụng
        <button onclick="RateCenter.addBucket('${projectId}','${pkgId}')"
          style="margin-left:auto;padding:3px 10px;border-radius:6px;border:1px dashed rgba(99,102,241,0.3);
          background:transparent;color:var(--accent);font-size:0.72rem;cursor:pointer;font-family:inherit;">
          + Thêm bucket
        </button>
        <span style="margin-left:8px;font-size:0.68rem;color:var(--text-muted);font-weight:400;text-transform:none;">
          Rule: chọn bucket nhỏ nhất có maxMonths ≥ thời gian áp dụng
        </span>
      </div>
      <div class="rc-bucket-info">
        ℹ️ Bảng này chỉ quản lý <b>mức lãi suất ngân hàng</b>, <b>biên độ</b> và <b>thời gian áp dụng</b>. Hỗ trợ lãi suất và phí TNTH là cấu hình chung cấp chính sách tại tab <b>Hỗ trợ & Phí</b>.
      </div>
      <div style="overflow-x:auto;">
      <table class="rc-tiers-table">
        <thead><tr>
          <th>Áp dụng đến</th>
          <th>Lãi suất</th>
          <th>Biên độ</th>
          <th>Ghi chú</th>
          <th></th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      </div></div>`;
  },

  // Tab 3: Nghĩa vụ trả lãi giữa Chủ đầu tư và Khách hàng
  _renderTabSupport(projectId, pkgId, pkg) {
    const rules = { ...RC_DEFAULT_INTEREST_SUPPORT_RULES, ...(pkg.interestSupportRules || {}) };
    const fees = pkg.feeRules || RC_DEFAULT_FEE_RULES;
    const feeRows = fees.map(f => `
      <div class="rc-fee-row">
        <div class="rc-fee-phase">${_rcEsc(f.label)}</div>
        <div class="rc-fee-input-wrap">
          <input class="rc-tier-input" type="number" step="0.01" value="${_rcEsc(f.fee||'')}" placeholder="VD: 0.5"
            onchange="RateCenter.setFeeVal('${projectId}','${pkgId}','${f.id}',this.value)">
          <span class="rc-fee-unit">%</span>
        </div>
      </div>`).join('');
    return `<div class="rc-detail-section">
      <div class="rc-detail-section-title">🤝 Cấu hình chính sách hỗ trợ lãi & phí TNTH</div>
      <div class="rc-bucket-info">
        💡 Đây là layer cấu hình cấp <b>chính sách bán hàng</b>. Chỉ cần bật <b>Hỗ trợ lãi suất</b> một lần tại đây; khi chọn chính sách bán hàng, hệ thống sẽ lấy kèm chính sách hỗ trợ lãi suất và phí TNTH đã cấu hình.
      </div>
      <div class="rc-fields-grid" style="margin-top:12px;">
        <div class="rc-field-item" style="grid-column:1/-1">
          <label class="rc-field-label">Hỗ trợ lãi suất</label>
          <label style="display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid rgba(99,102,241,0.14);border-radius:10px;background:rgba(99,102,241,0.04);cursor:pointer;">
            <input type="checkbox" ${rules.enabled!==false?'checked':''}
              onchange="RateCenter.setSupportVal('${projectId}','${pkgId}','enabled',this.checked)">
            <span style="font-size:0.86rem;color:var(--text-secondary);">Áp dụng chính sách hỗ trợ lãi suất cho chính sách bán hàng này</span>
          </label>
        </div>
        <div class="rc-field-item">
          <label class="rc-field-label">Mã chính sách hỗ trợ lãi suất</label>
          <input class="rc-field-input" value="${_rcEsc(rules.supportPolicyCode||'')}" placeholder="VD: HTLS-ECO-24"
            onchange="RateCenter.setSupportVal('${projectId}','${pkgId}','supportPolicyCode',this.value)">
        </div>
        <div class="rc-field-item">
          <label class="rc-field-label">Tên chính sách hỗ trợ lãi suất</label>
          <input class="rc-field-input" value="${_rcEsc(rules.supportPolicyName||'')}" placeholder="VD: CĐT hỗ trợ lãi 24 tháng"
            onchange="RateCenter.setSupportVal('${projectId}','${pkgId}','supportPolicyName',this.value)">
        </div>
        <div class="rc-field-item">
          <label class="rc-field-label">Thời gian CĐT trả lãi mặc định <small style="color:var(--text-muted)">(tháng)</small></label>
          <input class="rc-field-input" type="number" min="0" step="1" value="${_rcEsc(rules.defaultSupportMonths||'')}"
            placeholder="VD: 24"
            onchange="RateCenter.setSupportVal('${projectId}','${pkgId}','defaultSupportMonths',this.value)">
        </div>
        <div class="rc-field-item">
          <label class="rc-field-label">Bên trả lãi trong thời gian hỗ trợ</label>
          <input class="rc-field-input" value="${_rcEsc(rules.supportPayer||'Chủ đầu tư')}"
            onchange="RateCenter.setSupportVal('${projectId}','${pkgId}','supportPayer',this.value)">
        </div>
        <div class="rc-field-item">
          <label class="rc-field-label">Bên trả lãi sau hỗ trợ</label>
          <input class="rc-field-input" value="${_rcEsc(rules.customerPayer||'Khách hàng')}"
            onchange="RateCenter.setSupportVal('${projectId}','${pkgId}','customerPayer',this.value)">
        </div>
        <div class="rc-field-item">
          <label class="rc-field-label">Bên trả nợ gốc</label>
          <input class="rc-field-input" value="${_rcEsc(rules.principalPayer||'Khách hàng')}"
            onchange="RateCenter.setSupportVal('${projectId}','${pkgId}','principalPayer',this.value)">
        </div>
        <div class="rc-field-item">
          <label class="rc-field-label">Mã chính sách phí TNTH</label>
          <input class="rc-field-input" value="${_rcEsc(rules.feePolicyCode||'')}" placeholder="VD: TNTH-STD"
            onchange="RateCenter.setSupportVal('${projectId}','${pkgId}','feePolicyCode',this.value)">
        </div>
        <div class="rc-field-item">
          <label class="rc-field-label">Tên chính sách phí TNTH</label>
          <input class="rc-field-input" value="${_rcEsc(rules.feePolicyName||'')}" placeholder="VD: Phí TNTH theo giai đoạn hỗ trợ"
            onchange="RateCenter.setSupportVal('${projectId}','${pkgId}','feePolicyName',this.value)">
        </div>
        <div class="rc-field-item" style="grid-column:1/-1">
          <label class="rc-field-label">Nguyên tắc trả nợ gốc</label>
          <input class="rc-field-input" value="${_rcEsc(rules.principalRule||'')}"
            onchange="RateCenter.setSupportVal('${projectId}','${pkgId}','principalRule',this.value)">
        </div>
        <div class="rc-field-item" style="grid-column:1/-1">
          <label class="rc-field-label">Ghi chú hỗ trợ lãi</label>
          <input class="rc-field-input" value="${_rcEsc(rules.note||'')}" placeholder="VD: CĐT hỗ trợ theo từng lần giải ngân..."
            onchange="RateCenter.setSupportVal('${projectId}','${pkgId}','note',this.value)">
        </div>
      </div>

      <div class="rc-detail-section-title" style="margin-top:22px;">💼 Phí TNTH cấp chính sách</div>
      <div class="rc-bucket-info">
        ℹ️ Phí TNTH là cấu hình cấp chính sách, không phụ thuộc từng bucket. Rule Engine tự xác định giai đoạn dựa trên tháng hiện tại so với thời gian CĐT hỗ trợ và mốc T60.
      </div>
      <div class="rc-fee-list">${feeRows}</div>
    </div>`;
  },

  // Tab 3: Ân hạn gốc
  _renderTabGrace(projectId, pkgId, pkg) {
    const gr = pkg.graceRules || RC_DEFAULT_GRACE_RULES;
    return `<div class="rc-detail-section">
      <div class="rc-detail-section-title">⏳ Rule tính Ân hạn gốc tối đa</div>
      <div class="rc-grace-grid">
        <div class="rc-field-item">
          <label class="rc-field-label">Ân hạn cơ bản (tháng)</label>
          <input class="rc-field-input" type="number" min="0" value="${_rcEsc(gr.baseMonths||0)}"
            onchange="RateCenter.setGraceVal('${projectId}','${pkgId}','baseMonths',this.value)">
        </div>
        <div class="rc-field-item">
          <label class="rc-field-label">Có hỗ trợ lãi từ CĐT → ân hạn đầy đủ?</label>
          <select class="rc-field-input" onchange="RateCenter.setGraceVal('${projectId}','${pkgId}','withHTLS',this.value==='true')">
            <option value="true"  ${gr.withHTLS?'selected':''}>Có</option>
            <option value="false" ${!gr.withHTLS?'selected':''}>Không</option>
          </select>
        </div>
        <div class="rc-field-item">
          <label class="rc-field-label">Có ân hạn gốc bổ sung?</label>
          <select class="rc-field-input" onchange="RateCenter.setGraceVal('${projectId}','${pkgId}','withSupplement',this.value==='true')">
            <option value="false" ${!gr.withSupplement?'selected':''}>Không</option>
            <option value="true"  ${gr.withSupplement?'selected':''}>Có</option>
          </select>
        </div>
        <div class="rc-field-item">
          <label class="rc-field-label">Áp dụng tối đa theo nhóm dự án?</label>
          <select class="rc-field-input" onchange="RateCenter.setGraceVal('${projectId}','${pkgId}','useMaxByGroup',this.value==='true')">
            <option value="false" ${!gr.useMaxByGroup?'selected':''}>Không (giới hạn = thời gian hỗ trợ lãi)</option>
            <option value="true"  ${gr.useMaxByGroup?'selected':''}>Có (theo nhóm)</option>
          </select>
        </div>
        ${gr.useMaxByGroup ? `
        <div class="rc-field-item">
          <label class="rc-field-label">Nhóm A – tối đa (tháng)</label>
          <input class="rc-field-input" type="number" min="0" value="${_rcEsc((gr.maxByGroup||{}).A||36)}"
            onchange="RateCenter.setGraceGroup('${projectId}','${pkgId}','A',this.value)">
        </div>
        <div class="rc-field-item">
          <label class="rc-field-label">Nhóm B – tối đa (tháng)</label>
          <input class="rc-field-input" type="number" min="0" value="${_rcEsc((gr.maxByGroup||{}).B||24)}"
            onchange="RateCenter.setGraceGroup('${projectId}','${pkgId}','B',this.value)">
        </div>
        <div class="rc-field-item">
          <label class="rc-field-label">Nhóm mặc định – tối đa (tháng)</label>
          <input class="rc-field-input" type="number" min="0" value="${_rcEsc((gr.maxByGroup||{}).default||0)}"
            onchange="RateCenter.setGraceGroup('${projectId}','${pkgId}','default',this.value)">
        </div>` : ''}
        <div class="rc-field-item" style="grid-column:1/-1">
          <label class="rc-field-label">Ghi chú rule ân hạn</label>
          <input class="rc-field-input" value="${_rcEsc(gr.note||'')}" placeholder="VD: Áp dụng từ đợt giải ngân 2..."
            onchange="RateCenter.setGraceVal('${projectId}','${pkgId}','note',this.value)">
        </div>
      </div>
      <div class="rc-bucket-info" style="margin-top:12px;">
        💡 <b>Logic:</b> Nếu có ngoại lệ dự án → dùng theo ngoại lệ. Nếu có nhóm → dùng max nhóm. Còn lại → không vượt quá thời gian hỗ trợ lãi.
      </div>
    </div>`;
  },

  // Tab ⚡: Điều chỉnh lãi suất bổ sung (Rate Adjustment Rules)
  _renderTabAdjustments(projectId, pkgId, pkg) {
    const rules = pkg.rateAdjustments || [];
    // Lấy danh sách tên cột từ Master Data entities làm gợi ý
    const mdEntities = (typeof MasterDataState !== 'undefined' && MasterDataState.entities) ? MasterDataState.entities : [];
    const allFieldLabels = [];
    mdEntities.forEach(ent => (ent.columns||[]).forEach(col => {
      if (col.name && !allFieldLabels.includes(col.name)) allFieldLabels.push(col.name);
    }));
    // Thêm một số gợi ý mặc định
    ['Xếp hạng khách hàng','Hạng khách hàng','Loại hình vay','Mục đích vay',
     'Nhóm nợ','Tình trạng pháp lý tài sản','Loại tài sản đảm bảo'].forEach(f => {
      if (!allFieldLabels.includes(f)) allFieldLabels.push(f);
    });
    const fieldOpts = allFieldLabels.map(f => `<option value="${_rcEsc(f)}">${_rcEsc(f)}</option>`).join('');
    const opOpts = [
      ['equals','= Bằng'],['not_equals','≠ Khác'],['contains','⊃ Chứa'],
      ['starts_with','→ Bắt đầu bằng'],['gt','> Lớn hơn'],['gte','≥ Lớn hơn hoặc bằng'],
      ['lt','< Nhỏ hơn'],['lte','≤ Nhỏ hơn hoặc bằng'],['in_list','∈ Trong danh sách'],
    ].map(([v,l]) => `<option value="${v}">${l}</option>`).join('');

    const rulesHtml = rules.map((rule, ri) => {
      const condsHtml = (rule.conditions||[]).map((cond, ci) => `
        <div class="rc-adj-cond-row">
          <select class="rc-tier-input rc-adj-select" style="max-width:180px;"
            onchange="RateCenter.setAdjVal('${projectId}','${pkgId}','${rule.id}','cond_field_${ci}',this.value)"
            title="Trường dữ liệu hợp đồng">
            <option value="">-- Chọn trường --</option>
            ${allFieldLabels.map(f => `<option value="${_rcEsc(f)}"${cond.field===f?' selected':''}>${_rcEsc(f)}</option>`).join('')}
          </select>
          <select class="rc-tier-input rc-adj-select" style="max-width:150px;"
            onchange="RateCenter.setAdjVal('${projectId}','${pkgId}','${rule.id}','cond_op_${ci}',this.value)"
            title="Toán tử so sánh">
            ${[['equals','= Bằng'],['not_equals','≠ Khác'],['contains','⊃ Chứa'],
               ['starts_with','→ Bắt đầu bằng'],['gt','> Lớn hơn'],['gte','≥ ≥'],
               ['lt','< Nhỏ hơn'],['lte','≤ ≤'],['in_list','∈ Trong DS (dấu phẩy)'],
              ].map(([v,l]) => `<option value="${v}"${cond.operator===v?' selected':''}>${l}</option>`).join('')}
          </select>
          <input class="rc-tier-input" style="max-width:160px;" value="${_rcEsc(cond.value||'')}"
            placeholder="Giá trị so sánh" title="Giá trị cần khớp"
            onchange="RateCenter.setAdjVal('${projectId}','${pkgId}','${rule.id}','cond_val_${ci}',this.value)">
          <button class="rc-tier-del" style="opacity:1;" title="Xóa điều kiện"
            onclick="RateCenter.deleteAdjCondition('${projectId}','${pkgId}','${rule.id}',${ci})">✕</button>
        </div>`).join('');

      const sign = parseFloat(rule.rateDelta||0) >= 0 ? '+' : '';
      return `
      <div class="rc-adj-rule-card">
        <div class="rc-adj-rule-header">
          <span class="rc-adj-badge">⚡ Rule ${ri+1}</span>
          <input class="rc-tier-input rc-adj-name" value="${_rcEsc(rule.name||'')}" placeholder="Tên rule (VD: KH xếp hạng C)"
            onchange="RateCenter.setAdjVal('${projectId}','${pkgId}','${rule.id}','name',this.value)">
          <div class="rc-adj-delta-wrap">
            <span style="font-size:0.72rem;color:var(--text-muted);">Cộng thêm:</span>
            <input class="rc-tier-input" type="number" step="0.01" style="max-width:80px;font-weight:700;color:#f59e0b;"
              value="${_rcEsc(rule.rateDelta||'')}" placeholder="VD: 0.5"
              title="Biên lãi suất bổ sung (%/năm). Dương = tăng, âm = giảm"
              onchange="RateCenter.setAdjVal('${projectId}','${pkgId}','${rule.id}','rateDelta',this.value)">
            <span style="font-size:0.82rem;color:#f59e0b;font-weight:700;">%/năm</span>
          </div>
          <button class="rc-act-btn del" title="Xóa rule"
            onclick="RateCenter.deleteAdjustment('${projectId}','${pkgId}','${rule.id}')">✕</button>
        </div>
        <div class="rc-adj-conds-wrap">
          <div class="rc-adj-conds-label">Khi TẤT CẢ điều kiện sau đây khớp:</div>
          <div class="rc-adj-conds-list" id="rc-adj-conds-${rule.id}">
            ${condsHtml || '<div style="color:var(--text-muted);font-size:0.75rem;padding:4px 0;">← Chưa có điều kiện nào</div>'}
          </div>
          <button class="rc-adj-add-cond-btn"
            onclick="RateCenter.addAdjCondition('${projectId}','${pkgId}','${rule.id}')">
            + Thêm điều kiện
          </button>
        </div>
        <div class="rc-adj-note-row">
          <input class="rc-tier-input" value="${_rcEsc(rule.note||'')}" placeholder="Ghi chú rule..."
            onchange="RateCenter.setAdjVal('${projectId}','${pkgId}','${rule.id}','note',this.value)">
        </div>
      </div>`;
    }).join('');

    return `<div class="rc-detail-section">
      <div class="rc-detail-section-title">⚡ Điều chỉnh lãi suất theo điều kiện hợp đồng
        <button onclick="RateCenter.addAdjustment('${projectId}','${pkgId}')"
          style="margin-left:auto;padding:4px 12px;border-radius:7px;border:1px dashed rgba(245,158,11,0.4);
          background:rgba(245,158,11,0.08);color:#f59e0b;font-size:0.75rem;cursor:pointer;font-family:inherit;font-weight:600;">
          + Thêm rule điều chỉnh
        </button>
      </div>
      <div class="rc-bucket-info" style="border-left-color:rgba(245,158,11,0.5);">
        ⚡ Mỗi <b>rule</b> gồm một hoặc nhiều điều kiện (AND). Nếu tất cả khớp với dữ liệu hợp đồng → lãi suất sẽ được cộng thêm biên tương ứng.
        Nhiều rule có thể cùng khớp → biên sẽ được cộng dồn vào lãi suất gốc từ bảng bucket.
      </div>
      ${!rules.length ? `<div class="rc-empty" style="padding:24px;">
        <span class="rc-empty-icon">⚡</span>
        Chưa có rule nào. Nhấn <b>+ Thêm rule điều chỉnh</b> để tạo.
      </div>` : rulesHtml}
    </div>`;
  },

  // ── CRUD: Rate Adjustment Rules ──────────────────────────────
  _getAdj(projectId, pkgId) {
    const proj = RateCenterState.projects.find(p => p.id === projectId);
    const pkg  = (proj?.packages||[]).find(pk => pk.id === pkgId);
    return { proj, pkg };
  },

  addAdjustment(projectId, pkgId) {
    const { pkg } = this._getAdj(projectId, pkgId);
    if (!pkg) return;
    if (!pkg.rateAdjustments) pkg.rateAdjustments = [];
    pkg.rateAdjustments.push({
      id: _rcId(), name: '', rateDelta: 0.5, note: '',
      conditions: [{ field: '', operator: 'equals', value: '' }],
    });
    this.save();
    this.renderDetail(projectId, pkgId);
  },

  deleteAdjustment(projectId, pkgId, ruleId) {
    const { pkg } = this._getAdj(projectId, pkgId);
    if (!pkg) return;
    pkg.rateAdjustments = (pkg.rateAdjustments||[]).filter(r => r.id !== ruleId);
    this.save();
    this.renderDetail(projectId, pkgId);
  },

  addAdjCondition(projectId, pkgId, ruleId) {
    const { pkg } = this._getAdj(projectId, pkgId);
    if (!pkg) return;
    const rule = (pkg.rateAdjustments||[]).find(r => r.id === ruleId);
    if (!rule) return;
    if (!rule.conditions) rule.conditions = [];
    rule.conditions.push({ field: '', operator: 'equals', value: '' });
    this.save();
    this.renderDetail(projectId, pkgId);
  },

  deleteAdjCondition(projectId, pkgId, ruleId, condIdx) {
    const { pkg } = this._getAdj(projectId, pkgId);
    if (!pkg) return;
    const rule = (pkg.rateAdjustments||[]).find(r => r.id === ruleId);
    if (!rule) return;
    rule.conditions.splice(condIdx, 1);
    this.save();
    this.renderDetail(projectId, pkgId);
  },

  setAdjVal(projectId, pkgId, ruleId, key, value) {
    const { pkg } = this._getAdj(projectId, pkgId);
    if (!pkg) return;
    const rule = (pkg.rateAdjustments||[]).find(r => r.id === ruleId);
    if (!rule) return;
    // key: 'name' | 'rateDelta' | 'note' | 'cond_field_N' | 'cond_op_N' | 'cond_val_N'
    const condMatch = key.match(/^cond_(field|op|val)_(\d+)$/);
    if (condMatch) {
      const [, part, idxStr] = condMatch;
      const idx = parseInt(idxStr);
      if (!rule.conditions[idx]) return;
      if (part === 'field') rule.conditions[idx].field    = value;
      if (part === 'op')    rule.conditions[idx].operator = value;
      if (part === 'val')   rule.conditions[idx].value    = value;
    } else {
      rule[key] = key === 'rateDelta' ? parseFloat(value) || 0 : value;
    }
    this.save();
    // Không re-render để tránh mất focus
  },

  // Tab 5: Ngoại lệ dự án
  _renderTabExceptions(projectId, pkgId, pkg) {
    const exceptions = pkg.projectExceptions || [];
    const rows = exceptions.map(ex => `
      <div class="rc-exception-row">
        <input class="rc-cond-key" value="${_rcEsc(ex.projectName||'')}" placeholder="Tên dự án (VD: Onsen Ecopark)..."
          onchange="RateCenter.setExceptionVal('${projectId}','${pkgId}','${ex.id}','projectName',this.value)">
        <span class="rc-cond-sep">→ tối đa</span>
        <input class="rc-tier-input" type="number" min="0" style="width:80px" value="${_rcEsc(ex.maxGrace||'')}" placeholder="36"
          onchange="RateCenter.setExceptionVal('${projectId}','${pkgId}','${ex.id}','maxGrace',this.value)">
        <span style="font-size:0.78rem;color:var(--text-muted)">tháng ân hạn</span>
        <input class="rc-cond-val" value="${_rcEsc(ex.note||'')}" placeholder="Ghi chú..."
          onchange="RateCenter.setExceptionVal('${projectId}','${pkgId}','${ex.id}','note',this.value)">
        <button class="rc-cond-del" onclick="RateCenter.deleteException('${projectId}','${pkgId}','${ex.id}')">✕</button>
      </div>`).join('');
    return `<div class="rc-detail-section">
      <div class="rc-detail-section-title">🚫 Matrix ngoại lệ theo từng dự án
        <button onclick="RateCenter.addException('${projectId}','${pkgId}')"
          style="margin-left:auto;padding:3px 10px;border-radius:6px;border:1px dashed rgba(99,102,241,0.3);
          background:transparent;color:var(--accent);font-size:0.72rem;cursor:pointer;font-family:inherit;">
          + Thêm ngoại lệ
        </button>
      </div>
      <div class="rc-bucket-info">
        ℹ️ Các dự án liệt kê tại đây sẽ có rule ân hạn riêng, ưu tiên cao hơn rule nhóm.<br>
        Ví dụ: Onsen Ecopark ≤36T, Eco Central Park Vinh - Marina ≤24T, Six Senses ≤36T…
      </div>
      <div class="rc-conditions-list">
        ${rows || '<p style="font-size:0.78rem;color:var(--text-muted);font-style:italic;">Chưa có ngoại lệ nào. Nhấn + để thêm.</p>'}
      </div>
    </div>`;
  },

  // ── Value setters ────────────────────────────────────────────
  setFieldVal(projectId, pkgId, fieldId, value) {
    const pkg = this._getPkg(projectId, pkgId);
    if (!pkg) return;
    const f = (pkg.fields||[]).find(x => x.id === fieldId);
    if (f) f.value = value;
    if (fieldId === 'f_policy_name' && String(value||'').trim()) {
      pkg.name = String(value).trim();
    }
    this.save();
    this.renderPackages(projectId);
  },

  setBucketVal(projectId, pkgId, bucketId, key, value) {
    const pkg = this._getPkg(projectId, pkgId);
    if (!pkg) return;
    const b = (pkg.rateBuckets||[]).find(x => x.id === bucketId);
    if (b) {
      if (key === 'maxMonths') {
        const nextMonths = Math.max(1, Number(value) || 1);
        const duplicated = (pkg.rateBuckets || []).some(bucket => bucket.id !== bucketId && Number(bucket.maxMonths) === nextMonths);
        if (duplicated) {
          if (typeof App !== 'undefined') App.toast(`Bucket ≤ ${nextMonths} tháng đã tồn tại`, 'warning');
          this.renderDetail(projectId, pkgId);
          return;
        }
        b.maxMonths = nextMonths;
        b.label = `≤ ${nextMonths} tháng`;
      } else {
        b[key] = value;
      }
    }
    if (b && key === 'rate' && String(value || '').trim() !== '') {
      (pkg.rateBuckets || []).forEach(bucket => {
        const isSmallerBucket = Number(bucket.maxMonths) < Number(b.maxMonths);
        const isEmptyRate = bucket.rate === undefined || String(bucket.rate).trim() === '';
        if (isSmallerBucket && isEmptyRate) bucket.rate = value;
      });
    }
    pkg.rateBuckets = RateRuleEngine.normalizeBuckets(pkg.rateBuckets);
    this.save();
    if (key === 'maxMonths' || key === 'rate') this.renderDetail(projectId, pkgId);
  },

  addBucket(projectId, pkgId) {
    const pkg = this._getPkg(projectId, pkgId);
    if (!pkg) return;
    if (!pkg.rateBuckets) pkg.rateBuckets = [];
    const sorted = RateRuleEngine.normalizeBuckets(pkg.rateBuckets);
    const lastMonths = sorted.length ? Number(sorted[sorted.length - 1].maxMonths) || 0 : 0;
    const maxMonths = lastMonths + 6;
    pkg.rateBuckets.push({
      id: _rcId(),
      maxMonths,
      label: `≤ ${maxMonths} tháng`,
      rate: '',
      margin: '',
      note: ''
    });
    pkg.rateBuckets = RateRuleEngine.normalizeBuckets(pkg.rateBuckets);
    this.save();
    this.renderDetail(projectId, pkgId);
  },

  deleteBucket(projectId, pkgId, bucketId) {
    const pkg = this._getPkg(projectId, pkgId);
    if (!pkg || !pkg.rateBuckets) return;
    if (pkg.rateBuckets.length <= 1) {
      if (typeof App !== 'undefined') App.toast('Cần giữ ít nhất 1 bucket lãi suất', 'warning');
      return;
    }
    pkg.rateBuckets = pkg.rateBuckets.filter(bucket => bucket.id !== bucketId);
    pkg.rateBuckets = RateRuleEngine.normalizeBuckets(pkg.rateBuckets);
    this.save();
    this.renderDetail(projectId, pkgId);
  },

  setSupportVal(projectId, pkgId, key, value) {
    const pkg = this._getPkg(projectId, pkgId);
    if (!pkg) return;
    if (!pkg.interestSupportRules) pkg.interestSupportRules = { ...RC_DEFAULT_INTEREST_SUPPORT_RULES };
    pkg.interestSupportRules[key] = value;
    this.save();
    if (key === 'enabled') this.renderDetail(projectId, pkgId);
  },

  setFeeVal(projectId, pkgId, feeId, value) {
    const pkg = this._getPkg(projectId, pkgId);
    if (!pkg) return;
    const f = (pkg.feeRules||[]).find(x => x.id === feeId);
    if (f) f.fee = value;
    this.save();
  },

  setGraceVal(projectId, pkgId, key, value) {
    const pkg = this._getPkg(projectId, pkgId);
    if (!pkg) return;
    if (!pkg.graceRules) pkg.graceRules = { ...RC_DEFAULT_GRACE_RULES };
    pkg.graceRules[key] = value;
    this.save();
    this.renderDetail(projectId, pkgId);
  },

  setGraceGroup(projectId, pkgId, group, value) {
    const pkg = this._getPkg(projectId, pkgId);
    if (!pkg) return;
    if (!pkg.graceRules) pkg.graceRules = { ...RC_DEFAULT_GRACE_RULES };
    if (!pkg.graceRules.maxByGroup) pkg.graceRules.maxByGroup = {};
    pkg.graceRules.maxByGroup[group] = Number(value);
    this.save();
  },

  addException(projectId, pkgId) {
    const pkg = this._getPkg(projectId, pkgId);
    if (!pkg) return;
    if (!pkg.projectExceptions) pkg.projectExceptions = [];
    pkg.projectExceptions.push({ id: _rcId(), projectName: '', maxGrace: '', note: '' });
    this.save();
    this.renderDetail(projectId, pkgId);
  },

  setExceptionVal(projectId, pkgId, exId, key, value) {
    const pkg = this._getPkg(projectId, pkgId);
    if (!pkg) return;
    const ex = (pkg.projectExceptions||[]).find(x => x.id === exId);
    if (ex) ex[key] = value;
    this.save();
  },

  deleteException(projectId, pkgId, exId) {
    const pkg = this._getPkg(projectId, pkgId);
    if (!pkg) return;
    pkg.projectExceptions = (pkg.projectExceptions||[]).filter(x => x.id !== exId);
    this.save();
    this.renderDetail(projectId, pkgId);
  },

  // ── Rule Preview Modal ───────────────────────────────────────
  runRulePreview(projectId, pkgId) {
    const proj = RateCenterState.projects.find(p => p.id === projectId);
    const pkg  = proj && (proj.packages||[]).find(k => k.id === pkgId);
    if (!pkg) return;

    const htls = prompt('Thời gian hỗ trợ lãi suất (tháng):', '24');
    if (htls === null) return;
    const loanTerm = prompt('Tổng kỳ hạn vay (tháng, để trống nếu chưa có):', '240');
    if (loanTerm === null) return;
    const loanType = prompt('Loại khoản vay (HTLS / standard):', 'HTLS');
    if (loanType === null) return;
    const hasSupp = confirm('Có ân hạn gốc bổ sung?');
    const group = prompt('Nhóm dự án (A/B/để trống):', '');

    const input = {
      htlsMonths: Number(htls) || 0,
      cdtSupportMonths: Number(htls) || 0,
      loanTermMonths: Number(loanTerm) || 0,
      currentMonth: 1,
      hasHTLS: loanType === 'HTLS',
      hasSupplementGrace: hasSupp,
      projectGroup: group || '',
      loanType,
    };

    const result = RateRuleEngine.evaluate(pkg, proj, input);

    let msg = '=== KẾT QUẢ RULE ENGINE ===\n\n';
    Object.entries(result).forEach(([k, v]) => { msg += `${k}: ${v}\n`; });
    alert(msg);

    if (typeof App !== 'undefined') App.toast('Rule đã chạy, xem kết quả alert', 'success');
  },

  // ── Public API ───────────────────────────────────────────────
  getProjects() {
    this.load();
    this._ensureDataShape();
    return RateCenterState.projects || [];
  },

  getProjectPolicies(projectId) {
    const project = this.getProjects().find(item => item.id === projectId);
    return project ? (project.packages || []) : [];
  },

  getTemplateFields() {
    const fields = [
      'Dự án','Mã dự án','Chính sách bán hàng','Mã chính sách',
      'Thời gian áp dụng từ','Thời gian áp dụng đến','Trạng thái áp dụng',
      'Điều kiện đi kèm','Ghi chú chính sách',
      'Bucket HTLS','Bucket lãi suất','Lãi suất áp dụng','Lãi suất hiệu lực','Lãi suất bucket','Biên độ',
      'Nguồn bucket lãi suất','Kế thừa bucket lớn hơn','Có hỗ trợ lãi suất',
      'Mã chính sách hỗ trợ lãi suất','Chính sách hỗ trợ lãi suất',
      'Mã chính sách phí TNTH','Chính sách phí TNTH',
      'Thời gian CĐT trả lãi','Tháng khách hàng bắt đầu trả lãi',
      'Thời gian khách hàng trả lãi','Bên trả lãi hiện tại',
      'Lãi suất CĐT trả','Lãi suất khách hàng trả',
      'Nợ gốc do ai trả','Nguyên tắc trả nợ gốc',
      'Phí TNTH hiện hành','Giai đoạn TNTH',
      'Ân hạn gốc tối đa','Ghi chú rule','Điều kiện đủ',
    ];
    RC_DEFAULT_FIELDS.forEach(f => { if (!fields.includes(f.label)) fields.push(f.label); });
    return fields;
  },

  getTemplateData(projectId, pkgId, runtimeInput) {
    const project = this.getProjects().find(item => item.id === projectId);
    if (!project) return {};
    const pkg = (project.packages || []).find(item => item.id === pkgId);
    if (!pkg) return {};

    const data = { 'Dự án': project.name || '' };
    (pkg.fields || []).forEach(field => { data[field.label] = field.value || ''; });

    // Status
    const now = new Date();
    const from = data['Thời gian áp dụng từ'] ? new Date(data['Thời gian áp dụng từ']) : null;
    const to   = data['Thời gian áp dụng đến'] ? new Date(data['Thời gian áp dụng đến']) : null;
    let status = 'Không xác định';
    if (from && now < from) status = 'Sắp áp dụng';
    else if (to && now > to) status = 'Hết hiệu lực';
    else status = 'Đang áp dụng';
    data['Trạng thái áp dụng'] = status;

    // Rule engine derived fields
    if (runtimeInput) {
      const derived = RateRuleEngine.evaluate(pkg, project, runtimeInput);
      Object.assign(data, derived);
    }

    return data;
  },
};

RateCenter.load();
