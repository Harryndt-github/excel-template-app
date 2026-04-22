/* ============================================
   Master Data — Mindmap, Matrix & Template Integration
   ============================================ */

// ── State ──────────────────────────────────
const MasterDataState = {
  entities: [],      // [{id, name, color, fields:[{id,name,type}], x, y}]
  connections: [],   // [{id, fromEntity, toEntity, fromField, toField, label}]
  records: {},       // { entityId: [ {fieldId: value, ...} ] }
  selectedEntity: null,
  selectedRecord: null,
  viewMode: 'config',  // 'config' (main) | 'mindmap' (diagram view)
  // Mindmap dragging
  _drag: null,
  _pan: { x: 0, y: 0 },
  _isPanning: false,
  _panStart: null,
  _zoom: 1
};

// ── Helper ─────────────────────────────────
function _mdId() { return 'md_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6); }
function _mdEsc(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }

const ENTITY_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b',
  '#10b981', '#06b6d4', '#3b82f6', '#f97316', '#14b8a6'
];

const FIELD_TYPES = [
  { value: 'text', label: 'Văn bản' },
  { value: 'number', label: 'Số' },
  { value: 'date', label: 'Ngày tháng' },
  { value: 'select', label: 'Lựa chọn' },
  { value: 'currency', label: 'Tiền tệ' },
  { value: 'percent', label: 'Phần trăm' },
  { value: 'phone', label: 'Số điện thoại' },
  { value: 'email', label: 'Email' }
];

