/* ============================================
   ExcelMapper - Main Application Logic
   ============================================ */

// ============================================
// FILE TYPE CONFIGURATIONS
// ============================================
const FILE_TYPES = {
  thong_tin_vay: {
    label: 'Thông tin vay',
    structure: 'vertical',
    valueRows: 1,
    description: 'Cột A: Chỉ tiêu chính | Cột B: Giá trị',
    required: false,
    fields: [
      'Tên khách hàng', 'Số CIF', 'Số CMND/CCCD', 'Ngày cấp', 'Nơi cấp',
      'Địa chỉ thường trú', 'Địa chỉ liên lạc', 'Số điện thoại', 'Email',
      'Nghề nghiệp', 'Đơn vị công tác', 'Chức vụ',
      'Số hợp đồng tín dụng', 'Ngày hợp đồng', 'Mục đích vay',
      'Số tiền vay', 'Thời hạn vay', 'Lãi suất', 'Phương thức trả nợ',
      'Ngày giải ngân', 'Ngày đáo hạn', 'Tài sản đảm bảo',
      'Số tài khoản', 'Chi nhánh', 'Cán bộ tín dụng'
    ]
  },
  tai_san: {
    label: 'Tài sản',
    structure: 'horizontal',
    valueRows: 1,
    description: 'Dòng 1: Header | Dòng 2: Giá trị',
    required: false,
    fields: [
      'Loại tài sản', 'Mô tả tài sản', 'Địa chỉ tài sản',
      'Diện tích', 'Số tờ', 'Số thửa', 'Số Giấy CN QSDĐ',
      'Ngày cấp GCN', 'Nơi cấp GCN', 'Mục đích sử dụng đất',
      'Thời hạn sử dụng', 'Giá trị tài sản', 'Giá trị định giá',
      'Tỷ lệ cho vay', 'Ghi chú tài sản'
    ]
  },
  chu_tai_san: {
    label: 'Chủ tài sản',
    structure: 'horizontal',
    valueRows: 1,
    description: 'Dòng 1: Header | Dòng 2: Giá trị',
    required: false,
    fields: [
      'Họ tên chủ tài sản', 'Số CMND/CCCD chủ TS', 'Ngày cấp chủ TS',
      'Nơi cấp chủ TS', 'Địa chỉ chủ TS', 'Quan hệ với khách hàng',
      'Số điện thoại chủ TS', 'Đồng sở hữu', 'Ghi chú chủ TS'
    ]
  },
  tai_san_ctt: {
    label: 'Tài sản CTT',
    structure: 'horizontal',
    valueRows: 1,
    description: 'Dòng 1: Header | Dòng 2: Giá trị',
    required: false,
    fields: [
      'Loại tài sản CTT', 'Mô tả tài sản CTT', 'Biển số xe',
      'Số khung', 'Số máy', 'Năm sản xuất', 'Màu sắc',
      'Nhãn hiệu', 'Giá trị tài sản CTT', 'Giá trị định giá CTT',
      'Tỷ lệ cho vay CTT', 'Ghi chú CTT'
    ]
  },
  thong_tin_chuyen_tien: {
    label: 'Thông tin chuyển tiền',
    structure: 'horizontal',
    valueRows: 1,
    description: 'Dòng 1: Header | Dòng 2: Giá trị',
    required: false,
    fields: [
      'Tên người thụ hưởng', 'Số tài khoản thụ hưởng', 'Ngân hàng thụ hưởng',
      'Chi nhánh thụ hưởng', 'Số tiền chuyển', 'Nội dung chuyển tiền',
      'Ngày chuyển tiền', 'Mã giao dịch', 'Phí chuyển tiền'
    ]
  },
  thu_phi_tnth: {
    label: 'Thu phí TNTH',
    structure: 'horizontal',
    valueRows: 3,
    description: 'Dòng 1: Header | Dòng 2-4: Giá trị (3 dòng)',
    required: false,
    fields: [
      'Loại phí', 'Tên phí', 'Số tiền phí', 'Tỷ lệ phí',
      'Ngày thu phí', 'Kỳ thanh toán', 'Trạng thái thu phí',
      'Phí trả trước', 'Phí trả sau', 'Ghi chú phí'
    ]
  },
  han_muc: {
    label: 'Hạn mức',
    structure: 'horizontal',
    valueRows: 1,
    description: 'Dòng 1: Header | Dòng 2: Giá trị',
    required: false,
    fields: [
      'Số hạn mức', 'Ngày cấp hạn mức', 'Hạn mức tín dụng',
      'Số tiền đã sử dụng', 'Số tiền còn lại', 'Ngày hết hạn',
      'Loại hạn mức', 'Lãi suất hạn mức', 'Mục đích sử dụng HM',
      'Trạng thái hạn mức'
    ]
  },
  tai_tai_tro: {
    label: 'Tài tài trợ',
    structure: 'horizontal',
    valueRows: 1,
    description: 'Dòng 1: Header | Dòng 2: Giá trị',
    required: false,
    fields: [
      'Loại tài trợ', 'Số tiền tài trợ', 'Ngày tài trợ',
      'Ngày đáo hạn TT', 'Lãi suất tài trợ', 'Phương thức tài trợ',
      'Nguồn vốn', 'Mục đích tài trợ', 'Trạng thái tài trợ',
      'Ghi chú tài trợ'
    ]
  }
};

