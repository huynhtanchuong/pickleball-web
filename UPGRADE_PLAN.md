# 🎯 UPGRADE PLAN - Pickleball Tournament System

## 📊 PRIORITY ORDER

### 🔴 CRITICAL (Must fix first)
1. ✅ Fix standings sorting with proper tie-break
2. ✅ Support 3-set matches (set1, set2, set3)
3. ✅ Fix time sorting (9h before 10h)

### 🟡 IMPORTANT (Fix next)
4. ✅ Auto-collapse groups when done (admin)
5. ✅ Remove connection status (user view)
6. ✅ Rename modes (Trọng tài / Người xem)
7. ✅ Show tie-break explanation

### 🟢 NICE TO HAVE (Polish)
8. ✅ Icon placeholders (edit/done/live)
9. ✅ Default bracket with placeholders
10. ✅ Auto-update bracket teams
11. ✅ Disable invalid matches

---

## 🔧 IMPLEMENTATION STEPS

### STEP 1: Update Database Schema
**Current:** scoreA, scoreB (single number)
**New:** Keep scoreA/scoreB for compatibility, add:
- set1A, set1B, set2A, set2B, set3A, set3B

**Note:** Database already has s1a, s1b, s2a, s2b, s3a, s3b for semi/final!
**Action:** Extend to ALL matches (group stage too)

### STEP 2: Fix Standings Logic
```javascript
// New sorting order:
1. Wins (DESC)
2. Point Difference (DESC) 
3. Head-to-head wins
4. Head-to-head point diff

// Add tie-break explanation
tieBreakInfo: {
  team1: "Team A",
  team2: "Team B", 
  reason: "head-to-head" | "point-diff"
}
```

### STEP 3: Update Match Display
```javascript
// Group stage: Show sets
21-18 | 19-21 | 21-15
Winner: 2-1 sets

// Featured match: Show sets clearly
Set 1: 21-18
Set 2: 19-21  
Set 3: 21-15
```

### STEP 4: Fix Time Parsing
```javascript
// Parse time properly
function parseTime(timeStr) {
  // Support: "7h00", "07:00", "7:00 AM"
  // Return: minutes since midnight
}
```

### STEP 5: UI Improvements
- Remove "Connected/Disconnected" from user view
- Change "Admin" → "Trọng tài mode"
- Change "Viewer" → "Người xem mode"
- Add tie-break explanation under standings

### STEP 6: Bracket Improvements
- Show placeholders before matches generated
- Auto-update when teams are determined
- Disable score input for invalid matches

---

## 📝 FILES TO MODIFY

### app.js
- ✅ calculateStandings() - Fix sorting + add tie-break
- ✅ renderStandings() - Show tie-break explanation
- ✅ renderPublicStage() - Support 3-set display
- ✅ publicMatchHTML() - Show set scores
- ✅ parseTime() - NEW function
- ✅ Remove connection status display

### admin.js
- ✅ renderStageList() - Auto-collapse groups
- ✅ matchHTML() - Support 3-set input for all matches
- ✅ updateBracketUI() - Show placeholders
- ✅ isMatchReady() - NEW function

### styles.css
- ✅ Add .set-scores display
- ✅ Add .tie-break-info styling
- ✅ Update icon placeholders

### i18n.js
- ✅ Add new translations
- ✅ "Trọng tài mode" / "Referee mode"
- ✅ "Người xem mode" / "Viewer mode"

---

## 🧪 TESTING CHECKLIST

### Standings
- [ ] Sort by wins correctly
- [ ] Apply point diff when tied
- [ ] Apply head-to-head when tied
- [ ] Show tie-break explanation

### 3-Set Matches
- [ ] Input 3 sets in admin
- [ ] Display 3 sets in user view
- [ ] Calculate winner correctly (2/3 sets)
- [ ] Featured match shows sets

### Time Sorting
- [ ] 7h00 before 8h00
- [ ] 9h00 before 10h00
- [ ] 10h00 before 11h00

### Bracket
- [ ] Show placeholders before generation
- [ ] Auto-update with real teams
- [ ] Disable invalid matches
- [ ] Display correctly

### UI/UX
- [ ] No connection status in user view
- [ ] Correct mode labels
- [ ] Groups auto-collapse when done
- [ ] Icons ready for replacement

---

## 🚀 DEPLOYMENT PLAN

1. Create backup branch
2. Implement changes incrementally
3. Test locally
4. Deploy to staging (if available)
5. Deploy to production
6. Monitor for issues

---

## ⚠️ BREAKING CHANGES

### Database
- Need to add set scores to existing matches
- Migration script needed

### API
- scoreA/scoreB still used for compatibility
- New fields: set1A, set1B, set2A, set2B, set3A, set3B

### UI
- Match cards will look different
- Standings may re-order

---

## 📞 ROLLBACK PLAN

If issues occur:
1. Revert to previous commit
2. Re-deploy
3. Database: set scores can be NULL (backward compatible)

---

## 🎯 SUCCESS CRITERIA

- ✅ Standings sort correctly with tie-breaks
- ✅ 3-set matches work everywhere
- ✅ Time sorting is correct
- ✅ UI is clean and professional
- ✅ No technical jargon in user view
- ✅ Bracket shows placeholders
- ✅ All tests pass

---

**Ready to start implementation?**
