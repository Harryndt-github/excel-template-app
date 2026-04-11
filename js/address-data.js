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
  ],

  // =============================================
  // OLD 3-TIER ADMINISTRATIVE UNITS
  // Province → District → Wards + Streets
  // This is used for backward compatibility
  // =============================================
  _oldAdminData: null,

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
  // =============================================
  _normKey(str) {
    if (!str) return '';
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D')
      .replace(/ơ/g, 'o').replace(/ư/g, 'u')
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
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
    ];
    
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

    // Pattern 1: P + number → "Phường " + number (e.g., P15 → Phường 15)
    const pNumMatch = trimmed.match(/^[Pp]\.?\s*(\d+)$/);
    if (pNumMatch) {
      return { type: 'ward', value: `Phường ${pNumMatch[1]}`, original: trimmed };
    }

    // Pattern 2: P + Name (no space or with space) → "Phường " + Name
    // e.g., PThanh Xuan → Phường Thanh Xuân, PBinh Thanh → Phường Bình Thạnh
    const pNameMatch = trimmed.match(/^[Pp]\.?\s*([A-ZĐÀ-Ỹa-zđà-ỹ][a-zđà-ỹ]+(?:\s*[A-Za-zĐđÀ-ỹ][a-zđà-ỹ]*)*)$/);
    if (pNameMatch) {
      const wardName = pNameMatch[1].replace(/([a-zỹỵ])([A-ZĐ])/g, '$1 $2').trim();
      return { type: 'ward', value: `Phường ${wardName}`, original: trimmed };
    }

    // Pattern 3: X + name → "Xã " + name (e.g., XBinh Chanh)  
    const xNameMatch = trimmed.match(/^[Xx]\.?\s*([A-ZĐa-zđ].+)$/);
    if (xNameMatch) {
      const wardName = xNameMatch[1].replace(/([a-z])([A-Z])/g, '$1 $2').trim();
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

    // Pattern 2: Q + Name → "Quận " + Name (e.g., QTan Binh, QTanBinh → Quận Tan Binh)
    // Use \s* to allow both "Q Tan Binh" and "QTanBinh" (CamelCase split handled below)
    const qNameMatch = trimmed.match(/^[Qq]\.?\s*([A-ZĐÀ-Ỹa-zđà-ỹ][a-zđà-ỹ]*(?:\s*[A-Za-zĐđÀ-ỹ][a-zđà-ỹ]*)*)$/);
    if (qNameMatch) {
      const distName = qNameMatch[1].replace(/([a-zà-ỹ])([A-ZĐÀ-Ỹ])/g, '$1 $2').trim();
      return { type: 'district', value: `Quận ${distName}`, original: trimmed };
    }

    // Pattern 3: H + Name → "Huyện " + Name (but NOT HCM, HN)
    const hNameMatch = trimmed.match(/^[Hh]\.?\s*([A-ZĐÀ-Ỹa-zđà-ỹ][a-zđà-ỹ]+(?:\s+[A-Za-zĐđÀ-ỹ]+)*)$/);
    if (hNameMatch && !trimmed.match(/^[Hh]([Cc][Mm]|[Nn])$/i)) {
      const distName = hNameMatch[1].replace(/([a-zỹỵ])([A-ZĐ])/g, '$1 $2').trim();
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
  }
};
