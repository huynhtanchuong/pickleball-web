# Testing Instructions - Member Names Display Fix

## Prerequisites

1. **Hard Refresh Required**: Press `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac) to clear browser cache
2. **Database Reset** (Optional but recommended): Run `reset-and-seed-db.sql` in Supabase SQL Editor to get clean test data

## Test Scenarios

### Scenario 1: Tournament Wizard - Create New Tournament

**Steps:**
1. Go to `tournaments.html`
2. Click "Tạo Giải Đấu Mới"
3. Fill in basic info (Step 1)
4. Click "Tiếp theo"

**Expected Results (Step 2 - Participant Selection):**
- ✅ All member names should display correctly
- ✅ Format: `[Name]` or `[Phone]` or `Thành viên [ID]` as fallback
- ✅ Tier badges show T1, T2, T3
- ✅ Selection summary updates correctly

**Steps (continued):**
5. Select at least 4 members (ensure mix of T1, T2, T3)
6. Click "Tiếp theo"
7. Click "Ghép Cặp Tự Động"

**Expected Results (Step 3 - Team Pairing):**
- ✅ Teams display with member names (not "null" or "undefined")
- ✅ Each team shows 2 member names
- ✅ Tier badges display correctly for each member
- ✅ Teams are distributed across groups A and B

**Steps (continued):**
8. Click "Tiếp theo"
9. Click "Tạo Lịch Tự Động"
10. Click "Tạo Giải Đấu"

**Expected Results (Step 4 - Schedule):**
- ✅ Matches display with team names
- ✅ Tournament created successfully
- ✅ No console errors

---

### Scenario 2: Admin Panel - Members Tab

**Steps:**
1. Go to `admin.html`
2. Select the tournament you just created
3. Click on "Vận động viên" tab

**Expected Results:**
- ✅ All members display with names (not "null")
- ✅ Members grouped by tier (T1, T2, T3)
- ✅ Each member shows: Name, Phone, Tier badge
- ✅ Seeded members show 🌟 icon

---

### Scenario 3: Admin Panel - Teams Tab

**Steps:**
1. Stay in `admin.html`
2. Click on "Đội" tab

**Expected Results:**
- ✅ All teams display with member names (not "null" or "N/A")
- ✅ Teams grouped by group (Bảng A, Bảng B)
- ✅ Each team shows:
  - Team name (auto-generated from member names)
  - 👤 Member 1 name
  - 👤 Member 2 name
  - Tier: T1/T2/T3
- ✅ Seeded teams show 🌟 icon

---

### Scenario 4: Generate Random Teams

**Steps:**
1. Go to `admin.html`
2. Select a tournament with status "Sắp diễn ra"
3. Click "Tạo Đội Ngẫu nhiên"
4. Confirm the dialog

**Expected Results:**
- ✅ Success message: "Đã tạo X đội thành công"
- ✅ Page reloads automatically
- ✅ Teams tab shows all teams with member names
- ✅ No console errors
- ✅ No database errors

---

### Scenario 5: Database Seed Script

**Steps:**
1. Open Supabase SQL Editor
2. Copy contents of `reset-and-seed-db.sql`
3. Run the script

**Expected Results:**
- ✅ Script executes without errors
- ✅ 20 members created with proper names
- ✅ 1 tournament created (status: ongoing)
- ✅ 20 participants added
- ✅ 10 teams created
- ✅ 20 matches created

**Verification:**
4. Go to `admin.html`
5. Select "Giải Pickleball Tháng 1/2027"
6. Check Members tab → All 20 members show names
7. Check Teams tab → All 10 teams show member names
8. Check Matches tab → All matches show team names

---

## Common Issues and Solutions

### Issue 1: Names still showing as "null" or "undefined"

**Solution:**
1. Hard refresh: `Ctrl + Shift + R`
2. Clear browser cache completely
3. Check browser console for errors
4. Verify `utils.js` is loaded (check Network tab)

### Issue 2: "Cannot read property 'replace' of undefined"

**Solution:**
- This was fixed in commit `5281d19`
- Ensure you have the latest code
- Run `git pull` to get latest changes

### Issue 3: Teams tab shows "N/A" for member names

**Solution:**
- This was fixed in commit `c527797`
- Ensure `loadTeamsTab()` uses `getTeamsWithMembers()`
- Hard refresh after pulling latest code

### Issue 4: Database errors when creating teams

**Solution:**
- This was fixed in commit `683af21`
- Removed `member1_name` and `member2_name` from team inserts
- These columns don't exist in database schema

---

## Browser Console Checks

### Expected Console Output (No Errors)

When creating teams, you should see:
```
Pairing: T1=6, T2=8, T3=6
Generated 10 teams (T1+T3: 6, T2+T2: 4)
Distributing: 0 seeded, 10 non-seeded
Group A: 5 teams (0 seeded)
Group B: 5 teams (0 seeded)
```

### Red Flags (Should NOT See)

❌ `Cannot read property 'replace' of undefined`
❌ `member1_name is not a column`
❌ `member2_name is not a column`
❌ `TypeError: tier.replace is not a function`
❌ `Uncaught ReferenceError: getMemberDisplayName is not defined`

---

## Files to Verify

### Check these files are loaded in browser:

1. **utils.js** - Helper functions
   - Open DevTools → Network tab
   - Look for `utils.js` (should be 200 OK)

2. **admin.html** - Should include:
   ```html
   <script src="utils.js"></script>
   ```

3. **tournaments.html** - Should include:
   ```html
   <script src="utils.js"></script>
   ```

---

## Success Criteria

✅ **All tests pass** without errors
✅ **Member names display** in all locations
✅ **No "null" or "undefined"** in UI
✅ **No console errors** during team generation
✅ **Database operations succeed** without errors
✅ **Tier format handled** correctly (both string and number)

---

## Rollback Plan (If Issues Persist)

If you encounter critical issues:

1. **Revert to previous commit:**
   ```bash
   git log --oneline  # Find last working commit
   git reset --hard <commit-hash>
   ```

2. **Report the issue:**
   - Copy browser console errors
   - Copy network tab errors
   - Describe exact steps to reproduce
   - Include screenshot if possible

---

## Contact

If you encounter issues not covered here:
1. Check `MEMBER_NAMES_FIX_SUMMARY.md` for technical details
2. Review commit history for recent changes
3. Check browser console for specific error messages