// ── Master Data Module ─────────────────────
const MasterData = {
  init() {
    this.loadState();
    this._initDefaultEntities();
  },

  // ── Persistence ──
  loadState() {
    try {
      const s = localStorage.getItem('excelmapper_masterdata');
      if (s) {
        const data = JSON.parse(s);
        MasterDataState.entities = data.entities || [];
        MasterDataState.connections = data.connections || [];
        MasterDataState.records = data.records || {};
      }
    } catch (e) { console.error('MasterData load error:', e); }
  },

  saveState() {
    try {
      localStorage.setItem('excelmapper_masterdata', JSON.stringify({
        entities: MasterDataState.entities,
        connections: MasterDataState.connections,
        records: MasterDataState.records
      }));
    } catch (e) { console.error('MasterData save error:', e); }
  },

  // ── Auto-create entities from FILE_TYPES (one-time seed) ──
  _initDefaultEntities() {
    if (MasterDataState.entities.length > 0) return;

    const positions = [
      { x: 400, y: 300 }, { x: 800, y: 150 }, { x: 800, y: 450 },
      { x: 200, y: 100 }, { x: 200, y: 500 }, { x: 600, y: 600 },
      { x: 1000, y: 300 }, { x: 400, y: 50 }
    ];

    let idx = 0;
    Object.keys(FILE_TYPES).forEach(key => {
      const cfg = FILE_TYPES[key];
      // Deduplicate fields for this entity
      const uniqueFields = [...new Set(cfg.fields)];
      const pos = positions[idx % positions.length];

      const entity = {
        id: _mdId(),
        key: key,
        name: cfg.label,
        color: ENTITY_COLORS[idx % ENTITY_COLORS.length],
        fields: uniqueFields.slice(0, 20).map(f => ({
          id: _mdId(),
          name: f,
          type: 'text'
        })),
        x: pos.x,
        y: pos.y
      };

      MasterDataState.entities.push(entity);
      MasterDataState.records[entity.id] = [];
      idx++;
    });

    // Auto-detect shared fields to create connections
    this._autoDetectConnections();
    this.saveState();
  },

  _autoDetectConnections() {
    const entities = MasterDataState.entities;
    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const fieldsA = entities[i].fields.map(f => f.name.toLowerCase().trim());
        const fieldsB = entities[j].fields.map(f => f.name.toLowerCase().trim());

        const shared = fieldsA.filter(f => fieldsB.includes(f));
        if (shared.length > 0) {
          // Find the first matching field for the connection
          const sharedField = shared[0];
          const fieldA = entities[i].fields.find(f => f.name.toLowerCase().trim() === sharedField);
          const fieldB = entities[j].fields.find(f => f.name.toLowerCase().trim() === sharedField);

          if (fieldA && fieldB) {
            MasterDataState.connections.push({
              id: _mdId(),
              fromEntity: entities[i].id,
              toEntity: entities[j].id,
              fromField: fieldA.id,
              toField: fieldB.id,
              label: sharedField
            });
          }
        }
      }
    }
  },

  // ── Page Init ──
  initPage() {
    this.setView('config');
  },

  setView(mode) {
    MasterDataState.viewMode = mode;
    document.querySelectorAll('.md-view-btn').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-view') === mode);
    });
    // Hide all panels
    document.querySelectorAll('.md-view-panel').forEach(p => p.style.display = 'none');
    const panel = document.getElementById(`md-view-${mode}`);
    if (panel) panel.style.display = (mode === 'config') ? 'flex' : 'block';

    // Sidebar: hide for config (it has its own entity panel), show for mindmap
    const sidebar = document.querySelector('.md-sidebar');
    if (sidebar) sidebar.style.display = (mode === 'config') ? 'none' : '';

    if (mode === 'mindmap') { this.renderMindmap(); this.renderEntityList(); }
    if (mode === 'config')  this.cfgRenderEntityList();
  },

  // ── Entity List (sidebar on master data page) ──
  renderEntityList() {
    const list = document.getElementById('md-entity-list');
    if (!list) return;

    if (MasterDataState.entities.length === 0) {
      list.innerHTML = '<p class="text-muted" style="padding:16px;font-size:0.82rem;">Chưa có entity nào</p>';
      return;
    }

    list.innerHTML = MasterDataState.entities.map(ent => {
      const isActive = MasterDataState.selectedEntity === ent.id;
      const recordCount = (MasterDataState.records[ent.id] || []).length;
      return `
        <div class="md-entity-item ${isActive ? 'active' : ''}" onclick="MasterData.selectEntity('${ent.id}')">
          <span class="md-entity-dot" style="background:${ent.color};"></span>
          <div class="md-entity-info">
            <span class="md-entity-name">${_mdEsc(ent.name)}</span>
            <span class="md-entity-meta">${ent.fields.length} trường • ${recordCount} bản ghi</span>
          </div>
          <button class="md-entity-edit-btn" onclick="event.stopPropagation(); MasterData.showEditEntity('${ent.id}')" title="Sửa">✎</button>
        </div>`;
    }).join('');
  },

  selectEntity(id) {
    MasterDataState.selectedEntity = id;
    this.renderEntityList();
    if (MasterDataState.viewMode === 'mindmap') this.renderMindmap();
    if (MasterDataState.viewMode === 'matrix') this.renderMatrix();
    if (MasterDataState.viewMode === 'records') this.renderRecords();
  },

  // ══════════════════════════════════════════
  //  MINDMAP — Interactive SVG Visualization
  // ══════════════════════════════════════════
  renderMindmap() {
    const container = document.getElementById('md-mindmap-canvas');
    if (!container) return;

    const entities = MasterDataState.entities;
    const connections = MasterDataState.connections;
    const W = container.clientWidth || 1100;
    const H = container.clientHeight || 650;

    let svg = `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%"
      style="font-family:'Inter',sans-serif;"
      id="md-svg"
      onmousedown="MasterData._svgMouseDown(event)"
      onmousemove="MasterData._svgMouseMove(event)"
      onmouseup="MasterData._svgMouseUp(event)">`;

    // Defs for glow effect
    svg += `<defs>
      <filter id="glow">
        <feGaussianBlur stdDeviation="3" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <filter id="shadow">
        <feDropShadow dx="0" dy="2" stdDeviation="4" flood-opacity="0.3"/>
      </filter>
    </defs>`;

    // Draw connections first (behind nodes)
    connections.forEach(conn => {
      const fromEnt = entities.find(e => e.id === conn.fromEntity);
      const toEnt = entities.find(e => e.id === conn.toEntity);
      if (!fromEnt || !toEnt) return;

      const x1 = fromEnt.x + 90;
      const y1 = fromEnt.y + 30;
      const x2 = toEnt.x + 90;
      const y2 = toEnt.y + 30;

      // Curved path
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2 - 30;

      svg += `<path d="M ${x1} ${y1} Q ${midX} ${midY} ${x2} ${y2}"
        fill="none" stroke="rgba(99,102,241,0.25)" stroke-width="2"
        stroke-dasharray="6,4" class="md-connection-line"/>`;

      // Label on connection
      svg += `<text x="${(x1+x2)/2}" y="${(y1+y2)/2 - 8}"
        text-anchor="middle" fill="rgba(160,164,184,0.7)" font-size="10"
        font-weight="500">${_mdEsc(conn.label || '')}</text>`;

      // Small dots at endpoints
      svg += `<circle cx="${x1}" cy="${y1}" r="3" fill="${fromEnt.color}" opacity="0.6"/>`;
      svg += `<circle cx="${x2}" cy="${y2}" r="3" fill="${toEnt.color}" opacity="0.6"/>`;
    });

    // Draw entity nodes
    entities.forEach(ent => {
      const isSelected = MasterDataState.selectedEntity === ent.id;
      const recordCount = (MasterDataState.records[ent.id] || []).length;
      const nodeW = 180;
      const nodeH = 60;
      const borderColor = isSelected ? ent.color : 'rgba(30,30,58,0.8)';
      const bgColor = isSelected ? `${ent.color}15` : 'rgba(20,20,42,0.9)';

      // Node background
      svg += `<g class="md-node" data-entity="${ent.id}" style="cursor:grab;">
        <rect x="${ent.x}" y="${ent.y}" width="${nodeW}" height="${nodeH}" rx="12"
          fill="${bgColor}" stroke="${borderColor}" stroke-width="${isSelected ? 2 : 1}"
          filter="url(#shadow)" class="md-node-rect"/>`;

      // Color accent bar
      svg += `<rect x="${ent.x}" y="${ent.y}" width="4" height="${nodeH}" rx="2"
        fill="${ent.color}"/>`;

      // Entity name
      svg += `<text x="${ent.x + 16}" y="${ent.y + 24}"
        fill="${isSelected ? ent.color : '#e8eaf0'}" font-size="13" font-weight="700"
        class="md-node-title">${_mdEsc(ent.name)}</text>`;

      // Meta info
      svg += `<text x="${ent.x + 16}" y="${ent.y + 44}"
        fill="#5a5e78" font-size="10" font-weight="500">${ent.fields.length} trường • ${recordCount} records</text>`;

      // Expand indicator
      svg += `<text x="${ent.x + nodeW - 20}" y="${ent.y + 35}"
        fill="${ent.color}" font-size="14" text-anchor="middle" style="cursor:pointer;"
        onclick="event.stopPropagation(); MasterData.selectEntity('${ent.id}')">◉</text>`;

      svg += `</g>`;

      // Draw field chips around selected entity
      if (isSelected && ent.fields.length > 0) {
        const fieldsToShow = ent.fields.slice(0, 12);
        const angleStep = (2 * Math.PI) / fieldsToShow.length;
        const radius = 140;
        const cx = ent.x + nodeW / 2;
        const cy = ent.y + nodeH / 2;

        fieldsToShow.forEach((field, fi) => {
          const angle = angleStep * fi - Math.PI / 2;
          const fx = cx + Math.cos(angle) * radius;
          const fy = cy + Math.sin(angle) * radius;

          // Connection line to field
          svg += `<line x1="${cx}" y1="${cy}" x2="${fx}" y2="${fy}"
            stroke="${ent.color}30" stroke-width="1"/>`;

          // Field chip
          const textLen = Math.min(field.name.length, 18) * 6.5 + 20;
          svg += `<rect x="${fx - textLen/2}" y="${fy - 12}" width="${textLen}" height="24" rx="12"
            fill="${ent.color}20" stroke="${ent.color}40" stroke-width="1"/>`;
          svg += `<text x="${fx}" y="${fy + 4}" text-anchor="middle"
            fill="${ent.color}" font-size="9.5" font-weight="600">
            ${_mdEsc(field.name.length > 18 ? field.name.substring(0, 16) + '…' : field.name)}</text>`;
        });

        if (ent.fields.length > 12) {
          svg += `<text x="${cx}" y="${cy + radius + 30}" text-anchor="middle"
            fill="#5a5e78" font-size="10">+${ent.fields.length - 12} trường khác</text>`;
        }
      }
    });

    svg += '</svg>';
    container.innerHTML = svg;

    // Attach dragging handlers to nodes
    this._attachNodeDrag();
  },

  // ── Mindmap drag handling ──
  _attachNodeDrag() {
    const svg = document.getElementById('md-svg');
    if (!svg) return;
    const nodes = svg.querySelectorAll('.md-node');
    nodes.forEach(node => {
      node.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        const entityId = node.getAttribute('data-entity');
        const ent = MasterDataState.entities.find(en => en.id === entityId);
        if (!ent) return;
        MasterDataState._drag = {
          entityId,
          startX: e.clientX,
          startY: e.clientY,
          origX: ent.x,
          origY: ent.y
        };
      });
    });
  },

  _svgMouseDown(e) {
    // Click on empty space — deselect or start panning
    if (!MasterDataState._drag) {
      // Deselect
      if (e.target.tagName === 'svg') {
        MasterDataState.selectedEntity = null;
        this.renderEntityList();
        this.renderMindmap();
      }
    }
  },

  _svgMouseMove(e) {
    if (!MasterDataState._drag) return;
    const d = MasterDataState._drag;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;

    const ent = MasterDataState.entities.find(en => en.id === d.entityId);
    if (!ent) return;
    ent.x = d.origX + dx;
    ent.y = d.origY + dy;

    this.renderMindmap();
  },

  _svgMouseUp(e) {
    if (MasterDataState._drag) {
      MasterDataState._drag = null;
      this.saveState();
    }
  },

  // ══════════════════════════════════════════
  //  MATRIX VIEW — Relationship Matrix
  // ══════════════════════════════════════════
  renderMatrix() {
    const container = document.getElementById('md-view-matrix');
    if (!container) return;

    const entities = MasterDataState.entities;
    const connections = MasterDataState.connections;
    const selectedId = MasterDataState.selectedEntity;

    if (entities.length === 0) {
      container.innerHTML = '<div class="md-empty-view"><p>Chưa có entity nào. Hãy thêm entity trước.</p></div>';
      return;
    }

    // If an entity is selected, show its connections detail
    let html = '<div class="md-matrix-wrap">';

    // Connection count matrix
    html += '<div class="md-matrix-section"><h4>🔗 Ma trận liên kết giữa các Entity</h4>';
    html += '<div class="md-matrix-table-wrap"><table class="md-matrix-table"><thead><tr><th></th>';
    entities.forEach(ent => {
      html += `<th><span style="color:${ent.color};font-weight:700;">${_mdEsc(ent.name)}</span></th>`;
    });
    html += '</tr></thead><tbody>';

    entities.forEach(rowEnt => {
      html += `<tr><td class="md-matrix-row-header" style="border-left:3px solid ${rowEnt.color};">
        <strong>${_mdEsc(rowEnt.name)}</strong></td>`;

      entities.forEach(colEnt => {
        if (rowEnt.id === colEnt.id) {
          html += `<td class="md-matrix-self">${rowEnt.fields.length} trường</td>`;
        } else {
          // Count shared fields
          const rowFields = new Set(rowEnt.fields.map(f => f.name.toLowerCase().trim()));
          const sharedFields = colEnt.fields.filter(f => rowFields.has(f.name.toLowerCase().trim()));
          const connCount = connections.filter(c =>
            (c.fromEntity === rowEnt.id && c.toEntity === colEnt.id) ||
            (c.fromEntity === colEnt.id && c.toEntity === rowEnt.id)
          ).length;

          const cellClass = sharedFields.length > 0 ? 'md-matrix-linked' : '';
          html += `<td class="${cellClass}" onclick="MasterData.showConnectionDetail('${rowEnt.id}','${colEnt.id}')"
            title="${sharedFields.length} trường chung">
            ${sharedFields.length > 0 ? `<span class="md-matrix-count">${sharedFields.length}</span>` : '—'}
          </td>`;
        }
      });

      html += '</tr>';
    });

    html += '</tbody></table></div></div>';

    // Selected entity detail
    if (selectedId) {
      const selEnt = entities.find(e => e.id === selectedId);
      if (selEnt) {
        const relatedConnections = connections.filter(c => c.fromEntity === selectedId || c.toEntity === selectedId);

        html += `<div class="md-matrix-section">
          <h4 style="color:${selEnt.color};">📊 Chi tiết: ${_mdEsc(selEnt.name)}</h4>
          <div class="md-matrix-detail-grid">`;

        relatedConnections.forEach(conn => {
          const otherEntId = conn.fromEntity === selectedId ? conn.toEntity : conn.fromEntity;
          const otherEnt = entities.find(e => e.id === otherEntId);
          if (!otherEnt) return;

          const fromField = selEnt.fields.find(f => f.id === (conn.fromEntity === selectedId ? conn.fromField : conn.toField));
          const toField = otherEnt.fields.find(f => f.id === (conn.fromEntity === selectedId ? conn.toField : conn.fromField));

          html += `<div class="md-conn-card">
            <div class="md-conn-from" style="border-color:${selEnt.color};">
              <span class="md-conn-entity-name">${_mdEsc(selEnt.name)}</span>
              <span class="md-conn-field-name">${fromField ? _mdEsc(fromField.name) : '?'}</span>
            </div>
            <span class="md-conn-arrow">⟷</span>
            <div class="md-conn-to" style="border-color:${otherEnt.color};">
              <span class="md-conn-entity-name">${_mdEsc(otherEnt.name)}</span>
              <span class="md-conn-field-name">${toField ? _mdEsc(toField.name) : '?'}</span>
            </div>
          </div>`;
        });

        if (relatedConnections.length === 0) {
          html += '<p class="text-muted" style="padding:16px;">Entity này chưa có liên kết nào</p>';
        }

        html += '</div></div>';
      }
    }

    html += '</div>';
    container.innerHTML = html;
  },

  showConnectionDetail(entA, entB) {
    const entityA = MasterDataState.entities.find(e => e.id === entA);
    const entityB = MasterDataState.entities.find(e => e.id === entB);
    if (!entityA || !entityB) return;

    const fieldsA = entityA.fields.map(f => f.name.toLowerCase().trim());
    const shared = entityB.fields.filter(f => fieldsA.includes(f.name.toLowerCase().trim()));

    if (shared.length === 0) {
      App.toast(`Không có trường chung giữa "${entityA.name}" và "${entityB.name}"`, 'info');
      return;
    }

    let msg = `Trường chung giữa "${entityA.name}" và "${entityB.name}":\n`;
    shared.forEach(f => { msg += `• ${f.name}\n`; });
    alert(msg);
  },

  // ══════════════════════════════════════════
  //  RECORDS VIEW — 2-Column Key-Value + Cascading
  // ══════════════════════════════════════════
  renderRecords() {
    const container = document.getElementById('md-view-records');
    if (!container) return;

    const selectedId = MasterDataState.selectedEntity;
    if (!selectedId) {
      container.innerHTML = `<div class="md-empty-view">
        <div class="md-empty-icon">📋</div>
        <h3>Chọn một Entity từ danh sách bên trái</h3>
        <p>Sau đó bạn có thể nhập dữ liệu bản ghi cho entity đó</p>
      </div>`;
      return;
    }

    const entity = MasterDataState.entities.find(e => e.id === selectedId);
    if (!entity) return;

    const records = MasterDataState.records[entity.id] || [];
    // Find connected (child) entities
    const childLinks = this._getLinkedEntities(entity.id);

    let html = `<div class="md-records-wrap">
      <div class="md-records-header">
        <div>
          <h4 style="color:${entity.color};">📋 ${_mdEsc(entity.name)} — Dữ liệu</h4>
          <span class="md-records-meta">${records.length} bản ghi • ${entity.fields.length} trường${childLinks.length > 0 ? ' • ' + childLinks.length + ' liên kết' : ''}</span>
        </div>
        <div class="md-records-actions">
          <button class="btn btn-primary btn-sm" onclick="MasterData.addRecord('${entity.id}')">＋ Thêm bản ghi</button>
          <button class="btn btn-outline btn-sm" onclick="MasterData.importRecordsFromExcel('${entity.id}')">📥 Import Excel</button>
        </div>
      </div>`;

    if (records.length === 0) {
      html += `<div class="md-empty-view" style="padding:40px;">
        <p>Chưa có bản ghi nào. Nhấn "Thêm bản ghi" để bắt đầu nhập dữ liệu.</p>
      </div>`;
    } else {
      // Record tabs + 2-column view
      html += `<div class="md-record-tabs">`;
      records.forEach((rec, idx) => {
        const selected = (MasterDataState.selectedRecord === idx || (!MasterDataState.selectedRecord && idx === 0)) ? ' active' : '';
        const label = this._getRecordLabel(entity, rec, idx);
        html += `<button class="md-record-tab${selected}" onclick="MasterData.selectRecord(${idx})">${label}</button>`;
      });
      html += `</div>`;

      // Show selected record in 2-column format
      const recIdx = MasterDataState.selectedRecord || 0;
      const rec = records[recIdx] || records[0];
      if (rec) {
        html += this._renderKeyValueRecord(entity, rec, recIdx, childLinks);
      }
    }

    html += '</div>';
    container.innerHTML = html;
  },

  selectRecord(idx) {
    MasterDataState.selectedRecord = idx;
    this.renderRecords();
  },

  _getRecordLabel(entity, rec, idx) {
    // Try to use first non-empty field value as label
    for (const f of entity.fields) {
      const v = rec[f.id];
      if (v && String(v).trim()) return _mdEsc(String(v).substring(0, 20));
    }
    return `Bản ghi ${idx + 1}`;
  },

  _getLinkedEntities(entityId) {
    const links = [];
    const seen = new Set();
    MasterDataState.connections.forEach(conn => {
      let childEntityId = null;
      let linkFieldFrom = null;
      let linkFieldTo = null;
      if (conn.fromEntity === entityId) {
        childEntityId = conn.toEntity;
        linkFieldFrom = conn.fromField;
        linkFieldTo = conn.toField;
      } else if (conn.toEntity === entityId) {
        childEntityId = conn.fromEntity;
        linkFieldFrom = conn.toField;
        linkFieldTo = conn.fromField;
      }
      if (childEntityId && !seen.has(childEntityId)) {
        const childEnt = MasterDataState.entities.find(e => e.id === childEntityId);
        if (childEnt) {
          seen.add(childEntityId);
          links.push({ entity: childEnt, connId: conn.id, linkFieldFrom, linkFieldTo });
        }
      }
    });
    return links;
  },

  _renderKeyValueRecord(entity, rec, recIdx, childLinks) {
    let html = `<div class="md-kv-record">`;

    // ── Parent entity fields (2-column: Label | Value) ──
    html += `<div class="md-kv-section">
      <div class="md-kv-section-header" style="border-left:4px solid ${entity.color};">
        <span class="md-kv-section-icon" style="background:${entity.color};">${_mdEsc(entity.name.charAt(0))}</span>
        <span class="md-kv-section-title">${_mdEsc(entity.name)}</span>
        <div class="md-kv-section-actions">
          <button class="md-rec-action-btn md-rec-fill-btn" onclick="MasterData.autoFillRecord('${entity.id}', ${recIdx})" title="Auto-fill">🔗 Auto-fill</button>
          <button class="md-rec-action-btn md-rec-del-btn" onclick="MasterData.deleteRecord('${entity.id}', ${recIdx})" title="Xóa">✕ Xóa</button>
        </div>
      </div>
      <table class="md-kv-table">
        <thead><tr><th class="md-kv-label-col">Trường dữ liệu</th><th class="md-kv-value-col">Giá trị</th></tr></thead>
        <tbody>`;

    entity.fields.forEach(field => {
      const val = rec[field.id] || '';
      // Check if this field has linked records for dropdown
      const linkedDropdown = this._getDropdownForField(entity.id, field, childLinks);
      html += `<tr class="md-kv-row">
        <td class="md-kv-label">
          <span class="md-kv-field-type" title="${this._fieldTypeLabel(field.type)}">${this._fieldTypeIcon(field.type)}</span>
          ${_mdEsc(field.name)}
        </td>
        <td class="md-kv-value">`;
      if (linkedDropdown) {
        html += this._renderDropdownCell(entity.id, recIdx, field, val, linkedDropdown);
      } else {
        html += `<input type="text" class="md-kv-input" value="${_mdEsc(val)}"
          data-entity="${entity.id}" data-record="${recIdx}" data-field="${field.id}"
          onchange="MasterData.onKvEdit(this)">`;
      }
      html += `</td></tr>`;
    });

    html += `</tbody></table></div>`;

    // ── Child entity sections (cascading) ──
    childLinks.forEach(link => {
      html += this._renderChildSection(entity, rec, recIdx, link);
    });

    html += `</div>`;
    return html;
  },

  _getDropdownForField(entityId, field, childLinks) {
    // Check if this field connects to another entity and that entity has records
    for (const link of childLinks) {
      // Find all connections between this entity and the child
      const conns = MasterDataState.connections.filter(c =>
        (c.fromEntity === entityId && c.toEntity === link.entity.id) ||
        (c.toEntity === entityId && c.fromEntity === link.entity.id)
      );
      for (const conn of conns) {
        const myFieldId = (conn.fromEntity === entityId) ? conn.fromField : conn.toField;
        if (myFieldId === field.id) {
          const otherEntityRecords = MasterDataState.records[link.entity.id] || [];
          if (otherEntityRecords.length > 0) {
            const otherFieldId = (conn.fromEntity === entityId) ? conn.toField : conn.fromField;
            return { childEntity: link.entity, otherFieldId, records: otherEntityRecords };
          }
        }
      }
    }
    return null;
  },

  _renderDropdownCell(entityId, recIdx, field, currentVal, dropdown) {
    // Get unique values from the linked entity's field
    const options = new Set();
    dropdown.records.forEach(r => {
      const v = r[dropdown.otherFieldId];
      if (v && String(v).trim()) options.add(String(v));
    });

    let html = `<div class="md-kv-dropdown-wrap">
      <select class="md-kv-select" data-entity="${entityId}" data-record="${recIdx}"
        data-field="${field.id}" data-child-entity="${dropdown.childEntity.id}"
        data-child-field="${dropdown.otherFieldId}"
        onchange="MasterData.onDropdownChange(this)">
        <option value="">-- Chọn từ ${_mdEsc(dropdown.childEntity.name)} --</option>`;
    options.forEach(v => {
      html += `<option value="${_mdEsc(v)}" ${v === currentVal ? 'selected' : ''}>${_mdEsc(v)}</option>`;
    });
    html += `</select>
      <span class="md-kv-link-badge" style="background:${dropdown.childEntity.color}20;color:${dropdown.childEntity.color};">
        🔗 ${_mdEsc(dropdown.childEntity.name)}
      </span>
    </div>`;
    return html;
  },

  _renderChildSection(parentEntity, parentRec, parentRecIdx, link) {
    const childEntity = link.entity;
    const childRecords = MasterDataState.records[childEntity.id] || [];

    // Find which child records are related via the connection
    const matchingRecords = this._findMatchingChildRecords(parentEntity.id, parentRec, childEntity.id);

    let html = `<div class="md-kv-section md-kv-child-section">
      <div class="md-kv-section-header" style="border-left:4px solid ${childEntity.color};">
        <span class="md-kv-section-icon" style="background:${childEntity.color};">${_mdEsc(childEntity.name.charAt(0))}</span>
        <span class="md-kv-section-title">${_mdEsc(childEntity.name)}</span>
        <span class="md-kv-child-badge">${matchingRecords.length} kết quả liên kết</span>
      </div>`;

    if (matchingRecords.length === 0) {
      html += `<div class="md-kv-child-empty">
        <p>Chưa có dữ liệu liên kết. Hãy nhập dữ liệu cho "${_mdEsc(childEntity.name)}" hoặc chọn giá trị ở trường liên kết phía trên.</p>
      </div>`;
    } else {
      // Show matching records as a compact table
      html += `<div class="md-kv-child-records">
        <table class="md-kv-table md-kv-child-table">
          <thead><tr>`;
      childEntity.fields.slice(0, 8).forEach(f => {
        html += `<th>${_mdEsc(f.name)}</th>`;
      });
      html += `</tr></thead><tbody>`;
      matchingRecords.forEach(mr => {
        html += `<tr class="md-kv-child-row" onclick="MasterData.applyChildRecord('${parentEntity.id}', ${parentRecIdx}, '${childEntity.id}', ${mr.idx})">`;
        childEntity.fields.slice(0, 8).forEach(f => {
          html += `<td>${_mdEsc(mr.record[f.id] || '')}</td>`;
        });
        html += `</tr>`;
      });
      html += `</tbody></table></div>`;
    }

    html += `</div>`;
    return html;
  },

  _findMatchingChildRecords(parentEntityId, parentRec, childEntityId) {
    const conns = MasterDataState.connections.filter(c =>
      (c.fromEntity === parentEntityId && c.toEntity === childEntityId) ||
      (c.toEntity === parentEntityId && c.fromEntity === childEntityId)
    );

    const childRecords = MasterDataState.records[childEntityId] || [];
    if (conns.length === 0 || childRecords.length === 0) return [];

    const results = [];
    childRecords.forEach((cr, idx) => {
      let matches = false;
      for (const conn of conns) {
        const parentFieldId = (conn.fromEntity === parentEntityId) ? conn.fromField : conn.toField;
        const childFieldId = (conn.fromEntity === parentEntityId) ? conn.toField : conn.fromField;

        const parentVal = parentRec[parentFieldId];
        const childVal = cr[childFieldId];

        if (parentVal && childVal && String(parentVal).toLowerCase().trim() === String(childVal).toLowerCase().trim()) {
          matches = true;
          break;
        }
      }
      if (matches) results.push({ record: cr, idx });
    });

    return results;
  },

  onDropdownChange(select) {
    const entityId = select.getAttribute('data-entity');
    const recIdx = parseInt(select.getAttribute('data-record'));
    const fieldId = select.getAttribute('data-field');
    const childEntityId = select.getAttribute('data-child-entity');
    const childFieldId = select.getAttribute('data-child-field');
    const value = select.value;

    // Update the parent record field
    if (!MasterDataState.records[entityId]) MasterDataState.records[entityId] = [];
    if (MasterDataState.records[entityId][recIdx]) {
      MasterDataState.records[entityId][recIdx][fieldId] = value;
    }

    // Auto-fill from child entity if a matching record exists
    if (value && childEntityId) {
      const childRecords = MasterDataState.records[childEntityId] || [];
      const matchRec = childRecords.find(r => String(r[childFieldId]) === value);
      if (matchRec) {
        const parentEntity = MasterDataState.entities.find(e => e.id === entityId);
        const childEntity = MasterDataState.entities.find(e => e.id === childEntityId);
        if (parentEntity && childEntity) {
          const parentFieldMap = new Map(parentEntity.fields.map(f => [f.name.toLowerCase().trim(), f.id]));
          let filled = 0;
          childEntity.fields.forEach(cf => {
            const matchParentFieldId = parentFieldMap.get(cf.name.toLowerCase().trim());
            if (matchParentFieldId && matchRec[cf.id]) {
              MasterDataState.records[entityId][recIdx][matchParentFieldId] = matchRec[cf.id];
              filled++;
            }
          });
          if (filled > 0) {
            App.toast(`Auto-fill ${filled} trường từ "${childEntity.name}"`, 'success');
          }
        }
      }
    }

    this.saveState();
    this.renderRecords();
  },

  applyChildRecord(parentEntityId, parentRecIdx, childEntityId, childRecIdx) {
    const parentEntity = MasterDataState.entities.find(e => e.id === parentEntityId);
    const childEntity = MasterDataState.entities.find(e => e.id === childEntityId);
    if (!parentEntity || !childEntity) return;

    const parentRec = MasterDataState.records[parentEntityId]?.[parentRecIdx];
    const childRec = MasterDataState.records[childEntityId]?.[childRecIdx];
    if (!parentRec || !childRec) return;

    const parentFieldMap = new Map(parentEntity.fields.map(f => [f.name.toLowerCase().trim(), f.id]));
    let filled = 0;
    childEntity.fields.forEach(cf => {
      const matchId = parentFieldMap.get(cf.name.toLowerCase().trim());
      if (matchId && childRec[cf.id]) {
        parentRec[matchId] = childRec[cf.id];
        filled++;
      }
    });

    this.saveState();
    this.renderRecords();
    if (filled > 0) {
      App.toast(`Đã áp dụng ${filled} trường từ "${childEntity.name}"`, 'success');
    }
  },

  onKvEdit(input) {
    const entityId = input.getAttribute('data-entity');
    const recIdx = parseInt(input.getAttribute('data-record'));
    const fieldId = input.getAttribute('data-field');
    const value = input.value.trim();

    if (!MasterDataState.records[entityId]) MasterDataState.records[entityId] = [];
    if (MasterDataState.records[entityId][recIdx]) {
      MasterDataState.records[entityId][recIdx][fieldId] = value;
      this.saveState();
    }
  },

  onCellEdit(td) {
    const entityId = td.getAttribute('data-entity');
    const recIdx = parseInt(td.getAttribute('data-record'));
    const fieldId = td.getAttribute('data-field');
    const value = td.textContent.trim();

    if (!MasterDataState.records[entityId]) MasterDataState.records[entityId] = [];
    if (MasterDataState.records[entityId][recIdx]) {
      MasterDataState.records[entityId][recIdx][fieldId] = value;
      this.saveState();
    }
  },

  _fieldTypeIcon(type) {
    const icons = { text:'Aa', number:'#', date:'📅', select:'▼', currency:'💰', percent:'%', phone:'📞', email:'@' };
    return icons[type] || 'Aa';
  },
  _fieldTypeLabel(type) {
    const m = FIELD_TYPES.find(t => t.value === type);
    return m ? m.label : 'Văn bản';
  },

  addRecord(entityId) {
    const entity = MasterDataState.entities.find(e => e.id === entityId);
    if (!entity) return;

    if (!MasterDataState.records[entityId]) MasterDataState.records[entityId] = [];

    const rec = {};
    entity.fields.forEach(f => { rec[f.id] = ''; });
    MasterDataState.records[entityId].push(rec);
    MasterDataState.selectedRecord = MasterDataState.records[entityId].length - 1;
    this.saveState();
    this.renderRecords();
    this.renderEntityList();
    App.toast('Đã thêm bản ghi mới', 'success');
  },

  deleteRecord(entityId, idx) {
    if (!confirm('Xóa bản ghi này?')) return;
    if (MasterDataState.records[entityId]) {
      MasterDataState.records[entityId].splice(idx, 1);
      MasterDataState.selectedRecord = 0;
      this.saveState();
      this.renderRecords();
      this.renderEntityList();
      App.toast('Đã xóa bản ghi', 'info');
    }
  },

  // ── Auto-fill related records ──
  autoFillRecord(entityId, recIdx) {
    const entity = MasterDataState.entities.find(e => e.id === entityId);
    if (!entity) return;

    const record = MasterDataState.records[entityId]?.[recIdx];
    if (!record) return;

    const connections = MasterDataState.connections.filter(
      c => c.fromEntity === entityId || c.toEntity === entityId
    );

    if (connections.length === 0) {
      App.toast('Entity này không có liên kết nào để auto-fill', 'info');
      return;
    }

    let fillCount = 0;

    connections.forEach(conn => {
      const isFrom = conn.fromEntity === entityId;
      const myFieldId = isFrom ? conn.fromField : conn.toField;
      const otherEntityId = isFrom ? conn.toEntity : conn.fromEntity;
      const otherFieldId = isFrom ? conn.toField : conn.fromField;

      const myFieldValue = record[myFieldId];
      if (!myFieldValue) return;

      const otherRecords = MasterDataState.records[otherEntityId] || [];
      const matchingRecord = otherRecords.find(r => r[otherFieldId] === myFieldValue);

      if (matchingRecord) {
        const otherEntity = MasterDataState.entities.find(e => e.id === otherEntityId);
        if (!otherEntity) return;

        const myFieldNames = new Map(entity.fields.map(f => [f.name.toLowerCase().trim(), f.id]));

        otherEntity.fields.forEach(otherField => {
          const otherFieldName = otherField.name.toLowerCase().trim();
          const myMatchFieldId = myFieldNames.get(otherFieldName);
          if (myMatchFieldId && !record[myMatchFieldId] && matchingRecord[otherField.id]) {
            record[myMatchFieldId] = matchingRecord[otherField.id];
            fillCount++;
          }
        });
      }
    });

    this.saveState();
    this.renderRecords();

    if (fillCount > 0) {
      App.toast(`Đã auto-fill ${fillCount} trường từ dữ liệu liên kết!`, 'success');
    } else {
      App.toast('Không tìm thấy dữ liệu phù hợp để auto-fill', 'info');
    }
  },

  // ── Import records from Excel ──
  importRecordsFromExcel(entityId) {
    const entity = MasterDataState.entities.find(e => e.id === entityId);
    if (!entity) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls,.csv';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        App.toast('Đang đọc file...', 'info');
        const arrayBuffer = await file.arrayBuffer();
        const data = new Uint8Array(arrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        if (jsonData.length === 0) {
          App.toast('File không có dữ liệu', 'warning');
          return;
        }

        if (!MasterDataState.records[entityId]) MasterDataState.records[entityId] = [];

        let importCount = 0;
        jsonData.forEach(row => {
          const rec = {};
          entity.fields.forEach(field => {
            const val = row[field.name] ?? '';
            rec[field.id] = String(val);
          });
          MasterDataState.records[entityId].push(rec);
          importCount++;
        });

        this.saveState();
        this.renderRecords();
        this.renderEntityList();
        App.toast(`Đã import ${importCount} bản ghi từ "${file.name}"`, 'success');

      } catch (err) {
        console.error('Import error:', err);
        App.toast('Lỗi import: ' + err.message, 'error');
      }
    };
    input.click();
  },

  // ══════════════════════════════════════════
  //  ENTITY MANAGEMENT — Add/Edit/Delete
  // ══════════════════════════════════════════
  showAddEntity() {
    this._showEntityModal(null);
  },

  showEditEntity(id) {
    this._showEntityModal(id);
  },

  _showEntityModal(entityId) {
    const modal = document.getElementById('modal-entity');
    if (!modal) return;

    const entity = entityId ? MasterDataState.entities.find(e => e.id === entityId) : null;
    const isEdit = !!entity;

    document.getElementById('entity-modal-title').textContent = isEdit ? 'Chỉnh sửa Entity' : 'Thêm Entity mới';
    document.getElementById('entity-name-input').value = entity ? entity.name : '';
    document.getElementById('entity-color-input').value = entity ? entity.color : ENTITY_COLORS[MasterDataState.entities.length % ENTITY_COLORS.length];
    document.getElementById('entity-modal-id').value = entityId || '';

    // Render fields editor
    const fieldsContainer = document.getElementById('entity-fields-editor');
    const fields = entity ? entity.fields : [{ id: _mdId(), name: '', type: 'text' }];

    this._renderFieldsEditor(fieldsContainer, fields);

    modal.style.display = 'flex';
  },

  _renderFieldsEditor(container, fields) {
    container.innerHTML = fields.map((f, idx) => `
      <div class="md-field-row" data-field-id="${f.id}">
        <span class="md-field-idx">${idx + 1}</span>
        <input type="text" class="input md-field-name-input" value="${_mdEsc(f.name)}"
          placeholder="Tên trường..." data-field-id="${f.id}">
        <select class="input md-field-type-select" data-field-id="${f.id}">
          ${FIELD_TYPES.map(t => `<option value="${t.value}" ${f.type === t.value ? 'selected' : ''}>${t.label}</option>`).join('')}
        </select>
        <button class="md-field-remove-btn" onclick="MasterData.removeFieldRow(this)" title="Xóa trường">✕</button>
      </div>
    `).join('');
  },

  addFieldRow() {
    const container = document.getElementById('entity-fields-editor');
    if (!container) return;

    const newRow = document.createElement('div');
    newRow.className = 'md-field-row';
    const newId = _mdId();
    newRow.setAttribute('data-field-id', newId);
    newRow.innerHTML = `
      <span class="md-field-idx">${container.children.length + 1}</span>
      <input type="text" class="input md-field-name-input" value="" placeholder="Tên trường..." data-field-id="${newId}">
      <select class="input md-field-type-select" data-field-id="${newId}">
        ${FIELD_TYPES.map(t => `<option value="${t.value}">${t.label}</option>`).join('')}
      </select>
      <button class="md-field-remove-btn" onclick="MasterData.removeFieldRow(this)" title="Xóa trường">✕</button>
    `;
    container.appendChild(newRow);
  },

  removeFieldRow(btn) {
    const row = btn.closest('.md-field-row');
    if (row) row.remove();
  },

  saveEntity() {
    const name = document.getElementById('entity-name-input').value.trim();
    if (!name) { App.toast('Vui lòng nhập tên entity', 'warning'); return; }

    const color = document.getElementById('entity-color-input').value;
    const entityId = document.getElementById('entity-modal-id').value;

    // Collect fields
    const fields = [];
    document.querySelectorAll('#entity-fields-editor .md-field-row').forEach(row => {
      const fId = row.getAttribute('data-field-id');
      const fName = row.querySelector('.md-field-name-input').value.trim();
      const fType = row.querySelector('.md-field-type-select').value;
      if (fName) {
        fields.push({ id: fId, name: fName, type: fType });
      }
    });

    if (entityId) {
      // Edit existing
      const ent = MasterDataState.entities.find(e => e.id === entityId);
      if (ent) {
        ent.name = name;
        ent.color = color;
        ent.fields = fields;
        App.toast('Đã cập nhật entity!', 'success');
      }
    } else {
      // Create new
      const ent = {
        id: _mdId(),
        name,
        color,
        fields,
        x: 200 + Math.random() * 600,
        y: 100 + Math.random() * 400
      };
      MasterDataState.entities.push(ent);
      MasterDataState.records[ent.id] = [];
      App.toast('Đã tạo entity mới!', 'success');
    }

    this.saveState();
    this.closeEntityModal();
    this.renderEntityList();
    if (MasterDataState.viewMode === 'mindmap') this.renderMindmap();
    if (MasterDataState.viewMode === 'matrix') this.renderMatrix();
  },

  deleteEntity(id) {
    if (!confirm('Xóa entity này và toàn bộ dữ liệu bản ghi?')) return;
    MasterDataState.entities = MasterDataState.entities.filter(e => e.id !== id);
    MasterDataState.connections = MasterDataState.connections.filter(c => c.fromEntity !== id && c.toEntity !== id);
    delete MasterDataState.records[id];
    if (MasterDataState.selectedEntity === id) MasterDataState.selectedEntity = null;
    this.saveState();
    this.renderEntityList();
    if (MasterDataState.viewMode === 'mindmap') this.renderMindmap();
    if (MasterDataState.viewMode === 'matrix') this.renderMatrix();
    App.toast('Đã xóa entity', 'info');
  },

  closeEntityModal() {
    const m = document.getElementById('modal-entity');
    if (m) m.style.display = 'none';
  },

  // ── Connection Management ──
  showAddConnection() {
    const modal = document.getElementById('modal-connection');
    if (!modal) return;

    const entities = MasterDataState.entities;
    const opts = entities.map(e => `<option value="${e.id}">${_mdEsc(e.name)}</option>`).join('');

    document.getElementById('conn-from-entity').innerHTML = '<option value="">-- Chọn entity --</option>' + opts;
    document.getElementById('conn-to-entity').innerHTML = '<option value="">-- Chọn entity --</option>' + opts;
    document.getElementById('conn-from-field').innerHTML = '<option value="">-- Chọn trường --</option>';
    document.getElementById('conn-to-field').innerHTML = '<option value="">-- Chọn trường --</option>';

    modal.style.display = 'flex';
  },

  onConnEntityChange(type) {
    const entityId = document.getElementById(`conn-${type}-entity`).value;
    const fieldSelect = document.getElementById(`conn-${type}-field`);

    if (!entityId) {
      fieldSelect.innerHTML = '<option value="">-- Chọn trường --</option>';
      return;
    }

    const entity = MasterDataState.entities.find(e => e.id === entityId);
    if (!entity) return;

    fieldSelect.innerHTML = '<option value="">-- Chọn trường --</option>' +
      entity.fields.map(f => `<option value="${f.id}">${_mdEsc(f.name)}</option>`).join('');
  },

  saveConnection() {
    const fromEntity = document.getElementById('conn-from-entity').value;
    const toEntity = document.getElementById('conn-to-entity').value;
    const fromField = document.getElementById('conn-from-field').value;
    const toField = document.getElementById('conn-to-field').value;

    if (!fromEntity || !toEntity || !fromField || !toField) {
      App.toast('Vui lòng chọn đầy đủ entity và trường', 'warning');
      return;
    }

    if (fromEntity === toEntity) {
      App.toast('Không thể liên kết entity với chính nó', 'warning');
      return;
    }

    const fromFieldObj = MasterDataState.entities.find(e => e.id === fromEntity)?.fields.find(f => f.id === fromField);

    MasterDataState.connections.push({
      id: _mdId(),
      fromEntity,
      toEntity,
      fromField,
      toField,
      label: fromFieldObj ? fromFieldObj.name : ''
    });

    this.saveState();
    this.closeConnectionModal();
    if (MasterDataState.viewMode === 'mindmap') this.renderMindmap();
    if (MasterDataState.viewMode === 'matrix') this.renderMatrix();
    App.toast('Đã tạo liên kết!', 'success');
  },

  closeConnectionModal() {
    const m = document.getElementById('modal-connection');
    if (m) m.style.display = 'none';
  },

  // ══════════════════════════════════════════
  //  TEMPLATE INTEGRATION — Insert from Master Data
  // ══════════════════════════════════════════
  getAllFieldsFlat() {
    const result = [];
    MasterDataState.entities.forEach(ent => {
      ent.fields.forEach(field => {
        result.push({
          entityId: ent.id,
          entityName: ent.name,
          entityColor: ent.color,
          fieldId: field.id,
          fieldName: field.name,
          fieldType: field.type,
          fullLabel: `[${ent.name}] ${field.name}`
        });
      });
    });
    return result;
  },

  getFieldValue(entityId, fieldId, recordIdx = 0) {
    const records = MasterDataState.records[entityId] || [];
    if (recordIdx >= records.length) return '';
    return records[recordIdx][fieldId] || '';
  },

  getDataForMerge() {
    const data = {};
    MasterDataState.entities.forEach(ent => {
      const records = MasterDataState.records[ent.id] || [];
      if (records.length > 0) {
        const rec = records[0];
        ent.fields.forEach(field => {
          const key = `[${ent.name}] ${field.name}`;
          data[key] = rec[field.id] || '';
        });
      }
    });
    return data;
  },

  // ── Render master data entity cards for placeholder modals ──
  renderMasterDataSourceCards(containerId, callbackPrefix) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const entities = MasterDataState.entities;
    if (entities.length === 0) {
      container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:24px;color:var(--text-muted);">
        <p style="font-size:2rem;margin-bottom:8px;">📊</p>
        <p>Chưa có Master Data.</p>
        <p style="font-size:0.78rem;margin-top:6px;">Tạo entity trong mục <b>Master Data</b>.</p>
      </div>`;
      return;
    }

    container.innerHTML = entities.map(ent => {
      const recCount = (MasterDataState.records[ent.id] || []).length;
      return `<div class="ph-source-card md-ph-entity-card" onclick="${callbackPrefix}('${ent.id}')" style="border-left:3px solid ${ent.color};">
        <span class="ph-source-icon" style="color:${ent.color};">⬢</span>
        <span class="ph-source-label">${_mdEsc(ent.name)}</span>
        <span class="ph-source-count">${ent.fields.length} trường • ${recCount} bản ghi</span>
      </div>`;
    }).join('');
  },

  // ── Render fields of a selected entity for insertion ──
  renderMasterDataFields(entityId, containerId, callbackPrefix, filter) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const entity = MasterDataState.entities.find(e => e.id === entityId);
    if (!entity) return;

    const fields = filter
      ? entity.fields.filter(f => f.name.toLowerCase().includes(filter.toLowerCase()))
      : entity.fields;

    container.innerHTML = fields.map(f => `
      <div class="ph-field-chip md-ph-field-chip" onclick="${callbackPrefix}('${_mdEsc(entity.name)}', '${_mdEsc(f.name)}')" style="border-left:3px solid ${entity.color};">
        <span class="ph-field-icon" style="color:${entity.color};">${this._fieldTypeIcon(f.type)}</span>
        <span class="ph-field-name">${_mdEsc(f.name)}</span>
      </div>
    `).join('');
  },

  // ── Spreadsheet (Excel) integration ──
  _ssSelectedEntity: null,

  showSsMasterDataSources() {
    const srcStep = document.getElementById('ss-ph-step-source');
    const fieldsStep = document.getElementById('ss-ph-step-fields');
    const mdStep = document.getElementById('ss-ph-step-masterdata');
    if (srcStep) srcStep.style.display = 'none';
    if (fieldsStep) fieldsStep.style.display = 'none';
    if (mdStep) mdStep.style.display = '';

    this.renderMasterDataSourceCards('ss-md-entity-grid', 'MasterData.selectSsMdEntity');
  },

  selectSsMdEntity(entityId) {
    this._ssSelectedEntity = entityId;
    const entity = MasterDataState.entities.find(e => e.id === entityId);
    if (!entity) return;

    document.getElementById('ss-md-entity-label').textContent = `⬢ ${entity.name}`;
    document.getElementById('ss-md-entity-label').style.color = entity.color;
    document.getElementById('ss-md-step-entities').style.display = 'none';
    document.getElementById('ss-md-step-fields').style.display = '';

    this.renderMasterDataFields(entityId, 'ss-md-fields-grid', 'MasterData.insertSsMdField');
  },

  showSsMdEntitiesStep() {
    document.getElementById('ss-md-step-entities').style.display = '';
    document.getElementById('ss-md-step-fields').style.display = 'none';
  },

  filterSsMdFields(q) {
    if (!this._ssSelectedEntity) return;
    this.renderMasterDataFields(this._ssSelectedEntity, 'ss-md-fields-grid', 'MasterData.insertSsMdField', q);
  },

  insertSsMdField(entityName, fieldName) {
    const placeholder = `[${entityName}] ${fieldName}`;
    Spreadsheet.insertPhField(placeholder);
  },

  // ── Word Template integration ──
  _wordSelectedEntity: null,

  showWordMasterDataSources() {
    document.getElementById('word-ph-step-source').style.display = 'none';
    document.getElementById('word-ph-step-fields').style.display = 'none';
    document.getElementById('word-ph-step-masterdata').style.display = '';

    this.renderMasterDataSourceCards('word-md-entity-grid', 'MasterData.selectWordMdEntity');
  },

  selectWordMdEntity(entityId) {
    this._wordSelectedEntity = entityId;
    const entity = MasterDataState.entities.find(e => e.id === entityId);
    if (!entity) return;

    document.getElementById('word-md-entity-label').textContent = `⬢ ${entity.name}`;
    document.getElementById('word-md-entity-label').style.color = entity.color;
    document.getElementById('word-md-step-entities').style.display = 'none';
    document.getElementById('word-md-step-fields').style.display = '';

    this.renderMasterDataFields(entityId, 'word-md-fields-grid', 'MasterData.insertWordMdField');
  },

  showWordMdEntitiesStep() {
    document.getElementById('word-md-step-entities').style.display = '';
    document.getElementById('word-md-step-fields').style.display = 'none';
  },

  filterWordMdFields(q) {
    if (!this._wordSelectedEntity) return;
    this.renderMasterDataFields(this._wordSelectedEntity, 'word-md-fields-grid', 'MasterData.insertWordMdField', q);
  },

  insertWordMdField(entityName, fieldName) {
    const placeholder = `[${entityName}] ${fieldName}`;
    WordEditor.insertPhField(placeholder);
  },

  // ── Tab switching for modals ──
  _switchSsTab(tab) {
    const fileBtn = document.getElementById('ss-tab-file');
    const masterBtn = document.getElementById('ss-tab-master');
    const srcStep = document.getElementById('ss-ph-step-source');
    const fieldsStep = document.getElementById('ss-ph-step-fields');
    const mdStep = document.getElementById('ss-ph-step-masterdata');

    if (tab === 'file') {
      fileBtn.classList.add('active');
      masterBtn.classList.remove('active');
      if (srcStep) srcStep.style.display = '';
      if (fieldsStep) fieldsStep.style.display = 'none';
      if (mdStep) mdStep.style.display = 'none';
    } else {
      fileBtn.classList.remove('active');
      masterBtn.classList.add('active');
      if (srcStep) srcStep.style.display = 'none';
      if (fieldsStep) fieldsStep.style.display = 'none';
      this.showSsMasterDataSources();
    }
  },

  _switchWordTab(tab) {
    const fileBtn = document.getElementById('word-tab-file');
    const masterBtn = document.getElementById('word-tab-master');
    const srcStep = document.getElementById('word-ph-step-source');
    const fieldsStep = document.getElementById('word-ph-step-fields');
    const mdStep = document.getElementById('word-ph-step-masterdata');

    if (tab === 'file') {
      fileBtn.classList.add('active');
      masterBtn.classList.remove('active');
      if (srcStep) srcStep.style.display = '';
      if (fieldsStep) fieldsStep.style.display = 'none';
      if (mdStep) mdStep.style.display = 'none';
    } else {
      fileBtn.classList.remove('active');
      masterBtn.classList.add('active');
      if (srcStep) srcStep.style.display = 'none';
      if (fieldsStep) fieldsStep.style.display = 'none';
      this.showWordMasterDataSources();
    }
  },

  // ── Color picker helper ──
  _selectColor(el, color) {
    document.querySelectorAll('#entity-color-grid .md-color-swatch').forEach(s => s.classList.remove('selected'));
    el.classList.add('selected');
    document.getElementById('entity-color-input').value = color;
  }
};

// Init when DOM ready
document.addEventListener('DOMContentLoaded', () => {
  MasterData.init();
});

// ══════════════════════════════════════════════════
//  3-PANEL CONFIG VIEW — cfgXxx methods
// ══════════════════════════════════════════════════
Object.assign(MasterData, {

  // ── Panel 1: render entity list ──────────────────
  cfgRenderEntityList() {
    const list = document.getElementById('md-cfg-entity-list');
    if (!list) return;
    const ents = MasterDataState.entities;
    if (!ents.length) {
      list.innerHTML = `<div class="md-cfg-empty"><span class="md-cfg-empty-icon">🗂️</span>Chưa có Entity nào.<br>Nhấn <b>＋ Thêm</b> để bắt đầu.</div>`;
      return;
    }
    list.innerHTML = ents.map(e => {
      const active = MasterDataState.selectedEntity === e.id ? ' active' : '';
      const rCount = (MasterDataState.records[e.id] || []).length;
      return `<div class="md-cfg-entity-item${active}" onclick="MasterData.cfgSelectEntity('${e.id}')">
        <span class="md-cfg-entity-dot" style="background:${e.color};"></span>
        <div class="md-cfg-entity-info">
          <span class="md-cfg-entity-name">${_mdEsc(e.name)}</span>
          <span class="md-cfg-entity-meta">${e.fields.length} cột · ${rCount} bản ghi</span>
        </div>
        <div class="md-cfg-entity-actions">
          <button class="md-cfg-ent-btn" onclick="event.stopPropagation();MasterData.showEditEntity('${e.id}')" title="Sửa">✎</button>
          <button class="md-cfg-ent-btn del" onclick="event.stopPropagation();MasterData.deleteEntity('${e.id}')" title="Xóa">✕</button>
        </div>
      </div>`;
    }).join('');
  },

  // ── Panel 1 → select entity ───────────────────────
  cfgSelectEntity(id) {
    MasterDataState.selectedEntity = id;
    MasterDataState.selectedRecord = 0;
    this.cfgRenderEntityList();
    this.cfgRenderColumns(id);
    this.cfgRenderData(id);
  },

  // ── Panel 2: render columns ───────────────────────
  cfgRenderColumns(entityId) {
    const ent = MasterDataState.entities.find(e => e.id === entityId);
    const titleEl = document.getElementById('md-cfg-col-title');
    const hintEl  = document.getElementById('md-cfg-col-hint');
    const addBtn  = document.getElementById('md-cfg-add-col-btn');
    const listEl  = document.getElementById('md-cfg-columns-list');
    if (!listEl) return;

    if (!ent) {
      if (titleEl) titleEl.textContent = 'Cột dữ liệu';
      if (hintEl)  hintEl.textContent  = '← Chọn Entity để cấu hình các cột';
      if (addBtn)  addBtn.style.display = 'none';
      listEl.innerHTML = '';
      return;
    }
    if (titleEl) titleEl.textContent = ent.name;
    if (hintEl)  hintEl.textContent  = `Định nghĩa các cột dữ liệu cho "${ent.name}"`;
    if (addBtn)  addBtn.style.display = '';

    const icons = {text:'Aa',number:'#',date:'📅',select:'▼',currency:'₫',percent:'%',phone:'☎',email:'@'};
    listEl.innerHTML = ent.fields.map((f, i) => `
      <div class="md-col-row" data-field-id="${f.id}" data-entity-id="${entityId}">
        <span class="md-col-drag">⠿</span>
        <span class="md-col-type-badge">${icons[f.type]||'Aa'}</span>
        <input class="md-col-name-in" value="${_mdEsc(f.name)}" placeholder="Tên cột…"
          onchange="MasterData.cfgUpdateField('${entityId}','${f.id}','name',this.value)"
          onblur="MasterData.cfgRenderData('${entityId}')">
        <select class="md-col-type-sel"
          onchange="MasterData.cfgUpdateField('${entityId}','${f.id}','type',this.value);MasterData.cfgRenderColumns('${entityId}')">
          ${FIELD_TYPES.map(t=>`<option value="${t.value}"${f.type===t.value?' selected':''}>${t.label}</option>`).join('')}
        </select>
        <button class="md-col-del" onclick="MasterData.cfgRemoveField('${entityId}','${f.id}')" title="Xóa cột">✕</button>
      </div>`).join('') +
      `<div class="md-col-add-row" onclick="MasterData.cfgAddColumn()">＋ Thêm cột mới</div>`;
  },

  cfgUpdateField(entityId, fieldId, key, val) {
    const ent = MasterDataState.entities.find(e => e.id === entityId);
    if (!ent) return;
    const f = ent.fields.find(f => f.id === fieldId);
    if (f) { f[key] = val; this.saveState(); }
  },

  cfgRemoveField(entityId, fieldId) {
    const ent = MasterDataState.entities.find(e => e.id === entityId);
    if (!ent) return;
    if (ent.fields.length <= 1) { App.toast('Phải có ít nhất 1 cột', 'warning'); return; }
    ent.fields = ent.fields.filter(f => f.id !== fieldId);
    this.saveState();
    this.cfgRenderColumns(entityId);
    this.cfgRenderData(entityId);
  },

  cfgAddColumn() {
    const entityId = MasterDataState.selectedEntity;
    const ent = MasterDataState.entities.find(e => e.id === entityId);
    if (!ent) { App.toast('Chọn Entity trước', 'warning'); return; }
    ent.fields.push({ id: _mdId(), name: '', type: 'text' });
    this.saveState();
    this.cfgRenderColumns(entityId);
    // focus last input
    setTimeout(() => {
      const inputs = document.querySelectorAll('#md-cfg-columns-list .md-col-name-in');
      if (inputs.length) inputs[inputs.length - 1].focus();
    }, 60);
  },

  // ── Panel 3: render data records ─────────────────
  cfgRenderData(entityId) {
    const ent = MasterDataState.entities.find(e => e.id === entityId);
    const titleEl   = document.getElementById('md-cfg-data-title');
    const hintEl    = document.getElementById('md-cfg-data-hint');
    const actionsEl = document.getElementById('md-cfg-data-actions');
    const areaEl    = document.getElementById('md-cfg-data-area');
    if (!areaEl) return;

    if (!ent) {
      if (titleEl)   titleEl.textContent  = 'Nhập dữ liệu';
      if (hintEl)    hintEl.textContent   = '← Chọn Entity và cấu hình cột trước';
      if (actionsEl) actionsEl.style.display = 'none';
      areaEl.innerHTML = '';
      return;
    }
    if (titleEl)   titleEl.textContent  = `Dữ liệu: ${ent.name}`;
    if (hintEl)    hintEl.textContent   = '';
    if (actionsEl) { actionsEl.style.display = 'flex'; }

    const records = MasterDataState.records[entityId] || [];

    if (!records.length) {
      areaEl.innerHTML = `<div class="md-data-empty">
        <span class="md-data-empty-icon">📋</span>
        <h4>Chưa có bản ghi nào</h4>
        <p>Nhấn <b>＋ Thêm</b> để tạo bản ghi đầu tiên cho <b>${_mdEsc(ent.name)}</b></p>
        <button class="md-cfg-add-btn" onclick="MasterData.cfgAddRecord()" style="margin-top:14px;">＋ Thêm bản ghi</button>
      </div>`;
      return;
    }

    const selIdx = Math.min(MasterDataState.selectedRecord || 0, records.length - 1);
    const rec = records[selIdx];

    const tabs = records.map((r, i) => {
      const label = this._cfgRecLabel(ent, r, i);
      return `<button class="md-data-tab${i === selIdx ? ' active' : ''}" onclick="MasterData.cfgSelectRecord(${i})">${_mdEsc(label)}</button>`;
    }).join('');

    const fields = ent.fields.map(f => {
      const val = rec[f.id] || '';
      const icon = {text:'Aa',number:'#',date:'📅',select:'▼',currency:'₫',percent:'%',phone:'☎',email:'@'}[f.type] || 'Aa';
      const inp = f.type === 'select'
        ? `<select class="md-data-input" onchange="MasterData.cfgSetVal('${entityId}',${selIdx},'${f.id}',this.value)">
            <option value=""></option>
            ${(val ? [val] : []).map(v => `<option selected>${_mdEsc(v)}</option>`).join('')}
           </select>`
        : `<input class="md-data-input" type="${f.type==='number'||f.type==='currency'||f.type==='percent'?'number':f.type==='date'?'date':'text'}"
            value="${_mdEsc(val)}"
            onchange="MasterData.cfgSetVal('${entityId}',${selIdx},'${f.id}',this.value)">`;
      return `<div class="md-data-field-row">
        <div class="md-data-field-label"><span class="md-data-type-icon">${icon}</span>${_mdEsc(f.name||'(chưa đặt tên)')}</div>
        <div class="md-data-field-val">${inp}</div>
      </div>`;
    }).join('');

    areaEl.innerHTML = `
      <div class="md-data-tabs-bar">${tabs}</div>
      <div class="md-data-form">${fields}</div>
      <div class="md-data-rec-actions">
        <button class="md-data-del-btn" onclick="MasterData.cfgDeleteRecord('${entityId}',${selIdx})">✕ Xóa bản ghi này</button>
      </div>`;
  },

  _cfgRecLabel(ent, rec, idx) {
    for (const f of ent.fields) {
      const v = rec[f.id];
      if (v && String(v).trim()) return String(v).substring(0, 18);
    }
    return `Bản ghi ${idx + 1}`;
  },

  cfgSelectRecord(idx) {
    MasterDataState.selectedRecord = idx;
    this.cfgRenderData(MasterDataState.selectedEntity);
  },

  cfgSetVal(entityId, recIdx, fieldId, value) {
    if (!MasterDataState.records[entityId]) MasterDataState.records[entityId] = [];
    const rec = MasterDataState.records[entityId][recIdx];
    if (rec) { rec[fieldId] = value; this.saveState(); }
  },

  cfgAddRecord() {
    const entityId = MasterDataState.selectedEntity;
    const ent = MasterDataState.entities.find(e => e.id === entityId);
    if (!ent) { App.toast('Chọn Entity trước', 'warning'); return; }
    if (!MasterDataState.records[entityId]) MasterDataState.records[entityId] = [];
    const rec = {};
    ent.fields.forEach(f => { rec[f.id] = ''; });
    MasterDataState.records[entityId].push(rec);
    MasterDataState.selectedRecord = MasterDataState.records[entityId].length - 1;
    this.saveState();
    this.cfgRenderData(entityId);
    this.cfgRenderEntityList();
    App.toast('Đã thêm bản ghi mới', 'success');
  },

  cfgDeleteRecord(entityId, idx) {
    if (!confirm('Xóa bản ghi này?')) return;
    MasterDataState.records[entityId].splice(idx, 1);
    MasterDataState.selectedRecord = 0;
    this.saveState();
    this.cfgRenderData(entityId);
    this.cfgRenderEntityList();
    App.toast('Đã xóa bản ghi', 'info');
  }
});
