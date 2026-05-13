# Tài liệu Yêu cầu Nghiệp vụ

## Tên dự án
`Excel Template App - Master Data, Rate Center & Tư vấn chính sách`

## Kiểm soát tài liệu

### Thông tin tài liệu

| Mục | Giá trị |
|---|---|
| Tên tài liệu | Tài liệu Yêu cầu Nghiệp vụ |
| Tên dự án | Excel Template App |
| Lĩnh vực nghiệp vụ | Tín dụng thế chấp / Cho vay bất động sản |
| Phiên bản | v1.0 |
| Ngày | 2026-05-13 |
| Người soạn | Codex |
| Trạng thái | Dự thảo |

### Lịch sử tài liệu

| Phiên bản | Ngày | Tác giả | Mô tả thay đổi |
|---|---|---|---|
| v1.0 | 2026-05-13 | Codex | Khởi tạo BRD dựa trên code hiện tại của dự án và các trao đổi nghiệp vụ |

### Phê duyệt

| Vai trò | Người phê duyệt | Trạng thái |
|---|---|---|
| Chủ sở hữu nghiệp vụ | TBD | Chờ duyệt |
| Product Owner | TBD | Chờ duyệt |
| IT Lead | TBD | Chờ duyệt |
| Risk / Compliance | TBD | Chờ duyệt |

## 1. Tóm tắt điều hành

Giải pháp là một ứng dụng chạy trên trình duyệt dùng để quản lý template, master data, cấu hình chính sách tín dụng và tư vấn chính sách cho các chương trình tài trợ bất động sản. Mục tiêu nghiệp vụ chính là chuẩn hóa việc sinh tài liệu và tập trung quản lý cấu hình chính sách bán hàng theo từng dự án, bao gồm lãi suất cho vay, chính sách hỗ trợ lãi suất, chính sách phí bảo hiểm, rule ân hạn gốc, ngoại lệ và chấm điểm tư vấn chính sách.

Code hiện tại đang hỗ trợ:

- Tạo và generate template dạng Excel-like và Word.
- Import dữ liệu nguồn từ Excel, CSV và Word.
- Quản lý Master Data cho các thực thể nghiệp vụ dùng chung.
- Quản lý Rate Center theo cấu trúc `Dự án > Chính sách bán hàng`.
- Cấu hình ở cấp chính sách cho:
  - Ma trận lãi suất
  - Chính sách hỗ trợ lãi suất
  - Chính sách phí bảo hiểm tai nạn thân thể (`Phi TNTH`)
  - Rule ân hạn gốc
  - Rule điều chỉnh lãi suất
  - Ngoại lệ theo dự án
- Mini master cho `Chính sách hỗ trợ lãi suất` và `Chính sách phí TNTH`.
- Engine tư vấn chính sách chạy hoàn toàn trong browser để xếp hạng các chính sách.

Lưu ý quan trọng: dự án hiện tại **chưa** tích hợp LLM thực thụ. Module tư vấn hiện sử dụng các thuật toán chấm điểm xác định như dynamic weights, sigmoid scoring, cosine similarity và softmax normalization. Vì vậy, mọi nội dung về `LLM hỗ trợ xây dựng chính sách` cần được mô tả là định hướng mở rộng, không phải tính năng đã bàn giao.

## 2. Bối cảnh nghiệp vụ

Ngân hàng hợp tác với nhiều chủ đầu tư bất động sản cần triển khai nhiều chương trình cho vay theo từng dự án. Mỗi dự án có thể có nhiều chính sách bán hàng với thời gian áp dụng, mức lãi suất, cấu trúc hỗ trợ lãi suất, phí bảo hiểm, rule ân hạn, điều kiện khách hàng và ngoại lệ khác nhau.

Trong mô hình vận hành hiện tại, người dùng nghiệp vụ thường phải nhập lặp lại nhiều thông số, cập nhật template thủ công và đối mặt với rủi ro sai lệch giữa cấu hình chính sách và tài liệu đầu ra. Giải pháp mục tiêu là tập trung các cấu hình này về một nguồn chuẩn để tái sử dụng nhất quán trong generate tài liệu và tư vấn chính sách.