// ============================================
// DATA SOURCES — dynamic from uploaded Excel files
// ============================================
const DataSources = {
  // Runtime store: [{ id, name, filename, fields:[], rawFile: File|null }]
  _sources: [],

  /* ── public API ── */
  getAll() { return this._sources; },

  togglePanel() {
    const body = document.getElementById('ds-panel-body');
    const icon = document.getElementById('ds-toggle-icon');
    if (!body) return;
    const open = body.style.display !== 'none';
    body.style.display = open ? 'none' : '';
    if (icon) icon.textContent = open ? '▶' : '▼';
  },

  handleDrop(e) {
    const files = e.dataTransfer ? e.dataTransfer.files : [];
    if (files.length) this.handleFiles(files);
  },

  async handleFiles(fileList) {
    for (const file of fileList) {
      const ext = file.name.split('.').pop().toLowerCase();
      if (!['xlsx', 'xls', 'csv'].includes(ext)) {
        App.toast(`"${file.name}" không phải file Excel/CSV`, 'warning');
        continue;
      }
      // avoid duplicates
      if (this._sources.some(s => s.filename === file.name)) {
        App.toast(`"${file.name}" đã được thêm rồi`, 'info');
        continue;
      }
      try {
        const fields = await this._readHeaders(file);
        const source = {
          id: 'ds_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
          name: file.name.replace(/\.[^.]+$/, ''),
          filename: file.name,
          fields
        };
        this._sources.push(source);
        App.toast(`Đã đọc ${fields.length} trường từ "${file.name}"`, 'success');
      } catch (err) {
        console.error(err);
        App.toast(`Lỗi đọc file "${file.name}"`, 'error');
      }
    }
    this._renderList();
    this._persistMeta();
  },

  removeSource(id) {
    this._sources = this._sources.filter(s => s.id !== id);
    this._renderList();
    this._persistMeta();
    App.toast('Đã xóa nguồn dữ liệu', 'info');
  },

  /* ── persist field metadata to localStorage (not the file blob) ── */
  _persistMeta() {
    const meta = this._sources.map(s => ({ id: s.id, name: s.name, filename: s.filename, fields: s.fields }));
    try { localStorage.setItem('excelmapper_datasources', JSON.stringify(meta)); } catch(_) {}
    // update badge
    const badge = document.getElementById('ds-file-count');
    if (badge) badge.textContent = this._sources.length;
  },

  loadPersistedMeta() {
    try {
      const raw = localStorage.getItem('excelmapper_datasources');
      if (raw) {
        this._sources = JSON.parse(raw);
        this._renderList();
        const badge = document.getElementById('ds-file-count');
        if (badge) badge.textContent = this._sources.length;
      }
    } catch(_) {}
  },

  /* ── read column headers from Excel ── */
  _readHeaders(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const wb = XLSX.read(data, { type: 'array', sheetRows: 20 }); // only read first 20 rows
          const fields = [];
          wb.SheetNames.forEach(sheetName => {
            const sheet = wb.Sheets[sheetName];
            if (!sheet['!ref']) return;
            const range = XLSX.utils.decode_range(sheet['!ref']);

            // Strategy: collect non-empty values from row 1 (header row) as fields
            for (let col = range.s.c; col <= range.e.c; col++) {
              const cell = sheet[XLSX.utils.encode_cell({ r: 0, c: col })];
              if (cell && cell.v !== undefined && String(cell.v).trim()) {
                const val = String(cell.v).trim();
                if (!fields.includes(val)) fields.push(val);
              }
            }

            // Also check column A for vertical-style files (key-value layout)
            // If row 1 has only 1-2 filled cols, treat col A as field names
            let headerColCount = 0;
            for (let col = range.s.c; col <= range.e.c; col++) {
              const cell = sheet[XLSX.utils.encode_cell({ r: 0, c: col })];
              if (cell && cell.v !== undefined && String(cell.v).trim()) headerColCount++;
            }

            if (headerColCount <= 2) {
              // vertical layout — scan all column A values as field names
              for (let row = 0; row <= range.e.r; row++) {
                const cell = sheet[XLSX.utils.encode_cell({ r: row, c: 0 })];
                if (cell && cell.v !== undefined && String(cell.v).trim()) {
                  const val = String(cell.v).trim();
                  if (!fields.includes(val)) fields.push(val);
                }
              }
            }
          });
          resolve(fields);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  },

  /* ── render file list in editor panel ── */
  _renderList() {
    const container = document.getElementById('ds-files-list');
    if (!container) return;

    if (this._sources.length === 0) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = this._sources.map(src => `
      <div class="ds-file-item">
        <div class="ds-file-info">
          <span class="ds-file-icon">📊</span>
          <div>
            <div class="ds-file-name">${src.filename}</div>
            <div class="ds-file-fields">${src.fields.length} trường: ${src.fields.slice(0, 4).join(', ')}${src.fields.length > 4 ? '…' : ''}</div>
          </div>
        </div>
        <button class="ds-file-remove" onclick="DataSources.removeSource('${src.id}')" title="Xóa">✕</button>
      </div>
    `).join('');
  }
};

// ============================================
// APP STATE
// ============================================
const AppState = {
  templates: [],
  editingTemplateId: null,
  uploadedFiles: {},
  extractedData: {},
  selectedTemplateId: null,
  currentStep: 1,
  exportCount: 0
};

// ============================================
// APP - Core Application
// ============================================
const App = {
  init() {
    this.loadState();
    this.bindNavigation();
    this.updateDashboard();
    Generator.initUploadSlots();
    DataSources.loadPersistedMeta();
  },

  loadState() {
    try {
      const saved = localStorage.getItem('excelmapper_templates');
      if (saved) AppState.templates = JSON.parse(saved);
      const exports = localStorage.getItem('excelmapper_exports');
      if (exports) AppState.exportCount = parseInt(exports) || 0;
    } catch (e) {
      console.error('Error loading state:', e);
    }
  },

  saveState() {
    try {
      localStorage.setItem('excelmapper_templates', JSON.stringify(AppState.templates));
      localStorage.setItem('excelmapper_exports', AppState.exportCount.toString());
    } catch (e) {
      console.error('Error saving state:', e);
    }
  },

  bindNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const page = item.getAttribute('data-page');
        this.navigateTo(page);
      });
    });
  },

  navigateTo(page) {
    // Update nav
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const navItem = document.querySelector(`[data-page="${page}"]`);
    if (navItem) navItem.classList.add('active');

    // Update page
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const pageEl = document.getElementById(`page-${page}`);
    if (pageEl) pageEl.classList.add('active');

    // Page-specific init
    if (page === 'dashboard') this.updateDashboard();
    if (page === 'templates') TemplateBuilder.renderTemplatesList();
    if (page === 'editor') {
      if (!AppState.editingTemplateId) {
        TemplateBuilder.resetEditor();
      }
      // Focus the spreadsheet container for keyboard navigation
      setTimeout(() => {
        const sc = document.getElementById('spreadsheet-container');
        if (sc) sc.focus();
      }, 100);
    }
    if (page === 'generate') Generator.initStep1();
  },

  updateDashboard() {
    document.getElementById('stat-templates').textContent = AppState.templates.length;
    document.getElementById('stat-exports').textContent = AppState.exportCount;
  },

  toast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
      success: '✓',
      error: '✕',
      info: 'ℹ',
      warning: '⚠'
    };

    toast.innerHTML = `<span>${icons[type] || 'ℹ'}</span> ${message}`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('hide');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },

  generateId() {
    return 'tpl_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
  }
};

