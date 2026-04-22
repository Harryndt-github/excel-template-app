/* ============================================================
   RateCenter — Trung tâm lãi suất
   Quản lý: Dự án → Gói tín dụng → Mức lãi suất + Điều kiện
   ============================================================ */

// ── State ────────────────────────────────────────────────────
const RateCenterState = {
  projects: [],      // [{id, name, color, packages:[]}]
  selectedProject: null,
  selectedPackage: null,
};

// ── Helpers ──────────────────────────────────────────────────
function _rcId() { return 'rc_' + Math.random().toString(36).slice(2, 9); }
function _rcEsc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

// ── Default columns for a new loan package entity ─────────────
const RC_DEFAULT_FIELDS = [
  { id:'f_min_term',    label:'Thời gian vay tối thiểu',           unit:'tháng', type:'number' },
  { id:'f_fixed_per',   label:'Thời gian cố định lãi suất ưu đãi', unit:'tháng', type:'number' },
  { id:'f_fixed_rate',  label:'Lãi suất cố định',                  unit:'%/năm', type:'percent' },
  { id:'f_margin',      label:'Biên độ',                            unit:'%',     type:'percent' },
  { id:'f_insurance',   label:'Phí TNTH',                          unit:'%/năm', type:'percent' },
  { id:'f_grace',       label:'Ân hạn tối đa',                     unit:'tháng', type:'number' },
  { id:'f_ltv',         label:'LTV tối đa',                        unit:'%',     type:'percent' },
  { id:'f_max_term',    label:'Thời gian vay tối đa',               unit:'năm',   type:'number' },
];

const RC_COLORS = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#06b6d4','#3b82f6','#ef4444'];
const RC_PROJECT_ICONS = ['🏢','🏗️','🏠','🏦','🏙️','🌆','🏬','🏭'];