## 3. Phát biểu vấn đề

Nghiệp vụ cần một hệ thống có thể:

- Quản lý dữ liệu chính sách bán hàng tái sử dụng theo từng dự án.
- Phân biệt rõ:
  - lãi suất do ngân hàng áp dụng
  - thời gian được hỗ trợ lãi suất
  - thời gian khách hàng tự trả lãi
  - nghĩa vụ trả nợ gốc
- Tránh cấu hình lặp cho các chính sách hỗ trợ lãi suất và phí dùng chung.
- Sinh tài liệu với đúng dữ liệu chính sách.
- Đề xuất các chính sách phù hợp dựa trên hồ sơ khách hàng và khoản vay.

## 4. Mục tiêu kinh doanh

| Mã | Mục tiêu | Kết quả mong đợi |
|---|---|---|
| BO-01 | Chuẩn hóa dữ liệu chính sách sử dụng trong tài liệu | Giảm sửa tay và giảm sai lệch chính sách |
| BO-02 | Tái sử dụng cấu hình hỗ trợ lãi suất và phí dùng chung | Giảm công sức setup cho các dự án tương tự |
| BO-03 | Tăng độ chính xác của tài liệu tín dụng | Template được điền đúng dữ liệu từ chính sách tập trung |
| BO-04 | Tăng tốc chọn chính sách phù hợp | Người dùng nghiệp vụ shortlist chính sách nhanh hơn |
| BO-05 | Giữ mô hình triển khai gọn nhẹ | Toàn bộ giải pháp chạy trên browser, không phụ thuộc backend |

## 5. Phạm vi

### 5.1 Phạm vi trong dự án

- Quản lý template Excel-like.
- Quản lý template Word.
- Import dữ liệu nguồn từ Excel, CSV và Word.
- Quản lý master data thực thể và bản ghi dùng chung.
- Quản lý Rate Center với cấu trúc `Dự án > Chính sách bán hàng`.
- Quản lý:
  - Ma trận lãi suất
  - Chính sách hỗ trợ lãi suất
  - Chính sách phí bảo hiểm (`Phi TNTH`)
  - Rule ân hạn gốc
  - Rule điều chỉnh lãi suất
  - Ngoại lệ
- Sử dụng mini master cho chính sách hỗ trợ và phí dùng chung.
- Sinh dữ liệu động từ rule engine.
- Tư vấn và xếp hạng Top-5 chính sách.

### 5.2 Ngoài phạm vi release hiện tại

- Cơ sở dữ liệu tập trung.
- Cộng tác nhiều người dùng theo thời gian thực.
- Phân quyền theo vai trò.
- Workflow phê duyệt.
- Tích hợp với Core Banking / LOS / LMS / DWH.
- Audit trail trên server.
- Tích hợp LLM thật hoặc gọi API AI bên ngoài.

## 6. Stakeholders và RACI

### 6.1 Stakeholders

| Stakeholder | Vai trò nghiệp vụ |
|---|---|
| Product Owner | Định hướng sản phẩm và ưu tiên phạm vi |
| Bộ phận Sản phẩm tín dụng | Sở hữu cấu trúc chương trình cho vay và chính sách |
| Bộ phận Hỗ trợ bán hàng | Cấu hình dữ liệu dự án và chính sách bán hàng |
| Bộ phận Vận hành tín dụng | Sử dụng đầu ra và kiểm tra độ đúng dữ liệu |
| Bộ phận Vận hành tài liệu | Quản lý template và định dạng đầu ra |
| IT / Engineering | Xây dựng và bảo trì hệ thống |
| Risk / Compliance | Rà soát rule nghiệp vụ và ràng buộc chính sách |

### 6.2 Ma trận RACI

| Deliverable / Quyết định | Product Owner | Sản phẩm tín dụng | Hỗ trợ bán hàng | Vận hành | IT | Risk |
|---|---|---|---|---|---|---|
| Phê duyệt BRD | A | C | C | C | C | C |
| Cấu trúc chính sách bán hàng | C | A | R | C | C | C |
| Thiết kế template | C | C | C | A/R | C | I |
| Cấu hình Rate Center | I | A | R | C | I | C |
| Governance mini master | C | A | R | C | I | C |
| Logic tư vấn | A | C | C | C | R | C |
| Triển khai release | I | I | I | I | A/R | I |

