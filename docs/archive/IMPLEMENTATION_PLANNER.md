# 🎯 IMPLEMENTATION PLANNER
## Pickleball Tournament System Upgrade

---

## 📊 PROGRESS TRACKER

| # | Task | Priority | Status | Files | Est. Time |
|---|------|----------|--------|-------|-----------|
| 1 | Fix standings sorting | 🔴 CRITICAL | ✅ DONE | app.js, styles.css | 15min |
| 2 | Fix time sorting | 🔴 CRITICAL | ✅ DONE | app.js, admin.js | 10min |
| 3 | Remove connection status (user) | 🟡 IMPORTANT | ✅ DONE | app.js, index.html | 5min |
| 4 | Rename modes | 🟡 IMPORTANT | ✅ DONE | i18n.js, admin.html | 5min |
| 5 | Support 3-set matches (group) | 🔴 CRITICAL | ✅ DONE | app.js, admin.js, styles.css | 30min |
| 6 | Fix semi/final set display | 🟡 IMPORTANT | ✅ DONE | app.js, admin.js | 10min |
| 7 | Auto-collapse groups (admin) | 🟡 IMPORTANT | ✅ DONE | admin.js, admin-mobile.css | 10min |
| 8 | Icon placeholders | 🟢 NICE | ✅ DONE | styles.css, admin-mobile.css | 5min |
| 9 | Default bracket placeholders | 🟢 NICE | ✅ DONE | app.js, admin.js, i18n.js, styles.css | 15min |
| 10 | Auto-update bracket teams | 🟢 NICE | ✅ DONE | admin.js | 10min |
| 11 | Disable invalid matches | 🟢 NICE | ✅ DONE | admin.js, styles.css | 10min |

**Total Estimated Time:** ~2 hours

---

## 🔴 TASK 1: Fix Standings Sorting ✅ DONE

### Status: ✅ COMPLETED

### Changes Made:
- ✅ Updated `calculateStandings()` with correct sort order:
  1. Wins (DESC)
  2. Point Difference (DESC)
  3. Head-to-head wins
  4. Head-to-head point diff
- ✅ Added tie-break tracking
- ✅ Updated `renderStandings()` to show tie-break explanation
- ✅ Added CSS for `.tie-break-info`

### Files Modified:
- `app.js` - calculateStandings(), renderStandings()
- `styles.css` - Added .tie-break-info styling

### Test:
- [ ] Create 2 teams with same wins
- [ ] Check if sorted by point diff
- [ ] Check if tie-break explanation shows

---

## 🔴 TASK 2: Fix Time Sorting

### Status: ⏳ TODO

### Problem:
Current string sort: "10h00" < "9h00" (wrong!)

### Solution:
```javascript
function parseMatchTime(timeStr) {
  if (!timeStr) return 9999; // No time = sort last
  
  // Support formats: "7h00", "07:00", "7:00 AM"
  const match = timeStr.match(/(\d{1,2})[h:](\d{2})/);
  if (!match) return 9999;
  
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  
  // Handle AM/PM
  if (timeStr.toLowerCase().includes('pm') && hours < 12) {
    hours += 12;
  }
  
  return hours * 60 + minutes; // Return minutes since midnight
}
```

### Changes Needed:
1. Add `parseMatchTime()` function to `app.js`
2. Update sort in `renderPublicStage()` - app.js line ~320
3. Update sort in `renderStageList()` - admin.js line ~120

### Files to Modify:
- `app.js` - Add parseMatchTime(), update sorting
- `admin.js` - Update sorting

### Test Cases:
- [ ] "7h00" before "8h00" ✓
- [ ] "9h00" before "10h00" ✓
- [ ] "10h00" before "11h00" ✓
- [ ] "7:00 AM" before "2:00 PM" ✓
- [ ] Matches without time at the end ✓

---

## 🟡 TASK 3: Remove Connection Status (User View)

### Status: ⏳ TODO

### Problem:
User sees "Connected", "Disconnected", "Polling" - too technical!

### Solution:
Only show status in admin view, hide in user view.

