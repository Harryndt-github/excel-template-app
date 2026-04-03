/* ============================================
   ExcelMapper - Main Application Logic
   ============================================ */

// ============================================
// FILE TYPE CONFIGURATIONS (FIXED - DO NOT MODIFY)
// These field definitions are locked. Uploaded files
// must match these column names exactly for validation.
// ============================================
const FILE_TYPES = {
  thong_tin_vay: {
    label: 'Thông tin vay',
    structure: 'vertical',
    valueRows: 1,
    description: 'Cột A: Chỉ tiêu chính | Cột B: Giá trị',
    required: false,
    fields: [
      'Số hồ sơ Smartcredit', 'Sản phẩm vay', 'Chi nhánh', 'Hạng khách hàng', 'Xếp hạng khách hàng', 'CBNV TCB', 'Số tiền phê duyệt',
      'Thời hạn vay', 'Ân hạn gốc phê duyệt', 'Chương trình vay', 'Phương án vay vốn', 'Giai đoạn giải ngân', 'Mục đích vay', 'Loại hình',
      'Mã dự án vay vốn', 'Mã căn vay vốn', 'Tần suất trả nợ gốc', 'Tần suất trả nợ lãi', 'Phương thức trả nợ', 'LTD', 'Phương thức giải ngân',
      'Phương thức giải ngân', 'Ngày phê duyệt', 'Ghi chú phê duyệt', 'Số HĐTD', 'Tổng số tiền vay', 'Số tiền giải ngân', 'Khế ước 1',
      'Số tiền giải ngân', 'Thời gian vay', 'Người nhận nợ', 'Lựa chọn HTLS KU1', 'Lựa chọn cố định lãi suất',
      'Áp dụng ân hạn gốc', 'Thời gian ân hạn gốc', 'Ân hạn gốc bổ sung', 'Mã chương trình', 'Ân hạn gốc bổ sung',
      'Mã chương trình', 'Mã chính sách', 'Chính sách bán hàng', 'Ngày chặn HTLS', 'Tháng chặn HTLS', 'Lãi suất giai đoạn 1', 'Lãi suất cố định',
      'Biên độ', 'Số kỳ trả nợ gốc', 'Số tiền trả gốc mỗi kỳ', 'Só tiền trả gốc kỳ cuối', 'Số tiền niên kim', 'Ngày trả lãi đầu tiên',
      'Ngày trả gốc đầu tiên', 'Tài khoản trả nợ', 'Khế ước 2',
      'Số tiền giải ngân', 'Thời gian vay', 'Người nhận nợ', 'Lựa chọn HTLS KU1', 'Lựa chọn cố định lãi suất',
      'Áp dụng ân hạn gốc', 'Thời gian ân hạn gốc', 'Ân hạn gốc bổ sung', 'Mã chương trình', 'Ân hạn gốc bổ sung',
      'Mã chương trình', 'Mã chính sách', 'Chính sách bán hàng', 'Ngày chặn HTLS', 'Tháng chặn HTLS', 'Lãi suất giai đoạn 1', 'Lãi suất cố định',
      'Biên độ', 'Số kỳ trả nợ gốc', 'Số tiền trả gốc mỗi kỳ', 'Só tiền trả gốc kỳ cuối', 'Số tiền niên kim', 'Ngày trả lãi đầu tiên',
      'Ngày trả gốc đầu tiên', 'Tài khoản trả nợ', 'Khế ước 3',
      'Số tiền giải ngân', 'Thời gian vay', 'Người nhận nợ', 'Lựa chọn HTLS KU1', 'Lựa chọn cố định lãi suất',
      'Áp dụng ân hạn gốc', 'Thời gian ân hạn gốc', 'Ân hạn gốc bổ sung', 'Mã chương trình', 'Ân hạn gốc bổ sung',
      'Mã chương trình', 'Mã chính sách', 'Chính sách bán hàng', 'Ngày chặn HTLS', 'Tháng chặn HTLS', 'Lãi suất giai đoạn 1', 'Lãi suất cố định',
      'Biên độ', 'Số kỳ trả nợ gốc', 'Số tiền trả gốc mỗi kỳ', 'Só tiền trả gốc kỳ cuối', 'Số tiền niên kim', 'Ngày trả lãi đầu tiên',
      'Ngày trả gốc đầu tiên', 'Tài khoản trả nợ', 'Khế ước 4',
      'Số tiền giải ngân', 'Thời gian vay', 'Người nhận nợ', 'Lựa chọn HTLS KU1', 'Lựa chọn cố định lãi suất',
      'Áp dụng ân hạn gốc', 'Thời gian ân hạn gốc', 'Ân hạn gốc bổ sung', 'Mã chương trình', 'Ân hạn gốc bổ sung',
      'Mã chương trình', 'Mã chính sách', 'Chính sách bán hàng', 'Ngày chặn HTLS', 'Tháng chặn HTLS', 'Lãi suất giai đoạn 1', 'Lãi suất cố định',
      'Biên độ', 'Số kỳ trả nợ gốc', 'Số tiền trả gốc mỗi kỳ', 'Só tiền trả gốc kỳ cuối', 'Số tiền niên kim', 'Ngày trả lãi đầu tiên',
      'Ngày trả gốc đầu tiên', 'Tài khoản trả nợ', 'Khế ước 5',
      'Số tiền giải ngân', 'Thời gian vay', 'Người nhận nợ', 'Lựa chọn HTLS KU1', 'Lựa chọn cố định lãi suất',
      'Áp dụng ân hạn gốc', 'Thời gian ân hạn gốc', 'Ân hạn gốc bổ sung', 'Mã chương trình', 'Ân hạn gốc bổ sung',
      'Mã chương trình', 'Mã chính sách', 'Chính sách bán hàng', 'Ngày chặn HTLS', 'Tháng chặn HTLS', 'Lãi suất giai đoạn 1', 'Lãi suất cố định',
      'Biên độ', 'Số kỳ trả nợ gốc', 'Số tiền trả gốc mỗi kỳ', 'Só tiền trả gốc kỳ cuối', 'Số tiền niên kim', 'Ngày trả lãi đầu tiên',
      'Ngày trả gốc đầu tiên', 'Tài khoản trả nợ', 'Ngày dự kiến GN', 'Phương thức ký hợp đồng', 'Ghi chú soạn ĐVKD', 'Họ tên bên vay 1',
      'Ngày sinh bên vay 1', 'Quốc tịch bên vay 1', 'Tình trạng hôn nhân bên vay 1', 'Địa chỉ thường trú bên vay 1', 'Đường/Địa chỉ chi tiết 1',
      'Tỉnh/Thành phố 1', 'Quận/Huyện 1', 'Phường/Xã 1', 'Loại giấy tờ tuỳ thân bên vay 1', 'CMND bên vay 1', 'Ngày cấp bên vay 1', 'Nơi cấp bên vay 1',
      'Số điện thoại khách hàng', 'Email khách hàng', 'Họ và tên bên vay 2', 'Ngày sinh bên vay 2', 'Quốc tịch bên vay 2', 'Tình trạng hôn nhân bên vay 2',
      'Địa chỉ thường trú bên vay 2', 'Đường/Địa chỉ chi tiết 2', 'Tỉnh/Thành phố 2', 'Quận/Huyện 2', 'Phường/Xã 2', 'Loại giấy tờ tuỳ thân bên vay 2',
      'CMND bên vay 2', 'Ngày cấp bên vay 2', 'Nơi cấp bên vay 2', 'Số điện thoại vợ/chồng khách hàng', 'Email vợ/chồng khách hàng',
      'Uỷ quyền ký hợp đồng bên vay', 'Vợ/Chồng khách hàng có ký HSTD', 'Tài khoản CVKH1', 'Tài khoản CVKH2', 'Tài khoản CTV', 'Tổng giá trị tài sản',
      'Tổng giá trị bảo đảm tối đa', 'Tên giải pháp cho vay', 'Hồ sơ liên quan', 'Giấy phép xây dựng', 'Loại xe mua', 'Nhãn hiệu xe', 'Tình trạng xe',
      'Năm sản xuất', 'Nơi sản xuất', 'Ngày đăng ký xe lần đầu', 'Số đăng ký xe', 'Ngày hoá đơn GTGT/HĐMB/Phiếu kiểm tra xuất xưởng/GCN chất lượng',
      'ID khách hàng', 'Khách hàng ETB/NTB', 'Số tháng HTLS đề xuất', 'Số kỳ điều chỉnh tăng gốc', 'Tỷ lệ tăng gốc', 'Nơi làm việc',
      'Mã chiến dịch theo phê duyệt'
    ]
  },
  tai_san: {
    label: 'Tài sản',
    structure: 'horizontal',
    valueRows: 1,
    description: 'Dòng 1: Header | Dòng 2: Giá trị',
    required: false,
    fields: [
      'Số hồ sơ', 'Loại tài sản', 'Nguồn gốc tài sản', 'Đã thế chấp tại TCB', 'ID tài sản', 'Loại hình tài sản', 'Giá trị tài sản', 'Giá trị bảo đảm tối đa',
      'LTV Max', 'Mã dự án', 'Mã căn', 'Trạng thái tài sản', 'Số phiếu định giá', 'Chi nhánh ký HSTS', 'Uỷ quyền cho sao Thuỷ', 'Người đại diện sao thuỷ',
      'Người đại diện TCB', 'CMND', 'Địa chỉ', 'Cam kết tài sản riêng', 'Mua bảo hiểm tài sản', 'Bổ sung HĐTC song phương?', 'Số sổ đỏ', 'Số sổ tiết kiệm',
      'Loại trái phiếu', 'Code trái phiếu', 'Số lượng trái phiếu', 'Khách hàng = Chủ tài sản', 'Chủ tài sản 1', 'Ngày sinh chủ tài sản 1', 'Quốc tịch chủ tài sản 1',
      'Tình trạng hôn nhân chủ tài sản 1', 'Địa chỉ thường trú chủ tài sản 1', 'Đường/Địa chỉ chi tiết', 'Tỉnh/Thành phố', 'Quận/Huyện', 'Phường/Xã',
      'CMND chủ tài sản 1', 'Vợ/Chồng chủ tài sản 1', 'Ngày sinh vợ/chồng chủ tài sản 1', 'Quốc tịch vợ/chồng chủ tài sản 1',
      'Tình trạng hôn nhân chủ tài sản 1', 'Địa chỉ thường trú chủ tài sản 1', 'Đường/Địa chỉ chi tiết', 'Tỉnh/Thành phố', 'Quận/Huyện', 'Phường/Xã',
      'CMND Vợ/chồng chủ tài sản 1', 'Uỷ quyền ký HSTS chủ tài sản 1', 'Nhãn hiệu xe', 'Model', 'Biển kiểm soát', 'Số khung', 'Số máy', 'Ngày định giá',
      'Số đăng ký GDBĐ', 'Ngày đăng ký GDBĐ', 'Số bì nhập kho', 'Số hợp đồng bảo hiểm', 'Ngày bắt đầu', 'Ngày kết thúc', 'Giá trị bảo hiểm', 'Phí bảo hiểm',
      'Công ty bảo hiểm', 'Ngày ký HĐTC', 'Thời gian khấu hao còn lại', 'Địa chị tài sản', 'Ngày cấp sổ', 'Nơi cấp sổ', 'Thửa đất', 'Tờ bản đồ', 'Diện tích',
      'Số hợp đồng thế chấp', 'Hiện trạng tài sản', 'Hồ sơ TSĐB nhập tại kho', 'Ngoại lệ bảo hiểm', 'Tên công ty định giá', 'Mã phiếu định giá', 'Thông tin quy hoạch',
      'Loại hình bảo hiểm', 'Văn phòng công chứng', 'Ngày hẹn DKGDBD'
    ]
  },
  chu_tai_san: {
    label: 'Chủ tài sản',
    structure: 'horizontal',
    valueRows: 1,
    description: 'Dòng 1: Header | Dòng 2: Giá trị',
    required: false,
    fields: [
      'Số hồ sơ', 'Loại tài sản', 'Đã thế chấp tại TCB', 'ID tài sản', 'Mã dự án', 'Mã căn', 'Số phiếu định giá', 'Số sổ đỏ', 'Số sổ tiết kiệm', 'Loại trái phiếu',
      'Code trái phiếu', 'Số lượng trái phiếu', 'Khách hàng = Chủ tài sản', 'Chủ tài sản', 'Ngày sinh chủ tài sản', 'Quốc tịch chủ tài sản',
      'Tình trạng hôn nhân chủ tài sản', 'Địa chỉ thường trú chủ tài sản', 'Đường/Địa chỉ chi tiết', 'Tỉnh/Thành phố', 'Quận/Huyện', 'Phường/Xã',
      'CMND của chủ tài sản trên giấy GCN', 'Vợ/Chồng chủ tài sản', 'Ngày sinh vợ/chồng chủ tài sản', 'Quốc tịch vợ/chồng chủ tài sản',
      'Tình trạng hôn nhân vợ/chồng chủ tài sản', 'Địa chỉ thường trú vợ/chồng chủ tài sản', 'Đường/Địa chỉ chi tiết', 'Tỉnh/Thành phố', 'Quận/Huyện', 'Phường/Xã',
      'CMND vợ/chồng chủ tài sản', 'CMND của vợ/chồng chủ tài sản trên giấy GCN', 'Uỷ quyền ký HSTS chủ tài sản'
    ]
  },
  tai_san_ctt: {
    label: 'Tài sản CTT',
    structure: 'horizontal',
    valueRows: 1,
    description: 'Dòng 1: Header | Dòng 2: Giá trị',
    required: false,
    fields: [
      'Trạng thái căn khai thác', 'Tên dự án trên hợp đồng', 'Địa chỉ dự án', 'Ngày chi hộ của CTT', 'Ngày tham chiếu chi hộ', 'Đơn vị hỗ trợ lãi suất',
      'Có yêu cầu bội số của 5%', 'Tên chủ đầu tư', 'Địa chỉ chủ đầu tư', 'ĐKKD Chủ đầu tư', 'Mã số thuế', 'Hợp đồng hợp tác', 'Ngày ký hợp đồng hợp tác',
      'Số tài khoản thụ hưởng', 'Tên tài khoản thụ hưởng', 'Ngân hàng thụ hưởng', 'CN Ngân hàng thụ hưởng', 'Đại diện chủ đầu tư', 'Chức vụ', 'Thông tin đại diện',
      'Uỷ quyền', 'Số HĐMB', 'Ngày ký HĐMB', 'Giá NET', 'Giá VAT', 'Kinh phí bảo trì', 'Ngày dự kiến bàn giao', 'Tháng chặn hỗ trợ lãi suất', 'Ngày chặn hỗ trợ ls',
      'Tháng hỗ trợ phí TNKH', 'Ngày chặn hỗ trợ phí TNKH', 'Tháng chặn hỗ trợ lãi suất', 'Ngày chặn hỗ trợ ls', 'Tháng hỗ trợ phí TNTH', 'Ngày chặn hỗ trợ phí TNTH',
      'Trạng thái tài sản', 'Trạng thái chuyển nhượng', 'Tên bên chuyển nhượng', 'Xác nhận đủ vốn tự có', 'Tỷ lệ hỗ trợ lãi suất tối đa (net)',
      'Tỷ lệ hỗ trợ lãi suất tối đa (vat)', 'Tỷ lệ HTLS tối đa kinh phí bảo trì', 'Code chính sách HTLS lần 1', 'Tỷ lệ HTLS (net) lần 1', 'Tỷ lệ HTLS (vat) lần 1',
      'Tỷ lệ HTLS (kpbt) lần 1', 'Tỷ lệ vốn tự có (vat) lần 1', 'Tỷ lệ VTC kinh phí bảo trì lần 1', 'Code chính sách HTLS lần 2', 'Tỷ lệ HTLS (net) lần 2',
      'Tỷ lệ HTLS (vat) lần 2', 'Tỷ lệ HTLS (kpbt) lần 2', 'Tỷ lệ vốn tự có (net) lần 2', 'Tỷ lệ vốn tự có (vat) lần 2', 'Code chính sách HTLS lần 3', 'Tỷ lệ HTLS (net) lần 3',
      'Tỷ lệ HTLS (vat) lần 3', 'Tỷ lệ HTLS (kpbt) lần 3', 'Tỷ lệ vốn tự có (net) lần 3', 'Tỷ lệ vốn tự có (vat) lần 3', 'Tên người ký trên HĐMB', 'CMND', 'Địa chỉ',
      'Tên người ký trên HĐMB 2', 'CMND 2', 'Địa chỉ 2', 'Code căn hộ', 'Trạng thái giao nhà', 'YC giữ lại 5% cuối'
    ]
  },
  thong_tin_chuyen_tien: {
    label: 'Thông tin chuyển tiền',
    structure: 'horizontal',
    valueRows: 1,
    description: 'Dòng 1: Header | Dòng 2: Giá trị',
    required: false,
    fields: [
      'ID', 'contractld', 'kunnld', 'cusName', 'paymentMethod', 'accountNo', 'bankName', 'bankCode', 'branchCode', 'amount', 'content', 'tempLockedMethod'
    ]
  },
  thu_phi_tnth: {
    label: 'Thu phí TNTH',
    structure: 'horizontal',
    valueRows: 3,
    description: 'Dòng 1: Header | Dòng 2-4: Giá trị (3 dòng)',
    required: false,
    fields: [
      'phase', 'fromTime', 'toTime', 'fee', 'feeCode', 'freePeriod'
    ]
  },
  han_muc: {
    label: 'Hạn mức',
    structure: 'horizontal',
    valueRows: 1,
    description: 'Dòng 1: Header | Dòng 2: Giá trị',
    required: false,
    fields: [
      'Tên hạn mức tiện ích', 'Giá trị được phê duyệt', 'Giá trị hạn mức sản phẩm phân bổ trên SC', 'Ngày hạn mức được phê duyệt', 'Ngày hạn mức tiện ích hết hạn',
      'Loại hình giao dịch', 'Thời hạn vay', 'Thời hạn tối đa mỗi kunn'
    ]
  },
  tai_tai_tro: {
    label: 'Tài tài trợ',
    structure: 'horizontal',
    valueRows: 1,
    description: 'Dòng 1: Header | Dòng 2: Giá trị',
    required: false,
    fields: [
      'Ngân hàng đang tài trợ', 'Giá trị tài trợ', 'Ngày đáo hạn', 'Mục đích tài trợ'
    ]
  }
};