## 7. Giả định và ràng buộc

### 7.1 Giả định

- Người dùng hiểu thuật ngữ chính sách tín dụng.
- Dữ liệu chính sách có thể được duy trì cục bộ trong browser ở release hiện tại.
- File nguồn import có cấu trúc đủ gần với cấu hình hệ thống.

### 7.2 Ràng buộc

- Dữ liệu được lưu bằng local browser storage.
- Không có đồng bộ tập trung trong release hiện tại.
- Thay đổi chỉ có hiệu lực trong môi trường browser đang sử dụng.

## 8. Hiện trạng và trạng thái mục tiêu

### 8.1 Hiện trạng

- Logic chính sách có thể bị phân tán và phải nhập lặp.
- Tài liệu đầu ra phụ thuộc nhiều vào mapping thủ công.
- Các cấu hình hỗ trợ lãi suất và phí dùng chung có thể bị lặp ở nhiều chính sách.

### 8.2 Trạng thái mục tiêu

- Dữ liệu chính sách bán hàng được cấu hình tập trung trong Rate Center.
- Chính sách hỗ trợ và phí dùng chung được chọn từ mini master.
- Rule engine sinh đúng dữ liệu tài chính để dùng trong template.
- Module tư vấn xếp hạng chính sách nhất quán theo dữ liệu đầu vào.

## 9. Actors

| Actor | Mô tả |
|---|---|
| Business User | Cấu hình dự án, chính sách và master data |
| Template User | Xây template và mapping dữ liệu |
| Credit Advisor | Sử dụng chức năng tư vấn để shortlist chính sách |
| System | Chạy rule engine và generate đầu ra |

## 10. Thuật ngữ

| Thuật ngữ | Định nghĩa |
|---|---|
| Chính sách bán hàng | Gói cho vay nghiệp vụ được cấu hình cho một dự án |
| Rate Center | Phân hệ master data quản lý cấu hình liên quan đến lãi suất |
| Chính sách hỗ trợ lãi suất | Chính sách mô tả việc có hỗ trợ lãi suất hay không và hỗ trợ trong bao lâu |
| Chính sách phí | Chính sách dùng lại cho cấu hình TNTH |
| Bucket | Một dòng lãi suất áp dụng đến tối đa một số tháng |
| Ân hạn gốc | Số tháng ân hạn nợ gốc tối đa được phép |
| TNTH | Phí bảo hiểm tai nạn thân thể |
| Tư vấn | Chức năng xếp hạng chính sách bán hàng theo hồ sơ đầu vào |
| Mini Master | Danh mục dùng chung cho chính sách hỗ trợ/phí |

## 11. Tổng quan quy trình nghiệp vụ

### 11.1 Quy trình cấu hình chính sách

1. Người dùng tạo dự án.
2. Người dùng tạo chính sách bán hàng trong dự án.
3. Người dùng cấu hình:
   - thông tin chính sách cơ bản
   - bucket lãi suất
   - chính sách hỗ trợ lãi suất
   - chính sách phí
   - rule ân hạn gốc
   - rule điều chỉnh lãi suất
   - ngoại lệ
4. Người dùng có thể lưu cấu hình hỗ trợ/phí thành nguồn dùng chung.

### 11.2 Quy trình generate template

1. Người dùng chọn hoặc tạo template.
2. Người dùng upload file nguồn.
3. Người dùng map placeholder với:
   - dữ liệu import
   - master data
   - field từ rate center
   - field tính toán từ rule engine
4. Người dùng chọn dự án và chính sách bán hàng.
5. Hệ thống tính toán dữ liệu runtime.
6. Hệ thống sinh tài liệu đầu ra.

### 11.3 Quy trình tư vấn chính sách

1. Người dùng nhập thông tin khách hàng / khoản vay.
2. Hệ thống quét toàn bộ chính sách trong Rate Center.
3. Hệ thống tính điểm và xếp hạng.
4. Hệ thống trả về Top-5 chính sách phù hợp kèm giải thích.

