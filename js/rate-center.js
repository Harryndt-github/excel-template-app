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
  { id:'rb_6',  maxMonths: 6,  rate:'', margin:'', label:'≤ 6 tháng' },
  { id:'rb_12', maxMonths: 12, rate:'', margin:'', label:'≤ 12 tháng' },
  { id:'rb_18', maxMonths: 18, rate:'', margin:'', label:'≤ 18 tháng' },
  { id:'rb_24', maxMonths: 24, rate:'', margin:'', label:'≤ 24 tháng' },
  { id:'rb_30', maxMonths: 30, rate:'', margin:'', label:'≤ 30 tháng' },
  { id:'rb_36', maxMonths: 36, rate:'', margin:'', label:'≤ 36 tháng' },
];

const RC_DEFAULT_FEE_RULES = [
  { id:'fr_htls',   phase:'inHTLS',          fee:'', label:'Trong HTLS' },
  { id:'fr_post60', phase:'afterHTLS_to60',  fee:'', label:'Sau HTLS đến T60' },
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

// ── RateRuleEngine ────────────────────────────────────────────
const RateRuleEngine = {

  /**
   * Chọn bucket lãi suất dựa trên số tháng HTLS/CĐLS đã làm tròn
   * Rule: chọn bucket nhỏ nhất có maxMonths >= htlsMonths
   */
  selectBucket(rateBuckets, htlsMonths) {
    if (!rateBuckets || !rateBuckets.length) return null;
    const months = Math.ceil(Number(htlsMonths) || 0);
    const sorted = [...rateBuckets].sort((a, b) => a.maxMonths - b.maxMonths);
    const bucket = sorted.find(b => months <= b.maxMonths);
    return bucket || sorted[sorted.length - 1];
  },

  /**
   * Tính phí TNTH theo giai đoạn
   * Phase xác định bởi tháng hiện tại so với HTLS và mốc T60
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
   * Phụ thuộc: project group, exception per project, có HTLS, có bổ sung
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

    // Nếu không có exception và không có group → giới hạn bằng CĐLS
    if (!exception && !(graceRules.useMaxByGroup && projectGroup)) {
      const htls = Number(htlsMonths) || 0;
      if (htls > 0 && (grace === 0 || grace > htls)) {
        grace = htls;
        notes.push('Không vượt quá thời gian CĐLS (' + htls + ' tháng)');
      }
    }

    if (graceRules.withHTLS && hasHTLS) {
      notes.push('Có HTLS từ CĐT → ân hạn đầy đủ');
    }
    if (graceRules.withSupplement && hasSupplementGrace) {
      notes.push('Có ân hạn gốc bổ sung');
    }

    return { grace, notes };
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
    const htlsMonths = Number(input.htlsMonths) || 0;

    // 1. Bucket lãi suất
    const bucket = this.selectBucket(pkg.rateBuckets, htlsMonths);

    // 2. Phí TNTH
    const feeRule = this.calcFee(pkg.feeRules, { currentMonth: input.currentMonth, htlsMonths });

    // 3. Ân hạn gốc
    const { grace, notes: graceNotes } = this.calcGrace(
      pkg.graceRules || RC_DEFAULT_GRACE_RULES,
      pkg.projectExceptions,
      { ...input, projectName: project ? project.name : '' }
    );

    // 4. Eligibility
    const { eligible, failed } = this.checkEligibility(pkg.eligibilityConditions, input);

    // 5. Derived fields for template
    const derived = {
      'Bucket HTLS':        bucket ? bucket.label : '',
      'Lãi suất áp dụng':  bucket ? bucket.rate  : '',
      'Biên độ':            bucket ? bucket.margin : '',
      'Phí TNTH hiện hành':feeRule ? feeRule.fee  : '',
      'Giai đoạn TNTH':    feeRule ? feeRule.label : '',
      'Ân hạn gốc tối đa': grace,
      'Ghi chú rule':       graceNotes.join(' | '),
      'Điều kiện đủ':       eligible ? 'Đủ điều kiện' : 'Không đủ: ' + failed.join(', '),
    };

    return derived;
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
        if (!pkg.feeRules)    { pkg.feeRules    = RC_DEFAULT_FEE_RULES.map(r => ({...r, id:_rcId()})); changed = true; }
        if (!pkg.graceRules)  { pkg.graceRules  = { ...RC_DEFAULT_GRACE_RULES }; changed = true; }
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
      { key:'grace',      icon:'⏳', label:'Ân hạn gốc' },
      { key:'fees',       icon:'💼', label:'Phí TNTH' },
      { key:'exceptions', icon:'🚫', label:'Ngoại lệ' },
    ];

    const tabsHtml = `<div class="rc-tabs">${tabs.map(t =>
      `<button class="rc-tab${tab===t.key?' active':''}" onclick="RateCenter.switchTab('${projectId}','${pkgId}','${t.key}')">${t.icon} ${t.label}</button>`
    ).join('')}</div>`;

    let contentHtml = '';
    if (tab === 'info')       contentHtml = this._renderTabInfo(projectId, pkgId, pkg);
    if (tab === 'buckets')    contentHtml = this._renderTabBuckets(projectId, pkgId, pkg);
    if (tab === 'grace')      contentHtml = this._renderTabGrace(projectId, pkgId, pkg);
    if (tab === 'fees')       contentHtml = this._renderTabFees(projectId, pkgId, pkg);
    if (tab === 'exceptions') contentHtml = this._renderTabExceptions(projectId, pkgId, pkg);

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

  // Tab 2: Rate Buckets
  _renderTabBuckets(projectId, pkgId, pkg) {
    const buckets = pkg.rateBuckets || RC_DEFAULT_RATE_BUCKETS;
    const rows = buckets.map(b => `
      <tr>
        <td><span class="rc-bucket-label">${_rcEsc(b.label)}</span></td>
        <td><input class="rc-tier-input" type="number" step="0.01" value="${_rcEsc(b.rate||'')}" placeholder="VD: 8.5"
          onchange="RateCenter.setBucketVal('${projectId}','${pkgId}','${b.id}','rate',this.value)"> %/năm</td>
        <td><input class="rc-tier-input" type="number" step="0.01" value="${_rcEsc(b.margin||'')}" placeholder="VD: 3.5"
          onchange="RateCenter.setBucketVal('${projectId}','${pkgId}','${b.id}','margin',this.value)"> %</td>
        <td><input class="rc-tier-input" value="${_rcEsc(b.note||'')}" placeholder="Ghi chú..."
          onchange="RateCenter.setBucketVal('${projectId}','${pkgId}','${b.id}','note',this.value)"></td>
      </tr>`).join('');
    return `<div class="rc-detail-section">
      <div class="rc-detail-section-title">📈 Bảng lãi suất theo bucket HTLS/CĐLS
        <span style="margin-left:auto;font-size:0.68rem;color:var(--text-muted);font-weight:400;text-transform:none;">
          Rule: chọn bucket nhỏ nhất có maxMonths ≥ thời gian CĐLS đã làm tròn
        </span>
      </div>
      <div class="rc-bucket-info">
        ℹ️ Hệ thống tự chọn bucket phù hợp khi chạy rule. Lãi suất thả nổi = LSCB + Biên độ.
      </div>
      <table class="rc-tiers-table">
        <thead><tr><th>Bucket (≤ N tháng)</th><th>Lãi suất cố định</th><th>Biên độ (thả nổi)</th><th>Ghi chú</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>`;
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
          <label class="rc-field-label">Có HTLS từ CĐT → ân hạn đầy đủ?</label>
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
            <option value="false" ${!gr.useMaxByGroup?'selected':''}>Không (giới hạn = CĐLS)</option>
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
        💡 <b>Logic:</b> Nếu có ngoại lệ dự án → dùng theo ngoại lệ. Nếu có nhóm → dùng max nhóm. Còn lại → không vượt quá CĐLS.
      </div>
    </div>`;
  },

  // Tab 4: Phí TNTH
  _renderTabFees(projectId, pkgId, pkg) {
    const fees = pkg.feeRules || RC_DEFAULT_FEE_RULES;
    const rows = fees.map(f => `
      <div class="rc-fee-row">
        <div class="rc-fee-phase">${_rcEsc(f.label)}</div>
        <div class="rc-fee-input-wrap">
          <input class="rc-tier-input" type="number" step="0.01" value="${_rcEsc(f.fee||'')}" placeholder="VD: 0.5"
            onchange="RateCenter.setFeeVal('${projectId}','${pkgId}','${f.id}',this.value)">
          <span class="rc-fee-unit">%/năm</span>
        </div>
      </div>`).join('');
    return `<div class="rc-detail-section">
      <div class="rc-detail-section-title">💼 Phí bảo hiểm tai nạn thân thể (TNTH) theo giai đoạn</div>
      <div class="rc-bucket-info">
        ℹ️ Hệ thống tự xác định giai đoạn dựa trên tháng hiện tại so với HTLS và mốc T60.
      </div>
      <div class="rc-fee-list">${rows}</div>
    </div>`;
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
    if (b) b[key] = value;
    this.save();
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

    const htls = prompt('Thời gian HTLS/CĐLS (tháng):', '24');
    if (htls === null) return;
    const loanType = prompt('Loại khoản vay (HTLS / standard):', 'HTLS');
    if (loanType === null) return;
    const hasSupp = confirm('Có ân hạn gốc bổ sung?');
    const group = prompt('Nhóm dự án (A/B/để trống):', '');

    const input = {
      htlsMonths: Number(htls) || 0,
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
      'Bucket HTLS','Lãi suất áp dụng','Biên độ',
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
