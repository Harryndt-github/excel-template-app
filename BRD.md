# BRD - Excel Template App

## 1. Thông tin tài liệu

- Tên dự án: `Excel Template App`
- Phiên bản tài liệu: `v1.0`
- Ngày cập nhật: `2026-05-13`
- Mục đích: Mô tả yêu cầu nghiệp vụ cho hệ thống quản lý template, master data, chính sách lãi suất và tư vấn chính sách trong lĩnh vực tín dụng bất động sản.

## 2. Tổng quan nghiệp vụ

Hệ thống được xây dựng để hỗ trợ người dùng nghiệp vụ:

- Quản lý template tài liệu dạng Excel-like và Word.
- Import dữ liệu nguồn từ file Excel/Word để ghép vào template.
- Quản lý `Master Data` làm nguồn dữ liệu chuẩn dùng chung.
- Quản lý `Master Data lãi suất` theo từng dự án và chính sách bán hàng.
- Cấu hình `Hỗ trợ lãi suất` và `Phí TNTH` theo chính sách bán hàng.
- Tính toán dữ liệu lãi suất động để đưa vào template.
- Tư vấn và xếp hạng chính sách bán hàng phù hợp theo hồ sơ đầu vào.

Hệ thống hiện được thiết kế chạy `100% trên browser`, không yêu cầu server nghiệp vụ, không dùng API key và không phụ thuộc LLM.

## 3. Mục tiêu kinh doanh

- Chuẩn hóa dữ liệu đầu vào và đầu ra cho các bộ hồ sơ tín dụng, hợp đồng, biểu mẫu và tài liệu nội bộ.
- Giảm thao tác nhập tay lặp lại khi lập hồ sơ vay và phát hành tài liệu.
- Tập trung quản lý chính sách lãi suất, hỗ trợ lãi suất và phí theo dự án/chính sách bán hàng.
- Cho phép bộ phận nghiệp vụ chọn nhanh chính sách phù hợp với hồ sơ khách hàng.
- Tăng khả năng kiểm soát thay đổi chính sách mà không phải sửa template thủ công.

## 4. Phạm vi hệ thống

### 4.1. Trong phạm vi

- Quản lý template Excel-like.
- Quản lý template Word.
- Upload và đọc dữ liệu từ file Excel, CSV, Word.
- Mapping dữ liệu nguồn vào placeholder của template.
- Quản lý `Master Data` dạng entity/record.
- Quản lý `Rate Center` theo `Dự án > Chính sách bán hàng`.
- Quản lý `Bảng lãi suất` theo thời gian áp dụng.
- Quản lý `Hỗ trợ lãi suất` và `Phí TNTH` theo cấp chính sách bán hàng.
- Mini master dùng chung cho:
  - Chính sách hỗ trợ lãi suất.
  - Chính sách phí TNTH.
- Rule engine để tính:
  - Bucket lãi suất.
  - Lãi suất áp dụng.
  - Ân hạn gốc.
  - Phí TNTH theo giai đoạn.
  - Nghĩa vụ trả lãi giữa CĐT và khách hàng.
  - Điều chỉnh lãi suất bổ sung theo điều kiện.
- Tư vấn Top-5 chính sách phù hợp.

### 4.2. Ngoài phạm vi hiện tại

- Tích hợp Core Banking.
- Tích hợp LOS/LMS/DWH.
- Đồng bộ dữ liệu đa người dùng theo thời gian thực.
- Phân quyền người dùng theo vai trò trên server.
- Phê duyệt workflow nhiều cấp.
- Lưu trữ tập trung trên cloud backend.

## 5. Người dùng mục tiêu

- Chuyên viên tín dụng.
- Chuyên viên hỗ trợ bán hàng dự án bất động sản.
- Bộ phận phát triển sản phẩm tín dụng.
- Bộ phận vận hành tài liệu/hợp đồng.
- Quản lý sản phẩm hoặc quản lý chính sách.

## 6. Bài toán nghiệp vụ

Ngân hàng triển khai nhiều chương trình cho vay mua bất động sản theo từng chủ đầu tư và từng dự án. Mỗi dự án có thể có:

- Chính sách bán hàng khác nhau.
- Mức lãi suất khác nhau theo thời gian áp dụng.
- Chính sách hỗ trợ lãi suất từ chủ đầu tư.
- Phí TNTH theo giai đoạn.
- Điều kiện áp dụng và ngoại lệ riêng.

Người dùng cần:

- Chọn đúng dự án và chính sách bán hàng.
- Tự động lấy đúng bộ dữ liệu lãi suất và điều kiện tương ứng.
- Xác định rõ:
  - Trong bao lâu chủ đầu tư hỗ trợ lãi suất.
  - Từ thời điểm nào khách hàng bắt đầu trả lãi.
  - Nợ gốc do ai trả.
  - Phí TNTH áp dụng theo giai đoạn nào.
- Tự động đổ các dữ liệu này vào template tài liệu.

## 7. Mô hình nghiệp vụ tổng quát

### 7.1. Luồng template

1. Người dùng tạo hoặc chọn template.
2. Người dùng upload file dữ liệu nguồn.
3. Hệ thống đọc danh sách trường dữ liệu.
4. Người dùng map trường dữ liệu với placeholder trong template.
5. Người dùng có thể chọn thêm dữ liệu từ `Master Data` hoặc `Master Data lãi suất`.
6. Hệ thống generate tài liệu đầu ra.

### 7.2. Luồng master data lãi suất

1. Người dùng tạo `Dự án`.
2. Trong từng dự án, người dùng tạo `Chính sách bán hàng`.
3. Trong từng chính sách bán hàng, người dùng cấu hình:
   - Thông số chính sách.
   - Bảng lãi suất.
   - Hỗ trợ lãi suất và phí TNTH.
   - Ân hạn gốc.
   - Điều chỉnh lãi suất.
   - Ngoại lệ.
4. Hệ thống lưu cấu hình để dùng khi mapping/generate/tư vấn.

### 7.3. Luồng mini master cho hỗ trợ và phí

1. Người dùng thiết lập một chính sách hỗ trợ lãi suất mẫu hoặc chính sách phí TNTH mẫu.
2. Người dùng lưu cấu hình đó vào `nguồn dùng chung`.
3. Khi tạo/chỉnh sửa một chính sách bán hàng khác, người dùng chỉ cần chọn từ danh sách nguồn chung.
4. Hệ thống tự điền các thông tin liên quan, tránh nhập lặp.

### 7.4. Luồng tư vấn

1. Người dùng nhập thông tin hồ sơ.
2. Hệ thống lấy toàn bộ chính sách hiện có trong Rate Center.
3. Hệ thống tính điểm theo thuật toán xếp hạng.
4. Hệ thống trả về Top-5 chính sách phù hợp kèm giải thích.

## 8. Chức năng chi tiết

## 8.1. Quản lý template Excel-like

### Mô tả

Cho phép tạo, sửa, nhân bản, xóa template dạng lưới và chèn placeholder.

### Yêu cầu chức năng

- Tạo template mới.
- Nhập tên template.
- Chỉnh sửa nội dung template.
- Chèn placeholder dữ liệu.
- Lưu template.
- Nhân bản template.
- Xóa template.
- Hiển thị danh sách template.

### Kết quả mong đợi

- Người dùng có thể tạo bộ mẫu để tái sử dụng.

## 8.2. Quản lý template Word

### Mô tả

Cho phép tạo, sửa, lưu và generate template Word với placeholder.

### Yêu cầu chức năng

- Tạo template Word mới.
- Chọn file Word để đọc nội dung.
- Trích xuất placeholder.
- Mapping placeholder với dữ liệu nguồn.
- Generate file Word đầu ra.

## 8.3. Import dữ liệu nguồn

### Mô tả

Cho phép upload file dữ liệu để trích xuất trường dữ liệu đầu vào.

### Yêu cầu chức năng

- Hỗ trợ import:
  - Excel/XLSX
  - CSV
  - Word/DOCX
- Đọc sheet và map loại dữ liệu theo cấu hình hệ thống.
- Kiểm tra header.
- Gợi ý mapping.
- Cho phép dùng dữ liệu import như nguồn khi generate.

## 8.4. Master Data

### Mô tả

Cho phép quản lý dữ liệu dùng chung dạng entity/record và dùng làm nguồn mapping vào template.

### Yêu cầu chức năng

- Tạo entity từ cấu hình hệ thống hoặc thủ công.
- Tạo record cho từng entity.
- Sửa/xóa record.
- Import record từ file XLSX.
- Export template XLSX cho từng entity.
- Dùng entity làm nguồn mapping khi generate template.

## 8.5. Master Data lãi suất - Rate Center

### Mô tả

Cho phép quản lý các chính sách lãi suất theo từng dự án và chính sách bán hàng.