## 12. Business Rules

| Mã Rule | Business Rule | Loại |
|---|---|---|
| BR-01 | Một dự án có thể có nhiều chính sách bán hàng | Structural |
| BR-02 | Một chính sách bán hàng có thể có nhiều bucket lãi suất | Structural |
| BR-03 | Bucket được chọn là bucket nhỏ nhất thỏa `maxMonths >= thời gian áp dụng` | Computation |
| BR-04 | Bảng lãi suất chỉ quản lý lãi suất ngân hàng và biên độ | Structural |
| BR-05 | Hỗ trợ lãi suất được cấu hình ở cấp chính sách bán hàng, không theo từng dòng lãi suất | Structural |
| BR-06 | Nếu bật hỗ trợ lãi suất, chủ đầu tư trả lãi trong thời gian hỗ trợ được cấu hình | Computation |
| BR-07 | Khách hàng bắt đầu trả lãi từ tháng tiếp theo sau thời gian hỗ trợ | Computation |
| BR-08 | Nợ gốc mặc định vẫn do khách hàng trả trừ khi cấu hình khác | Policy |
| BR-09 | Phí TNTH được xác định theo phase và tháng hiện tại của khoản vay | Computation |
| BR-10 | Rule điều chỉnh lãi suất chỉ áp dụng khi toàn bộ điều kiện khớp | Computation |
| BR-11 | Ngoại lệ theo dự án có ưu tiên cao hơn rule nhóm | Priority |
| BR-12 | Chính sách hỗ trợ/phí dùng chung có thể được chọn cho nhiều chính sách bán hàng | Reuse |

## 13. Danh mục yêu cầu chức năng

### FR-01 Quản lý template Excel-like

| Mục | Nội dung |
|---|---|
| Requirement ID | FR-01 |
| Tên | Quản lý Template Excel-like |
| Business Area | Template Management |
| Priority | Must Have |
| Mô tả | Hệ thống cho phép tạo, sửa, nhân bản, xóa và lưu template dạng Excel-like có placeholder |
| Acceptance Criteria | Người dùng tạo được template, chèn placeholder, lưu, mở lại, nhân bản và xóa |

### FR-02 Quản lý template Word

| Mục | Nội dung |
|---|---|
| Requirement ID | FR-02 |
| Tên | Quản lý Template Word |
| Business Area | Template Management |
| Priority | Must Have |
| Mô tả | Hệ thống cho phép upload, chỉnh sửa, lưu, map và generate template Word |
| Acceptance Criteria | Người dùng upload được file Word, trích xuất placeholder, map dữ liệu và generate kết quả |

### FR-03 Import dữ liệu nguồn

| Mục | Nội dung |
|---|---|
| Requirement ID | FR-03 |
| Tên | Import dữ liệu nguồn |
| Business Area | Data Intake |
| Priority | Must Have |
| Mô tả | Hệ thống import dữ liệu từ Excel, CSV và Word làm nguồn mapping |
| Acceptance Criteria | Người dùng upload được file hợp lệ và hệ thống trích xuất được field để mapping |

### FR-04 Quản lý Master Data

| Mục | Nội dung |
|---|---|
| Requirement ID | FR-04 |
| Tên | Quản lý Entity và Record Master Data |
| Business Area | Master Data |
| Priority | Must Have |
| Mô tả | Hệ thống cho phép quản lý cấu trúc entity và record dùng chung |
| Acceptance Criteria | Người dùng tạo được entity, thêm record, import/export mẫu record và dùng record trong mapping |

### FR-05 Quản lý dự án trong Rate Center

| Mục | Nội dung |
|---|---|
| Requirement ID | FR-05 |
| Tên | Quản lý dự án trong Rate Center |
| Business Area | Rate Center |
| Priority | Must Have |
| Mô tả | Hệ thống cho phép tạo, đổi tên và xóa dự án |
| Acceptance Criteria | Dự án được quản lý và hiển thị số lượng chính sách đi kèm |

### FR-06 Quản lý chính sách bán hàng

