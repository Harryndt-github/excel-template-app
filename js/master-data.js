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
  viewMode: 'mindmap', // 'mindmap' | 'matrix' | 'records'
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
    this.setView(MasterDataState.viewMode);
    this.renderEntityList();
  },

  setView(mode) {
    MasterDataState.viewMode = mode;
    document.querySelectorAll('.md-view-btn').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-view') === mode);
    });
    document.querySelectorAll('.md-view-panel').forEach(p => p.style.display = 'none');
    const panel = document.getElementById(`md-view-${mode}`);
    if (panel) panel.style.display = 'block';

    if (mode === 'mindmap') this.renderMindmap();
    if (mode === 'matrix') this.renderMatrix();
    if (mode === 'records') this.renderRecords();
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
  //  RECORDS VIEW — Data Entry & Auto-fill
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

    let html = `<div class="md-records-wrap">
      <div class="md-records-header">
        <div>
          <h4 style="color:${entity.color};">📋 ${_mdEsc(entity.name)} — Dữ liệu</h4>
          <span class="md-records-meta">${records.length} bản ghi • ${entity.fields.length} trường</span>
        </div>
        <div class="md-records-actions">
          <button class="btn btn-primary btn-sm" onclick="MasterData.addRecord('${entity.id}')">
            ＋ Thêm bản ghi
          </button>
          <button class="btn btn-outline btn-sm" onclick="MasterData.importRecordsFromExcel('${entity.id}')">
            📥 Import Excel
          </button>
        </div>
      </div>`;

    if (records.length === 0) {
      html += `<div class="md-empty-view" style="padding:40px;">
        <p>Chưa có bản ghi nào. Nhấn "Thêm bản ghi" để bắt đầu nhập dữ liệu.</p>
      </div>`;
    } else {
      // Data table
      html += '<div class="md-records-table-wrap"><table class="md-records-table"><thead><tr>';
      html += '<th style="width:40px;">#</th>';
      entity.fields.slice(0, 15).forEach(field => {
        html += `<th>${_mdEsc(field.name)}</th>`;
      });
      html += '<th style="width:80px;">Thao tác</th>';
      html += '</tr></thead><tbody>';

      records.forEach((rec, idx) => {
        html += `<tr class="md-record-row" data-idx="${idx}">`;
        html += `<td class="md-record-idx">${idx + 1}</td>`;
        entity.fields.slice(0, 15).forEach(field => {
          const val = rec[field.id] || '';
          html += `<td class="md-record-cell" contenteditable="true"
            data-entity="${entity.id}" data-record="${idx}" data-field="${field.id}"
            onblur="MasterData.onCellEdit(this)">${_mdEsc(val)}</td>`;
        });
        html += `<td>
          <button class="md-rec-action-btn md-rec-fill-btn" onclick="MasterData.autoFillRecord('${entity.id}', ${idx})" title="Auto-fill liên kết">🔗</button>
          <button class="md-rec-action-btn md-rec-del-btn" onclick="MasterData.deleteRecord('${entity.id}', ${idx})" title="Xóa">✕</button>
        </td>`;
        html += '</tr>';
      });

      html += '</tbody></table></div>';

      if (entity.fields.length > 15) {
        html += `<p class="md-records-more-hint">Hiển thị 15/${entity.fields.length} trường. Scroll ngang để xem thêm.</p>`;
      }
    }

    html += '</div>';
    container.innerHTML = html;
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

  addRecord(entityId) {
    const entity = MasterDataState.entities.find(e => e.id === entityId);
    if (!entity) return;

    if (!MasterDataState.records[entityId]) MasterDataState.records[entityId] = [];

    const rec = {};
    entity.fields.forEach(f => { rec[f.id] = ''; });
    MasterDataState.records[entityId].push(rec);
    this.saveState();
    this.renderRecords();
    this.renderEntityList();
    App.toast('Đã thêm bản ghi mới', 'success');
  },

  deleteRecord(entityId, idx) {
    if (!confirm('Xóa bản ghi này?')) return;
    if (MasterDataState.records[entityId]) {
      MasterDataState.records[entityId].splice(idx, 1);
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

      // Find matching record in the other entity
      const otherRecords = MasterDataState.records[otherEntityId] || [];
      const matchingRecord = otherRecords.find(r => r[otherFieldId] === myFieldValue);

      if (matchingRecord) {
        // Find shared fields between entities
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
            // Try to match by field name
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
  // Gets all master data fields as a flat list for template insertion
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

  // Gets a specific record's value for a field
  getFieldValue(entityId, fieldId, recordIdx = 0) {
    const records = MasterDataState.records[entityId] || [];
    if (recordIdx >= records.length) return '';
    return records[recordIdx][fieldId] || '';
  },

  // Get all data for template merging
  getDataForMerge() {
    const data = {};
    MasterDataState.entities.forEach(ent => {
      const records = MasterDataState.records[ent.id] || [];
      if (records.length > 0) {
        const rec = records[0]; // Use first record for merge
        ent.fields.forEach(field => {
          const key = `[${ent.name}] ${field.name}`;
          data[key] = rec[field.id] || '';
        });
      }
    });
    return data;
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
