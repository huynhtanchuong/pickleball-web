# 🚀 Hướng dẫn Deploy Web Pickleball

## Tại sao cần deploy?
- Web hiện chạy local (trên máy bạn) → tắt laptop = web tắt
- Deploy lên cloud → web chạy 24/7, ai cũng truy cập được

## ✅ Cách 1: Deploy lên Vercel (MIỄN PHÍ - Khuyến nghị)

### Bước 1: Cài Vercel CLI
```bash
npm install -g vercel
```

### Bước 2: Login
```bash
vercel login
```

### Bước 3: Deploy
```bash
vercel
```
- Nhấn Enter để chấp nhận các câu hỏi mặc định
- Vercel sẽ tự động deploy và cho bạn URL

### Bước 4: Deploy Production
```bash
vercel --prod
```

### Kết quả:
- URL production: `https://pickleball-tournament.vercel.app`
- Mỗi lần update code, chỉ cần chạy `vercel --prod`
- Web chạy 24/7, không cần laptop bật

---

## ✅ Cách 2: Deploy qua Vercel Dashboard (Không cần CLI)

### Bước 1: Push code lên GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/pickleball-tournament.git
git push -u origin main
```

### Bước 2: Import vào Vercel
1. Vào https://vercel.com/new
2. Click "Import Git Repository"
3. Chọn repo `pickleball-tournament`
4. Click "Deploy"

### Bước 3: Cập nhật code
- Mỗi lần push code lên GitHub → Vercel tự động deploy lại
```bash
git add .
git commit -m "Update tournament name"
git push
```

---

## ✅ Cách 3: Deploy lên Netlify (MIỄN PHÍ)

### Bước 1: Cài Netlify CLI
```bash
npm install -g netlify-cli
```

### Bước 2: Login
```bash
netlify login
```

### Bước 3: Deploy
```bash
netlify deploy
```
- Chọn "Create & configure a new site"
- Publish directory: `.` (thư mục hiện tại)

### Bước 4: Deploy Production
```bash
netlify deploy --prod
```

---

## ✅ Cách 4: Deploy lên GitHub Pages (MIỄN PHÍ)

### Bước 1: Push code lên GitHub (như Cách 2)

### Bước 2: Enable GitHub Pages
1. Vào Settings của repo
2. Chọn "Pages" ở sidebar
3. Source: chọn "main" branch
4. Click "Save"

### Kết quả:
- URL: `https://YOUR_USERNAME.github.io/pickleball-tournament`

---

## 🔧 Sau khi deploy

### Cập nhật URL trong code (nếu cần)
Nếu bạn có hardcode URL trong code, cần update:
- Không cần thay đổi gì vì Supabase URL đã đúng
- Admin password vẫn là `admin123`

### Chia sẻ link
- User view: `https://your-domain.vercel.app/`
- Admin view: `https://your-domain.vercel.app/admin.html`

### Custom domain (tùy chọn)
- Vercel/Netlify cho phép dùng domain riêng miễn phí
- VD: `pickleball.tolopikaboo.com`

---

## 📱 Lưu ý

### Database đã sẵn sàng
- Supabase đã được config: `https://negwxhrkdypiopmmrxkf.supabase.co`
- Realtime đã bật
- Không cần thay đổi gì

### Bảo mật
- Đổi password admin trong `admin.js`:
  ```javascript
  const ADMIN_PASSWORD = "your-secure-password";
  ```

### Performance
- Vercel/Netlify có CDN toàn cầu → web load nhanh
- Supabase có free tier 500MB database
- Đủ cho giải đấu nhỏ/vừa

---

## ❓ Câu hỏi thường gặp

**Q: Deploy xong có mất phí không?**
A: KHÔNG. Vercel/Netlify/GitHub Pages đều miễn phí cho static sites.

**Q: Có giới hạn traffic không?**
A: Vercel free: 100GB bandwidth/tháng (đủ cho hàng nghìn người xem)

**Q: Cập nhật code như thế nào?**
A: 
- Vercel CLI: `vercel --prod`
- GitHub: `git push` (tự động deploy)

**Q: Có thể dùng domain riêng không?**
A: Có, miễn phí. VD: `pickleball.yourdomain.com`

**Q: Database có bị mất không?**
A: KHÔNG. Database ở Supabase (cloud), không liên quan đến deploy.

---

## 🎯 Khuyến nghị

**Dùng Vercel** vì:
- ✅ Deploy nhanh nhất (1 lệnh)
- ✅ Tự động HTTPS
- ✅ CDN toàn cầu
- ✅ Preview URL cho mỗi commit
- ✅ Dễ rollback nếu có lỗi

**Lệnh deploy:**
```bash
npm install -g vercel
vercel login
vercel --prod
```

Xong! 🎉