### Cấu trúc dữ liệu nghiệp vụ

- `Dự án`
- `Chính sách bán hàng`
- `Bảng lãi suất`
- `Hỗ trợ lãi suất`
- `Phí TNTH`
- `Ân hạn gốc`
- `Điều chỉnh lãi suất`
- `Ngoại lệ`

### 8.5.1. Quản lý dự án

- Tạo dự án.
- Sửa tên dự án.
- Xóa dự án.
- Hiển thị số lượng chính sách trong từng dự án.

### 8.5.2. Quản lý chính sách bán hàng

- Tạo chính sách bán hàng trong từng dự án.
- Sửa tên chính sách.
- Xóa chính sách.
- Cấu hình các thông số cơ bản:
  - Mã dự án
  - Mã chính sách
  - Tên chính sách bán hàng
  - Thời gian áp dụng từ
  - Thời gian áp dụng đến
  - Điều kiện đi kèm
  - Ghi chú chính sách
  - Thời gian vay tối thiểu
  - LTV tối đa
  - Thời gian vay tối đa

### 8.5.3. Bảng lãi suất

### Mục tiêu

Quản lý mức lãi suất ngân hàng theo thời gian áp dụng.

### Yêu cầu chức năng

- Mỗi chính sách bán hàng có nhiều dòng bucket lãi suất.
- Mỗi dòng gồm:
  - Áp dụng đến `N tháng`
  - Lãi suất
  - Biên độ
  - Ghi chú
- Cho phép:
  - Thêm bucket
  - Xóa bucket
  - Sửa bucket
- Hệ thống tự chuẩn hóa thứ tự bucket theo `maxMonths`.
- Khi xác định dữ liệu runtime, hệ thống chọn bucket nhỏ nhất có `maxMonths >= thời gian áp dụng`.

### Ghi chú nghiệp vụ

- Bảng lãi suất không còn quản lý logic hỗ trợ lãi suất theo từng dòng.
- Hỗ trợ lãi suất là cấu hình cấp chính sách.

### 8.5.4. Hỗ trợ lãi suất và phí TNTH

### Mục tiêu

Quản lý cấu hình hỗ trợ lãi suất và phí TNTH ở cấp chính sách bán hàng.

### Yêu cầu chức năng

- Có một checkbox chung:
  - `Hỗ trợ lãi suất`
- Nếu bật hỗ trợ lãi suất, hệ thống cho phép cấu hình:
  - Mã chính sách hỗ trợ lãi suất
  - Tên chính sách hỗ trợ lãi suất
  - Thời gian hỗ trợ mặc định
  - Bên trả lãi trong thời gian hỗ trợ
  - Bên trả lãi sau hỗ trợ
  - Bên trả nợ gốc
  - Nguyên tắc trả nợ gốc
  - Ghi chú hỗ trợ lãi
- Cho phép cấu hình:
  - Mã chính sách phí TNTH
  - Tên chính sách phí TNTH
  - Các mức phí TNTH theo giai đoạn

### 8.5.5. Mini master cho chính sách chung

### Mục tiêu

Cho phép tái sử dụng cấu hình `Hỗ trợ lãi suất` và `Phí TNTH` giữa nhiều chính sách bán hàng.

### Yêu cầu chức năng

- Hệ thống có 2 nguồn cấu hình dùng chung:
  - `supportPolicies`
  - `feePolicies`
- Trong tab `Hỗ trợ & Phí`, người dùng có thể:
  - Chọn `chính sách hỗ trợ lãi suất` từ nguồn chung.
  - Chọn `chính sách phí TNTH` từ nguồn chung.
  - Lưu cấu hình hiện tại thành mẫu dùng chung.
  - Xóa mẫu dùng chung đang chọn.
- Khi chọn một mẫu từ nguồn chung, hệ thống tự điền toàn bộ dữ liệu liên quan vào chính sách bán hàng.

### Giá trị nghiệp vụ

- Tránh nhập lặp.
- Chuẩn hóa chính sách.
- Tăng tốc cấu hình nhiều dự án/chính sách tương tự nhau.

### 8.5.6. Ân hạn gốc

### Mục tiêu

Xác định số tháng ân hạn gốc tối đa theo rule.

### Yêu cầu chức năng

- Cấu hình:
  - Ân hạn cơ bản
  - Có hỗ trợ lãi từ CĐT hay không
  - Có ân hạn bổ sung hay không
  - Có giới hạn theo nhóm dự án hay không
  - Giới hạn theo nhóm A/B/default
  - Ghi chú
