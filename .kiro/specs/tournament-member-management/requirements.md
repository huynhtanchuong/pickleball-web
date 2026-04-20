# Requirements Document

## Introduction

Hệ thống quản lý giải đấu và thành viên Pickleball mở rộng cho phép quản trị viên quản lý nhiều giải đấu, lưu trữ thông tin thành viên, tự động ghép cặp đội dựa trên trình độ, và tổ chức các trận đấu ngoài lề. Hệ thống hiện tại chỉ hỗ trợ một giải đấu với dữ liệu cố định; tính năng mới sẽ cho phép tạo và quản lý nhiều giải đấu với dữ liệu động từ danh sách thành viên.

## Glossary

- **System**: Hệ thống quản lý giải đấu Pickleball
- **Member**: Thành viên tham gia giải đấu
- **Tournament**: Giải đấu Pickleball
- **Tier**: Cấp độ trình độ của thành viên (Tier 1 = cao, Tier 2 = trung bình, Tier 3 = thấp)
- **Seeded_Player**: Thành viên được đánh dấu là hạt giống (thành viên mạnh)
- **Team**: Đội thi đấu gồm 2 thành viên
- **Group**: Bảng đấu trong vòng bảng
- **Match**: Trận đấu giữa 2 đội
- **Exhibition_Match**: Trận đấu ngoài lề không ảnh hưởng xếp hạng chính thức
- **Admin**: Quản trị viên hệ thống
- **Pairing_Algorithm**: Thuật toán ghép cặp thành viên thành đội
- **Round_Robin**: Hệ thống thi đấu vòng tròn (mỗi đội đấu với tất cả đội khác)

## Requirements

### Requirement 1: Quản lý Thành viên

**User Story:** Là một Admin, tôi muốn quản lý danh sách thành viên, để tôi có thể lưu trữ thông tin và sử dụng cho các giải đấu.

#### Acceptance Criteria

1. WHEN Admin truy cập trang quản lý thành viên, THE System SHALL hiển thị danh sách tất cả thành viên với tên, tier, email, và số điện thoại
2. WHEN Admin nhấn nút thêm thành viên mới, THE System SHALL hiển thị form nhập tên (bắt buộc), email (tùy chọn), số điện thoại (tùy chọn), và tier (bắt buộc)
3. WHEN Admin lưu thành viên mới với tên và tier hợp lệ, THE System SHALL lưu thành viên vào cơ sở dữ liệu và hiển thị trong danh sách
4. WHEN Admin chọn chỉnh sửa thành viên, THE System SHALL hiển thị form với thông tin hiện tại và cho phép cập nhật tên, tier, email, và số điện thoại
5. WHEN Admin lưu thay đổi thông tin thành viên, THE System SHALL cập nhật thông tin trong cơ sở dữ liệu
6. WHEN Admin chọn xóa thành viên, THE System SHALL hiển thị hộp thoại xác nhận
7. IF Admin xác nhận xóa thành viên, THEN THE System SHALL xóa thành viên khỏi cơ sở dữ liệu
8. WHEN Admin sử dụng bộ lọc tier, THE System SHALL hiển thị chỉ các thành viên thuộc tier được chọn
9. WHEN Admin nhập từ khóa tìm kiếm, THE System SHALL hiển thị các thành viên có tên chứa từ khóa đó
10. THE System SHALL phân loại thành viên thành 3 tier: Tier 1 (cao), Tier 2 (trung bình), Tier 3 (thấp)

### Requirement 2: Lịch sử Giải đấu

**User Story:** Là một Admin, tôi muốn xem và quản lý nhiều giải đấu, để tôi có thể theo dõi lịch sử và chuyển đổi giữa các giải đấu.

#### Acceptance Criteria

