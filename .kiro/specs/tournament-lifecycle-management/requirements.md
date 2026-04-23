# Requirements Document

## Introduction

Hệ thống quản lý vòng đời giải đấu Pickleball cho phép quản trị viên kiểm soát toàn bộ quy trình từ tạo giải đấu, đăng ký thành viên, tạo đội và trận đấu, đến quản lý trạng thái và chấm điểm. Hệ thống hiện tại có các chức năng riêng lẻ nhưng thiếu luồng tích hợp và kiểm soát trạng thái. Tính năng mới sẽ cung cấp quy trình hoàn chỉnh với quản lý trạng thái tự động, khóa/mở tính năng theo giai đoạn, và khả năng reset giải đấu.

## Glossary

- **System**: Hệ thống quản lý giải đấu Pickleball
- **Admin**: Quản trị viên có quyền quản lý giải đấu
- **Referee**: Trọng tài có quyền chấm điểm trận đấu
- **Public_User**: Người xem công khai không có quyền quản trị
- **Tournament**: Giải đấu Pickleball
- **Tournament_Status**: Trạng thái giải đấu (upcoming, ongoing, completed)
- **Member**: Thành viên tham gia giải đấu
- **Team**: Đội thi đấu gồm 2 thành viên
- **Match**: Trận đấu giữa 2 đội
- **Group**: Bảng đấu trong vòng bảng
- **Standings**: Bảng xếp hạng
- **Registration_Features**: Các tính năng đăng ký (add members, random teams, random matches)
- **Scoring_Interface**: Giao diện chấm điểm trận đấu
- **TournamentManager**: Class quản lý các thao tác giải đấu
- **Tier**: Cấp độ trình độ của thành viên (1, 2, 3)
- **Round_Robin**: Hệ thống thi đấu vòng tròn

## Requirements

### Requirement 1: Tạo Giải đấu với Thông tin Cơ bản

**User Story:** Là một Admin, tôi muốn tạo giải đấu mới với thông tin cơ bản, để tôi có thể bắt đầu quy trình tổ chức giải đấu.

#### Acceptance Criteria

1. WHEN Admin nhấn nút tạo giải đấu mới, THE System SHALL hiển thị form nhập thông tin cơ bản
2. THE System SHALL yêu cầu Admin nhập tên giải đấu (bắt buộc)
3. THE System SHALL yêu cầu Admin chọn ngày bắt đầu (bắt buộc)
4. THE System SHALL cho phép Admin nhập số bảng đấu với giá trị mặc định là 2
5. THE System SHALL cho phép Admin nhập số đội mỗi bảng với giá trị mặc định là 5
6. WHEN Admin lưu thông tin hợp lệ, THE System SHALL tạo giải đấu mới với trạng thái upcoming
7. WHEN giải đấu được tạo, THE System SHALL đặt giải đấu mới làm giải đấu đang hoạt động

### Requirement 2: Đăng ký Thành viên vào Giải đấu

**User Story:** Là một Admin, tôi muốn đăng ký thành viên vào giải đấu, để tôi có thể xác định danh sách người chơi tham gia.

#### Acceptance Criteria

1. WHILE Tournament_Status là upcoming, THE System SHALL hiển thị nút thêm thành viên cho Admin
2. WHEN Admin nhấn nút thêm thành viên, THE System SHALL hiển thị danh sách tất cả thành viên với checkbox
3. WHEN Admin chọn thành viên, THE System SHALL thêm thành viên vào danh sách tham gia giải đấu
4. THE System SHALL hiển thị tier của từng thành viên trong danh sách
5. THE System SHALL cho phép Admin điều chỉnh tier tạm thời cho từng thành viên
6. THE System SHALL cho phép Admin đánh dấu thành viên là hạt giống
7. WHEN Admin lưu danh sách thành viên, THE System SHALL lưu thông tin vào bảng tournament_participants

### Requirement 3: Tạo Đội Ngẫu nhiên theo Quy tắc Tier