- Hệ thống tính ân hạn theo:
  - Ngoại lệ dự án
  - Nhóm dự án
  - Giới hạn không vượt quá thời gian hỗ trợ lãi nếu không có ngoại lệ

### 8.5.7. Phí TNTH

### Mục tiêu

Tính phí TNTH theo giai đoạn khoản vay.

### Yêu cầu chức năng

- Cấu hình các phase:
  - Trong thời gian hỗ trợ lãi
  - Sau hỗ trợ lãi đến T60
  - Từ T61 trở đi
- Hệ thống xác định phase theo tháng hiện tại của khoản vay.

### 8.5.8. Điều chỉnh lãi suất

### Mục tiêu

Cho phép cộng/trừ lãi suất bổ sung khi hồ sơ thỏa điều kiện.

### Yêu cầu chức năng

- Người dùng tạo rule điều chỉnh.
- Mỗi rule gồm:
  - Tên rule
  - Mức điều chỉnh lãi suất
  - Nhiều điều kiện
  - Ghi chú
- Hỗ trợ toán tử:
  - equals
  - not_equals
  - contains
  - starts_with
  - gt
  - gte
  - lt
  - lte
  - in_list
- Nếu tất cả điều kiện khớp thì hệ thống cộng/trừ lãi suất theo rule.

### Ví dụ nghiệp vụ

- Nếu `Xếp hạng khách hàng = Loại C`
- Và `Mục đích vay = Đầu tư`
- Thì tăng thêm `0.5%`

### 8.5.9. Ngoại lệ

### Mục tiêu

Cho phép cấu hình ngoại lệ theo từng dự án.

### Yêu cầu chức năng

- Cấu hình theo tên dự án.
- Gán số tháng ân hạn tối đa riêng.
- Rule ngoại lệ có mức ưu tiên cao hơn rule nhóm.

## 8.6. Rule Engine

### Mục tiêu

Sinh ra các trường dữ liệu động để đưa vào template hoặc dùng trong tư vấn.

### Đầu vào

- Dự án
- Chính sách bán hàng
- Thời gian hỗ trợ lãi suất
- Tổng kỳ hạn vay
- Tháng hiện tại trong khoản vay
- Có hỗ trợ lãi hay không
- Có ân hạn bổ sung hay không
- Nhóm dự án
- Dữ liệu hợp đồng hoặc dữ liệu khách hàng

### Đầu ra

- Bucket lãi suất
- Lãi suất áp dụng
- Biên độ
- Có hỗ trợ lãi suất
- Mã/tên chính sách hỗ trợ lãi suất
- Mã/tên chính sách phí TNTH
- Thời gian CĐT trả lãi
- Tháng khách hàng bắt đầu trả lãi
- Thời gian khách hàng trả lãi
- Bên trả lãi hiện tại
- Nợ gốc do ai trả
- Nguyên tắc trả nợ gốc
- Phí TNTH hiện hành
- Giai đoạn TNTH
- Ân hạn gốc tối đa
- Ghi chú rule
- Điều kiện đủ

## 8.7. Tư vấn chính sách

### Mục tiêu

Xếp hạng và đề xuất chính sách phù hợp nhất theo hồ sơ đầu vào.

### Tham số đầu vào hiện tại

- Kỳ hạn vay
- LTV
- Loại dự án
- Mục đích vay
- COF
- NIM mục tiêu
- Mức độ rủi ro
- Xếp hạng khách hàng

### Cơ chế tính điểm hiện tại

- Dynamic weights
- Sigmoid scoring
- Cosine similarity
- Softmax normalization

### Kết quả đầu ra

- Top-5 chính sách phù hợp
- Điểm tổng
- Xác suất tương đối
- Chi tiết từng chiều điểm
- Giải thích một phần lý do xếp hạng

## 8.8. Tích hợp dữ liệu vào template

### Mục tiêu

Cho phép template sử dụng đồng thời nhiều nguồn dữ liệu.

### Các nguồn mapping

- Dữ liệu import từ Excel/CSV/Word
- Master Data entity records
- Master Data lãi suất từ Rate Center
- Dữ liệu tính toán từ Rule Engine

### Yêu cầu chức năng

- Hiển thị danh sách field có thể map.
- Gợi ý auto-map theo tên field.
- Preview giá trị hiện tại.
- Generate đầu ra từ mapping đã chọn.

