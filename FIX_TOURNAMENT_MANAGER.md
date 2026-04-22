# 🔧 Fix: Cannot read properties of undefined (reading 'createTournament')

## 🐛 Nguyên nhân

Lỗi này xảy ra khi:
1. `tournamentManager` chưa được khởi tạo
2. `storage` là `undefined` hoặc `null`
3. Thứ tự load JavaScript files không đúng

## ✅ Giải pháp đã áp dụng

### 1. Sửa admin.js - Đảm bảo dùng window.storage
```javascript
// Trước (SAI):
window.tournamentManager = new TournamentManager(storage);

// Sau (ĐÚNG):
window.tournamentManager = new TournamentManager(window.storage);
```

### 2. Kiểm tra thứ tự load trong HTML files

**admin.html** - Thứ tự đúng:
```html
<script src="storage.js"></script>          <!-- 1. Load StorageAdapter -->
<script src="members.js"></script>          <!-- 2. Load MemberManager -->
<script src="pairing.js"></script>          <!-- 3. Load PairingAlgorithm -->
<script src="tournaments.js"></script>      <!-- 4. Load TournamentManager -->
<script src="i18n.js"></script>             <!-- 5. Load i18n -->
<script src="app.js"></script>              <!-- 6. Load app logic -->
<script src="admin.js"></script>            <!-- 7. Load admin logic -->
```

**tournaments.html** - Thứ tự đúng:
```html
<script src="storage.js"></script>
<script src="members.js"></script>
<script src="pairing.js"></script>
<script src="tournaments.js"></script>
<script src="i18n.js"></script>
```

## 🧪 Cách test

### Test 1: Kiểm tra trong Browser Console
```javascript
// Mở admin.html, bấm F12, gõ:
console.log(window.storage);           // Phải có object
console.log(window.tournamentManager); // Phải có object
console.log(typeof window.tournamentManager.createTournament); // Phải là "function"
```

### Test 2: Thử tạo tournament
1. Mở `tournaments.html`
2. Click "Tạo giải đấu mới"
3. Điền thông tin
4. Click "Tiếp tục"
5. Không được báo lỗi

## 🔍 Debug nếu vẫn lỗi

### Bước 1: Kiểm tra console
```javascript
// Trong browser console (F12):
console.log('storage:', window.storage);
console.log('tournamentManager:', window.tournamentManager);
console.log('TournamentManager class:', typeof TournamentManager);
console.log('StorageAdapter class:', typeof StorageAdapter);
```

### Bước 2: Kiểm tra file có load không
```javascript
// Kiểm tra các class đã được define:
console.log('Classes loaded:', {
  StorageAdapter: typeof StorageAdapter !== 'undefined',
  TournamentManager: typeof TournamentManager !== 'undefined',
  MemberManager: typeof MemberManager !== 'undefined',
  PairingAlgorithm: typeof PairingAlgorithm !== 'undefined'
});
```

### Bước 3: Kiểm tra khởi tạo
```javascript
// Thử khởi tạo thủ công:
try {
  const testStorage = new StorageAdapter(null);
  console.log('Storage OK:', testStorage);
  
  const testTournamentManager = new TournamentManager(testStorage);
  console.log('TournamentManager OK:', testTournamentManager);
  
  console.log('createTournament method:', typeof testTournamentManager.createTournament);
} catch (error) {
  console.error('Init error:', error);
}
```

## 🚨 Lỗi thường gặp khác

### Lỗi: "storage is not defined"
**Nguyên nhân:** `storage.js` chưa load hoặc load sau `tournaments.js`

**Giải pháp:** Kiểm tra thứ tự `<script>` tags trong HTML

### Lỗi: "TournamentManager is not a constructor"
**Nguyên nhân:** `tournaments.js` chưa load hoặc có lỗi syntax

**Giải pháp:** 
1. Kiểm tra browser console có lỗi JavaScript không
2. Kiểm tra file `tournaments.js` có tồn tại không
3. Kiểm tra syntax trong `tournaments.js`

### Lỗi: "Cannot read properties of null"
**Nguyên nhân:** `storage` được khởi tạo với `db = null` (Supabase chưa connect)

**Giải pháp:** Đây là OK! StorageAdapter tự động chuyển sang localStorage mode

## 📝 Checklist

- [x] Sửa `admin.js` dùng `window.storage`
- [x] Kiểm tra thứ tự load scripts trong HTML
- [ ] Test tạo tournament trong `tournaments.html`
- [ ] Test trong browser console
- [ ] Commit và push code

## 🎯 Commit changes

```bash
git add admin.js
git commit -m "fix: Ensure tournamentManager uses window.storage reference

- Fix undefined storage reference in admin.js
- Use window.storage instead of bare storage variable
- Prevents 'Cannot read properties of undefined' error"
git push origin master
```

## ✅ Kết quả mong đợi

Sau khi fix:
- Không còn lỗi "Cannot read properties of undefined"
- Có thể tạo tournament mới
- Có thể quản lý tournaments
- Console không có lỗi JavaScript