// ── Persistence ───────────────────────────────────────────────
const RateCenter = {

  _storageKey: 'excelmapper_ratecenter',

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

  // ── Main render entry ────────────────────────────────────────
  render() {
    this.load();
    this.renderProjects();
    this.renderPackages(RateCenterState.selectedProject);
    this.renderDetail(RateCenterState.selectedProject, RateCenterState.selectedPackage);
  },

  // ── Panel 1: Projects ────────────────────────────────────────
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
          <span class="rc-item-meta">${pkgCount} gói tín dụng</span>
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

  addProject() {
    const name = prompt('Tên dự án:', '');
    if (!name || !name.trim()) return;
    const color = RC_COLORS[RateCenterState.projects.length % RC_COLORS.length];
    const icon  = RC_PROJECT_ICONS[RateCenterState.projects.length % RC_PROJECT_ICONS.length];
    const proj = { id: _rcId(), name: name.trim(), color, icon, packages: [] };
    RateCenterState.projects.push(proj);
    this.save();
    this.selectProject(proj.id);
    if (typeof App !== 'undefined') App.toast('Đã thêm dự án', 'success');
  },

  editProject(id) {
    const p = RateCenterState.projects.find(x => x.id === id);
    if (!p) return;
    const name = prompt('Tên dự án:', p.name);
    if (!name || !name.trim()) return;
    p.name = name.trim();
    this.save();
    this.renderProjects();
  },

  deleteProject(id) {
    if (!confirm('Xóa dự án này và toàn bộ gói tín dụng?')) return;
    RateCenterState.projects = RateCenterState.projects.filter(p => p.id !== id);
    if (RateCenterState.selectedProject === id) {
      RateCenterState.selectedProject = null;
      RateCenterState.selectedPackage = null;
    }
    this.save();
    this.render();
  },

  // ── Panel 2: Packages ────────────────────────────────────────
  renderPackages(projectId) {
    const hintEl  = document.getElementById('rc-pkg-hint');
    const titleEl = document.getElementById('rc-pkg-panel-title');
    const addBtn  = document.getElementById('rc-add-pkg-btn');
    const listEl  = document.getElementById('rc-package-list');
    if (!listEl) return;

    const proj = RateCenterState.projects.find(p => p.id === projectId);
    if (!proj) {
      if (titleEl) titleEl.textContent = 'Gói tín dụng';
      if (hintEl)  hintEl.textContent  = '← Chọn dự án';
      if (addBtn)  addBtn.style.display = 'none';
      listEl.innerHTML = '';
      return;
    }
    if (titleEl) titleEl.textContent = proj.name;
    if (hintEl)  hintEl.textContent  = `Các gói vay của ${proj.name}`;
    if (addBtn)  addBtn.style.display = '';

    const pkgs = proj.packages || [];
    if (!pkgs.length) {
      listEl.innerHTML = `<div class="rc-empty"><span class="rc-empty-icon">📦</span>Chưa có gói vay.<br>Nhấn <b>+ Gói</b> để tạo.</div>`;
      return;
    }
    listEl.innerHTML = pkgs.map(pkg => {
      const active = RateCenterState.selectedPackage === pkg.id ? ' active' : '';
      const tierCount = (pkg.tiers||[]).length;
      const condCount = (pkg.conditions||[]).length;
      return `<div class="rc-item${active}" onclick="RateCenter.selectPackage('${projectId}','${pkg.id}')">
        <div class="rc-pkg-dot" style="background:${pkg.color||proj.color};width:10px;height:10px;border-radius:50%;flex-shrink:0;"></div>
        <div class="rc-item-info">
          <span class="rc-item-name">${_rcEsc(pkg.name)}</span>
          <span class="rc-item-meta">${tierCount} mức lãi · ${condCount} điều kiện</span>
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
    this.save();
    this.renderProjects();
    this.renderPackages(projectId);
    this.renderDetail(projectId, pkgId);
  },

  addPackage() {
    const proj = RateCenterState.projects.find(p => p.id === RateCenterState.selectedProject);
    if (!proj) return;
    const name = prompt('Tên gói tín dụng:', '');
    if (!name || !name.trim()) return;
    const colors = ['#6366f1','#8b5cf6','#10b981','#f59e0b','#ec4899','#06b6d4'];
    const pkg = {
      id: _rcId(),
      name: name.trim(),
      color: colors[(proj.packages||[]).length % colors.length],
      fields: RC_DEFAULT_FIELDS.map(f => ({ ...f, value: '' })),
      tiers: [
        { id: _rcId(), period: 'Năm 1',   rate: '',  type: 'fixed',    note: '' },
        { id: _rcId(), period: 'Từ năm 2', rate: '',  type: 'floating', margin: '', note: '' },
      ],
      conditions: [
        { id: _rcId(), key: 'LTV tối đa',          value: '' },
        { id: _rcId(), key: 'Thu nhập tối thiểu',   value: '' },
        { id: _rcId(), key: 'Điều kiện ký quỹ',     value: '' },
      ],
      customFields: [],
    };
    if (!proj.packages) proj.packages = [];
    proj.packages.push(pkg);
    this.save();
    this.selectPackage(proj.id, pkg.id);
    if (typeof App !== 'undefined') App.toast('Đã thêm gói tín dụng', 'success');
  },

  editPackage(projectId, pkgId) {
    const proj = RateCenterState.projects.find(p => p.id === projectId);
    if (!proj) return;
    const pkg = (proj.packages||[]).find(k => k.id === pkgId);
    if (!pkg) return;
    const name = prompt('Tên gói tín dụng:', pkg.name);
    if (!name || !name.trim()) return;
    pkg.name = name.trim();
    this.save();
    this.renderPackages(projectId);
    this.renderDetail(projectId, pkgId);
  },

  deletePackage(projectId, pkgId) {
    if (!confirm('Xóa gói tín dụng này?')) return;
    const proj = RateCenterState.projects.find(p => p.id === projectId);
    if (!proj) return;
    proj.packages = (proj.packages||[]).filter(k => k.id !== pkgId);
    if (RateCenterState.selectedPackage === pkgId) RateCenterState.selectedPackage = null;
    this.save();
    this.renderPackages(projectId);
    this.renderDetail(projectId, null);
  },

  // ── Panel 3: Detail ──────────────────────────────────────────
  renderDetail(projectId, pkgId) {
    const titleEl   = document.getElementById('rc-detail-title');
    const hintEl    = document.getElementById('rc-detail-hint');
    const actionsEl = document.getElementById('rc-detail-actions');
    const areaEl    = document.getElementById('rc-detail-area');
    if (!areaEl) return;

    const proj = RateCenterState.projects.find(p => p.id === projectId);
    const pkg  = proj && (proj.packages||[]).find(k => k.id === pkgId);

    if (!pkg) {
      if (titleEl)   titleEl.textContent = 'Chi tiết gói vay';
      if (hintEl)    hintEl.textContent  = '← Chọn gói tín dụng';
      if (actionsEl) actionsEl.style.display = 'none';
      areaEl.innerHTML = `<div class="rc-empty" style="margin:40px auto;"><span class="rc-empty-icon">💰</span><b>Chọn một gói tín dụng</b> từ danh sách bên trái để xem và chỉnh sửa chi tiết lãi suất và điều kiện.</div>`;
      return;
    }

    if (titleEl)   titleEl.textContent = pkg.name;
    if (hintEl)    hintEl.textContent  = '';
    if (actionsEl) actionsEl.style.display = 'flex';

    const iconMap = {number:'#',percent:'%',text:'Aa'};
    // ── Section 1: Basic fields (entity columns)
    const fields = pkg.fields || RC_DEFAULT_FIELDS.map(f => ({...f, value:''}));
    const fieldsHtml = fields.map(f => `
      <div class="rc-field-item">
        <label class="rc-field-label">${_rcEsc(f.label)} <small style="color:var(--text-muted);font-weight:400;">(${f.unit||''})</small></label>
        <input class="rc-field-input" type="${f.type==='percent'||f.type==='number'?'number':'text'}"
          step="0.01" value="${_rcEsc(f.value||'')}" placeholder="Nhập..."
          onchange="RateCenter.setFieldVal('${projectId}','${pkgId}','${f.id}',this.value)">
      </div>`).join('');

    // Custom fields
    const customFields = (pkg.customFields||[]).map(f => `
      <div class="rc-field-item">
        <label class="rc-field-label" style="display:flex;gap:6px;align-items:center;">
          <input style="flex:1;padding:3px 6px;border:1px solid rgba(99,102,241,0.2);border-radius:4px;background:transparent;color:var(--text-secondary);font-size:0.72rem;font-weight:700;text-transform:uppercase;outline:none;"
            value="${_rcEsc(f.label)}" placeholder="Tên cột..."
            onchange="RateCenter.setCustomFieldLabel('${projectId}','${pkgId}','${f.id}',this.value)">
          <button onclick="RateCenter.removeCustomField('${projectId}','${pkgId}','${f.id}')"
            style="border:none;background:transparent;color:#ef4444;cursor:pointer;font-size:0.75rem;">✕</button>
        </label>
        <input class="rc-field-input" value="${_rcEsc(f.value||'')}" placeholder="Nhập giá trị..."
          onchange="RateCenter.setCustomFieldVal('${projectId}','${pkgId}','${f.id}',this.value)">
      </div>`).join('');

    // ── Section 2: Rate tiers
    const tiers = pkg.tiers || [];
    const tiersHtml = tiers.map(t => `
      <tr>
        <td><input class="rc-tier-input" value="${_rcEsc(t.period||'')}" placeholder="VD: Năm 1-2..."
          onchange="RateCenter.setTierVal('${projectId}','${pkgId}','${t.id}','period',this.value)"></td>
        <td>
          <select class="rc-tier-input" onchange="RateCenter.setTierVal('${projectId}','${pkgId}','${t.id}','type',this.value)">
            <option value="fixed"   ${t.type==='fixed'   ?'selected':''}>Cố định</option>
            <option value="floating"${t.type==='floating'?'selected':''}>Thả nổi</option>
          </select>
        </td>
        <td><input class="rc-tier-input" type="number" step="0.01" value="${_rcEsc(t.rate||'')}" placeholder="${t.type==='floating'?'LSCB':'%'}..."
          onchange="RateCenter.setTierVal('${projectId}','${pkgId}','${t.id}','rate',this.value)"></td>
        <td><input class="rc-tier-input" type="number" step="0.01" value="${_rcEsc(t.margin||'')}" placeholder="Biên độ..."
          onchange="RateCenter.setTierVal('${projectId}','${pkgId}','${t.id}','margin',this.value)"
          ${t.type==='fixed'?'disabled style="opacity:0.3;"':''}></td>
        <td><input class="rc-tier-input" value="${_rcEsc(t.note||'')}" placeholder="Ghi chú..."
          onchange="RateCenter.setTierVal('${projectId}','${pkgId}','${t.id}','note',this.value)"></td>
        <td><button class="rc-tier-del" onclick="RateCenter.deleteTier('${projectId}','${pkgId}','${t.id}')">✕</button></td>
      </tr>`).join('');

    // ── Section 3: Conditions
    const conditions = pkg.conditions || [];
    const condsHtml = conditions.map(c => `
      <div class="rc-condition-row">
        <input class="rc-cond-key" value="${_rcEsc(c.key||'')}" placeholder="Tên điều kiện..."
          onchange="RateCenter.setCondVal('${projectId}','${pkgId}','${c.id}','key',this.value)">
        <span class="rc-cond-sep">:</span>
        <input class="rc-cond-val" value="${_rcEsc(c.value||'')}" placeholder="Giá trị / mô tả..."
          onchange="RateCenter.setCondVal('${projectId}','${pkgId}','${c.id}','value',this.value)">
        <button class="rc-cond-del" onclick="RateCenter.deleteCondition('${projectId}','${pkgId}','${c.id}')">✕</button>
      </div>`).join('');

    areaEl.innerHTML = `
      <!-- Section 1: Entity Columns -->
      <div class="rc-detail-section">
        <div class="rc-detail-section-title">
          📋 Thông số gói vay
          <button onclick="RateCenter.addCustomField('${projectId}','${pkgId}')"
            style="margin-left:auto;padding:3px 10px;border-radius:6px;border:1px dashed rgba(99,102,241,0.3);
            background:transparent;color:var(--accent);font-size:0.72rem;cursor:pointer;font-family:inherit;">
            + Thêm cột tùy chỉnh
          </button>
        </div>
        <div class="rc-fields-grid">
          ${fieldsHtml}
          ${customFields}
        </div>
      </div>

      <!-- Section 2: Rate Tiers -->
      <div class="rc-detail-section">
        <div class="rc-detail-section-title">
          📈 Biểu lãi suất theo giai đoạn
          <span style="margin-left:auto;font-size:0.68rem;color:var(--text-muted);font-weight:400;text-transform:none;">
            Lãi suất thả nổi = LSCB + Biên độ
          </span>
        </div>
        <table class="rc-tiers-table">
          <thead>
            <tr>
              <th style="width:28%">Giai đoạn</th>
              <th style="width:18%">Loại</th>
              <th style="width:15%">Lãi suất (%)</th>
              <th style="width:15%">Biên độ (%)</th>
              <th>Ghi chú</th>
              <th style="width:30px"></th>
            </tr>
          </thead>
          <tbody>${tiersHtml}</tbody>
        </table>
      </div>

      <!-- Section 3: Conditions -->
      <div class="rc-detail-section">
        <div class="rc-detail-section-title">✅ Điều kiện áp dụng</div>
        <div class="rc-conditions-list">
          ${condsHtml || '<p style="font-size:0.78rem;color:var(--text-muted);font-style:italic;">Chưa có điều kiện nào.</p>'}
        </div>
      </div>`;
  },

  // ── Field value setters ──────────────────────────────────────
  _getPkg(projectId, pkgId) {
    const proj = RateCenterState.projects.find(p => p.id === projectId);
    return proj && (proj.packages||[]).find(k => k.id === pkgId);
  },

  setFieldVal(projectId, pkgId, fieldId, value) {
    const pkg = this._getPkg(projectId, pkgId);
    if (!pkg) return;
    if (!pkg.fields) pkg.fields = RC_DEFAULT_FIELDS.map(f => ({...f, value:''}));
    const f = pkg.fields.find(x => x.id === fieldId);
    if (f) f.value = value;
    this.save();
    this.renderPackages(projectId);
  },

  addCustomField(projectId, pkgId) {
    const pkg = this._getPkg(projectId, pkgId);
    if (!pkg) return;
    if (!pkg.customFields) pkg.customFields = [];
    pkg.customFields.push({ id: _rcId(), label: '', value: '' });
    this.save();
    this.renderDetail(projectId, pkgId);
    this.renderPackages(projectId);
  },

  setCustomFieldLabel(projectId, pkgId, fieldId, val) {
    const pkg = this._getPkg(projectId, pkgId);
    if (!pkg) return;
    const f = (pkg.customFields||[]).find(x => x.id === fieldId);
    if (f) f.label = val;
    this.save();
  },

  setCustomFieldVal(projectId, pkgId, fieldId, val) {
    const pkg = this._getPkg(projectId, pkgId);
    if (!pkg) return;
    const f = (pkg.customFields||[]).find(x => x.id === fieldId);
    if (f) f.value = val;
    this.save();
  },

  removeCustomField(projectId, pkgId, fieldId) {
    const pkg = this._getPkg(projectId, pkgId);
    if (!pkg) return;
    pkg.customFields = (pkg.customFields||[]).filter(f => f.id !== fieldId);
    this.save();
    this.renderDetail(projectId, pkgId);
  },

  // ── Tier setters ─────────────────────────────────────────────
  setTierVal(projectId, pkgId, tierId, key, value) {
    const pkg = this._getPkg(projectId, pkgId);
    if (!pkg) return;
    const t = (pkg.tiers||[]).find(x => x.id === tierId);
    if (t) {
      t[key] = value;
      // Re-render only when type changes (to toggle margin disabled state)
      if (key === 'type') { this.save(); this.renderDetail(projectId, pkgId); return; }
    }
    this.save();
    this.renderPackages(projectId);
  },

  addTier() {
    const { selectedProject: pId, selectedPackage: pkgId } = RateCenterState;
    const pkg = this._getPkg(pId, pkgId);
    if (!pkg) { if (typeof App!=='undefined') App.toast('Chọn gói tín dụng trước','warning'); return; }
    if (!pkg.tiers) pkg.tiers = [];
    pkg.tiers.push({ id: _rcId(), period: '', rate: '', type: 'fixed', margin: '', note: '' });
    this.save();
    this.renderDetail(pId, pkgId);
    this.renderPackages(pId);
  },

  deleteTier(projectId, pkgId, tierId) {
    const pkg = this._getPkg(projectId, pkgId);
    if (!pkg) return;
    pkg.tiers = (pkg.tiers||[]).filter(t => t.id !== tierId);
    this.save();
    this.renderDetail(projectId, pkgId);
    this.renderPackages(projectId);
  },

  // ── Condition setters ────────────────────────────────────────
  setCondVal(projectId, pkgId, condId, key, value) {
    const pkg = this._getPkg(projectId, pkgId);
    if (!pkg) return;
    const c = (pkg.conditions||[]).find(x => x.id === condId);
    if (c) c[key] = value;
    this.save();
  },

  addCondition() {
    const { selectedProject: pId, selectedPackage: pkgId } = RateCenterState;
    const pkg = this._getPkg(pId, pkgId);
    if (!pkg) { if (typeof App!=='undefined') App.toast('Chọn gói tín dụng trước','warning'); return; }
    if (!pkg.conditions) pkg.conditions = [];
    pkg.conditions.push({ id: _rcId(), key: '', value: '' });
    this.save();
    this.renderDetail(pId, pkgId);
  },

  deleteCondition(projectId, pkgId, condId) {
    const pkg = this._getPkg(projectId, pkgId);
    if (!pkg) return;
    pkg.conditions = (pkg.conditions||[]).filter(c => c.id !== condId);
    this.save();
    this.renderDetail(projectId, pkgId);
  },
};

// Auto-load on init
RateCenter.load();
