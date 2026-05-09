/* ============================================================
   md-import.js — Bulk Import via XLSX
   Hỗ trợ:
   1. Cấu hình (entities/records): download template + import
   2. Lãi suất (rate center):      download template + import
   ============================================================ */

const MdImport = {

  // ── PHẦN 1: CẤU HÌNH — Import records cho entity ────────────

  /**
   * Download template XLSX cho 1 entity với headers là tên các cột
   * entityId: id của entity đang chọn
   */
  downloadEntityTemplate(entityId) {
    const entity = MasterDataState.entities.find(e => e.id === entityId);
    if (!entity) { App.toast('Không tìm thấy entity', 'error'); return; }

    const wb = XLSX.utils.book_new();
    // Row 1: field names (headers)
    const headers = entity.fields.map(f => f.name);
    // Row 2: sample row (empty, just show types as hint)
    const sample  = entity.fields.map(f => `[${f.type}]`);
    const ws = XLSX.utils.aoa_to_sheet([headers, sample]);

    // Style header row (column widths)
    ws['!cols'] = headers.map(() => ({ wch: 22 }));

    XLSX.utils.book_append_sheet(wb, ws, entity.name.substring(0, 31));

    const fileName = `template_${entity.name.replace(/[^a-zA-Z0-9_\u00C0-\u1EF9]/g,'_')}.xlsx`;
    XLSX.writeFile(wb, fileName);
    App.toast(`Đã tải template: ${fileName}`, 'success');
  },

  /**
   * Mở dialog chọn file XLSX để import records vào entity
   */
  triggerImportEntity(entityId) {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.xlsx,.xls,.csv';
    inp.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      this.importEntityFromFile(entityId, file);
    };
    inp.click();
  },

  async importEntityFromFile(entityId, file) {
    const entity = MasterDataState.entities.find(e => e.id === entityId);
    if (!entity) return;

    try {
      App.toast('Đang đọc file...', 'info');
      const ab = await file.arrayBuffer();
      const wb = XLSX.read(ab, { type: 'array', cellDates: true });
      const wsName = wb.SheetNames[0];
      const ws = wb.Sheets[wsName];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

      if (!rows.length) { App.toast('File rỗng', 'warning'); return; }

      // Row 0 = headers
      const fileHeaders = rows[0].map(h => String(h).trim());
      const dataRows    = rows.slice(1).filter(r => r.some(c => String(c).trim()));

      if (!dataRows.length) { App.toast('Không có dữ liệu (chỉ có header)', 'warning'); return; }

      // Map file columns → entity field IDs by name match
      const fieldMap = {}; // colIdx → fieldId
      fileHeaders.forEach((h, ci) => {
        const field = entity.fields.find(f =>
          f.name.toLowerCase().trim() === h.toLowerCase()
        );
        if (field) fieldMap[ci] = field.id;
      });

      const matchedCount = Object.keys(fieldMap).length;
      if (matchedCount === 0) {
        App.toast(`Không khớp cột nào. Template cần có header: ${entity.fields.map(f=>f.name).join(', ')}`, 'error');
        return;
      }

      // Build record objects
      const newRecords = dataRows.map(row => {
        const rec = {};
        Object.entries(fieldMap).forEach(([ci, fid]) => {
          const v = row[Number(ci)];
          rec[fid] = v instanceof Date
            ? v.toISOString().split('T')[0]
            : String(v ?? '').trim();
        });
        return rec;
      });

      // Confirm before append
      const existing = (MasterDataState.records[entityId] || []).length;
      const msg = `Tìm thấy ${newRecords.length} bản ghi từ file.\n` +
                  `${matchedCount}/${fileHeaders.length} cột khớp.\n` +
                  (existing > 0 ? `Hiện có ${existing} bản ghi. Chọn:\n• OK = Thêm vào\n• Cancel = Hủy` : 'Nhấn OK để import.');

      if (!confirm(msg)) return;

      if (!MasterDataState.records[entityId]) MasterDataState.records[entityId] = [];
      MasterDataState.records[entityId].push(...newRecords);
      MasterData.saveState();

      // Refresh UI
      MasterData.cfgRenderData(entityId);
      MasterData.cfgRenderEntityList();

      App.toast(`✅ Đã import ${newRecords.length} bản ghi vào "${entity.name}"`, 'success');

    } catch(err) {
      console.error('Import entity error:', err);
      App.toast('Lỗi đọc file: ' + err.message, 'error');
    }
  },

  // ── PHẦN 2: LÃI SUẤT — Download & Import Rate Center ────────

  /**
   * Download template XLSX cho Rate Center với 6 sheets
   */
  downloadRateCenterTemplate() {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Projects
    const projHeaders = ['Tên dự án', 'Màu sắc (hex)', 'Icon emoji'];
    const projSample  = ['Ecopark Grand', '#6366f1', '🏢'];
    const wsProj = XLSX.utils.aoa_to_sheet([projHeaders, projSample]);
    wsProj['!cols'] = [{ wch:30 }, { wch:14 }, { wch:10 }];
    XLSX.utils.book_append_sheet(wb, wsProj, 'DuAn');

    // Sheet 2: Policies
    const polHeaders = [
      'Tên dự án', 'Tên chính sách', 'Mã dự án', 'Mã chính sách',
      'Áp dụng từ', 'Áp dụng đến', 'Điều kiện đi kèm',
      'Ghi chú chính sách', 'Thời gian vay tối thiểu (tháng)',
      'LTV tối đa (%)', 'Thời gian vay tối đa (năm)'
    ];
    const polSample = [
      'Ecopark Grand', 'CS2024-HTLS', 'ECG', 'CS001',
      '2024-01-01', '2024-12-31', 'Khách hàng cá nhân',
      '', '6', '70', '25'
    ];
    const wsPol = XLSX.utils.aoa_to_sheet([polHeaders, polSample]);
    wsPol['!cols'] = polHeaders.map(() => ({ wch: 22 }));
    XLSX.utils.book_append_sheet(wb, wsPol, 'ChinhSach');

    // Sheet 3: Rate Buckets
    const bucketHeaders = [
      'Tên dự án', 'Tên chính sách',
      'Bucket (≤ tháng)', 'Lãi suất cố định (%/năm)',
      'Biên độ thả nổi (%)', 'Ghi chú'
    ];
    const bucketSamples = [
      ['Ecopark Grand', 'CS2024-HTLS', 6,  6.5, 3.5, ''],
      ['Ecopark Grand', 'CS2024-HTLS', 12, 7.0, 3.5, ''],
      ['Ecopark Grand', 'CS2024-HTLS', 18, 7.5, 3.5, ''],
      ['Ecopark Grand', 'CS2024-HTLS', 24, 8.0, 3.5, ''],
      ['Ecopark Grand', 'CS2024-HTLS', 30, 8.5, 3.5, ''],
      ['Ecopark Grand', 'CS2024-HTLS', 36, 9.0, 3.5, ''],
    ];
    const wsBucket = XLSX.utils.aoa_to_sheet([bucketHeaders, ...bucketSamples]);
    wsBucket['!cols'] = bucketHeaders.map(() => ({ wch: 22 }));
    XLSX.utils.book_append_sheet(wb, wsBucket, 'BucketLaiSuat');

    // Sheet 4: Fee Rules
    const feeHeaders = [
      'Tên dự án', 'Tên chính sách',
      'Giai đoạn', 'Phí TNTH (%/năm)', 'Ghi chú'
    ];
    const feeSamples = [
      ['Ecopark Grand', 'CS2024-HTLS', 'Trong HTLS',           0.3, ''],
      ['Ecopark Grand', 'CS2024-HTLS', 'Sau HTLS đến T60',     0.5, ''],
      ['Ecopark Grand', 'CS2024-HTLS', 'Từ T61 trở đi',        0.5, ''],
    ];
    const wsFee = XLSX.utils.aoa_to_sheet([feeHeaders, ...feeSamples]);
    wsFee['!cols'] = feeHeaders.map(() => ({ wch: 24 }));
    XLSX.utils.book_append_sheet(wb, wsFee, 'PhiTNTH');

    // Sheet 5: Grace Rules
    const graceHeaders = [
      'Tên dự án', 'Tên chính sách',
      'Ân hạn cơ bản (tháng)', 'Có HTLS từ CĐT (TRUE/FALSE)',
      'Có ân hạn bổ sung (TRUE/FALSE)', 'Áp dụng theo nhóm (TRUE/FALSE)',
      'Max nhóm A (tháng)', 'Max nhóm B (tháng)', 'Max nhóm default (tháng)', 'Ghi chú'
    ];
    const graceSample = [
      'Ecopark Grand', 'CS2024-HTLS',
      0, 'TRUE', 'FALSE', 'FALSE', 36, 24, 0, ''
    ];
    const wsGrace = XLSX.utils.aoa_to_sheet([graceHeaders, graceSample]);
    wsGrace['!cols'] = graceHeaders.map(() => ({ wch: 24 }));
    XLSX.utils.book_append_sheet(wb, wsGrace, 'AnHanGoc');

    // Sheet 6: Project Exceptions
    const excHeaders = [
      'Tên dự án (trong RateCenter)', 'Tên chính sách',
      'Tên dự án ngoại lệ', 'Ân hạn tối đa (tháng)', 'Ghi chú'
    ];
    const excSamples = [
      ['Ecopark Grand', 'CS2024-HTLS', 'Onsen Ecopark',                      36, 'Dự án cao cấp'],
      ['Ecopark Grand', 'CS2024-HTLS', 'Eco Central Park Vinh - Marina',     24, ''],
      ['Ecopark Grand', 'CS2024-HTLS', 'Six Senses',                         36, 'Premium'],
    ];
    const wsExc = XLSX.utils.aoa_to_sheet([excHeaders, ...excSamples]);
    wsExc['!cols'] = excHeaders.map(() => ({ wch: 30 }));
    XLSX.utils.book_append_sheet(wb, wsExc, 'NgoaiLeDuAn');

    XLSX.writeFile(wb, 'template_rate_center.xlsx');
    App.toast('Đã tải template_rate_center.xlsx (6 sheets)', 'success');
  },

  /**
   * Trigger import Rate Center từ XLSX
   */
  triggerImportRateCenter() {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.xlsx,.xls';
    inp.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      this.importRateCenterFromFile(file);
    };
    inp.click();
  },

  async importRateCenterFromFile(file) {
    try {
      App.toast('Đang đọc file Rate Center...', 'info');
      const ab = await file.arrayBuffer();
      const wb = XLSX.read(ab, { type: 'array', cellDates: true });

      const sheetMap = {
        projects:   ['DuAn',          'Dự Án',       'du_an'],
        policies:   ['ChinhSach',     'Chính Sách',  'chinh_sach'],
        buckets:    ['BucketLaiSuat', 'Bucket',      'bucket'],
        fees:       ['PhiTNTH',       'Phí TNTH',    'phi_tnth'],
        grace:      ['AnHanGoc',      'Ân Hạn',      'an_han'],
        exceptions: ['NgoaiLeDuAn',   'Ngoại Lệ',    'ngoai_le'],
      };

      const findSheet = (keys) => {
        for (const k of keys) {
          const found = wb.SheetNames.find(n => n.toLowerCase().replace(/\s/g,'') === k.toLowerCase().replace(/\s/g,''));
          if (found) return wb.Sheets[found];
        }
        return null;
      };

      const readSheet = (ws) => {
        if (!ws) return [];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        if (rows.length < 2) return [];
        const headers = rows[0].map(h => String(h).trim());
        return rows.slice(1)
          .filter(r => r.some(c => String(c).trim()))
          .map(r => {
            const obj = {};
            headers.forEach((h, i) => { obj[h] = r[i] instanceof Date ? r[i].toISOString().split('T')[0] : String(r[i] ?? '').trim(); });
            return obj;
          });
      };

      const projRows  = readSheet(findSheet(sheetMap.projects));
      const polRows   = readSheet(findSheet(sheetMap.policies));
      const buckRows  = readSheet(findSheet(sheetMap.buckets));
      const feeRows   = readSheet(findSheet(sheetMap.fees));
      const graceRows = readSheet(findSheet(sheetMap.grace));
      const excRows   = readSheet(findSheet(sheetMap.exceptions));

      if (!projRows.length && !polRows.length) {
        App.toast('Không đọc được dữ liệu. Hãy dùng đúng template.', 'error');
        return;
      }

      const total = projRows.length + polRows.length + buckRows.length + feeRows.length + graceRows.length + excRows.length;
      if (!confirm(`Tìm thấy:\n• ${projRows.length} dự án\n• ${polRows.length} chính sách\n• ${buckRows.length} bucket lãi suất\n• ${feeRows.length} phí TNTH\n• ${graceRows.length} rule ân hạn\n• ${excRows.length} ngoại lệ dự án\n\nNhấn OK để import (sẽ thêm vào dữ liệu hiện có).`)) return;

      // ── Merge into RateCenterState ──
      const projects = RateCenterState.projects || [];

      const getOrCreateProject = (name, color, icon) => {
        let p = projects.find(x => x.name.toLowerCase().trim() === String(name).toLowerCase().trim());
        if (!p) {
          const colors = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#06b6d4','#3b82f6','#ef4444'];
          const icons  = ['🏢','🏗️','🏠','🏦','🏙️','🌆','🏬','🏭'];
          p = {
            id: 'rc_' + Math.random().toString(36).slice(2,9),
            name: String(name).trim(),
            color: color && color.startsWith('#') ? color : colors[projects.length % colors.length],
            icon: icon || icons[projects.length % icons.length],
            packages: [],
          };
          projects.push(p);
        }
        return p;
      };

      const getOrCreatePolicy = (proj, polName) => {
        let pkg = (proj.packages || []).find(k => k.name.toLowerCase().trim() === String(polName).toLowerCase().trim());
        if (!pkg) {
          const colors = ['#6366f1','#8b5cf6','#10b981','#f59e0b','#ec4899','#06b6d4'];
          pkg = {
            id: 'rc_' + Math.random().toString(36).slice(2,9),
            name: String(polName).trim(),
            color: colors[(proj.packages||[]).length % colors.length],
            fields: (typeof RC_DEFAULT_FIELDS !== 'undefined' ? RC_DEFAULT_FIELDS : []).map(f => ({...f, value:''})),
            rateBuckets: (typeof RC_DEFAULT_RATE_BUCKETS !== 'undefined' ? RC_DEFAULT_RATE_BUCKETS : []).map(b => ({...b, id:'rc_'+Math.random().toString(36).slice(2,9)})),
            feeRules: (typeof RC_DEFAULT_FEE_RULES !== 'undefined' ? RC_DEFAULT_FEE_RULES : []).map(r => ({...r, id:'rc_'+Math.random().toString(36).slice(2,9)})),
            graceRules: typeof RC_DEFAULT_GRACE_RULES !== 'undefined' ? {...RC_DEFAULT_GRACE_RULES} : {},
            projectExceptions: [],
            eligibilityConditions: [],
            tiers: [], conditions: [], customFields: [],
          };
          if (!proj.packages) proj.packages = [];
          proj.packages.push(pkg);
        }
        return pkg;
      };

      const BUCKET_MAX_MAP = { '6':6,'12':12,'18':18,'24':24,'30':30,'36':36 };
      const FEE_PHASE_MAP = {
        'trong htls':'inHTLS','inhtls':'inHTLS',
        'sau htls đến t60':'afterHTLS_to60','afterhtls_to60':'afterHTLS_to60',
        'từ t61 trở đi':'from61','from61':'from61',
      };

      // Step 1: Projects
      projRows.forEach(r => {
        const name = r['Tên dự án'] || r['Ten du an'] || r[Object.keys(r)[0]];
        if (!name || !String(name).trim()) return;
        getOrCreateProject(String(name).trim(), r['Màu sắc (hex)'] || r['Mau sac'], r['Icon emoji'] || r['Icon']);
      });

      // Step 2: Policies + basic fields
      polRows.forEach(r => {
        const projName = r['Tên dự án'] || r[Object.keys(r)[0]];
        const polName  = r['Tên chính sách'] || r[Object.keys(r)[1]];
        if (!projName || !polName) return;
        const proj = getOrCreateProject(projName);
        const pkg  = getOrCreatePolicy(proj, polName);
        // Assign fields
        const setField = (label, val) => {
          const f = (pkg.fields||[]).find(x => x.label === label);
          if (f && val !== undefined && String(val).trim()) f.value = String(val).trim();
        };
        setField('Mã dự án', r['Mã dự án']);
        setField('Mã chính sách', r['Mã chính sách']);
        setField('Chính sách bán hàng', polName);
        setField('Thời gian áp dụng từ', r['Áp dụng từ']);
        setField('Thời gian áp dụng đến', r['Áp dụng đến']);
        setField('Điều kiện đi kèm', r['Điều kiện đi kèm']);
        setField('Ghi chú chính sách', r['Ghi chú chính sách']);
        setField('Thời gian vay tối thiểu', r['Thời gian vay tối thiểu (tháng)']);
        setField('LTV tối đa', r['LTV tối đa (%)']);
        setField('Thời gian vay tối đa', r['Thời gian vay tối đa (năm)']);
      });

      // Step 3: Rate buckets
      buckRows.forEach(r => {
        const projName = r['Tên dự án'] || r[Object.keys(r)[0]];
        const polName  = r['Tên chính sách'] || r[Object.keys(r)[1]];
        const maxM = Number(r['Bucket (≤ tháng)'] || r['Bucket'] || 0);
        if (!projName || !polName || !maxM) return;
        const proj = getOrCreateProject(projName);
        const pkg  = getOrCreatePolicy(proj, polName);
        // Find matching bucket
        let bucket = (pkg.rateBuckets||[]).find(b => Number(b.maxMonths) === maxM);
        if (!bucket) {
          bucket = { id:'rc_'+Math.random().toString(36).slice(2,9), maxMonths:maxM, label:`≤ ${maxM} tháng`, rate:'', margin:'', note:'' };
          if (!pkg.rateBuckets) pkg.rateBuckets = [];
          pkg.rateBuckets.push(bucket);
          pkg.rateBuckets.sort((a,b) => a.maxMonths - b.maxMonths);
        }
        const rate   = r['Lãi suất cố định (%/năm)'] || r['Lãi suất cố định'] || '';
        const margin = r['Biên độ thả nổi (%)'] || r['Biên độ'] || '';
        const note   = r['Ghi chú'] || '';
        if (rate   !== '') bucket.rate   = String(rate);
        if (margin !== '') bucket.margin = String(margin);
        if (note   !== '') bucket.note   = String(note);
      });

      // Step 4: Fee rules
      feeRows.forEach(r => {
        const projName = r['Tên dự án'] || r[Object.keys(r)[0]];
        const polName  = r['Tên chính sách'] || r[Object.keys(r)[1]];
        const phaseRaw = (r['Giai đoạn'] || '').toLowerCase().trim().replace(/\s+/g,' ');
        const phase    = FEE_PHASE_MAP[phaseRaw] || phaseRaw;
        const fee      = r['Phí TNTH (%/năm)'] || r['Phí TNTH'] || '';
        if (!projName || !polName) return;
        const proj = getOrCreateProject(projName);
        const pkg  = getOrCreatePolicy(proj, polName);
        let rule = (pkg.feeRules||[]).find(x => x.phase === phase);
        if (!rule) {
          rule = { id:'rc_'+Math.random().toString(36).slice(2,9), phase, fee:'', label: r['Giai đoạn'] || phase };
          if (!pkg.feeRules) pkg.feeRules = [];
          pkg.feeRules.push(rule);
        }
        if (fee !== '') rule.fee = String(fee);
      });

      // Step 5: Grace rules
      graceRows.forEach(r => {
        const projName = r['Tên dự án (trong RateCenter)'] || r['Tên dự án'] || r[Object.keys(r)[0]];
        const polName  = r['Tên chính sách'] || r[Object.keys(r)[1]];
        if (!projName || !polName) return;
        const proj = getOrCreateProject(projName);
        const pkg  = getOrCreatePolicy(proj, polName);
        if (!pkg.graceRules) pkg.graceRules = {};
        const toBool = v => String(v).toLowerCase() === 'true' || v === 1 || v === true;
        if (r['Ân hạn cơ bản (tháng)'] !== '') pkg.graceRules.baseMonths = Number(r['Ân hạn cơ bản (tháng)']) || 0;
        if (r['Có HTLS từ CĐT (TRUE/FALSE)'] !== '') pkg.graceRules.withHTLS = toBool(r['Có HTLS từ CĐT (TRUE/FALSE)']);
        if (r['Có ân hạn bổ sung (TRUE/FALSE)'] !== '') pkg.graceRules.withSupplement = toBool(r['Có ân hạn bổ sung (TRUE/FALSE)']);
        if (r['Áp dụng theo nhóm (TRUE/FALSE)'] !== '') pkg.graceRules.useMaxByGroup = toBool(r['Áp dụng theo nhóm (TRUE/FALSE)']);
        if (!pkg.graceRules.maxByGroup) pkg.graceRules.maxByGroup = {};
        if (r['Max nhóm A (tháng)'] !== '') pkg.graceRules.maxByGroup.A = Number(r['Max nhóm A (tháng)']);
        if (r['Max nhóm B (tháng)'] !== '') pkg.graceRules.maxByGroup.B = Number(r['Max nhóm B (tháng)']);
        if (r['Max nhóm default (tháng)'] !== '') pkg.graceRules.maxByGroup.default = Number(r['Max nhóm default (tháng)']);
        if (r['Ghi chú'] !== '') pkg.graceRules.note = r['Ghi chú'];
      });

      // Step 6: Project exceptions
      excRows.forEach(r => {
        const projName = r['Tên dự án (trong RateCenter)'] || r['Tên dự án'] || r[Object.keys(r)[0]];
        const polName  = r['Tên chính sách'] || r[Object.keys(r)[1]];
        const excName  = r['Tên dự án ngoại lệ'] || r[Object.keys(r)[2]];
        const maxGrace = r['Ân hạn tối đa (tháng)'] || r[Object.keys(r)[3]];
        if (!projName || !polName || !excName) return;
        const proj = getOrCreateProject(projName);
        const pkg  = getOrCreatePolicy(proj, polName);
        if (!pkg.projectExceptions) pkg.projectExceptions = [];
        const existing = pkg.projectExceptions.find(x => x.projectName === excName);
        if (!existing) {
          pkg.projectExceptions.push({
            id: 'rc_'+Math.random().toString(36).slice(2,9),
            projectName: String(excName).trim(),
            maxGrace: String(maxGrace).trim(),
            note: r['Ghi chú'] || '',
          });
        } else {
          if (maxGrace !== '') existing.maxGrace = String(maxGrace);
          if (r['Ghi chú'] !== '') existing.note = r['Ghi chú'];
        }
      });

      // Save
      RateCenterState.projects = projects;
      RateCenter.save();
      RateCenter.render();

      App.toast(`✅ Import xong! ${projects.length} dự án, ${projects.reduce((s,p)=>s+(p.packages||[]).length,0)} chính sách`, 'success');

    } catch(err) {
      console.error('Import rate center error:', err);
      App.toast('Lỗi import: ' + err.message, 'error');
    }
  },

};