// Freeze FILE_TYPES to prevent accidental modification
Object.keys(FILE_TYPES).forEach(key => {
  Object.freeze(FILE_TYPES[key].fields);
  Object.freeze(FILE_TYPES[key]);
});
Object.freeze(FILE_TYPES);

// ============================================
// FILE VALIDATION UTILITIES
// ============================================
const FileValidator = {
  /**
   * Read headers from an uploaded Excel file
   * Returns: { headers: string[], headerRow: number }
   */
  readHeaders(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const wb = XLSX.read(data, { type: 'array', sheetRows: 20 });
          const sheetName = wb.SheetNames[0];
          const sheet = wb.Sheets[sheetName];
          if (!sheet || !sheet['!ref']) {
            resolve({ headers: [], allHeaders: [] });
            return;
          }
          const range = XLSX.utils.decode_range(sheet['!ref']);
          const headers = [];

          // For horizontal structure: read header row (row 0)
          for (let col = range.s.c; col <= range.e.c; col++) {
            const cell = sheet[XLSX.utils.encode_cell({ r: 0, c: col })];
            if (cell && cell.v !== undefined && String(cell.v).trim()) {
              headers.push({ name: String(cell.v).trim(), col: col });
            }
          }

          // For vertical structure: read column A names
          const verticalHeaders = [];
          for (let row = 0; row <= range.e.r; row++) {
            const cell = sheet[XLSX.utils.encode_cell({ r: row, c: 0 })];
            if (cell && cell.v !== undefined && String(cell.v).trim()) {
              verticalHeaders.push({ name: String(cell.v).trim(), row: row });
            }
          }

          resolve({ headers, verticalHeaders });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  },

  /**
   * Validate uploaded file headers against FILE_TYPES fields
   * Returns: { valid: boolean, missingFields: string[], extraFields: string[], errors: string[] }
   */
  validateHeaders(fileHeaders, fileType) {
    const config = FILE_TYPES[fileType];
    if (!config || !config.fields || config.fields.length === 0) {
      return { valid: true, missingFields: [], extraFields: [], errors: [], matchedFields: [] };
    }

    const expectedFields = config.fields;
    let uploadedNames;

    if (config.structure === 'vertical') {
      // For vertical: column A values are field names
      uploadedNames = fileHeaders.verticalHeaders.map(h => h.name);
    } else {
      // For horizontal: row 1 values are field names (headers)
      uploadedNames = fileHeaders.headers.map(h => h.name);
    }

    const errors = [];
    const missingFields = [];
    const extraFields = [];
    const matchedFields = [];

    // Build a set of unique expected fields for lookup
    const expectedSet = new Set(expectedFields);
    const uploadedSet = new Set(uploadedNames);

    // Categorize uploaded fields: matched vs extra
    uploadedNames.forEach((name, index) => {
      if (expectedSet.has(name)) {
        matchedFields.push(name);
      } else {
        extraFields.push(name);
      }
    });

    // Find expected fields that are NOT in uploaded file
    const expectedUnique = [...new Set(expectedFields)];
    expectedUnique.forEach(field => {
      if (!uploadedSet.has(field)) {
        missingFields.push(field);
      }
    });

    // Build info messages for extra column names (not errors, just info)
    if (config.structure === 'vertical') {
      uploadedNames.forEach((name, index) => {
        if (!expectedSet.has(name)) {
          errors.push(`Dòng ${fileHeaders.verticalHeaders[index].row + 1}: "${name}" không khớp với trường nào`);
        }
      });
    } else {
      fileHeaders.headers.forEach((h, index) => {
        if (!expectedSet.has(h.name)) {
          const colLetter = this.colToLetter(h.col);
          errors.push(`Cột ${colLetter}: "${h.name}" không khớp với trường nào`);
        }
      });
    }

    // NEW LOGIC: File is valid as long as it has at least 1 matched field
    // OR if the file has any uploaded columns at all (even if all are "extra")
    // Files are only invalid if they have ZERO uploaded columns
    const hasAtLeastOneMatch = matchedFields.length > 0;
    const hasAnyColumns = uploadedNames.length > 0;
    
    return {
      valid: hasAnyColumns,  // Accept file as long as it has data columns
      missingFields,
      extraFields,
      matchedFields,
      errors
    };
  },

  colToLetter(col) {
    let s = '';
    let n = col;
    while (n >= 0) {
      s = String.fromCharCode(65 + (n % 26)) + s;
      n = Math.floor(n / 26) - 1;
    }
    return s;
  },

  /**
   * Show validation error modal
   */
  showValidationError(fileType, fileName, errors, missingFields) {
    const config = FILE_TYPES[fileType];
    const existingModal = document.getElementById('modal-validation-error');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'modal-validation-error';
    modal.className = 'modal-overlay';
    modal.style.display = 'flex';
    modal.innerHTML = `
      <div class="modal" style="max-width:600px;">
        <div class="modal-header" style="border-bottom-color:#fee2e2;">
          <h3 style="color:#dc2626;">❌ File không hợp lệ</h3>
          <button class="modal-close" onclick="FileValidator.closeValidationModal()">&times;</button>
        </div>
        <div class="modal-body" style="max-height:60vh;overflow-y:auto;">
          <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px;margin-bottom:16px;">
            <p style="font-weight:600;margin-bottom:4px;">📄 File: <code>${fileName}</code></p>
            <p style="font-size:0.85rem;color:#666;">Loại: <strong>${config.label}</strong></p>
          </div>
          
          <div style="margin-bottom:16px;">
            <h4 style="color:#dc2626;font-size:0.92rem;margin-bottom:8px;">⚠️ Các cột không khớp (${errors.length}):</h4>
            <div style="background:#fff5f5;border-radius:8px;padding:10px;max-height:200px;overflow-y:auto;">
              ${errors.map(e => `<div style="padding:4px 8px;margin:2px 0;border-left:3px solid #dc2626;background:#fff;border-radius:4px;font-size:0.82rem;">${e}</div>`).join('')}
            </div>
          </div>

          ${missingFields.length > 0 ? `
          <div style="margin-bottom:16px;">
            <h4 style="color:#f59e0b;font-size:0.92rem;margin-bottom:8px;">📋 Các trường bị thiếu (${missingFields.length}):</h4>
            <div style="background:#fffbeb;border-radius:8px;padding:10px;max-height:150px;overflow-y:auto;">
              <div style="display:flex;flex-wrap:wrap;gap:4px;">
                ${missingFields.map(f => `<span style="padding:3px 8px;background:#fff;border:1px solid #fcd34d;border-radius:6px;font-size:0.78rem;">${f}</span>`).join('')}
              </div>
            </div>
          </div>` : ''}

          <p style="font-size:0.85rem;color:#666;margin-top:12px;">💡 Vui lòng kiểm tra lại tên các cột trong file Excel và đảm bảo khớp với cấu hình hệ thống.</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary" onclick="FileValidator.closeValidationModal()">Đã hiểu</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  },

  closeValidationModal() {
    const modal = document.getElementById('modal-validation-error');
    if (modal) modal.remove();
  },

  /**
   * Show extra columns prompt modal
   * Returns a Promise that resolves to true (accept) or false (reject)
   */
  showExtraColumnsPrompt(fileType, fileName, extraFields) {
    return new Promise((resolve) => {
      const config = FILE_TYPES[fileType];
      const existingModal = document.getElementById('modal-extra-columns');
      if (existingModal) existingModal.remove();

      // Store the resolve callback globally so button handlers can access it
      FileValidator._extraColsResolve = resolve;

      const modal = document.createElement('div');
      modal.id = 'modal-extra-columns';
      modal.className = 'modal-overlay';
      modal.style.display = 'flex';
      modal.innerHTML = `
        <div class="modal" style="max-width:600px;">
          <div class="modal-header" style="border-bottom-color:#dbeafe;">
            <h3 style="color:#2563eb;">📊 Phát hiện cột mới</h3>
            <button class="modal-close" onclick="FileValidator.resolveExtraCols(false)">&times;</button>
          </div>
          <div class="modal-body" style="max-height:60vh;overflow-y:auto;">
            <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:14px;margin-bottom:16px;">
              <p style="font-weight:600;margin-bottom:4px;">📄 File: <code>${fileName}</code></p>
              <p style="font-size:0.85rem;color:#666;">Loại: <strong>${config.label}</strong></p>
            </div>
            
            <div style="margin-bottom:16px;">
              <p style="font-size:0.9rem;margin-bottom:10px;">File upload chứa <strong>${extraFields.length} cột mới</strong> không có trong cấu hình mặc định:</p>
              <div style="background:#f8fafc;border-radius:8px;padding:12px;max-height:200px;overflow-y:auto;">
                <div style="display:flex;flex-wrap:wrap;gap:6px;">
                  ${extraFields.map(f => `<span style="padding:5px 10px;background:linear-gradient(135deg,#eff6ff,#dbeafe);border:1px solid #93c5fd;border-radius:8px;font-size:0.82rem;font-weight:500;color:#1e40af;">+ ${f}</span>`).join('')}
                </div>
              </div>
            </div>

            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px;">
              <p style="font-weight:600;color:#16a34a;margin-bottom:4px;">Bạn có muốn thêm dữ liệu từ các cột mới này?</p>
              <p style="font-size:0.82rem;color:#666;">Nếu chọn "Có", dữ liệu từ các cột mới sẽ được import vào hệ thống. Nếu "Không", chỉ dữ liệu từ các cột đã cấu hình sẽ được sử dụng.</p>
            </div>
          </div>
          <div class="modal-footer" style="gap:10px;">
            <button class="btn btn-outline" onclick="FileValidator.resolveExtraCols(false)">❌ Không, bỏ qua</button>
            <button class="btn btn-primary" onclick="FileValidator.resolveExtraCols(true)" style="background:linear-gradient(135deg,#16a34a,#22c55e);">✓ Có, thêm dữ liệu</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    });
  },

  resolveExtraCols(accept) {
    const modal = document.getElementById('modal-extra-columns');
    if (modal) modal.remove();
    if (FileValidator._extraColsResolve) {
      FileValidator._extraColsResolve(accept);
      FileValidator._extraColsResolve = null;
    }
  },

  /**
   * Show stored last error for a file type (used by inline click handlers)
   */
  showLastError(fileType) {
    const err = (this._lastErrors || {})[fileType];
    if (err) {
      this.showValidationError(fileType, err.fileName, err.errors, err.missingFields);
    }
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
      const excelExts = ['xlsx', 'xls', 'csv'];
      const wordExts = ['doc', 'docx'];
      if (!excelExts.includes(ext) && !wordExts.includes(ext)) {
        App.toast(`"${file.name}" không phải file Excel/CSV hoặc Word`, 'warning');
        continue;
      }
      // avoid duplicates
      if (this._sources.some(s => s.filename === file.name)) {
        App.toast(`"${file.name}" đã được thêm rồi`, 'info');
        continue;
      }
      try {
        let fields, htmlContent = null, isHighFidelity = false;
        const isWord = wordExts.includes(ext);
        if (isWord) {
          const result = await this._readWordFields(file);
          fields = result.fields;
          htmlContent = result.htmlContent;
          isHighFidelity = result._isHighFidelity || false;
        } else {
          fields = await this._readHeaders(file);
        }
        const source = {
          id: 'ds_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
          name: file.name.replace(/\.[^.]+$/, ''),
          filename: file.name,
          fileType: isWord ? 'word' : 'excel',
          fields,
          htmlContent,
          isHighFidelity
        };
        this._sources.push(source);
        App.toast(`Đã đọc ${fields.length} trường từ "${file.name}"`, 'success');

        // Auto-load Word content into editor if on Word editor page
        if (isWord && htmlContent) {
          this._promptLoadWordContent(source);
        }
      } catch (err) {
        console.error(err);
        App.toast(`Lỗi đọc file "${file.name}": ${err.message}`, 'error');
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
    const meta = this._sources.map(s => ({
      id: s.id, name: s.name, filename: s.filename,
      fileType: s.fileType || 'excel',
      fields: s.fields,
      htmlContent: s.htmlContent || null,
      isHighFidelity: s.isHighFidelity || false
    }));
    try { localStorage.setItem('excelmapper_datasources', JSON.stringify(meta)); } catch (_) { }
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
    } catch (_) { }
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

  /* ── read field names from Word document (.doc/.docx) ── */
  /* Uses mammoth.js for field extraction + docx-preview for formatting-preserving HTML */
  _readWordFields(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target.result;
          const ext = file.name.split('.').pop().toLowerCase();

          // === Step 1: Extract fields using mammoth.js (text analysis) ===
          const fields = [];
          const addField = (val) => {
            const trimmed = val.trim();
            if (trimmed && trimmed.length > 0 && trimmed.length < 200 && !fields.includes(trimmed)) {
              fields.push(trimmed);
            }
          };

          let mammothHtmlStr = '';
          if (typeof mammoth !== 'undefined') {
            try {
              const [htmlResult, textResult] = await Promise.all([
                mammoth.convertToHtml({ arrayBuffer: arrayBuffer.slice(0) }),
                mammoth.extractRawText({ arrayBuffer: arrayBuffer.slice(0) })
              ]);
              mammothHtmlStr = htmlResult.value;
              const fullText = textResult.value;

              // Strategy 1: Extract {{placeholder}} patterns
              const placeholderRegex = /\{\{([^}]+)\}\}/g;
              let match;
              while ((match = placeholderRegex.exec(fullText)) !== null) {
                addField(match[1].trim());
              }

              // Strategy 2: Extract table headers
              if (mammothHtmlStr.includes('<table')) {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = mammothHtmlStr;
                tempDiv.querySelectorAll('table').forEach(table => {
                  const firstRow = table.querySelector('tr');
                  if (firstRow) {
                    firstRow.querySelectorAll('th, td').forEach(cell => {
                      const text = cell.textContent.trim();
                      if (text) addField(text);
                    });
                  }
                });
              }

              // Strategy 3: Extract key:value patterns
              const lines = fullText.split('\n');
              lines.forEach(line => {
                const trimLine = line.trim();
                if (!trimLine) return;
                const colonMatch = trimLine.match(/^([^:]{2,60})\s*:\s*(.+)/);
                if (colonMatch) {
                  const key = colonMatch[1].trim();
                  if (key && !key.match(/^(http|ftp|\d{1,2}|\d+\/\d+)/i) && key.length >= 2) {
                    addField(key);
                  }
                }
              });

              // Strategy 4: Extract labeled lines (Vietnamese patterns)
              const labelPatterns = [
                /^(?:Tên|Họ tên|Số|Mã số|Ngày|\u0110ịa chỉ|SĐT|Điện thoại|Email|CMND|CCCD|MST)\b/i,
                /^[A-ZĐÀ-ỹ][a-zđà-ỹ]+(?:\s+[A-ZĐÀ-ỹa-zđà-ỹ]+){0,6}\s*$/
              ];
              lines.forEach(line => {
                const trimLine = line.trim();
                if (!trimLine || trimLine.length > 80 || trimLine.length < 2) return;
                for (const pattern of labelPatterns) {
                  if (pattern.test(trimLine) && !fields.includes(trimLine)) {
                    if (trimLine.split(/\s+/).length <= 8 && !trimLine.includes('.')) {
                      addField(trimLine);
                    }
                    break;
                  }
                }
              });
            } catch (mammothErr) {
              console.warn('mammoth field extraction failed:', mammothErr);
            }
          }

          // === Step 2: Generate high-fidelity HTML ===
          let htmlContent = mammothHtmlStr;
          let isHighFidelity = false;

          // Try docx-preview for .docx files (preserves original formatting)
          if (ext === 'docx' && typeof docx !== 'undefined' && docx.renderAsync) {
            try {
              htmlContent = await DataSources._renderDocxPreview(arrayBuffer.slice(0));
              isHighFidelity = true;
              App.toast('Đã giữ nguyên định dạng gốc của file Word', 'success');
            } catch (docxErr) {
              console.warn('docx-preview thất bại, dùng mammoth:', docxErr);
              htmlContent = mammothHtmlStr; // fallback
            }
          }

          // Mark high-fidelity for the source object
          const result = { fields, htmlContent };
          if (isHighFidelity) result._isHighFidelity = true;
          resolve(result);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  },

  /* ── Render .docx with docx-preview (preserves original formatting) ── */
  async _renderDocxPreview(arrayBuffer) {
    // Create temporary containers for rendering
    const tempContainer = document.createElement('div');
    tempContainer.style.cssText = 'position:absolute;left:-9999px;top:-9999px;visibility:hidden;width:210mm;';
    document.body.appendChild(tempContainer);

    const tempStyleEl = document.createElement('style');
    document.head.appendChild(tempStyleEl);

    try {
      await docx.renderAsync(arrayBuffer, tempContainer, tempStyleEl, {
        className: 'docx-import',
        inWrapper: true,
        ignoreWidth: false,
        ignoreHeight: true,
        ignoreFonts: false,
        breakPages: true,
        renderHeaders: true,
        renderFooters: true,
        useBase64URL: true,
        experimental: true
      });

      // Convert class-based CSS to inline styles for portability
      const cssText = tempStyleEl.textContent || tempStyleEl.innerText || '';
      this._applyInlineStyles(tempContainer, cssText);

      // Extract content from rendered pages
      let html = '';
      const sections = tempContainer.querySelectorAll('section');
      if (sections.length > 0) {
        sections.forEach((section, index) => {
          const article = section.querySelector('article') || section;
          if (index > 0) {
            // Add page break marker between pages
            html += '<div style="page-break-before:always;break-before:page;height:0;margin:0;padding:0;"></div>';
          }
          html += article.innerHTML;
        });
      } else {
        // No sections found, extract all content
        html = tempContainer.innerHTML;
      }

      // Clean up wrapper artifacts from docx-preview
      html = html.replace(/<div[^>]*class="[^"]*docx-import[^"]*"[^>]*>/gi, '<div>')
                 .replace(/class="[^"]*docx-import[^"]*"/gi, '');

      return html;
    } finally {
      // Always cleanup temp elements
      tempContainer.remove();
      tempStyleEl.remove();
    }
  },

  /* ── Convert CSS class-based styles to inline styles for portability ── */
  _applyInlineStyles(container, cssText) {
    const tempStyle = document.createElement('style');
    tempStyle.textContent = cssText;
    document.head.appendChild(tempStyle);

    try {
      const sheet = tempStyle.sheet;
      if (sheet && sheet.cssRules) {
        for (let i = 0; i < sheet.cssRules.length; i++) {
          const rule = sheet.cssRules[i];
          if (rule.selectorText && rule.style && rule.style.length > 0) {
            try {
              const elements = container.querySelectorAll(rule.selectorText);
              elements.forEach(el => {
                for (let j = 0; j < rule.style.length; j++) {
                  const prop = rule.style[j];
                  const val = rule.style.getPropertyValue(prop);
                  const priority = rule.style.getPropertyPriority(prop);
                  if (val && !el.style.getPropertyValue(prop)) {
                    el.style.setProperty(prop, val, priority);
                  }
                }
              });
            } catch (selectorErr) {
              // Skip invalid selectors
            }
          }
        }
      }
    } finally {
      tempStyle.remove();
    }

    // Remove class attributes since styles are now inline
    container.querySelectorAll('[class]').forEach(el => {
      el.removeAttribute('class');
    });
  },

  /* ── Prompt user to load Word content into the editor ── */
  _promptLoadWordContent(source) {
    const editor = document.getElementById('word-editor-area');
    if (!editor) return; // not on Word editor page

    // Check if editor page is visible
    const editorPage = document.getElementById('page-word-editor');
    if (!editorPage || !editorPage.classList.contains('active')) return;

    const editorContent = editor.textContent.trim();
    if (editorContent.length > 0) {
      // Editor has content, ask before replacing
      this._showLoadConfirmModal(source);
    } else {
      // Editor is empty, load directly
      this.loadWordContentToEditor(source.id);
    }
  },

  /* ── Show confirmation modal before loading Word content ── */
  _showLoadConfirmModal(source) {
    // Remove any existing modal
    const existing = document.getElementById('modal-load-word-confirm');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'modal-load-word-confirm';
    modal.style.cssText = 'position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);';
    modal.innerHTML = `
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:28px 32px;max-width:480px;width:90%;">
        <h3 style="margin-bottom:12px;font-size:1.1rem;">📄 Tải nội dung Word vào Editor</h3>
        <p style="color:var(--text-secondary);font-size:0.88rem;margin-bottom:8px;">File: <strong>${source.filename}</strong></p>
        <p style="color:var(--text-secondary);font-size:0.85rem;margin-bottom:20px;">Editor hiện có nội dung. Bạn muốn:</p>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button class="btn btn-primary" onclick="DataSources.loadWordContentToEditor('${source.id}','replace');document.getElementById('modal-load-word-confirm').remove()">Thay thế toàn bộ</button>
          <button class="btn btn-outline" onclick="DataSources.loadWordContentToEditor('${source.id}','append');document.getElementById('modal-load-word-confirm').remove()">Thêm vào cuối</button>
          <button class="btn btn-outline" onclick="document.getElementById('modal-load-word-confirm').remove()" style="margin-left:auto;">Bỏ qua</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  },

  /* ── Load Word HTML content into the Word editor ── */
  loadWordContentToEditor(sourceId, mode = 'replace') {
    const source = this._sources.find(s => s.id === sourceId);
    if (!source || !source.htmlContent) {
      App.toast('Không tìm thấy nội dung Word', 'warning');
      return;
    }

    const editor = document.getElementById('word-editor-area');
    if (!editor) {
      App.toast('Vui lòng mở trang Tạo Word Template trước', 'info');
      return;
    }

    // Use high-fidelity HTML directly (from docx-preview) or enhance mammoth output
    let html = source.isHighFidelity
      ? source.htmlContent
      : this._enhanceWordHtml(source.htmlContent);

    if (mode === 'append') {
      editor.innerHTML += '<hr style="margin:20px 0;border:1px dashed var(--border);">' + html;
    } else {
      editor.innerHTML = html;
    }

    // Update template name if empty
    const nameInput = document.getElementById('word-template-name');
    if (nameInput && !nameInput.value.trim()) {
      nameInput.value = source.name;
    }

    App.toast(`Đã tải nội dung "${source.filename}" vào editor`, 'success');

    // Update placeholders list
    if (typeof WordEditor !== 'undefined') {
      WordEditor.updatePlaceholdersList();
    }
  },

  /* ── Enhance mammoth HTML output for better display in editor ── */
  _enhanceWordHtml(rawHtml) {
    // Create temp container to process
    const temp = document.createElement('div');
    temp.innerHTML = rawHtml;

    // Style tables for better visibility
    temp.querySelectorAll('table').forEach(table => {
      table.style.cssText = 'width:100%;border-collapse:collapse;margin:10px 0;';
    });
    temp.querySelectorAll('th, td').forEach(cell => {
      if (!cell.style.border) {
        cell.style.cssText += 'border:1px solid #999;padding:6px 10px;';
      }
    });
    temp.querySelectorAll('th').forEach(th => {
      th.style.cssText += 'background:#f0f0f5;font-weight:600;';
    });

    // Ensure paragraphs have some spacing
    temp.querySelectorAll('p').forEach(p => {
      if (!p.style.margin) p.style.margin = '4px 0';
    });

    return temp.innerHTML;
  },

  /* ── render file list in editor panel ── */
  _renderList() {
    const html = this._sources.length === 0 ? '' : this._sources.map(src => {
      const isWord = src.fileType === 'word';
      const icon = isWord ? '📝' : '📊';
      const typeLabel = isWord ? 'Word' : 'Excel';
      const loadBtn = (isWord && src.htmlContent)
        ? `<button class="ds-load-btn" onclick="event.stopPropagation();DataSources.loadWordContentToEditor('${src.id}')" title="Tải nội dung vào Editor">📥 Tải vào Editor</button>`
        : '';
      return `
      <div class="ds-file-item">
        <div class="ds-file-info">
          <span class="ds-file-icon">${icon}</span>
          <div>
            <div class="ds-file-name">${src.filename}</div>
            <div class="ds-file-fields">${src.fields.length} trường (${typeLabel}): ${src.fields.slice(0, 4).join(', ')}${src.fields.length > 4 ? '…' : ''}</div>
            ${loadBtn}
          </div>
        </div>
        <button class="ds-file-remove" onclick="DataSources.removeSource('${src.id}')" title="Xóa">✕</button>
      </div>
    `;
    }).join('');

    // Render to both spreadsheet and word editor panels
    const container = document.getElementById('ds-files-list');
    if (container) container.innerHTML = html;
    const wordContainer = document.getElementById('word-ds-files-list');
    if (wordContainer) wordContainer.innerHTML = html;
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
      setTimeout(() => {
        const sc = document.getElementById('spreadsheet-container');
        if (sc) sc.focus();
      }, 100);
    }
    if (page === 'generate') Generator.initStep1();
    // Master Data
    if (page === 'master-data' && typeof MasterData !== 'undefined') MasterData.initPage();
    // Word pages
    if (page === 'word-templates' && typeof WordEditor !== 'undefined') WordEditor.renderTemplatesList();
    if (page === 'word-editor' && typeof WordEditor !== 'undefined') {
      if (!WordState.editingId) WordEditor.resetEditor();
    }
    if (page === 'word-generate' && typeof WordGenerator !== 'undefined') WordGenerator.initStep1();
  },

  updateDashboard() {
    const wordCount = (typeof WordState !== 'undefined') ? WordState.templates.length : 0;
    document.getElementById('stat-templates').textContent = AppState.templates.length + wordCount;
    const wordExports = (typeof WordState !== 'undefined') ? WordState.exportCount : 0;
    document.getElementById('stat-exports').textContent = AppState.exportCount + wordExports;
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
        } catch (e) { }
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
// MULTI-SHEET IMPORT - Import multiple sheets from 1 file
// ============================================
const MultiSheetImport = {
  /**
   * Handle drag-and-drop of a file
   */
  handleDrop(event, mode) {
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      this.handleFile(files[0], mode);
    }
  },

  /**
   * Main handler: read the Excel file, extract sheet names, match to FILE_TYPES
   * @param {File} file - The uploaded Excel file
   * @param {string} mode - 'excel' or 'word'
   */
  async handleFile(file, mode) {
    if (!file) return;

    // Validate file type
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls'].includes(ext)) {
      App.toast('Vui lòng chọn file Excel (.xlsx hoặc .xls)', 'warning');
      return;
    }

    const resultEl = document.getElementById(mode === 'word' ? 'word-multi-sheet-result' : 'multi-sheet-result');

    try {
      App.toast('Đang phân tích file...', 'info');
      resultEl.style.display = 'block';
      resultEl.innerHTML = '<div class="ms-loading"><span class="ms-spinner"></span> Đang đọc file và phân tích các sheet...</div>';

      // Read the workbook
      const arrayBuffer = await this._readFileAsArrayBuffer(file);
      const data = new Uint8Array(arrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetNames = workbook.SheetNames;

      if (sheetNames.length === 0) {
        resultEl.innerHTML = '<div class="ms-error">❌ File không có sheet nào</div>';
        App.toast('File không có sheet nào', 'error');
        return;
      }

      if (sheetNames.length === 1) {
        resultEl.innerHTML = '<div class="ms-warning">⚠️ File chỉ có 1 sheet. Vui lòng sử dụng phần upload riêng lẻ bên dưới.</div>';
        App.toast('File chỉ có 1 sheet, hãy upload riêng lẻ', 'info');
        return;
      }

      // Match sheet names to FILE_TYPES
      const matches = this._matchSheets(sheetNames, workbook);

      // Render matching result
      this._renderMatchResult(resultEl, file, sheetNames, matches, mode);

    } catch (err) {
      console.error('MultiSheetImport error:', err);
      resultEl.innerHTML = `<div class="ms-error">❌ Lỗi: ${err.message}</div>`;
      App.toast('Lỗi khi đọc file: ' + err.message, 'error');
    }
  },

  /**
   * Read a file as ArrayBuffer
   */
  _readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  },

  /**
   * Match sheet names to FILE_TYPES keys using fuzzy matching
   */
  _matchSheets(sheetNames, workbook) {
    const fileTypeKeys = Object.keys(FILE_TYPES);
    const matches = [];

    for (const sheetName of sheetNames) {
      const sheetLower = sheetName.toLowerCase().trim();
      let bestKey = null;
      let bestScore = 0;
      let matchType = '';

      for (const key of fileTypeKeys) {
        const keyLower = key.toLowerCase();
        const label = FILE_TYPES[key].label.toLowerCase();
        let score = 0;
        let type = '';

        // Exact match with key
        if (sheetLower === keyLower) {
          score = 100; type = 'exact';
        }
        // Exact match with label
        else if (sheetLower === label) {
          score = 95; type = 'label';
        }
        // Sheet contains key or vice versa
        else if (sheetLower.includes(keyLower) || keyLower.includes(sheetLower)) {
          score = 80; type = 'partial';
        }
        // Sheet contains label or vice versa
        else if (sheetLower.includes(label) || label.includes(sheetLower)) {
          score = 75; type = 'partial';
        }
        // Normalize: remove spaces, underscores, dashes and compare
        else {
          const normalizedSheet = sheetLower.replace(/[\s_\-]/g, '');
          const normalizedKey = keyLower.replace(/[\s_\-]/g, '');
          const normalizedLabel = label.replace(/[\s_\-]/g, '');
          if (normalizedSheet === normalizedKey || normalizedSheet === normalizedLabel) {
            score = 90; type = 'normalized';
          }
          else if (normalizedSheet.includes(normalizedKey) || normalizedKey.includes(normalizedSheet)) {
            score = 70; type = 'fuzzy';
          }
          else if (normalizedSheet.includes(normalizedLabel) || normalizedLabel.includes(normalizedSheet)) {
            score = 65; type = 'fuzzy';
          }
        }

        if (score > bestScore) {
          bestScore = score;
          bestKey = key;
          matchType = type;
        }
      }

      // Get sheet row count for info
      const sheet = workbook.Sheets[sheetName];
      let rowCount = 0;
      if (sheet && sheet['!ref']) {
        try {
          const range = XLSX.utils.decode_range(sheet['!ref']);
          rowCount = range.e.r - range.s.r + 1;
        } catch(e) {}
      }

      matches.push({
        sheetName,
        matchedKey: bestScore >= 50 ? bestKey : null,
        score: bestScore,
        matchType,
        rowCount,
        selectedKey: bestScore >= 50 ? bestKey : '' // user can override
      });
    }

    return matches;
  },

  /**
   * Render the match result UI with dropdown overrides
   */
  _renderMatchResult(container, file, sheetNames, matches, mode) {
    const matchedCount = matches.filter(m => m.matchedKey).length;

    // Build FILE_TYPE options for dropdown
    const fileTypeOptions = Object.keys(FILE_TYPES).map(key => {
      return `<option value="${key}">${FILE_TYPES[key].label} (${key})</option>`;
    }).join('');

    let html = `
      <div class="ms-result-card">
        <div class="ms-result-header">
          <div class="ms-file-info">
            <span class="ms-file-icon">📊</span>
            <div>
              <strong>${file.name}</strong>
              <span class="ms-file-meta">${sheetNames.length} sheets • ${matchedCount} tự động khớp</span>
            </div>
          </div>
        </div>
        <div class="ms-match-table">
          <div class="ms-match-row ms-match-header-row">
            <span class="ms-col-sheet">Sheet trong file</span>
            <span class="ms-col-arrow"></span>
            <span class="ms-col-type">Loại dữ liệu tương ứng</span>
            <span class="ms-col-info">Dữ liệu</span>
            <span class="ms-col-status">Trạng thái</span>
          </div>`;

    matches.forEach((m, idx) => {
      const statusClass = m.matchedKey ? 'ms-matched' : 'ms-unmatched';
      const statusText = m.matchedKey ? '✓ Khớp' : '⚠ Chưa khớp';
      const statusIcon = m.matchedKey ? '✅' : '⚠️';

      html += `
          <div class="ms-match-row ${statusClass}" data-idx="${idx}">
            <span class="ms-col-sheet">
              <span class="ms-sheet-badge">${m.sheetName}</span>
            </span>
            <span class="ms-col-arrow">→</span>
            <span class="ms-col-type">
              <select class="ms-type-select" id="ms-select-${mode}-${idx}" onchange="MultiSheetImport.onMappingChange(${idx}, this.value, '${mode}')">
                <option value="">-- Bỏ qua --</option>
                ${fileTypeOptions}
              </select>
            </span>
            <span class="ms-col-info">${m.rowCount > 0 ? m.rowCount + ' dòng' : '—'}</span>
            <span class="ms-col-status">
              <span class="ms-status-badge ${statusClass}" id="ms-status-${mode}-${idx}">${statusIcon} ${statusText}</span>
            </span>
          </div>`;
    });

    html += `
        </div>
        <div class="ms-actions">
          <button class="btn btn-primary ms-apply-btn" onclick="MultiSheetImport.applyImport('${mode}')">
            <svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\">
              <path d=\"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4\"/>
              <polyline points=\"7 10 12 15 17 10\"/><line x1=\"12\" y1=\"15\" x2=\"12\" y2=\"3\"/>
            </svg>
            Áp dụng ${matchedCount} sheet đã khớp
          </button>
          <button class="btn btn-outline" onclick="MultiSheetImport.clearResult('${mode}')">
            Hủy
          </button>
        </div>
      </div>`;

    container.innerHTML = html;

    // Set selected values in dropdowns
    matches.forEach((m, idx) => {
      const select = document.getElementById(`ms-select-${mode}-${idx}`);
      if (select && m.selectedKey) {
        select.value = m.selectedKey;
      }
    });

    // Store state
    this._currentFile = file;
    this._currentMatches = matches;
    this._currentMode = mode;
  },

  /**
   * Handle user changing a sheet mapping dropdown
   */
  onMappingChange(idx, value, mode) {
    if (!this._currentMatches) return;
    this._currentMatches[idx].selectedKey = value;

    const statusEl = document.getElementById(`ms-status-${mode}-${idx}`);
    const rowEl = statusEl ? statusEl.closest('.ms-match-row') : null;

    if (value) {
      if (statusEl) statusEl.innerHTML = '✅ ✓ Khớp';
      if (statusEl) statusEl.className = 'ms-status-badge ms-matched';
      if (rowEl) { rowEl.classList.add('ms-matched'); rowEl.classList.remove('ms-unmatched'); }
    } else {
      if (statusEl) statusEl.innerHTML = '⏭️ Bỏ qua';
      if (statusEl) statusEl.className = 'ms-status-badge ms-unmatched';
      if (rowEl) { rowEl.classList.remove('ms-matched'); rowEl.classList.add('ms-unmatched'); }
    }

    // Update apply button count
    const matchedCount = this._currentMatches.filter(m => m.selectedKey).length;
    const applyBtn = document.querySelector(`#${mode === 'word' ? 'word-' : ''}multi-sheet-result .ms-apply-btn`);
    if (applyBtn) {
      applyBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Áp dụng ${matchedCount} sheet đã khớp`;
    }
  },

  /**
   * Apply the multi-sheet import: extract each matched sheet as a separate "file" 
   * and load it into the corresponding upload slot
   */
  async applyImport(mode) {
    if (!this._currentFile || !this._currentMatches) return;

    const matches = this._currentMatches.filter(m => m.selectedKey);
    if (matches.length === 0) {
      App.toast('Chưa có sheet nào được mapping. Hãy chọn loại dữ liệu cho ít nhất 1 sheet.', 'warning');
      return;
    }

    // Check for duplicate mappings
    const usedKeys = {};
    for (const m of matches) {
      if (usedKeys[m.selectedKey]) {
        App.toast(`Loại "${FILE_TYPES[m.selectedKey].label}" đã được gán cho sheet "${usedKeys[m.selectedKey]}". Mỗi loại chỉ được gán 1 sheet.`, 'warning');
        return;
      }
      usedKeys[m.selectedKey] = m.sheetName;
    }

    try {
      App.toast('Đang tách và nạp các sheet...', 'info');

      // Read original workbook
      const arrayBuffer = await this._readFileAsArrayBuffer(this._currentFile);
      const data = new Uint8Array(arrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });

      let successCount = 0;

      for (const match of matches) {
        const sheet = workbook.Sheets[match.sheetName];
        if (!sheet) continue;

        // Create a new workbook with just this sheet
        const newWb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(newWb, sheet, match.sheetName);

        // Write to array buffer then create a File object
        const wbOut = XLSX.write(newWb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbOut], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const sheetFile = new File([blob], `${match.sheetName}.xlsx`, {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });

        // Load into the appropriate state
        const fileType = match.selectedKey;

        if (mode === 'word') {
          WordState.uploadedFiles[fileType] = sheetFile;
          // Update UI
          const slot = document.getElementById(`word-slot-${fileType}`);
          const info = document.getElementById(`word-file-info-${fileType}`);
          const nameEl = document.getElementById(`word-file-name-${fileType}`);
          if (slot) slot.classList.add('has-file');
          if (info) info.style.display = 'flex';
          if (nameEl) nameEl.textContent = `📑 ${match.sheetName} (từ ${this._currentFile.name})`;
        } else {
          AppState.uploadedFiles[fileType] = sheetFile;
          // Update UI
          const slot = document.getElementById(`slot-${fileType}`);
          const info = document.getElementById(`file-info-${fileType}`);
          const nameEl = document.getElementById(`file-name-${fileType}`);
          if (slot) slot.classList.add('has-file');
          if (info) info.style.display = 'flex';
          if (nameEl) nameEl.textContent = `📑 ${match.sheetName} (từ ${this._currentFile.name})`;
        }

        successCount++;
      }

      // Update result UI to show success
      const resultEl = document.getElementById(mode === 'word' ? 'word-multi-sheet-result' : 'multi-sheet-result');
      resultEl.innerHTML = `
        <div class="ms-success">
          <span class="ms-success-icon">✅</span>
          <div>
            <strong>Đã nạp thành công ${successCount} sheet từ "${this._currentFile.name}"</strong>
            <p>${matches.map(m => `<span class="ms-success-tag">${m.sheetName} → ${FILE_TYPES[m.selectedKey].label}</span>`).join(' ')}</p>
          </div>
          <button class="ms-clear-btn" onclick="MultiSheetImport.clearResult('${mode}')">✕</button>
        </div>`;

      App.toast(`✓ Đã nạp thành công ${successCount} sheet!`, 'success');

    } catch (err) {
      console.error('MultiSheetImport apply error:', err);
      App.toast('Lỗi khi tách sheet: ' + err.message, 'error');
    }
  },

  /**
   * Clear the multi-sheet result area
   */
  clearResult(mode) {
    const resultEl = document.getElementById(mode === 'word' ? 'word-multi-sheet-result' : 'multi-sheet-result');
    if (resultEl) {
      resultEl.style.display = 'none';
      resultEl.innerHTML = '';
    }
    this._currentFile = null;
    this._currentMatches = null;
  }
};

// ============================================
// GENERATOR - Generate Documents
// ============================================
const Generator = {
  // Track extra columns acceptance per file type
  _acceptedExtraCols: {},

  initUploadSlots() {
    const grid = document.getElementById('upload-grid');
    if (!grid) return;
    this._acceptedExtraCols = {};

    grid.innerHTML = Object.keys(FILE_TYPES).map(key => {
      const config = FILE_TYPES[key];
      const fieldCount = config.fields ? config.fields.length : 0;
      return `
        <div class="upload-slot" id="slot-${key}">
          <div class="upload-slot-header">
            <span class="upload-slot-title">${config.label}</span>
            <span class="upload-slot-badge optional">Tùy chọn</span>
          </div>
          <div class="upload-slot-desc">${config.description} — <strong>${fieldCount} trường cố định</strong></div>
          <div class="upload-input-wrapper">
            <input type="file" accept=".xlsx,.xls,.csv"
              id="file-${key}"
              onchange="Generator.onFileSelected('${key}', this)">
          </div>
          <div class="upload-file-info" id="file-info-${key}" style="display:none;">
            ✓ <span id="file-name-${key}"></span>
          </div>
          <div class="upload-file-error" id="file-error-${key}" style="display:none;color:#dc2626;font-size:0.82rem;padding:6px 10px;background:#fef2f2;border-radius:8px;margin-top:6px;">
          </div>
          <div class="upload-extra-info" id="file-extra-${key}" style="display:none;color:#2563eb;font-size:0.82rem;padding:6px 10px;background:#eff6ff;border-radius:8px;margin-top:6px;">
          </div>
        </div>
      `;
    }).join('');
  },

  async onFileSelected(fileType, input) {
    const slot = document.getElementById(`slot-${fileType}`);
    const info = document.getElementById(`file-info-${fileType}`);
    const nameEl = document.getElementById(`file-name-${fileType}`);
    const errorEl = document.getElementById(`file-error-${fileType}`);
    const extraEl = document.getElementById(`file-extra-${fileType}`);

    // Reset states
    errorEl.style.display = 'none';
    errorEl.innerHTML = '';
    extraEl.style.display = 'none';
    extraEl.innerHTML = '';
    delete this._acceptedExtraCols[fileType];

    if (input.files.length === 0) {
      delete AppState.uploadedFiles[fileType];
      slot.classList.remove('has-file');
      info.style.display = 'none';
      return;
    }

    const file = input.files[0];
    const config = FILE_TYPES[fileType];

    // Validate file headers against fixed fields
    if (config.fields && config.fields.length > 0) {
      try {
        App.toast('Đang kiểm tra cấu trúc file...', 'info');
        const fileHeaders = await FileValidator.readHeaders(file);
        const validation = FileValidator.validateHeaders(fileHeaders, fileType);

        if (!validation.valid) {
          // File has NO data columns at all - reject upload
          delete AppState.uploadedFiles[fileType];
          slot.classList.remove('has-file');
          slot.classList.add('has-error');
          info.style.display = 'none';
          input.value = ''; // Reset file input

          errorEl.innerHTML = '❌ File không có dữ liệu cột nào. Vui lòng kiểm tra lại file.';
          errorEl.style.display = 'block';
          App.toast(`File "${file.name}" không có dữ liệu`, 'error');
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
          const accept = await FileValidator.showExtraColumnsPrompt(fileType, file.name, validation.extraFields);
          if (accept) {
            this._acceptedExtraCols[fileType] = validation.extraFields;
            const existingInfo = extraEl.innerHTML;
            extraEl.innerHTML = existingInfo + (existingInfo ? '<br>' : '') + `📊 Đã chấp nhận ${validation.extraFields.length} cột mới: ${validation.extraFields.slice(0, 3).join(', ')}${validation.extraFields.length > 3 ? '...' : ''}`;
            extraEl.style.display = 'block';
            extraEl.style.color = '#2563eb';
            extraEl.style.background = '#eff6ff';
            App.toast(`Đã chấp nhận ${validation.extraFields.length} cột mới từ "${file.name}"`, 'success');
          } else {
            const existingInfo = extraEl.innerHTML;
            extraEl.innerHTML = existingInfo + (existingInfo ? '<br>' : '') + `ℹ️ Bỏ qua ${validation.extraFields.length} cột mới (chỉ dùng cột cố định)`;
            extraEl.style.display = 'block';
            App.toast(`Bỏ qua ${validation.extraFields.length} cột mới, chỉ sử dụng cột cố định`, 'info');
          }
        }

      } catch (err) {
        console.error('Validation error:', err);
        App.toast(`Lỗi khi kiểm tra file: ${err.message}`, 'error');
      }
    }

    // File is valid — accept it
    AppState.uploadedFiles[fileType] = file;
    slot.classList.add('has-file');
    slot.classList.remove('has-error');
    info.style.display = 'flex';
    nameEl.textContent = file.name;
    App.toast(`✓ File "${file.name}" hợp lệ`, 'success');
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

        // If extra columns were NOT accepted, filter them out
        const config = FILE_TYPES[fileType];
        if (config.fields && config.fields.length > 0 && !this._acceptedExtraCols[fileType]) {
          const expectedSet = new Set(config.fields);
          const filteredData = {};
          for (const key in data) {
            // For multi-row files, strip "(Dòng X)" suffix for matching
            const baseKey = key.replace(/\s*\(Dòng \d+\)$/, '');
            if (expectedSet.has(baseKey) || expectedSet.has(key)) {
              filteredData[key] = data[key];
            }
          }
          AppState.extractedData[fileType] = filteredData;
        } else {
          AppState.extractedData[fileType] = data;
        }
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
