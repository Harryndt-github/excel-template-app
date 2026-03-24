/* ===========================================================
   Spreadsheet Engine – Excel-like grid for template editing
   =========================================================== */

const Spreadsheet = (() => {
  /* ───── State ───── */
  let rows = 10;
  let cols = 8;
  let cellData = {}; // key = "r_c" → {value, bold, italic, align, fontSize, bgColor, textColor, type, placeholder, source, mergeParent, mergeSpan}
  let selectedCell = null;   // "r_c"
  let selectionRange = null; // {r1,c1,r2,c2}
  let colWidths = [];
  let undoStack = [];
  let redoStack = [];
  let resizing = null;

  /* ───── Helpers ───── */
  const key = (r, c) => `${r}_${c}`;
  const parseKey = k => k.split('_').map(Number);
  const colLabel = c => {
    let s = '';
    let n = c;
    while (n >= 0) { s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26) - 1; }
    return s;
  };
  const cellRef = (r, c) => `${colLabel(c)}${r + 1}`;
  const getCell = (r, c) => cellData[key(r, c)] || {};
  const initCell = (r, c) => { if (!cellData[key(r, c)]) cellData[key(r, c)] = {}; return cellData[key(r, c)]; };
  const $ = id => document.getElementById(id);

  /* ───── Init / Create Grid ───── */
  function init(numRows, numCols) {
    rows = numRows || 10;
    cols = numCols || 8;
    cellData = {};
    colWidths = Array.from({ length: cols }, () => 120);
    selectedCell = key(0, 0);
    selectionRange = null;
    undoStack = [];
    redoStack = [];
    render();
    selectCellUI(0, 0);
  }

  function render() {
    const container = $('spreadsheet-container');
    if (!container) return;

    let html = '<div class="ss-wrapper">';

    // ── Header row
    html += '<div class="ss-header-row">';
    html += '<div class="ss-corner-cell"></div>';
    for (let c = 0; c < cols; c++) {
      const selCols = getSelectedCols();
      const cls = selCols.has(c) ? ' selected' : '';
      html += `<div class="ss-col-header${cls}" style="width:${colWidths[c]}px;min-width:${colWidths[c]}px" data-col="${c}">
        ${colLabel(c)}
        <div class="ss-col-resizer" data-col="${c}"></div>
      </div>`;
    }
    html += '</div>';

    // ── Data rows
    for (let r = 0; r < rows; r++) {
      const selRows = getSelectedRows();
      const rhCls = selRows.has(r) ? ' selected' : '';
      html += `<div class="ss-row" data-row="${r}">`;
      html += `<div class="ss-row-header${rhCls}" data-row="${r}">${r + 1}</div>`;
      for (let c = 0; c < cols; c++) {
        const cell = getCell(r, c);

        // Skip cells hidden by merge
        if (cell.mergeParent) continue;

        const isSelected = selectedCell === key(r, c);
        const inRange = isCellInRange(r, c);
        let cls = 'ss-cell';
        if (isSelected) cls += ' selected';
        if (inRange && !isSelected) cls += ' in-range';
        if (cell.type === 'header') cls += ' header-cell';
        if (cell.type === 'placeholder') cls += ' placeholder-cell';
        if (cell.bold) cls += ' bold';
        if (cell.italic) cls += ' italic';

        // merge span
        let colspan = 1, rowspan = 1;
        if (cell.mergeSpan) {
          colspan = cell.mergeSpan.cols || 1;
          rowspan = cell.mergeSpan.rows || 1;
        }

        // width
        let w = 0;
        for (let ci = c; ci < c + colspan && ci < cols; ci++) w += colWidths[ci];

        // inline style
        const styles = [];
        styles.push(`width:${w}px`);
        styles.push(`min-width:${w}px`);
        if (rowspan > 1) {
          styles.push(`height:${rowspan * 32}px`);
        }
        if (cell.bgColor && cell.bgColor !== '#ffffff') styles.push(`background:${cell.bgColor}`);
        if (cell.textColor && cell.textColor !== '#1a1a2e') styles.push(`color:${cell.textColor}`);
        if (cell.fontSize) styles.push(`font-size:${cell.fontSize}px`);
        if (cell.align) styles.push(`justify-content:${cell.align === 'left' ? 'flex-start' : cell.align === 'right' ? 'flex-end' : 'center'}`);

        let content = '';
        if (cell.type === 'placeholder' && cell.placeholder) {
          const srcBadge = cell.source ? `<span class="ss-source-badge">${cell.source}</span>` : '';
          content = `<span class="ss-placeholder-chip">⧉ {{${cell.placeholder}}}${srcBadge}</span>`;
        } else {
          content = cell.value || '';
        }

        html += `<div class="${cls}" data-row="${r}" data-col="${c}" 
          ${colspan > 1 ? `data-colspan="${colspan}"` : ''} 
          ${rowspan > 1 ? `data-rowspan="${rowspan}"` : ''}
          style="${styles.join(';')}"
          onclick="Spreadsheet.onCellClick(event,${r},${c})"
          ondblclick="Spreadsheet.onCellDblClick(${r},${c})"
          oncontextmenu="Spreadsheet.onContextMenu(event,${r},${c})">
          <div class="ss-cell-content">${content}</div>
        </div>`;
      }
      html += '</div>';
    }

    html += '</div>';
    container.innerHTML = html;

    // bind column resizers
    container.querySelectorAll('.ss-col-resizer').forEach(el => {
      el.addEventListener('mousedown', startResize);
    });
  }

  /* ───── Selection ───── */
  function getSelectedCols() {
    const s = new Set();
    if (selectedCell) { s.add(parseKey(selectedCell)[1]); }
    if (selectionRange) {
      for (let c = selectionRange.c1; c <= selectionRange.c2; c++) s.add(c);
    }
    return s;
  }
  function getSelectedRows() {
    const s = new Set();
    if (selectedCell) { s.add(parseKey(selectedCell)[0]); }
    if (selectionRange) {
      for (let r = selectionRange.r1; r <= selectionRange.r2; r++) s.add(r);
    }
    return s;
  }
  function isCellInRange(r, c) {
    if (!selectionRange) return false;
    return r >= selectionRange.r1 && r <= selectionRange.r2 && c >= selectionRange.c1 && c <= selectionRange.c2;
  }

  function selectCellUI(r, c) {
    selectedCell = key(r, c);
    const cell = getCell(r, c);
    // update formula bar
    const ref = $('ss-cell-ref');
    const bar = $('ss-formula-bar');
    if (ref) ref.textContent = cellRef(r, c);
    if (bar) bar.value = cell.type === 'placeholder' ? `{{${cell.placeholder || ''}}}` : (cell.value || '');

    // update toolbar state
    const boldBtn = $('ss-bold-btn');
    const italicBtn = $('ss-italic-btn');
    if (boldBtn) boldBtn.classList.toggle('active', !!cell.bold);
    if (italicBtn) italicBtn.classList.toggle('active', !!cell.italic);

    render();
  }

  /* ───── Event handlers ───── */
  function onCellClick(e, r, c) {
    if (e.shiftKey && selectedCell) {
      // extend range
      const [sr, sc] = parseKey(selectedCell);
      selectionRange = {
        r1: Math.min(sr, r), c1: Math.min(sc, c),
        r2: Math.max(sr, r), c2: Math.max(sc, c)
      };
      render();
    } else {
      selectionRange = null;
      selectCellUI(r, c);
    }
  }

  function onCellDblClick(r, c) {
    const cellEl = document.querySelector(`.ss-cell[data-row="${r}"][data-col="${c}"]`);
    if (!cellEl) return;
    const cell = getCell(r, c);

    // don't edit placeholder by double click
    if (cell.type === 'placeholder') return;

    cellEl.classList.add('editing');
    const contentEl = cellEl.querySelector('.ss-cell-content');
    contentEl.contentEditable = 'true';
    contentEl.focus();

    // select text
    const range = document.createRange();
    range.selectNodeContents(contentEl);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    const finish = () => {
      pushUndo();
      const cd = initCell(r, c);
      cd.value = contentEl.textContent;
      contentEl.contentEditable = 'false';
      cellEl.classList.remove('editing');
      // update formula bar
      const bar = $('ss-formula-bar');
      if (bar) bar.value = cd.value;
      updatePlaceholdersList();
    };

    contentEl.addEventListener('blur', finish, { once: true });
    contentEl.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        contentEl.blur();
        // move to next row
        if (r + 1 < rows) selectCellUI(r + 1, c);
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        contentEl.blur();
        if (c + 1 < cols) selectCellUI(r, c + 1);
      }
      if (e.key === 'Escape') {
        contentEl.textContent = cell.value || '';
        contentEl.blur();
      }
    });
  }

  function onContextMenu(e, r, c) {
    e.preventDefault();
    selectCellUI(r, c);
    showContextMenu(e.clientX, e.clientY, r, c);
  }

  /* ───── Context menu ───── */
  function showContextMenu(x, y, r, c) {
    removeContextMenu();
    const menu = document.createElement('div');
    menu.className = 'ss-context-menu';
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    menu.innerHTML = `
      <div class="ss-ctx-item" onclick="Spreadsheet.insertRowAbove()"><span class="ss-ctx-icon">↑</span> Thêm hàng phía trên</div>
      <div class="ss-ctx-item" onclick="Spreadsheet.insertRowBelow()"><span class="ss-ctx-icon">↓</span> Thêm hàng phía dưới</div>
      <div class="ss-ctx-divider"></div>
      <div class="ss-ctx-item" onclick="Spreadsheet.insertColLeft()"><span class="ss-ctx-icon">←</span> Thêm cột bên trái</div>
      <div class="ss-ctx-item" onclick="Spreadsheet.insertColRight()"><span class="ss-ctx-icon">→</span> Thêm cột bên phải</div>
      <div class="ss-ctx-divider"></div>
      <div class="ss-ctx-item" onclick="Spreadsheet.deleteRow()"><span class="ss-ctx-icon danger">✕</span> Xóa hàng</div>
      <div class="ss-ctx-item" onclick="Spreadsheet.deleteCol()"><span class="ss-ctx-icon danger">✕</span> Xóa cột</div>
      <div class="ss-ctx-divider"></div>
      <div class="ss-ctx-item" onclick="Spreadsheet.setCellAsPlaceholder()"><span class="ss-ctx-icon accent">⧉</span> Chèn trường dữ liệu</div>
      <div class="ss-ctx-item" onclick="Spreadsheet.clearCell()"><span class="ss-ctx-icon">⌫</span> Xóa nội dung ô</div>
    `;
    document.body.appendChild(menu);

    // adjust if off screen
    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) menu.style.left = (x - rect.width) + 'px';
    if (rect.bottom > window.innerHeight) menu.style.top = (y - rect.height) + 'px';

    setTimeout(() => {
      document.addEventListener('click', removeContextMenu, { once: true });
    }, 50);
  }
  function removeContextMenu() {
    document.querySelectorAll('.ss-context-menu').forEach(m => m.remove());
  }

  /* ───── Cell value from formula bar ───── */
  function setCellValue(val) {
    if (!selectedCell) return;
    pushUndo();
    const [r, c] = parseKey(selectedCell);
    const cd = initCell(r, c);
    cd.value = val;
    cd.type = undefined; // clear placeholder type when manually editing
    cd.placeholder = undefined;
    cd.source = undefined;
    render();
    updatePlaceholdersList();
  }

  /* ───── Formatting ───── */
  function toggleBold() {
    applyToSelection(cd => { cd.bold = !cd.bold; });
    render();
  }
  function toggleItalic() {
    applyToSelection(cd => { cd.italic = !cd.italic; });
    render();
  }
  function setAlign(align) {
    applyToSelection(cd => { cd.align = align; });
    render();
  }
  function setFontSize(size) {
    applyToSelection(cd => { cd.fontSize = parseInt(size); });
    render();
  }
  function setBgColor(color) {
    applyToSelection(cd => { cd.bgColor = color; });
    render();
  }
  function setTextColor(color) {
    applyToSelection(cd => { cd.textColor = color; });
    render();
  }

  function applyToSelection(fn) {
    pushUndo();
    if (selectionRange) {
      for (let r = selectionRange.r1; r <= selectionRange.r2; r++) {
        for (let c = selectionRange.c1; c <= selectionRange.c2; c++) {
          fn(initCell(r, c));
        }
      }
    } else if (selectedCell) {
      const [r, c] = parseKey(selectedCell);
      fn(initCell(r, c));
    }
  }

  /* ───── Merge / Unmerge ───── */
  function mergeCells() {
    if (!selectionRange) {
      toast('Chọn nhiều ô (Shift+Click) để gộp', 'warning');
      return;
    }
    pushUndo();
    const { r1, c1, r2, c2 } = selectionRange;

    // Clear merge on all cells in range
    for (let r = r1; r <= r2; r++) {
      for (let c = c1; c <= c2; c++) {
        const cd = initCell(r, c);
        delete cd.mergeParent;
        delete cd.mergeSpan;
      }
    }

    // Set the top-left cell as merge anchor
    const anchor = initCell(r1, c1);
    anchor.mergeSpan = { rows: r2 - r1 + 1, cols: c2 - c1 + 1 };

    // Mark all other cells as hidden
    for (let r = r1; r <= r2; r++) {
      for (let c = c1; c <= c2; c++) {
        if (r === r1 && c === c1) continue;
        const cd = initCell(r, c);
        cd.mergeParent = key(r1, c1);
      }
    }

    selectionRange = null;
    selectCellUI(r1, c1);
    toast('Đã gộp ô thành công', 'success');
  }

  function unmergeCells() {
    if (!selectedCell) return;
    const [r, c] = parseKey(selectedCell);
    const cell = getCell(r, c);
    if (!cell.mergeSpan) {
      toast('Ô này không phải ô gộp', 'warning');
      return;
    }
    pushUndo();
    const { rows: mr, cols: mc } = cell.mergeSpan;
    for (let ri = r; ri < r + mr; ri++) {
      for (let ci = c; ci < c + mc; ci++) {
        const cd = initCell(ri, ci);
        delete cd.mergeParent;
        delete cd.mergeSpan;
      }
    }
    render();
    toast('Đã tách ô', 'success');
  }

  /* ───── Insert / Delete rows & cols ───── */
  function insertRowAbove() {
    if (!selectedCell) return;
    pushUndo();
    const [r] = parseKey(selectedCell);
    shiftRowsDown(r);
    rows++;
    render();
  }
  function insertRowBelow() {
    pushUndo();
    const r = selectedCell ? parseKey(selectedCell)[0] : rows - 1;
    shiftRowsDown(r + 1);
    rows++;
    render();
  }
  function insertColLeft() {
    if (!selectedCell) return;
    pushUndo();
    const [, c] = parseKey(selectedCell);
    shiftColsRight(c);
    cols++;
    colWidths.splice(c, 0, 120);
    render();
  }
  function insertColRight() {
    pushUndo();
    const c = selectedCell ? parseKey(selectedCell)[1] : cols - 1;
    shiftColsRight(c + 1);
    cols++;
    colWidths.splice(c + 1, 0, 120);
    render();
  }
  function deleteRow() {
    if (rows <= 1) return;
    pushUndo();
    const [r] = parseKey(selectedCell);
    // remove this row's data
    for (let c = 0; c < cols; c++) delete cellData[key(r, c)];
    shiftRowsUp(r);
    rows--;
    if (r >= rows) selectCellUI(rows - 1, parseKey(selectedCell)[1]);
    else render();
  }
  function deleteCol() {
    if (cols <= 1) return;
    pushUndo();
    const [, c] = parseKey(selectedCell);
    for (let r = 0; r < rows; r++) delete cellData[key(r, c)];
    shiftColsLeft(c);
    cols--;
    colWidths.splice(c, 1);
    if (c >= cols) selectCellUI(parseKey(selectedCell)[0], cols - 1);
    else render();
  }

  function clearCell() {
    if (!selectedCell) return;
    pushUndo();
    const [r, c] = parseKey(selectedCell);
    delete cellData[key(r, c)];
    render();
    updatePlaceholdersList();
  }

  /* Shift helpers */
  function shiftRowsDown(fromRow) {
    for (let r = rows - 1; r >= fromRow; r--) {
      for (let c = 0; c < cols; c++) {
        const d = cellData[key(r, c)];
        if (d) { cellData[key(r + 1, c)] = d; delete cellData[key(r, c)]; }
      }
    }
  }
  function shiftRowsUp(fromRow) {
    for (let r = fromRow; r < rows - 1; r++) {
      for (let c = 0; c < cols; c++) {
        const d = cellData[key(r + 1, c)];
        if (d) { cellData[key(r, c)] = d; }
        delete cellData[key(r + 1, c)];
      }
    }
  }
  function shiftColsRight(fromCol) {
    for (let c = cols - 1; c >= fromCol; c--) {
      for (let r = 0; r < rows; r++) {
        const d = cellData[key(r, c)];
        if (d) { cellData[key(r, c + 1)] = d; delete cellData[key(r, c)]; }
      }
    }
  }
  function shiftColsLeft(fromCol) {
    for (let c = fromCol; c < cols - 1; c++) {
      for (let r = 0; r < rows; r++) {
        const d = cellData[key(r, c + 1)];
        if (d) { cellData[key(r, c)] = d; }
        delete cellData[key(r, c + 1)];
      }
    }
  }

  /* ───── Column Resize ───── */
  function startResize(e) {
    e.preventDefault();
    const col = parseInt(e.target.dataset.col);
    const startX = e.clientX;
    const startW = colWidths[col];
    resizing = { col, startX, startW };

    const onMove = ev => {
      const diff = ev.clientX - startX;
      colWidths[col] = Math.max(40, startW + diff);
      render();
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      resizing = null;
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  /* ───── Placeholder (data field) insertion ───── */
  function setCellAsPlaceholder() {
    if (!selectedCell) return;
    showPhModal();
  }

  function showPhModal() {
    const modal = $('modal-ss-placeholder');
    if (!modal) return;
    modal.style.display = 'flex';

    // populate sources
    const srcGrid = $('ss-ph-source-grid');
    const sources = (typeof DataSources !== 'undefined') ? DataSources.getAll() : [];

    if (sources.length === 0) {
      srcGrid.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:30px;color:var(--text-muted);">
          <p style="font-size:2rem;margin-bottom:10px;">📄</p>
          <p>Chưa có file nguồn nào.</p>
          <p style="font-size:0.78rem;margin-top:6px;">Upload file Excel ở panel <b>"Nguồn dữ liệu"</b> bên dưới bảng tính.</p>
        </div>
      `;
      return;
    }

    srcGrid.innerHTML = sources.map(src => `
      <div class="ph-source-card" onclick="Spreadsheet.selectPhSource('${src.id}')">
        <span class="ph-source-icon">📊</span>
        <span class="ph-source-label">${src.name || src.filename}</span>
        <span class="ph-source-count">${(src.fields || []).length} trường</span>
      </div>
    `).join('');

    // Show source step
    $('ss-ph-step-source').style.display = '';
    $('ss-ph-step-fields').style.display = 'none';
  }

  let _phSelectedSource = null;

  function selectPhSource(sourceId) {
    const sources = (typeof DataSources !== 'undefined') ? DataSources.getAll() : [];
    const src = sources.find(s => s.id === sourceId);
    if (!src) return;
    _phSelectedSource = src;

    $('ss-ph-step-source').style.display = 'none';
    $('ss-ph-step-fields').style.display = '';
    $('ss-ph-source-label').textContent = `📂 ${src.name || src.filename}`;

    renderPhFields(src.fields || []);
  }

  function renderPhFields(fields, filter) {
    const grid = $('ss-ph-fields-grid');
    const filtered = filter
      ? fields.filter(f => f.toLowerCase().includes(filter.toLowerCase()))
      : fields;

    grid.innerHTML = filtered.map(f => `
      <div class="ph-field-chip" onclick="Spreadsheet.insertPhField('${f}')">
        <span class="ph-field-icon">⧉</span>
        <span class="ph-field-name">${f}</span>
      </div>
    `).join('');
  }

  function filterPhFields(query) {
    if (!_phSelectedSource) return;
    renderPhFields(_phSelectedSource.fields || [], query);
  }

  function showPhSourceStep() {
    $('ss-ph-step-source').style.display = '';
    $('ss-ph-step-fields').style.display = 'none';
  }

  function insertPhField(fieldName) {
    if (!selectedCell) return;
    pushUndo();
    const [r, c] = parseKey(selectedCell);
    const cd = initCell(r, c);
    cd.type = 'placeholder';
    cd.placeholder = fieldName;
    cd.source = _phSelectedSource ? (_phSelectedSource.name || _phSelectedSource.filename) : '';
    cd.value = '';
    closePhModal();
    render();
    updatePlaceholdersList();
    toast(`Đã chèn trường «${fieldName}»`, 'success');
  }

  function insertPhCustom() {
    const input = $('ss-ph-custom-name');
    const name = (input.value || '').trim();
    if (!name) return;
    insertPhField(name);
    input.value = '';
  }

  function closePhModal() {
    const modal = $('modal-ss-placeholder');
    if (modal) modal.style.display = 'none';
  }

  /* ───── Placeholders list update ───── */
  function updatePlaceholdersList() {
    const list = $('placeholders-list');
    if (!list) return;

    const phs = [];
    for (const k in cellData) {
      const cd = cellData[k];
      if (cd.type === 'placeholder' && cd.placeholder) {
        const [r, c] = parseKey(k);
        phs.push({ name: cd.placeholder, source: cd.source, ref: cellRef(r, c), key: k });
      }
    }

    if (phs.length === 0) {
      list.innerHTML = '<p class="text-muted">Chưa có trường dữ liệu nào</p>';
      return;
    }

    list.innerHTML = phs.map(p => `
      <div class="ph-item" style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:var(--accent-light);border-radius:8px;margin-bottom:6px;">
        <span style="font-weight:700;color:var(--accent);">⧉</span>
        <span style="flex:1;font-size:0.82rem;"><b>{{${p.name}}}</b> <small style="color:var(--text-muted);">[${p.ref}]</small></span>
        ${p.source ? `<span class="ss-source-badge">${p.source}</span>` : ''}
        <button onclick="Spreadsheet.removePlaceholder('${p.key}')" style="background:none;border:none;cursor:pointer;color:var(--danger);font-size:1rem;">✕</button>
      </div>
    `).join('');
  }

  function removePlaceholder(k) {
    pushUndo();
    if (cellData[k]) {
      cellData[k].type = undefined;
      cellData[k].placeholder = undefined;
      cellData[k].source = undefined;
    }
    render();
    updatePlaceholdersList();
  }

  /* ───── Undo / Redo ───── */
  function pushUndo() {
    undoStack.push(JSON.stringify(cellData));
    if (undoStack.length > 50) undoStack.shift();
    redoStack = [];
  }
  function undo() {
    if (!undoStack.length) return;
    redoStack.push(JSON.stringify(cellData));
    cellData = JSON.parse(undoStack.pop());
    render();
    updatePlaceholdersList();
  }
  function redo() {
    if (!redoStack.length) return;
    undoStack.push(JSON.stringify(cellData));
    cellData = JSON.parse(redoStack.pop());
    render();
    updatePlaceholdersList();
  }

  /* ───── Keyboard navigation ───── */
  function setupKeyboard() {
    const container = $('spreadsheet-container');
    if (!container) return;

    container.addEventListener('keydown', e => {
      if (!selectedCell) return;
      const [r, c] = parseKey(selectedCell);
      const editing = !!container.querySelector('.ss-cell.editing');
      if (editing) return; // let inline editing handle it

      if (e.key === 'ArrowUp' && r > 0) { e.preventDefault(); selectCellUI(r - 1, c); }
      if (e.key === 'ArrowDown' && r < rows - 1) { e.preventDefault(); selectCellUI(r + 1, c); }
      if (e.key === 'ArrowLeft' && c > 0) { e.preventDefault(); selectCellUI(r, c - 1); }
      if (e.key === 'ArrowRight' && c < cols - 1) { e.preventDefault(); selectCellUI(r, c + 1); }
      if (e.key === 'Enter') { e.preventDefault(); onCellDblClick(r, c); }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        clearCell();
      }
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'b' || e.key === 'B') { e.preventDefault(); toggleBold(); }
        if (e.key === 'i' || e.key === 'I') { e.preventDefault(); toggleItalic(); }
        if (e.key === 'z' || e.key === 'Z') { e.preventDefault(); undo(); }
        if (e.key === 'y' || e.key === 'Y') { e.preventDefault(); redo(); }
      }
    });
  }

  /* ───── Export (for save) ───── */
  function getState() {
    return { rows, cols, colWidths, cellData: JSON.parse(JSON.stringify(cellData)) };
  }

  function loadState(state) {
    if (!state) return;
    rows = state.rows || 10;
    cols = state.cols || 8;
    colWidths = state.colWidths || Array.from({ length: cols }, () => 120);
    cellData = state.cellData || {};
    selectedCell = key(0, 0);
    selectionRange = null;
    undoStack = [];
    redoStack = [];
    render();
    selectCellUI(0, 0);
    updatePlaceholdersList();
  }

  /* ───── Generate HTML table from grid (for PDF) ───── */
  function toHTML() {
    let html = '<table style="border-collapse:collapse;width:100%;font-family:Inter,sans-serif;">';
    for (let r = 0; r < rows; r++) {
      html += '<tr>';
      for (let c = 0; c < cols; c++) {
        const cell = getCell(r, c);
        if (cell.mergeParent) continue;

        let colspan = 1, rowspan = 1;
        if (cell.mergeSpan) {
          colspan = cell.mergeSpan.cols || 1;
          rowspan = cell.mergeSpan.rows || 1;
        }

        const styles = ['border:1px solid #ccc', 'padding:6px 10px'];
        if (cell.bold) styles.push('font-weight:700');
        if (cell.italic) styles.push('font-style:italic');
        if (cell.align) styles.push(`text-align:${cell.align}`);
        if (cell.fontSize) styles.push(`font-size:${cell.fontSize}px`);
        if (cell.bgColor && cell.bgColor !== '#ffffff') styles.push(`background:${cell.bgColor}`);
        if (cell.textColor && cell.textColor !== '#1a1a2e') styles.push(`color:${cell.textColor}`);
        if (cell.type === 'header') styles.push('background:#e8eaed;font-weight:700');

        let content = '';
        if (cell.type === 'placeholder' && cell.placeholder) {
          content = `{{${cell.placeholder}}}`;
        } else {
          content = cell.value || '';
        }

        html += `<td${colspan > 1 ? ` colspan="${colspan}"` : ''}${rowspan > 1 ? ` rowspan="${rowspan}"` : ''} style="${styles.join(';')}">${content}</td>`;
      }
      html += '</tr>';
    }
    html += '</table>';
    return html;
  }

  /* ───── Get placeholders from grid ───── */
  function getPlaceholders() {
    const phs = [];
    for (const k in cellData) {
      const cd = cellData[k];
      if (cd.type === 'placeholder' && cd.placeholder) {
        phs.push({ name: cd.placeholder, source: cd.source, cellKey: k });
      }
    }
    return phs;
  }

  /* ───── Toast helper ───── */
  function toast(msg, type) {
    if (typeof App !== 'undefined' && App.toast) {
      App.toast(msg, type);
    }
  }

  /* ───── Init on page load ───── */
  document.addEventListener('DOMContentLoaded', () => {
    setupKeyboard();
  });

  /* ───── Public API ───── */
  return {
    init, render, getState, loadState, toHTML, getPlaceholders,
    onCellClick, onCellDblClick, onContextMenu,
    setCellValue, toggleBold, toggleItalic, setAlign, setFontSize,
    setBgColor, setTextColor,
    mergeCells, unmergeCells,
    insertRowAbove, insertRowBelow, insertColLeft, insertColRight,
    deleteRow, deleteCol, clearCell,
    setCellAsPlaceholder, showPhModal, closePhModal,
    selectPhSource, showPhSourceStep, insertPhField, insertPhCustom, filterPhFields,
    removePlaceholder,
    undo, redo,
    updatePlaceholdersList
  };
})();