**User Story:** Là một Admin, tôi muốn tạo đội ngẫu nhiên theo quy tắc tier, để tôi có thể có các đội cân bằng về trình độ.

#### Acceptance Criteria

1. WHILE Tournament_Status là upcoming, THE System SHALL hiển thị nút tạo đội ngẫu nhiên cho Admin
2. WHEN Admin nhấn nút tạo đội ngẫu nhiên, THE System SHALL áp dụng thuật toán ghép cặp
3. THE System SHALL ghép thành viên Tier 1 với thành viên Tier 3
4. THE System SHALL ghép thành viên Tier 2 với thành viên Tier 2
5. THE System SHALL phân bổ đều các thành viên hạt giống vào các bảng đấu
6. WHEN ghép cặp hoàn tất, THE System SHALL lưu danh sách đội vào bảng teams
7. THE System SHALL cho phép Admin nhấn nút tạo lại để ghép cặp ngẫu nhiên mới

### Requirement 4: Tạo Trận đấu Ngẫu nhiên theo Round-Robin

**User Story:** Là một Admin, tôi muốn tạo trận đấu ngẫu nhiên theo hệ thống vòng tròn, để tôi có thể có lịch thi đấu đầy đủ.

#### Acceptance Criteria

1. WHILE Tournament_Status là upcoming, THE System SHALL hiển thị nút tạo trận đấu ngẫu nhiên cho Admin
2. WHEN Admin nhấn nút tạo trận đấu, THE System SHALL tạo lịch thi đấu Round_Robin cho mỗi bảng
3. THE System SHALL tạo trận đấu giữa mỗi cặp đội trong cùng bảng
4. WHEN một bảng có N đội, THE System SHALL tạo N*(N-1)/2 trận đấu cho bảng đó
5. WHEN tạo trận đấu hoàn tất, THE System SHALL lưu tất cả trận đấu vào bảng matches với trạng thái not_started

### Requirement 5: Bắt đầu Giải đấu và Khóa Tính năng Đăng ký

**User Story:** Là một Admin, tôi muốn bắt đầu giải đấu và khóa các tính năng đăng ký, để tôi có thể đảm bảo dữ liệu không bị thay đổi trong khi thi đấu.

#### Acceptance Criteria

1. WHILE Tournament_Status là upcoming, THE System SHALL hiển thị nút bắt đầu giải đấu cho Admin
2. WHEN Admin nhấn nút bắt đầu giải đấu, THE System SHALL thay đổi Tournament_Status thành ongoing
3. WHEN Tournament_Status là ongoing, THE System SHALL ẩn nút thêm thành viên khỏi giao diện Admin
4. WHEN Tournament_Status là ongoing, THE System SHALL ẩn nút tạo đội ngẫu nhiên khỏi giao diện Admin
5. WHEN Tournament_Status là ongoing, THE System SHALL ẩn nút tạo trận đấu ngẫu nhiên khỏi giao diện Admin
6. WHEN Tournament_Status là ongoing, THE System SHALL hiển thị danh sách trận đấu cho Admin
7. WHEN Tournament_Status là ongoing, THE System SHALL hiển thị bảng xếp hạng cho Admin

### Requirement 6: Hiển thị Danh sách Trận đấu khi Giải đấu Đang diễn ra

**User Story:** Là một Public_User, tôi muốn xem danh sách trận đấu khi giải đấu đang diễn ra, để tôi có thể theo dõi lịch thi đấu.

#### Acceptance Criteria

1. WHEN Tournament_Status là ongoing, THE System SHALL hiển thị danh sách trận đấu cho Public_User
2. THE System SHALL hiển thị tên đội, điểm số, và trạng thái cho mỗi trận đấu
3. THE System SHALL nhóm trận đấu theo bảng đấu
4. THE System SHALL hiển thị thời gian thi đấu nếu có
5. THE System SHALL hiển thị sân thi đấu nếu có
6. THE System SHALL cập nhật danh sách trận đấu realtime khi có thay đổi

### Requirement 7: Hiển thị Bảng Xếp hạng khi Giải đấu Đang diễn ra