## 9. Yêu cầu dữ liệu

## 9.1. Dữ liệu chính

- Template dữ liệu
- Template Word
- Entity Master Data
- Record Master Data
- Dự án
- Chính sách bán hàng
- Bucket lãi suất
- Rule hỗ trợ lãi suất
- Rule phí TNTH
- Rule ân hạn gốc
- Rule điều chỉnh lãi suất
- Ngoại lệ dự án
- Chính sách hỗ trợ lãi suất dùng chung
- Chính sách phí TNTH dùng chung

## 9.2. Cơ chế lưu trữ

- Dữ liệu được lưu cục bộ qua `localStorage`.
- Không có cơ sở dữ liệu trung tâm trong phiên bản hiện tại.

## 10. Quy tắc nghiệp vụ trọng yếu

- Một dự án có nhiều chính sách bán hàng.
- Một chính sách bán hàng có nhiều bucket lãi suất.
- Bảng lãi suất chỉ quản lý mức lãi suất và thời gian áp dụng.
- Hỗ trợ lãi suất là cấu hình chung ở cấp chính sách bán hàng.
- Phí TNTH là cấu hình chung ở cấp chính sách bán hàng.
- Nếu bật hỗ trợ lãi suất, hệ thống xác định:
  - Chủ đầu tư trả lãi trong `N tháng`.
  - Khách hàng trả lãi từ tháng `N+1`.
- Nợ gốc mặc định do khách hàng trả theo lịch.
- Phí TNTH được xác định theo tháng hiện tại và phase.
- Rule điều chỉnh lãi suất chỉ áp dụng khi toàn bộ điều kiện khớp.
- Ngoại lệ dự án có ưu tiên cao hơn giới hạn theo nhóm.

## 11. Yêu cầu phi chức năng

- Ứng dụng chạy hoàn toàn trên browser.
- Không yêu cầu server.
- Không yêu cầu API key.
- Không yêu cầu kết nối internet để xử lý nghiệp vụ cốt lõi.
- Giao diện cần hỗ trợ desktop.
- Thời gian phản hồi cho thao tác mapping/rule/tư vấn phải đủ nhanh cho trải nghiệm người dùng nội bộ.
- Dữ liệu local cần được giữ lại giữa các lần mở trình duyệt nếu localStorage còn tồn tại.

## 12. Giả định và ràng buộc

### Giả định

- Người dùng hiểu khái niệm dự án, chính sách bán hàng, hỗ trợ lãi suất và phí TNTH.
- Dữ liệu import đầu vào có cấu trúc đủ gần với cấu hình hệ thống.
- Người dùng chấp nhận mô hình lưu cục bộ trong phiên bản hiện tại.

### Ràng buộc

- Không có backend để đồng bộ dữ liệu giữa nhiều máy.
- Dữ liệu có thể mất nếu localStorage bị xóa.
- Chưa có workflow duyệt thay đổi chính sách.

## 13. Rủi ro nghiệp vụ

- Người dùng cấu hình sai rule dẫn tới tài liệu đầu ra sai.
- Chính sách dùng chung bị sửa có thể ảnh hưởng nhiều chính sách bán hàng khác.
- Không có phân quyền có thể gây thay đổi dữ liệu ngoài ý muốn trên máy dùng chung.
- Không có audit log tập trung trong phiên bản hiện tại.

## 14. Tiêu chí nghiệm thu mức cao

- Người dùng tạo được dự án và chính sách bán hàng.
- Người dùng cấu hình được bảng lãi suất cho chính sách.
- Người dùng bật/tắt được hỗ trợ lãi suất ở cấp chính sách.
- Người dùng lưu và chọn được chính sách hỗ trợ lãi suất dùng chung.
- Người dùng lưu và chọn được chính sách phí TNTH dùng chung.
- Rule engine trả được bộ field lãi suất động để mapping vào template.
- Template generate được dữ liệu từ Excel, Master Data và Master Data lãi suất.
- Tư vấn trả được Top-5 chính sách phù hợp.

## 15. Định hướng mở rộng

- Thêm backend để đồng bộ dữ liệu tập trung.
- Thêm versioning cho chính sách bán hàng.
- Thêm phân quyền người dùng.
- Thêm log lịch sử thay đổi.
- Thêm import/export full cấu hình mini master.
- Thêm bộ tiêu chí tư vấn nâng cao theo hồ sơ khách hàng, DSR, thu nhập, loại tài sản và pháp lý dự án.

