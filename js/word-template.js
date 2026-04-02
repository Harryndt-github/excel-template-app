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
        <div class="template-card word-tpl-card">
          <div class="template-card-header">
            <div><h4>📝 ${_wEsc(tpl.name)}</h4><div class="template-card-meta">${dateStr}</div></div>
            <span class="placeholder-count word-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              ${tpl.placeholders ? tpl.placeholders.length : 0} trường
            </span>
          </div>
          <div class="template-card-preview">${preview || 'Không có nội dung'}</div>
          <div class="template-card-actions">
            <button class="btn btn-sm btn-outline" onclick="WordEditor.editTemplate('${tpl.id}')">✎ Sửa</button>
            <button class="btn btn-sm btn-outline" onclick="WordEditor.duplicateTemplate('${tpl.id}')">⧉ Nhân bản</button>
            <button class="btn btn-sm btn-danger" onclick="WordEditor.deleteTemplate('${tpl.id}')">✕ Xóa</button>
          </div>
        </div>`;
    }).join('');
  }
};

/* ─────────────────────────────────────────────
   WORD GENERATOR — Merge Data & Export .doc
   ───────────────────────────────────────────── */
const WordGenerator = {
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
    let options = '<option value="">-- Không mapping --</option>';
    Object.keys(WordState.extractedData).forEach(ft => {
      const cfg = FILE_TYPES[ft]; const data = WordState.extractedData[ft];
      const keys = Object.keys(data);
      if (keys.length > 0) {
        options += `<optgroup label="${cfg.label}">`;
        keys.forEach(k => { options += `<option value="${ft}::${k}" title="${String(data[k]).substring(0,50)}">[${cfg.label}] ${k}</option>`; });
        options += '</optgroup>';
      }
    });
    document.getElementById('word-mapping-container').innerHTML = `
      <table class="mapping-table"><thead><tr>
        <th style="width:30%">Trường Template</th><th style="width:40%">Dữ liệu Excel</th><th style="width:30%">Giá trị</th>
      </tr></thead><tbody>
      ${tpl.placeholders.map(ph => `<tr>
        <td class="mapping-placeholder-name">{{${_wEsc(ph)}}}</td>
        <td><select class="mapping-select" id="wmap-${_wSanId(ph)}" onchange="WordGenerator.onMappingChange('${ph.replace(/'/g,"\\'")}',this.value)">${options}</select></td>
        <td class="mapping-value-preview" id="wprev-${_wSanId(ph)}">—</td>
      </tr>`).join('')}
      </tbody></table>`;
    this.autoMap(tpl.placeholders);
  },

  autoMap(placeholders) {
    placeholders.forEach(ph => {
      const phL = ph.toLowerCase().trim();
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
      if (best && bestS >= 50) {
        const sel = document.getElementById(`wmap-${_wSanId(ph)}`);
        if (sel) { sel.value = best; this.onMappingChange(ph, best); }
      }
    });
  },

  onMappingChange(ph, value) {
    const el = document.getElementById(`wprev-${_wSanId(ph)}`);
    if (!value) { el.textContent = '—'; return; }
    const [ft, field] = value.split('::');
    const data = WordState.extractedData[ft];
    if (data && data[field] !== undefined) {
      el.textContent = String(data[field]).substring(0, 80) || '(trống)';
      el.title = String(data[field]);
    } else { el.textContent = '—'; }
  },

  preview() {
    const tpl = WordState.templates.find(t => t.id === WordState.selectedTemplateId);
    if (!tpl) return;
    const replacements = {};
    if (tpl.placeholders) {
      tpl.placeholders.forEach(ph => {
        const sel = document.getElementById(`wmap-${_wSanId(ph)}`);
        if (sel && sel.value) {
          const [ft, field] = sel.value.split('::');
          const data = WordState.extractedData[ft];
          if (data && data[field] !== undefined) replacements[ph] = String(data[field]);
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

  exportWord() {
    const preview = document.getElementById('word-preview');
    if (!preview || !preview.innerHTML.trim()) { App.toast('Không có nội dung để xuất', 'warning'); return; }
    const tpl = WordState.templates.find(t => t.id === WordState.selectedTemplateId);
    const fileName = tpl ? tpl.name.replace(/[^a-zA-Z0-9_\u00C0-\u1EF9\s-]/g, '').trim() : 'document';
    const wordHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='utf-8'><title>${_wEsc(fileName)}</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom><w:DoNotOptimizeForBrowser/></w:WordDocument></xml><![endif]-->
<style>
@page { size: A4; margin: 2cm; }
body { font-family: 'Times New Roman', serif; font-size: 13pt; line-height: 1.5; color: #000; }
table { border-collapse: collapse; width: 100%; }
table td, table th { border: 1px solid #000; padding: 5px 8px; vertical-align: top; }
table th { background-color: #f0f0f0; font-weight: bold; }
h1 { font-size: 18pt; } h2 { font-size: 16pt; } h3 { font-size: 14pt; }
p { margin: 0 0 6pt 0; }
</style></head><body>${preview.innerHTML}</body></html>`;
    const blob = new Blob(['\ufeff', wordHtml], { type: 'application/msword' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName + '.doc';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    WordState.exportCount++;
    WordEditor.saveState();
    App.toast('File Word đã được tải xuống!', 'success');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  WordEditor.init();
  WordGenerator.initUploadSlots();
});