| Mục | Nội dung |
|---|---|
| Requirement ID | FR-06 |
| Tên | Quản lý chính sách bán hàng |
| Business Area | Rate Center |
| Priority | Must Have |
| Mô tả | Hệ thống cho phép tạo, sửa và xóa chính sách bán hàng trong từng dự án |
| Acceptance Criteria | Người dùng duy trì được thông tin cơ bản và xem chi tiết từng policy |

### FR-07 Cấu hình ma trận lãi suất

| Mục | Nội dung |
|---|---|
| Requirement ID | FR-07 |
| Tên | Cấu hình ma trận lãi suất |
| Business Area | Rate Center |
| Priority | Must Have |
| Mô tả | Hệ thống cho phép cấu hình các dòng lãi suất theo thời gian áp dụng |
| Acceptance Criteria | Người dùng thêm, sửa, xóa bucket và hệ thống sắp xếp đúng theo `maxMonths` |

### FR-08 Cấu hình chính sách hỗ trợ lãi suất

| Mục | Nội dung |
|---|---|
| Requirement ID | FR-08 |
| Tên | Cấu hình chính sách hỗ trợ lãi suất |
| Business Area | Rate Center |
| Priority | Must Have |
| Mô tả | Hệ thống cho phép bật hỗ trợ lãi suất một lần ở cấp chính sách bán hàng và cấu hình thời gian hỗ trợ, bên trả lãi và nguyên tắc trả gốc |
| Acceptance Criteria | Người dùng bật/tắt được hỗ trợ và duy trì đủ metadata liên quan |

### FR-09 Cấu hình chính sách phí TNTH

| Mục | Nội dung |
|---|---|
| Requirement ID | FR-09 |
| Tên | Cấu hình chính sách phí TNTH |
| Business Area | Rate Center |
| Priority | Must Have |
| Mô tả | Hệ thống cho phép cấu hình phí TNTH theo phase ở cấp chính sách |
| Acceptance Criteria | Người dùng duy trì được mức phí theo phase và hệ thống xác định đúng phase hiện hành |

### FR-10 Mini Master cho chính sách hỗ trợ

| Mục | Nội dung |
|---|---|
| Requirement ID | FR-10 |
| Tên | Mini Master cho chính sách hỗ trợ lãi suất |
| Business Area | Rate Center |
| Priority | Should Have |
| Mô tả | Hệ thống cho phép lưu cấu hình hỗ trợ hiện tại thành nguồn dùng chung và áp dụng cho chính sách bán hàng khác |
| Acceptance Criteria | Người dùng lưu, chọn, tự điền dữ liệu và xóa được nguồn dùng chung |

### FR-11 Mini Master cho chính sách phí

| Mục | Nội dung |
|---|---|
| Requirement ID | FR-11 |
| Tên | Mini Master cho chính sách phí TNTH |
| Business Area | Rate Center |
| Priority | Should Have |
| Mô tả | Hệ thống cho phép lưu cấu hình phí TNTH hiện tại thành nguồn dùng chung và áp dụng cho chính sách khác |
| Acceptance Criteria | Người dùng lưu, chọn, tự điền rule phí và xóa được nguồn dùng chung |

### FR-12 Cấu hình rule ân hạn gốc

| Mục | Nội dung |
|---|---|
| Requirement ID | FR-12 |
| Tên | Cấu hình rule ân hạn gốc |
| Business Area | Rate Center |
| Priority | Must Have |
| Mô tả | Hệ thống cho phép cấu hình rule ân hạn gốc theo policy, nhóm và ngoại lệ |
| Acceptance Criteria | Hệ thống tính được ân hạn gốc đúng theo rule và mức ưu tiên |

### FR-13 Rule điều chỉnh lãi suất

| Mục | Nội dung |
|---|---|
| Requirement ID | FR-13 |
| Tên | Cấu hình rule điều chỉnh lãi suất |
| Business Area | Rate Center |
| Priority | Should Have |
| Mô tả | Hệ thống cho phép tạo rule điều kiện để cộng/trừ lãi suất |
| Acceptance Criteria | Rule chỉ được áp dụng khi toàn bộ điều kiện đầu vào đều khớp |

### FR-14 Rule Engine