### Changes Needed:
1. Add CSS class to hide status in user view
2. Or remove status bar from `index.html` entirely
3. Keep status bar in `admin.html`

### Files to Modify:
- `index.html` - Remove or hide status bar
- `app.js` - Check if on admin page before showing status

### Implementation:
```javascript
// In setStatus() function
function setStatus(msg, type = "") {
  const el = document.getElementById("status-bar");
  if (!el) return;
  
  // Only show status on admin pages
  const isAdminPage = window.location.pathname.includes("admin") || 
                      window.location.pathname.includes("teams");
  if (!isAdminPage) return; // Don't show status on user view
  
  el.textContent = msg;
  el.className = type;
  // ... rest of code
}
```

### Test:
- [ ] User view: No status bar visible
- [ ] Admin view: Status bar works
- [ ] Teams view: Status bar works

---

## 🟡 TASK 4: Rename Modes

### Status: ⏳ TODO

### Changes:
- "Admin" → "Trọng tài mode" (VI) / "Referee mode" (EN)
- "Viewer" → "Người xem mode" (VI) / "Viewer mode" (EN)

### Files to Modify:
- `i18n.js` - Update translations
- `admin.html` - Update labels if hardcoded

### Implementation:
```javascript
// In i18n.js
vi: {
  adminMode: "Trọng tài mode",
  viewerMode: "Người xem mode",
  adminPanel: "Bảng Điều Khiển Trọng Tài",
  // ...
}

en: {
  adminMode: "Referee mode",
  viewerMode: "Viewer mode",
  adminPanel: "Referee Control Panel",
  // ...
}
```

### Test:
- [ ] Admin page shows "Trọng tài mode"
- [ ] Public page shows "Người xem mode" (if displayed)
- [ ] Language switch works

---

## 🔴 TASK 5: Support 3-Set Matches (Group Stage)

### Status: ⏳ TODO

### Problem:
Group stage only has single score, not set-based.

### Solution:
Extend set scoring to ALL matches (currently only semi/final).

### Database:
Already has: `s1a, s1b, s2a, s2b, s3a, s3b`
Action: Use these fields for group stage too!

### Changes Needed:

#### 1. Update `publicMatchHTML()` in app.js
```javascript
// Show set scores for ALL matches (not just semi/final)
function publicMatchHTML(m, stage) {
  // ... existing code ...
  
  // Show sets for ALL matches
  let setsHtml = "";
  const sets = [
    { a: m.s1a || 0, b: m.s1b || 0, label: "S1" },
    { a: m.s2a || 0, b: m.s2b || 0, label: "S2" },
    { a: m.s3a || 0, b: m.s3b || 0, label: "S3" },
  ];
  
  // Show sets that have scores
  const activeSets = sets.filter(s => s.a > 0 || s.b > 0);
  if (activeSets.length > 0) {
    setsHtml = `<div class="mc-sets">` +
      activeSets.map(s => {
        const wA = s.a > s.b, wB = s.b > s.a;
        return `<div class="mc-set-item">
          <span class="mc-set-label">${s.label}</span>
          <span class="mc-set-score ${wA?"winner":""}">${s.a}</span>
          <span class="mc-set-sep">-</span>
          <span class="mc-set-score ${wB?"winner":""}">${s.b}</span>
        </div>`;
      }).join("") + `</div>`;
  }
  
  // ... rest of code ...
}
```

#### 2. Update `matchHTML()` in admin.js
```javascript
// Add set input for ALL matches (not just semi/final)
function matchHTML(m, stage) {
  // ... existing code ...
  
  // Always show set inputs (for all stages)
  const { winsA, winsB } = computeSetWins(m);
  const showSet3 = winsA >= 1 && winsB >= 1;
  
  scoreSection = `
    <div class="adm-set-wins" data-id="${m.id}">Sets: ${winsA} — ${winsB}</div>
    ${setRowHTML(m, 1, dis)}
    ${setRowHTML(m, 2, dis)}
    ${showSet3 || m.s3a || m.s3b ? setRowHTML(m, 3, dis) : 
      `<div id="set3-${m.id}">
        <button class="adm-add-set-btn" onclick="showSet3('${m.id}')" ${dis}>+ Set 3</button>
      </div>`}`;
  
  // ... rest of code ...
}
```