// ============================================
// TEMPLATE BUILDER
// ============================================
const TemplateBuilder = {
  savedSelection: null,

  resetEditor() {
    AppState.editingTemplateId = null;
    document.getElementById('editor-title').textContent = 'Tạo Template mới';
    document.getElementById('template-name').value = '';
    // Initialize fresh spreadsheet grid
    if (typeof Spreadsheet !== 'undefined') {
      Spreadsheet.init(10, 8);
      Spreadsheet.updatePlaceholdersList();
    }
  },

  execCmd(command, value = null) {
    document.execCommand(command, false, value);
    document.getElementById('template-editor').focus();
  },

  showInsertPlaceholder() {
    // Save cursor position
    const sel = window.getSelection();
    if (sel.rangeCount > 0) {
      this.savedSelection = sel.getRangeAt(0).cloneRange();
    }
    this._selectedSource = null;

    // Build source file cards
    const grid = document.getElementById('ph-source-grid');
    const fileIcons = {
      thong_tin_vay: '📝', tai_san: '🏠', chu_tai_san: '👤',
      tai_san_ctt: '🚗', thong_tin_chuyen_tien: '💸', thu_phi_tnth: '💰',
      han_muc: '📊', tai_tai_tro: '🏦'
    };
    grid.innerHTML = Object.keys(FILE_TYPES).map(key => {
      const config = FILE_TYPES[key];
      const icon = fileIcons[key] || '📄';
      const fieldCount = config.fields ? config.fields.length : 0;
      return `
        <div class="ph-source-card" onclick="TemplateBuilder.selectSource('${key}')">
          <div class="ph-source-icon">${icon}</div>
          <div class="ph-source-label">${config.label}</div>
          <div class="ph-source-count">${fieldCount} trường</div>
        </div>`;
    }).join('');

    // Show step 1, hide step 2
    document.getElementById('ph-step-source').style.display = 'block';
    document.getElementById('ph-step-fields').style.display = 'none';
    document.getElementById('modal-placeholder').style.display = 'flex';
  },

  selectSource(fileType) {
    this._selectedSource = fileType;
    const config = FILE_TYPES[fileType];
    if (!config) return;

    // Update header
    document.getElementById('ph-selected-source-label').textContent =
      `📄 Nguồn: ${config.label} — Nhấn vào trường để chèn`;

    // Build fields grid
    const grid = document.getElementById('ph-fields-grid');
    const fields = config.fields || [];
    grid.innerHTML = fields.map(field => `
      <button class="ph-field-chip" data-field="${field}"
        onclick="TemplateBuilder.insertFieldPlaceholder('${field.replace(/'/g, "\\'")}')">
        <span class="ph-field-icon">📌</span>
        <span class="ph-field-name">${field}</span>
      </button>
    `).join('');

    if (fields.length === 0) {
      grid.innerHTML = '<p class="text-muted" style="text-align:center;padding:20px;">Chưa có trường dữ liệu mẫu cho file này</p>';
    }

    // Clear search
    document.getElementById('ph-field-search').value = '';
    document.getElementById('ph-custom-name').value = '';

    // Animate transition: hide step 1, show step 2
    document.getElementById('ph-step-source').style.display = 'none';
    document.getElementById('ph-step-fields').style.display = 'block';
    setTimeout(() => document.getElementById('ph-field-search').focus(), 100);
  },

  showSourceStep() {
    document.getElementById('ph-step-fields').style.display = 'none';
    document.getElementById('ph-step-source').style.display = 'block';
    this._selectedSource = null;
  },

  filterFields(query) {
    const q = query.toLowerCase().trim();
    const chips = document.querySelectorAll('#ph-fields-grid .ph-field-chip');
    chips.forEach(chip => {
      const name = chip.getAttribute('data-field').toLowerCase();
      chip.style.display = name.includes(q) ? '' : 'none';
    });
  },

  insertFieldPlaceholder(fieldName) {
    this._doInsertPlaceholder(fieldName, this._selectedSource);
  },

  insertCustomPlaceholder() {
    const name = document.getElementById('ph-custom-name').value.trim();
    if (!name) {
      App.toast('Vui lòng nhập tên trường dữ liệu', 'warning');
      return;
    }
    this._doInsertPlaceholder(name, this._selectedSource);
  },

  _doInsertPlaceholder(name, sourceFile) {
    const chip = document.createElement('span');
    chip.className = 'placeholder-chip';
    chip.contentEditable = 'false';
    chip.setAttribute('data-placeholder', name);
    if (sourceFile) {
      chip.setAttribute('data-source', sourceFile);
    }
    chip.textContent = `{{${name}}}`;

    const editor = document.getElementById('template-editor');

    // Restore selection and insert
    if (this.savedSelection) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(this.savedSelection);

      // Check if selection is inside editor
      if (editor.contains(sel.anchorNode)) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        range.insertNode(chip);

        // Move cursor after the chip
        const newRange = document.createRange();
        newRange.setStartAfter(chip);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);

        // Add a space after
        const space = document.createTextNode('\u00A0');
        newRange.insertNode(space);
        newRange.setStartAfter(space);
        sel.removeAllRanges();
        sel.addRange(newRange);
      } else {
        editor.appendChild(chip);
        editor.appendChild(document.createTextNode('\u00A0'));
      }
    } else {
      editor.appendChild(chip);
      editor.appendChild(document.createTextNode('\u00A0'));
    }

    // Save new cursor position for consecutive inserts
    const sel2 = window.getSelection();
    if (sel2.rangeCount > 0) {
      this.savedSelection = sel2.getRangeAt(0).cloneRange();
    }

    this.updatePlaceholdersList();
    App.toast(`Đã chèn trường "${name}"`, 'success');

    // Don't close modal — allow user to insert more fields
    // Just highlight the inserted field
    const insertedChip = document.querySelector(`#ph-fields-grid .ph-field-chip[data-field="${name}"]`);
    if (insertedChip) {
      insertedChip.classList.add('ph-field-inserted');
    }
  },


  showInsertTable() {
    // Save cursor position
    const sel = window.getSelection();
    if (sel.rangeCount > 0) {
      this.savedSelection = sel.getRangeAt(0).cloneRange();
    }
    document.getElementById('table-rows').value = '3';
    document.getElementById('table-cols').value = '3';
    // Reset grid
    document.getElementById('tb-grid-container').innerHTML =
      '<p class="text-muted" style="text-align:center;padding:30px;">Nhấn "Tạo lưới" để bắt đầu</p>';
    document.getElementById('tb-cell-editor').style.display = 'none';
    document.getElementById('modal-table').style.display = 'flex';
    // Auto-generate grid
    setTimeout(() => TableBuilder.generateGrid(), 100);
  },

  insertTable() {
    // Legacy - now handled by TableBuilder.insertConfiguredTable()
    TableBuilder.insertConfiguredTable();
  },

  closeModal(id) {
    document.getElementById(id).style.display = 'none';
  },


  getPlaceholders() {
    if (typeof Spreadsheet !== 'undefined') {
      return Spreadsheet.getPlaceholders().map(p => p.name);
    }
    return [];
  },

  updatePlaceholdersList() {
    if (typeof Spreadsheet !== 'undefined') {
      Spreadsheet.updatePlaceholdersList();
    }
  },

  removePlaceholder(name) {
    // Handled by Spreadsheet module
    App.toast(`Đã xóa trường "${name}"`, 'info');
  },

  save() {
    const name = document.getElementById('template-name').value.trim();
    if (!name) {
      App.toast('Vui lòng nhập tên template', 'warning');
      document.getElementById('template-name').focus();
      return;
    }

    // Get spreadsheet state and rendered HTML
    const spreadsheetState = (typeof Spreadsheet !== 'undefined') ? Spreadsheet.getState() : {};
    const content = (typeof Spreadsheet !== 'undefined') ? Spreadsheet.toHTML() : '';
    const placeholders = this.getPlaceholders();
    const now = new Date().toISOString();

    if (AppState.editingTemplateId) {
      const idx = AppState.templates.findIndex(t => t.id === AppState.editingTemplateId);
      if (idx !== -1) {
        AppState.templates[idx].name = name;
        AppState.templates[idx].content = content;
        AppState.templates[idx].spreadsheetState = spreadsheetState;
        AppState.templates[idx].placeholders = placeholders;
        AppState.templates[idx].updatedAt = now;
      }
      App.toast('Template đã được cập nhật!', 'success');
    } else {
      const template = {
        id: App.generateId(),
        name: name,
        content: content,
        spreadsheetState: spreadsheetState,
        placeholders: placeholders,
        createdAt: now,
        updatedAt: now
      };
      AppState.templates.push(template);
      AppState.editingTemplateId = template.id;
      App.toast('Template đã được lưu!', 'success');
    }

    App.saveState();
    document.getElementById('editor-title').textContent = `Chỉnh sửa: ${name}`;
  },

  renderTemplatesList() {
    const container = document.getElementById('templates-list');
    const emptyState = document.getElementById('no-templates');

    if (AppState.templates.length === 0) {
      container.style.display = 'none';
      emptyState.style.display = 'flex';
      return;
    }

    container.style.display = 'grid';
    emptyState.style.display = 'none';

    container.innerHTML = AppState.templates.map(tpl => {
      const date = new Date(tpl.updatedAt || tpl.createdAt);
      const dateStr = date.toLocaleDateString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });

      // Strip HTML for preview
      const temp = document.createElement('div');
      temp.innerHTML = tpl.content;
      const textPreview = temp.textContent.substring(0, 200);

      return `
        <div class="template-card">
          <div class="template-card-header">
            <div>
              <h4>${this.escapeHtml(tpl.name)}</h4>
              <div class="template-card-meta">${dateStr}</div>
            </div>
            <span class="placeholder-count">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M7 8l-4 4 4 4"/><path d="M17 8l4 4-4 4"/>
              </svg>
              ${tpl.placeholders ? tpl.placeholders.length : 0} trường
            </span>
          </div>
          <div class="template-card-preview">${textPreview || 'Không có nội dung'}</div>
          <div class="template-card-actions">
            <button class="btn btn-sm btn-outline" onclick="TemplateBuilder.editTemplate('${tpl.id}')">
              ✎ Chỉnh sửa
            </button>
            <button class="btn btn-sm btn-outline" onclick="TemplateBuilder.duplicateTemplate('${tpl.id}')">
              ⧉ Nhân bản
            </button>
            <button class="btn btn-sm btn-danger" onclick="TemplateBuilder.deleteTemplate('${tpl.id}')">
              ✕ Xóa
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  editTemplate(id) {
    const tpl = AppState.templates.find(t => t.id === id);
    if (!tpl) return;

    AppState.editingTemplateId = id;
    document.getElementById('template-name').value = tpl.name;
    document.getElementById('editor-title').textContent = `Chỉnh sửa: ${tpl.name}`;

    // Load spreadsheet state if available
    if (typeof Spreadsheet !== 'undefined' && tpl.spreadsheetState) {
      Spreadsheet.loadState(tpl.spreadsheetState);
    } else if (typeof Spreadsheet !== 'undefined') {
      Spreadsheet.init(10, 8);
    }

    this.updatePlaceholdersList();
    App.navigateTo('editor');
  },

  duplicateTemplate(id) {
    const tpl = AppState.templates.find(t => t.id === id);
    if (!tpl) return;

    const newTpl = {
      ...tpl,
      id: App.generateId(),
      name: tpl.name + ' (Bản sao)',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    AppState.templates.push(newTpl);
    App.saveState();
    this.renderTemplatesList();
    App.toast('Đã nhân bản template!', 'success');
  },

  deleteTemplate(id) {
    if (!confirm('Bạn có chắc muốn xóa template này?')) return;

    AppState.templates = AppState.templates.filter(t => t.id !== id);
    App.saveState();
    this.renderTemplatesList();
    App.toast('Đã xóa template', 'info');
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

// ============================================
// TABLE BUILDER - Interactive Table Grid
// ============================================
const TableBuilder = {
  cellData: [],     // 2D array: cellData[row][col] = { type, text, placeholder, sourceFile }
  selectedCell: null, // { row, col }
  rows: 0,
  cols: 0,

  // Source file color map for visual distinction
  sourceColors: {
    thong_tin_vay: '#f59e0b',
    tai_san: '#10b981',
    chu_tai_san: '#3b82f6',
    tai_san_ctt: '#8b5cf6',
    thong_tin_chuyen_tien: '#ec4899',
    thu_phi_tnth: '#14b8a6',
    han_muc: '#f97316',
    tai_tai_tro: '#06b6d4'
  },

  generateGrid() {
    this.rows = parseInt(document.getElementById('table-rows').value) || 3;
    this.cols = parseInt(document.getElementById('table-cols').value) || 3;
    this.selectedCell = null;

    // Initialize cell data
    this.cellData = [];
    for (let r = 0; r < this.rows; r++) {
      this.cellData[r] = [];
      for (let c = 0; c < this.cols; c++) {
        this.cellData[r][c] = {
          type: r === 0 ? 'header' : 'text',
          text: r === 0 ? `Tiêu đề ${c + 1}` : '',
          placeholder: '',
          sourceFile: ''
        };
      }
    }

    this.renderGrid();
    document.getElementById('tb-cell-editor').style.display = 'none';
    App.toast(`Đã tạo lưới ${this.rows}×${this.cols}`, 'info');
  },

  renderGrid() {
    const container = document.getElementById('tb-grid-container');
    const colLetters = 'ABCDEFGHIJ';

    let html = '<table class="tb-grid"><thead><tr>';
    html += '<th class="tb-col-indicator"></th>'; // corner
    for (let c = 0; c < this.cols; c++) {
      html += `<th class="tb-col-indicator">${colLetters[c] || c + 1}</th>`;
    }
    html += '</tr></thead><tbody>';

    for (let r = 0; r < this.rows; r++) {
      html += '<tr>';
      html += `<td class="tb-row-indicator">${r + 1}</td>`;
      for (let c = 0; c < this.cols; c++) {
        const cell = this.cellData[r][c];
        const isSelected = this.selectedCell && this.selectedCell.row === r && this.selectedCell.col === c;
        const selectedClass = isSelected ? ' selected' : '';
        const typeClass = `type-${cell.type}`;

        let cellContent = '';
        if (cell.type === 'placeholder' && cell.placeholder) {
          cellContent = `<span class="tb-cell-label">{{${this.escapeHtml(cell.placeholder)}}}</span>`;
          if (cell.sourceFile && FILE_TYPES[cell.sourceFile]) {
            const color = this.sourceColors[cell.sourceFile] || '#6366f1';
            cellContent += `<span class="tb-cell-source-badge" style="background:${color}20;color:${color};">📄 ${FILE_TYPES[cell.sourceFile].label}</span>`;
          }
        } else if (cell.text) {
          cellContent = `<span class="tb-cell-label">${this.escapeHtml(cell.text)}</span>`;
        } else {
          cellContent = `<span class="tb-cell-label" style="opacity:0.3;font-style:italic;">Nhấn để cấu hình</span>`;
        }

        const typeIndicator = cell.type === 'header' ? 'H' : (cell.type === 'placeholder' ? '⧉' : 'T');

        html += `<td>
          <div class="tb-cell ${typeClass}${selectedClass}" onclick="TableBuilder.selectCell(${r}, ${c})">
            <span class="tb-cell-type-indicator">${typeIndicator}</span>
            ${cellContent}
          </div>
        </td>`;
      }
      html += '</tr>';
    }

    html += '</tbody></table>';
    container.innerHTML = html;
  },

  selectCell(row, col) {
    this.selectedCell = { row, col };
    const cell = this.cellData[row][col];

    // Update position label
    const colLetters = 'ABCDEFGHIJ';
    document.getElementById('tb-cell-pos').textContent = `${colLetters[col] || col + 1}${row + 1}`;

    // Update type buttons
    document.querySelectorAll('.tb-type-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-type') === cell.type);
    });

    // Show/hide fields based on type
    this.updateEditorFields(cell.type);

    // Populate fields
    document.getElementById('tb-cell-text').value = cell.text || '';
    document.getElementById('tb-cell-placeholder-name').value = cell.placeholder || '';

    // Populate source file dropdown
    const sourceSelect = document.getElementById('tb-cell-source-file');
    sourceSelect.innerHTML = '<option value="">-- Chọn file nguồn --</option>';
    Object.keys(FILE_TYPES).forEach(key => {
      const config = FILE_TYPES[key];
      const selected = cell.sourceFile === key ? ' selected' : '';
      sourceSelect.innerHTML += `<option value="${key}"${selected}>📄 ${config.label} — ${config.description}</option>`;
    });

    // Show editor
    document.getElementById('tb-cell-editor').style.display = 'block';
    this.renderGrid();

    // Focus input
    setTimeout(() => {
      if (cell.type === 'placeholder') {
        document.getElementById('tb-cell-placeholder-name').focus();
      } else {
        document.getElementById('tb-cell-text').focus();
      }
    }, 50);
  },

  setCellType(type) {
    if (!this.selectedCell) return;
    const cell = this.cellData[this.selectedCell.row][this.selectedCell.col];
    cell.type = type;

    // Update buttons
    document.querySelectorAll('.tb-type-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-type') === type);
    });

    this.updateEditorFields(type);
    this.renderGrid();
  },

  updateEditorFields(type) {
    const textGroup = document.getElementById('tb-text-input-group');
    const placeholderGroup = document.getElementById('tb-placeholder-group');

    if (type === 'placeholder') {
      textGroup.style.display = 'none';
      placeholderGroup.style.display = 'flex';
    } else {
      textGroup.style.display = 'flex';
      placeholderGroup.style.display = 'none';
    }
  },

  updateCellContent() {
    if (!this.selectedCell) return;
    const cell = this.cellData[this.selectedCell.row][this.selectedCell.col];

    if (cell.type === 'placeholder') {
      cell.placeholder = document.getElementById('tb-cell-placeholder-name').value.trim();
      cell.sourceFile = document.getElementById('tb-cell-source-file').value;
      cell.text = '';
    } else {
      cell.text = document.getElementById('tb-cell-text').value.trim();
      cell.placeholder = '';
      cell.sourceFile = '';
    }

    this.renderGrid();
  },

  applyCellConfig() {
    this.updateCellContent();
    this.closeCellEditor();
    App.toast('Đã áp dụng cấu hình ô', 'success');
  },

  closeCellEditor() {
    this.selectedCell = null;
    document.getElementById('tb-cell-editor').style.display = 'none';
    this.renderGrid();
  },

  insertConfiguredTable() {
    if (this.cellData.length === 0) {
      App.toast('Vui lòng tạo lưới bảng trước', 'warning');
      return;
    }

    // Build HTML table
    let html = '<table><tbody>';
    for (let r = 0; r < this.rows; r++) {
      html += '<tr>';
      for (let c = 0; c < this.cols; c++) {
        const cell = this.cellData[r][c];
        const tag = cell.type === 'header' ? 'th' : 'td';

        if (cell.type === 'placeholder' && cell.placeholder) {
          const sourceAttr = cell.sourceFile ? ` data-source="${cell.sourceFile}"` : '';
          html += `<${tag}><span class="placeholder-chip" contenteditable="false" data-placeholder="${this.escapeHtml(cell.placeholder)}"${sourceAttr}>{{${this.escapeHtml(cell.placeholder)}}}</span></${tag}>`;
        } else {
          html += `<${tag}>${cell.text || '&nbsp;'}</${tag}>`;
        }
      }
      html += '</tr>';
    }
    html += '</tbody></table><p></p>';

    const editor = document.getElementById('template-editor');

    if (TemplateBuilder.savedSelection) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(TemplateBuilder.savedSelection);

      if (editor.contains(sel.anchorNode)) {
        document.execCommand('insertHTML', false, html);
      } else {
        editor.innerHTML += html;
      }
    } else {
      editor.innerHTML += html;
    }

    TemplateBuilder.closeModal('modal-table');
    TemplateBuilder.updatePlaceholdersList();
    editor.focus();
    App.toast(`Đã chèn bảng ${this.rows}×${this.cols} vào template`, 'success');
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

// ============================================
// DATA PROCESSOR - Excel File Parsing
// ============================================
const DataProcessor = {
  parseFile(file, fileType) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const config = FILE_TYPES[fileType];

          let extracted = {};

          if (config.structure === 'vertical') {
            extracted = this.parseVertical(sheet);
          } else {
            extracted = this.parseHorizontal(sheet, config.valueRows);
          }

          resolve(extracted);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  },

  parseVertical(sheet) {
    // Column A = keys, Column B = values
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
    const result = {};

    for (let row = range.s.r; row <= range.e.r; row++) {
      const cellA = sheet[XLSX.utils.encode_cell({ r: row, c: 0 })];
      const cellB = sheet[XLSX.utils.encode_cell({ r: row, c: 1 })];

      const key = cellA ? this.formatValue(cellA) : '';
      const value = cellB ? this.formatValue(cellB) : '';

      if (key && key.trim()) {
        result[key.trim()] = value;
      }
    }

    return result;
  },

  parseHorizontal(sheet, valueRows) {
    // Row 1 = headers, Row 2+ = values
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
    const result = {};

    // Get headers from row 1 (index 0)
    const headers = [];
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cell = sheet[XLSX.utils.encode_cell({ r: 0, c: col })];
      headers.push(cell ? this.formatValue(cell) : '');
    }

    // Get values from subsequent rows
    for (let rowOffset = 0; rowOffset < valueRows; rowOffset++) {
      const rowIdx = 1 + rowOffset; // Start from row 2 (index 1)
      if (rowIdx > range.e.r) break;

      for (let col = range.s.c; col <= range.e.c; col++) {
        const header = headers[col - range.s.c];
        if (!header || !header.trim()) continue;

        const cell = sheet[XLSX.utils.encode_cell({ r: rowIdx, c: col })];
        const value = cell ? this.formatValue(cell) : '';

        if (valueRows > 1) {
          // Multiple value rows - add row indicator
          const key = `${header.trim()} (Dòng ${rowOffset + 1})`;
          result[key] = value;
        } else {
          result[header.trim()] = value;
        }
      }
    }

    return result;
  },

  formatValue(cell) {
    if (cell.t === 'n') {
      // Number - check if it has a format
      if (cell.z && cell.z.includes('%')) {
        return (cell.v * 100).toFixed(2) + '%';
      }
      // Check if it's a date
      if (cell.z && (cell.z.includes('d') || cell.z.includes('m') || cell.z.includes('y'))) {
        try {
          const date = XLSX.SSF.parse_date_code(cell.v);
          if (date) {
            return `${String(date.d).padStart(2, '0')}/${String(date.m).padStart(2, '0')}/${date.y}`;
          }
        } catch (e) {}
      }
      // Regular number
      if (Number.isInteger(cell.v)) {
        return cell.v.toLocaleString('vi-VN');
      }
      return cell.v.toLocaleString('vi-VN', { maximumFractionDigits: 4 });
    }
    if (cell.t === 'd') {
      const d = new Date(cell.v);
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    }
    return cell.v !== undefined ? String(cell.v) : '';
  }
};

// ============================================
// GENERATOR - Generate Documents
// ============================================
const Generator = {
  initUploadSlots() {
    const grid = document.getElementById('upload-grid');
    if (!grid) return;

    grid.innerHTML = Object.keys(FILE_TYPES).map(key => {
      const config = FILE_TYPES[key];
      return `
        <div class="upload-slot" id="slot-${key}">
          <div class="upload-slot-header">
            <span class="upload-slot-title">${config.label}</span>
            <span class="upload-slot-badge optional">Tùy chọn</span>
          </div>
          <div class="upload-slot-desc">${config.description}</div>
          <div class="upload-input-wrapper">
            <input type="file" accept=".xlsx,.xls,.csv"
              id="file-${key}"
              onchange="Generator.onFileSelected('${key}', this)">
          </div>
          <div class="upload-file-info" id="file-info-${key}" style="display:none;">
            ✓ <span id="file-name-${key}"></span>
          </div>
        </div>
      `;
    }).join('');
  },

  onFileSelected(fileType, input) {
    const slot = document.getElementById(`slot-${fileType}`);
    const info = document.getElementById(`file-info-${fileType}`);
    const nameEl = document.getElementById(`file-name-${fileType}`);

    if (input.files.length > 0) {
      AppState.uploadedFiles[fileType] = input.files[0];
      slot.classList.add('has-file');
      info.style.display = 'flex';
      nameEl.textContent = input.files[0].name;
    } else {
      delete AppState.uploadedFiles[fileType];
      slot.classList.remove('has-file');
      info.style.display = 'none';
    }
  },

  initStep1() {
    // Populate template selector
    const select = document.getElementById('select-template');
    select.innerHTML = '<option value="">-- Chọn template --</option>';

    AppState.templates.forEach(tpl => {
      const opt = document.createElement('option');
      opt.value = tpl.id;
      opt.textContent = tpl.name;
      select.appendChild(opt);
    });

    select.onchange = () => {
      const id = select.value;
      const btn = document.getElementById('btn-step1-next');
      const preview = document.getElementById('template-preview-mini');
      const previewContent = document.getElementById('template-preview-content');

      if (id) {
        btn.disabled = false;
        AppState.selectedTemplateId = id;
        const tpl = AppState.templates.find(t => t.id === id);
        if (tpl) {
          preview.style.display = 'block';
          previewContent.innerHTML = tpl.content;
        }
      } else {
        btn.disabled = true;
        AppState.selectedTemplateId = null;
        preview.style.display = 'none';
      }
    };

    // Reset selection
    if (AppState.selectedTemplateId) {
      select.value = AppState.selectedTemplateId;
      select.onchange();
    }

    this.goToStep(1);
  },

  goToStep(step) {
    AppState.currentStep = step;

    // Update step indicators
    document.querySelectorAll('.steps-indicator .step').forEach(s => {
      const sNum = parseInt(s.getAttribute('data-step'));
      s.classList.remove('active', 'completed');
      if (sNum === step) s.classList.add('active');
      if (sNum < step) s.classList.add('completed');
    });

    // Show correct step content
    document.querySelectorAll('.gen-step').forEach(s => s.classList.remove('active'));
    const stepEl = document.getElementById(`gen-step-${step}`);
    if (stepEl) stepEl.classList.add('active');
  },

  async extractAllData() {
    const fileKeys = Object.keys(AppState.uploadedFiles);

    if (fileKeys.length === 0) {
      App.toast('Vui lòng upload ít nhất 1 file Excel', 'warning');
      return;
    }

    // Show loading
    const btn = document.getElementById('btn-extract');
    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳ Đang trích xuất...';
    btn.disabled = true;

    AppState.extractedData = {};

    try {
      for (const fileType of fileKeys) {
        const file = AppState.uploadedFiles[fileType];
        const data = await DataProcessor.parseFile(file, fileType);
        AppState.extractedData[fileType] = data;
      }

      // Count total fields
      let totalFields = 0;
      Object.values(AppState.extractedData).forEach(data => {
        totalFields += Object.keys(data).length;
      });

      App.toast(`Đã trích xuất ${totalFields} trường dữ liệu từ ${fileKeys.length} file`, 'success');

      // Build mapping UI and go to step 3
      this.buildMappingUI();
      this.goToStep(3);

    } catch (err) {
      console.error('Extract error:', err);
      App.toast('Lỗi khi đọc file Excel: ' + err.message, 'error');
    } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  },

  buildMappingUI() {
    const tpl = AppState.templates.find(t => t.id === AppState.selectedTemplateId);
    if (!tpl || !tpl.placeholders || tpl.placeholders.length === 0) {
      document.getElementById('mapping-container').innerHTML = `
        <div class="empty-state">
          <h3>Template không có trường dữ liệu</h3>
          <p>Hãy quay lại và chỉnh sửa template, chèn các trường dữ liệu trước</p>
        </div>
      `;
      return;
    }

    // Build options from extracted data
    let options = '<option value="">-- Không mapping --</option>';
    Object.keys(AppState.extractedData).forEach(fileType => {
      const config = FILE_TYPES[fileType];
      const data = AppState.extractedData[fileType];
      const keys = Object.keys(data);
      if (keys.length > 0) {
        options += `<optgroup label="${config.label}">`;
        keys.forEach(key => {
          const value = data[key];
          const displayValue = String(value).substring(0, 50);
          options += `<option value="${fileType}::${key}" title="${displayValue}">[${config.label}] ${key}</option>`;
        });
        options += '</optgroup>';
      }
    });

    const container = document.getElementById('mapping-container');
    container.innerHTML = `
      <table class="mapping-table">
        <thead>
          <tr>
            <th style="width:30%">Trường trong Template</th>
            <th style="width:40%">Dữ liệu từ Excel</th>
            <th style="width:30%">Giá trị hiện tại</th>
          </tr>
        </thead>
        <tbody>
          ${tpl.placeholders.map(ph => `
            <tr>
              <td class="mapping-placeholder-name">{{${TemplateBuilder.escapeHtml(ph)}}}</td>
              <td>
                <select class="mapping-select" id="map-${this.sanitizeId(ph)}"
                  onchange="Generator.onMappingChange('${ph.replace(/'/g, "\\'")}', this.value)">
                  ${options}
                </select>
              </td>
              <td class="mapping-value-preview" id="preview-${this.sanitizeId(ph)}">—</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    // Auto-map: try to match placeholder names with field names
    this.autoMap(tpl.placeholders);
  },

  autoMap(placeholders) {
    placeholders.forEach(ph => {
      const phLower = ph.toLowerCase().trim();
      let bestMatch = null;
      let bestScore = 0;

      Object.keys(AppState.extractedData).forEach(fileType => {
        const data = AppState.extractedData[fileType];
        Object.keys(data).forEach(key => {
          const keyLower = key.toLowerCase().trim();
          let score = 0;

          // Exact match
          if (keyLower === phLower) {
            score = 100;
          }
          // Contains match
          else if (keyLower.includes(phLower) || phLower.includes(keyLower)) {
            score = 60;
          }
          // Word overlap
          else {
            const phWords = phLower.split(/\s+/);
            const keyWords = keyLower.split(/\s+/);
            const overlap = phWords.filter(w => keyWords.some(kw => kw.includes(w) || w.includes(kw)));
            if (overlap.length > 0) {
              score = (overlap.length / Math.max(phWords.length, keyWords.length)) * 50;
            }
          }

          if (score > bestScore) {
            bestScore = score;
            bestMatch = `${fileType}::${key}`;
          }
        });
      });

      if (bestMatch && bestScore >= 50) {
        const selectEl = document.getElementById(`map-${this.sanitizeId(ph)}`);
        if (selectEl) {
          selectEl.value = bestMatch;
          this.onMappingChange(ph, bestMatch);
        }
      }
    });
  },

  onMappingChange(placeholder, value) {
    const previewEl = document.getElementById(`preview-${this.sanitizeId(placeholder)}`);
    if (!value) {
      previewEl.textContent = '—';
      return;
    }

    const [fileType, field] = value.split('::');
    const data = AppState.extractedData[fileType];
    if (data && data[field] !== undefined) {
      previewEl.textContent = String(data[field]).substring(0, 80) || '(trống)';
      previewEl.title = String(data[field]);
    } else {
      previewEl.textContent = '—';
    }
  },

  sanitizeId(str) {
    return str.replace(/[^a-zA-Z0-9_\u00C0-\u1EF9]/g, '_');
  },

  preview() {
    const tpl = AppState.templates.find(t => t.id === AppState.selectedTemplateId);
    if (!tpl) return;

    // Build replacement map
    const replacements = {};
    if (tpl.placeholders) {
      tpl.placeholders.forEach(ph => {
        const selectEl = document.getElementById(`map-${this.sanitizeId(ph)}`);
        if (selectEl && selectEl.value) {
          const [fileType, field] = selectEl.value.split('::');
          const data = AppState.extractedData[fileType];
          if (data && data[field] !== undefined) {
            replacements[ph] = String(data[field]);
          }
        }
      });
    }

    // Replace {{placeholder}} patterns in template content
    let html = tpl.content || '';
    Object.keys(replacements).forEach(ph => {
      const regex = new RegExp(`\\{\\{${ph.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}\\}`, 'g');
      html = html.replace(regex, replacements[ph]);
    });

    // Highlight remaining unmapped placeholders in red
    html = html.replace(/\{\{([^}]+)\}\}/g, '<span style="color:#ef4444;font-weight:600;">{{$1}}</span>');

    document.getElementById('pdf-preview').innerHTML = html;
    this.goToStep(4);
    App.toast('Xem trước đã sẵn sàng!', 'success');
  },

  exportPDF() {
    const preview = document.getElementById('pdf-preview');
    if (!preview.innerHTML.trim()) {
      App.toast('Không có nội dung để xuất', 'warning');
      return;
    }

    const tpl = AppState.templates.find(t => t.id === AppState.selectedTemplateId);
    const fileName = tpl ? tpl.name.replace(/[^a-zA-Z0-9_\u00C0-\u1EF9\s-]/g, '').trim() : 'document';

    // Create a clone for PDF rendering
    const renderArea = document.getElementById('pdf-render-area');
    renderArea.innerHTML = '';

    const exportDiv = document.createElement('div');
    exportDiv.className = 'pdf-export-content';
    exportDiv.innerHTML = preview.innerHTML;
    renderArea.appendChild(exportDiv);

    // Make render area visible temporarily
    renderArea.style.position = 'absolute';
    renderArea.style.left = '0';
    renderArea.style.top = '0';
    renderArea.style.zIndex = '-1';
    renderArea.style.opacity = '0';

    const opt = {
      margin: 0,
      filename: `${fileName}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        letterRendering: true,
        logging: false
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait'
      },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    App.toast('Đang tạo PDF...', 'info');

    html2pdf().set(opt).from(exportDiv).save().then(() => {
      // Cleanup
      renderArea.style.position = 'absolute';
      renderArea.style.left = '-9999px';
      renderArea.style.top = '-9999px';
      renderArea.style.opacity = '1';

      AppState.exportCount++;
      App.saveState();
      App.toast('PDF đã được tải xuống!', 'success');
    }).catch(err => {
      console.error('PDF export error:', err);
      App.toast('Lỗi khi xuất PDF: ' + err.message, 'error');
    });
  }
};

// ============================================
// KEYBOARD SHORTCUTS
// ============================================
document.addEventListener('keydown', (e) => {
  // Enter in placeholder modal
  if (e.key === 'Enter') {
    const modal = document.getElementById('modal-placeholder');
    if (modal.style.display === 'flex') {
      e.preventDefault();
      TemplateBuilder.insertPlaceholder();
    }
    const tableModal = document.getElementById('modal-table');
    if (tableModal.style.display === 'flex') {
      e.preventDefault();
      TemplateBuilder.insertTable();
    }
  }

  // Escape to close modals
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay').forEach(m => {
      m.style.display = 'none';
    });
  }

  // Ctrl+S to save template (when on editor page)
  if (e.ctrlKey && e.key === 's') {
    const editorPage = document.getElementById('page-editor');
    if (editorPage.classList.contains('active')) {
      e.preventDefault();
      TemplateBuilder.save();
    }
  }
});

// (Old contenteditable editor handler removed – now using Spreadsheet module)

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
