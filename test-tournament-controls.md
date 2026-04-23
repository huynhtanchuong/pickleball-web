# Tournament Control Panel UI - Manual Test Plan

## Test Objective
Verify that tournament control buttons are displayed correctly based on tournament status and admin authentication.

## Prerequisites
1. Admin panel is accessible at `admin.html`
2. At least one tournament exists in the system
3. Admin password is known (default: `admin123`)

## Test Cases

### Test Case 1: Admin User - Upcoming Tournament
**Steps:**
1. Login to admin panel with correct password
2. Select a tournament with status "upcoming"
3. Observe the tournament controls section

**Expected Results:**
- ✅ Tournament controls section is visible
- ✅ 4 buttons are displayed:
  - 👥 Thêm Thành viên (green background)
  - 🎲 Tạo Đội Ngẫu nhiên (blue background)
  - 📅 Tạo Trận Đấu (purple background)
  - ▶️ Bắt Đầu Giải Đấu (orange background)
- ✅ All buttons are clickable
- ✅ Clicking any button shows "Chức năng đang được phát triển" message

### Test Case 2: Admin User - Ongoing Tournament
**Steps:**
1. Login to admin panel with correct password
2. Select a tournament with status "ongoing"
3. Observe the tournament controls section

**Expected Results:**
- ✅ Tournament controls section is visible
- ✅ 1 button is displayed:
  - ↺ Reset Giải Đấu (red background)
- ✅ Button is clickable
- ✅ Clicking button shows "Chức năng đang được phát triển" message

### Test Case 3: Admin User - Completed Tournament
**Steps:**
1. Login to admin panel with correct password
2. Select a tournament with status "completed"
3. Observe the tournament controls section

**Expected Results:**
- ✅ Tournament controls section is visible
- ✅ 1 button is displayed:
  - ↺ Reset Giải Đấu (red background)
- ✅ Button is clickable
- ✅ Clicking button shows "Chức năng đang được phát triển" message

### Test Case 4: Admin User - Switch Between Tournaments
**Steps:**
1. Login to admin panel with correct password
2. Select a tournament with status "upcoming"
3. Note the buttons displayed
4. Switch to a tournament with status "ongoing"
5. Note the buttons displayed

**Expected Results:**
- ✅ Buttons update correctly when switching tournaments
- ✅ No JavaScript errors in console
- ✅ Status badge updates correctly

### Test Case 5: Public User (No Admin Access)
**Steps:**
1. Open admin panel WITHOUT logging in (or clear localStorage)
2. Observe the tournament controls section

**Expected Results:**
- ✅ Tournament controls section is NOT visible
- ✅ Tournament selector is still visible (read-only)
- ✅ No admin buttons are displayed

### Test Case 6: Responsive Design - Mobile View
**Steps:**
1. Login to admin panel with correct password
2. Resize browser to mobile width (< 480px)
3. Select a tournament with status "upcoming"
4. Observe button layout

**Expected Results:**
- ✅ Buttons stack vertically on mobile
- ✅ Buttons are full width
- ✅ Buttons are touch-friendly (min 44x44px)
- ✅ Icons and text are visible

### Test Case 7: Button Styling and Interactions
**Steps:**
1. Login to admin panel with correct password
2. Select a tournament with status "upcoming"
3. Hover over each button (desktop)
4. Click each button
5. Observe visual feedback

**Expected Results:**
- ✅ Buttons have correct colors:
  - Thêm Thành viên: green (#27ae60)
  - Tạo Đội Ngẫu nhiên: blue (#3498db)
  - Tạo Trận Đấu: purple (#9b59b6)
  - Bắt Đầu Giải Đấu: orange (#e67e22)
  - Reset Giải Đấu: red (#e74c3c)
- ✅ Buttons scale down slightly on click (transform: scale(0.97))
- ✅ Icons are properly aligned with text

## Test Results

| Test Case | Status | Notes |
|-----------|--------|-------|
| TC1: Admin - Upcoming | ⏳ Pending | |
| TC2: Admin - Ongoing | ⏳ Pending | |
| TC3: Admin - Completed | ⏳ Pending | |
| TC4: Switch Tournaments | ⏳ Pending | |
| TC5: Public User | ⏳ Pending | |
| TC6: Mobile View | ⏳ Pending | |
| TC7: Button Styling | ⏳ Pending | |

## Notes
- All placeholder functions currently show "Chức năng đang được phát triển" message
- Actual functionality will be implemented in Tasks 2-6
- Test should be re-run after each task is completed

## Browser Compatibility
Test on:
- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)