#### 3. Update `needsSets()` function
```javascript
// Remove stage check - ALL matches use sets now
function needsSets(m) {
  return true; // All matches use sets
}
```

#### 4. Update `computeSetWins()` to handle group stage
Already works! Just need to call it for all matches.

### Files to Modify:
- `app.js` - publicMatchHTML(), needsSets()
- `admin.js` - matchHTML(), remove stage check

### Test Cases:
- [ ] Group match: Can input 3 sets
- [ ] Group match: Shows set scores in user view
- [ ] Semi match: Still works
- [ ] Final match: Still works
- [ ] Featured match: Shows sets
- [ ] Bracket: Shows set-based scores

---

## 🟡 TASK 6: Fix Semi/Final Set Display

### Status: ⏳ TODO

### Problem:
Ensure set scores display correctly everywhere.

### Check Points:
- [ ] Match list (user view)
- [ ] Match list (admin view)
- [ ] Featured match
- [ ] Bracket visual
- [ ] Standings (if using set scores)

### Files to Check:
- `app.js` - All render functions
- `admin.js` - All render functions

### Action:
After Task 5 is done, verify all displays work correctly.

---

## 🟡 TASK 7: Auto-Collapse Groups (Admin View)

### Status: ⏳ TODO

### Requirement:
When all group matches are DONE, auto-collapse Group A & B sections.

### Implementation:
```javascript
// In renderStageList() - admin.js
function renderStageList(containerId, matches, stage) {
  // ... existing code ...
  
  if (stage === "group") {
    // ... existing group rendering ...
    
    // After rendering, check if all done
    const allDone = matches.every(m => m.status === "done");
    if (allDone) {
      // Auto-collapse all groups
      setTimeout(() => {
        Object.keys(groups).forEach(g => {
          const body = document.getElementById(`grp-${g}`);
          const icon = document.getElementById(`icon-grp-${g}`);
          if (body) body.style.display = "none";
          if (icon) icon.textContent = "▶";
          _collapsedGroups.add(g);
        });
      }, 100);
    }
  }
}
```

### Files to Modify:
- `admin.js` - renderStageList()

### Test:
- [ ] When last group match finishes → Groups collapse
- [ ] Can still expand manually
- [ ] State persists across re-renders

---

## 🟢 TASK 8: Icon Placeholders

### Status: ⏳ TODO

### Requirement:
Prepare CSS classes for easy icon replacement later.

### Implementation:
```css
/* Icon placeholders - easy to replace with icon fonts later */
.icon-edit::before { content: "✏️"; }
.icon-done::before { content: "✓"; }
.icon-live::before { content: "●"; }
.icon-save::before { content: "💾"; }
.icon-finish::before { content: "🏁"; }
.icon-reset::before { content: "↺"; }

/* When using icon font, just change content */
/* .icon-edit::before { content: "\f044"; font-family: "FontAwesome"; } */
```

### Files to Modify:
- `styles.css` - Add icon classes
- `admin-mobile.css` - Add icon classes

### Usage:
```html
<!-- Current -->
<button>✏️ Sửa tên</button>

<!-- With icon class -->
<button><span class="icon-edit"></span> Sửa tên</button>
```

### Test:
- [ ] Icons display correctly
- [ ] Easy to replace with icon font

---

## 🟢 TASK 9: Default Bracket Placeholders

### Status: ✅ COMPLETED

### Changes Made:
- ✅ Updated `renderPublicBracket()` in app.js to show placeholders before matches generated
- ✅ Updated `renderBracketVisual()` in admin.js with same placeholder logic
- ✅ Added `isTeamPlaceholder()` helper function in app.js
- ✅ Added translations for placeholders in i18n.js (VI + EN)
- ✅ Added `.bracket-placeholder` CSS styling in styles.css

### Files Modified:
- `app.js` - renderPublicBracket(), isTeamPlaceholder()
- `admin.js` - renderBracketVisual()
- `i18n.js` - Added bracketPlaceholder* translations
- `styles.css` - Added .bracket-placeholder styling

