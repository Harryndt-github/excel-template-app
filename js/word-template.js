/* ============================================
   Word Template Builder — Rich Text WYSIWYG
   with placeholder insertion & Word export
   ============================================ */

const WordState = {
  templates: [],
  editingId: null,
  exportCount: 0,
  selectedTemplateId: null,
  uploadedFiles: {},
  extractedData: {},
  currentStep: 1
};

/* ── Helpers ── */
function _wEsc(text) {
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}
function _wSanId(str) {
  return str.replace(/[^a-zA-Z0-9_\u00C0-\u1EF9]/g, '_');
}

/* ─────────────────────────────────────────────
   WORD EDITOR
   ───────────────────────────────────────────── */
const WordEditor = {
  _savedRange: null,
  _phSelectedSource: null,

  init() {
    this.loadState();
  },

  loadState() {
    try {
      const s = localStorage.getItem('excelmapper_word_templates');
      if (s) WordState.templates = JSON.parse(s);
      const e = localStorage.getItem('excelmapper_word_exports');
      if (e) WordState.exportCount = parseInt(e) || 0;
    } catch (e) { console.error(e); }
  },

  saveState() {
    try {
      localStorage.setItem('excelmapper_word_templates', JSON.stringify(WordState.templates));
      localStorage.setItem('excelmapper_word_exports', WordState.exportCount.toString());
    } catch (e) { console.error(e); }
  },

  resetEditor() {
    WordState.editingId = null;
    const t = document.getElementById('word-editor-title');
    if (t) t.textContent = 'Tạo Template Word mới';
    const n = document.getElementById('word-template-name');
    if (n) n.value = '';
    const a = document.getElementById('word-editor-area');
    if (a) a.innerHTML = '<p><br></p>';
    this.updatePlaceholdersList();
  },

  /* ── Formatting ── */
  exec(cmd, val) {
    document.execCommand(cmd, false, val || null);
    const a = document.getElementById('word-editor-area');
    if (a) a.focus();
  },
  toggleBold() { this.exec('bold'); },
  toggleItalic() { this.exec('italic'); },
  toggleUnderline() { this.exec('underline'); },
  toggleStrike() { this.exec('strikeThrough'); },
  setAlign(align) {
    const m = { left:'justifyLeft', center:'justifyCenter', right:'justifyRight', justify:'justifyFull' };
    this.exec(m[align] || 'justifyLeft');
  },
  setFontSize(size) { this.exec('fontSize', size); },
  setTextColor(color) { this.exec('foreColor', color); },
  setHighlight(color) { this.exec('hiliteColor', color); },
  insertList(type) { this.exec(type === 'ol' ? 'insertOrderedList' : 'insertUnorderedList'); },
  indent() { this.exec('indent'); },
  outdent() { this.exec('outdent'); },
  insertHR() { this.exec('insertHorizontalRule'); },
  clearFormat() { this.exec('removeFormat'); },

  /* ── Insert Table ── */
  showTableDialog() {
    const modal = document.getElementById('modal-word-table');
    if (modal) modal.style.display = 'flex';
  },
  closeTableDialog() {
    const modal = document.getElementById('modal-word-table');
    if (modal) modal.style.display = 'none';
  },
  insertTable() {
    const r = parseInt(document.getElementById('word-table-rows').value) || 3;
    const c = parseInt(document.getElementById('word-table-cols').value) || 3;
    let html = '<table style="width:100%;border-collapse:collapse;margin:10px 0;">';
    for (let i = 0; i < r; i++) {
      html += '<tr>';
      for (let j = 0; j < c; j++) {
        const tag = i === 0 ? 'th' : 'td';
        const st = i === 0
          ? 'border:1px solid #999;padding:6px 10px;background:#f0f0f5;font-weight:600;'
          : 'border:1px solid #999;padding:6px 10px;';
        html += `<${tag} style="${st}">${i === 0 ? 'Cột ' + (j+1) : '&nbsp;'}</${tag}>`;
      }
      html += '</tr>';
    }
    html += '</table><p><br></p>';
    this.exec('insertHTML', html);
    this.closeTableDialog();
    App.toast(`Đã chèn bảng ${r}×${c}`, 'success');
  },

  /* ── Placeholder Modal ── */
  showPlaceholderModal() {
    const sel = window.getSelection();
    if (sel.rangeCount > 0) this._savedRange = sel.getRangeAt(0).cloneRange();
    this._phSelectedSource = null;

    const modal = document.getElementById('modal-word-placeholder');
    if (!modal) return;
    modal.style.display = 'flex';

    const srcGrid = document.getElementById('word-ph-source-grid');
    const sources = DataSources.getAll();

    if (sources.length === 0) {
      srcGrid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:30px;color:var(--text-muted);">
        <p style="font-size:2rem;margin-bottom:10px;">📄</p>
        <p>Chưa có file nguồn nào.</p>
        <p style="font-size:0.78rem;margin-top:6px;">Upload file Excel ở panel <b>"Nguồn dữ liệu"</b> bên phải.</p>
      </div>`;
      return;
    }

    srcGrid.innerHTML = sources.map(src => `
      <div class="ph-source-card" onclick="WordEditor.selectPhSource('${src.id}')">
        <span class="ph-source-icon">📊</span>
        <span class="ph-source-label">${src.name || src.filename}</span>
        <span class="ph-source-count">${(src.fields||[]).length} trường</span>
      </div>
    `).join('');

    document.getElementById('word-ph-step-source').style.display = '';
    document.getElementById('word-ph-step-fields').style.display = 'none';
  },

  selectPhSource(sourceId) {
    const src = DataSources.getAll().find(s => s.id === sourceId);
    if (!src) return;
    this._phSelectedSource = src;
    document.getElementById('word-ph-step-source').style.display = 'none';
    document.getElementById('word-ph-step-fields').style.display = '';
    document.getElementById('word-ph-source-label').textContent = `📂 ${src.name || src.filename}`;
    this.renderPhFields(src.fields || []);
  },

  renderPhFields(fields, filter) {
    const grid = document.getElementById('word-ph-fields-grid');
    const list = filter ? fields.filter(f => f.toLowerCase().includes(filter.toLowerCase())) : fields;
    grid.innerHTML = list.map(f => `
      <div class="ph-field-chip" onclick="WordEditor.insertPhField(\`${f.replace(/`/g,'')}\`)">
        <span class="ph-field-icon">⧉</span>
        <span class="ph-field-name">${_wEsc(f)}</span>
      </div>`).join('');
  },

  filterPhFields(q) {
    if (!this._phSelectedSource) return;
    this.renderPhFields(this._phSelectedSource.fields || [], q);
  },

  showPhSourceStep() {
    document.getElementById('word-ph-step-source').style.display = '';
    document.getElementById('word-ph-step-fields').style.display = 'none';
  },

  insertPhField(fieldName) {
    const editor = document.getElementById('word-editor-area');
    if (!editor) return;

    const chip = document.createElement('span');
    chip.className = 'word-placeholder-chip';
    chip.contentEditable = 'false';
    chip.setAttribute('data-placeholder', fieldName);
    const srcName = this._phSelectedSource ? (this._phSelectedSource.name || '') : '';
    if (srcName) chip.setAttribute('data-source', srcName);
    chip.innerHTML = `⧉ {{${_wEsc(fieldName)}}}`;

    if (this._savedRange) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(this._savedRange);
      if (editor.contains(sel.anchorNode)) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        range.insertNode(chip);
        const space = document.createTextNode('\u00A0');
        range.setStartAfter(chip);
        range.insertNode(space);
        range.setStartAfter(space);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      } else {
        editor.appendChild(chip);
        editor.appendChild(document.createTextNode('\u00A0'));
      }
    } else {
      editor.appendChild(chip);
      editor.appendChild(document.createTextNode('\u00A0'));
    }

    const sel2 = window.getSelection();
    if (sel2.rangeCount > 0) this._savedRange = sel2.getRangeAt(0).cloneRange();

    this.updatePlaceholdersList();
    App.toast(`Đã chèn trường «${fieldName}»`, 'success');
  },

  insertPhCustom() {
    const input = document.getElementById('word-ph-custom-name');
    const name = (input.value || '').trim();
    if (!name) { App.toast('Vui lòng nhập tên trường', 'warning'); return; }
    this.insertPhField(name);
    input.value = '';
  },

  closePlaceholderModal() {
    const m = document.getElementById('modal-word-placeholder');
    if (m) m.style.display = 'none';
  },

  /* ── Placeholders list ── */
  getPlaceholders() {
    const editor = document.getElementById('word-editor-area');
    if (!editor) return [];
    const chips = editor.querySelectorAll('.word-placeholder-chip[data-placeholder]');
    const phs = new Set();
    chips.forEach(c => phs.add(c.getAttribute('data-placeholder')));
    return Array.from(phs);
  },

  updatePlaceholdersList() {
    const list = document.getElementById('word-placeholders-list');
    if (!list) return;
    const editor = document.getElementById('word-editor-area');
    if (!editor) return;

    const chips = editor.querySelectorAll('.word-placeholder-chip[data-placeholder]');
    const phs = [];
    const seen = new Set();
    chips.forEach(c => {
      const name = c.getAttribute('data-placeholder');
      const source = c.getAttribute('data-source') || '';
      if (!seen.has(name)) { seen.add(name); phs.push({ name, source }); }
    });

    if (phs.length === 0) {
      list.innerHTML = '<p class="text-muted">Chưa có trường dữ liệu nào</p>';
      return;
    }

    list.innerHTML = phs.map(p => `
      <div style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:var(--accent-light);border-radius:8px;margin-bottom:6px;">
        <span style="font-weight:700;color:var(--accent);">⧉</span>
        <span style="flex:1;font-size:0.82rem;"><b>{{${_wEsc(p.name)}}}</b></span>
        ${p.source ? `<span class="ss-source-badge">${_wEsc(p.source)}</span>` : ''}
      </div>`).join('');
  },

  /* ── Save ── */
  save() {
    const name = document.getElementById('word-template-name').value.trim();
    if (!name) {
      App.toast('Vui lòng nhập tên template', 'warning');
      document.getElementById('word-template-name').focus();
      return;
    }
    const editor = document.getElementById('word-editor-area');
    const content = editor ? editor.innerHTML : '';
    const placeholders = this.getPlaceholders();
    const now = new Date().toISOString();

    if (WordState.editingId) {
      const idx = WordState.templates.findIndex(t => t.id === WordState.editingId);
      if (idx !== -1) {
        Object.assign(WordState.templates[idx], { name, content, placeholders, updatedAt: now });
      }
      App.toast('Template Word đã được cập nhật!', 'success');
    } else {
      const tpl = {
        id: 'wtpl_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        name, content, placeholders, createdAt: now, updatedAt: now
      };
      WordState.templates.push(tpl);
      WordState.editingId = tpl.id;
      App.toast('Template Word đã được lưu!', 'success');
    }
    this.saveState();
    document.getElementById('word-editor-title').textContent = `Chỉnh sửa: ${name}`;
  },

  editTemplate(id) {
    const tpl = WordState.templates.find(t => t.id === id);
    if (!tpl) return;
    WordState.editingId = id;
    document.getElementById('word-template-name').value = tpl.name;
    document.getElementById('word-editor-title').textContent = `Chỉnh sửa: ${tpl.name}`;
    const editor = document.getElementById('word-editor-area');
    if (editor) editor.innerHTML = tpl.content;
    this.updatePlaceholdersList();
    App.navigateTo('word-editor');
  },

  duplicateTemplate(id) {
    const tpl = WordState.templates.find(t => t.id === id);
    if (!tpl) return;
    const newTpl = {
      ...JSON.parse(JSON.stringify(tpl)),
      id: 'wtpl_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      name: tpl.name + ' (Bản sao)', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    };
    WordState.templates.push(newTpl);
    this.saveState();
    this.renderTemplatesList();
    App.toast('Đã nhân bản template Word!', 'success');
  },

  deleteTemplate(id) {
    if (!confirm('Bạn có chắc muốn xóa template Word này?')) return;
    WordState.templates = WordState.templates.filter(t => t.id !== id);
    this.saveState();
    this.renderTemplatesList();
    App.toast('Đã xóa template Word', 'info');
  },

  renderTemplatesList() {
    const container = document.getElementById('word-templates-list');
    const empty = document.getElementById('word-no-templates');
    if (!container) return;

    if (WordState.templates.length === 0) {
      container.style.display = 'none';
      if (empty) empty.style.display = 'flex';
      return;
    }
    container.style.display = 'grid';
    if (empty) empty.style.display = 'none';

    container.innerHTML = WordState.templates.map(tpl => {
      const date = new Date(tpl.updatedAt || tpl.createdAt);
      const dateStr = date.toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
      const tmp = document.createElement('div');
      tmp.innerHTML = tpl.content;
      const preview = tmp.textContent.substring(0, 200);
      return `
        <div class="template-row" onclick="WordEditor.editTemplate('${tpl.id}')">
          <div class="t-col-name">
            <div class="t-icon word">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <path d="M9 15l2 2 4-4"/>
              </svg>
            </div>
            <div class="t-name-text">
              <h4>${_wEsc(tpl.name)}</h4>
              <p>${tpl.placeholders ? tpl.placeholders.length : 0} metadata fields</p>
            </div>
          </div>
          <div class="t-col-type">Document</div>
          <div class="t-col-status"><span class="t-status-badge">Active</span></div>
          <div class="t-col-date">${dateStr}</div>
          <div class="t-col-actions" onclick="event.stopPropagation();">
            <button class="action-btn" onclick="WordEditor.duplicateTemplate('${tpl.id}')" title="Nhân bản">
               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            </button>
            <button class="action-btn delete" onclick="WordEditor.deleteTemplate('${tpl.id}')" title="Xóa">
               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </div>
      `;
    }).join('');
  }
};

/* ─────────────────────────────────────────────
   WORD GENERATOR — Merge Data & Export .doc
   ───────────────────────────────────────────── */
const WordGenerator = {
  _selectedRateProjectId: '',
  _selectedRatePolicyId: '',
  // [P2-2] Rule Engine runtime
  _runtimeConditions: {
    htlsMonths: '', loanTermMonths: '', currentMonth: 1, loanType: 'HTLS',
    hasSupplementGrace: false, projectGroup: '',
    contractFields: {
      'Xếp hạng khách hàng': '', 'Hạng khách hàng': '',
      'Nhóm nợ': '', 'Loại tài sản đảm bảo': '', 'Mục đích vay': '',
    },
  },
  _runtimeDerivedData: {},

  initStep1() {
    const select = document.getElementById('word-select-template');
    if (!select) return;
    select.innerHTML = '<option value="">-- Chọn template Word --</option>';
    WordState.templates.forEach(tpl => {
      const opt = document.createElement('option');
      opt.value = tpl.id;
      opt.textContent = tpl.name;
      select.appendChild(opt);
    });

    select.onchange = () => {
      const id = select.value;
      const btn = document.getElementById('btn-word-step1-next');
      const preview = document.getElementById('word-tpl-preview-mini');
      const pc = document.getElementById('word-tpl-preview-content');
      if (id) {
        btn.disabled = false;
        WordState.selectedTemplateId = id;
        const tpl = WordState.templates.find(t => t.id === id);
        if (tpl && preview && pc) { preview.style.display = 'block'; pc.innerHTML = tpl.content; }
      } else {
        btn.disabled = true;
        WordState.selectedTemplateId = null;
        if (preview) preview.style.display = 'none';
      }
    };

    if (WordState.selectedTemplateId) { select.value = WordState.selectedTemplateId; select.onchange(); }
    this.goToStep(1);
  },

  goToStep(step) {
    WordState.currentStep = step;
    document.querySelectorAll('#page-word-generate .w-steps-indicator .step').forEach(s => {
      const n = parseInt(s.getAttribute('data-step'));
      s.classList.remove('active', 'completed');
      if (n === step) s.classList.add('active');
      if (n < step) s.classList.add('completed');
    });
    document.querySelectorAll('#page-word-generate .wgen-step').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(`wgen-step-${step}`);
    if (el) el.classList.add('active');
  },

  // Track extra columns acceptance per file type
  _wAcceptedExtraCols: {},

  initUploadSlots() {
    const grid = document.getElementById('word-upload-grid');
    if (!grid) return;
    this._wAcceptedExtraCols = {};
    grid.innerHTML = Object.keys(FILE_TYPES).map(key => {
      const c = FILE_TYPES[key];
      const fieldCount = c.fields ? c.fields.length : 0;
      return `
        <div class="upload-slot" id="word-slot-${key}">
          <div class="upload-slot-header">
            <span class="upload-slot-title">${c.label}</span>
            <span class="upload-slot-badge optional">Tùy chọn</span>
          </div>
          <div class="upload-slot-desc">${c.description} — <strong>${fieldCount} trường cố định</strong></div>
          <div class="upload-input-wrapper">
            <input type="file" accept=".xlsx,.xls,.csv" id="word-file-${key}" onchange="WordGenerator.onFileSelected('${key}', this)">
          </div>
          <div class="upload-file-info" id="word-file-info-${key}" style="display:none;">✓ <span id="word-file-name-${key}"></span></div>
          <div class="upload-file-error" id="word-file-error-${key}" style="display:none;color:#dc2626;font-size:0.82rem;padding:6px 10px;background:#fef2f2;border-radius:8px;margin-top:6px;"></div>
          <div class="upload-extra-info" id="word-file-extra-${key}" style="display:none;color:#2563eb;font-size:0.82rem;padding:6px 10px;background:#eff6ff;border-radius:8px;margin-top:6px;"></div>
        </div>`;
    }).join('');
  },

  async onFileSelected(ft, input) {
    const slot = document.getElementById(`word-slot-${ft}`);
    const info = document.getElementById(`word-file-info-${ft}`);
    const nameEl = document.getElementById(`word-file-name-${ft}`);
    const errorEl = document.getElementById(`word-file-error-${ft}`);
    const extraEl = document.getElementById(`word-file-extra-${ft}`);

    // Reset states
    errorEl.style.display = 'none';
    errorEl.innerHTML = '';
    extraEl.style.display = 'none';
    extraEl.innerHTML = '';
    delete this._wAcceptedExtraCols[ft];

    if (input.files.length === 0) {
      delete WordState.uploadedFiles[ft];
      slot.classList.remove('has-file');
      info.style.display = 'none';
      return;
    }

    const file = input.files[0];
    const config = FILE_TYPES[ft];

    // Validate file headers against fixed fields
    if (config.fields && config.fields.length > 0) {
      try {
        App.toast('Đang kiểm tra cấu trúc file...', 'info');
        const fileHeaders = await FileValidator.readHeaders(file);
        const validation = FileValidator.validateHeaders(fileHeaders, ft);

        if (!validation.valid) {
          // File has NO data columns at all - reject upload
          delete WordState.uploadedFiles[ft];
          slot.classList.remove('has-file');
          slot.classList.add('has-error');
          info.style.display = 'none';
          input.value = '';

          errorEl.innerHTML = '❌ File không có dữ liệu cột nào. Vui lòng kiểm tra lại file.';
          errorEl.style.display = 'block';
          App.toast('File "' + file.name + '" không có dữ liệu', 'error');
          return;
        }

        // Show info about missing fields (warning, NOT rejection)
        if (validation.missingFields.length > 0) {
          const matchCount = validation.matchedFields ? validation.matchedFields.length : 0;
          const missingCount = validation.missingFields.length;
          extraEl.innerHTML = `⚠️ Đã nhận ${matchCount} cột khớp. Có ${missingCount} trường chưa có dữ liệu (cột trống hoặc thiếu): <span style="font-size:0.78rem;color:#92400e;">${validation.missingFields.slice(0, 5).join(', ')}${missingCount > 5 ? '...' : ''}</span>`;
          extraEl.style.display = 'block';
          extraEl.style.color = '#92400e';
          extraEl.style.background = '#fffbeb';
        }

        // Check for extra columns (columns not in config)
        if (validation.extraFields.length > 0) {
          const accept = await FileValidator.showExtraColumnsPrompt(ft, file.name, validation.extraFields);
          if (accept) {
            this._wAcceptedExtraCols[ft] = validation.extraFields;
            const existingInfo = extraEl.innerHTML;
            extraEl.innerHTML = existingInfo + (existingInfo ? '<br>' : '') + `📊 Đã chấp nhận ${validation.extraFields.length} cột mới: ${validation.extraFields.slice(0, 3).join(', ')}${validation.extraFields.length > 3 ? '...' : ''}`;
            extraEl.style.display = 'block';
            extraEl.style.color = '#2563eb';
            extraEl.style.background = '#eff6ff';
            App.toast(`Đã chấp nhận ${validation.extraFields.length} cột mới`, 'success');
          } else {
            const existingInfo = extraEl.innerHTML;
            extraEl.innerHTML = existingInfo + (existingInfo ? '<br>' : '') + `ℹ️ Bỏ qua ${validation.extraFields.length} cột mới (chỉ dùng cột cố định)`;
            extraEl.style.display = 'block';
          }
        }
      } catch (err) {
        console.error('Validation error:', err);
        App.toast('Lỗi kiểm tra file: ' + err.message, 'error');
      }
    }

    // File is valid — accept it
    WordState.uploadedFiles[ft] = file;
    slot.classList.add('has-file');
    slot.classList.remove('has-error');
    info.style.display = 'flex';
    nameEl.textContent = file.name;
    App.toast('✓ File "' + file.name + '" hợp lệ', 'success');
  },

  async extractAllData() {
    const fileKeys = Object.keys(WordState.uploadedFiles);
    if (fileKeys.length === 0) { App.toast('Vui lòng upload ít nhất 1 file Excel', 'warning'); return; }
    const btn = document.getElementById('btn-word-extract');
    const orig = btn.innerHTML;
    btn.innerHTML = '⏳ Đang trích xuất...'; btn.disabled = true;
    WordState.extractedData = {};
    try {
      for (const ft of fileKeys) {
        const data = await DataProcessor.parseFile(WordState.uploadedFiles[ft], ft);

        // If extra columns were NOT accepted, filter them out
        const config = FILE_TYPES[ft];
        if (config.fields && config.fields.length > 0 && !this._wAcceptedExtraCols[ft]) {
          const expectedSet = new Set(config.fields);
          const filteredData = {};
          for (const key in data) {
            const baseKey = key.replace(/\s*\(Dòng \d+\)$/, '');
            if (expectedSet.has(baseKey) || expectedSet.has(key)) {
              filteredData[key] = data[key];
            }
          }
          WordState.extractedData[ft] = filteredData;
        } else {
          WordState.extractedData[ft] = data;
        }
      }
      let total = 0;
      Object.values(WordState.extractedData).forEach(d => { total += Object.keys(d).length; });
      App.toast(`Đã trích xuất ${total} trường từ ${fileKeys.length} file`, 'success');
      this.buildMappingUI();
      this.goToStep(3);
    } catch (err) {
      console.error(err);
      App.toast('Lỗi khi đọc file: ' + err.message, 'error');
    } finally { btn.innerHTML = orig; btn.disabled = false; }
  },

  buildMappingUI() {
    const tpl = WordState.templates.find(t => t.id === WordState.selectedTemplateId);
    if (!tpl || !tpl.placeholders || tpl.placeholders.length === 0) {
      document.getElementById('word-mapping-container').innerHTML = '<div class="empty-state"><h3>Template không có trường dữ liệu</h3></div>';
      return;
    }
    this._syncRateSelection();
    const currentMappings = this._collectCurrentMappings(tpl.placeholders);
    const options = this._buildMappingOptions();
    const projects = (typeof RateCenter !== 'undefined' && typeof RateCenter.getProjects === 'function')
      ? RateCenter.getProjects()
      : [];
    const policies = this._selectedRateProjectId
      ? ((typeof RateCenter !== 'undefined' && typeof RateCenter.getProjectPolicies === 'function')
        ? RateCenter.getProjectPolicies(this._selectedRateProjectId)
        : [])
      : [];
    document.getElementById('word-mapping-container').innerHTML = `
      <div class="rate-filter-panel" style="margin-bottom:18px;padding:16px 18px;border:1px solid rgba(99,102,241,0.14);border-radius:14px;background:rgba(99,102,241,0.04);">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:10px;">
          <div>
            <h4 style="margin:0 0 4px;font-size:0.95rem;color:var(--text-primary);">Nguồn Master Data lãi suất</h4>
            <p style="margin:0;font-size:0.82rem;color:var(--text-muted);">Chọn dự án và chính sách để các placeholder Word lấy đúng bộ lãi suất và điều kiện áp dụng.</p>
          </div>
          <span style="padding:6px 10px;border-radius:999px;background:rgba(99,102,241,0.1);color:var(--accent);font-size:0.75rem;font-weight:600;">Master Data</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;">
          <div>
            <label style="display:block;margin-bottom:6px;font-size:0.8rem;font-weight:600;color:var(--text-secondary);">Dự án bất động sản</label>
            <select class="mapping-select" id="word-rate-project-select" onchange="WordGenerator.onRateProjectChange(this.value)">
              <option value="">-- Chọn dự án --</option>
              ${projects.map(project => `<option value="${project.id}" ${project.id === this._selectedRateProjectId ? 'selected' : ''}>${_wEsc(project.name)}</option>`).join('')}
            </select>
          </div>
          <div>
            <label style="display:block;margin-bottom:6px;font-size:0.8rem;font-weight:600;color:var(--text-secondary);">Chính sách áp dụng</label>
            <select class="mapping-select" id="word-rate-policy-select" onchange="WordGenerator.onRatePolicyChange(this.value)">
              <option value="">-- Chọn chính sách --</option>
              ${policies.map(policy => `<option value="${policy.id}" ${policy.id === this._selectedRatePolicyId ? 'selected' : ''}>${_wEsc(policy.name)}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>
      <!-- [P2-2] Rule Engine Panel -->
      <div style="margin-bottom:18px;border:1px solid rgba(16,185,129,0.2);border-radius:14px;background:rgba(16,185,129,0.03);">
        <div style="padding:12px 18px;display:flex;align-items:center;gap:10px;cursor:pointer;user-select:none;"
             onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none';this.querySelector('.wre-exp').textContent=this.nextElementSibling.style.display==='none'?'▶':'▼'">
          <span style="font-size:0.9rem;font-weight:700;color:#10b981;">⚙️ Rule Engine — Tính lãi suất động</span>
	          <span style="font-size:0.75rem;color:var(--text-muted);">Nhập điều kiện để tự động tính CĐT/KH trả lãi, bucket, ân hạn, phí TNTH, lãi suất bổ sung</span>
          <span class="wre-exp" style="margin-left:auto;color:#10b981;font-size:0.8rem;">▶</span>
        </div>
        <div style="display:none;padding:0 18px 16px;">
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px;margin-bottom:12px;">
            <div>
	              <label style="display:block;margin-bottom:4px;font-size:0.78rem;font-weight:600;color:var(--text-secondary);">Thời gian hỗ trợ lãi suất (tháng)</label>
	              <input type="number" min="0" class="mapping-select" placeholder="VD: 24"
	                value="${this._runtimeConditions.htlsMonths||''}"
	                oninput="WordGenerator._runtimeConditions.htlsMonths=this.value">
	            </div>
	            <div>
	              <label style="display:block;margin-bottom:4px;font-size:0.78rem;font-weight:600;color:var(--text-secondary);">Tổng kỳ hạn vay (tháng)</label>
	              <input type="number" min="1" class="mapping-select" placeholder="VD: 240"
	                value="${this._runtimeConditions.loanTermMonths||''}"
	                oninput="WordGenerator._runtimeConditions.loanTermMonths=this.value">
	            </div>
            <div>
              <label style="display:block;margin-bottom:4px;font-size:0.78rem;font-weight:600;color:var(--text-secondary);">Tháng hiện tại trong khoản vay</label>
              <input type="number" min="1" class="mapping-select" placeholder="VD: 1"
                value="${this._runtimeConditions.currentMonth||1}"
                oninput="WordGenerator._runtimeConditions.currentMonth=Number(this.value)">
            </div>
            <div>
              <label style="display:block;margin-bottom:4px;font-size:0.78rem;font-weight:600;color:var(--text-secondary);">Loại khoản vay</label>
              <select class="mapping-select" onchange="WordGenerator._runtimeConditions.loanType=this.value">
                <option value="HTLS" ${this._runtimeConditions.loanType==='HTLS'?'selected':''}>Có hỗ trợ lãi từ CĐT</option>
                <option value="standard" ${this._runtimeConditions.loanType==='standard'?'selected':''}>Không có hỗ trợ lãi</option>
              </select>
            </div>
            <div>
              <label style="display:block;margin-bottom:4px;font-size:0.78rem;font-weight:600;color:var(--text-secondary);">Nhóm dự án (A/B/...)</label>
              <input type="text" class="mapping-select" placeholder="VD: A, B, hoặc để trống"
                value="${this._runtimeConditions.projectGroup||''}"
                oninput="WordGenerator._runtimeConditions.projectGroup=this.value">
            </div>
            <div style="display:flex;align-items:center;gap:8px;padding-top:20px;">
              <input type="checkbox" id="wre-supp-grace"
                ${this._runtimeConditions.hasSupplementGrace?'checked':''}
                onchange="WordGenerator._runtimeConditions.hasSupplementGrace=this.checked">
              <label for="wre-supp-grace" style="font-size:0.82rem;color:var(--text-secondary);cursor:pointer;">Có ân hạn gốc bổ sung</label>
            </div>
          </div>
          <!-- Contract fields for adjustment rules -->
          <div style="padding:10px 14px;border-radius:10px;border:1px solid rgba(245,158,11,0.25);background:rgba(245,158,11,0.04);margin-bottom:12px;">
            <div style="font-size:0.75rem;font-weight:700;color:#f59e0b;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.04em;">⚡ Điều kiện hợp đồng (cho Lãi suất bổ sung)</div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;">
              ${Object.keys(this._runtimeConditions.contractFields||{}).map(field => `
              <div>
                <label style="display:block;margin-bottom:3px;font-size:0.75rem;font-weight:600;color:var(--text-secondary);">${field}</label>
                <input type="text" class="mapping-select" placeholder="Để trống = không áp dụng"
                  value="${this._runtimeConditions.contractFields[field]||''}"
                  oninput="WordGenerator._runtimeConditions.contractFields['${field}']=this.value">
              </div>`).join('')}
            </div>
          </div>
          <button onclick="WordGenerator.applyRuleEngine()" style="padding:8px 18px;border-radius:8px;border:none;background:#10b981;color:#fff;font-weight:700;cursor:pointer;font-size:0.85rem;font-family:inherit;">
            ▶ Chạy Rule Engine → Cập nhật mapping
          </button>
          <div id="wre-runtime-result" style="margin-top:10px;font-size:0.8rem;color:var(--text-muted);"></div>
        </div>
      </div>

      <table class="mapping-table"><thead><tr>
        <th style="width:30%">Trường Template</th><th style="width:40%">Dữ liệu Excel / Master Data</th><th style="width:30%">Giá trị</th>
      </tr></thead><tbody>
      ${tpl.placeholders.map(ph => `<tr>
        <td class="mapping-placeholder-name">{{${_wEsc(ph)}}}</td>
        <td><select class="mapping-select" id="wmap-${_wSanId(ph)}" onchange="WordGenerator.onMappingChange('${ph.replace(/'/g,"\\'")}',this.value)">${options}</select></td>
        <td class="mapping-value-preview" id="wprev-${_wSanId(ph)}">—</td>
      </tr>`).join('')}
      </tbody></table>`;
    tpl.placeholders.forEach(ph => {
      const selectEl = document.getElementById(`wmap-${_wSanId(ph)}`);
      const currentValue = currentMappings[ph];
      const hasCurrentValue = selectEl && Array.from(selectEl.options).some(option => option.value === currentValue);
      if (selectEl && currentValue && hasCurrentValue) {
        selectEl.value = currentValue;
        this.onMappingChange(ph, currentValue);
      }
    });
    this.autoMap(tpl.placeholders);
  },

  _collectCurrentMappings(placeholders) {
    const mappings = {};
    placeholders.forEach(ph => {
      const selectEl = document.getElementById(`wmap-${_wSanId(ph)}`);
      if (selectEl && selectEl.value) mappings[ph] = selectEl.value;
    });
    return mappings;
  },

  _syncRateSelection() {
    if (typeof RateCenter === 'undefined' || typeof RateCenter.getProjects !== 'function') {
      this._selectedRateProjectId = '';
      this._selectedRatePolicyId = '';
      return;
    }
    const projects = RateCenter.getProjects();
    if (!projects.find(project => project.id === this._selectedRateProjectId)) {
      this._selectedRateProjectId = projects[0] ? projects[0].id : '';
    }
    const policies = this._selectedRateProjectId ? RateCenter.getProjectPolicies(this._selectedRateProjectId) : [];
    if (!policies.find(policy => policy.id === this._selectedRatePolicyId)) {
      this._selectedRatePolicyId = policies[0] ? policies[0].id : '';
    }
  },

  _getRateTemplateData() {
    if (typeof RateCenter === 'undefined' || typeof RateCenter.getTemplateData !== 'function') return {};
    if (!this._selectedRateProjectId || !this._selectedRatePolicyId) return {};
    return RateCenter.getTemplateData(this._selectedRateProjectId, this._selectedRatePolicyId);
  },

  _buildMappingOptions() {
    let options = '<option value="">-- Không mapping --</option>';
    Object.keys(WordState.extractedData).forEach(ft => {
      const cfg = FILE_TYPES[ft];
      const data = WordState.extractedData[ft];
      const keys = Object.keys(data);
      if (keys.length > 0) {
        options += `<optgroup label="${cfg.label}">`;
        keys.forEach(k => { options += `<option value="${ft}::${k}" title="${String(data[k]).substring(0,50)}">[${cfg.label}] ${k}</option>`; });
        options += '</optgroup>';
      }
    });
    const rateData = this._getRateTemplateData();
    const rateKeys = Object.keys(rateData);
    if (rateKeys.length > 0) {
      options += '<optgroup label="Master Data lãi suất">';
      rateKeys.forEach(key => {
        options += `<option value="ratecenter::${key}" title="${String(rateData[key] || '').substring(0,50)}">[Lãi suất] ${_wEsc(key)}</option>`;
      });
      options += '</optgroup>';
    }
    // [P2-2] Master Data entity records
    if (typeof MasterData !== 'undefined' && typeof MasterData.getMappingData === 'function') {
      const mdData = MasterData.getMappingData();
      const mdKeys = Object.keys(mdData);
      if (mdKeys.length > 0) {
        options += '<optgroup label="📋 Master Data">';
        mdKeys.forEach(key => {
          const val = mdData[key];
          options += `<option value="masterdata::${key}" title="${String(val||'').substring(0,50)}">[MD] ${_wEsc(key)}</option>`;
        });
        options += '</optgroup>';
      }
    }
    // [P2-2] Rule Engine derived fields
    const derived = this._runtimeDerivedData || {};
    const derivedKeys = Object.keys(derived).filter(k => !k.startsWith('_'));
    if (derivedKeys.length > 0) {
      options += '<optgroup label="⚙️ Rule Engine (tính tự động)">';
      derivedKeys.forEach(key => {
        const val = derived[key];
        const disp = String(val || '').substring(0, 50);
        options += `<option value="derived::${key}" title="${disp}">[Rule] ${_wEsc(key)} = ${disp}</option>`;
      });
      options += '</optgroup>';
    }
    return options;
  },

  onRateProjectChange(projectId) {
    this._selectedRateProjectId = projectId;
    const policies = (typeof RateCenter !== 'undefined' && typeof RateCenter.getProjectPolicies === 'function')
      ? RateCenter.getProjectPolicies(projectId)
      : [];
    this._selectedRatePolicyId = policies[0] ? policies[0].id : '';
    this.buildMappingUI();
  },

  onRatePolicyChange(policyId) {
    this._selectedRatePolicyId = policyId;
    this.buildMappingUI();
  },

  _resolveMappingValue(mappingValue) {
    if (!mappingValue) return undefined;
    const [source, ...rest] = mappingValue.split('::');
    const field = rest.join('::');
    if (source === 'ratecenter') {
      const data = this._getRateTemplateData();
      return data[field];
    }
    if (source === 'masterdata') {
      if (typeof MasterData !== 'undefined' && typeof MasterData.getMappingData === 'function') {
        return MasterData.getMappingData()[field];
      }
      return undefined;
    }
    if (source === 'derived') {
      return (this._runtimeDerivedData || {})[field];
    }
    const data = WordState.extractedData[source];
    return data ? data[field] : undefined;
  },

  // [P2-2] Build contract data for adjustments
  _buildContractData() {
    const data = {};
    const loanData = WordState.extractedData['thong_tin_vay'] || {};
    Object.assign(data, loanData);
    if (typeof MasterData !== 'undefined' && typeof MasterData.getMappingData === 'function') {
      const mdData = MasterData.getMappingData();
      Object.entries(mdData).forEach(([key, val]) => {
        const plainKey = key.replace(/^\[[^\]]+\]\s*/, '');
        if (val !== undefined && val !== '') { data[plainKey] = val; data[key] = val; }
      });
    }
    const manual = this._runtimeConditions.contractFields || {};
    Object.entries(manual).forEach(([k, v]) => {
      if (v !== undefined && String(v).trim() !== '') data[k] = v;
    });
    return data;
  },

  // [P2-2] Apply Rule Engine for Word template
  applyRuleEngine() {
    if (typeof RateCenter === 'undefined' || typeof RateRuleEngine === 'undefined') {
      if (typeof App !== 'undefined') App.toast('Rule Engine chưa sẵn sàng', 'warning');
      return;
    }
    if (!this._selectedRateProjectId || !this._selectedRatePolicyId) {
      if (typeof App !== 'undefined') App.toast('Chọn dự án và chính sách trước', 'warning');
      return;
    }
    const proj = RateCenter.getProjects().find(p => p.id === this._selectedRateProjectId);
    const pkg  = proj && (proj.packages||[]).find(k => k.id === this._selectedRatePolicyId);
    if (!pkg) { if (typeof App !== 'undefined') App.toast('Không tìm thấy chính sách', 'error'); return; }

    const input = {
      htlsMonths:         Number(this._runtimeConditions.htlsMonths) || 0,
      cdtSupportMonths:   Number(this._runtimeConditions.htlsMonths) || 0,
      loanTermMonths:     Number(this._runtimeConditions.loanTermMonths) || 0,
      currentMonth:       Number(this._runtimeConditions.currentMonth) || 1,
      hasHTLS:            this._runtimeConditions.loanType === 'HTLS',
      hasSupplementGrace: this._runtimeConditions.hasSupplementGrace,
      projectGroup:       this._runtimeConditions.projectGroup || '',
      loanType:           this._runtimeConditions.loanType,
    };
    const derived = RateRuleEngine.evaluate(pkg, proj, input);

    const contractData = this._buildContractData();
    if (typeof RateRuleEngine.evaluateAdjustments === 'function') {
      const adjResult = RateRuleEngine.evaluateAdjustments(pkg, contractData);
      if (adjResult.totalDelta !== 0) {
        derived['Lãi suất điều chỉnh bổ sung'] = adjResult.totalDelta + '%/năm';
        const base = parseFloat(derived['Lãi suất hiệu lực'] || derived['Lãi suất bucket'] || 0);
        derived['Lãi suất hiệu lực (có ĐC)'] = isNaN(base)
          ? adjResult.totalDelta + '%/năm'
          : (base + adjResult.totalDelta).toFixed(2) + '%/năm';
        derived['Rules điều chỉnh khớp'] = adjResult.matched.map(m => `${m.name} (+${m.delta}%)`).join(', ');
      }
    }
    this._runtimeDerivedData = derived;

    const resultEl = document.getElementById('wre-runtime-result');
    if (resultEl) {
      const items = Object.entries(derived).filter(([k]) => !k.startsWith('_')).map(([k,v]) =>
        `<span style="display:inline-block;margin:2px 4px;padding:2px 8px;border-radius:4px;background:rgba(16,185,129,0.1);color:#059669;font-size:0.75rem;"><b>${k}:</b> ${v}</span>`
      ).join('');
      resultEl.innerHTML = '<b style="color:#10b981">✅ Kết quả rule:</b><br>' + items;
    }
    this.buildMappingUI();
    if (typeof App !== 'undefined') App.toast('Rule Engine đã chạy, mapping được cập nhật', 'success');
  },

  autoMap(placeholders) {
    const rateData = this._getRateTemplateData();
    placeholders.forEach(ph => {
      const phL = ph.toLowerCase().trim().replace(/^\[[^\]]+\]\s*/, '');
      let best = null, bestS = 0;
      Object.keys(WordState.extractedData).forEach(ft => {
        Object.keys(WordState.extractedData[ft]).forEach(k => {
          const kL = k.toLowerCase().trim();
          let s = 0;
          if (kL === phL) s = 100;
          else if (kL.includes(phL) || phL.includes(kL)) s = 60;
          else {
            const pw = phL.split(/\s+/), kw = kL.split(/\s+/);
            const ov = pw.filter(w => kw.some(x => x.includes(w) || w.includes(x)));
            if (ov.length > 0) s = (ov.length / Math.max(pw.length, kw.length)) * 50;
          }
          if (s > bestS) { bestS = s; best = `${ft}::${k}`; }
        });
      });
      Object.keys(rateData).forEach(k => {
        const kL = k.toLowerCase().trim();
        let s = 0;
        if (kL === phL) s = 100;
        else if (kL.includes(phL) || phL.includes(kL)) s = 70;
        else {
          const pw = phL.split(/\s+/), kw = kL.split(/\s+/);
          const ov = pw.filter(w => kw.some(x => x.includes(w) || w.includes(x)));
          if (ov.length > 0) s = (ov.length / Math.max(pw.length, kw.length)) * 60;
        }
        if (s > bestS) { bestS = s; best = `ratecenter::${k}`; }
      });
      if (best && bestS >= 50) {
        const sel = document.getElementById(`wmap-${_wSanId(ph)}`);
        if (sel && !sel.value) { sel.value = best; this.onMappingChange(ph, best); }
      }
    });
  },

  onMappingChange(ph, value) {
    const el = document.getElementById(`wprev-${_wSanId(ph)}`);
    if (!value) { el.textContent = '—'; el.title = ''; return; }
    const resolvedValue = this._resolveMappingValue(value);
    if (resolvedValue !== undefined) {
      el.textContent = String(resolvedValue).substring(0, 80) || '(trống)';
      el.title = String(resolvedValue);
    } else { el.textContent = '—'; el.title = ''; }
  },

  preview() {
    const tpl = WordState.templates.find(t => t.id === WordState.selectedTemplateId);
    if (!tpl) return;
    const replacements = {};
    if (tpl.placeholders) {
      tpl.placeholders.forEach(ph => {
        const sel = document.getElementById(`wmap-${_wSanId(ph)}`);
        if (sel && sel.value) {
          const resolvedValue = this._resolveMappingValue(sel.value);
          if (resolvedValue !== undefined) replacements[ph] = String(resolvedValue);
        }
      });
    }
    let html = tpl.content || '';
    // Replace placeholders inside chip elements
    const div = document.createElement('div');
    div.innerHTML = html;
    div.querySelectorAll('.word-placeholder-chip[data-placeholder]').forEach(chip => {
      const phName = chip.getAttribute('data-placeholder');
      if (replacements[phName] !== undefined) {
        chip.replaceWith(document.createTextNode(replacements[phName]));
      } else {
        chip.style.color = '#ef4444';
        chip.style.background = 'rgba(239,68,68,0.1)';
      }
    });
    html = div.innerHTML;
    // Also replace any raw {{placeholder}} text
    Object.keys(replacements).forEach(ph => {
      const regex = new RegExp(`\\{\\{${ph.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}\\}`, 'g');
      html = html.replace(regex, replacements[ph]);
    });
    html = html.replace(/\{\{([^}]+)\}\}/g, '<span style="color:#ef4444;font-weight:600;">{{$1}}</span>');
    document.getElementById('word-preview').innerHTML = html;
    this.goToStep(4);
    App.toast('Xem trước đã sẵn sàng!', 'success');
  },

  exportPDF() {
    const preview = document.getElementById('word-preview');
    if (!preview || !preview.innerHTML.trim()) { App.toast('Không có nội dung để xuất', 'warning'); return; }
    const tpl = WordState.templates.find(t => t.id === WordState.selectedTemplateId);
    const fileName = tpl ? tpl.name.replace(/[^a-zA-Z0-9_\u00C0-\u1EF9\s-]/g, '').trim() : 'document';

    // Create a dedicated render container for PDF generation
    const renderArea = document.getElementById('pdf-render-area');
    renderArea.innerHTML = '';

    const exportDiv = document.createElement('div');
    exportDiv.className = 'pdf-export-content word-pdf-export';
    exportDiv.innerHTML = preview.innerHTML;
    renderArea.appendChild(exportDiv);

    // Make render area temporarily visible for html2canvas
    renderArea.style.position = 'absolute';
    renderArea.style.left = '0';
    renderArea.style.top = '0';
    renderArea.style.zIndex = '-1';
    renderArea.style.opacity = '0';

    const opt = {
      margin: [15, 15, 15, 15],
      filename: `${fileName}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        letterRendering: true,
        logging: false,
        width: exportDiv.scrollWidth,
        windowWidth: exportDiv.scrollWidth
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait'
      },
      pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', 'thead'] }
    };

    App.toast('Đang tạo PDF...', 'info');

    html2pdf().set(opt).from(exportDiv).save().then(() => {
      // Cleanup
      renderArea.style.position = 'absolute';
      renderArea.style.left = '-9999px';
      renderArea.style.top = '-9999px';
      renderArea.style.opacity = '1';
      renderArea.innerHTML = '';

      WordState.exportCount++;
      WordEditor.saveState();
      App.toast('File PDF đã được tải xuống!', 'success');
    }).catch(err => {
      console.error('PDF export error:', err);
      renderArea.style.position = 'absolute';
      renderArea.style.left = '-9999px';
      renderArea.style.top = '-9999px';
      renderArea.innerHTML = '';
      App.toast('Lỗi khi xuất PDF: ' + err.message, 'error');
    });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  WordEditor.init();
  WordGenerator.initUploadSlots();
});
