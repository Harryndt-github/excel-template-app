/* ============================================
   Vietnam Administrative Data Module
   ============================================
   Comprehensive data for address parsing:
   - Old 3-tier (Province → District → Ward) mapping
   - New 2-tier (Province → Ward) mapping  
   - Street database per district for context inference
   - Noise/junk phrase detection
   ============================================ */

const VietnamAddressData = {

  // =============================================
  // NOISE PHRASES TO REMOVE FROM ADDRESSES
  // Common junk text that appears in address entries
  // =============================================
  _noisePatterns: [
    /\b(dia chi moi|đia chi moi|địa chỉ mới|dia chi cu|địa chỉ cũ)\b/gi,
    /\b(nha moi|nhà mới|nha cu|nhà cũ)\b/gi,
    /\b(giao hang tai|giao hàng tại|giao tại|nhan tai|nhận tại)\b/gi,
    /\b(lien he|liên hệ|sdt|số điện thoại|phone|tel)\s*:?\s*[\d\s\-\.]+/gi,
    /\b(note|ghi chu|ghi chú|luu y|lưu ý)\s*:?\s*/gi,
    /\b(cong ty|công ty|cty)\s+(tnhh|cp|co phan|cổ phần)\s+/gi,
    /\b(van phong|văn phòng|vp)\s+(lam viec|làm việc)\b/gi,
    /\(\s*(moi|mới|cu|cũ|tam|tạm)\s*\)/gi,
    /\b(dia chi giao hang|địa chỉ giao hàng)\s*:?\s*/gi,
    /\b(gan|gần|doi dien|đối diện|ben canh|bên cạnh|truoc|trước|sau)\s+(nha|nhà|toa nha|tòa nhà|cong vien|công viên)\b/gi,
    // --- Metadata annotations commonly found in admin datasets ---
    /\b(DIA\s*DANH\s*HANH\s*CHINH\s*MOI|ĐỊA\s*DANH\s*HÀNH\s*CHÍNH\s*MỚI|dia\s*danh\s*hanh\s*chinh\s*moi|địa\s*danh\s*hành\s*chính\s*mới)\b/gi,
    /\b(DI\s*A\s*DANH\s*H|DI\s+A\s+DANH)\b.*/gi,
    /\b(THEO\s*DIA\s*CH|THEO\s*ĐỊA\s*CH|theo\s*dia\s*ch|theo\s*địa\s*ch)[A-ZĐa-zđÀ-ỹ\s….]*/gi,
    /\b(THEO\s*DIA\s*DANH|THEO\s*ĐỊA\s*DANH|theo\s*dia\s*danh|theo\s*địa\s*danh)[A-ZĐa-zđÀ-ỹ\s….]*/gi,
    /\bTHEO\b\s*$/gi,
  ],

  // =============================================
  // OLD 3-TIER ADMINISTRATIVE UNITS
  // Province → District → Wards + Streets
  // This is used for backward compatibility
  // =============================================
  _oldAdminData: null,
  _normKeyRx: null,

  _buildOldAdminData() {
    if (this._oldAdminData) return;

    // HỒ CHÍ MINH - Old Districts → Wards (pre-2025)
    this._oldAdminData = {
      // ============= TP. HỒ CHÍ MINH =============
      'Hồ Chí Minh': {
        districts: {
          'Quận 1': {
            aliases: ['q1', 'q 1', 'q.1', 'quan 1', 'quận 1', 'district 1'],
            wards: ['Phường Tân Định', 'Phường Đa Kao', 'Phường Bến Nghé', 'Phường Bến Thành', 'Phường Nguyễn Thái Bình', 'Phường Phạm Ngũ Lão', 'Phường Cầu Ông Lãnh', 'Phường Cô Giang', 'Phường Nguyễn Cư Trinh', 'Phường Cầu Kho'],
            streets: ['Nguyễn Huệ', 'Đồng Khởi', 'Lê Lợi', 'Hàm Nghi', 'Nguyễn Du', 'Pasteur', 'Hai Bà Trưng', 'Lý Tự Trọng', 'Nam Kỳ Khởi Nghĩa', 'Phạm Ngũ Lão', 'Bùi Viện', 'Đề Thám', 'Trần Hưng Đạo', 'Cống Quỳnh', 'Nguyễn Trãi', 'Tôn Đức Thắng', 'Đinh Tiên Hoàng', 'Lê Duẩn', 'Nguyễn Thị Minh Khai']
          },
          'Quận 3': {
            aliases: ['q3', 'q 3', 'q.3', 'quan 3', 'quận 3', 'district 3'],
            wards: ['Phường Võ Thị Sáu', 'Phường 1', 'Phường 2', 'Phường 3', 'Phường 4', 'Phường 5', 'Phường 9', 'Phường 10', 'Phường 11', 'Phường 12', 'Phường 13', 'Phường 14'],
            streets: ['Võ Văn Tần', 'Cách Mạng Tháng 8', 'Nam Kỳ Khởi Nghĩa', 'Lê Văn Sỹ', 'Nguyễn Đình Chiểu', 'Trần Quốc Thảo', 'Kỳ Đồng', 'Bà Huyện Thanh Quan', 'Nguyễn Thượng Hiền', 'Trường Sa']
          },
          'Quận 4': {
            aliases: ['q4', 'q 4', 'q.4', 'quan 4', 'quận 4'],
            wards: ['Phường 1', 'Phường 2', 'Phường 3', 'Phường 4', 'Phường 6', 'Phường 8', 'Phường 9', 'Phường 10', 'Phường 13', 'Phường 14', 'Phường 15', 'Phường 16', 'Phường 18'],
            streets: ['Nguyễn Tất Thành', 'Hoàng Diệu', 'Đoàn Văn Bơ', 'Bến Vân Đồn', 'Tôn Đản', 'Khánh Hội', 'Nguyễn Khoái']
          },
          'Quận 5': {
            aliases: ['q5', 'q 5', 'q.5', 'quan 5', 'quận 5'],
            wards: ['Phường 1', 'Phường 2', 'Phường 3', 'Phường 4', 'Phường 5', 'Phường 6', 'Phường 7', 'Phường 8', 'Phường 9', 'Phường 10', 'Phường 11', 'Phường 12', 'Phường 13', 'Phường 14', 'Phường 15'],
            streets: ['An Dương Vương', 'Trần Hưng Đạo', 'Nguyễn Trãi', 'Trần Phú', 'Hùng Vương', 'Châu Văn Liêm', 'Nguyễn Chí Thanh']
          },
          'Quận 6': {
            aliases: ['q6', 'q 6', 'q.6', 'quan 6', 'quận 6'],
            wards: ['Phường 1', 'Phường 2', 'Phường 3', 'Phường 4', 'Phường 5', 'Phường 6', 'Phường 7', 'Phường 8', 'Phường 9', 'Phường 10', 'Phường 11', 'Phường 12', 'Phường 13', 'Phường 14'],
            streets: ['Hậu Giang', 'Kinh Dương Vương', 'Tân Hòa Đông', 'Bình Phú']
          },
          'Quận 7': {
            aliases: ['q7', 'q 7', 'q.7', 'quan 7', 'quận 7'],
            wards: ['Phường Tân Thuận Đông', 'Phường Tân Thuận Tây', 'Phường Tân Kiểng', 'Phường Tân Hưng', 'Phường Bình Thuận', 'Phường Tân Quy', 'Phường Phú Thuận', 'Phường Tân Phú', 'Phường Tân Phong', 'Phường Phú Mỹ'],
            streets: ['Nguyễn Thị Thập', 'Nguyễn Hữu Thọ', 'Lê Văn Lương', 'Huỳnh Tấn Phát', 'Phạm Hữu Lầu']
          },
          'Quận 8': {
            aliases: ['q8', 'q 8', 'q.8', 'quan 8', 'quận 8'],
            wards: ['Phường 1', 'Phường 2', 'Phường 3', 'Phường 4', 'Phường 5', 'Phường 6', 'Phường 7', 'Phường 8', 'Phường 9', 'Phường 10', 'Phường 11', 'Phường 12', 'Phường 13', 'Phường 14', 'Phường 15', 'Phường 16'],
            streets: ['Phạm Thế Hiển', 'Tạ Quang Bửu', 'Dương Bá Trạc', 'Cao Lỗ']
          },
          'Quận 10': {
            aliases: ['q10', 'q 10', 'q.10', 'quan 10', 'quận 10'],
            wards: ['Phường 1', 'Phường 2', 'Phường 3', 'Phường 4', 'Phường 5', 'Phường 6', 'Phường 7', 'Phường 8', 'Phường 9', 'Phường 10', 'Phường 11', 'Phường 12', 'Phường 13', 'Phường 14', 'Phường 15'],
            streets: ['Ba Tháng Hai', 'Lý Thường Kiệt', 'Sư Vạn Hạnh', 'Thành Thái', 'Tô Hiến Thành', 'Nguyễn Tri Phương', 'Lê Hồng Phong']
          },
          'Quận 11': {
            aliases: ['q11', 'q 11', 'q.11', 'quan 11', 'quận 11'],
            wards: ['Phường 1', 'Phường 2', 'Phường 3', 'Phường 4', 'Phường 5', 'Phường 6', 'Phường 7', 'Phường 8', 'Phường 9', 'Phường 10', 'Phường 11', 'Phường 12', 'Phường 13', 'Phường 14', 'Phường 15', 'Phường 16'],
            streets: ['Lạc Long Quân', 'Lê Đại Hành', 'Hồng Bàng', 'Tân Phước', 'Lò Siêu']
          },
          'Quận 12': {
            aliases: ['q12', 'q 12', 'q.12', 'quan 12', 'quận 12'],
            wards: ['Phường Thạnh Xuân', 'Phường Thạnh Lộc', 'Phường Hiệp Thành', 'Phường Tân Chánh Hiệp', 'Phường An Phú Đông', 'Phường Tân Thới Hiệp', 'Phường Trung Mỹ Tây', 'Phường Tân Hưng Thuận', 'Phường Đông Hưng Thuận', 'Phường Tân Thới Nhất'],
            streets: ['Nguyễn Ảnh Thủ', 'Lê Văn Khương', 'Trường Chinh', 'Nguyễn Văn Quá', 'Hà Huy Giáp']
          },
          'Quận Bình Thạnh': {
            aliases: ['q binh thanh', 'q.binh thanh', 'quan binh thanh', 'quận bình thạnh', 'bình thạnh', 'binh thanh', 'bthanh', 'q bt', 'q.bt'],
            wards: ['Phường 1', 'Phường 2', 'Phường 3', 'Phường 5', 'Phường 6', 'Phường 7', 'Phường 11', 'Phường 12', 'Phường 13', 'Phường 14', 'Phường 15', 'Phường 17', 'Phường 19', 'Phường 21', 'Phường 22', 'Phường 24', 'Phường 25', 'Phường 26', 'Phường 27', 'Phường 28'],
            streets: ['Điện Biên Phủ', 'Xô Viết Nghệ Tĩnh', 'Nguyễn Xí', 'Phan Văn Trị', 'Nơ Trang Long', 'Bạch Đằng', 'Bùi Đình Túy', 'Nguyễn Huy Tưởng']
          },
          'Quận Gò Vấp': {
            aliases: ['q go vap', 'q.go vap', 'quan go vap', 'quận gò vấp', 'gò vấp', 'go vap', 'gvap', 'q gv', 'q.gv'],
            wards: ['Phường 1', 'Phường 3', 'Phường 4', 'Phường 5', 'Phường 6', 'Phường 7', 'Phường 8', 'Phường 9', 'Phường 10', 'Phường 11', 'Phường 12', 'Phường 13', 'Phường 14', 'Phường 15', 'Phường 16', 'Phường 17'],
            streets: ['Quang Trung', 'Nguyễn Oanh', 'Phạm Văn Chiêu', 'Lê Lợi', 'Nguyễn Kiệm', 'Phan Huy Ích', 'Lê Đức Thọ']
          },
          'Quận Phú Nhuận': {
            aliases: ['q phu nhuan', 'q.phu nhuan', 'quan phu nhuan', 'quận phú nhuận', 'phú nhuận', 'phu nhuan', 'pnhuan', 'q pn', 'q.pn'],
            wards: ['Phường 1', 'Phường 2', 'Phường 3', 'Phường 4', 'Phường 5', 'Phường 7', 'Phường 8', 'Phường 9', 'Phường 10', 'Phường 11', 'Phường 12', 'Phường 13', 'Phường 14', 'Phường 15', 'Phường 17'],
            streets: ['Phan Đình Phùng', 'Phan Xích Long', 'Hoàng Văn Thụ', 'Nguyễn Văn Trỗi']
          },
          'Quận Tân Bình': {
            aliases: ['q tan binh', 'q.tan binh', 'quan tan binh', 'quận tân bình', 'tân bình', 'tan binh', 'tbinh', 'q tb', 'q.tb'],
            wards: ['Phường 1', 'Phường 2', 'Phường 3', 'Phường 4', 'Phường 5', 'Phường 6', 'Phường 7', 'Phường 8', 'Phường 9', 'Phường 10', 'Phường 11', 'Phường 12', 'Phường 13', 'Phường 14', 'Phường 15'],
            streets: ['Cộng Hòa', 'Hoàng Văn Thụ', 'Lý Thường Kiệt', 'Trường Chinh', 'Trần Thái Tông', 'Phạm Văn Bạch', 'Cách Mạng Tháng 8', 'Âu Cơ', 'Hoàng Hoa Thám', 'Lạc Long Quân', 'Bàu Cát']
          },
          'Quận Tân Phú': {
            aliases: ['q tan phu', 'q.tan phu', 'quan tan phu', 'quận tân phú', 'tân phú', 'tan phu', 'tphu', 'q tp'],
            wards: ['Phường Tân Sơn Nhì', 'Phường Tây Thạnh', 'Phường Sơn Kỳ', 'Phường Tân Quý', 'Phường Tân Thành', 'Phường Phú Thọ Hòa', 'Phường Phú Thạnh', 'Phường Phú Trung', 'Phường Hòa Thạnh', 'Phường Hiệp Tân', 'Phường Tân Thới Hòa'],
            streets: ['Lũy Bán Bích', 'Trường Chinh', 'Thoại Ngọc Hầu', 'Tân Kỳ Tân Quý', 'Lê Trọng Tấn', 'Hòa Bình']
          },
          'Quận Bình Tân': {
            aliases: ['q binh tan', 'q.binh tan', 'quan binh tan', 'quận bình tân', 'bình tân', 'binh tan', 'btan'],
            wards: ['Phường Bình Hưng Hòa', 'Phường Bình Hưng Hòa A', 'Phường Bình Hưng Hòa B', 'Phường Bình Trị Đông', 'Phường Bình Trị Đông A', 'Phường Bình Trị Đông B', 'Phường Tân Tạo', 'Phường Tân Tạo A', 'Phường An Lạc', 'Phường An Lạc A'],
            streets: ['Kinh Dương Vương', 'Tên Lửa', 'Hồ Học Lãm', 'Bình Long', 'Bình Trị Đông']
          },
          'Quận Thủ Đức': {
            aliases: ['q thu duc', 'q.thu duc', 'quan thu duc', 'quận thủ đức', 'thủ đức', 'thu duc', 'tduc', 'tp thu duc'],
            wards: ['Phường Linh Chiểu', 'Phường Linh Tây', 'Phường Linh Đông', 'Phường Linh Xuân', 'Phường Linh Trung', 'Phường Tam Bình', 'Phường Tam Phú', 'Phường Hiệp Bình Chánh', 'Phường Hiệp Bình Phước', 'Phường Bình Chiểu', 'Phường Bình Thọ', 'Phường Trường Thọ'],
            streets: ['Võ Văn Ngân', 'Kha Vạn Cân', 'Phạm Văn Đồng', 'Lê Văn Việt', 'Đỗ Xuân Hợp', 'Nguyễn Văn Bá']
          },
          'Quận 2': {
            aliases: ['q2', 'q 2', 'q.2', 'quan 2', 'quận 2'],
            wards: ['Phường Thảo Điền', 'Phường An Phú', 'Phường An Khánh', 'Phường Bình An', 'Phường Bình Trưng Đông', 'Phường Bình Trưng Tây', 'Phường Cát Lái', 'Phường Thạnh Mỹ Lợi', 'Phường An Lợi Đông', 'Phường Thủ Thiêm'],
            streets: ['Trần Não', 'Lương Định Của', 'Mai Chí Thọ', 'Nguyễn Thị Định', 'Xa Lộ Hà Nội', 'Thảo Điền']
          },
          'Quận 9': {
            aliases: ['q9', 'q 9', 'q.9', 'quan 9', 'quận 9'],
            wards: ['Phường Long Bình', 'Phường Long Thạnh Mỹ', 'Phường Tân Phú', 'Phường Hiệp Phú', 'Phường Tăng Nhơn Phú A', 'Phường Tăng Nhơn Phú B', 'Phường Phước Long B', 'Phường Phước Long A', 'Phường Trường Thạnh', 'Phường Long Phước', 'Phường Long Trường', 'Phường Phước Bình', 'Phường Phú Hữu'],
            streets: ['Lê Văn Việt', 'Đỗ Xuân Hợp', 'Nguyễn Duy Trinh', 'Tăng Nhơn Phú', 'Man Thiện']
          },
          'Huyện Bình Chánh': {
            aliases: ['h binh chanh', 'huyen binh chanh', 'huyện bình chánh', 'bình chánh', 'binh chanh'],
            wards: ['Xã Vĩnh Lộc A', 'Xã Vĩnh Lộc B', 'Xã Bình Chánh', 'Xã An Phú Tây', 'Xã Hưng Long', 'Xã Đa Phước', 'Xã Tân Quý Tây', 'Xã Bình Hưng', 'Xã Phong Phú', 'Xã Tân Nhựt', 'Xã Tân Kiên', 'Xã Lê Minh Xuân', 'Thị trấn Tân Túc'],
            streets: ['Quốc Lộ 1A', 'Nguyễn Hữu Trí', 'Trần Đại Nghĩa']
          },
          'Huyện Hóc Môn': {
            aliases: ['h hoc mon', 'huyen hoc mon', 'huyện hóc môn', 'hóc môn', 'hoc mon'],
            wards: ['Thị trấn Hóc Môn', 'Xã Tân Hiệp', 'Xã Nhị Bình', 'Xã Đông Thạnh', 'Xã Tân Thới Nhì', 'Xã Thới Tam Thôn', 'Xã Xuân Thới Sơn', 'Xã Xuân Thới Thượng', 'Xã Xuân Thới Đông', 'Xã Trung Chánh', 'Xã Bà Điểm', 'Xã Tân Xuân'],
            streets: ['Quốc Lộ 22', 'Lê Thị Hà', 'Phan Văn Hớn']
          },
          'Huyện Củ Chi': {
            aliases: ['h cu chi', 'huyen cu chi', 'huyện củ chi', 'củ chi', 'cu chi'],
            wards: ['Thị trấn Củ Chi', 'Xã Phú Mỹ Hưng', 'Xã An Phú', 'Xã Trung Lập Thượng', 'Xã An Nhơn Tây', 'Xã Nhuận Đức', 'Xã Phạm Văn Cội', 'Xã Phú Hòa Đông', 'Xã Trung Lập Hạ', 'Xã Trung An', 'Xã Phước Thạnh', 'Xã Phước Hiệp', 'Xã Tân An Hội', 'Xã Phước Vĩnh An', 'Xã Thái Mỹ', 'Xã Tân Thạnh Tây', 'Xã Hòa Phú', 'Xã Tân Thạnh Đông', 'Xã Bình Mỹ', 'Xã Tân Phú Trung', 'Xã Tân Thông Hội'],
            streets: ['Tỉnh Lộ 8', 'Quốc Lộ 22']
          },
          'Huyện Nhà Bè': {
            aliases: ['h nha be', 'huyen nha be', 'huyện nhà bè', 'nhà bè', 'nha be'],
            wards: ['Thị trấn Nhà Bè', 'Xã Phước Kiển', 'Xã Phước Lộc', 'Xã Nhơn Đức', 'Xã Phú Xuân', 'Xã Long Thới', 'Xã Hiệp Phước'],
            streets: ['Nguyễn Hữu Thọ', 'Nguyễn Bình', 'Lê Văn Lương']
          },
          'Huyện Cần Giờ': {
            aliases: ['h can gio', 'huyen can gio', 'huyện cần giờ', 'cần giờ', 'can gio'],
            wards: ['Thị trấn Cần Thạnh', 'Xã Bình Khánh', 'Xã Tam Thôn Hiệp', 'Xã An Thới Đông', 'Xã Thạnh An', 'Xã Long Hòa', 'Xã Lý Nhơn'],
            streets: ['Rừng Sác']
          }
        }
      },

      // ============= HÀ NỘI =============
      'Hà Nội': {
        districts: {
          'Quận Ba Đình': {
            aliases: ['q ba dinh', 'q.ba dinh', 'quan ba dinh', 'quận ba đình', 'ba đình', 'ba dinh'],
            wards: ['Phường Ngọc Hà', 'Phường Đội Cấn', 'Phường Cống Vị', 'Phường Giảng Võ', 'Phường Kim Mã', 'Phường Nguyễn Trung Trực', 'Phường Phúc Xá', 'Phường Quán Thánh', 'Phường Thành Công', 'Phường Trúc Bạch', 'Phường Vĩnh Phúc', 'Phường Liễu Giai', 'Phường Ba Đình'],
            streets: ['Hoàng Diệu', 'Phan Đình Phùng', 'Đội Cấn', 'Kim Mã', 'Liễu Giai', 'Nguyễn Thái Học', 'Ngọc Hà', 'Sơn Tây', 'Giảng Võ']
          },
          'Quận Hoàn Kiếm': {
            aliases: ['q hoan kiem', 'q.hoan kiem', 'quan hoan kiem', 'quận hoàn kiếm', 'hoàn kiếm', 'hoan kiem'],
            wards: ['Phường Hàng Bạc', 'Phường Hàng Bồ', 'Phường Hàng Bông', 'Phường Hàng Buồm', 'Phường Hàng Đào', 'Phường Hàng Gai', 'Phường Hàng Mã', 'Phường Hàng Trống', 'Phường Lý Thái Tổ', 'Phường Phan Chu Trinh', 'Phường Tràng Tiền', 'Phường Trần Hưng Đạo', 'Phường Cửa Đông', 'Phường Cửa Nam', 'Phường Chương Dương Độ', 'Phường Đồng Xuân', 'Phường Hoàn Kiếm'],
            streets: ['Phố Huế', 'Hàng Ngang', 'Hàng Đào', 'Hàng Bông', 'Hàng Bài', 'Bà Triệu', 'Tràng Tiền', 'Đinh Tiên Hoàng', 'Lý Thái Tổ']
          },
          'Quận Đống Đa': {
            aliases: ['q dong da', 'q.dong da', 'quan dong da', 'quận đống đa', 'đống đa', 'dong da'],
            wards: ['Phường Cát Linh', 'Phường Hàng Bột', 'Phường Khâm Thiên', 'Phường Khương Thượng', 'Phường Kim Liên', 'Phường Láng Hạ', 'Phường Láng Thượng', 'Phường Nam Đồng', 'Phường Ngã Tư Sở', 'Phường Ô Chợ Dừa', 'Phường Phương Liên', 'Phường Phương Mai', 'Phường Quang Trung', 'Phường Quốc Tử Giám', 'Phường Thịnh Quang', 'Phường Trung Liệt', 'Phường Trung Phụng', 'Phường Trung Tự', 'Phường Văn Chương', 'Phường Văn Miếu', 'Phường Đống Đa'],
            streets: ['Tây Sơn', 'Chùa Bộc', 'Khâm Thiên', 'Xã Đàn', 'Láng', 'Đường Láng', 'Nguyễn Lương Bằng', 'Tôn Đức Thắng', 'Hoàng Cầu']
          },
          'Quận Hai Bà Trưng': {
            aliases: ['q hai ba trung', 'q.hai ba trung', 'quan hai ba trung', 'quận hai bà trưng', 'hai bà trưng', 'hai ba trung', 'q hbt', 'q.hbt'],
            wards: ['Phường Bạch Đằng', 'Phường Bạch Mai', 'Phường Bùi Thị Xuân', 'Phường Cầu Dền', 'Phường Đồng Nhân', 'Phường Đồng Tâm', 'Phường Đống Mác', 'Phường Hai Bà Trưng', 'Phường Lê Đại Hành', 'Phường Minh Khai', 'Phường Ngô Thì Nhậm', 'Phường Nguyễn Du', 'Phường Phạm Đình Hổ', 'Phường Phố Huế', 'Phường Quỳnh Lôi', 'Phường Quỳnh Mai', 'Phường Thanh Lương', 'Phường Thanh Nhàn', 'Phường Trương Định', 'Phường Vĩnh Tuy'],
            streets: ['Bạch Mai', 'Lê Đại Hành', 'Minh Khai', 'Trần Khát Chân', 'Phố Huế', 'Trương Định', 'Lò Đúc', 'Bùi Thị Xuân', 'Nguyễn Du', 'Trần Hưng Đạo']
          },
          'Quận Thanh Xuân': {
            aliases: ['q thanh xuan', 'q.thanh xuan', 'quan thanh xuan', 'quận thanh xuân', 'thanh xuân', 'thanh xuan', 'txuan'],
            wards: ['Phường Hạ Đình', 'Phường Khương Đình', 'Phường Khương Mai', 'Phường Khương Trung', 'Phường Kim Giang', 'Phường Nhân Chính', 'Phường Phương Liệt', 'Phường Thanh Xuân Bắc', 'Phường Thanh Xuân Nam', 'Phường Thanh Xuân Trung', 'Phường Thượng Đình'],
            streets: ['Nguyễn Trãi', 'Lê Trọng Tấn', 'Khuất Duy Tiến', 'Hoàng Văn Thái', 'Nguyễn Xiển', 'Trường Chinh', 'Quan Nhân']
          },
          'Quận Cầu Giấy': {
            aliases: ['q cau giay', 'q.cau giay', 'quan cau giay', 'quận cầu giấy', 'cầu giấy', 'cau giay'],
            wards: ['Phường Dịch Vọng', 'Phường Dịch Vọng Hậu', 'Phường Mai Dịch', 'Phường Nghĩa Đô', 'Phường Nghĩa Tân', 'Phường Quan Hoa', 'Phường Trung Hòa', 'Phường Yên Hòa'],
            streets: ['Trần Thái Tông', 'Cầu Giấy', 'Xuân Thủy', 'Duy Tân', 'Hoàng Quốc Việt', 'Nguyễn Phong Sắc', 'Trần Đăng Ninh']
          },
          'Quận Hoàng Mai': {
            aliases: ['q hoang mai', 'q.hoang mai', 'quan hoang mai', 'quận hoàng mai', 'hoàng mai', 'hoang mai'],
            wards: ['Phường Đại Kim', 'Phường Định Công', 'Phường Giáp Bát', 'Phường Hoàng Liệt', 'Phường Hoàng Văn Thụ', 'Phường Lĩnh Nam', 'Phường Mai Động', 'Phường Tân Mai', 'Phường Thanh Trì', 'Phường Thịnh Liệt', 'Phường Trần Phú', 'Phường Tương Mai', 'Phường Vĩnh Hưng', 'Phường Yên Sở'],
            streets: ['Giải Phóng', 'Kim Đồng', 'Nguyễn Hữu Thọ', 'Lĩnh Nam', 'Tam Trinh', 'Giáp Bát']
          },
          'Quận Long Biên': {
            aliases: ['q long bien', 'q.long bien', 'quan long bien', 'quận long biên', 'long biên', 'long bien'],
            wards: ['Phường Bồ Đề', 'Phường Cự Khối', 'Phường Đức Giang', 'Phường Gia Thụy', 'Phường Giang Biên', 'Phường Long Biên', 'Phường Ngọc Lâm', 'Phường Ngọc Thụy', 'Phường Phúc Đồng', 'Phường Phúc Lợi', 'Phường Sài Đồng', 'Phường Thạch Bàn', 'Phường Thượng Thanh', 'Phường Việt Hưng'],
            streets: ['Nguyễn Văn Cừ', 'Ngô Gia Tự', 'Cổ Linh', 'Long Biên']
          },
          'Quận Tây Hồ': {
            aliases: ['q tay ho', 'q.tay ho', 'quan tay ho', 'quận tây hồ', 'tây hồ', 'tay ho'],
            wards: ['Phường Bưởi', 'Phường Nhật Tân', 'Phường Phú Thượng', 'Phường Quảng An', 'Phường Thụy Khuê', 'Phường Tứ Liên', 'Phường Xuân La', 'Phường Yên Phụ'],
            streets: ['Lạc Long Quân', 'Thụy Khuê', 'Âu Cơ', 'Xuân Diệu', 'Tô Ngọc Vân', 'Đặng Thai Mai']
          },
          'Quận Bắc Từ Liêm': {
            aliases: ['q bac tu liem', 'quận bắc từ liêm', 'bắc từ liêm', 'bac tu liem'],
            wards: ['Phường Cổ Nhuế', 'Phường Đông Ngạc', 'Phường Đức Thắng', 'Phường Liên Mạc', 'Phường Minh Khai', 'Phường Phú Diễn', 'Phường Phúc Diễn', 'Phường Tây Tựu', 'Phường Thượng Cát', 'Phường Thụy Phương', 'Phường Xuân Đỉnh', 'Phường Xuân Tảo'],
            streets: ['Cổ Nhuế', 'Phạm Văn Đồng', 'Hoàng Quốc Việt']
          },
          'Quận Nam Từ Liêm': {
            aliases: ['q nam tu liem', 'quận nam từ liêm', 'nam từ liêm', 'nam tu liem'],
            wards: ['Phường Cầu Diễn', 'Phường Đại Mỗ', 'Phường Mễ Trì', 'Phường Mỹ Đình', 'Phường Phú Đô', 'Phường Phương Canh', 'Phường Tây Mỗ', 'Phường Trung Văn', 'Phường Xuân Phương'],
            streets: ['Mễ Trì', 'Lê Đức Thọ', 'Mỹ Đình', 'Trần Hữu Dực']
          },
          'Quận Hà Đông': {
            aliases: ['q ha dong', 'q.ha dong', 'quan ha dong', 'quận hà đông', 'hà đông', 'ha dong'],
            wards: ['Phường Biên Giang', 'Phường Dương Nội', 'Phường Đồng Mai', 'Phường Hà Cầu', 'Phường Kiến Hưng', 'Phường La Khê', 'Phường Mộ Lao', 'Phường Nguyễn Trãi', 'Phường Phú La', 'Phường Phú Lãm', 'Phường Phú Lương', 'Phường Phúc La', 'Phường Quang Trung', 'Phường Vạn Phúc', 'Phường Văn Quán', 'Phường Yên Nghĩa', 'Phường Yết Kiêu'],
            streets: ['Quang Trung', 'Nguyễn Trãi', 'Trần Phú', 'Lê Trọng Tấn', 'Tố Hữu']
          }
        }
      },

      // ============= ĐÀ NẴNG =============
      'Đà Nẵng': {
        districts: {
          'Quận Hải Châu': {
            aliases: ['q hai chau', 'quận hải châu', 'hải châu', 'hai chau'],
            wards: ['Phường Hòa Cường Bắc', 'Phường Hòa Cường Nam', 'Phường Nam Dương', 'Phường Phước Ninh', 'Phường Bình Hiên', 'Phường Bình Thuận', 'Phường Hải Châu I', 'Phường Hải Châu II', 'Phường Hòa Thuận Đông', 'Phường Hòa Thuận Tây', 'Phường Thanh Bình', 'Phường Thuận Phước', 'Phường Thạch Thang'],
            streets: ['Nguyễn Văn Linh', 'Bạch Đằng', 'Trần Phú', 'Lê Duẩn', '2 Tháng 9']
          },
          'Quận Thanh Khê': {
            aliases: ['q thanh khe', 'quận thanh khê', 'thanh khê', 'thanh khe'],
            wards: ['Phường An Khê', 'Phường Chính Gián', 'Phường Hòa Khê', 'Phường Tam Thuận', 'Phường Tân Chính', 'Phường Thạc Gián', 'Phường Thanh Khê Đông', 'Phường Thanh Khê Tây', 'Phường Vĩnh Trung', 'Phường Xuân Hà'],
            streets: ['Điện Biên Phủ', 'Hàm Nghi', 'Lê Duẩn', 'Ông Ích Khiêm']
          },
          'Quận Sơn Trà': {
            aliases: ['q son tra', 'quận sơn trà', 'sơn trà', 'son tra'],
            wards: ['Phường An Hải Bắc', 'Phường An Hải Đông', 'Phường An Hải Tây', 'Phường Mân Thái', 'Phường Nại Hiên Đông', 'Phường Phước Mỹ', 'Phường Thọ Quang'],
            streets: ['Ngô Quyền', 'Phạm Văn Đồng']
          },
          'Quận Ngũ Hành Sơn': {
            aliases: ['q ngu hanh son', 'quận ngũ hành sơn', 'ngũ hành sơn', 'ngu hanh son'],
            wards: ['Phường Hòa Hải', 'Phường Hòa Quý', 'Phường Khuê Mỹ', 'Phường Mỹ An'],
            streets: ['Lê Văn Hiến', 'Nguyễn Tri Phương']
          },
          'Quận Liên Chiểu': {
            aliases: ['q lien chieu', 'quận liên chiểu', 'liên chiểu', 'lien chieu'],
            wards: ['Phường Hòa Hiệp Bắc', 'Phường Hòa Hiệp Nam', 'Phường Hòa Khánh Bắc', 'Phường Hòa Khánh Nam', 'Phường Hòa Minh'],
            streets: ['Tôn Đức Thắng', 'Nguyễn Lương Bằng']
          },
          'Quận Cẩm Lệ': {
            aliases: ['q cam le', 'quận cẩm lệ', 'cẩm lệ', 'cam le'],
            wards: ['Phường Hòa An', 'Phường Hòa Phát', 'Phường Hòa Thọ Đông', 'Phường Hòa Thọ Tây', 'Phường Hòa Xuân', 'Phường Khuê Trung'],
            streets: ['Cách Mạng Tháng 8']
          }
        }
      }
    };
  },

  // =============================================  
  // Mapping: Old District → Province (for lookup)
  // Used when only district is detected
  // =============================================
  _oldDistrictToProvince: null,

  _buildDistrictProvinceMap() {
    if (this._oldDistrictToProvince) return;
    this._buildOldAdminData();
    this._oldDistrictToProvince = new Map();

    for (const [province, data] of Object.entries(this._oldAdminData)) {
      for (const [distName, distData] of Object.entries(data.districts)) {
        // Map canonical name
        const normDist = this._normKey(distName);
        this._oldDistrictToProvince.set(normDist, { province, district: distName, data: distData });
        
        // Map all aliases
        for (const alias of distData.aliases) {
          this._oldDistrictToProvince.set(this._normKey(alias), { province, district: distName, data: distData });
        }
      }
    }
  },

  // =============================================
  // UTILITY: Normalize key for lookup
  // Cross-platform robust: uses direct char map (works on IE11/Edge/all)
  // =============================================
  _normKey(str) {
    if (!str) return '';
    // Inline character map (same set as AddressParser._removeDiacritics)
    const _m={'à':'a','á':'a','â':'a','ã':'a','ä':'a','å':'a','ā':'a','ă':'a','À':'a','Á':'a','Â':'a','Ã':'a','Ä':'a','Å':'a','Ā':'a','Ă':'a','ấ':'a','ầ':'a','ẩ':'a','ẫ':'a','ậ':'a','ắ':'a','ằ':'a','ẳ':'a','ẵ':'a','ặ':'a','Ấ':'a','Ầ':'a','Ẩ':'a','Ẫ':'a','Ậ':'a','Ắ':'a','Ằ':'a','Ẳ':'a','Ẵ':'a','Ặ':'a','è':'e','é':'e','ê':'e','ë':'e','ē':'e','ě':'e','È':'e','É':'e','Ê':'e','Ë':'e','Ē':'e','Ě':'e','ế':'e','ề':'e','ể':'e','ễ':'e','ệ':'e','Ế':'e','Ề':'e','Ể':'e','Ễ':'e','Ệ':'e','ì':'i','í':'i','î':'i','ï':'i','ī':'i','ĩ':'i','ị':'i','ỉ':'i','Ì':'i','Í':'i','Î':'i','Ï':'i','Ī':'i','Ĩ':'i','Ị':'i','Ỉ':'i','ò':'o','ó':'o','ô':'o','õ':'o','ö':'o','ō':'o','Ò':'o','Ó':'o','Ô':'o','Õ':'o','Ö':'o','Ō':'o','ố':'o','ồ':'o','ổ':'o','ỗ':'o','ộ':'o','Ố':'o','Ồ':'o','Ổ':'o','Ỗ':'o','Ộ':'o','ơ':'o','Ơ':'o','ớ':'o','ờ':'o','ở':'o','ỡ':'o','ợ':'o','Ớ':'o','Ờ':'o','Ở':'o','Ỡ':'o','Ợ':'o','ù':'u','ú':'u','û':'u','ü':'u','ū':'u','ũ':'u','ụ':'u','ủ':'u','Ù':'u','Ú':'u','Û':'u','Ü':'u','Ū':'u','Ũ':'u','Ụ':'u','Ủ':'u','ư':'u','Ư':'u','ứ':'u','ừ':'u','ử':'u','ữ':'u','ự':'u','Ứ':'u','Ừ':'u','Ử':'u','Ữ':'u','Ự':'u','ý':'y','ỳ':'y','ỷ':'y','ỹ':'y','ỵ':'y','Ý':'y','Ỳ':'y','Ỷ':'y','Ỹ':'y','Ỵ':'y','đ':'d','Đ':'d'};
    if (!VietnamAddressData._normKeyRx) {
      VietnamAddressData._normKeyRx = new RegExp('[' + Object.keys(_m).join('') + ']', 'g');
    }
    let s = str.toLowerCase().replace(VietnamAddressData._normKeyRx, (ch) => _m[ch.toLowerCase()] || ch);
    try { s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch(e) {}
    return s.replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
  },


  // =============================================
  // CORE: Remove noise/junk from address
  // =============================================
  cleanAddress(rawAddress) {
    if (!rawAddress) return { cleaned: '', noiseRemoved: [] };
    let cleaned = rawAddress;
    const removed = [];
    
    for (const pattern of this._noisePatterns) {
      const matches = cleaned.match(pattern);
      if (matches) {
        removed.push(...matches.map(m => m.trim()));
      }
      cleaned = cleaned.replace(pattern, ' ');
    }

    // Also remove inline noise patterns (case-insensitive, diacritics-insensitive)
    const inlineNoiseWords = [
      'DIA CHI MOI', 'DIA CHI CU', 'DIACHI MOI', 'DIACHI CU',
      'dia chi moi', 'dia chi cu', 'diachi moi', 'diachi cu',
      'ĐỊA CHỈ MỚI', 'ĐỊA CHỈ CŨ', 'địa chỉ mới', 'địa chỉ cũ',
      'GHI CHU', 'ghi chu', 'GHI CHÚ', 'ghi chú',
      'NHA MOI', 'nha moi', 'NHÀ MỚI', 'nhà mới',
      'NHA CU', 'nha cu', 'NHÀ CŨ', 'nhà cũ',
      // --- Metadata annotations ---
      'DIA DANH HANH CHINH MOI', 'dia danh hanh chinh moi',
      'ĐỊA DANH HÀNH CHÍNH MỚI', 'địa danh hành chính mới',
      'DIA DANH HANH CHINH', 'dia danh hanh chinh',
      'THEO DIA CHI MOI', 'theo dia chi moi',
      'THEO ĐỊA CHỈ MỚI', 'theo địa chỉ mới',
      'THEO DIA CHI CU', 'theo dia chi cu',
      'THEO ĐỊA CHỈ CŨ', 'theo địa chỉ cũ',
      'THEO DIA CHI', 'theo dia chi',
      'THEO ĐỊA CHỈ', 'theo địa chỉ',
      'THEO DIA DANH', 'theo dia danh',
      // Space-variant: 'DI A DANH' (with space) instead of 'DIA DANH'
      // Must list LONGEST patterns first within this group so sort-by-length works
      'DI A DANH HANH CHINH MOI', 'di a danh hanh chinh moi',
      'DI A DANH HANH CHINH', 'di a danh hanh chinh',
      'DI A DANH HANH', 'di a danh hanh',
      'DI A DANH', 'di a danh',
      // Residual fragments from partial removal
      'HANH CHINH MOI', 'hanh chinh moi',
      'HANH CHINH', 'hanh chinh',
    ];
    
    // Sort by length descending so longer phrases are matched first
    inlineNoiseWords.sort((a, b) => b.length - a.length);
    
    for (const noise of inlineNoiseWords) {
      const idx = cleaned.toUpperCase().indexOf(noise.toUpperCase());
      if (idx >= 0) {
        const found = cleaned.substring(idx, idx + noise.length);
        removed.push(found.trim());
        cleaned = cleaned.substring(0, idx) + ' ' + cleaned.substring(idx + noise.length);
      }
    }
    
    // Clean up whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    return { cleaned, noiseRemoved: removed };
  },

  // =============================================
  // CORE: Smart ward abbreviation parser
  // Handles: P15, P.15, PThanh Xuan, PBinh Thanh, etc.
  // =============================================
  parseWardAbbreviation(segment) {
    const trimmed = segment.trim();

    // Guard: If segment starts with full-word "Phuong"/"Phường", it's NOT an abbreviation
    if (/^(phuong|phường)\s+/i.test(trimmed)) {
      return null;
    }

    // Pattern 1: P + number → "Phường " + number (e.g., P15 → Phường 15)
    const pNumMatch = trimmed.match(/^[Pp]\.?\s*(\d+)$/);
    if (pNumMatch) {
      return { type: 'ward', value: `Phường ${pNumMatch[1]}`, original: trimmed };
    }

    // Pattern 2: P + Name → "Phường " + Name
    // FIX: Handle ALL CAPS input like P.YEN HOA, P.THANH XUAN, P.BINH PHU
    // Original regex only matched CamelCase/lowercase — missed Windows ALL CAPS data
    const pNameMatch = trimmed.match(
      /^[Pp]\.?\s*([A-ZĐÀ-ỹa-zđà-ỹ][A-ZĐÀ-ỹa-zđà-ỹ]+(?:[ _-]+[A-Za-zĐđÀ-ỹ][A-Za-zĐđÀ-ỹ]*)*)$/
    );
    if (pNameMatch) {
      let wardName = pNameMatch[1].trim();
      if (wardName === wardName.toUpperCase() && wardName.length > 1) {
        wardName = wardName.toLowerCase().replace(/(?:^|\s)\S/g, c => c.toUpperCase());
      } else {
        wardName = wardName.replace(/([a-zỹỵ])([A-ZĐ])/g, '$1 $2').trim();
      }
      return { type: 'ward', value: `Phường ${wardName}`, original: trimmed };
    }

    // Pattern 2b: P + single-char initial + multiple following words
    // e.g., "P. O CHO DUA" → "Phường O Cho Dua" (Phường Ô Chợ Dừa)
    // Requires: dot OR explicit space after P, single char, then ≥2 more words
    const pSingleMatch = trimmed.match(
      /^[Pp][.\s]\s*([A-ZĐÀ-ỹa-zđà-ỹ])(?=\s)((?:\s+[A-Za-zĐđÀ-ỹ]{2,}){1,})$/
    );
    if (pSingleMatch) {
      let wardName = (pSingleMatch[1] + pSingleMatch[2]).trim();
      if (wardName === wardName.toUpperCase()) {
        wardName = wardName.toLowerCase().replace(/(?:^|\s)\S/g, c => c.toUpperCase());
      }
      return { type: 'ward', value: `Phường ${wardName}`, original: trimmed };
    }

    // Pattern 3: X. + name → "Xã " + name
    // IMPORTANT: Only match when there's a DOT after X (X.ME LINH)
    // Without dot, "Xom", "Xuan", "Xanh" would be falsely matched as Xã!
    // Full-form "XA ME LINH" / "xã mê linh" is handled by _detectWard Strategy 2 fullPatterns
    const xNameMatch = trimmed.match(/^[Xx]\.\s*([A-ZĐa-zđÀ-ỹ].+)$/);
    if (xNameMatch) {
      let wardName = xNameMatch[1].trim();
      if (wardName === wardName.toUpperCase() && wardName.length > 1) {
        wardName = wardName.toLowerCase().replace(/(?:^|\s)\S/g, c => c.toUpperCase());
      } else {
        wardName = wardName.replace(/([a-z])([A-Z])/g, '$1 $2').trim();
      }
      return { type: 'ward', value: `Xã ${wardName}`, original: trimmed };
    }

    // Pattern 4: TT + name → "Thị trấn " + name
    const ttNameMatch = trimmed.match(/^[Tt][Tt]\.?\s*(.+)$/);
    if (ttNameMatch) {
      return { type: 'ward', value: `Thị trấn ${ttNameMatch[1].trim()}`, original: trimmed };
    }

    return null;
  },

  // =============================================
  // CORE: Smart district abbreviation parser  
  // Handles: Q1, Q.Tan Binh, QTan Binh, etc.
  // =============================================
  parseDistrictAbbreviation(segment) {
    const trimmed = segment.trim();

    // Pattern 1: Q + number → "Quận " + number (e.g., Q1 → Quận 1)
    const qNumMatch = trimmed.match(/^[Qq]\.?\s*(\d+)$/);
    if (qNumMatch) {
      return { type: 'district', value: `Quận ${qNumMatch[1]}`, original: trimmed };
    }

    // Pattern 2: Q + Name → "Quận " + Name
    // FIX: Handle ALL CAPS like Q.BA DINH, Q.TAN BINH
    const qNameMatch = trimmed.match(
      /^[Qq]\.?\s*([A-ZĐÀ-ỹa-zđà-ỹ][A-ZĐÀ-ỹa-zđà-ỹ]+(?:[ _-]*[A-Za-zĐđÀ-ỹ][A-Za-zĐđÀ-ỹ]*)*)$/
    );
    if (qNameMatch) {
      let distName = qNameMatch[1].trim();
      if (distName === distName.toUpperCase() && distName.length > 1) {
        distName = distName.toLowerCase().replace(/(?:^|\s)\S/g, c => c.toUpperCase());
      } else if (!/\s/.test(distName)) {
        distName = distName.replace(/([a-zà-ỹ])([A-ZĐÀ-ỹ])/g, '$1 $2').trim();
      }
      return { type: 'district', value: `Quận ${distName}`, original: trimmed };
    }

    // Pattern 3: H. + Name → "Huyện " + Name
    // IMPORTANT: Require explicit dot (H.) to avoid false positives on words like:
    // 'HANH CHINH MOI' (residual noise), 'HA NOI' (province), 'HOA THANH' (district full name)
    // Only abbreviated form H.DISTRICT is safe to interpret as Huyện.
    const hNameMatch = trimmed.match(/^[Hh]\.\s*([A-ZĐÀ-ỹa-zđà-ỹ][A-ZĐÀ-ỹa-zđà-ỹ]+(?:\s+[A-Za-zĐđÀ-ỹ]+)*)$/);
    if (hNameMatch) {
      const normalized = trimmed.toLowerCase();
      const noDiacritics = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd').replace(/Đ/g, 'D');
      if (typeof AddressParser !== 'undefined' && AddressParser._provinceAliases) {
        if (AddressParser._provinceAliases.has(normalized) || AddressParser._provinceAliases.has(noDiacritics)) {
          return null;
        }
      }
      let distName = hNameMatch[1].trim();
      if (distName === distName.toUpperCase() && distName.length > 1) {
        distName = distName.toLowerCase().replace(/(?:^|\s)\S/g, c => c.toUpperCase());
      } else {
        distName = distName.replace(/([a-zỹỵ])([A-ZĐ])/g, '$1 $2').trim();
      }
      return { type: 'district', value: `Huyện ${distName}`, original: trimmed };
    }

    return null;
  },



  // =============================================
  // CORE: Lookup ward in old admin data
  // Given a ward name + province, find matching district
  // =============================================
  lookupWardInOldData(wardName, provinceName) {
    this._buildOldAdminData();
    if (!provinceName || !this._oldAdminData[provinceName]) return null;

    const provinceData = this._oldAdminData[provinceName];
    const normWard = this._normKey(wardName);

    const results = [];
    for (const [distName, distData] of Object.entries(provinceData.districts)) {
      for (const w of distData.wards) {
        if (this._normKey(w) === normWard || this._normKey(w).includes(normWard) || normWard.includes(this._normKey(w))) {
          results.push({
            ward: w,
            district: distName,
            province: provinceName,
            confidence: this._normKey(w) === normWard ? 1.0 : 0.8
          });
        }
      }
    }

    return results.length > 0 ? results : null;
  },

  // =============================================
  // CORE: Lookup district in old admin data  
  // Returns province info + ward list
  // =============================================
  lookupDistrictInOldData(districtName) {
    this._buildDistrictProvinceMap();
    const normDist = this._normKey(districtName);
    
    // Direct match
    if (this._oldDistrictToProvince.has(normDist)) {
      return this._oldDistrictToProvince.get(normDist);
    }

    // Fuzzy match: try removing "quan ", "huyen " prefixes
    const prefixes = ['quan ', 'huyen ', 'thi xa ', 'thanh pho '];
    for (const prefix of prefixes) {
      const withPrefix = prefix + normDist;
      if (this._oldDistrictToProvince.has(withPrefix)) {
        return this._oldDistrictToProvince.get(withPrefix);
      }
      if (normDist.startsWith(prefix)) {
        const stripped = normDist.substring(prefix.length);
        for (const [key, val] of this._oldDistrictToProvince) {
          if (key.includes(stripped) && stripped.length >= 4) {
            return val;
          }
        }
      }
    }

    // Subset match
    for (const [key, val] of this._oldDistrictToProvince) {
      if (key.includes(normDist) && normDist.length >= 4) {
        return val;
      }
    }

    return null;
  },

  // =============================================
  // CORE: Infer location from street name
  // Given a street name + province, find possible districts
  // =============================================
  inferFromStreet(streetText, provinceName) {
    this._buildOldAdminData();
    if (!provinceName || !this._oldAdminData[provinceName]) return [];

    const provinceData = this._oldAdminData[provinceName];
    const normStreet = this._normKey(streetText);
    const matches = [];

    for (const [distName, distData] of Object.entries(provinceData.districts)) {
      if (!distData.streets) continue;
      for (const street of distData.streets) {
        const normS = this._normKey(street);
        // Check if the street text contains a known street name
        if (normStreet.includes(normS) || normS.includes(normStreet)) {
          const similarity = this._stringSimilarity(normStreet, normS);
          matches.push({
            street: street,
            district: distName,
            province: provinceName,
            similarity: similarity,
            confidence: similarity > 0.8 ? 'high' : similarity > 0.5 ? 'medium' : 'low'
          });
        }
      }
    }

    // Sort by similarity descending
    matches.sort((a, b) => b.similarity - a.similarity);
    return matches;
  },

  // =============================================
  // CORE: Standardize street name from database
  // "ng t minh khai" → "Nguyễn Thị Minh Khai"
  // "dien bien phu" → "Điện Biên Phủ"
  // Uses token-prefix abbreviation matching
  // =============================================
  standardizeStreetName(rawStreet, provinceName) {
    this._buildOldAdminData();
    if (!rawStreet) return null;

    // Extract house number and street name
    const houseMatch = rawStreet.match(/^(\d+[A-Za-z]?(?:\/\d+[A-Za-z]?)*)\s+(.+)$/);
    const houseNumber = houseMatch ? houseMatch[1] : '';
    const streetName = houseMatch ? houseMatch[2] : rawStreet;

    const inputNorm = this._normKey(streetName);
    if (inputNorm.length < 2) return null;

    let bestMatch = null;
    let bestScore = 0;

    // Search in specific province, or across ALL provinces
    const provincesToSearch = provinceName && this._oldAdminData[provinceName]
      ? { [provinceName]: this._oldAdminData[provinceName] }
      : this._oldAdminData;

    for (const [provName, provData] of Object.entries(provincesToSearch)) {
      for (const [distName, distData] of Object.entries(provData.districts)) {
        if (!distData.streets) continue;
        for (const canonicalStreet of distData.streets) {
          const canonNorm = this._normKey(canonicalStreet);

          // Strategy 1: Exact match (diacritics-insensitive)
          if (inputNorm === canonNorm) {
            return {
              canonical: canonicalStreet,
              houseNumber: houseNumber,
              full: houseNumber ? `${houseNumber} ${canonicalStreet}` : canonicalStreet,
              district: distName,
              province: provName,
              confidence: 1.0
            };
          }

          // Strategy 2: Token-prefix match (abbreviation expansion)
          // "ng t minh khai" → tokens: [ng, t, minh, khai]
          // "nguyen thi minh khai" → tokens: [nguyen, thi, minh, khai]
          // Each input token must be a prefix of the corresponding canonical token
          const score = this._tokenPrefixScore(inputNorm, canonNorm);
          if (score > bestScore && score >= 0.6) {
            bestScore = score;
            bestMatch = {
              canonical: canonicalStreet,
              houseNumber: houseNumber,
              full: houseNumber ? `${houseNumber} ${canonicalStreet}` : canonicalStreet,
              district: distName,
              province: provName,
              confidence: score
            };
          }

          // Strategy 3: Compact match (remove all spaces)
          // "ngtminhkhai" vs "nguyenthiminhkhai"
          const inputCompact = inputNorm.replace(/\s+/g, '');
          const canonCompact = canonNorm.replace(/\s+/g, '');
          if (inputCompact.length >= 4 && canonCompact.startsWith(inputCompact)) {
            const compactScore = inputCompact.length / canonCompact.length;
            if (compactScore > bestScore && compactScore >= 0.5) {
              bestScore = compactScore;
              bestMatch = {
                canonical: canonicalStreet,
                houseNumber: houseNumber,
                full: houseNumber ? `${houseNumber} ${canonicalStreet}` : canonicalStreet,
                district: distName,
                province: provName,
                confidence: compactScore
              };
            }
          }
        }
      }
    }

    return bestMatch;
  },

  // =============================================
  // UTILITY: Token-prefix score for abbreviation matching
  // "ng t minh khai" vs "nguyen thi minh khai" → 1.0
  // Each input token must be a prefix of corresponding canonical token
  // =============================================
  _tokenPrefixScore(inputNorm, canonNorm) {
    const inputTokens = inputNorm.split(/\s+/);
    const canonTokens = canonNorm.split(/\s+/);

    // Token count must match
    if (inputTokens.length !== canonTokens.length) return 0;
    if (inputTokens.length === 0) return 0;

    let matchedTokens = 0;
    let totalCoverage = 0;

    for (let i = 0; i < inputTokens.length; i++) {
      const inp = inputTokens[i];
      const can = canonTokens[i];

      if (can.startsWith(inp)) {
        matchedTokens++;
        totalCoverage += inp.length / can.length;
      } else {
        return 0; // Any non-matching token → fail
      }
    }

    // All tokens matched as prefixes
    // Score = average coverage × match ratio
    const avgCoverage = totalCoverage / inputTokens.length;
    return avgCoverage;
  },

  // =============================================
  // UTILITY: Simple string similarity (Dice coefficient)  
  // =============================================
  _stringSimilarity(s1, s2) {
    if (!s1 || !s2) return 0;
    if (s1 === s2) return 1;

    const bigrams1 = new Set();
    const bigrams2 = new Set();
    for (let i = 0; i < s1.length - 1; i++) bigrams1.add(s1.substring(i, i + 2));
    for (let i = 0; i < s2.length - 1; i++) bigrams2.add(s2.substring(i, i + 2));

    let intersect = 0;
    for (const b of bigrams1) {
      if (bigrams2.has(b)) intersect++;
    }
    return (2 * intersect) / (bigrams1.size + bigrams2.size);
  },

  // =============================================
  // CORE: Smart numberic ward lookup in context
  // Given "P15" + "Q Tân Bình" or province,
  // verify that Phường 15 exists in that district
  // =============================================
  validateNumericWard(wardNumber, districtName, provinceName) {
    this._buildOldAdminData();
    const prov = provinceName || '';
    const provData = this._oldAdminData[prov];
    if (!provData) return { valid: false, suggestions: [] };

    const targetWard = `Phường ${wardNumber}`;
    const results = [];

    if (districtName) {
      // Search specific district
      for (const [dName, dData] of Object.entries(provData.districts)) {
        const normD = this._normKey(dName);
        const normInput = this._normKey(districtName);
        if (normD.includes(normInput) || normInput.includes(normD) || 
            dData.aliases.some(a => this._normKey(a) === normInput)) {
          const found = dData.wards.some(w => this._normKey(w) === this._normKey(targetWard));
          if (found) {
            results.push({ ward: targetWard, district: dName, province: prov, confidence: 1.0 });
          }
        }
      }
    } else {
      // Search all districts in the province
      for (const [dName, dData] of Object.entries(provData.districts)) {
        const found = dData.wards.some(w => this._normKey(w) === this._normKey(targetWard));
        if (found) {
          results.push({ ward: targetWard, district: dName, province: prov, confidence: 0.7 });
        }
      }
    }

    return {
      valid: results.length > 0,
      ambiguous: results.length > 1,
      suggestions: results
    };
  },

  // =============================================
  // 2025 ADMINISTRATIVE REFORM: 3-TIER → 2-TIER
  // Old: Province → District → Ward
  // New: Province → Ward (District removed)
  // =============================================
  _newAdminMapping: null,

  _buildNewAdminMapping() {
    if (this._newAdminMapping) return;

    // Mapping: { province: { oldDistrict: { oldWard: { newWard, newDistrict (TP/Quận mới nếu có) } } } }
    // Cải cách 2025: Bỏ cấp Quận/Huyện trung gian
    // - TP.HCM: Q2, Q9, Thủ Đức → sáp nhập thành TP. Thủ Đức
    // - Một số phường sáp nhập
    this._newAdminMapping = {

      // ============= TP. HỒ CHÍ MINH =============
      'Hồ Chí Minh': {
        // --- TP. Thủ Đức (sáp nhập Q2 + Q9 + Q.Thủ Đức cũ) ---
        'Quận 2': {
          _newDistrict: 'TP. Thủ Đức',
          _wardMap: {
            'Phường Thảo Điền': 'Phường Thảo Điền',
            'Phường An Phú': 'Phường An Phú',
            'Phường An Khánh': 'Phường An Khánh',
            'Phường Bình An': 'Phường Bình An',
            'Phường Bình Trưng Đông': 'Phường Bình Trưng Đông',
            'Phường Bình Trưng Tây': 'Phường Bình Trưng Tây',
            'Phường Cát Lái': 'Phường Cát Lái',
            'Phường Thạnh Mỹ Lợi': 'Phường Thạnh Mỹ Lợi',
            'Phường An Lợi Đông': 'Phường An Lợi Đông',
            'Phường Thủ Thiêm': 'Phường Thủ Thiêm',
          }
        },
        'Quận 9': {
          _newDistrict: 'TP. Thủ Đức',
          _wardMap: {
            'Phường Long Bình': 'Phường Long Bình',
            'Phường Long Thạnh Mỹ': 'Phường Long Thạnh Mỹ',
            'Phường Tân Phú': 'Phường Tân Phú',
            'Phường Hiệp Phú': 'Phường Hiệp Phú',
            'Phường Tăng Nhơn Phú A': 'Phường Tăng Nhơn Phú A',
            'Phường Tăng Nhơn Phú B': 'Phường Tăng Nhơn Phú B',
            'Phường Phước Long B': 'Phường Phước Long B',
            'Phường Phước Long A': 'Phường Phước Long A',
            'Phường Trường Thạnh': 'Phường Trường Thạnh',
            'Phường Long Phước': 'Phường Long Phước',
            'Phường Long Trường': 'Phường Long Trường',
            'Phường Phước Bình': 'Phường Phước Bình',
            'Phường Phú Hữu': 'Phường Phú Hữu',
          }
        },
        'Quận Thủ Đức': {
          _newDistrict: 'TP. Thủ Đức',
          _wardMap: {
            'Phường Linh Chiểu': 'Phường Linh Chiểu',
            'Phường Linh Tây': 'Phường Linh Tây',
            'Phường Linh Đông': 'Phường Linh Đông',
            'Phường Linh Xuân': 'Phường Linh Xuân',
            'Phường Linh Trung': 'Phường Linh Trung',
            'Phường Tam Bình': 'Phường Tam Bình',
            'Phường Tam Phú': 'Phường Tam Phú',
            'Phường Hiệp Bình Chánh': 'Phường Hiệp Bình Chánh',
            'Phường Hiệp Bình Phước': 'Phường Hiệp Bình Phước',
            'Phường Bình Chiểu': 'Phường Bình Chiểu',
            'Phường Bình Thọ': 'Phường Bình Thọ',
            'Phường Trường Thọ': 'Phường Trường Thọ',
          }
        },

        // --- Q1: giữ nguyên ---
        'Quận 1': {
          _newDistrict: 'Quận 1',
          _wardMap: {
            'Phường Tân Định': 'Phường Tân Định',
            'Phường Đa Kao': 'Phường Đa Kao',
            'Phường Bến Nghé': 'Phường Bến Nghé',
            'Phường Bến Thành': 'Phường Bến Thành',
            'Phường Nguyễn Thái Bình': 'Phường Nguyễn Thái Bình',
            'Phường Phạm Ngũ Lão': 'Phường Phạm Ngũ Lão',
            'Phường Cầu Ông Lãnh': 'Phường Cầu Ông Lãnh',
            'Phường Cô Giang': 'Phường Cô Giang',
            'Phường Nguyễn Cư Trinh': 'Phường Nguyễn Cư Trinh',
            'Phường Cầu Kho': 'Phường Cầu Kho',
          }
        },

        // --- Q3 → giữ nguyên ---
        'Quận 3': { _newDistrict: 'Quận 3', _wardMap: null },
        // --- Q4 → giữ nguyên ---
        'Quận 4': { _newDistrict: 'Quận 4', _wardMap: null },
        // --- Q5 → giữ nguyên ---
        'Quận 5': { _newDistrict: 'Quận 5', _wardMap: null },
        // --- Q6 → giữ nguyên ---
        'Quận 6': { _newDistrict: 'Quận 6', _wardMap: null },
        // --- Q7 → giữ nguyên ---
        'Quận 7': { _newDistrict: 'Quận 7', _wardMap: null },
        // --- Q8 → giữ nguyên ---
        'Quận 8': { _newDistrict: 'Quận 8', _wardMap: null },
        // --- Q10 → giữ nguyên ---
        'Quận 10': { _newDistrict: 'Quận 10', _wardMap: null },
        // --- Q11 → giữ nguyên ---
        'Quận 11': { _newDistrict: 'Quận 11', _wardMap: null },
        // --- Q12 → giữ nguyên ---
        'Quận 12': { _newDistrict: 'Quận 12', _wardMap: null },

        // --- Các quận giữ nguyên tên ---
        'Quận Bình Thạnh': { _newDistrict: 'Quận Bình Thạnh', _wardMap: null },
        'Quận Gò Vấp': { _newDistrict: 'Quận Gò Vấp', _wardMap: null },
        'Quận Phú Nhuận': { _newDistrict: 'Quận Phú Nhuận', _wardMap: null },
        'Quận Tân Bình': { _newDistrict: 'Quận Tân Bình', _wardMap: null },
        'Quận Tân Phú': { _newDistrict: 'Quận Tân Phú', _wardMap: null },
        'Quận Bình Tân': { _newDistrict: 'Quận Bình Tân', _wardMap: null },

        // --- Các huyện ---
        'Huyện Bình Chánh': { _newDistrict: 'Huyện Bình Chánh', _wardMap: null },
        'Huyện Hóc Môn': { _newDistrict: 'Huyện Hóc Môn', _wardMap: null },
        'Huyện Củ Chi': { _newDistrict: 'Huyện Củ Chi', _wardMap: null },
        'Huyện Nhà Bè': { _newDistrict: 'Huyện Nhà Bè', _wardMap: null },
        'Huyện Cần Giờ': { _newDistrict: 'Huyện Cần Giờ', _wardMap: null },
      },

      // ============= HÀ NỘI =============
      'Hà Nội': {
        // Hà Nội giữ nguyên cấp Quận nhưng một số phường sáp nhập
        'Quận Ba Đình': { _newDistrict: 'Quận Ba Đình', _wardMap: null },
        'Quận Hoàn Kiếm': { _newDistrict: 'Quận Hoàn Kiếm', _wardMap: null },
        'Quận Đống Đa': { _newDistrict: 'Quận Đống Đa', _wardMap: null },
        'Quận Hai Bà Trưng': { _newDistrict: 'Quận Hai Bà Trưng', _wardMap: null },
        'Quận Thanh Xuân': { _newDistrict: 'Quận Thanh Xuân', _wardMap: null },
        'Quận Cầu Giấy': { _newDistrict: 'Quận Cầu Giấy', _wardMap: null },
        'Quận Hoàng Mai': { _newDistrict: 'Quận Hoàng Mai', _wardMap: null },
        'Quận Long Biên': { _newDistrict: 'Quận Long Biên', _wardMap: null },
        'Quận Tây Hồ': { _newDistrict: 'Quận Tây Hồ', _wardMap: null },
        'Quận Bắc Từ Liêm': { _newDistrict: 'Quận Bắc Từ Liêm', _wardMap: null },
        'Quận Nam Từ Liêm': { _newDistrict: 'Quận Nam Từ Liêm', _wardMap: null },
        'Quận Hà Đông': { _newDistrict: 'Quận Hà Đông', _wardMap: null },
      },

      // ============= ĐÀ NẴNG =============
      'Đà Nẵng': {
        'Quận Hải Châu': { _newDistrict: 'Quận Hải Châu', _wardMap: null },
        'Quận Thanh Khê': { _newDistrict: 'Quận Thanh Khê', _wardMap: null },
        'Quận Sơn Trà': { _newDistrict: 'Quận Sơn Trà', _wardMap: null },
        'Quận Ngũ Hành Sơn': { _newDistrict: 'Quận Ngũ Hành Sơn', _wardMap: null },
        'Quận Liên Chiểu': { _newDistrict: 'Quận Liên Chiểu', _wardMap: null },
        'Quận Cẩm Lệ': { _newDistrict: 'Quận Cẩm Lệ', _wardMap: null },
      }
    };
  },

  // =============================================
  // CORE: Convert old 3-tier → new 2-tier address
  // Input:  { ward, district, province }
  // Output: { newWard, newDistrict, province, converted, note }
  // =============================================
  convertTo2Tier(ward, district, province) {
    this._buildNewAdminMapping();

    const result = {
      newWard: ward || '',
      newDistrict: district || '',
      province: province || '',
      converted: false,
      note: ''
    };

    if (!province || !district) return result;

    const provMapping = this._newAdminMapping[province];
    if (!provMapping) return result;

    // Try exact match first
    let distMapping = provMapping[district];

    // If not found, try fuzzy match via normalized keys
    if (!distMapping) {
      const normDist = this._normKey(district);
      for (const [key, val] of Object.entries(provMapping)) {
        if (this._normKey(key) === normDist) {
          distMapping = val;
          break;
        }
      }
    }

    if (!distMapping) return result;

    const oldDistrict = district;
    const newDistrict = distMapping._newDistrict;

    // Check if district actually changed
    const districtChanged = this._normKey(oldDistrict) !== this._normKey(newDistrict);

    if (districtChanged) {
      result.newDistrict = newDistrict;
      result.converted = true;
      result.note = `${oldDistrict} → ${newDistrict}`;
    } else {
      result.newDistrict = newDistrict;
    }

    // Check ward mapping
    if (ward && distMapping._wardMap) {
      // Try exact match
      let newWard = distMapping._wardMap[ward];

      // Try fuzzy match
      if (!newWard) {
        const normWard = this._normKey(ward);
        for (const [oldW, newW] of Object.entries(distMapping._wardMap)) {
          if (this._normKey(oldW) === normWard) {
            newWard = newW;
            break;
          }
        }
      }

      if (newWard) {
        const wardChanged = this._normKey(ward) !== this._normKey(newWard);
        if (wardChanged) {
          result.note += (result.note ? '; ' : '') + `${ward} → ${newWard}`;
          result.converted = true;
        }
        result.newWard = newWard;
      } else {
        // Ward not found in mapping, keep as-is
        result.newWard = ward;
      }
    } else {
      result.newWard = ward || '';
    }

    return result;
  },

  // =============================================
  // 2025 MASTER DATA HELPERS
  // Access the 3,321 post-merger wards
  // =============================================

  /**
   * Get all known wards for a province (combining old + 2025 data)
   * @param {string} province - Canonical province name
   * @returns {string[]} Array of ward names
   */
  getWardsForProvince(province) {
    const wards = new Set();
    const normKey = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/\s+/g, '');
    const normProv = normKey(province);

    // From legacy _oldAdminData
    this._buildOldAdminData();
    const oldProv = this._oldAdminData?.[province];
    if (oldProv) {
      for (const distData of Object.values(oldProv.districts)) {
        for (const w of distData.wards) wards.add(w);
      }
    }

    // From 2025 master data
    if (typeof MASTER_WARDS_2025 !== 'undefined') {
      for (const [masterProv, masterWards] of Object.entries(MASTER_WARDS_2025)) {
        const masterNorm = normKey(masterProv);
        if (masterNorm === normProv || masterNorm.includes(normProv) || normProv.includes(masterNorm)) {
          for (const w of masterWards) wards.add(w);
        }
      }
    }

    return [...wards];
  },

  /**
   * Check if a ward name exists in the 2025 master data for a province
   * @param {string} wardName - Ward name to check
   * @param {string} province - Province name (optional - searches all if not given)
   * @returns {{ valid: boolean, canonicalWard: string|null, province: string|null }}
   */
  isValidWard2025(wardName, province) {
    if (typeof MASTER_WARDS_2025 === 'undefined') return { valid: false, canonicalWard: null, province: null };

    const normKey = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/\s+/g, '');
    const normWard = normKey(wardName);
    // Also try without prefix
    const normWardNoPfx = normWard.replace(/^(phuong|xa|thitran)/, '');

    const searchIn = province
      ? Object.entries(MASTER_WARDS_2025).filter(([p]) => {
          const np = normKey(p);
          const nProv = normKey(province);
          return np === nProv || np.includes(nProv) || nProv.includes(np);
        })
      : Object.entries(MASTER_WARDS_2025);

    for (const [prov, wards] of searchIn) {
      for (const w of wards) {
        const nw = normKey(w);
        const nwNoPfx = nw.replace(/^(phuong|xa|thitran)/, '');
        if (nw === normWard || nwNoPfx === normWardNoPfx || nw === normWardNoPfx || nwNoPfx === normWard) {
          return { valid: true, canonicalWard: w, province: prov };
        }
      }
    }

    return { valid: false, canonicalWard: null, province: null };
  },

  /**
   * Get statistics about the 2025 master data
   */
  getMasterDataStats() {
    if (typeof MASTER_WARDS_2025 === 'undefined') return { provinces: 0, totalWards: 0, loaded: false };
    const provinces = Object.keys(MASTER_WARDS_2025).length;
    let totalWards = 0;
    for (const wards of Object.values(MASTER_WARDS_2025)) totalWards += wards.length;
    return { provinces, totalWards, loaded: true };
  }
};
