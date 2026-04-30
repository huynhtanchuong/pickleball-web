# ✅ Xóa target="_blank" - Mở Link Trong Cùng Tab

## 📋 Tóm Tắt
Đã xóa tất cả `target="_blank"` trong project để các link mở trong **cùng tab** thay vì mở tab mới.

## 🔧 Thay Đổi

### File: `admin.js`
**Trước:**
```javascript
<a href="referee.html?matchId=${m.id}" target="_blank" class="adm-save-btn">
  🎯 Start Scoring
</a>
<a href="viewer.html?matchId=${m.id}" target="_blank" class="adm-save-btn">
  👁 View Live
</a>
```

**Sau:**
```javascript
<a href="referee.html?matchId=${m.id}" class="adm-save-btn">
  🎯 Start Scoring
</a>
<a href="viewer.html?matchId=${m.id}" class="adm-save-btn">
  👁 View Live
</a>
```

## ✅ Kết Quả

Tất cả các link trong project giờ mở trong **cùng tab**:

1. ✅ **"🎯 Start Scoring"** (admin.html → referee.html)
2. ✅ **"👁 View Live"** (admin.html → viewer.html)
3. ✅ Không có `window.open()` nào trong code
4. ✅ Không còn `target="_blank"` nào trong project

## 🎯 Lợi Ích

- **UX tốt hơn**: Không bị mở nhiều tab
- **Dễ quản lý**: Chỉ cần 1 tab duy nhất
- **Mobile-friendly**: Tốt hơn cho thiết bị di động
- **Dễ quay lại**: Dùng nút Back của browser

## 🧪 Test

1. Mở `admin.html`
2. Nhấn "🎯 Start Scoring" → Mở referee.html trong cùng tab
3. Nhấn nút Back → Quay lại admin.html
4. Nhấn "👁 View Live" → Mở viewer.html trong cùng tab

## 📝 Ghi Chú

- Nếu muốn mở tab mới, user có thể:
  - **Ctrl + Click** (Windows/Linux)
  - **Cmd + Click** (Mac)
  - **Click chuột phải** → "Open in new tab"

---
**Ngày thực hiện**: 2026-04-22
**Trạng thái**: ✅ Hoàn thành
