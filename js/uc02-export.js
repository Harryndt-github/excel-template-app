/* ============================================
   UC02 - Xuất template giải ngân (BRD Section 4)
   188 cột theo đúng thứ tự BRD_TOOL_FINAL.docx
   Nguồn dữ liệu: Extract LMS (AppState.extractedData),
   Rule Engine (RateRuleEngine), Chi nhánh, Thông tin dự án,
   Master Data, nhập tay.
   ============================================ */

const UC02_COLUMNS = [
  'STT','SoLos','MaCanDichVu','MaCn','MaCnKyHsgn','MaCnKyHsts','ConLaiThuNhapKhac','SoHdtd','NgayKyHdtd','SoKunn',
  'SoHdtc','SoTienVay','ThoiHanVay','MucDichVay','SoTaiKhoan','XepHangLaiSuat','SoTienGnLanDau',
  'SoTienNhanNoTrenLd1','SoThangKyLd1','AnHanGocLd1','NgayTraGocLd1','SoTienNienKimKu1','SoKyTraNoLd1',
  'LuaChonLaiSuatLd1','NgayChanHoTroLaiSuatLd1','ThoiGianCoDinhLaiSuatLd1','LaiSuatCoDinhLd1','BienDoLaiSuatLd1',
  'LscsCtv1','BienDoCtv1','LscsCtv2','BienDoCtv2','LscsCtv3','PhiTraNoTruocHanLd1','DkPhiTnth',
  'LoaiLsCoSoCbnv','CtCbnvTcbCbnvWb','LsCbnv','BienDoCbnv','SoTienNienKimCbnv',
  'SoTienTraMoiKyLd1','SoTienTraKyCuoiLd1',
  'SoTienNhanNoTrenLd2','SoThangKyLd2','AnHanGocLd2','NgayTraGocLd2','SoKyTraNold2','SoTienNienKimLd2',
  'LuaChonLaiSuatLd2','NgayChanHoTroLaiSuatLd2','ThoiGianCoDinhLaiSuatLd2','LaiSuatCoDinhLd2','BienDoLaiSuatLd2',
  'PhiTraNoTruocHanLd2','SoTienTraMoiKyLd2','SoTienTraKyCuoiLd2',
  'SoTienNhanNoTrenLd3','SoThangKyLd3','AnHanGocLd3','SoKyTraNoLd3','SoTienNienKimLd3',
  'LuaChonLaiSuatLd3','NgayChanHoTroLaiSuatLd3','ThoiGianCoDinhLaiSuatLd3','LaiSuatCoDinhLd3','BienDoLaiSuatLd3',
  'PhiTraNoTruocHanLd3','SoTienTraMoiKyLd3','SoTienTraKyCuoiLd3',
  'LaiSuatCoSo','LoaiLaiSuatCoSo','NgayBanGiao','HubUyQuyen','SoCmndNoiCapNgayCap','DiaChi',
  'IdKhachHang','BenVay1','QuocTichBenVay1','NamSinhBenVay1','CmndBenVay1','NoiCapCmndBenVay1','NgayCapCmndBenVay1','DiaChiBenVay1',
  'BenVay2','QuocTichBenVay2','NamSinhBenVay2','CmndBenVay2','NoiCapCmndBenVay2','NgayCapCmndBenVay2','DiaChiBenVay2',
  'BenChuyenNhuong1','CmndBenChuyenNhuong1','DiaChiBenChuyenNhuong1','BenChuyenNhuong2','CmndBenChuyenNhuong2','DiaChiBenChuyenNhuong2',
  'UyQuyenKyHdtd',
  'BenBaoLanh1','QuocTichBenBaoLanh1','NamSinhBenBaoLanh1','CmndBenBaoLanh1','CmndBs','NoiCapCmndBenBaoLanh1','NgayCapCmndBenBaoLanh1','DiaChiBenBaoLanh1',
  'BenBaoLanh2','QuocTichBenBaoLanh2','NamSinhBenBaoLanh2','CmndBenBaoLanh2','Cmnd1Bs','NoiCapCmndBenBaoLanh2','NgayCapCmndBenBaoLanh2','DiaChiBenBaoLanh2',
  'UyQuyenKyKetHoSoTaiSan','TrangThaiKh','TrangThaiTaiSan','LoaiHinhTs','GiaTriTaiSan','GiaTriDamBaoMax','MoTaTaiSan',
  'TenDuAn','ChuDauTu','DiaChiDuAn','SoHdmbVbttTtkqHddc','NgayKy','BenBanTrenHdmb','BenChuyenNhuongCuoi','NgayKyVbcn','ChuyenNhuong2',
  'BenMuaTrenHopDong','PhuongThucMuaBan','DuAn','ChinhSach','SoHuu','DienThoaiTrenHd','EmailTrenHd','DiaChiLienHeTrenHd',
  'NguonGocTs','HienTrangTaiSan','SoChungThuPhieuDinhGia','NgayCapChungThuPhieuDinhGia','NoiCapChungThuPhieuDinhGia',
  'LoaiHinhTaiSan','CodeTaiSan','MaCanDichVu2','MaCanDichVu3','NguoiDungTenTrenHdmb','BenNhanCoc','LoaiHinhTaiSanVietThuong',
  'GiaTriTichLuyToiThieu','SoKyTraNoGocDacThu','PhuongThucTraNoThongThuong','PhuongThucTraNoNienKim1Phan','TraNoGoc1Lan','TraNoGocNhieuLan',
  'Cgpd','TkSale','LinhVucSuDungVon','ChinhSachAd',
  'NgayBanGiaoDuKien','MaCs','MaCt','MaDuAn','Net','Vat','Kpbt','ThongTinHsgn','TenHsgn','MaCanXuatTt',
  'LuaChonLsKu1','LuaChonLsKu2','LuaChonLsKu3','NgayGnKhCu',
  'ThoiGianAnHanLaiLd1','ThoiGianAnHanLaiLd2','ThoiGianAnHanLaiLd3',
  'SoThangKyLaiLd1','SoThangKyLaiLd2','SoThangKyLaiLd3',
  'CodeChinhSachLd1','CodeChinhSachLd2','CodeChinhSachLd3',
  'ThoiHanVayHdmb','PhongNvSoan','UserXuat','DienTichCanHoNhaO','SoBiTaiSan','NgayPheDuyet'
];