1. WHEN Admin truy cập trang danh sách giải đấu, THE System SHALL hiển thị tất cả giải đấu với tên, ngày tổ chức, và trạng thái
2. THE System SHALL phân loại giải đấu thành 3 trạng thái: upcoming (sắp diễn ra), ongoing (đang diễn ra), completed (đã kết thúc)
3. WHEN Admin chọn xem giải đấu đã kết thúc, THE System SHALL hiển thị kết quả, bảng xếp hạng, và bracket của giải đó
4. WHEN Admin chọn chuyển đổi giải đấu, THE System SHALL đặt giải đấu được chọn làm giải đấu đang hoạt động
5. WHEN Admin chọn xóa giải đấu, THE System SHALL hiển thị hộp thoại xác nhận
6. IF Admin xác nhận xóa giải đấu có trạng thái upcoming hoặc completed, THEN THE System SHALL xóa giải đấu và tất cả dữ liệu liên quan
7. IF Admin cố gắng xóa giải đấu có trạng thái ongoing, THEN THE System SHALL hiển thị thông báo lỗi và không cho phép xóa
8. WHEN Admin chọn archive giải đấu completed, THE System SHALL đánh dấu giải đấu là archived và ẩn khỏi danh sách chính
9. WHEN Admin chọn xem giải đấu archived, THE System SHALL hiển thị danh sách các giải đấu đã archive

### Requirement 3: Tạo Giải đấu Mới - Thông tin Cơ bản

**User Story:** Là một Admin, tôi muốn tạo giải đấu mới với thông tin cơ bản, để tôi có thể thiết lập cấu trúc giải đấu.

#### Acceptance Criteria

1. WHEN Admin nhấn nút tạo giải đấu mới, THE System SHALL hiển thị form nhập thông tin cơ bản
2. THE System SHALL yêu cầu Admin nhập tên giải đấu (bắt buộc)
3. THE System SHALL yêu cầu Admin chọn ngày bắt đầu (bắt buộc)
4. THE System SHALL cho phép Admin nhập số bảng đấu với giá trị mặc định là 2
5. THE System SHALL cho phép Admin nhập số đội mỗi bảng với giá trị mặc định là 5
6. WHEN Admin lưu thông tin cơ bản hợp lệ, THE System SHALL tạo giải đấu mới với trạng thái upcoming và chuyển đến bước chọn thành viên

### Requirement 4: Tạo Giải đấu Mới - Chọn Thành viên

**User Story:** Là một Admin, tôi muốn chọn thành viên tham gia giải đấu, để tôi có thể xác định danh sách người chơi.

#### Acceptance Criteria

1. WHEN Admin ở bước chọn thành viên, THE System SHALL hiển thị danh sách tất cả thành viên với checkbox
2. THE System SHALL hiển thị tier của từng thành viên bên cạnh tên
3. WHEN Admin chọn checkbox thành viên, THE System SHALL thêm thành viên vào danh sách tham gia giải đấu
4. WHEN Admin bỏ chọn checkbox thành viên, THE System SHALL xóa thành viên khỏi danh sách tham gia
5. THE System SHALL cho phép Admin điều chỉnh tier tạm thời cho từng thành viên được chọn
6. WHEN Admin điều chỉnh tier tạm thời, THE System SHALL lưu tier tạm thời chỉ cho giải đấu này và không thay đổi tier gốc của thành viên
7. THE System SHALL hiển thị checkbox "Hạt giống" cho mỗi thành viên được chọn
8. WHEN Admin đánh dấu thành viên là hạt giống, THE System SHALL lưu trạng thái hạt giống cho thành viên trong giải đấu này
9. WHEN Admin hoàn tất chọn thành viên, THE System SHALL chuyển đến bước ghép cặp tự động

### Requirement 5: Tạo Giải đấu Mới - Ghép Cặp Tự Động

**User Story:** Là một Admin, tôi muốn hệ thống tự động ghép cặp thành viên thành đội, để tôi có thể tạo đội cân bằng dựa trên trình độ.

#### Acceptance Criteria

