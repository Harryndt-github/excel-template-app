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
  currentStep: 1,
  currentOriginalDocxBase64: '',
  currentCalcResult: null,   // Kết quả Loan Calculation Engine
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
function _wNorm(str) {
  return String(str || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[đ]/g, 'd')
    .replace(/[\[\]{}()/:;.,\-_/\\]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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
    // Supabase-only: dữ liệu được nạp qua UatStorage.pullAll() khi khởi động.
  },

  saveState(shouldSync = true) {
    // Supabase-only: không ghi localStorage.
    if (shouldSync && typeof UatStorage !== 'undefined') UatStorage.queueSync('word_templates');
  },

  resetEditor() {
    WordState.editingId = null;
    WordState.currentOriginalDocxBase64 = '';
    const t = document.getElementById('word-editor-title');
    if (t) t.textContent = 'Tạo Template Word mới';
    const n = document.getElementById('word-template-name');
    if (n) n.value = '';
    const a = document.getElementById('word-editor-area');
    if (a) {
      a.contentEditable = 'true';
      a.innerHTML = '<p><br></p>';
    }
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
    const rawText = editor.textContent || '';
    const rawRegex = /\{\{([^}]+)\}\}/g;
    let match;
    while ((match = rawRegex.exec(rawText)) !== null) {
      const name = (match[1] || '').trim();
      if (name) phs.add(name);
    }
    return Array.from(phs);
  },

  updatePlaceholdersList() {
    const list = document.getElementById('word-placeholders-list');
    if (!list) return;
    const currentTpl = WordState.editingId ? WordState.templates.find(t => t.id === WordState.editingId) : null;
    if (currentTpl && currentTpl.nativeDocx) {
      const phs = (currentTpl.placeholders || []).map(name => ({ name, source: 'DOCX gốc' }));
      if (phs.length === 0) {
        list.innerHTML = '<p class="text-muted">Chưa có {{placeholder}} trong file Word gốc</p>';
        return;
      }
      list.innerHTML = phs.map(p => `
        <div style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:var(--accent-light);border-radius:8px;margin-bottom:6px;">
          <span style="font-weight:700;color:var(--accent);">⧉</span>
          <span style="flex:1;font-size:0.82rem;"><b>{{${_wEsc(p.name)}}}</b></span>
          <span class="ss-source-badge">${_wEsc(p.source)}</span>
        </div>`).join('');
      return;
    }
    const editor = document.getElementById('word-editor-area');
    if (!editor) return;

	    const chips = editor.querySelectorAll('.word-placeholder-chip[data-placeholder]');
	    const phs = [];
	    const seen = new Set();
	    const pushPlaceholder = (name, source = '') => {
	      if (!name || seen.has(name)) return;
	      seen.add(name);
	      phs.push({ name, source });
	    };
	    chips.forEach(c => {
	      const name = c.getAttribute('data-placeholder');
	      const source = c.getAttribute('data-source') || '';
	      pushPlaceholder(name, source);
	    });
	    const rawText = editor.textContent || '';
	    const rawRegex = /\{\{([^}]+)\}\}/g;
	    let match;
	    while ((match = rawRegex.exec(rawText)) !== null) {
	      pushPlaceholder((match[1] || '').trim(), 'Word mẫu');
	    }

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

  /* ── Helper: gom tất cả field keys từ mọi nguồn dữ liệu ── */
  _getAllFieldKeys() {
    const keys = new Set();
    // 1) FILE_TYPES fixed fields
    Object.entries(FILE_TYPES).forEach(([ftKey, cfg]) => {
      (cfg.fields || []).forEach(f => keys.add(f));
    });
    // 2) MasterData entity fields
    if (typeof MasterData !== 'undefined' && typeof MasterData.getMappingData === 'function') {
      Object.keys(MasterData.getMappingData()).forEach(k => {
        // Strip "[EntityName] " prefix to expose raw field name too
        keys.add(k);
        const bare = k.replace(/^\[[^\]]+\]\s*/, '');
        if (bare) keys.add(bare);
      });
    }
    // 3) RateCenter template data keys
    if (typeof RateCenter !== 'undefined' && typeof RateCenter.getTemplateData === 'function') {
      try {
        const projects = RateCenter.getProjects ? RateCenter.getProjects() : [];
        if (projects[0]) {
          const policies = RateCenter.getProjectPolicies ? RateCenter.getProjectPolicies(projects[0].id) : [];
          if (policies[0]) {
            Object.keys(RateCenter.getTemplateData(projects[0].id, policies[0].id) || {}).forEach(k => keys.add(k));
          }
        }
      } catch(e) {}
    }
    return Array.from(keys).sort((a, b) => a.localeCompare(b, 'vi'));
  },

  /* ── Helper: trả về danh sách {{placeholder}} đã scan từ DOCX gốc ── */
  _getDocxPlaceholders(tpl) {
    return Array.from(new Set(tpl.placeholders || []));
  },

  /* ── Render panel "Bảng chỉ tiêu" — redesigned ── */
  _renderManualFieldsPanel(tpl) {
    const fields = tpl.manualFields || [];
    const docxPhs = this._getDocxPlaceholders(tpl);  // {{...}} đã có sẵn trong DOCX
    const allKeys = this._getAllFieldKeys();           // tất cả field keys từ master data
    const rows = fields.length ? fields : [{ name: '', placeholder: '', description: '' }];

    // datalist ID cho combo-box tên chỉ tiêu
    const dlId = 'native-field-datalist';

    // Nếu DOCX chưa có placeholder nào → hiển thị hint scan
    const scanHint = docxPhs.length === 0
      ? `<div style="margin:10px 14px;padding:10px 14px;border-radius:10px;background:rgba(245,158,11,0.08);
              border:1px solid rgba(245,158,11,0.25);font-size:0.82rem;color:#92400e;">
           ⚠️ File DOCX chưa có <code>{{placeholder}}</code> nào. Bạn có thể:<br>
           &nbsp;• Chỉnh sửa file Word gốc → thêm <code>{{ten_khach_hang}}</code> → upload lại, <b>hoặc</b><br>
           &nbsp;• Dùng cột "Target text" để thay trực tiếp đoạn text bất kỳ trong Word (chế độ dự phòng).
         </div>`
      : `<div style="margin:10px 14px 0;padding:8px 12px;border-radius:8px;background:rgba(16,185,129,0.07);
              border:1px solid rgba(16,185,129,0.2);font-size:0.8rem;color:#065f46;">
           ✅ Đã tìm thấy <b>${docxPhs.length}</b> placeholder trong DOCX: 
           ${docxPhs.map(p => `<code style="background:rgba(16,185,129,0.12);padding:1px 6px;border-radius:4px;margin:0 2px;">{{${_wEsc(p)}}}</code>`).join(' ')}
         </div>`;

    return `
      <datalist id="${dlId}">
        ${allKeys.map(k => `<option value="${_wEsc(k)}"></option>`).join('')}
      </datalist>
      <datalist id="native-ph-datalist">
        ${docxPhs.map(p => `<option value="${_wEsc(p)}" label="{{${_wEsc(p)}}} — từ DOCX"></option>`).join('')}
      </datalist>

      <div style="margin-top:18px;border:1px solid rgba(99,102,241,0.18);border-radius:14px;overflow:hidden;background:rgba(99,102,241,0.03);">
        <div style="padding:12px 14px;border-bottom:1px solid rgba(99,102,241,0.14);display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap;">
          <div style="flex:1;min-width:200px;">
            <strong style="color:var(--text-primary);">🗂 Bảng chỉ tiêu → Placeholder mapping</strong>
            <div style="font-size:0.8rem;color:var(--text-muted);margin-top:4px;">
              Chọn <b>Mã chỉ tiêu</b> từ Master Data &amp; gán vào <b>Placeholder</b> tương ứng trong file DOCX gốc.
              Khi xuất, hệ thống tự động giữ nguyên toàn bộ định dạng và chỉ thay nội dung.
            </div>
          </div>
          <button type="button" class="btn btn-outline" style="font-size:0.8rem;white-space:nowrap;"
            onclick="WordEditor.refreshManualFieldPanel()" title="Làm mới datalist từ Master Data">⟳ Làm mới nguồn</button>
        </div>
        ${scanHint}
        <div style="overflow:auto;">
          <table class="mapping-table" style="margin:0;">
            <thead><tr>
              <th style="width:30%;">
                Mã chỉ tiêu
                <div style="font-size:0.72rem;font-weight:400;color:var(--text-muted);margin-top:2px;">Gõ hoặc chọn từ Master Data</div>
              </th>
              <th style="width:34%;">
                Placeholder trong DOCX
                <div style="font-size:0.72rem;font-weight:400;color:var(--text-muted);margin-top:2px;">{{...}} trong file Word gốc</div>
              </th>
              <th style="width:28%;">Ghi chú / Giá trị mặc định</th>
              <th style="width:8%;"></th>
            </tr></thead>
            <tbody id="native-manual-fields-body">
              ${rows.map((field, idx) => this._manualFieldRowHtml(field, idx, docxPhs, dlId)).join('')}
            </tbody>
          </table>
        </div>
        <div style="padding:10px 14px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
          <button type="button" class="btn btn-outline" onclick="WordEditor.addManualFieldRow()">+ Thêm dòng</button>
          <span style="font-size:0.78rem;color:var(--text-muted);">
            💡 Mã chỉ tiêu phải khớp với key trong Master Data / Excel nguồn. Placeholder phải khớp đúng <code>{{...}}</code> trong file Word.
          </span>
        </div>
      </div>`;
  },

  _manualFieldRowHtml(field, idx, docxPhs, dlId) {
    docxPhs = docxPhs || [];
    dlId = dlId || 'native-field-datalist';

    // Datalist riêng cho cột placeholder — chứa các {{ph}} đã scan từ DOCX
    const phDlId = 'native-ph-datalist';
    const currentVal = field.placeholder || field.targetText || '';

    return `
      <tr data-manual-field-row>
        <td>
          <div style="position:relative;">
            <input list="${dlId}" class="mapping-select native-field-name"
              value="${_wEsc(field.name || '')}"
              placeholder="VD: Họ tên bên vay 1"
              autocomplete="off"
              style="padding-right:28px;"
              oninput="WordEditor._onFieldNameInput(this)">
            <span style="position:absolute;right:8px;top:50%;transform:translateY(-50%);font-size:0.75rem;color:var(--text-muted);pointer-events:none;">▾</span>
          </div>
        </td>
        <td>
          <div style="position:relative;">
            <input list="${phDlId}" class="mapping-select native-field-target"
              value="${_wEsc(currentVal)}"
              placeholder="Gõ / paste đoạn text hoặc {{placeholder}}"
              autocomplete="off"
              style="font-family:monospace;font-size:0.82rem;padding-right:28px;"
              title="Nhập {{placeholder}} có trong DOCX, hoặc paste đoạn text gốc cần thay">
            <span style="position:absolute;right:8px;top:50%;transform:translateY(-50%);font-size:0.75rem;color:var(--text-muted);pointer-events:none;">▾</span>
          </div>
        </td>
        <td>
          <input class="mapping-select native-field-desc"
            value="${_wEsc(field.description || '')}"
            placeholder="Mô tả ngắn...">
        </td>
        <td>
          <button type="button" class="btn btn-outline"
            onclick="WordEditor.removeManualFieldRow(this)" title="Xóa">×</button>
        </td>
      </tr>`;
  },


  /* Gợi ý tự động điền placeholder khi tên chỉ tiêu khớp với placeholder DOCX */
  _onFieldNameInput(input) {
    const row = input.closest('[data-manual-field-row]');
    if (!row) return;
    const targetInput = row.querySelector('.native-field-target');
    if (!targetInput || targetInput.value) return; // chỉ gợi ý khi ô target còn trống
    const val = (input.value || '').trim().toLowerCase().replace(/\s+/g, '_');
    if (!val) return;
    // Lấy gợi ý từ datalist native-ph-datalist
    const dl = document.getElementById('native-ph-datalist');
    if (!dl) return;
    const opts = Array.from(dl.options);
    const exact = opts.find(o => o.value.toLowerCase() === val);
    const fuzzy = exact || opts.find(o =>
      o.value.toLowerCase().includes(val) || val.includes(o.value.toLowerCase())
    );
    if (fuzzy) targetInput.value = fuzzy.value;
  },


  /* Làm mới toàn bộ panel sau khi Master Data thay đổi */
  refreshManualFieldPanel() {
    const tpl = WordState.editingId ? WordState.templates.find(t => t.id === WordState.editingId) : null;
    if (!tpl || !tpl.nativeDocx) return;
    // Thu thập dữ liệu hiện tại trước khi render lại
    const currentFields = this.collectManualFields();
    tpl.manualFields = currentFields;
    const editor = document.getElementById('word-editor-area');
    if (editor) {
      const noticeHtml = editor.querySelector('div[style*="orange"], div[style*="f59e0b"]');
      const noticeStr = noticeHtml ? noticeHtml.outerHTML : '';
      editor.innerHTML = noticeStr + this._renderManualFieldsPanel(tpl);
    }
    App.toast('Đã làm mới nguồn dữ liệu', 'success');
  },

  addManualFieldRow() {
    const body = document.getElementById('native-manual-fields-body');
    if (!body) return;
    const tpl = WordState.editingId ? WordState.templates.find(t => t.id === WordState.editingId) : null;
    const docxPhs = tpl ? this._getDocxPlaceholders(tpl) : [];
    body.insertAdjacentHTML('beforeend', this._manualFieldRowHtml({}, body.querySelectorAll('tr').length, docxPhs));
  },

  removeManualFieldRow(button) {
    const row = button && button.closest('[data-manual-field-row]');
    if (row) row.remove();
  },

  collectManualFields() {
    return Array.from(document.querySelectorAll('#native-manual-fields-body [data-manual-field-row]')).map(row => {
      const nameInput  = row.querySelector('.native-field-name');
      const targetEl   = row.querySelector('.native-field-target'); // may be <select> or <input>
      const descInput  = row.querySelector('.native-field-desc');
      const name        = (nameInput?.value  || '').trim();
      const targetRaw   = (targetEl?.value   || '').trim();
      const description = (descInput?.value  || '').trim();
      const isPlaceholder = /^\{\{[^}]+\}\}$/.test(targetRaw);
      const placeholder = isPlaceholder ? targetRaw.replace(/^\{\{|\}\}$/g,'').trim() : '';
      const targetText  = isPlaceholder ? '' : targetRaw;
      return { name, placeholder, targetText, description };
    }).filter(field => field.name || field.placeholder || field.targetText);
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
    const existingTpl = WordState.editingId ? WordState.templates.find(t => t.id === WordState.editingId) : null;
    const isNativeDocx = !!(existingTpl && existingTpl.nativeDocx);
    const manualFields = isNativeDocx ? this.collectManualFields() : [];
    const content = isNativeDocx ? existingTpl.content : (editor ? editor.innerHTML : '');
    const placeholders = isNativeDocx
      ? Array.from(new Set([
          ...(existingTpl.placeholders || []),
          // placeholder mode: mã chỉ tiêu ánh xạ vào {{placeholder}}
          ...manualFields.map(f => f.placeholder).filter(Boolean),
          // fallback mode: vẫn giữ name để backward compat
          ...manualFields.map(f => f.name).filter(Boolean)
        ]))
      : this.getPlaceholders();
    const originalDocxBase64 = WordState.currentOriginalDocxBase64 || '';
    const now = new Date().toISOString();

    if (WordState.editingId) {
      const idx = WordState.templates.findIndex(t => t.id === WordState.editingId);
      if (idx !== -1) {
        const patch = isNativeDocx
          ? { name, content, placeholders, manualFields, updatedAt: now }
          : { name, content, placeholders, originalDocxBase64, updatedAt: now };
        // Giữ _idbKey và _docxInIDB để không bị mất liên kết với IndexedDB
        if (isNativeDocx && WordState.templates[idx]._idbKey) {
          patch._idbKey = WordState.templates[idx]._idbKey;
          patch._docxInIDB = true;
        }
        Object.assign(WordState.templates[idx], patch);
      }
      App.toast('Template Word đã được cập nhật!', 'success');
    } else {
      const tpl = {
        id: 'wtpl_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        name, content, placeholders, originalDocxBase64, createdAt: now, updatedAt: now
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
    WordState.currentOriginalDocxBase64 = tpl.originalDocxBase64 || '';
    document.getElementById('word-template-name').value = tpl.name;
    document.getElementById('word-editor-title').textContent = `Chỉnh sửa: ${tpl.name}`;
    const editor = document.getElementById('word-editor-area');
    if (editor) {
      if (tpl.nativeDocx) {
        editor.contentEditable = 'false';
        editor.innerHTML = (tpl.content || `
          <div style="background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.35);border-radius:12px;padding:14px 16px;color:#92400e;">
            <strong>Template DOCX native - chỉ đọc</strong><br>
            Sửa layout và thêm placeholder trực tiếp trong Microsoft Word, sau đó upload lại nếu cần.
          </div>`) + this._renderManualFieldsPanel(tpl);
      } else {
        editor.contentEditable = 'true';
        editor.innerHTML = tpl.content || '<p><br></p>';
      }
    }
    this.updatePlaceholdersList();
    App.navigateTo('word-editor');
  },

  duplicateTemplate(id) {
    const tpl = WordState.templates.find(t => t.id === id);
    if (!tpl) return;
    if (tpl.nativeDocx) {
      App.toast('Template DOCX native cần upload lại file gốc để tạo bản sao an toàn.', 'warning');
      return;
    }
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
    const tpl = WordState.templates.find(t => t.id === id);
    if (tpl && tpl.nativeDocx && typeof DocxStore !== 'undefined') {
      DocxStore.remove(id).catch(err => console.warn('Cannot remove DOCX from IndexedDB:', err));
    }
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
      opt.textContent = tpl.name + (tpl.nativeDocx ? ' [DOCX native]' : '');
      select.appendChild(opt);
    });

    select.onchange = async () => {
      const id = select.value;
      const btn = document.getElementById('btn-word-step1-next');
      const preview = document.getElementById('word-tpl-preview-mini');
      const pc = document.getElementById('word-tpl-preview-content');
      const idbWarning = document.getElementById('word-idb-warning');
      if (idbWarning) idbWarning.remove();

      if (id) {
        btn.disabled = false;
        WordState.selectedTemplateId = id;
        const tpl = WordState.templates.find(t => t.id === id);
        if (tpl && preview && pc) { preview.style.display = 'block'; pc.innerHTML = tpl.content; }

        // Kiểm tra IDB cho template DOCX native
        if (tpl && tpl.nativeDocx && typeof DocxEngine !== 'undefined') {
          const hasIDB = await DocxEngine.hasOriginalDocx(tpl.id);
          if (!hasIDB) {
            // Hiển cảnh báo + input re-upload
            const warning = document.createElement('div');
            warning.id = 'word-idb-warning';
            warning.style.cssText = 'margin-top:12px;padding:12px 16px;border-radius:10px;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.3);';
            warning.innerHTML = `
              <div style="font-size:0.85rem;font-weight:700;color:#ef4444;margin-bottom:8px;">&#9888; File DOCX gốc chưa có trong bộ nhớ trình duyệt</div>
              <div style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:10px;">
                Binary DOCX được lưu trong IndexedDB của trình duyệt — có thể đã bị xóa khi xóa cache, mở trình duyệt ắn danh hoặc dùng máy khác.<br>
                Hãy upload lại file <b>.docx gốc</b> để hệ thống lưu lại vào bộ nhớ.
              </div>
              <label style="display:inline-flex;align-items:center;gap:8px;padding:7px 16px;border-radius:8px;background:#6366f1;color:#fff;cursor:pointer;font-size:0.82rem;font-weight:700;">
                &#128196; Upload lại file DOCX gốc
                <input type="file" accept=".docx" hidden onchange="WordGenerator.handleDocxReUpload(this.files[0], '${tpl.id}')">
              </label>
            `;
            select.closest('.step-card').appendChild(warning);
          }
        }
      } else {
        btn.disabled = true;
        WordState.selectedTemplateId = null;
        if (preview) preview.style.display = 'none';
      }
    };

    if (WordState.selectedTemplateId) { select.value = WordState.selectedTemplateId; select.onchange(); }
    this.goToStep(1);
  },

  async handleDocxReUpload(file, templateId) {
    if (!file || !templateId) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext !== 'docx') {
      App.toast('Chỉ hỗ trợ file .docx', 'warning');
      return;
    }
    try {
      // Re-import vào IDB dùng đúng templateId làm key
      const result = await DocxEngine.importDocx(file, templateId);
      // Cập nhật placeholders nếu có mới
      const tpl = WordState.templates.find(t => t.id === templateId);
      if (tpl && result.placeholders && result.placeholders.length > 0) {
        tpl.placeholders = Array.from(new Set([...(tpl.placeholders || []), ...result.placeholders]));
        tpl._docxInIDB = true;
        WordEditor.saveState();
      }
      // Xóa cảnh báo
      const warning = document.getElementById('word-idb-warning');
      if (warning) warning.remove();
      App.toast(`Đã lưu lại file DOCX gốc vào bộ nhớ (${result.placeholders.length} placeholder tìm thấy)`, 'success');
    } catch (err) {
      console.error('Re-upload DOCX error:', err);
      App.toast('Lỗi upload lại: ' + err.message, 'error');
    }
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

        // If extra columns were NOT accepted, filter them out.
        // Fallback mirrors the Excel template flow: never drop all parsed data,
        // because UAT files often have slightly different labels/diacritics.
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
          WordState.extractedData[ft] = Object.keys(filteredData).length > 0 ? filteredData : data;
          if (Object.keys(filteredData).length === 0 && Object.keys(data).length > 0) {
            console.warn(`[word extractAllData] Filter removed all ${Object.keys(data).length} fields for ${ft}; using all parsed fields as fallback`);
          }
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
      <!-- [P3] Loan Calculation Engine Panel -->
      <div style="margin-bottom:18px;border:1px solid rgba(99,102,241,0.25);border-radius:14px;background:rgba(99,102,241,0.03);">
        <div style="padding:12px 18px;display:flex;align-items:center;gap:10px;cursor:pointer;user-select:none;"
             onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none';this.querySelector('.lcalc-exp').textContent=this.nextElementSibling.style.display==='none'?'&#9654;':'&#9660;'">
          <span style="font-size:0.9rem;font-weight:700;color:#6366f1;">&#128202; Tinh toan khoan vay tu dong</span>
          <span style="font-size:0.75rem;color:var(--text-muted);">Nhap gia tri san pham + ngay ky hop dong de tinh so tien vay, lai/goc hang thang, ngay ket thuc HTLS</span>
          <span class="lcalc-exp" style="margin-left:auto;color:#6366f1;font-size:0.8rem;">&#9654;</span>
        </div>
        <div style="display:none;padding:0 18px 16px;" id="loan-calc-body">
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:12px;">
            <div>
              <label style="display:block;margin-bottom:4px;font-size:0.8rem;font-weight:600;color:var(--text-secondary);">Gia tri san pham (VND)</label>
              <input type="text" id="lcalc-product-value" class="mapping-select"
                placeholder="VD: 500000000"
                value="${(WordGenerator._loanInput||{}).productValue ? Number((WordGenerator._loanInput||{}).productValue).toLocaleString('vi-VN') : ''}"
                oninput="WordGenerator._loanInput=WordGenerator._loanInput||{};WordGenerator._loanInput.productValue=this.value.replace(/[^0-9.]/g,'')">
            </div>
            <div>
              <label style="display:block;margin-bottom:4px;font-size:0.8rem;font-weight:600;color:var(--text-secondary);">Ngay ky hop dong</label>
              <input type="date" id="lcalc-signing-date" class="mapping-select"
                value="${(WordGenerator._loanInput||{}).signingDate || ''}"
                oninput="WordGenerator._loanInput=WordGenerator._loanInput||{};WordGenerator._loanInput.signingDate=this.value">
            </div>
            <div style="display:flex;align-items:flex-end;gap:8px;">
              <button onclick="WordGenerator.runLoanCalc()"
                style="flex:1;padding:9px 14px;border-radius:9px;border:none;background:#6366f1;color:#fff;font-weight:700;cursor:pointer;font-size:0.85rem;font-family:inherit;">
                &#128260; Tinh toan
              </button>
            </div>
          </div>
          <div id="lcalc-result" style="font-size:0.82rem;color:var(--text-muted);">&#128161; Nhap gia tri san pham va ngay ky, sau do nhan Tinh toan.</div>
        </div>
      </div>

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
        <td>
          <select class="mapping-select" id="wmap-${_wSanId(ph)}" onchange="WordGenerator.onMappingChange('${ph.replace(/'/g,"\\'")}',this.value)">${options.replace(/__FIELD__/g, _wEsc(ph))}</select>
          <input class="mapping-select" id="wmanual-${_wSanId(ph)}" placeholder="Nhập trực tiếp giá trị cho chỉ tiêu này"
            style="display:none;margin-top:6px;"
            oninput="WordGenerator.onMappingChange('${ph.replace(/'/g,"\\'")}', 'manual::${ph.replace(/'/g,"\\'")}')">
        </td>
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
    const rInput = Object.assign({}, this._runtimeConditions || {}, this._loanInput || {});
    return RateCenter.getTemplateData(
      this._selectedRateProjectId,
      this._selectedRatePolicyId,
      Object.keys(rInput).length ? rInput : undefined
    );
  },

  /* -- Loan Calculation Engine -- */
  _loanInput: null,

  runLoanCalc() {
    const resultEl = document.getElementById('lcalc-result');
    if (!resultEl) return;
    const pvInput  = document.getElementById('lcalc-product-value');
    const dtInput  = document.getElementById('lcalc-signing-date');
    const productValue = pvInput ? parseFloat(String(pvInput.value).replace(/[^0-9.]/g,'')) : 0;
    const signingDate  = dtInput ? dtInput.value : '';
    if (!productValue || productValue <= 0) {
      resultEl.innerHTML = '<span style="color:#ef4444;">Vui long nhap gia tri san pham hop le.</span>';
      return;
    }
    if (!this._selectedRateProjectId || !this._selectedRatePolicyId) {
      resultEl.innerHTML = '<span style="color:#f59e0b;">Vui long chon Du an va Chinh sach o panel phia tren.</span>';
      return;
    }
    this._loanInput = { productValue, signingDate };
    const rInput = Object.assign({}, this._runtimeConditions || {}, { productValue, signingDate });
    const result = RateCenter.getTemplateData(this._selectedRateProjectId, this._selectedRatePolicyId, rInput);
    WordState.currentCalcResult = result;

    // Hiển thị tất cả các key là kết quả tính toán (bỏ qua key kỹ thuật và key từ policy tĩnh)
    const LOAN_CALC_KEYS = [
      'So tien vay toi da', 'LTV ap dung', 'Lai suat ap dung', 'Bucket lai suat',
      'Thoi gian ho tro lai', 'Ngay ket thuc HTLS', 'Ky han vay (doi vay)',
      'Goc hang thang', 'Lai hang thang (T1)', 'Tong tra thang dau',
      'Lai CDT tra hang thang', 'Goc + Lai trong HTLS',
      'Lai sau HTLS (so bo)', 'Tong tra sau HTLS (so bo)'
    ];
    const rows = Object.keys(result)
      .filter(k => {
        if (k.endsWith('(s\u1ed1)') || k.endsWith('(so)')) return false;
        const v = result[k];
        return v !== undefined && v !== '' && typeof v !== 'object';
      })
      .filter(k => {
        // Chỉ lấy các key tính toán: có đơn vị tiền/% hoặc là ngày
        const v = String(result[k] || '');
        return v.includes('\u0111') || v.includes('%') || v.includes('th\u00e1ng') || v.includes('/20') ||
          k.includes('vay') || k.includes('l\u00e3i') || k.includes('l\u00e3i') || k.includes('g\u1ed1c') ||
          k.includes('HTLS') || k.includes('bucket') || k.includes('kh\u1ea3n') || k.includes('LTV') ||
          k.includes('Bucket') || k.includes('k\u1ef3') || k.includes('K\u1ef3') || k.includes('Lai') || k.includes('Goc') ||
          k.includes('tien') || k.includes('ti\u1ec1n') || k.includes('S\u1ed1') || k.includes('Ng\u00e0y') || k.includes('Ngay');
      })
      .map(k => `<tr><td style="padding:5px 10px;font-size:0.8rem;color:var(--text-secondary);">${_wEsc(k)}</td><td style="padding:5px 10px;font-size:0.82rem;font-weight:600;color:var(--text-primary);">${_wEsc(String(result[k]))}</td></tr>`)
      .join('');
    if (!rows) {
      resultEl.innerHTML = '<span style="color:#f59e0b;">Khong tinh duoc. Kiem tra chinh sach co khai bao LTV% va lai suat bucket chua.</span>';
      return;
    }
    resultEl.innerHTML = `<div style="margin-top:6px;border:1px solid rgba(16,185,129,0.25);border-radius:10px;overflow:hidden;"><div style="padding:8px 12px;background:rgba(16,185,129,0.08);display:flex;justify-content:space-between;align-items:center;"><span style="font-size:0.8rem;font-weight:700;color:#10b981;">Ket qua tinh toan</span><button onclick="WordGenerator.applyLoanCalcResult()" style="padding:5px 14px;border-radius:7px;border:none;background:#10b981;color:#fff;font-weight:700;cursor:pointer;font-size:0.78rem;font-family:inherit;">Dung ket qua nay</button></div><table style="width:100%;border-collapse:collapse;">${rows}</table></div>`;
    this.buildMappingUI();
  },


  applyLoanCalcResult() {
    if (!WordState.currentCalcResult) return;
    if (typeof App !== 'undefined') App.toast('Ket qua tinh toan da duoc ap dung vao mapping', 'success');
    this.buildMappingUI();
  },

  _buildMappingOptions() {
    let options = '<option value="">-- Không mapping --</option><option value="manual::__FIELD__">[Nhập trực tiếp] Giá trị cố định</option>';
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
    const calcResult = WordState.currentCalcResult || {};
    const calcKeys = Object.keys(calcResult).filter(k => !k.endsWith('(so)') && !k.endsWith('(s\u1ed1)'));
    if (calcKeys.length > 0) {
      options += '<optgroup label="Loan Calc (tinh tu dong)">';
      calcKeys.forEach(key => {
        const val = calcResult[key];
        const disp = String(val || '').substring(0, 50);
        options += `<option value="loanresult::${_wEsc(key)}" title="${_wEsc(disp)}">[Loan] ${_wEsc(key)} = ${_wEsc(disp)}</option>`;
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
    if (source === 'loanresult') {
      return (WordState.currentCalcResult || {})[field];
    }
    if (source === 'manual') {
      const input = document.getElementById(`wmanual-${_wSanId(field)}`);
      return input ? input.value : '';
    }
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
    return data ? this._resolveDataField(data, field) : undefined;
  },

  _resolveDataField(data, field) {
    if (!data) return undefined;
    if (Object.prototype.hasOwnProperty.call(data, field)) return data[field];
    const wanted = _wNorm(field);
    const wantedBase = _wNorm(String(field).replace(/\s*\(Dòng \d+\)$/, ''));
    const keys = Object.keys(data);
    let found = keys.find(key => _wNorm(key) === wanted || _wNorm(key) === wantedBase);
    if (found) return data[found];

    found = keys.find(key => {
      const nk = _wNorm(key.replace(/\s*\(Dòng \d+\)$/, ''));
      return nk && wantedBase && (nk.includes(wantedBase) || wantedBase.includes(nk));
    });
    return found ? data[found] : undefined;
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
      const sourceHintMatch = String(ph).match(/^\[([^\]]+)\]\s*/);
      const sourceHint = sourceHintMatch ? _wNorm(sourceHintMatch[1]) : '';
      const phL = _wNorm(ph.replace(/^\[[^\]]+\]\s*/, ''));
      let best = null, bestS = 0;
      Object.keys(WordState.extractedData).forEach(ft => {
        const cfg = FILE_TYPES[ft] || {};
        const sourceLabel = _wNorm(cfg.label || ft);
        const sourceBoost = sourceHint && (sourceLabel === sourceHint || sourceLabel.includes(sourceHint) || sourceHint.includes(sourceLabel)) ? 25 : 0;
        Object.keys(WordState.extractedData[ft]).forEach(k => {
          const value = this._resolveDataField(WordState.extractedData[ft], k);
          const kL = _wNorm(k);
          let s = 0;
          if (kL === phL) s = 100;
          else if (kL.includes(phL) || phL.includes(kL)) s = 60;
          else {
            const pw = phL.split(/\s+/), kw = kL.split(/\s+/);
            const ov = pw.filter(w => w.length > 1 && kw.some(x => x.includes(w) || w.includes(x)));
            if (ov.length > 0) s = (ov.length / Math.max(pw.length, kw.length)) * 55;
          }
          if (s > 0) s += sourceBoost;
          if (value === undefined || String(value).trim() === '') s -= 30;
          if (s > bestS) { bestS = s; best = `${ft}::${k}`; }
        });
      });
      Object.keys(rateData).forEach(k => {
        const kL = _wNorm(k);
        let s = 0;
        if (kL === phL) s = 100;
        else if (kL.includes(phL) || phL.includes(kL)) s = 70;
        else {
          const pw = phL.split(/\s+/), kw = kL.split(/\s+/);
          const ov = pw.filter(w => w.length > 1 && kw.some(x => x.includes(w) || w.includes(x)));
          if (ov.length > 0) s = (ov.length / Math.max(pw.length, kw.length)) * 60;
        }
        if (s > bestS) { bestS = s; best = `ratecenter::${k}`; }
      });
      if (best && bestS >= 65) {
        const sel = document.getElementById(`wmap-${_wSanId(ph)}`);
        if (sel && !sel.value) { sel.value = best; this.onMappingChange(ph, best); }
      }
    });
  },

  onMappingChange(ph, value) {
    const el = document.getElementById(`wprev-${_wSanId(ph)}`);
    const manualInput = document.getElementById(`wmanual-${_wSanId(ph)}`);
    if (manualInput) {
      manualInput.style.display = value && value.startsWith('manual::') ? 'block' : 'none';
    }
    if (!value) { el.textContent = '—'; el.title = ''; return; }
    const resolvedValue = this._resolveMappingValue(value);
    if (resolvedValue !== undefined) {
      el.textContent = String(resolvedValue).substring(0, 80) || '(trống)';
      el.title = String(resolvedValue);
    } else { el.textContent = '—'; el.title = ''; }
  },

  async preview() {
    const tpl = WordState.templates.find(t => t.id === WordState.selectedTemplateId);
    if (!tpl) return;
    const baseReplacements = this._collectReplacements(tpl);
    const replacements = this._buildNativeReplacementsFromManual(tpl, baseReplacements);
    const previewEl = document.getElementById('word-preview');

    if (tpl.nativeDocx) {
      const directReplacements = this._collectDirectReplacements(tpl);
      const totalReplacements = Object.keys(replacements).length + directReplacements.length;
      console.log('[Preview] replacements:', replacements, 'directReplacements:', directReplacements);
      if (totalReplacements === 0) {
        App.toast('Chưa có mapping nào. Quay lại bước 3 và chọn dữ liệu cho các chỉ tiêu.', 'warning');
        return;
      }
      previewEl.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted);"><div style="font-size:2rem;margin-bottom:12px;">&#128196;</div><div>Đang render bản xem trước DOCX...</div></div>`;
      this.goToStep(4);
      try {
        const blob = await DocxEngine.exportDocx(tpl.id, replacements, {}, directReplacements);
        if (!blob) throw new Error('Không thể tạo file DOCX preview');
        if (typeof docx !== 'undefined' && typeof docx.renderAsync === 'function') {
          const container = document.createElement('div');
          container.style.cssText = 'width:100%;min-height:400px;';
          previewEl.innerHTML = '';
          previewEl.appendChild(container);
          await docx.renderAsync(blob, container, null, {
            inWrapper: false, ignoreWidth: false, ignoreHeight: false,
            breakPages: true, useBase64URL: true,
            renderHeaders: true, renderFooters: true,
          });
          App.toast('Xem trước DOCX đã sẵn sàng — bấm Xuất Word để tải file', 'success');
        } else {
          const url = URL.createObjectURL(blob);
          const rows = (tpl.manualFields || []).map(field => {
            const val = replacements[field.placeholder] || replacements[field.name] || '';
            const status = val ? `<span style="color:#10b981;font-weight:600;">✓</span>` : `<span style="color:#ef4444;">✗ Chưa có</span>`;
            return `<tr><td><b>${_wEsc(field.name||'')}</b></td><td>${_wEsc(val)} ${status}</td></tr>`;
          }).join('');
          previewEl.innerHTML = `
            <div style="padding:14px 18px;border-radius:10px;background:rgba(99,102,241,0.07);border:1px solid rgba(99,102,241,0.2);margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
              <span><b>DOCX đã điền dữ liệu</b> — Nhấn nút bên phải để tải xem.</span>
              <a href="${url}" download="${_wEsc(tpl.name||'document')}.docx"
                style="padding:6px 16px;border-radius:7px;background:#6366f1;color:#fff;text-decoration:none;font-size:0.82rem;font-weight:700;"
                onclick="setTimeout(()=>URL.revokeObjectURL(this.href),5000)">⬇ Tải DOCX xem trước</a>
            </div>
            <table><thead><tr><th>Mã chỉ tiêu</th><th>Giá trị sẽ điền</th></tr></thead>
            <tbody>${rows||'<tr><td colspan="2">Chưa có chỉ tiêu</td></tr>'}</tbody></table>`;
          App.toast('Bấm "Tải DOCX xem trước" để mở file đã điền', 'info');
        }
      } catch (err) {
        console.error('Preview DOCX error:', err);
        const errMsg = err.message || 'Lỗi không xác định';
        const isIdbMissing = errMsg.includes('không tìm thấy') || errMsg.includes('not found') || errMsg.includes('gốc');
        previewEl.innerHTML = `
          <div style="padding:20px;border-radius:12px;background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.25);">
            <div style="font-size:0.9rem;font-weight:700;color:#ef4444;margin-bottom:8px;">&#9888; ${_wEsc(errMsg)}</div>
            ${isIdbMissing ? `
            <div style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:12px;">
              File DOCX gốc đã bị xóa khỏi bộ nhớ trình duyệt (IndexedDB). Hãy upload lại file <b>.docx gốc</b> để tiếp tục.
            </div>
            <label style="display:inline-flex;align-items:center;gap:8px;padding:8px 18px;border-radius:8px;background:#6366f1;color:#fff;cursor:pointer;font-weight:700;font-size:0.85rem;">
              &#128196; Upload lại file DOCX gốc
              <input type="file" accept=".docx" hidden onchange="WordGenerator.handleDocxReUpload(this.files[0], '${_wEsc(tpl.id)}').then(()=>WordGenerator.preview())">
            </label>` : ''}
          </div>`;
        App.toast(isIdbMissing ? 'File DOCX gốc chưa có trong bộ nhớ — upload lại để tiếp tục' : 'Không thể render preview', 'warning');
      }
      return;
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

  _collectReplacements(tpl) {
    const replacements = {};
    (tpl.placeholders || []).forEach(ph => {
      const sel = document.getElementById(`wmap-${_wSanId(ph)}`);
      if (sel && sel.value) {
        const resolvedValue = this._resolveMappingValue(sel.value);
        if (resolvedValue !== undefined) replacements[ph] = String(resolvedValue);
      }
    });
    return replacements;
  },

  _collectDirectReplacements(tpl) {
    const fields = tpl.manualFields || [];
    const results = [];
    fields.forEach(field => {
      if (!field.name) return;
      // Resolve giá trị từ mapping UI
      const sel = document.getElementById(`wmap-${_wSanId(field.name)}`);
      if (!sel || !sel.value) return;
      const resolvedValue = this._resolveMappingValue(sel.value);
      if (resolvedValue === undefined) return;
      const val = String(resolvedValue);

      const legacyDirectTarget = this._legacyPlaceholderAsDirectTarget(field.placeholder);
      if (field.placeholder && !legacyDirectTarget) {
        // Mode 1: placeholder mode — {{placeholder}} đã có sẵn trong DOCX
        // DocxEngine.replacePlaceholdersInXml xử lý via `replacements` object, không cần directReplacements
        // (không push vào results, đã được hòa tan vào replacements qua buildNativeReplacementsFromManual)
      } else if (field.targetText || legacyDirectTarget) {
        // Mode 2: fallback — thay trực tiếp đoạn text trong DOCX
        results.push({
          field: field.name,
          targetText: field.targetText || field.placeholder,
          value: val,
          mode: 'append'
        });
      }
    });
    return results;
  },

  /* Build replacements object từ manualFields placeholder mode để merge vào replacements chính */
  _buildNativeReplacementsFromManual(tpl, baseReplacements) {
    const merged = Object.assign({}, baseReplacements);
    const fields = tpl.manualFields || [];
    fields.forEach(field => {
      if (!field.placeholder || !field.name) return;
      if (this._legacyPlaceholderAsDirectTarget(field.placeholder)) return;
      const sel = document.getElementById(`wmap-${_wSanId(field.name)}`);
      if (!sel || !sel.value) return;
      const resolvedValue = this._resolveMappingValue(sel.value);
      if (resolvedValue === undefined) return;
      // Map: {{placeholder}} -> resolved value
      merged[field.placeholder] = String(resolvedValue);
    });
    return merged;
  },

  _legacyPlaceholderAsDirectTarget(placeholder) {
    const raw = String(placeholder || '').trim();
    if (!raw) return false;
    if (/^\{\{[^}]+\}\}$/.test(raw)) return false;
    if (/[:：]\s*$/.test(raw)) return true;
    if (/^\d+(\.\d+)*\.?\s+/.test(raw)) return true;
    return /\s/.test(raw) && !/^[A-Za-z0-9_.-]+$/.test(raw);
  },

  _base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
  },

  _replaceInTextNodes(textNodes, replacements) {
    if (!textNodes.length) return false;
    let fullText = textNodes.map(node => node.textContent || '').join('');
    const jobs = [];
    Object.entries(replacements).forEach(([key, value]) => {
      const token = `{{${key}}}`;
      let index = fullText.indexOf(token);
      while (index !== -1) {
        jobs.push({ start: index, end: index + token.length, value });
        index = fullText.indexOf(token, index + token.length);
      }
    });
    if (!jobs.length) return false;

    const ranges = [];
    let cursor = 0;
    textNodes.forEach((node, nodeIndex) => {
      const len = (node.textContent || '').length;
      ranges.push({ node, nodeIndex, start: cursor, end: cursor + len });
      cursor += len;
    });

    jobs.sort((a, b) => b.start - a.start).forEach(job => {
      const startInfo = ranges.find(item => job.start >= item.start && job.start <= item.end);
      const endInfo = ranges.find(item => job.end >= item.start && job.end <= item.end);
      if (!startInfo || !endInfo) return;
      const startText = startInfo.node.textContent || '';
      const endText = endInfo.node.textContent || '';
      const startOffset = job.start - startInfo.start;
      const endOffset = job.end - endInfo.start;
      if (startInfo.nodeIndex === endInfo.nodeIndex) {
        startInfo.node.textContent = startText.slice(0, startOffset) + job.value + startText.slice(endOffset);
      } else {
        startInfo.node.textContent = startText.slice(0, startOffset) + job.value;
        for (let i = startInfo.nodeIndex + 1; i < endInfo.nodeIndex; i++) {
          ranges[i].node.textContent = '';
        }
        endInfo.node.textContent = endText.slice(endOffset);
      }
    });
    return true;
  },

  _replacePlaceholdersInXml(xmlText, replacements) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) {
      return xmlText;
    }
    const wordNs = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
    const paragraphs = Array.from(doc.getElementsByTagNameNS(wordNs, 'p'));
    let changed = false;
    paragraphs.forEach(paragraph => {
      const textNodes = Array.from(paragraph.getElementsByTagNameNS(wordNs, 't'));
      if (this._replaceInTextNodes(textNodes, replacements)) changed = true;
    });
    return changed ? new XMLSerializer().serializeToString(doc) : xmlText;
  },

  async exportDOCX() {
    const tpl = WordState.templates.find(t => t.id === WordState.selectedTemplateId);
    if (!tpl) { App.toast('Vui lòng chọn template Word', 'warning'); return; }
    if (tpl.nativeDocx) {
      if (typeof DocxEngine === 'undefined') {
        App.toast('DocxEngine chưa được tải. Kiểm tra js/docx-engine.js', 'error');
        return;
      }
      // Merge: {{placeholder}} từ bảng chỉ tiêu (placeholder mode) vào replacements chính
      const baseReplacements = this._collectReplacements(tpl);
      const replacements = this._buildNativeReplacementsFromManual(tpl, baseReplacements);
      const directReplacements = this._collectDirectReplacements(tpl);
      const totalReplacements = Object.keys(replacements).length + directReplacements.length;
      console.log('[ExportDOCX] replacements:', replacements, 'directReplacements:', directReplacements);
      if (totalReplacements === 0) {
        App.toast('Chưa có dữ liệu nào được mapping. Hãy chọn giá trị cho các chỉ tiêu ở bước 3 trước khi xuất.', 'warning');
        return;
      }
      try {
        const hasOriginal = await DocxEngine.hasOriginalDocx(tpl.id);
        if (!hasOriginal) {
          App.toast('Không tìm thấy file .docx gốc trong IndexedDB. Vui lòng upload lại template Word.', 'warning');
          return;
        }
        App.toast('Đang xuất Word từ file .docx gốc...', 'info');
        const blob = await DocxEngine.exportDocx(tpl.id, replacements, {}, directReplacements);
        const fileName = (tpl.name || 'word-template').replace(/[^a-zA-Z0-9_\u00C0-\u1EF9\s-]/g, '').trim() || 'document';
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileName}.docx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        WordState.exportCount++;
        WordEditor.saveState();
        App.toast('Đã xuất Word từ DOCX gốc, giữ nguyên định dạng', 'success');
      } catch (err) {
        console.error('Native DOCX export error:', err);
        App.toast(`Lỗi xuất Word: ${err.message}`, 'error');
      }
      return;
    }
    if (!tpl.originalDocxBase64) {
      App.toast('Template này chưa lưu file .docx gốc. Hãy upload file .docx mẫu và lưu lại template để xuất Word giữ nguyên định dạng.', 'warning');
      return;
    }
    if (typeof JSZip === 'undefined') {
      App.toast('Thiếu thư viện JSZip để xuất Word. Kiểm tra kết nối CDN hoặc bundle thư viện nội bộ.', 'error');
      return;
    }

    const replacements = this._collectReplacements(tpl);
    try {
      App.toast('Đang tạo file Word giữ nguyên định dạng...', 'info');
      const zip = await JSZip.loadAsync(this._base64ToArrayBuffer(tpl.originalDocxBase64));
      const xmlFiles = Object.keys(zip.files).filter(name =>
        name.startsWith('word/') &&
        name.endsWith('.xml') &&
        !name.includes('/_rels/')
      );
      for (const fileName of xmlFiles) {
        const file = zip.file(fileName);
        if (!file) continue;
        const xml = await file.async('string');
        zip.file(fileName, this._replacePlaceholdersInXml(xml, replacements));
      }
      const blob = await zip.generateAsync({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });
      const fileName = (tpl.name || 'word-template').replace(/[^a-zA-Z0-9_\u00C0-\u1EF9\s-]/g, '').trim() || 'document';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      WordState.exportCount++;
      WordEditor.saveState();
      App.toast('Đã xuất Word giữ nguyên định dạng gốc', 'success');
    } catch (err) {
      console.error('DOCX export error:', err);
      App.toast(`Lỗi xuất Word: ${err.message}`, 'error');
    }
  },

  async exportPDF() {
    const preview = document.getElementById('word-preview');
    const tpl = WordState.templates.find(t => t.id === WordState.selectedTemplateId);

    if (tpl && tpl.nativeDocx) {
      const hasDocxContent = preview && preview.querySelector('.docx-wrapper, .docx, [class*="docx"]');
      if (!hasDocxContent) {
        App.toast('Đang render DOCX gốc trước khi xuất PDF...', 'info');
        await this.preview();
      }
    }

    if (!preview || !preview.innerHTML.trim()) { App.toast('Không có nội dung để xuất', 'warning'); return; }

    // Native DOCX PDF export is generated from the rendered preview. For legal-grade
    // output, keep DOCX as the authoritative file or convert DOCX to PDF server-side.
    if (tpl && tpl.nativeDocx) {
      const hasDocxContent = preview.querySelector('.docx-wrapper, .docx, [class*="docx"]');
      if (!hasDocxContent) {
        App.toast('Không thể render preview DOCX để xuất PDF. Hãy xuất Word, hoặc dùng backend chuyển DOCX sang PDF để giữ định dạng tuyệt đối.', 'warning');
        return;
      }
    }

    const fileName = tpl ? tpl.name.replace(/[^a-zA-Z0-9_\u00C0-\u1EF9\s-]/g, '').trim() : 'document';

    // A4 ở 96 DPI = 794px, dùng kích thước cố định thay vì scrollWidth (để tránh PDF cắt nửa trang)
    const A4_WIDTH_PX = 794;

    // Create a dedicated render container for PDF generation
    const renderArea = document.getElementById('pdf-render-area');
    renderArea.innerHTML = '';

    const exportDiv = document.createElement('div');
    exportDiv.className = 'pdf-export-content word-pdf-export';
    exportDiv.style.cssText = `width:${A4_WIDTH_PX}px;box-sizing:border-box;padding:20px;background:#fff;font-family:inherit;`;
    exportDiv.innerHTML = preview.innerHTML;
    renderArea.appendChild(exportDiv);

    // Đưa render area ra ngoài viewport nhưng vẫn visible (tránh scrollWidth = 0)
    renderArea.style.cssText = `position:fixed;left:-${A4_WIDTH_PX + 20}px;top:0;width:${A4_WIDTH_PX}px;z-index:-1;`;

    const opt = {
      margin: [10, 10, 10, 10],
      filename: `${fileName}.pdf`,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        letterRendering: true,
        logging: false,
        width: A4_WIDTH_PX,
        windowWidth: A4_WIDTH_PX,
        scrollX: 0,
        scrollY: 0,
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait'
      },
      pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', 'thead', 'img'] }
    };

    App.toast(tpl && tpl.nativeDocx
      ? 'Đang tạo PDF từ bản preview DOCX. File Word vẫn là bản giữ định dạng chuẩn nhất.'
      : 'Đang tạo PDF...', 'info');

    html2pdf().set(opt).from(exportDiv).save().then(() => {
      // Cleanup
      renderArea.style.cssText = 'position:absolute;left:-9999px;top:-9999px;';
      renderArea.innerHTML = '';
      WordState.exportCount++;
      WordEditor.saveState();
      App.toast('File PDF đã được tải xuống!', 'success');
    }).catch(err => {
      console.error('PDF export error:', err);
      renderArea.style.cssText = 'position:absolute;left:-9999px;top:-9999px;';
      renderArea.innerHTML = '';
      App.toast('Lỗi khi xuất PDF: ' + err.message, 'error');
    });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  WordEditor.init();
  WordGenerator.initUploadSlots();
});
