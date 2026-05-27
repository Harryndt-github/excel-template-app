/* ============================================================
   numberToVietnamese — Đọc số tiền thành chữ tiếng Việt
   Hỗ trợ định dạng: {{TEN_TRUONG_bangchu}}
   Ví dụ: {{so_tien_vay}} = 3.154.971.227
          {{so_tien_vay_bangchu}} → "Ba tỷ một trăm năm mươi bốn triệu chín trăm bảy mươi mốt ngàn hai trăm hai mươi bảy đồng"
   ============================================================ */

const NumberToWords = (() => {
  const UNITS = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

  function readGroup(n, isHighest) {
    if (n === 0) return '';
    const h = Math.floor(n / 100);
    const t = Math.floor((n % 100) / 10);
    const u = n % 10;
    const parts = [];

    if (h > 0) {
      parts.push(UNITS[h] + ' trăm');
    } else if (!isHighest && (t > 0 || u > 0)) {
      parts.push('không trăm');
    }

    if (t === 0 && u === 0) {
      // no tens/units
    } else if (t === 0) {
      // "linh" chỉ xuất hiện khi có hàng trăm hoặc đây không phải nhóm cao nhất
      if (h > 0 || !isHighest) {
        parts.push('linh ' + UNITS[u]);
      } else {
        parts.push(UNITS[u]);
      }
    } else if (t === 1) {
      const unitPart = u === 0 ? '' : u === 5 ? ' lăm' : ' ' + UNITS[u];
      parts.push('mười' + unitPart);
    } else {
      let unitPart = '';
      if (u === 1) unitPart = ' mốt';
      else if (u === 5) unitPart = ' lăm';
      else if (u > 0) unitPart = ' ' + UNITS[u];
      parts.push(UNITS[t] + ' mươi' + unitPart);
    }

    return parts.join(' ');
  }

  // Đọc số nguyên không âm thành chữ tiếng Việt (tối đa ~999 tỷ tỷ)
  function convert(n) {
    n = Math.round(Math.abs(n));
    if (n === 0) return 'Không đồng';

    const TY     = 1_000_000_000;
    const TRIEU  = 1_000_000;
    const NGAN   = 1_000;

    const ty    = Math.floor(n / TY);
    const trieu = Math.floor((n % TY) / TRIEU);
    const ngan  = Math.floor((n % TRIEU) / NGAN);
    const donVi = n % NGAN;

    const parts = [];
    if (ty > 0)    parts.push(readGroup(ty,    parts.length === 0) + ' tỷ');
    if (trieu > 0) parts.push(readGroup(trieu, parts.length === 0) + ' triệu');
    if (ngan > 0)  parts.push(readGroup(ngan,  parts.length === 0) + ' ngàn');
    if (donVi > 0) parts.push(readGroup(donVi, parts.length === 0));

    const text = parts.join(' ');
    return text.charAt(0).toUpperCase() + text.slice(1) + ' đồng';
  }

  // Phân tích chuỗi số (hỗ trợ định dạng VN: 3.154.971.227 và các format thông dụng)
  function parse(str) {
    if (str === null || str === undefined) return null;
    let s = String(str).trim();

    // Loại bỏ ký hiệu tiền tệ và khoảng trắng
    s = s.replace(/[₫đĐVNDvnd\s]/g, '');
    if (!s) return null;

    // Định dạng Châu Âu / Việt Nam: 1.234.567,89 (chấm = ngàn, phẩy = thập phân)
    if (/^\d{1,3}(\.\d{3})+,\d+$/.test(s)) {
      return parseFloat(s.replace(/\./g, '').replace(',', '.'));
    }

    // Định dạng VN chỉ có chấm (số nguyên): 3.154.971.227
    if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
      return parseInt(s.replace(/\./g, ''), 10);
    }

    // Định dạng Anh: 1,234,567.89
    if (/^\d{1,3}(,\d{3})*(\.\d+)?$/.test(s)) {
      return parseFloat(s.replace(/,/g, ''));
    }

    // Số thuần (có thể có dấu thập phân)
    const n = parseFloat(s.replace(/[^\d.-]/g, ''));
    return isNaN(n) ? null : n;
  }

  // Nhận object replacements, trả về object đã bổ sung các key _bangchu
  // Ví dụ: { 'so_tien_vay': '3.154.971.227' }
  //     → { 'so_tien_vay': '3.154.971.227', 'so_tien_vay_bangchu': 'Ba tỷ ...' }
  function expandBangChu(replacements) {
    const extra = {};
    Object.entries(replacements).forEach(([key, value]) => {
      const num = parse(value);
      if (num !== null && isFinite(num) && num >= 0) {
        const bangChuKey = key + '_bangchu';
        // Chỉ tự động điền nếu chưa có key đó (user có thể tự override)
        if (!(bangChuKey in replacements)) {
          extra[bangChuKey] = convert(num);
        }
      }
    });
    return Object.assign({}, replacements, extra);
  }

  return { convert, parse, expandBangChu };
})();