1. WHEN Admin kích hoạt ghép cặp tự động, THE System SHALL áp dụng Pairing_Algorithm để ghép cặp thành viên
2. THE Pairing_Algorithm SHALL ghép thành viên Tier 1 với thành viên Tier 3
3. THE Pairing_Algorithm SHALL ghép thành viên Tier 2 với thành viên Tier 2
4. WHEN có Seeded_Player, THE Pairing_Algorithm SHALL phân bổ đều Seeded_Player vào các bảng đấu
5. WHEN số Seeded_Player là 4 và số bảng là 2, THE Pairing_Algorithm SHALL phân bổ 2 Seeded_Player vào mỗi bảng
6. WHEN ghép cặp hoàn tất, THE System SHALL hiển thị danh sách các đội đã ghép với tên thành viên và bảng đấu
7. WHEN Admin nhấn nút ghép lại, THE System SHALL xóa kết quả ghép cặp hiện tại và thực hiện ghép cặp ngẫu nhiên mới
8. THE System SHALL cho phép Admin chỉnh sửa thủ công bằng cách swap thành viên giữa các đội
9. THE System SHALL cho phép Admin swap đội giữa các bảng đấu
10. WHEN Admin xác nhận kết quả ghép cặp, THE System SHALL lưu danh sách đội vào cơ sở dữ liệu và chuyển đến bước tạo lịch thi đấu

### Requirement 6: Tạo Giải đấu Mới - Tạo Lịch Thi Đấu

**User Story:** Là một Admin, tôi muốn hệ thống tự động tạo lịch thi đấu vòng bảng, để tôi có thể có lịch thi đấu đầy đủ.

#### Acceptance Criteria

1. WHEN Admin kích hoạt tạo lịch thi đấu, THE System SHALL tạo lịch thi đấu Round_Robin cho mỗi bảng
2. THE System SHALL tạo trận đấu giữa mỗi cặp đội trong cùng bảng
3. WHEN một bảng có 5 đội, THE System SHALL tạo 10 trận đấu cho bảng đó
4. THE System SHALL cho phép Admin chỉnh sửa thứ tự trận đấu
5. THE System SHALL cho phép Admin gán thời gian thi đấu cho từng trận (tùy chọn)
6. THE System SHALL cho phép Admin gán sân thi đấu cho từng trận (tùy chọn)
7. THE System SHALL cho phép Admin gán trọng tài cho từng trận (tùy chọn)
8. WHEN Admin hoàn tất tạo lịch, THE System SHALL lưu tất cả trận đấu vào cơ sở dữ liệu và đặt trạng thái giải đấu là upcoming

### Requirement 7: Trận Tranh Giải Ba

**User Story:** Là một Admin, tôi muốn tự động tạo trận tranh giải ba, để tôi có thể xác định đội hạng 3.

#### Acceptance Criteria

1. WHEN cả 2 trận bán kết đã hoàn thành, THE System SHALL xác định 2 đội thua bán kết
2. WHEN có 2 đội thua bán kết, THE System SHALL tự động tạo trận tranh giải ba với 2 đội này
3. THE System SHALL đặt loại trận là third_place cho trận tranh giải ba
4. WHEN trận tranh giải ba hoàn thành, THE System SHALL xác định đội thắng là hạng 3

### Requirement 8: Trận Tranh Giải Khuyến Khích

**User Story:** Là một Admin, tôi muốn tạo trận tranh giải khuyến khích cho các đội hạng 3 vòng bảng, để tôi có thể tổ chức thêm trận đấu cho các đội không vào bán kết.

#### Acceptance Criteria

1. THE System SHALL cung cấp tùy chọn bật/tắt tính năng trận tranh giải khuyến khích
2. WHEN tính năng được bật và vòng bảng hoàn thành, THE System SHALL xác định 2 đội hạng 3 từ 2 bảng
3. WHEN có 2 đội hạng 3 vòng bảng, THE System SHALL tự động tạo trận tranh giải khuyến khích
4. THE System SHALL đặt loại trận là consolation cho trận tranh giải khuyến khích
5. WHEN tính năng bị tắt, THE System SHALL không tạo trận tranh giải khuyến khích

### Requirement 9: Trận Show Match

**User Story:** Là một Admin, tôi muốn tạo trận show match với thành viên tùy chọn, để tôi có thể tổ chức trận đấu biểu diễn.

#### Acceptance Criteria

