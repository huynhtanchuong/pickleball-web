# ✅ Tính Năng Đổi Giao Thủ Công

## 📋 Tóm Tắt
Đã thêm tính năng **đổi giao thủ công** vào hệ thống trọng tài pickleball.

## 🎯 Chức Năng
- **Nút "🔄 Đổi Giao"** màu tím xuất hiện trên giao diện trọng tài
- Cho phép trọng tài đổi giao thủ công mà không cần ghi điểm
- Tự động xoay vòng server theo luật pickleball:
  - Server 1 → Server 2 (cùng đội)
  - Server 2 → Server 1 (đội kia)

## 🔧 Thay Đổi Code

### 1. `referee-game-state.js`
- ✅ Thêm `CHANGE_SERVE` vào `ActionTypes`
- ✅ Thêm case `CHANGE_SERVE` trong `gameStateReducer()` → gọi `rotateServer()`

### 2. `referee-ui.js`
- ✅ Thêm nút "🔄 Đổi Giao" vào UI (màu tím)
- ✅ Thêm function `handleChangeServe()`:
  - Debounce để tránh click nhiều lần
  - Kiểm tra trận đấu chưa kết thúc
  - Lưu vào history (để có thể undo)
  - Áp dụng action CHANGE_SERVE
  - Đồng bộ với sync engine
  - Hiển thị thông báo "Serve changed"

## 🎮 Cách Sử Dụng

1. Mở trang trọng tài: `referee.html?matchId=<match-id>`
2. Nhìn thấy nút **"🔄 Đổi Giao"** màu tím
3. Nhấn nút để đổi giao thủ công
4. Hệ thống tự động:
   - Xoay vòng server theo luật
   - Cập nhật indicator "SERVING"
   - Cập nhật score call (ví dụ: 1-0-1 → 0-1-1)
5. Có thể **Undo** nếu nhấn nhầm

## 📱 Giao Diện

```
┌─────────────────────────────────────┐
│  Team A Scores (xanh dương)         │
├─────────────────────────────────────┤
│  Team B Scores (cam)                │
├─────────────────────────────────────┤
│  🔄 Đổi Giao (tím) ← MỚI!          │
├─────────────────────────────────────┤
│  ↶ Undo (xám)                       │
└─────────────────────────────────────┘
```

## ✨ Tính Năng Bổ Sung
- ✅ Debounce 300ms để tránh click nhiều lần
- ✅ Tích hợp với History Manager (có thể undo)
- ✅ Tích hợp với Sync Engine (đồng bộ realtime)
- ✅ Disabled khi trận đấu kết thúc
- ✅ Hiển thị thông báo thành công

## 🧪 Test
Để test tính năng:
1. Mở referee.html với một trận đấu
2. Nhấn "🔄 Đổi Giao"
3. Kiểm tra:
   - Server indicator thay đổi
   - Score call cập nhật đúng
   - Có thể undo
   - Không thể đổi giao khi trận đấu kết thúc

## 📝 Ghi Chú
- Nút này hữu ích khi:
  - Trọng tài nhầm lẫn về server
  - Cần điều chỉnh server trước khi bắt đầu rally
  - Test hệ thống
- Nút luôn hiển thị (không cần enable config)
- Màu tím để phân biệt với các nút khác

---
**Ngày tạo**: 2026-04-22
**Trạng thái**: ✅ Hoàn thành và sẵn sàng sử dụng
