# 📋 Hướng dẫn Quản lý Đội

## 🎯 Tính năng mới

Bạn vừa có thêm trang **Quản lý Đội** để chỉnh sửa tên đội dễ dàng!

---

## 🚀 Cách sử dụng

### 1. Truy cập trang Quản lý Đội

**Từ Admin Dashboard:**
- Vào: `https://your-site.vercel.app/admin.html`
- Login bằng password
- Click nút **"📋 Quản lý đội"** ở góc trên bên phải

**Hoặc truy cập trực tiếp:**
- Vào: `https://your-site.vercel.app/teams.html`

---

### 2. Xem danh sách đội

Trang sẽ hiển thị:
- ✅ Tất cả đội thi đấu
- ✅ Phân theo bảng (A, B, C...)
- ✅ Thống kê: Số trận, thắng, thua
- ✅ Nhóm theo bảng đấu

---

### 3. Sửa tên đội

**Bước 1:** Click nút **"✏️ Sửa tên"** trên card của đội

**Bước 2:** Nhập tên mới vào ô input

**Bước 3:** Click **"💾 Lưu"**

**Bước 4:** Xác nhận thay đổi

→ **Tất cả trận đấu** của đội đó sẽ được cập nhật tự động!

---

## 💡 Ví dụ thực tế

### Trường hợp 1: Sửa lỗi chính tả

**Trước:**
```
Tuấn Anh & Hang Dang
```

**Sau:**
```
Tuấn Anh & Hằng Dang
```

→ Tất cả 10 trận của đội này sẽ hiển thị tên mới

---

### Trường hợp 2: Đổi tên đội hoàn toàn

**Trước:**
```
Dũng Nguyễn & Minh Ngọc
```

**Sau:**
```
Team Dragon
```

→ Tên mới sẽ xuất hiện ở:
- ✅ Vòng bảng
- ✅ Bán kết (nếu đội này vào)
- ✅ Chung kết (nếu đội này vào)
- ✅ Bảng xếp hạng
- ✅ Bracket

---

## ⚠️ Lưu ý quan trọng

### 1. Ảnh hưởng toàn bộ hệ thống
- Khi đổi tên đội, **TẤT CẢ** trận đấu của đội đó sẽ được cập nhật
- Bao gồm: Vòng bảng, bán kết, chung kết

### 2. Không thể hoàn tác
- Sau khi lưu, không có nút "Undo"
- Nếu sai, phải sửa lại thủ công

### 3. Tên đội không được trùng
- Mỗi đội phải có tên riêng
- Nếu trùng tên, hệ thống sẽ nhầm lẫn

### 4. Realtime update
- Sau khi đổi tên, trang user view sẽ tự động cập nhật
- Không cần refresh trang

---

## 🔧 Các tính năng

### ✅ Đã có:
- [x] Xem danh sách tất cả đội
- [x] Phân nhóm theo bảng
- [x] Thống kê trận đấu
- [x] Sửa tên đội
- [x] Cập nhật tất cả trận đấu tự động
- [x] Realtime sync với database

### 🚧 Có thể thêm sau:
- [ ] Thêm đội mới
- [ ] Xóa đội
- [ ] Chuyển đội sang bảng khác
- [ ] Import/Export danh sách đội
- [ ] Thêm logo đội
- [ ] Thêm thông tin liên hệ

---

## 📱 Responsive

Trang hoạt động tốt trên:
- ✅ Desktop
- ✅ Tablet
- ✅ Mobile

---

## 🎨 Giao diện

### Card đội hiển thị:
```
┌─────────────────────────────────┐
│ Tuấn Anh & Hang Dang    [Bảng A]│
│                                  │
│ 🎮 10 trận  ✅ 7 thắng  ❌ 3 thua│
│                                  │
│ [✏️ Sửa tên]                     │
└─────────────────────────────────┘
```

### Khi click "Sửa tên":
```
┌─────────────────────────────────┐
│ Tuấn Anh & Hang Dang    [Bảng A]│
│                                  │
│ 🎮 10 trận  ✅ 7 thắng  ❌ 3 thua│
│                                  │
│ ┌─────────────────────────────┐ │
│ │ Tuấn Anh & Hằng Dang       │ │
│ └─────────────────────────────┘ │
│ [💾 Lưu]  [✖️ Hủy]              │
└─────────────────────────────────┘
```

---

## 🔐 Bảo mật

- ✅ Chỉ admin mới truy cập được
- ✅ Phải login trước
- ✅ Tự động redirect nếu chưa login

---

## 🚀 Deploy

Sau khi tạo trang này, cần deploy lại:

```bash
vercel --prod
```

Hoặc nếu dùng GitHub:
```bash
git add teams.html teams.js admin.html
git commit -m "Add team management page"
git push
```

---

## 📞 Hỗ trợ

Nếu gặp vấn đề:
1. Kiểm tra console (F12)
2. Kiểm tra kết nối Supabase
3. Thử refresh trang
4. Kiểm tra password admin

---

## 🎉 Hoàn tất!

Bây giờ bạn có thể:
- ✅ Xem tất cả đội
- ✅ Sửa tên đội dễ dàng
- ✅ Cập nhật toàn bộ hệ thống tự động
- ✅ Quản lý chuyên nghiệp hơn

**Link truy cập:**
```
https://your-site.vercel.app/teams.html
```