1. WHEN Admin chọn tạo show match, THE System SHALL hiển thị danh sách tất cả thành viên tham gia giải đấu
2. THE System SHALL cho phép Admin chọn 4 thành viên bất kỳ
3. WHEN Admin đã chọn 4 thành viên, THE System SHALL cho phép Admin ghép thành 2 đội thủ công
4. WHEN Admin xác nhận tạo show match, THE System SHALL tạo trận đấu với loại exhibition
5. THE System SHALL đặt trạng thái trận show match là not_started
6. WHEN trận show match hoàn thành, THE System SHALL lưu kết quả nhưng không ảnh hưởng bảng xếp hạng chính thức
7. THE System SHALL cho phép Admin tạo nhiều show match trong cùng một giải đấu

### Requirement 10: Cơ sở Dữ liệu - Bảng Members

**User Story:** Là một System, tôi cần lưu trữ thông tin thành viên, để tôi có thể quản lý danh sách thành viên.

#### Acceptance Criteria

1. THE System SHALL tạo bảng members với các cột: id, name, email, phone, tier, created_at
2. THE System SHALL đặt id là khóa chính tự động tăng
3. THE System SHALL đặt name là bắt buộc (NOT NULL)
4. THE System SHALL đặt tier là bắt buộc (NOT NULL) với giá trị 1, 2, hoặc 3
5. THE System SHALL đặt email là tùy chọn (NULLABLE)
6. THE System SHALL đặt phone là tùy chọn (NULLABLE)
7. THE System SHALL tự động gán created_at khi tạo thành viên mới

### Requirement 11: Cơ sở Dữ liệu - Bảng Tournaments

**User Story:** Là một System, tôi cần lưu trữ thông tin giải đấu, để tôi có thể quản lý nhiều giải đấu.

#### Acceptance Criteria

1. THE System SHALL tạo bảng tournaments với các cột: id, name, start_date, status, config, created_at
2. THE System SHALL đặt id là khóa chính tự động tăng
3. THE System SHALL đặt name là bắt buộc (NOT NULL)
4. THE System SHALL đặt start_date là bắt buộc (NOT NULL)
5. THE System SHALL đặt status là bắt buộc (NOT NULL) với giá trị upcoming, ongoing, hoặc completed
6. THE System SHALL lưu config dưới dạng JSON chứa số bảng, số đội mỗi bảng, và các cấu hình khác
7. THE System SHALL tự động gán created_at khi tạo giải đấu mới

### Requirement 12: Cơ sở Dữ liệu - Bảng Tournament_Participants

**User Story:** Là một System, tôi cần lưu trữ thông tin thành viên tham gia giải đấu, để tôi có thể theo dõi ai tham gia giải nào.

#### Acceptance Criteria

1. THE System SHALL tạo bảng tournament_participants với các cột: id, tournament_id, member_id, tier_override, is_seeded
2. THE System SHALL đặt id là khóa chính tự động tăng
3. THE System SHALL đặt tournament_id là khóa ngoại tham chiếu đến bảng tournaments
4. THE System SHALL đặt member_id là khóa ngoại tham chiếu đến bảng members
5. THE System SHALL đặt tier_override là tùy chọn (NULLABLE) để lưu tier tạm thời cho giải đấu
6. THE System SHALL đặt is_seeded là boolean với giá trị mặc định FALSE
7. THE System SHALL đảm bảo mỗi cặp (tournament_id, member_id) là duy nhất

### Requirement 13: Cơ sở Dữ liệu - Bảng Teams

**User Story:** Là một System, tôi cần lưu trữ thông tin đội thi đấu, để tôi có thể quản lý các đội trong giải đấu.

#### Acceptance Criteria

1. THE System SHALL tạo bảng teams với các cột: id, tournament_id, name, member1_id, member2_id, group_name, is_seeded
2. THE System SHALL đặt id là khóa chính tự động tăng
3. THE System SHALL đặt tournament_id là khóa ngoại tham chiếu đến bảng tournaments
4. THE System SHALL đặt member1_id là khóa ngoại tham chiếu đến bảng members
5. THE System SHALL đặt member2_id là khóa ngoại tham chiếu đến bảng members
6. THE System SHALL đặt name là tùy chọn (NULLABLE) để lưu tên đội tùy chỉnh
7. THE System SHALL đặt group_name là bắt buộc (NOT NULL) để xác định bảng đấu
8. THE System SHALL đặt is_seeded là boolean với giá trị mặc định FALSE

