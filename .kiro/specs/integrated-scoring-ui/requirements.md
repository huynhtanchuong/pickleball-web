# Integrated Scoring UI - Requirements

## Overview
Tích hợp giao diện ghi điểm trực tiếp vào trang admin, loại bỏ trang referee.html riêng biệt. Đơn giản hóa UX với tap-to-score và tự động detect logic ghi điểm.

## User Stories

### US1: Ghi Điểm Trực Tiếp Trên Admin
**As a** tournament admin  
**I want to** ghi điểm trực tiếp trên trang admin  
**So that** không cần chuyển qua trang khác

**Acceptance Criteria:**
- Mỗi match card có khu vực ghi điểm inline
- Hiển thị điểm số lớn, rõ ràng
- Hiển thị team đang giao bóng
- Hiển thị server number (1 hoặc 2)

### US2: Tap-to-Score
**As a** referee  
**I want to** tap vào team name để ghi điểm  
**So that** ghi điểm nhanh chóng, không cần nhiều nút

**Acceptance Criteria:**
- Tap vào Team A → xử lý logic cho Team A
- Tap vào Team B → xử lý logic cho Team B
- Tự động detect:
  - Team đang giao + tap → +1 điểm
  - Team đang giao + server 1 + tap → chuyển server 2
  - Team đang giao + server 2 + tap → đổi giao
  - Team không giao + tap → đổi giao (team kia fault)

### US3: Chọn Giao Bóng Ban Đầu
**As a** referee  
**I want to** chọn team giao bóng đầu tiên  
**So that** bắt đầu trận đấu đúng luật

**Acceptance Criteria:**
- Nút "Chọn Giao Bóng" xuất hiện khi trận chưa bắt đầu
- Click → hiện dialog chọn Team A hoặc Team B
- Default: Server 2 (theo luật pickleball)
- Sau khi chọn → bắt đầu trận đấu

### US4: Undo Action
**As a** referee  
**I want to** undo action vừa thực hiện  
**So that** sửa lỗi khi ghi điểm nhầm

**Acceptance Criteria:**
- Nút "Undo" luôn hiển thị
- Click → hoàn tác action cuối cùng
- Disabled khi không có action nào để undo

### US5: Loại Bỏ UI Không Cần Thiết
**As a** admin  
**I want to** giao diện đơn giản, không có nút thừa  
**So that** dễ sử dụng và tập trung vào ghi điểm

**Acceptance Criteria:**
- ❌ Bỏ nút +/- icon (điều chỉnh điểm thủ công)
- ❌ Bỏ nút "Start Scoring"
- ❌ Bỏ nút "View Live"
- ✅ Giữ nút "Finish Match"
- ✅ Giữ nút "Reset Match"

## Functional Requirements

### FR1: Inline Scoring UI
- Mỗi match card có khu vực scoring inline
- Layout:
  ```
  ┌─────────────────────────────────────┐
  │ Team A vs Team B                    │
  ├─────────────────────────────────────┤
  │  [Team A]  5 : 3  [Team B]         │
  │  SERVING ↑         Server 1         │
  ├─────────────────────────────────────┤
  │  [Chọn Giao Bóng]  [Undo]          │
  └─────────────────────────────────────┘
  ```

### FR2: Tap-to-Score Logic
```javascript
function handleTeamTap(team) {
  if (team === servingTeam) {
    // Team đang giao bóng
    if (serverNumber === 1) {
      // Chuyển sang server 2
      serverNumber = 2;
    } else if (serverNumber === 2) {
      // Đổi giao
      servingTeam = otherTeam;
      serverNumber = 1;
    }
    // +1 điểm cho team đang giao
    score[team]++;
  } else {
    // Team không giao bóng (fault)
    // Đổi giao
    servingTeam = team;
    serverNumber = 1;
  }
}
```

### FR3: Serve Selection Dialog
- Modal/Dialog hiển thị khi click "Chọn Giao Bóng"
- 2 options: Team A, Team B
- Mặc định: Server 2
- Sau khi chọn → đóng dialog, bắt đầu trận

### FR4: Visual Indicators
- Team đang giao: highlight màu xanh
- Server number: hiển thị "Server 1" hoặc "Server 2"
- Score call: hiển thị dạng "5-3-2" (scoreA-scoreB-serverNumber)

## Non-Functional Requirements

### NFR1: Performance
- Tap response < 100ms
- Smooth animations
- No lag khi ghi điểm

### NFR2: Mobile-First
- Touch-friendly buttons (min 44x44px)
- Large tap targets
- Responsive layout

### NFR3: Accessibility
- Clear visual feedback
- High contrast colors
- Large, readable text

## Technical Constraints

- Sử dụng referee-game-state.js logic hiện có
- Tích hợp vào admin.js
- Không tạo trang mới
- Tương thích với Supabase realtime sync

## Success Metrics

- Thời gian ghi điểm trung bình < 2 giây
- Tỷ lệ undo < 5% (ít lỗi)
- User satisfaction > 90%

---

**Priority**: High  
**Complexity**: Medium  
**Estimated Effort**: 4-6 hours