| Mục | Nội dung |
|---|---|
| Requirement ID | FR-14 |
| Tên | Sinh dữ liệu policy runtime |
| Business Area | Calculation |
| Priority | Must Have |
| Mô tả | Hệ thống sinh các field động dùng cho template và tư vấn |
| Acceptance Criteria | Dữ liệu sinh ra gồm lãi suất, thời gian hỗ trợ, bên trả lãi, phase phí, ân hạn và ghi chú rule |

### FR-15 Mapping Rate Center vào template

| Mục | Nội dung |
|---|---|
| Requirement ID | FR-15 |
| Tên | Map dữ liệu Rate Center vào template |
| Business Area | Template Generation |
| Priority | Must Have |
| Mô tả | Hệ thống expose field của Rate Center và Rule Engine làm nguồn mapping |
| Acceptance Criteria | Người dùng map được placeholder sang field policy và xem preview giá trị |

### FR-16 Tư vấn chính sách

| Mục | Nội dung |
|---|---|
| Requirement ID | FR-16 |
| Tên | Xếp hạng chính sách theo đầu vào |
| Business Area | Advisory |
| Priority | Should Have |
| Mô tả | Hệ thống phân tích các policy hiện có và trả về danh sách policy phù hợp đã xếp hạng |
| Acceptance Criteria | Hệ thống trả về Top-5 policy cùng điểm, xác suất tương đối và breakdown điểm |

## 14. Định vị năng lực LLM / AI

### 14.1 Trạng thái hiện tại

Code hiện tại **không** bao gồm:

- tích hợp API LLM
- điều phối prompt
- embedding service
- model inference endpoint
- phụ thuộc external AI provider

Vì vậy, nếu BRD mô tả rằng release hiện tại đã dùng LLM để xây dựng chính sách bán hàng thì sẽ không đúng với hệ thống đang có.

### 14.2 Logic tư vấn hiện tại

Engine tư vấn hiện tại là một engine xếp hạng toán học chạy trên browser, sử dụng:

- dynamic weights
- sigmoid scoring
- cosine similarity
- softmax normalization

Trong BRD, phần này nên được gọi là `Policy Advisory Engine`, không nên gọi là `LLM Module`.

### 14.2.1 Các kỹ thuật toán học kiểu AI đang được áp dụng

Mặc dù release hiện tại chưa tích hợp Large Language Model thực sự, hệ thống đang áp dụng một số kỹ thuật toán học thường xuất hiện trong các mô hình AI hoặc ML để phục vụ bài toán tư vấn chính sách.

| Kỹ thuật | Cách dùng hiện tại trong dự án | Ý nghĩa nghiệp vụ |
|---|---|---|
| Softmax | Chuyển điểm thô của các chính sách thành phân phối xác suất tương đối trong Top-5 | Giúp phân biệt các chính sách có điểm gần nhau và thể hiện độ mạnh tương đối của khuyến nghị |
| Cosine Similarity | So khớp vector hồ sơ đầu vào với vector chính sách | Đo độ gần đa chiều giữa hồ sơ khách hàng và cấu hình chính sách |
| Sigmoid Function | Làm mượt điểm từng chiều như kỳ hạn và LTV | Tránh logic nhị phân cứng và cho phép giảm điểm theo mức độ phù hợp |
| Dynamic Weights | Điều chỉnh trọng số theo ngữ cảnh như LTV, kỳ hạn, rủi ro | Giúp kết quả tư vấn nhạy hơn với bối cảnh thay vì dùng trọng số cố định |

Các kỹ thuật này cần được ghi nhận trong BRD như một phần của `mô hình tư vấn hiện tại`.

### 14.2.2 Vì sao trước đó chưa gọi là “chức năng LLM”

Trước đó mình không gọi chúng là `LLM functions` vì trong chuẩn mô tả hệ thống và trong tài liệu BRD, các khái niệm như `LLM capability`, `LLM integration` hoặc `GenAI feature` thường ngụ ý rằng hệ thống có:

- model inference qua một runtime LLM
- cơ chế prompt-based generation
- natural language reasoning từ model
- kiến trúc AI model nội bộ hoặc bên ngoài