### Requirement 14: Cơ sở Dữ liệu - Mở rộng Bảng Matches

**User Story:** Là một System, tôi cần mở rộng bảng matches để hỗ trợ nhiều giải đấu và loại trận, để tôi có thể quản lý tất cả trận đấu.

#### Acceptance Criteria

1. THE System SHALL thêm cột tournament_id vào bảng matches
2. THE System SHALL đặt tournament_id là khóa ngoại tham chiếu đến bảng tournaments
3. THE System SHALL thêm cột match_type vào bảng matches
4. THE System SHALL đặt match_type với các giá trị: group, semi, final, third_place, consolation, exhibition
5. THE System SHALL giữ nguyên các cột hiện có: id, teamA, teamB, scoreA, scoreB, status, stage, group_name, updated_at
6. THE System SHALL đảm bảo tương thích ngược với dữ liệu hiện tại

### Requirement 15: Giao diện - Trang Members

**User Story:** Là một Admin, tôi muốn có trang quản lý thành viên riêng, để tôi có thể dễ dàng quản lý danh sách thành viên.

#### Acceptance Criteria

1. THE System SHALL tạo trang members.html với giao diện quản lý thành viên
2. THE System SHALL hiển thị danh sách thành viên dưới dạng bảng hoặc card
3. THE System SHALL cung cấp nút thêm thành viên mới ở đầu trang
4. THE System SHALL cung cấp bộ lọc theo tier
5. THE System SHALL cung cấp ô tìm kiếm theo tên
6. THE System SHALL hiển thị nút chỉnh sửa và xóa cho mỗi thành viên
7. THE System SHALL đảm bảo giao diện responsive và mobile-friendly

### Requirement 16: Giao diện - Trang Tournaments

**User Story:** Là một Admin, tôi muốn có trang quản lý giải đấu riêng, để tôi có thể xem danh sách và tạo giải đấu mới.

#### Acceptance Criteria

1. THE System SHALL tạo trang tournaments.html với giao diện quản lý giải đấu
2. THE System SHALL hiển thị danh sách giải đấu với tên, ngày, và trạng thái
3. THE System SHALL cung cấp nút tạo giải đấu mới ở đầu trang
4. THE System SHALL hiển thị nút xem, chỉnh sửa, xóa, và archive cho mỗi giải đấu
5. THE System SHALL phân nhóm giải đấu theo trạng thái (upcoming, ongoing, completed)
6. THE System SHALL cung cấp bộ lọc để hiển thị/ẩn giải đấu archived
7. THE System SHALL đảm bảo giao diện responsive và mobile-friendly

### Requirement 17: Giao diện - Cập nhật Admin.html

**User Story:** Là một Admin, tôi muốn chọn giải đấu đang xem trong trang admin, để tôi có thể quản lý nhiều giải đấu.

#### Acceptance Criteria

1. THE System SHALL thêm dropdown chọn giải đấu ở đầu trang admin.html
2. WHEN Admin chọn giải đấu từ dropdown, THE System SHALL tải và hiển thị dữ liệu của giải đấu đó
3. THE System SHALL hiển thị tên giải đấu đang được chọn
4. THE System SHALL lưu giải đấu đang chọn vào localStorage để duy trì khi reload trang
5. THE System SHALL hiển thị thông báo nếu không có giải đấu nào

### Requirement 18: Giao diện - Cập nhật Index.html

**User Story:** Là một người xem công khai, tôi muốn chọn giải đấu để xem, để tôi có thể xem kết quả của nhiều giải đấu.

#### Acceptance Criteria