// Nhóm hiển thị: cột đánh dấu mở đầu nhóm mới
const UC02_GROUPS = {
  'STT': 'Thông tin chung & khoản vay',
  'SoTienNhanNoTrenLd1': 'Khế ước 1 (Ld1)',
  'LscsCtv1': 'CTV / CBNV / Phí TNTH',
  'SoTienTraMoiKyLd1': 'Khế ước 1 (tiếp)',
  'SoTienNhanNoTrenLd2': 'Khế ước 2 (Ld2)',
  'SoTienNhanNoTrenLd3': 'Khế ước 3 (Ld3)',
  'LaiSuatCoSo': 'Lãi suất cơ sở & bàn giao',
  'IdKhachHang': 'Bên vay',
  'BenChuyenNhuong1': 'Bên chuyển nhượng',
  'BenBaoLanh1': 'Bên bảo lãnh (chủ tài sản)',
  'UyQuyenKyKetHoSoTaiSan': 'Tài sản',
  'TenDuAn': 'Dự án & HĐMB',
  'GiaTriTichLuyToiThieu': 'Phương thức trả nợ & khác',
  'NgayBanGiaoDuKien': 'Mã hạch toán & xuất file',
};

/* Mapping mặc định: cột UC02 → danh sách ứng viên 'nguồn::trường'
   (theo thứ tự ưu tiên — Tự động map chọn ứng viên đầu tiên có dữ liệu).
   Nguồn: thong_tin_vay/tai_san/chu_tai_san/tai_san_ctt/... = Extract LMS,
   derived = Rule Engine, branch = Chi nhánh, project = Thông tin dự án,
   special = giá trị hệ thống tự sinh. */