Code hiện tại chưa có các thành phần đó. Hệ thống chỉ sử dụng các kỹ thuật chấm điểm toán học lấy cảm hứng từ AI/ML, chưa phải LLM triển khai thực tế. Vì vậy cách mô tả đúng trong BRD là:

- `Current Release`: thuật toán tư vấn lấy cảm hứng từ AI
- `Future Release`: LLM thực thụ để hỗ trợ xây dựng chính sách bán hàng

### 14.2.3 Chi tiết thuật toán tư vấn hiện tại để đưa vào BRD

Module tư vấn hiện tại có thể được mô tả bằng chuỗi xử lý sau:

1. Nhận đầu vào hồ sơ khách hàng và khoản vay.
2. Chuẩn hóa các chiều dữ liệu của khách hàng và chính sách.
3. Tính mức độ phù hợp theo từng chiều bằng sigmoid-based scoring.
4. Điều chỉnh trọng số theo ngữ cảnh bằng dynamic weighting rules.
5. So khớp vector khách hàng và vector chính sách bằng cosine similarity.
6. Trộn weighted score và cosine score thành điểm tổng.
7. Áp dụng softmax lên Top-5 để tạo confidence distribution.

### 14.2.4 Câu mô tả khuyến nghị cho BRD

Câu mô tả khuyến nghị:

`Policy Advisory Engine ở release hiện tại sử dụng các thuật toán toán học lấy cảm hứng từ AI như sigmoid scoring, cosine similarity, dynamic weighting và softmax normalization để xếp hạng chính sách. Giải pháp hiện chưa tích hợp LLM hoặc generative AI runtime thực thụ.`

### 14.3 Định hướng LLM tương lai

Nếu nghiệp vụ muốn sử dụng AI để hỗ trợ xây dựng chính sách bán hàng, yêu cầu đó nên được mô tả là một yêu cầu tương lai:

| Requirement ID | FR-17 |
|---|---|
| Tên | AI-Assisted Sales Policy Authoring |
| Business Area | Advisory / Product Design |
| Priority | Could Have |
| Mô tả | Hệ thống hỗ trợ người dùng nghiệp vụ phác thảo chính sách bán hàng mới dựa trên hồ sơ dự án, phân khúc khách hàng mục tiêu, mẫu chính sách trong quá khứ và mục tiêu tín dụng |
| Đầu vào đề xuất | Loại dự án, phân khúc khách hàng, NIM mục tiêu, LTV mục tiêu, kỳ hạn vay, khẩu vị rủi ro, giả định cạnh tranh |
| Đầu ra đề xuất | Bộ policy draft, bucket lãi suất gợi ý, support policy gợi ý, fee policy gợi ý và phần giải thích |
| Giai đoạn triển khai | Phase 2 / Future Scope |
| Phụ thuộc | Cần kiến trúc backend hoặc model integration |

### 14.4 Cách thể hiện khuyến nghị trong BRD

BRD cần tách rất rõ:

- `Current Release`: advisory ranking và rule engine chạy trong browser
- `Future Release`: LLM hỗ trợ xây dựng chính sách bán hàng

## 15. Yêu cầu dữ liệu

| Nhóm dữ liệu | Mô tả |
|---|---|
| Template Data | Template Excel-like và template Word |
| Source Data | File import và các field được trích xuất |
| Master Data | Định nghĩa entity và record |
| Rate Center Data | Dự án, chính sách bán hàng, bucket lãi suất, rule ân hạn, ngoại lệ |
| Support Mini Master | Chính sách hỗ trợ lãi suất dùng chung |
| Fee Mini Master | Chính sách phí TNTH dùng chung |
| Advisory Input | Dữ liệu người dùng nhập để tư vấn chính sách |

## 16. Yêu cầu phi chức năng

| Mã | Yêu cầu |
|---|---|
| NFR-01 | Hệ thống phải chạy hoàn toàn trên browser cho các luồng cốt lõi |
| NFR-02 | Hệ thống không yêu cầu API key bên ngoài trong release hiện tại |
| NFR-03 | Các thao tác mapping và chạy rule phải phản hồi nhanh, phù hợp nghiệp vụ nội bộ |
| NFR-04 | Dữ liệu phải được giữ lại qua local browser storage giữa các phiên làm việc |
| NFR-05 | Giao diện phải sử dụng tốt trên màn hình desktop tiêu chuẩn |