**User Story:** Là một Public_User, tôi muốn xem bảng xếp hạng khi giải đấu đang diễn ra, để tôi có thể theo dõi thứ hạng các đội.

#### Acceptance Criteria

1. WHEN Tournament_Status là ongoing, THE System SHALL hiển thị bảng xếp hạng cho Public_User
2. THE System SHALL tính toán xếp hạng dựa trên số trận thắng, hiệu số, và số điểm
3. THE System SHALL nhóm xếp hạng theo bảng đấu
4. THE System SHALL hiển thị tên đội, số trận đã đấu, số trận thắng, số trận thua, và điểm số
5. THE System SHALL cập nhật bảng xếp hạng realtime khi có trận đấu kết thúc

### Requirement 8: Mở khóa Chấm điểm cho Admin và Referee

**User Story:** Là một Admin hoặc Referee, tôi muốn chấm điểm trận đấu khi giải đấu đang diễn ra, để tôi có thể cập nhật kết quả trận đấu.

#### Acceptance Criteria

1. WHEN Tournament_Status là ongoing, THE System SHALL hiển thị Scoring_Interface cho Admin
2. WHEN Tournament_Status là ongoing, THE System SHALL hiển thị Scoring_Interface cho Referee
3. THE System SHALL cho phép Admin và Referee cập nhật điểm số trận đấu
4. THE System SHALL sử dụng giao diện chấm điểm inline đã có sẵn
5. WHEN Admin hoặc Referee cập nhật điểm, THE System SHALL đồng bộ điểm số vào cơ sở dữ liệu
6. THE System SHALL cập nhật bảng xếp hạng tự động khi trận đấu kết thúc

### Requirement 9: Ẩn Tính năng Admin khỏi Public User

**User Story:** Là một System, tôi cần ẩn các tính năng admin khỏi người dùng công khai, để tôi có thể đảm bảo chỉ admin mới có quyền quản lý.

#### Acceptance Criteria

1. WHEN người dùng không có ADMIN_KEY trong localStorage, THE System SHALL ẩn nút thêm thành viên
2. WHEN người dùng không có ADMIN_KEY trong localStorage, THE System SHALL ẩn nút tạo đội ngẫu nhiên
3. WHEN người dùng không có ADMIN_KEY trong localStorage, THE System SHALL ẩn nút tạo trận đấu ngẫu nhiên
4. WHEN người dùng không có ADMIN_KEY trong localStorage, THE System SHALL ẩn nút reset giải đấu
5. WHEN người dùng không có ADMIN_KEY trong localStorage, THE System SHALL ẩn nút bắt đầu giải đấu
6. WHEN người dùng không có ADMIN_KEY trong localStorage, THE System SHALL ẩn Scoring_Interface

### Requirement 10: Reset Giải đấu về Trạng thái Upcoming

**User Story:** Là một Admin, tôi muốn reset giải đấu về trạng thái ban đầu, để tôi có thể sửa đổi cấu hình hoặc bắt đầu lại.

#### Acceptance Criteria

1. WHILE Tournament_Status là ongoing hoặc completed, THE System SHALL hiển thị nút reset giải đấu cho Admin
2. WHEN Admin nhấn nút reset giải đấu, THE System SHALL hiển thị hộp thoại xác nhận
3. WHEN Admin xác nhận reset, THE System SHALL thay đổi Tournament_Status thành upcoming
4. WHEN reset hoàn tất, THE System SHALL xóa tất cả trận đấu khỏi bảng matches
5. WHEN reset hoàn tất, THE System SHALL xóa tất cả đội khỏi bảng teams
6. WHEN reset hoàn tất, THE System SHALL giữ nguyên danh sách thành viên trong bảng tournament_participants
7. WHEN reset hoàn tất, THE System SHALL mở khóa tất cả Registration_Features

### Requirement 11: Hiển thị Điểm số Trực tiếp cho Public User

**User Story:** Là một Public_User, tôi muốn xem điểm số trực tiếp, để tôi có thể theo dõi kết quả trận đấu đang diễn ra.