const UC02_DEFAULT_MAP = {
  'STT':                      ['special::stt'],
  'SoLos':                    ['thong_tin_vay::Số hồ sơ Smartcredit'],
  'MaCanDichVu':              ['thong_tin_vay::Mã căn vay vốn', 'tai_san::Mã căn'],
  'MaCn':                     ['thong_tin_vay::Chi nhánh', 'branch::ma_chi_nhanh_t24'],
  'MaCnKyHsgn':               ['branch::ma_chi_nhanh'],
  'MaCnKyHsts':               ['tai_san::Chi nhánh ký HSTS'],
  'SoHdtd':                   ['thong_tin_vay::Số HĐTD'],
  'SoHdtc':                   ['tai_san::Số hợp đồng thế chấp'],
  'SoTienVay':                ['thong_tin_vay::Tổng số tiền vay'],
  'ThoiHanVay':               ['thong_tin_vay::Thời hạn vay'],
  'MucDichVay':               ['thong_tin_vay::Mục đích vay', 'project::muc_dich_vay'],
  'SoTaiKhoan':               ['thong_tin_vay::Tài khoản trả nợ'],
  'XepHangLaiSuat':           ['thong_tin_vay::Xếp hạng khách hàng'],
  'SoTienGnLanDau':           ['thong_tin_vay::Số tiền giải ngân'],
  // ----- Khế ước 1 (trùng key Extract → suffix (2),(3),(4) theo thứ tự xuất hiện)
  'SoTienNhanNoTrenLd1':      ['thong_tin_vay::Số tiền giải ngân (2)'],
  'SoThangKyLd1':             ['thong_tin_vay::Thời gian vay'],
  'AnHanGocLd1':              ['derived::Ân hạn gốc áp dụng', 'thong_tin_vay::Thời gian ân hạn gốc'],
  'NgayTraGocLd1':            ['thong_tin_vay::Ngày trả gốc đầu tiên'],
  'SoTienNienKimKu1':         ['thong_tin_vay::Số tiền niên kim'],
  'SoKyTraNoLd1':             ['thong_tin_vay::Số kỳ trả nợ gốc'],
  'LuaChonLaiSuatLd1':        ['thong_tin_vay::Lựa chọn HTLS KU1'],
  'NgayChanHoTroLaiSuatLd1':  ['derived::Ngày chặn HTLS', 'thong_tin_vay::Ngày chặn HTLS'],
  'ThoiGianCoDinhLaiSuatLd1': ['derived::Tháng chặn HTLS', 'thong_tin_vay::Lựa chọn cố định lãi suất'],
  'LaiSuatCoDinhLd1':         ['derived::Lãi suất cố định', 'thong_tin_vay::Lãi suất cố định'],
  'BienDoLaiSuatLd1':         ['derived::Biên độ', 'thong_tin_vay::Biên độ'],
  'PhiTraNoTruocHanLd1':      ['derived::Phí TNTH hiện hành'],
  'DkPhiTnth':                ['derived::Điều kiện phí TNTH'],
  'SoTienTraMoiKyLd1':        ['thong_tin_vay::Số tiền trả gốc mỗi kỳ'],
  'SoTienTraKyCuoiLd1':       ['thong_tin_vay::Só tiền trả gốc kỳ cuối'],
  // ----- Khế ước 2
  'SoTienNhanNoTrenLd2':      ['thong_tin_vay::Số tiền giải ngân (3)'],
  'SoThangKyLd2':             ['thong_tin_vay::Thời gian vay (2)'],
  'AnHanGocLd2':              ['thong_tin_vay::Thời gian ân hạn gốc (2)'],
  'NgayTraGocLd2':            ['thong_tin_vay::Ngày trả gốc đầu tiên (2)'],
  'SoKyTraNold2':             ['thong_tin_vay::Số kỳ trả nợ gốc (2)'],
  'SoTienNienKimLd2':         ['thong_tin_vay::Số tiền niên kim (2)'],
  'LuaChonLaiSuatLd2':        ['thong_tin_vay::Lựa chọn HTLS KU1 (2)'],
  'NgayChanHoTroLaiSuatLd2':  ['thong_tin_vay::Ngày chặn HTLS (2)'],
  'ThoiGianCoDinhLaiSuatLd2': ['thong_tin_vay::Lựa chọn cố định lãi suất (2)'],
  'LaiSuatCoDinhLd2':         ['thong_tin_vay::Lãi suất cố định (2)'],
  'BienDoLaiSuatLd2':         ['thong_tin_vay::Biên độ (2)'],
  'SoTienTraMoiKyLd2':        ['thong_tin_vay::Số tiền trả gốc mỗi kỳ (2)'],
  'SoTienTraKyCuoiLd2':       ['thong_tin_vay::Só tiền trả gốc kỳ cuối (2)'],
  // ----- Khế ước 3
  'SoTienNhanNoTrenLd3':      ['thong_tin_vay::Số tiền giải ngân (4)'],
  'SoThangKyLd3':             ['thong_tin_vay::Thời gian vay (3)'],
  'AnHanGocLd3':              ['thong_tin_vay::Thời gian ân hạn gốc (3)'],
  'SoKyTraNoLd3':             ['thong_tin_vay::Số kỳ trả nợ gốc (3)'],
  'SoTienNienKimLd3':         ['thong_tin_vay::Số tiền niên kim (3)'],
  'LuaChonLaiSuatLd3':        ['thong_tin_vay::Lựa chọn HTLS KU1 (3)'],
  'NgayChanHoTroLaiSuatLd3':  ['thong_tin_vay::Ngày chặn HTLS (3)'],
  'ThoiGianCoDinhLaiSuatLd3': ['thong_tin_vay::Lựa chọn cố định lãi suất (3)'],
  'LaiSuatCoDinhLd3':         ['thong_tin_vay::Lãi suất cố định (3)'],
  'BienDoLaiSuatLd3':         ['thong_tin_vay::Biên độ (3)'],
  'SoTienTraMoiKyLd3':        ['thong_tin_vay::Số tiền trả gốc mỗi kỳ (3)'],
  'SoTienTraKyCuoiLd3':       ['thong_tin_vay::Só tiền trả gốc kỳ cuối (3)'],
  // ----- Bàn giao / địa chỉ
  'NgayBanGiao':              ['tai_san_ctt::Ngày dự kiến bàn giao'],
  'HubUyQuyen':               ['branch::hub'],
  'SoCmndNoiCapNgayCap':      ['special::cmnd1_full'],
  'DiaChi':                   ['thong_tin_vay::Địa chỉ thường trú bên vay 1'],
  // ----- Bên vay
  'IdKhachHang':              ['thong_tin_vay::ID khách hàng'],
  'BenVay1':                  ['thong_tin_vay::Họ tên bên vay 1'],
  'QuocTichBenVay1':          ['thong_tin_vay::Quốc tịch bên vay 1'],
  'NamSinhBenVay1':           ['thong_tin_vay::Ngày sinh bên vay 1'],
  'CmndBenVay1':              ['thong_tin_vay::CMND bên vay 1'],
  'NoiCapCmndBenVay1':        ['thong_tin_vay::Nơi cấp bên vay 1'],
  'NgayCapCmndBenVay1':       ['thong_tin_vay::Ngày cấp bên vay 1'],
  'DiaChiBenVay1':            ['thong_tin_vay::Địa chỉ thường trú bên vay 1'],
  'BenVay2':                  ['thong_tin_vay::Họ và tên bên vay 2'],
  'QuocTichBenVay2':          ['thong_tin_vay::Quốc tịch bên vay 2'],
  'NamSinhBenVay2':           ['thong_tin_vay::Ngày sinh bên vay 2'],
  'CmndBenVay2':              ['thong_tin_vay::CMND bên vay 2'],
  'NoiCapCmndBenVay2':        ['thong_tin_vay::Nơi cấp bên vay 2'],
  'NgayCapCmndBenVay2':       ['thong_tin_vay::Ngày cấp bên vay 2'],
  'DiaChiBenVay2':            ['thong_tin_vay::Địa chỉ thường trú bên vay 2'],
  // ----- Bên chuyển nhượng
  'BenChuyenNhuong1':         ['tai_san_ctt::Tên bên chuyển nhượng'],
  'BenChuyenNhuongCuoi':      ['tai_san_ctt::Tên bên chuyển nhượng'],
  'UyQuyenKyHdtd':            ['thong_tin_vay::Uỷ quyền ký hợp đồng bên vay'],
  // ----- Bên bảo lãnh (chủ tài sản)
  'BenBaoLanh1':              ['tai_san::Chủ tài sản 1', 'chu_tai_san::Chủ tài sản'],
  'QuocTichBenBaoLanh1':      ['tai_san::Quốc tịch chủ tài sản 1', 'chu_tai_san::Quốc tịch chủ tài sản'],
  'NamSinhBenBaoLanh1':       ['tai_san::Ngày sinh chủ tài sản 1', 'chu_tai_san::Ngày sinh chủ tài sản'],
  'CmndBenBaoLanh1':          ['tai_san::CMND chủ tài sản 1', 'chu_tai_san::CMND của chủ tài sản trên giấy GCN'],
  'DiaChiBenBaoLanh1':        ['tai_san::Địa chỉ thường trú chủ tài sản 1', 'chu_tai_san::Địa chỉ thường trú chủ tài sản'],
  'BenBaoLanh2':              ['tai_san::Vợ/Chồng chủ tài sản 1', 'chu_tai_san::Vợ/Chồng chủ tài sản'],
  'QuocTichBenBaoLanh2':      ['tai_san::Quốc tịch vợ/chồng chủ tài sản 1', 'chu_tai_san::Quốc tịch vợ/chồng chủ tài sản'],
  'NamSinhBenBaoLanh2':       ['tai_san::Ngày sinh vợ/chồng chủ tài sản 1', 'chu_tai_san::Ngày sinh vợ/chồng chủ tài sản'],
  'CmndBenBaoLanh2':          ['tai_san::CMND Vợ/chồng chủ tài sản 1', 'chu_tai_san::CMND vợ/chồng chủ tài sản'],
  'UyQuyenKyKetHoSoTaiSan':   ['tai_san::Uỷ quyền ký HSTS chủ tài sản 1', 'chu_tai_san::Uỷ quyền ký HSTS chủ tài sản'],
  // ----- Tài sản
  'TrangThaiKh':              ['thong_tin_vay::Khách hàng ETB/NTB'],
  'TrangThaiTaiSan':          ['tai_san::Trạng thái tài sản', 'tai_san_ctt::Trạng thái tài sản'],
  'LoaiHinhTs':               ['tai_san::Loại hình tài sản', 'project::loai_hinh_tai_san'],
  'GiaTriTaiSan':             ['tai_san::Giá trị tài sản'],
  'GiaTriDamBaoMax':          ['tai_san::Giá trị bảo đảm tối đa'],
  'NguonGocTs':               ['tai_san::Nguồn gốc tài sản'],
  'HienTrangTaiSan':          ['tai_san::Hiện trạng tài sản'],
  'SoChungThuPhieuDinhGia':   ['tai_san::Số phiếu định giá', 'tai_san::Mã phiếu định giá'],
  'NgayCapChungThuPhieuDinhGia': ['tai_san::Ngày định giá'],
  'NoiCapChungThuPhieuDinhGia':  ['tai_san::Tên công ty định giá'],
  'LoaiHinhTaiSan':           ['tai_san::Loại hình tài sản', 'project::loai_hinh_tai_san'],
  'LoaiHinhTaiSanVietThuong': ['special::loaihinh_lower'],
  'CodeTaiSan':               ['tai_san_ctt::Code căn hộ'],
  'DienTichCanHoNhaO':        ['tai_san::Diện tích'],
  'SoBiTaiSan':               ['tai_san::Số bì nhập kho'],
  // ----- Dự án & HĐMB
  'TenDuAn':                  ['tai_san_ctt::Tên dự án trên hợp đồng', 'project::ten_du_an'],
  'ChuDauTu':                 ['tai_san_ctt::Tên chủ đầu tư', 'project::ten_cdt'],
  'DiaChiDuAn':               ['tai_san_ctt::Địa chỉ dự án', 'project::dia_chi_du_an'],
  'SoHdmbVbttTtkqHddc':       ['tai_san_ctt::Số HĐMB', 'project::so_hdmb'],
  'NgayKy':                   ['tai_san_ctt::Ngày ký HĐMB'],
  'BenBanTrenHdmb':           ['tai_san_ctt::Tên người ký trên HĐMB'],
  'NguoiDungTenTrenHdmb':     ['tai_san_ctt::Tên người ký trên HĐMB'],
  'BenMuaTrenHopDong':        ['thong_tin_vay::Họ tên bên vay 1'],
  'DuAn':                     ['project::ten_du_an', 'tai_san_ctt::Tên dự án trên hợp đồng'],
  'ChinhSach':                ['thong_tin_vay::Chính sách bán hàng'],
  'DienThoaiTrenHd':          ['thong_tin_vay::Số điện thoại khách hàng'],
  'EmailTrenHd':              ['thong_tin_vay::Email khách hàng'],
  'DiaChiLienHeTrenHd':       ['thong_tin_vay::Địa chỉ thường trú bên vay 1'],
  // ----- Phương thức trả nợ & khác
  'PhuongThucTraNoThongThuong': ['thong_tin_vay::Phương thức trả nợ'],
  'TkSale':                   ['thong_tin_vay::Tài khoản CTV'],
  'LinhVucSuDungVon':         ['thong_tin_vay::Mục đích vay'],
  'ChinhSachAd':              ['thong_tin_vay::Chính sách bán hàng'],
  // ----- Mã hạch toán & xuất file
  'NgayBanGiaoDuKien':        ['tai_san_ctt::Ngày dự kiến bàn giao'],
  'MaCs':                     ['project::ma_chinh_sach', 'thong_tin_vay::Mã chính sách'],
  'MaCt':                     ['project::ma_chuong_trinh', 'thong_tin_vay::Mã chương trình'],
  'MaDuAn':                   ['thong_tin_vay::Mã dự án vay vốn', 'tai_san::Mã dự án', 'project::ma_du_an'],
  'Net':                      ['tai_san_ctt::Giá NET'],
  'Vat':                      ['tai_san_ctt::Giá VAT'],
  'Kpbt':                     ['tai_san_ctt::Kinh phí bảo trì'],
  'MaCanXuatTt':              ['tai_san::Mã căn', 'thong_tin_vay::Mã căn vay vốn'],
  'LuaChonLsKu1':             ['thong_tin_vay::Lựa chọn HTLS KU1'],
  'LuaChonLsKu2':             ['thong_tin_vay::Lựa chọn HTLS KU1 (2)'],
  'LuaChonLsKu3':             ['thong_tin_vay::Lựa chọn HTLS KU1 (3)'],
  'ThoiGianAnHanLaiLd1':      ['derived::Ân hạn lãi'],
  'SoThangKyLaiLd1':          ['thong_tin_vay::Tần suất trả nợ lãi'],
  'CodeChinhSachLd1':         ['thong_tin_vay::Mã chính sách'],
  'CodeChinhSachLd2':         ['thong_tin_vay::Mã chính sách (2)'],
  'CodeChinhSachLd3':         ['thong_tin_vay::Mã chính sách (3)'],
  'PhongNvSoan':              ['branch::ma_phong_ban'],
  'NgayPheDuyet':             ['thong_tin_vay::Ngày phê duyệt'],
};