### Implementation:
- Semifinals show: "Nhất Bảng A vs Nhì Bảng B" and "Nhất Bảng B vs Nhì Bảng A"
- Final shows: "Thắng BK1 vs Thắng BK2"
- Placeholders have dashed border and reduced opacity
- Bracket structure always visible (even before generation)

---

## 🟢 TASK 10: Auto-Update Bracket Teams

### Status: ✅ COMPLETED

### Changes Made:
- ✅ Bracket teams auto-update when group stage finishes (via autoGenerateBracket)
- ✅ Existing logic already handles team updates correctly
- ✅ Placeholders replaced with real team names when standings finalize

### Files Modified:
- No changes needed - existing `autoGenerateBracket()` already handles this

### How It Works:
- When all group matches finish → `autoGenerateBracket()` creates semis with real teams
- If group matches reset → semis/final deleted and regenerated with correct teams
- Teams pulled from `getTopTeamsByGroup()` which uses current standings

---

## 🟢 TASK 11: Disable Invalid Matches

### Status: ✅ COMPLETED

### Changes Made:
- ✅ Added `isMatchReady()` helper function in admin.js
- ✅ Updated `matchHTML()` to check if match has valid teams
- ✅ Disabled score inputs for matches with placeholder teams
- ✅ Show "⏳ Chờ kết quả vòng trước" message for invalid matches
- ✅ Disabled match info inputs (time/court/referee) for invalid matches
- ✅ Added `.match-waiting-msg` CSS styling

### Files Modified:
- `admin.js` - Added isMatchReady(), updated matchHTML()
- `i18n.js` - Added matchWaiting translation
- `styles.css` - Added .match-waiting-msg styling

### Implementation:
- Checks if team names contain placeholders (Winner, Thắng, Nhất, Nhì, TBD, etc.)
- Disables all inputs and buttons for invalid matches
- Shows waiting message instead of score inputs
- Prevents accidental score entry before teams are determined

---

## 📋 EXECUTION ORDER

### Phase 1: Critical Fixes (30 min)
1. ✅ Fix standings sorting - DONE
2. ⏳ Fix time sorting - 10min
3. ⏳ Remove connection status - 5min

### Phase 2: Important Features (50 min)
4. ⏳ Rename modes - 5min
5. ⏳ Support 3-set matches - 30min
6. ⏳ Fix semi/final display - 10min
7. ⏳ Auto-collapse groups - 10min

### Phase 3: Polish (30 min)
8. ⏳ Icon placeholders - 5min
9. ⏳ Default bracket - 15min
10. ⏳ Auto-update bracket - 10min
11. ⏳ Disable invalid matches - 10min

---

## 🧪 FINAL TESTING CHECKLIST

### Standings
- [ ] Sort by wins correctly
- [ ] Apply point diff when tied
- [ ] Apply head-to-head when tied
- [ ] Show tie-break explanation

### 3-Set Matches
- [ ] Input 3 sets for all matches
- [ ] Display 3 sets in user view
- [ ] Calculate winner correctly (2/3 sets)
- [ ] Featured match shows sets

### Time Sorting
- [ ] 7h00 before 8h00
- [ ] 9h00 before 10h00
- [ ] Matches without time at end

### UI/UX
- [ ] No connection status in user view
- [ ] Correct mode labels
- [ ] Groups auto-collapse when done
- [ ] Icons ready for replacement

### Bracket
- [ ] Show placeholders before generation
- [ ] Auto-update with real teams
- [ ] Disable invalid matches
- [ ] Display correctly everywhere

---

## 🚀 DEPLOYMENT CHECKLIST

- [ ] All tasks completed
- [ ] Local testing passed
- [ ] No console errors
- [ ] Mobile responsive
- [ ] Commit with clear message
- [ ] Push to GitHub
- [ ] Verify Vercel deployment
- [ ] Test on live site
- [ ] Monitor for issues

---

## 📝 NOTES

- Keep backup of current code
- Test each task before moving to next
- Commit after each major task
- Can rollback if needed
- Document any issues found

---

**Ready to start? Let's go task by task!** 🚀