## 17. Rủi ro

| Mã rủi ro | Rủi ro | Hướng giảm thiểu |
|---|---|---|
| R-01 | Local browser storage có thể bị xóa | Bổ sung export/backup ở giai đoạn sau |
| R-02 | Chính sách dùng chung có thể bị sửa thiếu kiểm soát | Bổ sung versioning/governance sau |
| R-03 | Không có audit trail tập trung | Bổ sung backend và workflow phê duyệt |
| R-04 | Người dùng có thể hiểu nhầm tư vấn hiện tại là AI sinh ngôn ngữ | Mô tả rõ logic hiện tại trong sản phẩm và trong BRD |

## 18. Tiêu chí nghiệm thu

### Nghiệm thu nghiệp vụ

- Người dùng cấu hình được dự án và chính sách bán hàng.
- Người dùng cấu hình được bảng lãi suất.
- Người dùng cấu hình được hỗ trợ lãi suất và phí TNTH ở cấp chính sách.
- Người dùng lưu được chính sách hỗ trợ/phí dùng chung vào mini master.
- Người dùng chọn được chính sách hỗ trợ/phí dùng chung từ nguồn.
- Người dùng generate được template với field chính sách động.
- Người dùng nhận được kết quả tư vấn Top-5 chính sách.

### Nghiệm thu tài liệu

- BRD phân biệt rõ năng lực hiện có và năng lực AI tương lai.
- BRD phản ánh đúng phạm vi và hành vi của code hiện tại.
- BRD có thể dùng để bàn giao cho BA, Product, Dev và UAT.

## 19. Kịch bản UAT

| UAT ID | Kịch bản | Kết quả mong đợi |
|---|---|---|
| UAT-01 | Tạo dự án mới và chính sách bán hàng | Chính sách được lưu và hiển thị đúng trong dự án |
| UAT-02 | Cấu hình bảng lãi suất | Bucket được lưu và sắp xếp đúng |
| UAT-03 | Bật hỗ trợ lãi suất ở cấp policy | Các field hỗ trợ xuất hiện và được tính đúng |
| UAT-04 | Lưu cấu hình hỗ trợ vào mini master | Nguồn hỗ trợ dùng chung hiển thị trong dropdown |
| UAT-05 | Áp dụng chính sách hỗ trợ dùng chung cho policy khác | Dữ liệu liên quan được tự điền |
| UAT-06 | Lưu cấu hình phí vào mini master | Nguồn phí dùng chung hiển thị trong dropdown |
| UAT-07 | Áp dụng chính sách phí dùng chung cho policy khác | Các mức phí được tự điền |
| UAT-08 | Chạy rule engine với policy đã chọn | Hệ thống sinh đúng các field chính sách động |
| UAT-09 | Map field chính sách vào template | Preview placeholder hiển thị đúng giá trị |
| UAT-10 | Chạy tư vấn chính sách | Trả về Top-5 cùng điểm và diễn giải |

## 20. Phụ lục

### Các file liên quan trong project

- [BRD.md](/Users/harryng/Desktop/Document/excel-template-app/BRD.md:1)
- [BRD_Professional.md](/Users/harryng/Desktop/Document/excel-template-app/BRD_Professional.md:1)
- [index.html](/Users/harryng/Desktop/Document/excel-template-app/index.html:959)
- [js/master-data.js](/Users/harryng/Desktop/Document/excel-template-app/js/master-data.js:42)
- [js/rate-center.js](/Users/harryng/Desktop/Document/excel-template-app/js/rate-center.js:364)
- [js/policy-advisor.js](/Users/harryng/Desktop/Document/excel-template-app/js/policy-advisor.js:5)
- [js/app.js](/Users/harryng/Desktop/Document/excel-template-app/js/app.js:2246)
- [js/word-template.js](/Users/harryng/Desktop/Document/excel-template-app/js/word-template.js:395)