const UC02Module = {
  STORAGE_KEY: 'uc02_state_v1',
  _state: { map: {}, manual: {}, engine: {} },
  _derived: null,          // kết quả Rule Engine chạy từ trang UC02
  _optionsCache: null,     // cache HTML options cho select (populate lazy)

  /* ── helpers ── */
  _esc(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  },
  _norm(str) {
    return (str || '')
      .replace(/([a-z])([A-Z])/g, '$1 $2')   // tách CamelCase
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[đĐ]/g, 'd')
      .replace(/[_\-()]+/g, ' ')
      .toLowerCase().trim().replace(/\s+/g, ' ');
  },
  _toast(msg, type) {
    if (typeof App !== 'undefined' && App.toast) App.toast(msg, type || 'info');
  },

  /* ── state persistence ── */
  loadState() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this._state = { map: parsed.map || {}, manual: parsed.manual || {}, engine: parsed.engine || {} };
      }
    } catch (e) { /* state hỏng → dùng mặc định */ }
  },
  saveState() {
    try { localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this._state)); } catch (e) { /* quota */ }
  },

  /* ── nguồn dữ liệu ── */
  _getDerived() {
    // Ưu tiên kết quả chạy từ trang UC02, fallback kết quả từ trang Ghép dữ liệu
    const gen = (typeof Generator !== 'undefined' && Generator._runtimeDerivedData) || {};
    return Object.assign({}, gen, this._derived || {});
  },
  _resolveSource(mapVal) {
    if (!mapVal) return '';
    const idx = mapVal.indexOf('::');
    if (idx < 0) return '';
    const source = mapVal.slice(0, idx);
    const field = mapVal.slice(idx + 2);
    try {
      if (source === 'special')   return this._special(field);
      if (source === 'derived')   { const v = this._getDerived()[field]; return v === undefined || v === null ? '' : v; }
      if (source === 'branch')    { const b = (typeof BranchModule !== 'undefined') ? BranchModule.getSelectedBranch() : null; return (b && b[field]) || ''; }
      if (source === 'project')   { const p = (typeof ProjectInfoModule !== 'undefined') ? ProjectInfoModule.getSelectedProject() : null; return (p && p[field]) || ''; }
      if (source === 'masterdata') {
        if (typeof MasterData !== 'undefined' && MasterData.getMappingData) return MasterData.getMappingData()[field] ?? '';
        return '';
      }
      if (source === 'ratecenter') {
        const eng = this._state.engine;
        if (typeof RateCenter !== 'undefined' && RateCenter.getTemplateData && eng.projectId && eng.policyId) {
          return RateCenter.getTemplateData(eng.projectId, eng.policyId)[field] ?? '';
        }
        return '';
      }
      const data = (typeof AppState !== 'undefined' && AppState.extractedData[source]) || {};
      return data[field] ?? '';
    } catch (e) { return ''; }
  },
  _special(field) {
    if (field === 'stt') return '1';
    if (field === 'now') {
      const d = new Date();
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    }
    if (field === 'cmnd1_full') {
      const tv = (typeof AppState !== 'undefined' && AppState.extractedData['thong_tin_vay']) || {};
      const parts = [tv['CMND bên vay 1'], tv['Nơi cấp bên vay 1'], tv['Ngày cấp bên vay 1']].filter(v => v && String(v).trim());
      return parts.join(' - ');
    }
    if (field === 'loaihinh_lower') {
      const v = this.resolve('LoaiHinhTaiSan');
      return v ? String(v).toLowerCase() : '';
    }
    return '';
  },
  resolve(col) {
    const manual = this._state.manual[col];
    if (manual !== undefined && String(manual).trim() !== '') return manual;
    return this._resolveSource(this._state.map[col]);
  },

  /* ── auto map ── */
  autoMapAll() {
    const sources = this._collectAllSourceKeys();
    let assigned = 0;
    UC02_COLUMNS.forEach(col => {
      if (this._state.manual[col] && String(this._state.manual[col]).trim() !== '') return;
      const candidates = UC02_DEFAULT_MAP[col];
      if (candidates && candidates.length) {
        // chọn ứng viên đầu tiên có dữ liệu; nếu đều rỗng thì lấy ứng viên đầu
        const withData = candidates.find(c => String(this._resolveSource(c)).trim() !== '');
        this._state.map[col] = withData || candidates[0];
        assigned++;
        return;
      }
      // fuzzy match với mọi nguồn hiện có
      const colNorm = this._norm(col);
      let best = null, bestScore = 0;
      sources.forEach(src => {
        const score = this._score(colNorm, src.norm);
        if (score > bestScore) { bestScore = score; best = src.value; }
      });
      if (best && bestScore >= 50) { this._state.map[col] = best; assigned++; }
    });
    this.saveState();
    this._optionsCache = null;
    this.renderTable();
    this._toast(`Đã tự động map ${assigned} cột`, 'success');
  },
  _score(a, b) {
    if (!a || !b) return 0;
    if (a === b) return 100;
    if (a.includes(b) || b.includes(a)) return 60;
    const aw = a.split(' ').filter(Boolean);
    const bw = b.split(' ').filter(Boolean);
    const overlap = aw.filter(w => w.length > 1 && bw.some(x => x.includes(w) || w.includes(x)));
    return overlap.length ? Math.round((overlap.length / Math.max(aw.length, bw.length)) * 50) : 0;
  },
  _collectAllSourceKeys() {
    const out = [];
    if (typeof AppState !== 'undefined') {
      Object.keys(AppState.extractedData || {}).forEach(ft => {
        Object.keys(AppState.extractedData[ft] || {}).forEach(key => {
          out.push({ value: `${ft}::${key}`, norm: this._norm(key) });
        });
      });
    }
    Object.keys(this._getDerived()).forEach(key => {
      if (!key.startsWith('_')) out.push({ value: `derived::${key}`, norm: this._norm(key) });
    });
    return out;
  },

  /* ── Rule Engine (BRD Section 6) ── */
  runEngine() {
    if (typeof RateCenter === 'undefined' || typeof RateRuleEngine === 'undefined') {
      this._toast('Rule Engine chưa sẵn sàng (rate-center.js chưa load)', 'warning');
      return;
    }
    const eng = this._state.engine;
    eng.projectId = (document.getElementById('uc02-rc-project') || {}).value || eng.projectId || '';
    eng.policyId  = (document.getElementById('uc02-rc-policy') || {}).value || eng.policyId || '';
    eng.gnDate    = (document.getElementById('uc02-rc-gndate') || {}).value || eng.gnDate || '';
    eng.htlsMonths = (document.getElementById('uc02-rc-htls') || {}).value || '';
    eng.loanTermMonths = (document.getElementById('uc02-rc-term') || {}).value || '';
    eng.loanType  = (document.getElementById('uc02-rc-loantype') || {}).value || 'HTLS';
    eng.hasSupplementGrace = !!(document.getElementById('uc02-rc-supp') || {}).checked;
    this.saveState();

    const proj = RateCenter.getProjects().find(p => p.id === eng.projectId);
    const pkg = proj && (proj.packages || []).find(k => k.id === eng.policyId);
    if (!pkg) { this._toast('Chọn dự án và chính sách lãi suất trước', 'warning'); return; }

    const input = {
      htlsMonths: Number(eng.htlsMonths) || 0,
      cdtSupportMonths: Number(eng.htlsMonths) || 0,
      loanTermMonths: Number(eng.loanTermMonths) || 0,
      currentMonth: 1,
      hasHTLS: eng.loanType === 'HTLS',
      hasSupplementGrace: eng.hasSupplementGrace,
      loanType: eng.loanType,
      disbursementDate: eng.gnDate || '',
    };
    this._derived = RateRuleEngine.evaluate(pkg, proj, input);

    // Điều chỉnh lãi suất bổ sung theo dữ liệu hợp đồng (nếu có)
    if (typeof RateRuleEngine.evaluateAdjustments === 'function' &&
        typeof Generator !== 'undefined' && typeof Generator._buildContractData === 'function') {
      const adj = RateRuleEngine.evaluateAdjustments(pkg, Generator._buildContractData());
      if (adj && adj.totalDelta !== 0) {
        this._derived['Lãi suất điều chỉnh bổ sung'] = adj.totalDelta + '%/năm';
      }
    }

    const resultEl = document.getElementById('uc02-rc-result');
    if (resultEl) {
      const main = ['Ngày chặn HTLS', 'Số tháng HTLS thực tế', 'Tháng chặn HTLS', 'Lãi suất cố định', 'Biên độ',
        'Ân hạn gốc tiêu chuẩn', 'Ân hạn gốc bổ sung', 'Ân hạn gốc áp dụng', 'Phí TNTH hiện hành'];
      resultEl.innerHTML = '<b style="color:#10b981">✅ Kết quả Rule Engine:</b> ' + main
        .filter(k => this._derived[k] !== undefined && this._derived[k] !== '')
        .map(k => `<span style="display:inline-block;margin:2px 4px;padding:2px 8px;border-radius:4px;background:rgba(16,185,129,0.1);color:#059669;font-size:0.75rem;"><b>${this._esc(k)}:</b> ${this._esc(this._derived[k])}</span>`)
        .join('');
    }
    this._optionsCache = null;
    this.refreshPreviews();
    this._toast('Rule Engine đã chạy — các cột map nguồn [Rule] đã cập nhật', 'success');
  },

  /* ── UI ── */
  initPage() {
    this.loadState();
    const container = document.getElementById('uc02-container');
    if (!container) return;

    const projects = (typeof RateCenter !== 'undefined' && RateCenter.getProjects) ? RateCenter.getProjects() : [];
    const eng = this._state.engine || {};
    const policies = eng.projectId && typeof RateCenter !== 'undefined' && RateCenter.getProjectPolicies
      ? RateCenter.getProjectPolicies(eng.projectId) : [];

    container.innerHTML = `
      <div style="margin-bottom:16px;padding:14px 18px;border:1px solid rgba(16,185,129,0.2);border-radius:14px;background:rgba(16,185,129,0.03);">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px;">
          <span style="font-size:0.9rem;font-weight:700;color:#10b981;">⚙️ Rule Engine — tính Ngày chặn HTLS, lãi suất, ân hạn gốc (BRD mục 6)</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;">
          <div>
            <label style="display:block;margin-bottom:4px;font-size:0.78rem;font-weight:600;color:var(--text-secondary);">Dự án (Master Data lãi suất)</label>
            <select class="mapping-select" id="uc02-rc-project" onchange="UC02Module.onEngineProjectChange(this.value)">
              <option value="">-- Chọn dự án --</option>
              ${projects.map(p => `<option value="${this._esc(p.id)}" ${p.id === eng.projectId ? 'selected' : ''}>${this._esc(p.name)}</option>`).join('')}
            </select>
          </div>
          <div>
            <label style="display:block;margin-bottom:4px;font-size:0.78rem;font-weight:600;color:var(--text-secondary);">Chính sách</label>
            <select class="mapping-select" id="uc02-rc-policy">
              <option value="">-- Chọn chính sách --</option>
              ${policies.map(p => `<option value="${this._esc(p.id)}" ${p.id === eng.policyId ? 'selected' : ''}>${this._esc(p.name)}</option>`).join('')}
            </select>
          </div>
          <div>
            <label style="display:block;margin-bottom:4px;font-size:0.78rem;font-weight:600;color:var(--text-secondary);">Ngày dự kiến giải ngân</label>
            <input type="date" class="mapping-select" id="uc02-rc-gndate" value="${this._esc(eng.gnDate || '')}">
          </div>
          <div>
            <label style="display:block;margin-bottom:4px;font-size:0.78rem;font-weight:600;color:var(--text-secondary);">Thời gian HTLS (tháng)</label>
            <input type="number" min="0" class="mapping-select" id="uc02-rc-htls" placeholder="VD: 30" value="${this._esc(eng.htlsMonths || '')}">
          </div>
          <div>
            <label style="display:block;margin-bottom:4px;font-size:0.78rem;font-weight:600;color:var(--text-secondary);">Kỳ hạn vay (tháng)</label>
            <input type="number" min="1" class="mapping-select" id="uc02-rc-term" placeholder="VD: 240" value="${this._esc(eng.loanTermMonths || '')}">
          </div>
          <div>
            <label style="display:block;margin-bottom:4px;font-size:0.78rem;font-weight:600;color:var(--text-secondary);">Loại khoản vay</label>
            <select class="mapping-select" id="uc02-rc-loantype">
              <option value="HTLS" ${eng.loanType !== 'standard' ? 'selected' : ''}>Có HTLS từ CĐT</option>
              <option value="standard" ${eng.loanType === 'standard' ? 'selected' : ''}>Không HTLS</option>
            </select>
          </div>
          <div style="display:flex;align-items:center;gap:8px;padding-top:18px;">
            <input type="checkbox" id="uc02-rc-supp" ${eng.hasSupplementGrace ? 'checked' : ''}>
            <label for="uc02-rc-supp" style="font-size:0.8rem;color:var(--text-secondary);cursor:pointer;">Ân hạn gốc bổ sung</label>
          </div>
        </div>
        <button onclick="UC02Module.runEngine()" style="margin-top:10px;padding:8px 18px;border-radius:8px;border:none;background:#10b981;color:#fff;font-weight:700;cursor:pointer;font-size:0.85rem;font-family:inherit;">▶ Chạy Rule Engine</button>
        <div id="uc02-rc-result" style="margin-top:8px;font-size:0.8rem;color:var(--text-muted);"></div>
      </div>

      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px;">
        <button onclick="UC02Module.autoMapAll()" style="padding:8px 16px;border-radius:8px;border:none;background:var(--accent,#6366f1);color:#fff;font-weight:700;cursor:pointer;font-size:0.85rem;font-family:inherit;">🔁 Tự động map</button>
        <button onclick="UC02Module.exportXLSX()" style="padding:8px 16px;border-radius:8px;border:none;background:#0ea5e9;color:#fff;font-weight:700;cursor:pointer;font-size:0.85rem;font-family:inherit;">📤 Xuất template giải ngân (.xlsx)</button>
        <button onclick="UC02Module.resetMapping()" style="padding:8px 16px;border-radius:8px;border:1px solid rgba(239,68,68,0.4);background:transparent;color:#ef4444;font-weight:600;cursor:pointer;font-size:0.85rem;font-family:inherit;">↺ Reset mapping</button>
        <span id="uc02-summary" style="margin-left:auto;font-size:0.82rem;color:var(--text-muted);"></span>
      </div>

      <div id="uc02-table-wrap"></div>
    `;
    this.renderTable();
  },

  onEngineProjectChange(projectId) {
    this._state.engine.projectId = projectId;
    const policies = (typeof RateCenter !== 'undefined' && RateCenter.getProjectPolicies)
      ? RateCenter.getProjectPolicies(projectId) : [];
    this._state.engine.policyId = policies[0] ? policies[0].id : '';
    this.saveState();
    const sel = document.getElementById('uc02-rc-policy');
    if (sel) {
      sel.innerHTML = '<option value="">-- Chọn chính sách --</option>' +
        policies.map(p => `<option value="${this._esc(p.id)}" ${p.id === this._state.engine.policyId ? 'selected' : ''}>${this._esc(p.name)}</option>`).join('');
    }
  },

  renderTable() {
    const wrap = document.getElementById('uc02-table-wrap');
    if (!wrap) return;
    let rows = '';
    UC02_COLUMNS.forEach((col, i) => {
      if (UC02_GROUPS[col]) {
        rows += `<tr><td colspan="4" style="padding:10px 12px;background:rgba(99,102,241,0.07);font-weight:700;font-size:0.8rem;color:var(--accent,#6366f1);text-transform:uppercase;letter-spacing:0.04em;">${this._esc(UC02_GROUPS[col])}</td></tr>`;
      }
      const mapVal = this._state.map[col] || '';
      const manualVal = this._state.manual[col] || '';
      rows += `
        <tr>
          <td style="font-family:monospace;font-size:0.8rem;white-space:nowrap;">${i + 1}. ${this._esc(col)}</td>
          <td>
            <select class="mapping-select uc02-map-select" data-col="${this._esc(col)}"
              onfocus="UC02Module.populateSelect(this)"
              onchange="UC02Module.onMapChange(this.dataset.col, this.value)">
              <option value="${this._esc(mapVal)}" selected>${mapVal ? this._esc(this._mapLabel(mapVal)) : '-- Không map --'}</option>
            </select>
          </td>
          <td><input type="text" class="mapping-select" placeholder="Nhập tay (ưu tiên cao nhất)" value="${this._esc(manualVal)}"
            oninput="UC02Module.onManualChange('${this._esc(col)}', this.value)"></td>
          <td class="mapping-value-preview" id="uc02-prev-${i}" style="font-size:0.8rem;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">—</td>
        </tr>`;
    });
    wrap.innerHTML = `
      <table class="mapping-table">
        <thead><tr>
          <th style="width:24%">Cột UC02 (BRD)</th>
          <th style="width:34%">Nguồn dữ liệu</th>
          <th style="width:22%">Giá trị nhập tay</th>
          <th style="width:20%">Giá trị xuất</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
    this.refreshPreviews();
  },

  _mapLabel(mapVal) {
    const idx = mapVal.indexOf('::');
    if (idx < 0) return mapVal;
    const source = mapVal.slice(0, idx);
    const field = mapVal.slice(idx + 2);
    const labels = {
      derived: '⚙️ Rule', branch: '🏦 CN', project: '🏗️ DA',
      masterdata: '📋 MD', ratecenter: '💹 LS', special: '✨',
    };
    const ftLabel = (typeof FILE_TYPES !== 'undefined' && FILE_TYPES[source]) ? FILE_TYPES[source].label : null;
    return `[${labels[source] || ftLabel || source}] ${field}`;
  },

  // Lazy populate: chỉ build danh sách option đầy đủ khi user mở select
  populateSelect(sel) {
    if (sel.dataset.populated === '1') return;
    if (!this._optionsCache) this._optionsCache = this._buildOptionsHTML();
    const current = sel.value;
    sel.innerHTML = this._optionsCache;
    sel.value = current;
    // nếu giá trị hiện tại không có trong danh sách (nguồn chưa load) thì giữ lại
    if (sel.value !== current) {
      const opt = document.createElement('option');
      opt.value = current;
      opt.textContent = this._mapLabel(current) + ' (nguồn chưa có dữ liệu)';
      opt.selected = true;
      sel.appendChild(opt);
    }
    sel.dataset.populated = '1';
  },
  _buildOptionsHTML() {
    let html = '<option value="">-- Không map --</option>';
    const group = (label, items) => {
      if (!items.length) return;
      html += `<optgroup label="${this._esc(label)}">`;
      items.forEach(it => {
        html += `<option value="${this._esc(it.value)}" title="${this._esc(String(it.preview ?? '').substring(0, 60))}">${this._esc(it.label)}</option>`;
      });
      html += '</optgroup>';
    };
    // Rule Engine
    const derived = this._getDerived();
    group('⚙️ Rule Engine (tính tự động)', Object.keys(derived).filter(k => !k.startsWith('_'))
      .map(k => ({ value: `derived::${k}`, label: k, preview: derived[k] })));
    // Extract LMS
    if (typeof AppState !== 'undefined' && typeof FILE_TYPES !== 'undefined') {
      Object.keys(AppState.extractedData || {}).forEach(ft => {
        const data = AppState.extractedData[ft] || {};
        const cfg = FILE_TYPES[ft] || { label: ft };
        group(`📄 ${cfg.label}`, Object.keys(data).map(k => ({ value: `${ft}::${k}`, label: k, preview: data[k] })));
      });
    }
    // Chi nhánh
    if (typeof BranchModule !== 'undefined' && typeof BRANCH_FIELDS !== 'undefined') {
      const b = BranchModule.getSelectedBranch() || {};
      group('🏦 Chi nhánh', BRANCH_FIELDS.map(f => ({ value: `branch::${f.key}`, label: f.label, preview: b[f.key] })));
    }
    // Thông tin dự án
    if (typeof ProjectInfoModule !== 'undefined' && typeof PROJECT_INFO_FIELDS !== 'undefined') {
      const p = ProjectInfoModule.getSelectedProject() || {};
      group('🏗️ Thông tin dự án', PROJECT_INFO_FIELDS.map(f => ({ value: `project::${f.key}`, label: f.label, preview: p[f.key] })));
    }
    // Master Data entities
    if (typeof MasterData !== 'undefined' && MasterData.getMappingData) {
      const md = MasterData.getMappingData();
      group('📋 Master Data', Object.keys(md).map(k => ({ value: `masterdata::${k}`, label: k, preview: md[k] })));
    }
    // RateCenter template data
    const eng = this._state.engine;
    if (typeof RateCenter !== 'undefined' && RateCenter.getTemplateData && eng.projectId && eng.policyId) {
      const rd = RateCenter.getTemplateData(eng.projectId, eng.policyId);
      group('💹 Master Data lãi suất', Object.keys(rd).map(k => ({ value: `ratecenter::${k}`, label: k, preview: rd[k] })));
    }
    // Special
    group('✨ Hệ thống', [
      { value: 'special::stt', label: 'STT (luôn = 1)' },
      { value: 'special::now', label: 'Ngày hiện tại (dd/mm/yyyy)' },
      { value: 'special::cmnd1_full', label: 'CMND + Nơi cấp + Ngày cấp (bên vay 1)' },
      { value: 'special::loaihinh_lower', label: 'Loại hình tài sản (viết thường)' },
    ]);
    return html;
  },

  onMapChange(col, value) {
    if (value) this._state.map[col] = value;
    else delete this._state.map[col];
    this.saveState();
    this.refreshPreviews();
  },
  onManualChange(col, value) {
    if (value && String(value).trim() !== '') this._state.manual[col] = value;
    else delete this._state.manual[col];
    this.saveState();
    this.refreshPreviews();
  },
  resetMapping() {
    if (!confirm('Xóa toàn bộ mapping và giá trị nhập tay của UC02?')) return;
    this._state.map = {};
    this._state.manual = {};
    this.saveState();
    this._optionsCache = null;
    this.renderTable();
    this._toast('Đã reset mapping UC02', 'success');
  },

  refreshPreviews() {
    let filled = 0;
    UC02_COLUMNS.forEach((col, i) => {
      const el = document.getElementById(`uc02-prev-${i}`);
      const val = this.resolve(col);
      const has = String(val).trim() !== '';
      if (has) filled++;
      if (el) {
        el.textContent = has ? String(val) : '—';
        el.title = has ? String(val) : '';
        el.style.color = has ? '' : 'var(--text-muted)';
      }
    });
    const sum = document.getElementById('uc02-summary');
    if (sum) sum.textContent = `${filled}/${UC02_COLUMNS.length} cột có dữ liệu`;
    return filled;
  },

  /* ── export ── */
  exportXLSX() {
    if (typeof XLSX === 'undefined') { this._toast('Thư viện XLSX chưa load', 'error'); return; }
    const values = UC02_COLUMNS.map(col => this.resolve(col));
    const emptyCount = values.filter(v => String(v).trim() === '').length;

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([UC02_COLUMNS, values]);
    ws['!cols'] = UC02_COLUMNS.map(c => ({ wch: Math.max(14, Math.min(30, c.length + 2)) }));
    XLSX.utils.book_append_sheet(wb, ws, 'TemplateGN');

    // Sheet 2: ghi lại mapping để đối soát UAT
    const mapRows = UC02_COLUMNS.map((col, i) => [
      col,
      this._state.manual[col] ? 'Nhập tay' : (this._state.map[col] ? this._mapLabel(this._state.map[col]) : '(chưa map)'),
      values[i],
    ]);
    const wsMap = XLSX.utils.aoa_to_sheet([['Cột UC02', 'Nguồn', 'Giá trị'], ...mapRows]);
    wsMap['!cols'] = [{ wch: 30 }, { wch: 45 }, { wch: 45 }];
    XLSX.utils.book_append_sheet(wb, wsMap, 'Mapping');

    // Tên file theo quy tắc BRD 3.2: DocumentType.Tên căn.yyyymmddhhmmss
    const maCan = String(this.resolve('MaCanDichVu') || 'NA').replace(/[\\/:*?"<>|]+/g, '').trim() || 'NA';
    const d = new Date();
    const ts = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}${String(d.getSeconds()).padStart(2, '0')}`;
    XLSX.writeFile(wb, `TEMPLATEGN.${maCan}.${ts}.xlsx`);

    if (emptyCount > 0) {
      this._toast(`Đã xuất template giải ngân — lưu ý còn ${emptyCount}/${UC02_COLUMNS.length} cột trống`, 'warning');
    } else {
      this._toast('Đã xuất template giải ngân đủ 188 cột', 'success');
    }
  },
};

window.UC02Module = UC02Module;
