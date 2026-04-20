# 🧪 Test Tournament Creation - Hướng Dẫn Kiểm Tra

## ✅ Database Setup Complete

Database đã được setup đầy đủ với các bảng:
- ✅ `members` - 0 records
- ✅ `tournaments` - 0 records  
- ✅ `tournament_participants` - 0 records
- ✅ `teams` - 0 records
- ✅ `matches` - 23 records (existing data)

**RLS Status**: ✅ Đã tắt RLS cho tất cả các bảng

---

## 📝 Hướng Dẫn Test Từng Bước

### **Bước 1: Thêm Thành Viên** (members.html)

1. Mở `members.html` trong browser
2. Click nút **"Thêm Thành Viên"**
3. Nhập thông tin:
   - **Tên**: Nguyễn Văn A
   - **Tier**: 1
   - **Email**: a@example.com (optional)
   - **Phone**: 0123456789 (optional)
4. Click **"Lưu"**
5. Lặp lại để thêm ít nhất 4 thành viên với các tier khác nhau:
   - 2 thành viên Tier 1
   - 2 thành viên Tier 2
   - 2 thành viên Tier 3

**Kết quả mong đợi**: Thấy danh sách thành viên hiển thị với tier badge màu sắc

---

### **Bước 2: Tạo Giải Đấu** (tournaments.html)

1. Mở `tournaments.html` trong browser
2. Click nút **"Tạo Giải Đấu"**
3. **Step 1 - Thông Tin Cơ Bản**:
   - **Tên giải đấu**: Giải Test 2026
   - **Ngày bắt đầu**: Chọn ngày hôm nay
   - **Số bảng**: 2
   - **Số đội mỗi bảng**: 3
   - Click **"Tiếp theo"**

4. **Step 2 - Chọn Thành Viên**:
   - Tick chọn ít nhất 6 thành viên (để tạo 3 đội)
   - (Optional) Đánh dấu 1-2 người là "Seeded" (⭐)
   - (Optional) Override tier nếu cần
   - Click **"Tiếp theo"**

5. **Step 3 - Ghép Đội**:
   - Click **"Ghép Cặp Tự Động"**
   - Xem kết quả ghép đội theo bảng A, B
   - (Optional) Click **"Ghép Lại"** nếu muốn random lại
   - Click **"Tiếp theo"**

6. **Step 4 - Lịch Thi Đấu**:
   - Click **"Tạo Lịch Tự Động"**
   - Xem danh sách trận đấu theo bảng
   - (Optional) Tick "Trận tranh giải ba" và "Trận khuyến khích"
   - Click **"Hoàn Thành"**

**Kết quả mong đợi**: 
- Thấy thông báo "Tạo giải đấu thành công!"
- Giải đấu mới xuất hiện trong danh sách

---

### **Bước 3: Kiểm Tra Giải Đấu** (admin.html)

1. Mở `admin.html` trong browser
2. Đăng nhập với mật khẩu (nếu có)
3. Chọn giải đấu vừa tạo từ dropdown **"🏆 Giải đấu"**
4. Kiểm tra:
   - ✅ Danh sách trận đấu vòng bảng hiển thị đúng
   - ✅ Có thể cập nhật điểm số
   - ✅ Bảng xếp hạng tính toán đúng

---

## 🐛 Troubleshooting - Nếu Gặp Lỗi

### **Lỗi 1: "Cannot read property 'createClient' of undefined"**
**Nguyên nhân**: Chưa load Supabase JS library
**Giải pháp**: Kiểm tra xem có dòng này trong HTML không:
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

### **Lỗi 2: "Failed to create tournament"**
**Nguyên nhân**: Có thể do validation hoặc database connection
**Giải pháp**: 
1. Mở Console (F12) để xem lỗi chi tiết
2. Kiểm tra Supabase credentials trong HTML
3. Kiểm tra network tab xem có request nào fail không

### **Lỗi 3: "Cần ít nhất 4 thành viên"**
**Nguyên nhân**: Chưa chọn đủ thành viên
**Giải pháp**: Quay lại Step 2 và chọn thêm thành viên

### **Lỗi 4: "Số thành viên Tier 2 phải là số chẵn"**
**Nguyên nhân**: Pairing algorithm yêu cầu T2 phải chẵn (vì T2+T2)
**Giải pháp**: 
- Thêm hoặc bỏ 1 thành viên Tier 2
- Hoặc override tier của 1 người sang T1 hoặc T3

