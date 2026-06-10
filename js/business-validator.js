/* ============================================
   Business Validator - BRD mục 8
   Cảnh báo/chặn nghiệp vụ theo 8 nhóm:
   1. Số tiền vay   2. Giá trị tài sản   3. LTV/GTĐB max
   4. Mã căn        5. Dự án             6. HĐMB
   7. Ngày tháng    8. Mở rộng (registry pattern)
   Mỗi rule: { id, group, severity: 'block'|'warn', title, check(ctx) }
   check trả về: { status: 'pass'|'warn'|'block'|'skip', message }
   ============================================ */

const BusinessValidator = {
  STORAGE_KEY: 'biz_validator_v1',
  // Cấu hình người dùng: hạn mức override, dư nợ bên bán, danh sách đối chiếu
  _config: {
    hanMucOverride: '', duNoBenBan: '', kunnChiHo: '',
    eligibleUnits: '', f1Units: '', tcbProjects: '',
    threshold70: 70,
  },
  _rules: [],
  _lastResults: null,

  /* ── helpers ── */
  _esc(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  },
  _norm(str) {
    return (str || '')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[đĐ]/g, 'd')
      .toLowerCase().trim().replace(/\s+/g, ' ');
  },
  // Parse số kiểu VN/quốc tế: '5,000,000', '5.000.000', '5000000.5'
  _num(v) {
    if (v === null || v === undefined || v === '') return NaN;
    if (typeof v === 'number') return v;
    let s = String(v).replace(/[\s,]/g, '');
    const dots = (s.match(/\./g) || []).length;
    if (dots > 1) s = s.replace(/\./g, '');                 // 5.000.000 → thousands
    else if (dots === 1 && /\.\d{3}$/.test(s) && s.length > 5) s = s.replace('.', ''); // 5000.000
    const n = parseFloat(s);
    return isNaN(n) ? NaN : n;
  },
  _fmt(n) {
    return isNaN(n) ? '?' : new Intl.NumberFormat('vi-VN').format(n);
  },
  // Parse ngày dd/mm/yyyy | yyyy-mm-dd
  _date(v) {
    if (!v) return null;
    const s = String(v).trim();
    let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m) { const d = new Date(+m[3], +m[2] - 1, +m[1]); return isNaN(d) ? null : d; }
    m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) { const d = new Date(+m[1], +m[2] - 1, +m[3]); return isNaN(d) ? null : d; }
    return null;
  },
  _parseList(text) {
    return new Set(String(text || '').split(/[\n,;]+/).map(x => this._norm(x)).filter(Boolean));
  },
  _toast(msg, type) {
    if (typeof App !== 'undefined' && App.toast) App.toast(msg, type || 'info');
  },

  loadState() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) this._config = Object.assign({}, this._config, JSON.parse(raw));
    } catch (e) { /* dùng mặc định */ }
  },
  saveState() {
    try { localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this._config)); } catch (e) { /* quota */ }
  },

  /* ── context: gom dữ liệu từ mọi nguồn ── */
  buildContext() {
    const ex = (typeof AppState !== 'undefined' && AppState.extractedData) || {};
    const tv = ex.thong_tin_vay || {};
    const ts = ex.tai_san || {};
    const ctt = ex.tai_san_ctt || {};
    const cts = ex.chu_tai_san || {};
    const hm = ex.han_muc || {};
    const cfg = this._config;

    // Tổng số tiền các KUNN (KU1-5: 'Số tiền giải ngân (2)..(6)')
    const kunnAmounts = [];
    for (let i = 2; i <= 6; i++) {
      const n = this._num(tv[`Số tiền giải ngân (${i})`]);
      if (!isNaN(n) && n > 0) kunnAmounts.push(n);
    }

    return {
      // Nhóm 1
      soTienVay: this._num(tv['Tổng số tiền vay']),
      soTienPheDuyet: this._num(cfg.hanMucOverride) || this._num(tv['Số tiền phê duyệt']) || this._num(hm['Giá trị được phê duyệt']),
      soTienGnLan1: this._num(tv['Số tiền giải ngân']),
      kunnAmounts,
      kunnChiHo: this._num(cfg.kunnChiHo),
      duNoBenBan: this._num(cfg.duNoBenBan),
      yeuCauBoiSo5: this._norm(ctt['Có yêu cầu bội số của 5%']) === 'y',
      giaNET: this._num(ctt['Giá NET']),
      giaVAT: this._num(ctt['Giá VAT']),
      // Nhóm 2
      giaTriTaiSan: this._num(ts['Giá trị tài sản']),
      giaTriTaiSanPheDuyet: this._num(tv['Tổng giá trị tài sản']),
      // Nhóm 3
      ltvMax: this._num(ts['LTV Max']),
      gtdbMax: this._num(ts['Giá trị bảo đảm tối đa']) || this._num(tv['Tổng giá trị bảo đảm tối đa']),
      trangThaiTaiSan: ts['Trạng thái tài sản'] || ctt['Trạng thái tài sản'] || '',
      threshold70: this._num(cfg.threshold70) || 70,
      // Nhóm 4
      maCan: tv['Mã căn vay vốn'] || ts['Mã căn'] || '',
      eligibleUnits: this._parseList(cfg.eligibleUnits),
      f1Units: this._parseList(cfg.f1Units),
      // Nhóm 5
      maDuAn: tv['Mã dự án vay vốn'] || ts['Mã dự án'] || '',
      tcbProjects: this._parseList(cfg.tcbProjects),
      // Nhóm 6
      nguoiKyHDMB: ctt['Tên người ký trên HĐMB'] || '',
      nguoiKyHDMB2: ctt['Tên người ký trên HĐMB 2'] || '',
      chuTaiSan: ts['Chủ tài sản 1'] || cts['Chủ tài sản'] || '',
      khachHangLaChuTS: this._norm(ts['Khách hàng = Chủ tài sản'] || cts['Khách hàng = Chủ tài sản']),
      tenKhachHang: tv['Họ tên bên vay 1'] || '',
      // Nhóm 7
      dateFields: {
        'Ngày phê duyệt': tv['Ngày phê duyệt'],
        'Ngày cấp bên vay 1': tv['Ngày cấp bên vay 1'],
        'Ngày cấp bên vay 2': tv['Ngày cấp bên vay 2'],
        'Ngày ký HĐMB': ctt['Ngày ký HĐMB'],
        'Ngày định giá': ts['Ngày định giá'],
        'Ngày ký HĐTC': ts['Ngày ký HĐTC'],
      },
      ngayDuKienGN: tv['Ngày dự kiến GN']
        || (typeof UC02Module !== 'undefined' ? UC02Module._state.engine.gnDate : ''),
    };
  },

  /* ── BRD mục 8 nhóm "Khác": đăng ký rule mở rộng ── */
  register(rule) {
    if (!rule || !rule.id || typeof rule.check !== 'function') return false;
    this._rules = this._rules.filter(r => r.id !== rule.id);
    this._rules.push(rule);
    return true;
  },

  _initRules() {
    if (this._rules.length) return;
    const V = this;
    const pass = (msg) => ({ status: 'pass', message: msg });
    const skip = (msg) => ({ status: 'skip', message: msg });

    /* ═══ NHÓM 1: SỐ TIỀN VAY ═══ */
    this.register({
      id: 'g1_boi_so_5', group: 1, severity: 'warn',
      title: 'Tỷ lệ vay theo CSBH phải là bội số của 5',
      check(ctx) {
        const giaTri = (ctx.giaNET || 0) + (ctx.giaVAT || 0);
        if (isNaN(ctx.soTienVay) || !giaTri) return skip('Thiếu số tiền vay hoặc giá NET/VAT trên HĐMB');
        if (!ctx.yeuCauBoiSo5) return pass('Dự án không yêu cầu bội số của 5% (theo Extract CTT)');
        const ratio = ctx.soTienVay / giaTri * 100;
        const remainder = Math.abs(ratio % 5);
        if (remainder < 0.01 || remainder > 4.99) return pass(`Tỷ lệ vay ${ratio.toFixed(2)}% là bội số của 5`);
        const nearest = Math.round(ratio / 5) * 5;
        const lech = ctx.soTienVay - nearest / 100 * giaTri;
        return {
          status: 'warn',
          message: `Tỷ lệ vay ${ratio.toFixed(2)}% KHÔNG phải bội số của 5 — check lại tỷ lệ vay theo CSBH. ` +
                   `Tỷ lệ gần nhất ${nearest}% → số tiền lệch ${V._fmt(Math.abs(lech))} đ (${lech > 0 ? 'thừa' : 'thiếu'})`,
        };
      },
    });
    this.register({
      id: 'g1_vuot_han_muc', group: 1, severity: 'block',
      title: 'Số tiền vay không vượt hạn mức phê duyệt',
      check(ctx) {
        if (isNaN(ctx.soTienVay) || isNaN(ctx.soTienPheDuyet)) return skip('Thiếu số tiền vay hoặc hạn mức phê duyệt');
        if (ctx.soTienVay <= ctx.soTienPheDuyet) {
          return pass(`Số tiền vay ${V._fmt(ctx.soTienVay)} đ ≤ hạn mức ${V._fmt(ctx.soTienPheDuyet)} đ`);
        }
        return {
          status: 'block',
          message: `VƯỢT HẠN MỨC PHÊ DUYỆT: số tiền vay ${V._fmt(ctx.soTienVay)} đ > hạn mức ${V._fmt(ctx.soTienPheDuyet)} đ ` +
                   `(vượt ${V._fmt(ctx.soTienVay - ctx.soTienPheDuyet)} đ)`,
        };
      },
    });
    this.register({
      id: 'g1_tong_kunn', group: 1, severity: 'warn',
      title: 'Tổng số tiền các KUNN khớp với số tiền giải ngân lần đầu',
      check(ctx) {
        if (!ctx.kunnAmounts.length) return skip('Không có khế ước tách (khoản vay 1 KUNN)');
        if (isNaN(ctx.soTienGnLan1)) return skip('Thiếu số tiền giải ngân lần đầu');
        const tong = ctx.kunnAmounts.reduce((a, b) => a + b, 0);
        if (Math.abs(tong - ctx.soTienGnLan1) < 1) {
          return pass(`Tổng ${ctx.kunnAmounts.length} KUNN = ${V._fmt(tong)} đ khớp số tiền GN lần đầu`);
        }
        return {
          status: 'warn',
          message: `Tổng ${ctx.kunnAmounts.length} KUNN = ${V._fmt(tong)} đ KHÔNG khớp số tiền giải ngân lần đầu ` +
                   `${V._fmt(ctx.soTienGnLan1)} đ (lệch ${V._fmt(Math.abs(tong - ctx.soTienGnLan1))} đ)`,
        };
      },
    });
    this.register({
      id: 'g1_kunn_chi_ho', group: 1, severity: 'warn',
      title: 'Số tiền KUNN tiếp nối chi hộ không lớn hơn dư nợ hiện tại của bên bán',
      check(ctx) {
        if (isNaN(ctx.kunnChiHo) || isNaN(ctx.duNoBenBan)) {
          return skip('Nhập "Số tiền KUNN tiếp nối chi hộ" và "Dư nợ hiện tại bên bán" ở phần cấu hình để kiểm tra');
        }
        if (ctx.kunnChiHo <= ctx.duNoBenBan) {
          return pass(`KUNN chi hộ ${V._fmt(ctx.kunnChiHo)} đ ≤ dư nợ bên bán ${V._fmt(ctx.duNoBenBan)} đ`);
        }
        return {
          status: 'warn',
          message: `Số tiền KUNN tiếp nối chi hộ ${V._fmt(ctx.kunnChiHo)} đ LỚN HƠN dư nợ hiện tại của bên bán ` +
                   `${V._fmt(ctx.duNoBenBan)} đ (chênh ${V._fmt(ctx.kunnChiHo - ctx.duNoBenBan)} đ)`,
        };
      },
    });

    /* ═══ NHÓM 2: GIÁ TRỊ TÀI SẢN ═══ */
    this.register({
      id: 'g2_gia_tri_ts', group: 2, severity: 'warn',
      title: 'Giá trị tài sản không vượt so với phê duyệt',
      check(ctx) {
        if (isNaN(ctx.giaTriTaiSan) || isNaN(ctx.giaTriTaiSanPheDuyet)) return skip('Thiếu giá trị tài sản hoặc giá trị phê duyệt');
        if (ctx.giaTriTaiSan <= ctx.giaTriTaiSanPheDuyet) {
          return pass(`Giá trị TS ${V._fmt(ctx.giaTriTaiSan)} đ ≤ phê duyệt ${V._fmt(ctx.giaTriTaiSanPheDuyet)} đ`);
        }
        return {
          status: 'warn',
          message: `Giá trị tài sản ${V._fmt(ctx.giaTriTaiSan)} đ VƯỢT so với phê duyệt ${V._fmt(ctx.giaTriTaiSanPheDuyet)} đ`,
        };
      },
    });

    /* ═══ NHÓM 3: LTV / GIÁ TRỊ ĐẢM BẢO MAX ═══ */
    this.register({
      id: 'g3_ltv', group: 3, severity: 'warn',
      title: 'LTV không vượt phê duyệt',
      check(ctx) {
        if (isNaN(ctx.soTienVay) || isNaN(ctx.giaTriTaiSan) || !ctx.giaTriTaiSan || isNaN(ctx.ltvMax)) {
          return skip('Thiếu số tiền vay / giá trị TS / LTV Max');
        }
        const ltv = ctx.soTienVay / ctx.giaTriTaiSan * 100;
        if (ltv <= ctx.ltvMax + 0.01) return pass(`LTV thực tế ${ltv.toFixed(2)}% ≤ LTV Max ${ctx.ltvMax}%`);
        return { status: 'warn', message: `LTV thực tế ${ltv.toFixed(2)}% VƯỢT LTV Max phê duyệt ${ctx.ltvMax}%` };
      },
    });
    this.register({
      id: 'g3_gtdb_max', group: 3, severity: 'warn',
      title: 'Giá trị đảm bảo max đủ đảm bảo cho khoản vay',
      check(ctx) {
        if (isNaN(ctx.gtdbMax) || isNaN(ctx.soTienVay)) return skip('Thiếu giá trị đảm bảo max hoặc số tiền vay');
        if (ctx.gtdbMax >= ctx.soTienVay) {
          return pass(`GTĐB max ${V._fmt(ctx.gtdbMax)} đ ≥ số tiền vay ${V._fmt(ctx.soTienVay)} đ`);
        }
        return {
          status: 'warn',
          message: `Giá trị đảm bảo max ${V._fmt(ctx.gtdbMax)} đ KHÔNG ĐỦ đảm bảo cho khoản vay ${V._fmt(ctx.soTienVay)} đ ` +
                   `(thiếu ${V._fmt(ctx.soTienVay - ctx.gtdbMax)} đ)`,
        };
      },
    });
    this.register({
      id: 'g3_gn_70', group: 3, severity: 'block',
      title: 'Giai đoạn hình thành tương lai không giải ngân quá 70%',
      check(ctx) {
        // TS hình thành tương lai = chưa có sổ: Đặt cọc / Ký quỹ / HĐMB
        const httl = ['dat coc', 'ky quy', 'hdmb'].includes(V._norm(ctx.trangThaiTaiSan));
        if (!httl) return pass(`Trạng thái TS "${ctx.trangThaiTaiSan || '?'}" không thuộc giai đoạn hình thành tương lai`);
        const giaTri = (ctx.giaNET || 0) + (ctx.giaVAT || 0);
        if (isNaN(ctx.soTienGnLan1) || !giaTri) return skip('Thiếu số tiền GN lần đầu hoặc giá trị HĐMB (NET+VAT)');
        const pct = ctx.soTienGnLan1 / giaTri * 100;
        if (pct <= ctx.threshold70 + 0.01) {
          return pass(`GN lần đầu ${pct.toFixed(2)}% giá trị HĐMB ≤ ${ctx.threshold70}%`);
        }
        return {
          status: 'block',
          message: `TS hình thành tương lai ("${ctx.trangThaiTaiSan}") — GN lần đầu ${V._fmt(ctx.soTienGnLan1)} đ = ` +
                   `${pct.toFixed(2)}% giá trị HĐMB, VƯỢT ngưỡng ${ctx.threshold70}%. Check lại tổng số tiền giải ngân lần đầu.`,
        };
      },
    });

    /* ═══ NHÓM 4: MÃ CĂN ═══ */
    this.register({
      id: 'g4_ma_can_gn', group: 4, severity: 'warn',
      title: 'Mã căn thuộc danh sách đủ điều kiện giải ngân',
      check(ctx) {
        if (!ctx.maCan) return skip('Chưa có mã căn');
        if (!ctx.eligibleUnits.size) return skip('Chưa cấu hình danh sách quỹ căn đủ điều kiện GN (master data mục 5.3)');
        if (ctx.eligibleUnits.has(V._norm(ctx.maCan))) return pass(`Mã căn "${ctx.maCan}" thuộc danh sách đủ điều kiện GN`);
        return { status: 'warn', message: `Mã căn "${ctx.maCan}" KHÔNG thuộc danh sách đủ điều kiện giải ngân` };
      },
    });
    this.register({
      id: 'g4_ma_can_f1', group: 4, severity: 'warn',
      title: 'Mã căn thuộc danh sách lô buôn F1 (khoản vay sơ cấp lô buôn)',
      check(ctx) {
        if (!ctx.maCan) return skip('Chưa có mã căn');
        if (!ctx.f1Units.size) return skip('Chưa cấu hình danh sách quỹ căn F1 lô buôn — bỏ qua nếu không phải khoản lô buôn');
        if (ctx.f1Units.has(V._norm(ctx.maCan))) return pass(`Mã căn "${ctx.maCan}" thuộc danh sách F1 lô buôn`);
        return { status: 'warn', message: `Mã căn "${ctx.maCan}" KHÔNG thuộc danh sách lô buôn F1` };
      },
    });

    /* ═══ NHÓM 5: DỰ ÁN ═══ */
    this.register({
      id: 'g5_du_an_tcb', group: 5, severity: 'warn',
      title: 'Dự án đã liên kết với TCB',
      check(ctx) {
        if (!ctx.maDuAn) return skip('Chưa có mã dự án');
        // Ưu tiên danh sách cấu hình; fallback: mã dự án có trong master data Thông tin dự án
        if (ctx.tcbProjects.size) {
          if (ctx.tcbProjects.has(V._norm(ctx.maDuAn))) return pass(`Dự án "${ctx.maDuAn}" thuộc danh sách liên kết TCB`);
          return { status: 'warn', message: `Dự án "${ctx.maDuAn}" CHƯA liên kết với TCB (không có trong danh sách cấu hình)` };
        }
        if (typeof ProjectInfoState !== 'undefined' && Array.isArray(ProjectInfoState.list)) {
          const found = ProjectInfoState.list.some(p => V._norm(p.ma_du_an) === V._norm(ctx.maDuAn));
          if (found) return pass(`Dự án "${ctx.maDuAn}" có trong master data Thông tin dự án`);
          return { status: 'warn', message: `Dự án "${ctx.maDuAn}" không có trong master data Thông tin dự án — kiểm tra dự án đã liên kết TCB chưa` };
        }
        return skip('Chưa cấu hình danh sách dự án liên kết TCB');
      },
    });

    /* ═══ NHÓM 6: HĐMB ═══ */
    this.register({
      id: 'g6_hdmb_bao_lanh', group: 6, severity: 'warn',
      title: 'Người đứng tên trên HĐMB khớp với bên bảo lãnh',
      check(ctx) {
        if (!ctx.nguoiKyHDMB) return skip('Chưa có tên người ký trên HĐMB (Extract CTT)');
        // Bên bảo lãnh = chủ tài sản; nếu KH = chủ TS thì so với tên khách hàng
        const benBaoLanh = ctx.khachHangLaChuTS === 'y' || ctx.khachHangLaChuTS === 'yes'
          ? ctx.tenKhachHang : (ctx.chuTaiSan || ctx.tenKhachHang);
        if (!benBaoLanh) return skip('Chưa có thông tin bên bảo lãnh/chủ tài sản');
        const signers = [ctx.nguoiKyHDMB, ctx.nguoiKyHDMB2].filter(Boolean).map(s => V._norm(s));
        if (signers.includes(V._norm(benBaoLanh))) {
          return pass(`Người ký HĐMB khớp bên bảo lãnh: ${benBaoLanh}`);
        }
        return {
          status: 'warn',
          message: `Người đứng tên trên HĐMB ("${ctx.nguoiKyHDMB}"${ctx.nguoiKyHDMB2 ? `, "${ctx.nguoiKyHDMB2}"` : ''}) ` +
                   `KHÔNG khớp với bên bảo lãnh ("${benBaoLanh}")`,
        };
      },
    });

    /* ═══ NHÓM 7: NGÀY THÁNG NĂM NHẬP LIỆU ═══ */
    this.register({
      id: 'g7_ngay_tuong_lai', group: 7, severity: 'warn',
      title: 'Các trường ngày không chứa ngày tương lai',
      check(ctx) {
        const today = new Date(); today.setHours(23, 59, 59, 999);
        const future = [];
        let checked = 0;
        Object.entries(ctx.dateFields).forEach(([label, raw]) => {
          const d = V._date(raw);
          if (!d) return;
          checked++;
          if (d > today) future.push(`${label} = ${raw}`);
        });
        if (!checked) return skip('Chưa có trường ngày nào để kiểm tra');
        if (!future.length) return pass(`${checked} trường ngày hợp lệ (không có ngày tương lai)`);
        return { status: 'warn', message: `Phát hiện ngày TƯƠNG LAI: ${future.join('; ')}` };
      },
    });
    this.register({
      id: 'g7_ngay_gn', group: 7, severity: 'warn',
      title: 'Ngày dự kiến giải ngân ≥ ngày hiện tại (BRD 3.4)',
      check(ctx) {
        const d = V._date(ctx.ngayDuKienGN);
        if (!d) return skip('Chưa có ngày dự kiến giải ngân');
        const today = new Date(); today.setHours(0, 0, 0, 0);
        if (d >= today) return pass(`Ngày dự kiến GN ${ctx.ngayDuKienGN} ≥ hôm nay`);
        return { status: 'warn', message: `Ngày dự kiến giải ngân ${ctx.ngayDuKienGN} ĐÃ QUA (phải ≥ ngày hiện tại theo BRD 3.4)` };
      },
    });
  },

  /* ── chạy toàn bộ rule ── */
  runAll() {
    this._initRules();
    const ctx = this.buildContext();
    const results = this._rules.map(rule => {
      let r;
      try { r = rule.check(ctx) || { status: 'skip', message: 'Rule không trả kết quả' }; }
      catch (e) { r = { status: 'skip', message: `Lỗi rule: ${e.message}` }; }
      // status do check trả về; nếu fail thì severity của rule quyết định block hay warn
      if (r.status === 'warn' && rule.severity === 'block') r.status = 'block';
      return { ...rule, result: r };
    });
    this._lastResults = results;
    return {
      results,
      blocks: results.filter(x => x.result.status === 'block'),
      warns: results.filter(x => x.result.status === 'warn'),
      passes: results.filter(x => x.result.status === 'pass'),
      skips: results.filter(x => x.result.status === 'skip'),
    };
  },

  // Gọi trước các hành động xuất: trả false nếu user hủy do có lỗi CHẶN
  confirmIfBlocked(actionLabel) {
    const { blocks, warns } = this.runAll();
    if (blocks.length) {
      const msg = `⛔ CÓ ${blocks.length} LỖI CHẶN NGHIỆP VỤ:\n\n` +
        blocks.map(b => `• ${b.result.message}`).join('\n') +
        `\n\nVẫn tiếp tục ${actionLabel}?`;
      return confirm(msg);
    }
    if (warns.length) {
      this._toast(`⚠️ Có ${warns.length} cảnh báo nghiệp vụ — xem trang "Cảnh báo nghiệp vụ"`, 'warning');
    }
    return true;
  },

  /* ── UI ── */
  GROUP_LABELS: {
    1: 'Nhóm 1 — Số tiền vay', 2: 'Nhóm 2 — Giá trị tài sản', 3: 'Nhóm 3 — LTV / Giá trị đảm bảo max',
    4: 'Nhóm 4 — Mã căn', 5: 'Nhóm 5 — Dự án', 6: 'Nhóm 6 — HĐMB', 7: 'Nhóm 7 — Ngày tháng năm nhập liệu',
  },

  initPage() {
    this.loadState();
    this._initRules();
    const container = document.getElementById('validator-container');
    if (!container) return;
    const cfg = this._config;
    const cfgInput = (key, label, placeholder, type) => `
      <div>
        <label style="display:block;margin-bottom:4px;font-size:0.78rem;font-weight:600;color:var(--text-secondary);">${this._esc(label)}</label>
        <input type="${type || 'text'}" class="mapping-select" placeholder="${this._esc(placeholder || '')}"
          value="${this._esc(cfg[key] || '')}" oninput="BusinessValidator.onConfig('${key}', this.value)">
      </div>`;
    const cfgArea = (key, label, placeholder) => `
      <div>
        <label style="display:block;margin-bottom:4px;font-size:0.78rem;font-weight:600;color:var(--text-secondary);">${this._esc(label)}</label>
        <textarea class="mapping-select" rows="3" style="resize:vertical;font-family:monospace;font-size:0.78rem;"
          placeholder="${this._esc(placeholder || '')}"
          oninput="BusinessValidator.onConfig('${key}', this.value)">${this._esc(cfg[key] || '')}</textarea>
      </div>`;

    container.innerHTML = `
      <div style="margin-bottom:16px;padding:14px 18px;border:1px solid rgba(245,158,11,0.25);border-radius:14px;background:rgba(245,158,11,0.04);">
        <div style="font-size:0.9rem;font-weight:700;color:#f59e0b;margin-bottom:10px;">⚙️ Cấu hình kiểm tra (dữ liệu không có trong Extract LMS)</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;">
          ${cfgInput('hanMucOverride', 'Hạn mức phê duyệt (override)', 'Trống = lấy từ Extract "Số tiền phê duyệt"')}
          ${cfgInput('kunnChiHo', 'Số tiền KUNN tiếp nối chi hộ', 'Nhập để kiểm tra rule chi hộ')}
          ${cfgInput('duNoBenBan', 'Dư nợ hiện tại của bên bán', 'Nhập để kiểm tra rule chi hộ')}
          ${cfgInput('threshold70', 'Ngưỡng GN giai đoạn HTTL (%)', '70', 'number')}
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;margin-top:12px;">
          ${cfgArea('eligibleUnits', 'Danh sách mã căn đủ điều kiện GN', 'Mỗi dòng 1 mã căn (hoặc cách nhau bởi dấu phẩy)')}
          ${cfgArea('f1Units', 'Danh sách quỹ căn F1 lô buôn', 'Trống = bỏ qua kiểm tra F1')}
          ${cfgArea('tcbProjects', 'Danh sách mã dự án liên kết TCB', 'Trống = đối chiếu master data Thông tin dự án')}
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px;">
        <button onclick="BusinessValidator.runAndRender()" style="padding:8px 18px;border-radius:8px;border:none;background:#f59e0b;color:#fff;font-weight:700;cursor:pointer;font-size:0.85rem;font-family:inherit;">▶ Chạy kiểm tra nghiệp vụ</button>
        <span id="validator-summary" style="font-size:0.84rem;color:var(--text-muted);"></span>
      </div>
      <div id="validator-results"></div>
    `;
    if (this._lastResults) this.renderResults();
  },

  onConfig(key, value) {
    this._config[key] = value;
    this.saveState();
  },

  runAndRender() {
    this.runAll();
    this.renderResults();
  },

  renderResults() {
    const el = document.getElementById('validator-results');
    const sum = document.getElementById('validator-summary');
    if (!el || !this._lastResults) return;
    const results = this._lastResults;
    const counts = { block: 0, warn: 0, pass: 0, skip: 0 };
    results.forEach(r => counts[r.result.status]++);
    if (sum) {
      sum.innerHTML =
        `<b style="color:#ef4444;">${counts.block} chặn</b> · ` +
        `<b style="color:#f59e0b;">${counts.warn} cảnh báo</b> · ` +
        `<b style="color:#059669;">${counts.pass} đạt</b> · ` +
        `<span>${counts.skip} bỏ qua (thiếu dữ liệu)</span>`;
    }
    const badge = (status) => ({
      block: '<span style="padding:2px 10px;border-radius:999px;font-size:0.72rem;font-weight:700;background:rgba(239,68,68,0.12);color:#ef4444;">⛔ CHẶN</span>',
      warn:  '<span style="padding:2px 10px;border-radius:999px;font-size:0.72rem;font-weight:700;background:rgba(245,158,11,0.14);color:#d97706;">⚠️ CẢNH BÁO</span>',
      pass:  '<span style="padding:2px 10px;border-radius:999px;font-size:0.72rem;font-weight:700;background:rgba(16,185,129,0.12);color:#059669;">✓ ĐẠT</span>',
      skip:  '<span style="padding:2px 10px;border-radius:999px;font-size:0.72rem;font-weight:700;background:rgba(148,163,184,0.15);color:var(--text-muted);">— BỎ QUA</span>',
    }[status] || status);

    let html = '';
    const groups = [...new Set(results.map(r => r.group))].sort((a, b) => a - b);
    groups.forEach(g => {
      const items = results.filter(r => r.group === g);
      html += `
        <div style="margin-bottom:14px;border:1px solid var(--border-color,rgba(148,163,184,0.2));border-radius:12px;overflow:hidden;">
          <div style="padding:10px 16px;background:rgba(99,102,241,0.06);font-weight:700;font-size:0.85rem;color:var(--text-primary);">
            ${this._esc(this.GROUP_LABELS[g] || `Nhóm ${g}`)}
          </div>
          <table class="mapping-table" style="margin:0;">
            <tbody>
              ${items.map(r => `
                <tr style="${r.result.status === 'skip' ? 'opacity:0.55;' : ''}">
                  <td style="width:12%;white-space:nowrap;">${badge(r.result.status)}</td>
                  <td style="width:32%;font-size:0.82rem;font-weight:600;">${this._esc(r.title)}</td>
                  <td style="font-size:0.8rem;">${this._esc(r.result.message)}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>`;
    });
    html += `<p style="font-size:0.76rem;color:var(--text-muted);">💡 Nhóm 8 (mở rộng): đăng ký rule mới bằng <code>BusinessValidator.register({id, group, severity, title, check(ctx)})</code> — kết quả tự xuất hiện trong các lần chạy sau.</p>`;
    el.innerHTML = html;
  },
};

window.BusinessValidator = BusinessValidator;
