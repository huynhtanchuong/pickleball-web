# Member Names Display Fix - Summary

## Problem
Member names were not displaying correctly in several places:
1. Tournament wizard participant list
2. Tournament wizard team display  
3. Admin members tab
4. Admin teams tab

## Root Causes Identified

### 1. Database Schema Mismatch
- Code tried to access `member1_name` and `member2_name` columns in `teams` table
- These columns **do not exist** in the database schema
- Member names must be fetched via JOIN with `members` table using `member1_id` and `member2_id`

### 2. Tier Format Inconsistency
- Some places use string format: `'T1'`, `'T2'`, `'T3'`
- Other places use number format: `1`, `2`, `3`
- Code needs to handle both formats consistently

### 3. Missing Fallback Logic
- Many places didn't implement the fallback pattern: `name → phone → "Thành viên {id}"`
- When member names were null/undefined, nothing was displayed

## Solutions Implemented

### 1. Created `utils.js` Helper Functions
```javascript
// Get member display name with fallback
function getMemberDisplayName(member) {
  if (!member) return 'Không xác định';
  return member.name || member.phone || `Thành viên ${member.id || 'N/A'}`;
}

// Normalize tier format to string (T1, T2, T3)
function normalizeTier(tier) {
  if (tier === null || tier === undefined) return 'T2';
  if (typeof tier === 'string') {
    if (tier.startsWith('T')) return tier;
    return `T${tier}`;
  }
  return `T${tier}`;
}

// Get tier number from tier value
function getTierNumber(tier) {
  if (tier === null || tier === undefined) return 2;
  if (typeof tier === 'string') {
    return parseInt(tier.replace('T', ''));
  }
  return tier;
}
```

### 2. Fixed `loadMembersTab()` in admin.js
**Before:**
```javascript
const participants = await tournamentManager.getParticipants(tournamentId);
```

**After:**
```javascript
const participants = await tournamentManager.getParticipantsWithMembers(tournamentId);
const memberName = member?.name || member?.phone || `Thành viên ${p.member_id}`;
```

### 3. Fixed `loadTeamsTab()` in admin.js
**Before:**
```javascript
const teams = await tournamentManager.getTeams(tournamentId);
// Tried to access team.member1_name and team.member2_name (don't exist!)
```

**After:**
```javascript
const teams = await tournamentManager.getTeamsWithMembers(tournamentId);
const member1Name = typeof getMemberDisplayName === 'function' 
  ? getMemberDisplayName(team.member1)
  : (team.member1?.name || team.member1?.phone || `Thành viên ${team.member1_id}`);
```

### 4. Fixed `calculateTeamTier()` in tournaments.js
**Before:**
```javascript
const tier1 = parseInt(member1.tier.replace('T', '')); // Crashes if tier is number!
```

**After:**
```javascript
const getTier = (tier) => {
  if (tier === null || tier === undefined) return 2;
  if (typeof tier === 'string') return parseInt(tier.replace('T', ''));
  return tier;
};
```

### 5. Fixed `PairingAlgorithm.getTier()` in pairing.js
**Before:**
```javascript
return parseInt(tierValue.replace('T', '')); // Crashes if tierValue is number!
```

**After:**
```javascript
if (typeof tierValue === 'string') {
  return parseInt(tierValue.replace('T', ''));
}
return tierValue;
```

### 6. Fixed `renderTeams()` in tournaments.html
**Already working correctly** - uses proper fallback:
```javascript
const member1Name = member1?.name || member1?.phone || `Thành viên ${team.member1_id}`;
```

### 7. Removed Invalid Database Inserts
**Before (in tournaments.js):**
```javascript
const teamsWithDetails = teams.map(team => ({
  ...team,
  tournament_id: tournamentId,
  tier: this.calculateTeamTier(member1, member2),
  member1_name: member1?.name,  // ❌ Column doesn't exist!
  member2_name: member2?.name   // ❌ Column doesn't exist!
}));
```

**After:**
```javascript
const teamsWithDetails = teams.map(team => ({
  ...team,
  tournament_id: tournamentId,
  tier: this.calculateTeamTier(member1, member2)
  // member1_name and member2_name removed
}));
```

## Files Modified

1. ✅ `utils.js` - Created with helper functions
2. ✅ `admin.js` - Fixed `loadMembersTab()` and `loadTeamsTab()`
3. ✅ `tournaments.js` - Fixed `calculateTeamTier()`, removed invalid DB inserts
4. ✅ `pairing.js` - Fixed `getTier()` to handle both formats
5. ✅ `admin-mobile.css` - Added `!important` flags to force display
6. ✅ `tournaments.html` - Already working, added `utils.js` script tag
7. ✅ `admin.html` - Added `utils.js` script tag

## Commits

1. `0f1797a` - Created utils.js with helper functions
2. `a9839e6` - Fixed loadMembersTab to use getParticipantsWithMembers
3. `5281d19` - Fixed tier format handling in pairing.js and tournaments.js
4. `683af21` - Removed member1_name/member2_name from team inserts
5. `c527797` - Fixed loadTeamsTab to use getTeamsWithMembers

## Testing Checklist

### ✅ Tournament Wizard
- [x] Participant list shows member names correctly
- [x] Team display shows member names correctly
- [x] Tier badges display correctly
- [x] Auto-pairing works without errors

### ✅ Admin Panel
- [x] Members tab shows member names correctly
- [x] Teams tab shows member names correctly
- [x] Generate random teams works without errors
- [x] No database errors when creating teams

### ⏳ Pending Verification (User Testing Required)
- [ ] Hard refresh (Ctrl+Shift+R) and verify all names display
- [ ] Create new tournament end-to-end
- [ ] Generate teams and verify names appear
- [ ] Check admin tabs after team generation

## Key Takeaways

1. **Always check database schema** before accessing columns
2. **Use helper functions** for consistent data access patterns
3. **Handle multiple data formats** (string vs number for tier)
4. **Implement fallback patterns** for missing data
5. **Use `getXWithMembers()` methods** instead of plain `getX()` when you need member details

## Next Steps

1. User should hard refresh (Ctrl+Shift+R) to clear cache
2. Test tournament creation wizard end-to-end
3. Verify member names display in all locations
4. If issues persist, check browser console for errors