### **Lỗi 5: Không thấy giải đấu trong dropdown**
**Nguyên nhân**: Giải đấu chưa được tạo hoặc chưa load
**Giải pháp**:
1. Reload trang (F5)
2. Kiểm tra trong tournaments.html xem có giải đấu không
3. Kiểm tra console có lỗi không

---

## 🔍 Debug Checklist

Nếu tạo giải đấu không được, hãy kiểm tra:

### **1. Browser Console (F12)**
```javascript
// Kiểm tra storage mode
console.log(storage.getMode()); // Should be 'supabase' or 'localStorage'

// Kiểm tra Supabase connection
console.log(supabaseClient); // Should not be null

// Test create member
await memberManager.createMember({
  name: 'Test User',
  tier: 1,
  email: 'test@example.com'
});
```

### **2. Network Tab (F12 > Network)**
- Kiểm tra có request POST đến Supabase không
- Xem response có lỗi gì không
- Status code nên là 200 hoặc 201

### **3. Supabase Dashboard**
- Vào https://negwxhrkdypiopmmrxkf.supabase.co
- Kiểm tra Table Editor
- Xem có data mới trong bảng `tournaments` không

### **4. Storage Mode**
Nếu Supabase không hoạt động, hệ thống sẽ tự động chuyển sang localStorage mode:
- Data sẽ lưu trong browser
- Không sync giữa các thiết bị
- Có thể bị mất khi clear browser data

---

## 📊 Expected Database State After Test

Sau khi test thành công, database nên có:

```sql
-- Members table
SELECT * FROM members;
-- Expected: 6+ members with different tiers

-- Tournaments table  
SELECT * FROM tournaments;
-- Expected: 1 tournament with status 'upcoming'

-- Tournament participants table
SELECT * FROM tournament_participants;
-- Expected: 6+ participants linked to tournament

-- Teams table
SELECT * FROM teams;
-- Expected: 3+ teams with group_name 'A' or 'B'

-- Matches table
SELECT * FROM matches WHERE tournament_id IS NOT NULL;
-- Expected: 6+ matches (round-robin for 3 teams per group)
```

---

## ✅ Success Criteria

Giải đấu được tạo thành công khi:
- ✅ Không có lỗi trong console
- ✅ Giải đấu xuất hiện trong danh sách (tournaments.html)
- ✅ Có thể chọn giải đấu trong admin.html
- ✅ Trận đấu hiển thị đúng trong admin panel
- ✅ Có thể cập nhật điểm số
- ✅ Bảng xếp hạng tính toán đúng

---

## 🎯 Quick Test Script

Nếu muốn test nhanh bằng console:

```javascript
// 1. Test storage connection
console.log('Storage mode:', storage.getMode());

// 2. Create test members
const members = [];
for (let i = 1; i <= 6; i++) {
  const member = await memberManager.createMember({
    name: `Test Player ${i}`,
    tier: (i % 3) + 1, // Tier 1, 2, 3
    email: `player${i}@test.com`
  });
  members.push(member);
  console.log('Created member:', member.name);
}

// 3. Create tournament
const tournament = await tournamentManager.createTournament({
  name: 'Test Tournament',
  start_date: new Date().toISOString().split('T')[0],
  numGroups: 2,
  teamsPerGroup: 3
});
console.log('Created tournament:', tournament.name);

// 4. Add participants
const participants = members.map(m => ({
  member_id: m.id,
  tier_override: null,
  is_seeded: false
}));
await tournamentManager.addParticipants(tournament.id, participants);
console.log('Added participants');

// 5. Generate teams
await tournamentManager.generateTeams(tournament.id);
console.log('Generated teams');

// 6. Generate schedule
await tournamentManager.generateSchedule(tournament.id);
console.log('Generated schedule');

console.log('✅ Tournament created successfully!');
```

---

## 📞 Support

Nếu vẫn gặp vấn đề:
1. Copy toàn bộ error message từ console
2. Chụp screenshot màn hình
3. Kiểm tra Network tab xem request nào fail
4. Gửi thông tin để được hỗ trợ

---

**Good luck with testing! 🚀**