#### Acceptance Criteria

1. WHEN Tournament_Status là ongoing, THE System SHALL hiển thị điểm số trực tiếp cho Public_User
2. THE System SHALL hiển thị điểm số cho các trận đấu có trạng thái playing
3. THE System SHALL cập nhật điểm số realtime khi Admin hoặc Referee chấm điểm
4. THE System SHALL hiển thị badge "ĐANG DIỄN RA" cho các trận đấu đang chơi
5. THE System SHALL hiển thị điểm số cuối cùng cho các trận đấu đã kết thúc

### Requirement 12: Tương thích với TournamentManager Class

**User Story:** Là một System, tôi cần sử dụng TournamentManager class hiện có, để tôi có thể tận dụng các chức năng CRUD đã có.

#### Acceptance Criteria

1. THE System SHALL sử dụng TournamentManager.createTournament() để tạo giải đấu mới
2. THE System SHALL sử dụng TournamentManager.addParticipants() để thêm thành viên
3. THE System SHALL sử dụng TournamentManager.generateTeams() để tạo đội ngẫu nhiên
4. THE System SHALL sử dụng TournamentManager.generateSchedule() để tạo lịch thi đấu
5. THE System SHALL sử dụng TournamentManager.updateStatus() để thay đổi trạng thái giải đấu
6. THE System SHALL sử dụng TournamentManager.getMatches() để lấy danh sách trận đấu
7. THE System SHALL sử dụng TournamentManager.getTeams() để lấy danh sách đội

### Requirement 13: Tương thích với Inline Scoring UI

**User Story:** Là một System, tôi cần sử dụng giao diện chấm điểm inline đã có, để tôi có thể duy trì trải nghiệm người dùng nhất quán.

#### Acceptance Criteria

1. THE System SHALL sử dụng handleTeamTap() để xử lý chấm điểm bằng cách tap vào đội
2. THE System SHALL sử dụng openServeDialog() để chọn đội giao bóng đầu tiên
3. THE System SHALL sử dụng handleUndo() để hoàn tác action chấm điểm
4. THE System SHALL sử dụng syncMatchState() để đồng bộ trạng thái trận đấu vào cơ sở dữ liệu
5. THE System SHALL hiển thị serving badge cho đội đang giao bóng
6. THE System SHALL hiển thị score call theo định dạng scoreA-scoreB-serverNumber

### Requirement 14: Tương thích Ngược với Dữ liệu Hiện có

**User Story:** Là một System, tôi cần duy trì tương thích ngược với dữ liệu hiện có, để tôi có thể không làm mất dữ liệu cũ.

#### Acceptance Criteria

1. WHEN hệ thống khởi động, THE System SHALL kiểm tra xem có trận đấu nào không có tournament_id
2. IF có trận đấu không có tournament_id, THEN THE System SHALL tạo giải đấu mặc định
3. WHEN giải đấu mặc định được tạo, THE System SHALL gán tournament_id cho tất cả trận đấu cũ
4. THE System SHALL đặt trạng thái giải đấu mặc định là ongoing
5. THE System SHALL giữ nguyên tất cả dữ liệu trận đấu hiện có

### Requirement 15: Giao diện Quản lý Giải đấu trong Admin Panel

**User Story:** Là một Admin, tôi muốn có giao diện quản lý giải đấu trong admin panel, để tôi có thể dễ dàng thực hiện các thao tác quản lý.

#### Acceptance Criteria

1. THE System SHALL hiển thị dropdown chọn giải đấu ở đầu admin panel
2. THE System SHALL hiển thị trạng thái giải đấu hiện tại bên cạnh dropdown
3. WHILE Tournament_Status là upcoming, THE System SHALL hiển thị các nút: Thêm thành viên, Tạo đội ngẫu nhiên, Tạo trận đấu, Bắt đầu giải đấu
4. WHILE Tournament_Status là ongoing, THE System SHALL hiển thị các nút: Reset giải đấu
5. THE System SHALL hiển thị link đến trang quản lý giải đấu (tournaments.html)
6. THE System SHALL hiển thị link đến trang quản lý thành viên (members.html)