1. THE System SHALL thêm dropdown chọn giải đấu ở đầu trang index.html
2. WHEN người xem chọn giải đấu từ dropdown, THE System SHALL tải và hiển thị dữ liệu của giải đấu đó
3. THE System SHALL hiển thị tên giải đấu đang được chọn
4. THE System SHALL lưu giải đấu đang chọn vào localStorage để duy trì khi reload trang
5. THE System SHALL mặc định hiển thị giải đấu có trạng thái ongoing, nếu không có thì hiển thị giải đấu upcoming gần nhất

### Requirement 19: Tích hợp - Tương thích LocalStorage và Supabase

**User Story:** Là một System, tôi cần hỗ trợ cả demo mode (localStorage) và production mode (Supabase), để tôi có thể hoạt động trong cả hai môi trường.

#### Acceptance Criteria

1. THE System SHALL kiểm tra cấu hình Supabase khi khởi động
2. WHEN cấu hình Supabase không hợp lệ, THE System SHALL chuyển sang demo mode sử dụng localStorage
3. WHEN ở demo mode, THE System SHALL lưu tất cả dữ liệu vào localStorage
4. WHEN ở production mode, THE System SHALL lưu tất cả dữ liệu vào Supabase
5. THE System SHALL đảm bảo tất cả chức năng hoạt động giống nhau trong cả hai mode
6. THE System SHALL hiển thị thông báo rõ ràng về mode đang sử dụng

### Requirement 20: Tích hợp - Realtime Sync

**User Story:** Là một Admin, tôi muốn thay đổi được đồng bộ realtime, để tôi có thể làm việc với nhiều admin cùng lúc.

#### Acceptance Criteria

1. WHEN ở production mode, THE System SHALL đăng ký realtime subscription với Supabase
2. WHEN có thay đổi từ admin khác, THE System SHALL tự động cập nhật giao diện
3. THE System SHALL hiển thị indicator khi realtime đang hoạt động
4. WHEN ở demo mode, THE System SHALL sử dụng storage event để đồng bộ giữa các tab
5. THE System SHALL tránh xung đột khi nhiều admin chỉnh sửa cùng lúc

### Requirement 21: Tích hợp - Export/Import Dữ liệu Thành viên

**User Story:** Là một Admin, tôi muốn export và import danh sách thành viên, để tôi có thể sao lưu và khôi phục dữ liệu.

#### Acceptance Criteria

1. THE System SHALL cung cấp nút export danh sách thành viên
2. WHEN Admin nhấn export, THE System SHALL tạo file CSV chứa tất cả thông tin thành viên
3. THE System SHALL đặt tên file theo định dạng members_YYYY-MM-DD.csv
4. THE System SHALL cung cấp nút import danh sách thành viên
5. WHEN Admin chọn file CSV hợp lệ, THE System SHALL đọc và hiển thị preview dữ liệu
6. WHEN Admin xác nhận import, THE System SHALL thêm các thành viên mới vào cơ sở dữ liệu
7. IF thành viên đã tồn tại (dựa trên email hoặc tên), THEN THE System SHALL hiển thị tùy chọn bỏ qua hoặc cập nhật

### Requirement 22: Tích hợp - Backup Toàn bộ Giải đấu

**User Story:** Là một Admin, tôi muốn backup toàn bộ dữ liệu giải đấu, để tôi có thể sao lưu và khôi phục giải đấu.

#### Acceptance Criteria

1. THE System SHALL cung cấp nút backup giải đấu trong trang chi tiết giải đấu
2. WHEN Admin nhấn backup, THE System SHALL tạo file JSON chứa tất cả dữ liệu giải đấu
3. THE System SHALL bao gồm thông tin giải đấu, danh sách đội, danh sách trận đấu, và kết quả
4. THE System SHALL đặt tên file theo định dạng tournament_[tên-giải]_YYYY-MM-DD.json
5. THE System SHALL cung cấp chức năng restore từ file backup
6. WHEN Admin chọn file backup hợp lệ, THE System SHALL hiển thị preview thông tin giải đấu
7. WHEN Admin xác nhận restore, THE System SHALL tạo giải đấu mới với tất cả dữ liệu từ backup

