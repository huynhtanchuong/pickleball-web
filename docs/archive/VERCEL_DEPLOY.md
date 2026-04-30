# 🚀 Deploy Pickleball Tournament lên Vercel

## ✅ Tại sao dùng Vercel?

- **Miễn phí** cho personal projects
- **Tự động deploy** khi push code lên GitHub
- **CDN toàn cầu** - Tốc độ nhanh
- **HTTPS miễn phí** - Bảo mật
- **Custom domain** - Có thể dùng tên miền riêng

---

## 📋 Yêu cầu trước khi deploy:

1. ✅ Code đã push lên GitHub
2. ✅ Supabase đã setup (URL và API key trong `app.js`)
3. ✅ Database migration đã chạy

---

## 🎯 Cách 1: Deploy qua Vercel Dashboard (Khuyến nghị)

### Bước 1: Đăng nhập Vercel
1. Truy cập: https://vercel.com
2. Click "Sign Up" hoặc "Log In"
3. Chọn "Continue with GitHub"
4. Authorize Vercel truy cập GitHub

### Bước 2: Import Project
1. Click "Add New..." → "Project"
2. Tìm repository: `huynhtanchuong/pickleball-web`
3. Click "Import"

### Bước 3: Configure Project
```
Project Name: pickleball-tournament (hoặc tên bạn muốn)
Framework Preset: Other
Root Directory: ./
Build Command: (để trống)
Output Directory: (để trống)
Install Command: (để trống)
```

### Bước 4: Deploy
1. Click "Deploy"
2. Đợi 1-2 phút
3. Xong! Vercel sẽ cho bạn URL: `https://pickleball-tournament.vercel.app`

---

## 🎯 Cách 2: Deploy qua Vercel CLI

### Bước 1: Cài đặt Vercel CLI
```bash
npm install -g vercel
```

### Bước 2: Login
```bash
vercel login
```

### Bước 3: Deploy
```bash
# Từ thư mục project
vercel

# Hoặc deploy production
vercel --prod
```

### Bước 4: Trả lời các câu hỏi
```
? Set up and deploy "E:\pick-web"? [Y/n] y
? Which scope do you want to deploy to? (chọn account của bạn)
? Link to existing project? [y/N] n
? What's your project's name? pickleball-tournament
? In which directory is your code located? ./
```

---

## 🔧 Sau khi Deploy

### 1. Kiểm tra website
- Mở URL Vercel cung cấp (vd: `https://pickleball-tournament.vercel.app`)
- Test các trang:
  - `index.html` - Trang chủ
  - `admin.html` - Trang admin
  - `referee.html?matchId=xxx` - Trang trọng tài
  - `viewer.html?matchId=xxx` - Trang xem live

### 2. Verify Supabase connection
- Mở browser console (F12)
- Kiểm tra có lỗi kết nối không
- Test tạo/sửa trận đấu

### 3. Test real-time sync
- Mở 2 tabs:
  - Tab 1: `referee.html?matchId=xxx`
  - Tab 2: `viewer.html?matchId=xxx`
- Nhập điểm ở tab 1
- Xem có update ở tab 2 không

---

## 🌐 Custom Domain (Tùy chọn)

### Nếu bạn có domain riêng:

1. Vào Vercel Dashboard
2. Chọn project → Settings → Domains
3. Add domain của bạn (vd: `pickleball.yourdomain.com`)
4. Cập nhật DNS records theo hướng dẫn Vercel
5. Đợi DNS propagate (5-30 phút)

---

## 🔄 Auto Deploy

Vercel tự động deploy khi bạn push code:

```bash
# Mỗi khi bạn push code mới
git add .
git commit -m "Update feature"
git push origin master

# Vercel tự động deploy trong 1-2 phút
```

---

## 📊 Monitoring

### Xem deployment logs:
1. Vào Vercel Dashboard
2. Chọn project
3. Tab "Deployments"
4. Click vào deployment để xem logs

### Xem analytics:
1. Tab "Analytics" - Xem traffic
2. Tab "Speed Insights" - Xem performance

---

## ⚠️ Lưu ý quan trọng

### 1. Environment Variables (Nếu cần)
Nếu bạn muốn ẩn Supabase credentials:

1. Vào Settings → Environment Variables
2. Add:
   ```
   SUPABASE_URL=https://negwxhrkdypiopmmrxkf.supabase.co
   SUPABASE_ANON_KEY=eyJhbGci...
   ```
3. Update `app.js` để đọc từ env vars

### 2. CORS Settings
Supabase cần allow domain Vercel:

1. Vào Supabase Dashboard
2. Settings → API
3. Add Vercel URL vào allowed origins

### 3. Admin Password
Đổi password trong `admin.js`:
```javascript
const ADMIN_PASSWORD = "your-secure-password-here";
```

---

## 🐛 Troubleshooting

### Lỗi: "Cannot connect to Supabase"
- Kiểm tra SUPABASE_URL và SUPABASE_ANON_KEY trong `app.js`
- Kiểm tra CORS settings trong Supabase

### Lỗi: "Real-time not working"
- Kiểm tra Supabase Realtime có enable không
- Kiểm tra browser console có lỗi WebSocket không

### Lỗi: "404 Not Found"
- Kiểm tra file paths (phải relative, không absolute)
- Kiểm tra `vercel.json` routing config

### Website chậm
- Enable caching trong `vercel.json` (đã config sẵn)
- Optimize images (compress PNG/JPG)
- Minify JS/CSS nếu cần

---

## 📱 Test trên Mobile

1. Mở URL Vercel trên điện thoại
2. Test referee interface:
   - Buttons có đủ lớn không (44x44px)
   - Touch có responsive không
   - Scroll có mượt không

---

## 🎉 Hoàn tất!

Website của bạn đã live trên Vercel! 🚀

**URL:** `https://your-project.vercel.app`

Mỗi khi push code mới lên GitHub, Vercel tự động deploy trong 1-2 phút.

---

## 📞 Support

Nếu gặp vấn đề:
1. Check Vercel deployment logs
2. Check browser console (F12)
3. Check Supabase logs
4. Liên hệ Vercel support: https://vercel.com/support