### Requirement 16: Giao diện Công khai trong Index Page

**User Story:** Là một Public_User, tôi muốn xem thông tin giải đấu trong trang công khai, để tôi có thể theo dõi giải đấu mà không cần đăng nhập admin.

#### Acceptance Criteria

1. THE System SHALL hiển thị dropdown chọn giải đấu ở đầu trang công khai
2. WHEN Tournament_Status là upcoming, THE System SHALL hiển thị thông báo "Giải đấu sắp diễn ra"
3. WHEN Tournament_Status là ongoing, THE System SHALL hiển thị danh sách trận đấu và bảng xếp hạng
4. WHEN Tournament_Status là completed, THE System SHALL hiển thị kết quả cuối cùng và bảng xếp hạng
5. THE System SHALL ẩn tất cả nút quản lý admin khỏi trang công khai

### Requirement 17: Hỗ trợ Cả LocalStorage và Supabase

**User Story:** Là một System, tôi cần hỗ trợ cả demo mode (localStorage) và production mode (Supabase), để tôi có thể hoạt động trong cả hai môi trường.

#### Acceptance Criteria

1. THE System SHALL sử dụng StorageAdapter để trừu tượng hóa lớp lưu trữ
2. WHEN ở demo mode, THE System SHALL lưu tất cả dữ liệu giải đấu vào localStorage
3. WHEN ở production mode, THE System SHALL lưu tất cả dữ liệu giải đấu vào Supabase
4. THE System SHALL đảm bảo tất cả chức năng hoạt động giống nhau trong cả hai mode
5. THE System SHALL sử dụng cùng một API cho cả hai mode thông qua StorageAdapter

### Requirement 18: Nhãn Giao diện Tiếng Việt

**User Story:** Là một người dùng Việt Nam, tôi muốn giao diện hiển thị bằng tiếng Việt, để tôi có thể dễ dàng sử dụng hệ thống.

#### Acceptance Criteria

1. THE System SHALL hiển thị tất cả nhãn nút bằng tiếng Việt
2. THE System SHALL hiển thị tất cả thông báo bằng tiếng Việt
3. THE System SHALL hiển thị tất cả hộp thoại xác nhận bằng tiếng Việt
4. THE System SHALL sử dụng module i18n.js để quản lý ngôn ngữ
5. THE System SHALL hỗ trợ chuyển đổi sang tiếng Anh nếu cần

### Requirement 19: Xác thực Admin bằng ADMIN_KEY

**User Story:** Là một System, tôi cần xác thực admin bằng ADMIN_KEY, để tôi có thể đảm bảo chỉ admin mới có quyền quản lý.

#### Acceptance Criteria

1. THE System SHALL kiểm tra ADMIN_KEY trong localStorage khi tải trang
2. WHEN ADMIN_KEY tồn tại và hợp lệ, THE System SHALL hiển thị tất cả tính năng admin
3. WHEN ADMIN_KEY không tồn tại, THE System SHALL ẩn tất cả tính năng admin
4. THE System SHALL sử dụng hằng số ADMIN_KEY từ admin.js
5. THE System SHALL không thay đổi cơ chế xác thực hiện có

### Requirement 20: Realtime Sync cho Nhiều Admin

**User Story:** Là một Admin, tôi muốn thay đổi được đồng bộ realtime, để tôi có thể làm việc với nhiều admin cùng lúc.

#### Acceptance Criteria

1. WHEN ở production mode, THE System SHALL đăng ký realtime subscription với Supabase
2. WHEN có thay đổi trạng thái giải đấu từ admin khác, THE System SHALL tự động cập nhật giao diện
3. WHEN có thay đổi danh sách trận đấu từ admin khác, THE System SHALL tự động cập nhật danh sách
4. WHEN có thay đổi điểm số từ admin khác, THE System SHALL tự động cập nhật điểm số
5. THE System SHALL hiển thị indicator khi realtime đang hoạt động

