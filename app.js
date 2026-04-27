// ============================================================
//  Pickleball Tournament — app.js
//  Replace SUPABASE_URL and SUPABASE_ANON_KEY before use.
// ============================================================

const SUPABASE_URL      = "https://negwxhrkdypiopmmrxkf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lZ3d4aHJrZHlwaW9wbW1yeGtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0MzQwMjEsImV4cCI6MjA5MjAxMDAyMX0.5f_1qyXfEvcDxVQAtiaMVBT7K7nz7MtDM8sN50V0O14";

// ── Supabase client ──────────────────────────────────────────
let db = null;
let realtimeChannel = null;

// isAdmin() / isReferee() / getRole() are provided by auth.js when loaded.

// ── Pickleball icon helpers ──────────────────────────────────
// Inline SVG of a yellow pickleball with the characteristic perforations.
// pickleballBalls(n) returns N icons in a row — used for "lượt giao" indicator.
const PICKLEBALL_SVG = `<svg viewBox="0 0 24 24" width="14" height="14" style="vertical-align:-2px;flex-shrink:0;" aria-hidden="true">
  <circle cx="12" cy="12" r="10.5" fill="#fde047" stroke="#a16207" stroke-width="0.7"/>
  <circle cx="8"  cy="8"  r="1.4" fill="#a16207"/>
  <circle cx="16" cy="8"  r="1.4" fill="#a16207"/>
  <circle cx="12" cy="13" r="1.4" fill="#a16207"/>
  <circle cx="7"  cy="15" r="1.1" fill="#a16207"/>
  <circle cx="17" cy="15" r="1.1" fill="#a16207"/>
  <circle cx="12" cy="18.2" r="1" fill="#a16207"/>
</svg>`;
function pickleballBalls(n) {
  const count = Math.max(1, Math.min(2, parseInt(n, 10) || 1));
  return PICKLEBALL_SVG.repeat(count);
}

function initSupabase() {
  if (SUPABASE_URL === "REPLACE_ME" || SUPABASE_ANON_KEY === "REPLACE_ME") {
    setStatus(t("demoMode"), "err");
    const dc = document.getElementById("demo-controls");
    if (dc) dc.style.display = "block";
    return false;
  }
  try {
    db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    // Don't announce "Đã kết nối" — assume happy path silently.
    return true;
  } catch (e) {
    setStatus("❌ Không thể kết nối cơ sở dữ liệu", "err");
    return false;
  }
}

// ── Status bar ───────────────────────────────────────────────
let _statusTimer = null;

// Debounce timer for score updates (shared with admin.js)
// Only declare if not already declared by admin.js
if (typeof _saveDebounce === 'undefined') {
  var _saveDebounce = {};
}

// ── Error / toast helpers ────────────────────────────────────
// Translate a thrown error / response error into a friendly Vietnamese
// message. Keeps the technical detail in console only.
function friendlyError(err, fallback) {
  if (!err) return fallback || t('errGeneric');
  console.error('[friendlyError]', err);
  const raw = String(err.message || err.error || err || '').toLowerCase();
  if (raw.includes('failed to fetch') || raw.includes('networkerror')) return t('errNetwork');
  if (raw.includes('jwt') || raw.includes('401') || raw.includes('unauthorized')) return t('errAuth');
  if (raw.includes('not found') || raw.includes('does not exist') || raw.includes('schema cache')) return t('errSchema');
  if (raw.includes('duplicate') || raw.includes('unique constraint') || raw.includes('23505')) return t('errDuplicate');
  if (raw.includes('foreign key') || raw.includes('23503')) return t('errForeignKey');
  if (raw.includes('not null') || raw.includes('23502')) return t('errNotNull');
  if (raw.includes('check constraint') || raw.includes('23514')) return t('errCheck');
  if (raw.includes('permission denied') || raw.includes('403')) return t('errPermission');
  return fallback || (err.message ? err.message : t('errGeneric'));
}

function showError(err, fallback)   { setStatus(friendlyError(err, fallback), 'err'); }
function showOk(msg)                { setStatus(msg, 'ok'); }

function setStatus(msg, type = "") {
  const el = document.getElementById("status-bar");
  if (!el) return;

  // Only show status on admin/teams pages (not user view)
  const isAdminPage = window.location.pathname.includes("admin") ||
                      window.location.pathname.includes("teams");
  if (!isAdminPage) {
    el.style.display = "none";
    return;
  }

  // No message → hide the chip entirely (no "Đã kết nối" idle state)
  if (!msg) {
    el.style.display = "none";
    el.textContent = "";
    el.className = "";
    if (_statusTimer) clearTimeout(_statusTimer);
    return;
  }

  el.style.display = "inline-block";
  el.textContent = msg;
  el.className = type;
  if (_statusTimer) clearTimeout(_statusTimer);
  // Auto-hide success messages after 2.5s instead of replacing with "Đã kết nối"
  if (type === "ok") {
    _statusTimer = setTimeout(() => {
      el.style.display = "none";
      el.textContent = "";
      el.className = "";
    }, 2500);
  }
}

// ── Sample data — tên đội thật ───────────────────────────────
const SAMPLE_MATCHES = [
  // ── BẢNG A (10 trận) ──
  { id:"a1",  teamA:"Tuấn Anh & Hang Dang",    teamB:"Khoa Hoang & Phan Nguyen", scoreA:0, scoreB:0, group_name:"A", stage:"group", status:"not_started", updated_at:null },
  { id:"a2",  teamA:"Quoc Le & Thảo",           teamB:"Tai Tran & vk Dũng",       scoreA:0, scoreB:0, group_name:"A", stage:"group", status:"not_started", updated_at:null },
  { id:"a3",  teamA:"Khoa Hoang & Phan Nguyen", teamB:"Tai Tran & vk Dũng",       scoreA:0, scoreB:0, group_name:"A", stage:"group", status:"not_started", updated_at:null },
  { id:"a4",  teamA:"Tuấn Anh & Hang Dang",    teamB:"Dung Vo & Thư",            scoreA:0, scoreB:0, group_name:"A", stage:"group", status:"not_started", updated_at:null },
  { id:"a5",  teamA:"Tai Tran & vk Dũng",       teamB:"Dung Vo & Thư",            scoreA:0, scoreB:0, group_name:"A", stage:"group", status:"not_started", updated_at:null },
  { id:"a6",  teamA:"Khoa Hoang & Phan Nguyen", teamB:"Quoc Le & Thảo",           scoreA:0, scoreB:0, group_name:"A", stage:"group", status:"not_started", updated_at:null },
  { id:"a7",  teamA:"Dung Vo & Thư",            teamB:"Quoc Le & Thảo",           scoreA:0, scoreB:0, group_name:"A", stage:"group", status:"not_started", updated_at:null },
  { id:"a8",  teamA:"Tai Tran & vk Dũng",       teamB:"Tuấn Anh & Hang Dang",    scoreA:0, scoreB:0, group_name:"A", stage:"group", status:"not_started", updated_at:null },
  { id:"a9",  teamA:"Quoc Le & Thảo",           teamB:"Tuấn Anh & Hang Dang",    scoreA:0, scoreB:0, group_name:"A", stage:"group", status:"not_started", updated_at:null },
  { id:"a10", teamA:"Dung Vo & Thư",            teamB:"Khoa Hoang & Phan Nguyen", scoreA:0, scoreB:0, group_name:"A", stage:"group", status:"not_started", updated_at:null },
  // ── BẢNG B (10 trận) ──
  { id:"b1",  teamA:"Dũng Nguyễn & Minh Ngọc", teamB:"chú Cường & Alix Su",      scoreA:0, scoreB:0, group_name:"B", stage:"group", status:"not_started", updated_at:null },
  { id:"b2",  teamA:"Chuong Huynh & Uyên",      teamB:"Tien Tran & Vu Phan",      scoreA:0, scoreB:0, group_name:"B", stage:"group", status:"not_started", updated_at:null },
  { id:"b3",  teamA:"chú Cường & Alix Su",      teamB:"Tien Tran & Vu Phan",      scoreA:0, scoreB:0, group_name:"B", stage:"group", status:"not_started", updated_at:null },
  { id:"b4",  teamA:"Dũng Nguyễn & Minh Ngọc", teamB:"Hoc Truong & Linh Ngo",    scoreA:0, scoreB:0, group_name:"B", stage:"group", status:"not_started", updated_at:null },
  { id:"b5",  teamA:"Tien Tran & Vu Phan",      teamB:"Hoc Truong & Linh Ngo",    scoreA:0, scoreB:0, group_name:"B", stage:"group", status:"not_started", updated_at:null },
  { id:"b6",  teamA:"chú Cường & Alix Su",      teamB:"Chuong Huynh & Uyên",      scoreA:0, scoreB:0, group_name:"B", stage:"group", status:"not_started", updated_at:null },
  { id:"b7",  teamA:"Hoc Truong & Linh Ngo",    teamB:"Chuong Huynh & Uyên",      scoreA:0, scoreB:0, group_name:"B", stage:"group", status:"not_started", updated_at:null },
  { id:"b8",  teamA:"Tien Tran & Vu Phan",      teamB:"Dũng Nguyễn & Minh Ngọc", scoreA:0, scoreB:0, group_name:"B", stage:"group", status:"not_started", updated_at:null },
  { id:"b9",  teamA:"Chuong Huynh & Uyên",      teamB:"Dũng Nguyễn & Minh Ngọc", scoreA:0, scoreB:0, group_name:"B", stage:"group", status:"not_started", updated_at:null },
  { id:"b10", teamA:"Hoc Truong & Linh Ngo",    teamB:"chú Cường & Alix Su",      scoreA:0, scoreB:0, group_name:"B", stage:"group", status:"not_started", updated_at:null },
];

// In-memory store (demo mode)
let localMatches = JSON.parse(localStorage.getItem("pb_matches") || "null");

function saveLocal(matches) {
  localStorage.setItem("pb_matches", JSON.stringify(matches));
}

// Ensure every match object has both snake_case (DB) and camelCase (legacy) aliases.
// Applied after all reads so rendering code using either naming convention works.
function normalizeMatch(m) {
  // snake_case → camelCase (DB → rendering)
  if (m.team_a  !== undefined && m.teamA  === undefined) m.teamA  = m.team_a;
  if (m.team_b  !== undefined && m.teamB  === undefined) m.teamB  = m.team_b;
  if (m.score_a !== undefined && m.scoreA === undefined) m.scoreA = m.score_a;
  if (m.score_b !== undefined && m.scoreB === undefined) m.scoreB = m.score_b;
  // camelCase → snake_case (demo/localStorage → DB writes)
  if (m.teamA  !== undefined && m.team_a  === undefined) m.team_a  = m.teamA;
  if (m.teamB  !== undefined && m.team_b  === undefined) m.team_b  = m.teamB;
  if (m.scoreA !== undefined && m.score_a === undefined) m.score_a = m.scoreA;
  if (m.scoreB !== undefined && m.score_b === undefined) m.score_b = m.scoreB;
  // Set scores: DB uses s1a/s1b; rendering uses s1A/s1B — bridge both
  for (let i = 1; i <= 3; i++) {
    const lo = `s${i}a`, lb = `s${i}b`, hi = `s${i}A`, hb = `s${i}B`;
    if (m[lo] !== undefined && m[hi] === undefined) m[hi] = m[lo];
    if (m[lb] !== undefined && m[hb] === undefined) m[hb] = m[lb];
    if (m[hi] !== undefined && m[lo] === undefined) m[lo] = m[hi];
    if (m[hb] !== undefined && m[lb] === undefined) m[lb] = m[hb];
  }
  return m;
}

// ── Fetch matches ─────────────────────────────────────────────
async function fetchMatches() {
  if (!db) {
    // Always re-read from localStorage so cross-tab updates (admin → public) are picked up.
    // The in-memory localMatches is only used as a write buffer; source of truth is localStorage.
    const stored = localStorage.getItem("pb_matches");
    if (stored) {
      localMatches = JSON.parse(stored).map(normalizeMatch);
    } else {
      localMatches = JSON.parse(JSON.stringify(SAMPLE_MATCHES)).map(normalizeMatch);
      saveLocal(localMatches);
    }

    // Filter by active tournament if available
    let filtered = localMatches;
    if (typeof tournamentManager !== 'undefined' && tournamentManager) {
      const activeId = tournamentManager.getActiveTournamentId();
      if (activeId) {
        filtered = localMatches.filter(m => m.tournament_id == activeId);
      }
    }
    
    renderMatches(filtered);
    calculateStandings(filtered);
    storeUpdatedAt(filtered);
    return;
  }

  // Filter by active tournament if available
  let query = db.from("matches").select("*").order("group_name");
  
  if (typeof tournamentManager !== 'undefined' && tournamentManager) {
    const activeId = tournamentManager.getActiveTournamentId();
    if (activeId) {
      query = query.eq('tournament_id', activeId);
    }
  }

  const { data, error } = await query;
  if (error) { 
    setStatus("❌ Không thể tải dữ liệu trận đấu", "err"); 
    return; 
  }

  // v2: never auto-seed. Empty DB = empty render.
  // (Auto-seeding looped forever when an active tournament had no matches yet,
  //  because SAMPLE_MATCHES insert with tournament_id=NULL never satisfies the
  //  filter, so the next fetch returned [] again → seed → repeat.)
  const normalized = (data || []).map(normalizeMatch);
  renderMatches(normalized);
  calculateStandings(normalized);
  storeUpdatedAt(normalized); // track timestamps for conflict detection
}

async function seedMatches() {
  // Disabled in v2. Sample data must be seeded via tournaments.html
  // with an explicit tournament_id. Calling this without a tournament
  // would create orphan rows and trigger an auto-seed loop.
  console.warn('seedMatches() is disabled. Use tournaments.html to create demo data.');
  return;
  // eslint-disable-next-line no-unreachable
  if (!db) return;
  const rows = SAMPLE_MATCHES.map(m => {
    const n = normalizeMatch({ ...m });
    const { id, teamA, teamB, scoreA, scoreB,
            s1A, s1B, s2A, s2B, s3A, s3B, ...dbFields } = n;
    return dbFields;
  });
  const { error } = await db.from("matches").insert(rows);
  if (error) { 
    setStatus("❌ Không thể tạo dữ liệu mẫu", "err"); 
    return; 
  }
  setStatus("Sample matches inserted!", "ok");
  await fetchMatches();
}

// ── Render matches (public read-only view) ────────────────────
//  admin.js overrides this function for the admin panel.
function renderMatches(matches) {
  const groupMatches = matches.filter(m => !m.stage || m.stage === "group");
  const semiMatches  = matches.filter(m => m.stage === "semi");
  const finalMatches = matches.filter(m => m.stage === "final");

  renderPublicStage("match-list-group", groupMatches, "group");

  // Auto-collapse group sections when all group matches are done
  const allGroupDone = groupMatches.length > 0 && groupMatches.every(m => m.status === "done");
  if (allGroupDone && (semiMatches.length > 0 || finalMatches.length > 0)) {
    // Defer so DOM is built first
    setTimeout(collapseAllPubGroups, 50);
  }

  // Show/hide semi section
  const semiSec = document.getElementById("section-semi");
  if (semiSec) {
    semiSec.style.display = semiMatches.length ? "block" : "none";
    renderPublicStage("match-list-semi", semiMatches, "semi");
  }

  // Show/hide final section
  const finalSec = document.getElementById("section-final");
  if (finalSec) {
    finalSec.style.display = finalMatches.length ? "block" : "none";
    renderPublicStage("match-list-final", finalMatches, "final");
  }

  // Bracket visual - ALWAYS show (with placeholders if needed)
  const bracketSec = document.getElementById("section-bracket");
  if (bracketSec) {
    bracketSec.style.display = "block"; // Always show bracket section
    const bc = document.getElementById("bracket-container");
    if (bc) {
      // Use admin.js renderBracketVisual if available, else use built-in
      if (typeof renderBracketVisual === "function") {
        renderBracketVisual(bc, matches);
      } else {
        renderPublicBracket(bc, matches);
      }
    }
  }

  // Featured match (public scoreboard only)
  updateFeatured(matches);

  // Update bracket UI hook (used by admin.js if loaded)
  if (typeof updateBracketUI === "function") updateBracketUI(matches);
  
  // Setup click handlers for match cards (public page only)
  if (!window.location.pathname.includes("admin") && typeof setupMatchCardHandlers === "function") {
    setTimeout(setupMatchCardHandlers, 50);
  }
}

// ── Featured match with auto-rotation ─────────────────────────
let _featuredRotationTimer = null;
let _featuredRotationIndex = 0;
let _allPlayingMatches = [];

function updateFeatured(matches) {
  const sec = document.getElementById("featured-section");
  const box = document.getElementById("featured-match");
  if (!sec || !box) return; // not on public page

  // Get all playing matches (priority order: final → semi → group)
  const priority = ["final", "semi", "group"];
  const newPlayingMatches = [];
  for (const stage of priority) {
    const playing = matches.filter(m => m.status === "playing" && m.stage === stage);
    newPlayingMatches.push(...playing);
  }

  // Check if playing matches changed
  const matchesChanged = newPlayingMatches.length !== _allPlayingMatches.length ||
    !newPlayingMatches.every((m, i) => m.id === _allPlayingMatches[i]?.id);
  
  if (matchesChanged) {
    _allPlayingMatches = newPlayingMatches;
    _featuredRotationIndex = 0; // Reset index when matches change
  }

  // If multiple playing matches, start rotation
  if (_allPlayingMatches.length > 1) {
    if (!_featuredRotationTimer) {
      startFeaturedRotation();
    }
    // Only render if matches changed, otherwise let timer handle it
    if (matchesChanged) {
      const featured = _allPlayingMatches[_featuredRotationIndex % _allPlayingMatches.length];
      renderFeaturedMatch(sec, box, featured);
    }
    return;
  }

  // Stop rotation if not needed
  stopFeaturedRotation();

  // Single match or fallback logic
  let featured = null;
  if (_allPlayingMatches.length === 1) {
    featured = _allPlayingMatches[0];
  } else {
    // No playing matches — fallback to not_started or done
    for (const stage of priority) {
      featured = matches.find(m => m.status === "not_started" && m.stage === stage);
      if (featured) break;
    }
    if (!featured) {
      for (const stage of priority) {
        featured = matches.find(m => m.status === "pending" && m.stage === stage);
        if (featured) break;
      }
    }
    if (!featured) {
      const done = matches.filter(m => m.status === "done");
      featured = done[done.length - 1] || null;
    }
  }

  if (!featured) { sec.style.display = "none"; return; }
  renderFeaturedMatch(sec, box, featured);
}

function renderFeaturedMatch(sec, box, featured) {
  sec.style.display = "block";
  const isPlaying    = featured.status === "playing";
  const isNotStarted = featured.status === "not_started" || featured.status === "pending";
  const isDone       = featured.status === "done";
  const wA = isDone && (featured.score_a || featured.scoreA || 0) > (featured.score_b || featured.scoreB || 0);
  const wB = isDone && (featured.score_b || featured.scoreB || 0) > (featured.score_a || featured.scoreA || 0);

  const stageLabel = featured.stage === "final" ? t("champFinal")
                   : featured.stage === "semi"  ? t("semifinal")
                   : t("groupLabel") + " " + (featured.group_name || "");

  const fTeamA  = featured.team_a  || featured.teamA  || '';
  const fTeamB  = featured.team_b  || featured.teamB  || '';
  const fScoreA = featured.score_a !== undefined ? featured.score_a : (featured.scoreA || 0);
  const fScoreB = featured.score_b !== undefined ? featured.score_b : (featured.scoreB || 0);
  // Serving balls under whichever team is serving
  const fServerNum = featured.server_number || 1;
  const featServing = (side) => (isPlaying && featured.serving_team === side)
    ? `<div class="feat-serving">${pickleballBalls(fServerNum)}</div>`
    : '';
  box.innerHTML = `
    <div class="feat-team ${wA ? "feat-winner" : ""}">
      <span class="feat-name">${esc(fTeamA)}</span>
      ${featServing('A')}
    </div>
    <div class="feat-scores">
      <span class="feat-score ${wA ? "feat-score-win" : ""}">${fScoreA}</span>
      <span class="feat-divider">:</span>
      <span class="feat-score ${wB ? "feat-score-win" : ""}">${fScoreB}</span>
    </div>
    <div class="feat-team ${wB ? "feat-winner" : ""}">
      <span class="feat-name">${esc(fTeamB)}</span>
      ${featServing('B')}
    </div>
    <div class="feat-status">
      ${isPlaying    ? `<span class="badge-live">${t("badgePlaying")}</span>`
      : isNotStarted ? `<span class="badge-ns">${t("badgeNotStarted")}</span>`
      :                `<span class="badge-done">${t("badgeFinal")}</span>`}
      <span class="feat-stage-label">${esc(stageLabel)}</span>
    </div>`;
}

function startFeaturedRotation() {
  stopFeaturedRotation();
  _featuredRotationTimer = setInterval(() => {
    _featuredRotationIndex++;
    if (_allPlayingMatches.length > 0) {
      const sec = document.getElementById("featured-section");
      const box = document.getElementById("featured-match");
      if (sec && box) {
        const featured = _allPlayingMatches[_featuredRotationIndex % _allPlayingMatches.length];
        renderFeaturedMatch(sec, box, featured);
      }
    }
  }, 5000); // Rotate every 5 seconds
}

function stopFeaturedRotation() {
  if (_featuredRotationTimer) {
    clearInterval(_featuredRotationTimer);
    _featuredRotationTimer = null;
  }
  // Don't reset index here - let it reset only when matches change
}

// ── Parse match time for sorting ─────────────────────────────
function parseMatchTime(timeStr) {
  if (!timeStr) return 9999; // No time = sort last
  
  // Support formats: "7h00", "07:00", "7:00 AM", "7:00 PM"
  const match = timeStr.match(/(\d{1,2})[h:](\d{2})/);
  if (!match) return 9999;
  
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  
  // Handle AM/PM
  if (timeStr.toLowerCase().includes('pm') && hours < 12) {
    hours += 12;
  }
  if (timeStr.toLowerCase().includes('am') && hours === 12) {
    hours = 0;
  }
  
  return hours * 60 + minutes; // Return minutes since midnight
}

function renderPublicStage(containerId, matches, stage) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!matches || matches.length === 0) {
    container.innerHTML = '<p class="empty-state">No matches.</p>';
    return;
  }

  // Sort: playing → not_started → done, then by time
  const statusOrder = { playing: 0, not_started: 1, pending: 1, done: 2 };
  const sorted = [...matches].sort((a, b) => {
    // First: sort by status
    const statusDiff = (statusOrder[a.status] ?? 1) - (statusOrder[b.status] ?? 1);
    if (statusDiff !== 0) return statusDiff;
    
    // Second: sort by match_time (parsed numerically)
    const timeA = parseMatchTime(a.match_time);
    const timeB = parseMatchTime(b.match_time);
    if (timeA !== timeB) return timeA - timeB;
    
    // Third: keep original order
    return 0;
  });

  if (stage === "group") {
    // Sub-group by group_name with collapsible headers
    const groups = {};
    sorted.forEach(m => {
      if (!groups[m.group_name]) groups[m.group_name] = [];
      groups[m.group_name].push(m);
    });
    let html = "";
    Object.keys(groups).sort().forEach(g => {
      html += `
        <div class="pub-group-header" onclick="togglePubGroup('${g}')" style="grid-column:1/-1;">
          <span class="group-divider-label">${t("groupLabel")} ${esc(g)}</span>
          <span class="group-divider-line"></span>
          <span class="pub-collapse-icon" id="pub-icon-${g}">▼</span>
        </div>
        <div id="pub-grp-${g}" style="display:contents;">`;
      groups[g].forEach(m => { html += publicMatchHTML(m, stage); });
      html += `</div>`;
    });
    container.innerHTML = html;
  } else {
    container.innerHTML = sorted.map(m => publicMatchHTML(m, stage)).join("");
  }
}

function publicMatchHTML(m, stage) {
  const done       = m.status === "done";
  const playing    = m.status === "playing";
  const notStarted = m.status === "not_started" || m.status === "pending";
  const winnerA    = done && m.scoreA > m.scoreB;
  const winnerB    = done && m.scoreB > m.scoreA;

  let cardMod = done ? "card-done" : playing ? "card-live" : "card-ns";
  if (stage === "semi")  cardMod += " card-semi";
  if (stage === "final") cardMod += " card-final";

  const groupTag = stage === "group"
    ? `${t("groupLabel")} ${esc(m.group_name)}`
    : stage === "semi" ? t("semifinal") : t("final");

  const badge = done    ? `<span class="badge-done">${t("badgeDone")}</span>`
              : playing ? `<span class="badge-live">${t("badgeLive")}</span>`
              :           `<span class="badge-ns">${t("badgeNs")}</span>`;

  // Only show set scores for semi/final (group stage uses single score)
  let setsHtml = "";
  if (stage === "semi" || stage === "final") {
    const sets = [
      { a:m.s1A||m.s1a||0, b:m.s1B||m.s1b||0, label:"S1" },
      { a:m.s2A||m.s2a||0, b:m.s2B||m.s2b||0, label:"S2" },
      { a:m.s3A||m.s3a||0, b:m.s3B||m.s3b||0, label:"S3" },
    ];
    const activeSets = sets.filter((s,i) => i===0 || s.a>0 || s.b>0 || (i===2 && m.scoreA===1 && m.scoreB===1));
    if (activeSets.length > 0 && (activeSets[0].a > 0 || activeSets[0].b > 0)) {
      setsHtml = `<div class="mc-sets">` +
        activeSets.map(s => {
          const wA=s.a>s.b, wB=s.b>s.a;
          return `<div class="mc-set-item">
            <span class="mc-set-label">${s.label}</span>
            <span class="mc-set-score ${wA?"winner":""}">${s.a}</span>
            <span class="mc-set-sep">-</span>
            <span class="mc-set-score ${wB?"winner":""}">${s.b}</span>
          </div>`;
        }).join("") + `</div>`;
    }
  }

  // Serving indicator now lives directly under the serving team's name (see below).
  // Match-info row no longer carries the server text.
  const refName = m.referee_name || m.referee || "";
  const infoHtml = (m.match_time||m.court||refName) ? `
    <div class="mc-info">
      ${m.match_time ? `<span>🕐 ${esc(m.match_time)}</span>` : ""}
      ${m.court      ? `<span>🏟 ${esc(m.court)}</span>`      : ""}
      ${refName      ? `<span>👤 ${esc(refName)}</span>`      : ""}
    </div>` : "";

  // Per-team serving badge — N pickleball balls = N-th server (1 or 2)
  const serverNum = m.server_number || 1;
  const servingBadge = (sideLetter) => (playing && m.serving_team === sideLetter)
    ? `<div class="mc-serving">${pickleballBalls(serverNum)}</div>`
    : '';

  return `
    <div class="match-card ${cardMod}" data-id="${m.id}">
      <div class="mc-row">
        <span class="mc-team ${winnerA ? "winner" : ""}">
          ${esc(m.teamA)}
          ${servingBadge('A')}
        </span>
        <div class="mc-scores">
          <span class="mc-score ${winnerA ? "winner" : ""}">${m.scoreA}</span>
          <span class="mc-sep">:</span>
          <span class="mc-score ${winnerB ? "winner" : ""}">${m.scoreB}</span>
        </div>
        <span class="mc-team right ${winnerB ? "winner" : ""}">
          ${esc(m.teamB)}
          ${servingBadge('B')}
        </span>
      </div>
      ${setsHtml}
      ${infoHtml}
      <div class="mc-footer">
        <span class="mc-group-tag">${groupTag}</span>
        ${badge}
      </div>
    </div>`;
}

// ── Set score helpers (ALL matches now use sets) ────────────
// Sets: s1A/s1B, s2A/s2B, s3A/s3B (scores per set)
// scoreA/scoreB = sets won (computed, not manually entered)

function needsSets(m) {
  // Only semi/final use 3-set scoring, group stage uses single score
  return m.stage === "semi" || m.stage === "final";
}

function computeSetWins(m) {
  let wA = 0, wB = 0;
  // Support both uppercase (local) and lowercase (Supabase DB) field names
  const sets = [
    [m.s1A||m.s1a||0, m.s1B||m.s1b||0],
    [m.s2A||m.s2a||0, m.s2B||m.s2b||0],
    [m.s3A||m.s3a||0, m.s3B||m.s3b||0],
  ];
  sets.forEach(([a,b]) => {
    if (a>0||b>0) { if(a>b) wA++; else if(b>a) wB++; }
  });
  return { winsA:wA, winsB:wB };
}

function getSetInput(id, field) {
  const el = document.querySelector(`input[data-id="${id}"][data-field="${field}"]`);
  return el ? (parseInt(el.value, 10) || 0) : 0;
}

function adjustSetScore(id, field, delta) {
  const input = document.querySelector(`input[data-id="${id}"][data-field="${field}"]`);
  if (!input) return;
  const oldValue = parseInt(input.value, 10) || 0;
  input.value = Math.max(0, oldValue + delta);

  // Set editing flag to prevent realtime fetch from interrupting
  _isEditingScore = true;

  clearTimeout(_saveDebounce[id]);
  _saveDebounce[id] = setTimeout(() => {
    updateScore(id);
    // Clear editing flag after save completes
    setTimeout(() => {
      _isEditingScore = false;
    }, 1000);
  }, 800);
}
// Maps matchId → updated_at string seen at last render.
// Used to detect concurrent edits by multiple admins.
const _knownUpdatedAt = {};

function storeUpdatedAt(matches) {
  matches.forEach(m => {
    if (m.updated_at !== undefined) _knownUpdatedAt[m.id] = m.updated_at;
  });
}

async function checkConflict(id) {
  // Demo mode — no conflict possible (single localStorage)
  if (!db) return false;

  const { data, error } = await db
    .from("matches").select("updated_at").eq("id", id).single();
  if (error || !data) return false; // can't check → allow save

  const knownTs  = _knownUpdatedAt[id];
  const latestTs = data.updated_at;

  // If we never stored a timestamp, allow save
  if (!knownTs) return false;

  // Conflict if DB timestamp differs from what we loaded
  return latestTs !== knownTs;
}

function handleConflict(id) {
  setStatus("ℹ️ Trận đấu đã được cập nhật bởi admin khác", "err");

  // Show inline conflict banner on the card
  const card = document.querySelector(`.adm-match-card[data-id="${id}"]`);
  if (card) {
    // Remove any existing banner
    const old = card.querySelector(".conflict-banner");
    if (old) old.remove();

    const banner = document.createElement("div");
    banner.className = "conflict-banner";
    banner.innerHTML = `
      <div style="flex:1;">
        <strong>ℹ️ Trận đấu đã được cập nhật</strong><br>
        <span style="font-size:0.75rem;opacity:0.9;">Admin khác vừa cập nhật trận này. Vui lòng bấm nút Reload ở trên cùng để xem dữ liệu mới nhất.</span>
      </div>
      <button class="conflict-reload-btn" onclick="location.reload()">↺ Reload</button>`;
    card.prepend(banner);
  }
}

async function reloadMatch(id) {
  if (!db) { fetchMatches(); return; }

  const { data, error } = await db
    .from("matches").select("*").eq("id", id).single();
  if (error || !data) { fetchMatches(); return; }

  // Update local cache and re-render just this card
  if (localMatches) {
    const idx = localMatches.findIndex(m => m.id === id);
    if (idx !== -1) localMatches[idx] = data;
    else localMatches.push(data);
  }
  _knownUpdatedAt[id] = data.updated_at;

  // Full re-render to reflect fresh data
  fetchMatches();
  setStatus("Match reloaded ✓", "ok");
}

// ── Update score ──────────────────────────────────────────────
async function updateScore(id) {
  // Get match info to determine if it needs sets
  let m = null;

  if (!db) {
    // Demo mode: read from localStorage
    const stored = localStorage.getItem("pb_matches");
    localMatches = stored ? JSON.parse(stored) : JSON.parse(JSON.stringify(SAMPLE_MATCHES));
    m = localMatches ? localMatches.find(x => x.id === id) : null;
  } else {
    // Supabase mode: fetch from DB to get stage info
    const { data } = await db.from("matches").select("*").eq("id", id).single();
    m = data;
    // Update known timestamp to avoid false conflict detection
    if (m && m.updated_at) {
      _knownUpdatedAt[id] = m.updated_at;
    }
  }

  let scoreA, scoreB, payload;

  const useSets = needsSets(m || { stage: "" });

  if (useSets) {
    // Best-of-3: read individual set scores
    const s1A = getSetInput(id, "s1A"), s1B = getSetInput(id, "s1B");
    const s2A = getSetInput(id, "s2A"), s2B = getSetInput(id, "s2B");
    const s3A = getSetInput(id, "s3A"), s3B = getSetInput(id, "s3B");
    const tmp = { s1A, s1B, s2A, s2B, s3A, s3B };
    const { winsA, winsB } = computeSetWins(tmp);
    scoreA = winsA;
    scoreB = winsB;
    payload = { s1a:s1A, s1b:s1B, s2a:s2A, s2b:s2B, s3a:s3A, s3b:s3B,
                score_a: scoreA, score_b: scoreB };
  } else {
    scoreA = parseInt(getInput(id, "scoreA"), 10) || 0;
    scoreB = parseInt(getInput(id, "scoreB"), 10) || 0;
    payload = { score_a: scoreA, score_b: scoreB };
  }

  // Auto-status:
  //   - not_started → playing when any score appears
  //   - playing → done for BO3 (semi/final) when one team has 2 set wins
  const hasScore = scoreA > 0 || scoreB > 0 ||
    (payload.s1a > 0 || payload.s1b > 0);
  let autoStatus = hasScore ? "playing" : null;
  if (useSets && (scoreA >= 2 || scoreB >= 2)) {
    autoStatus = "done"; // best-of-3 ends as soon as someone wins 2 sets
  }

  if (!db) {
    if (!m) return;
    Object.assign(m, payload);
    const transitions = {
      not_started: ['playing', 'done'],
      pending:     ['playing', 'done'],
      playing:     ['done']
    };
    if (autoStatus && (transitions[m.status] || []).includes(autoStatus)) {
      m.status = autoStatus;
    }
    m.updated_at = new Date().toISOString();
    saveLocal(localMatches);

    const isAdminPage = window.location.pathname.includes("admin");
    if (isAdminPage) {
      updateStatusBadgeInPlace(id, m.status);
      updateSetWinsDisplay(id, scoreA, scoreB);
      flashSaved(id);
    } else {
      renderMatches(localMatches);
      calculateStandings(localMatches);
      flashSaved(id);
    }
    setStatus(t("scoreSaved"), "ok");
    return;
  }

  // Supabase path
  const conflict = await checkConflict(id);
  if (conflict) { handleConflict(id); return; }

  payload.updated_at = new Date().toISOString();

  const { data: current } = await db
    .from("matches").select("status").eq("id", id).single();
  if (current && autoStatus) {
    // Promote not_started → playing on first score, or playing → done
    // when BO3 reaches 2 sets won
    const transitions = {
      not_started: ['playing', 'done'],
      pending:     ['playing', 'done'],
      playing:     ['done']
    };
    if ((transitions[current.status] || []).includes(autoStatus)) {
      payload.status = autoStatus;
    }
  }

  const { error } = await db.from("matches").update(payload).eq("id", id);
  if (error) {
    showError(error, t('errSaveScore'));
    return;
  }

  _knownUpdatedAt[id] = payload.updated_at;

  // Update UI in-place for admin page
  const isAdminPage = window.location.pathname.includes("admin");
  if (isAdminPage) {
    if (payload.status) {
      updateStatusBadgeInPlace(id, payload.status);
    }
    if (needsSets({ stage: m?.stage })) {
      updateSetWinsDisplay(id, scoreA, scoreB);
    }
  }

  setStatus(t("scoreSaved"), "ok");
  flashSaved(id);
}

// Update set-wins display in-place on admin card (avoids full re-render)
function updateSetWinsDisplay(id, winsA, winsB) {
  const el = document.querySelector(`.adm-set-wins[data-id="${id}"]`);
  if (!el) return;
  el.textContent = `${t('sets')} ${winsA} — ${winsB}`;
  el.classList.remove('flash');
  void el.offsetWidth; // trigger reflow so animation re-runs
  el.classList.add('flash');
}

// ── Update status badge in-place (admin page only) ────────────
// Avoids full re-render which would destroy score inputs mid-edit.
function updateStatusBadgeInPlace(id, status) {
  const card = document.querySelector(`.adm-match-card[data-id="${id}"]`);
  if (!card) return;

  const badge = card.querySelector(".adm-status-badge");
  if (!badge) return;

  if (status === "playing") {
    badge.className = "adm-status-badge adm-status-playing";
    badge.textContent = "● PLAYING";
  } else if (status === "done") {
    badge.className = "adm-status-badge adm-status-done";
    badge.textContent = "✓ DONE";
  } else {
    badge.className = "adm-status-badge adm-status-ns";
    badge.textContent = "◌ NOT STARTED";
  }
}

// ── Finish match (sets status = done) ─────────────────────────
async function finishMatch(id) {
  // Get match info to determine if it needs sets
  let m = null;

  if (!db) {
    // Demo mode: read from localStorage
    const stored = localStorage.getItem("pb_matches");
    localMatches = stored ? JSON.parse(stored) : JSON.parse(JSON.stringify(SAMPLE_MATCHES));
    m = localMatches ? localMatches.find(x => x.id === id) : null;
  } else {
    // Supabase mode: fetch from DB to get stage info
    const { data } = await db.from("matches").select("*").eq("id", id).single();
    m = data;
  }

  // Confirm before ending — irreversible action
  if (typeof t === 'function') {
    if (!confirm(t('confirmEndMatch'))) return;
  } else {
    if (!confirm('Kết thúc trận đấu? Không thể thay đổi sau khi xác nhận.')) return;
  }

  let payload = { status: "done", updated_at: new Date().toISOString() };

  if (needsSets(m || { stage: "" })) {
    const s1A = getSetInput(id, "s1A"), s1B = getSetInput(id, "s1B");
    const s2A = getSetInput(id, "s2A"), s2B = getSetInput(id, "s2B");
    const s3A = getSetInput(id, "s3A"), s3B = getSetInput(id, "s3B");
    const { winsA, winsB } = computeSetWins({ s1A, s1B, s2A, s2B, s3A, s3B });
    
    // Validate: cannot finish with tied score
    // Best-of-3: need at least 2 wins (2-0 or 2-1)
    if (winsA < 2 && winsB < 2) {
      alert("Chưa thể kết thúc trận đấu!\n\n" +
        "Cần ít nhất 1 đội thắng 2 sets (tỷ số 2-0 hoặc 2-1).\n\n" +
        "Vui lòng tiếp tục cập nhật điểm.");
      return;
    }
    
    Object.assign(payload, { s1a:s1A, s1b:s1B, s2a:s2A, s2b:s2B, s3a:s3A, s3b:s3B,
                              score_a: winsA, score_b: winsB });
  } else {
    // For group stage matches with inline scoring, get scores from database/state
    if (m) {
      payload.score_a = m.score_a !== undefined ? m.score_a : (m.scoreA || 0);
      payload.score_b = m.score_b !== undefined ? m.score_b : (m.scoreB || 0);
    } else {
      payload.score_a = parseInt(getInput(id, "scoreA"), 10) || 0;
      payload.score_b = parseInt(getInput(id, "scoreB"), 10) || 0;
    }
    
    // Validate: cannot finish with tied score
    if (payload.score_a === payload.score_b) {
      alert("Chưa thể kết thúc trận đấu!\n\n" +
        "Điểm số đang hòa. Cần có đội thắng trước khi kết thúc.\n\n" +
        "Vui lòng tiếp tục cập nhật điểm.");
      return;
    }
  }

  if (!db) {
    if (!m) return;
    Object.assign(m, payload);
    saveLocal(localMatches);
    // Remove from open set BEFORE re-render so restoreOpenCards doesn't re-open it
    if (typeof _openCards !== "undefined") _openCards.delete(id);
    renderMatches(localMatches);
    calculateStandings(localMatches);
    setStatus(t("matchFinished"), "ok");
    return;
  }

  const conflict = await checkConflict(id);
  if (conflict) { handleConflict(id); return; }

  const { error } = await db.from("matches").update(payload).eq("id", id);
  if (error) {
    showError(error, t('errFinishMatch'));
    return;
  }

  _knownUpdatedAt[id] = payload.updated_at;
  // Remove from open set so when realtime triggers fetchMatches → re-render,
  // the card stays collapsed in its new sorted position
  if (typeof _openCards !== "undefined") _openCards.delete(id);
  setStatus(t("matchFinished"), "ok");
  
  // Force refresh to update standings and re-sort matches
  await fetchMatches();
}

// ── Mark done (legacy alias → finishMatch) ────────────────────
async function markDone(id) {
  return finishMatch(id);
}

// ── Calculate standings (group stage only) ────────────────────
// Ranking rules:
//   1. Points (1pt per win, 0 per loss) DESC
//   2. Point Difference DESC
//   3. Head-to-head wins
//   4. Head-to-head point diff
function calculateStandings(matches) {
  const groupMatches = matches.filter(m => !m.stage || m.stage === "group");
  const groups = {};

  groupMatches.forEach(m => {
    if (!groups[m.group_name]) groups[m.group_name] = {};
    [m.teamA, m.teamB].forEach(t => {
      if (!groups[m.group_name][t])
        groups[m.group_name][t] = { wins:0, losses:0, points:0, diff:0, played:0 };
    });
  });

  const doneMatches = groupMatches.filter(m => m.status === "done");
  doneMatches.forEach(m => {
    const g = m.group_name;
    const a = groups[g][m.teamA], b = groups[g][m.teamB];
    a.played++; b.played++;
    if (m.scoreA > m.scoreB)      { a.wins++; a.points++; b.losses++; }
    else if (m.scoreB > m.scoreA) { b.wins++; b.points++; a.losses++; }
    a.diff += (m.scoreA - m.scoreB);
    b.diff += (m.scoreB - m.scoreA);
  });

  // Sort with tiebreakers per group
  const sortedGroups = {};
  const tieBreakInfo = {}; // Track tie-break explanations
  
  Object.keys(groups).forEach(g => {
    const teams = Object.entries(groups[g])
      .map(([name, s]) => ({ name, ...s }));

    tieBreakInfo[g] = [];

    // Sort with CORRECT tiebreaker chain
    teams.sort((a, b) => {
      // 1. POINTS DESC (1pt per win, 0 per loss)
      const pa = a.points ?? a.wins;
      const pb = b.points ?? b.wins;
      if (pb !== pa) return pb - pa;

      // 2. POINT DIFFERENCE DESC
      if (b.diff !== a.diff) return b.diff - a.diff;

      // 3. HEAD-TO-HEAD wins between tied teams
      const h2hA = getH2HWins(a.name, b.name, doneMatches, g);
      const h2hB = getH2HWins(b.name, a.name, doneMatches, g);
      if (h2hA !== h2hB) {
        // Record explanation when both points AND diff are tied — admin needs to see why
        tieBreakInfo[g].push({
          team1: h2hB > h2hA ? b.name : a.name,
          team2: h2hB > h2hA ? a.name : b.name,
          reason: 'head-to-head'
        });
        return h2hB - h2hA;
      }

      // 4. H2H point diff
      const h2hDiffA = getH2HDiff(a.name, b.name, doneMatches, g);
      const h2hDiffB = getH2HDiff(b.name, a.name, doneMatches, g);
      if (h2hDiffB !== h2hDiffA) {
        tieBreakInfo[g].push({
          team1: h2hDiffB > h2hDiffA ? b.name : a.name,
          team2: h2hDiffB > h2hDiffA ? a.name : b.name,
          reason: 'h2h-diff'
        });
        return h2hDiffB - h2hDiffA;
      }
      return 0;
    });

    sortedGroups[g] = teams;
  });

  renderStandings(sortedGroups, tieBreakInfo);
}

// H2H: số trận thắng của teamA khi đấu trực tiếp với teamB
function getH2HWins(teamA, teamB, matches, group) {
  let wins = 0;
  matches.forEach(m => {
    if (m.group_name !== group) return;
    if (m.teamA === teamA && m.teamB === teamB && m.scoreA > m.scoreB) wins++;
    if (m.teamA === teamB && m.teamB === teamA && m.scoreB > m.scoreA) wins++;
  });
  return wins;
}

// H2H: hiệu số của teamA khi đấu trực tiếp với teamB
function getH2HDiff(teamA, teamB, matches, group) {
  let diff = 0;
  matches.forEach(m => {
    if (m.group_name !== group) return;
    if (m.teamA === teamA && m.teamB === teamB) diff += (m.scoreA - m.scoreB);
    if (m.teamA === teamB && m.teamB === teamA) diff += (m.scoreB - m.scoreA);
  });
  return diff;
}

// ── Render standings ──────────────────────────────────────────
function renderStandings(groups, tieBreakInfo = {}) {
  const container = document.getElementById("standings-container");
  if (!container) return;

  if (!Object.keys(groups).length) {
    container.innerHTML = '<p class="empty-state">No standings yet.</p>';
    return;
  }

  const medals = ["🥇","🥈","🥉"];

  let html = '<div class="standings-grid">';
  Object.keys(groups).sort().forEach(g => {
    const teams = groups[g]; // already sorted

    html += `
      <div class="standings-group-card">
        <div class="standings-group-title">${t("groupLabel")} ${esc(g)}</div>
        <table class="standings-table">
          <thead><tr>
            <th>${t("standingsTeam")}</th>
            <th title="${t("ptsTooltip")}">${t("standingsPts")}</th>
            <th>${t("standingsW")}</th>
            <th>${t("standingsL")}</th>
            <th>${t("standingsDiff")}</th>
          </tr></thead>
          <tbody>`;

    teams.forEach((team, i) => {
      const rankCls = i === 0 ? "rank-1" : i === 1 ? "rank-2" : "";
      const medal   = medals[i]
        ? `<span class="rank-medal">${medals[i]}</span>`
        : `<span class="rank-medal" style="opacity:0">·</span>`;
      const pts = team.points ?? team.wins;
      html += `<tr class="${rankCls}">
        <td>${medal}${esc(team.name)}</td>
        <td style="font-weight:800;color:var(--green)">${pts}</td>
        <td>${team.wins}</td>
        <td>${team.losses}</td>
        <td>${team.diff > 0 ? "+" : ""}${team.diff}</td>
      </tr>`;
    });

    html += `</tbody></table>`;

    // Tie-break explanation: surfaces every time H2H or H2H-diff decided the order
    if (tieBreakInfo[g] && tieBreakInfo[g].length > 0) {
      html += `<div class="tie-break-info">`;
      tieBreakInfo[g].forEach(tb => {
        const reasonText = tb.reason === 'head-to-head' ? t('tbH2H')
                        : tb.reason === 'h2h-diff'      ? t('tbH2HDiff')
                        : tb.reason === 'point-diff'    ? t('tbDiff')
                        : '';
        html += `<div class="tie-break-line">ℹ️ ${t('tbRanksAbove', { a: esc(tb.team1), b: esc(tb.team2), reason: reasonText })}</div>`;
      });
      html += `</div>`;
    }

    html += `<div class="standings-note">${t("standingsSortHint")}</div>
    </div>`;
  });

  html += "</div>";
  container.innerHTML = html;
}

// ── Realtime subscription + polling fallback ─────────────────
let _pollTimer    = null;
let _rtConnected  = false;
let _reconnectAttempts = 0;
let _realtimeFetchDebounce = null; // Debounce realtime fetch to avoid interrupting edits
let _isEditingScore = false; // Track if admin is currently editing scores
const POLL_MS_DEMO = 1000; // demo mode: poll every 1s (cross-tab localStorage sync)
const POLL_MS_RT   = 5000; // realtime fallback: poll every 5s
const MAX_RECONNECT_ATTEMPTS = 3;

function subscribeRealtime() {
  if (!db) {
    // Demo mode — only the PUBLIC page polls localStorage (to pick up admin's saves).
    // The admin page writes directly to localStorage, so it never needs to poll itself.
    const isAdminPage = window.location.pathname.includes("admin");
    if (!isAdminPage) {
      startPolling(POLL_MS_DEMO);
    }
    return;
  }

  realtimeChannel = db
    .channel("matches-channel")
    .on("postgres_changes",
      { event: "*", schema: "public", table: "matches" },
      () => {
        // Skip fetch if admin is currently editing scores
        if (_isEditingScore) return;
        // Debounce fetchMatches to avoid interrupting admin edits
        clearTimeout(_realtimeFetchDebounce);
        _realtimeFetchDebounce = setTimeout(() => {
          fetchMatches();
        }, 2000); // Wait 2 seconds before fetching (longer than save debounce)
      }
    )
    .subscribe(status => {
      if (status === "SUBSCRIBED") {
        _rtConnected = true;
        _reconnectAttempts = 0;
        stopPolling();
        const ri = document.getElementById("realtime-indicator");
        if (ri) ri.style.display = "inline-block";
        // Only show success message on first connect or after reconnect
        if (_reconnectAttempts === 0) {
          setStatus(t("realtimeActive"), "ok");
        }
      }
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        _rtConnected = false;
        const ri = document.getElementById("realtime-indicator");
        if (ri) ri.style.display = "none";
        
        // Only show error message if not auto-reconnecting
        if (_reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          _reconnectAttempts++;
          // Try to reconnect silently
          setTimeout(() => {
            if (!_rtConnected && realtimeChannel) {
              realtimeChannel.unsubscribe();
              subscribeRealtime();
            }
          }, 2000); // Wait 2s before retry
        } else {
          // After max attempts, show message and use polling
          setStatus(t("realtimeLost"), "err");
          startPolling(POLL_MS_RT);
        }
      }
    });
}

function startPolling(intervalMs) {
  if (_pollTimer) return; // already running
  _pollTimer = setInterval(() => {
    fetchMatches();
    if (_rtConnected) stopPolling();
  }, intervalMs || POLL_MS_RT);
}

function stopPolling() {
  if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
}

// ── Helpers ───────────────────────────────────────────────────
function esc(str) {
  return String(str ?? "")
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function getInput(id, field) {
  const el = document.querySelector(`input[data-id="${id}"][data-field="${field}"]`);
  return el ? el.value : "0";
}

function flashSaved(id) {
  // Works for both public match-item and admin adm-match-card
  const row = document.querySelector(`.match-item[data-id="${id}"], .adm-match-card[data-id="${id}"]`);
  if (!row) return;
  row.classList.add("flash-ok");
  setTimeout(() => row.classList.remove("flash-ok"), 600);
}

// ── Reset all data ────────────────────────────────────────────
async function resetDemo() {
  if (!confirm("Reset toàn bộ dữ liệu?\nTất cả điểm số, bán kết và chung kết sẽ bị xóa.")) return;

  if (!db) {
    localStorage.removeItem("pb_matches");
    localMatches = null;
    fetchMatches();
    setStatus("Data reset ✓", "ok");
    return;
  }

  setStatus("Đang reset…", "");

  // 1. Delete semi + final
  await db.from("matches").delete().eq("stage", "semi");
  await db.from("matches").delete().eq("stage", "final");

  // 2. Reset all group matches to not_started, zero scores
  const { error } = await db.from("matches").update({
    score_a: 0, score_b: 0, status: "not_started",
    s1a: 0, s1b: 0, s2a: 0, s2b: 0, s3a: 0, s3b: 0,
    serving_team: null, server_number: null,
    updated_at: new Date().toISOString()
  }).eq("stage", "group");

  if (error) { 
    setStatus("❌ Không thể reset dữ liệu", "err"); 
    return; 
  }

  setStatus("Reset xong ✓", "ok");
  fetchMatches();
}

// ── Collapse a card (used after finishMatch) ─────────────────
// collapseCard is called from app.js but acts on admin.js's _openCards
function collapseCard(id) {
  if (typeof _openCards !== "undefined") {
    _openCards.delete(id);
  }
  const body = document.getElementById(`body-${id}`);
  const icon = document.getElementById(`icon-${id}`);
  if (body) body.style.display = "none";
  if (icon) icon.textContent = "▶";
}

// ── Public bracket renderer (used on index.html — admin.js not loaded) ──
function renderPublicBracket(container, matches) {
  const semis  = matches.filter(m => m.stage === "semi");
  const finals = matches.filter(m => m.stage === "final");
  const getWinner = m => m.status === "done" ? (m.scoreA >= m.scoreB ? m.teamA : m.teamB) : null;
  
  // Always show bracket structure (even before matches are generated)
  let html = '<div class="bracket-wrap">';

  // ── SEMIFINALS COLUMN ──
  html += `<div class="bracket-col"><div class="bracket-col-title">${t("bracketSemi")}</div>`;
  
  if (semis.length >= 2) {
    // Show actual semifinal matches
    semis.forEach(m => {
      const wA = m.status === "done" && m.scoreA > m.scoreB;
      const wB = m.status === "done" && m.scoreB > m.scoreA;
      const isPlaceholder = isTeamPlaceholder(m.teamA) || isTeamPlaceholder(m.teamB);
      html += `<div class="bracket-match-card ${isPlaceholder?"bracket-placeholder":""}">
        <div class="bracket-team-row ${wA?"winner":""} ${isTeamPlaceholder(m.teamA)?"tbd":""}"><span>${esc(m.teamA)}</span><span class="bracket-score-val">${m.status==="done"?m.scoreA:"-"}</span></div>
        <div class="bracket-team-row ${wB?"winner":""} ${isTeamPlaceholder(m.teamB)?"tbd":""}"><span>${esc(m.teamB)}</span><span class="bracket-score-val">${m.status==="done"?m.scoreB:"-"}</span></div>
      </div>`;
    });
  } else {
    // Show placeholders before semis are generated
    html += `
      <div class="bracket-match-card bracket-placeholder">
        <div class="bracket-team-row tbd"><span>${t("bracketPlaceholder1A")}</span></div>
        <div class="bracket-team-row tbd"><span>${t("bracketPlaceholder2B")}</span></div>
      </div>
      <div class="bracket-match-card bracket-placeholder">
        <div class="bracket-team-row tbd"><span>${t("bracketPlaceholder1B")}</span></div>
        <div class="bracket-team-row tbd"><span>${t("bracketPlaceholder2A")}</span></div>
      </div>`;
  }
  html += '</div><div class="bracket-arrow">→</div>';

  // ── FINAL COLUMN ──
  html += `<div class="bracket-col"><div class="bracket-col-title">${t("bracketFinal")}</div>`;
  
  if (finals.length > 0) {
    // Show actual final match
    finals.forEach(m => {
      const wA = m.status === "done" && m.scoreA > m.scoreB;
      const wB = m.status === "done" && m.scoreB > m.scoreA;
      const isPlaceholder = isTeamPlaceholder(m.teamA) || isTeamPlaceholder(m.teamB);
      html += `<div class="bracket-match-card ${isPlaceholder?"bracket-placeholder":""}">
        <div class="bracket-team-row ${wA?"winner":""} ${isTeamPlaceholder(m.teamA)?"tbd":""}"><span>${esc(m.teamA)}</span><span class="bracket-score-val">${m.status==="done"?m.scoreA:"-"}</span></div>
        <div class="bracket-team-row ${wB?"winner":""} ${isTeamPlaceholder(m.teamB)?"tbd":""}"><span>${esc(m.teamB)}</span><span class="bracket-score-val">${m.status==="done"?m.scoreB:"-"}</span></div>
      </div>`;
    });
  } else {
    // Show placeholder before final is generated
    const w1 = semis[0] ? getWinner(semis[0]) : null;
    const w2 = semis[1] ? getWinner(semis[1]) : null;
    html += `<div class="bracket-match-card bracket-placeholder">
      <div class="bracket-team-row ${w1?"":"tbd"}"><span>${w1 || t("bracketWinnerSF1")}</span></div>
      <div class="bracket-team-row ${w2?"":"tbd"}"><span>${w2 || t("bracketWinnerSF2")}</span></div>
    </div>`;
  }
  html += '</div>';

  // ── CHAMPION (only if final is done) ──
  if (finals.length && finals[0].status === "done") {
    const champ = finals[0].scoreA >= finals[0].scoreB ? finals[0].teamA : finals[0].teamB;
    html += `<div class="bracket-arrow">→</div>
      <div class="bracket-col"><div class="bracket-col-title">Champion</div>
        <div class="champion-card">
          <div class="champion-label">${t("bracketChamp")}</div>
          <div class="champion-name">${esc(champ)}</div>
        </div>
      </div>`;
  }
  
  html += '</div>';
  container.innerHTML = html;
}

// ── Helper: Check if team name is a placeholder ──
function isTeamPlaceholder(teamName) {
  if (!teamName) return true;
  const placeholders = [
    "Winner", "Thắng", "Nhất", "Nhì", "TBD", "1st", "2nd",
    t("bracketPlaceholder1A"), t("bracketPlaceholder2B"),
    t("bracketPlaceholder1B"), t("bracketPlaceholder2A"),
    t("bracketWinnerSF1"), t("bracketWinnerSF2")
  ];
  return placeholders.some(p => teamName.includes(p));
}

// ── Toggle public group collapse ──────────────────────────────
function togglePubGroup(g) {
  const grp  = document.getElementById(`pub-grp-${g}`);
  const icon = document.getElementById(`pub-icon-${g}`);
  if (!grp) return;
  const hidden = grp.style.display === "none";
  grp.style.display = hidden ? "contents" : "none";
  if (icon) icon.textContent = hidden ? "▼" : "▶";
}

// Auto-collapse all public groups (called when all group matches are done)
function collapseAllPubGroups() {
  document.querySelectorAll("[id^='pub-grp-']").forEach(grp => {
    const g = grp.id.replace("pub-grp-", "");
    grp.style.display = "none";
    const icon = document.getElementById(`pub-icon-${g}`);
    if (icon) icon.textContent = "▶";
  });
}

// ── Toggle match expand (click to zoom) ──────────────────────
function toggleMatchExpand(id) {
  const clickedCard = document.querySelector(`.match-card[data-id="${id}"]`);
  if (!clickedCard) return;

  const isExpanded = clickedCard.classList.contains('match-expanded');
  
  // Remove expanded class from all cards
  document.querySelectorAll('.match-card').forEach(card => {
    card.classList.remove('match-expanded');
  });

  // If the clicked card wasn't expanded, expand it
  if (!isExpanded) {
    clickedCard.classList.add('match-expanded');
  }
}

// ── Setup match card click handlers ───────────────────────────
function setupMatchCardHandlers() {
  // Use event delegation on match grid containers
  const containers = ['match-list-group', 'match-list-semi', 'match-list-final'];
  
  containers.forEach(containerId => {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Remove old listener if exists
    container.removeEventListener('click', handleMatchCardClick);
    // Add new listener
    container.addEventListener('click', handleMatchCardClick);
  });
}

function handleMatchCardClick(e) {
  // Find the closest match-card element
  const card = e.target.closest('.match-card');
  if (!card) return;
  
  const matchId = card.getAttribute('data-id');
  if (matchId) {
    toggleMatchExpand(matchId);
  }
}

// ── Boot (public page only) ───────────────────────────────────
// admin.html boots via admin.js instead — we detect by filename.
if (!window.location.pathname.includes("admin")) {
  document.addEventListener("DOMContentLoaded", () => {
    const connected = initSupabase();
    
    // Load tournament selector for public view
    loadPublicTournamentSelector();
    
    fetchMatches();
    subscribeRealtime(); // always — handles both realtime + polling fallback
    
    // Setup click handlers after initial render
    setTimeout(setupMatchCardHandlers, 500);
    
    // Initialize auto-backup toggle (loads saved preference)
    initAutoBackupToggle();
  });
}

// ── Public Tournament Selector ───────────────────────────────
async function loadPublicTournamentSelector() {
  try {
    // Initialize storage and tournament manager
    if (typeof storage === 'undefined' || !storage) {
      window.storage = new StorageAdapter(db);
    }
    if (typeof tournamentManager === 'undefined' || !tournamentManager) {
      window.tournamentManager = new TournamentManager(storage);
    }

    const tournaments = await tournamentManager.getAllTournaments();
    const select = document.getElementById('public-tournament-select');
    
    if (!select) return; // Not on public page
    
    if (tournaments.length === 0) {
      select.innerHTML = '<option value="">Chưa có giải đấu nào</option>';
      return;
    }

    // Get active tournament ID or default to ongoing/upcoming
    let activeId = tournamentManager.getActiveTournamentId();
    
    // If no active, default to ongoing, then upcoming
    if (!activeId) {
      const ongoing = tournaments.find(t => t.status === 'ongoing');
      const upcoming = tournaments.find(t => t.status === 'upcoming');
      activeId = (ongoing || upcoming || tournaments[0]).id;
    }

    // Populate dropdown (only show ongoing tournaments for public view)
    const ongoingTournaments = tournaments.filter(t => !t.archived && t.status === 'ongoing');
    
    if (ongoingTournaments.length === 0) {
      select.innerHTML = '<option value="">Không có giải đấu nào đang diễn ra</option>';
      return;
    }
    
    select.innerHTML = ongoingTournaments
      .map(t => `
        <option value="${t.id}" ${t.id == activeId ? 'selected' : ''}>
          ${t.name}
        </option>
      `).join('');

    // Set active tournament to first ongoing if current active is not ongoing
    const currentTournament = tournaments.find(t => t.id == activeId);
    if (!currentTournament || currentTournament.status !== 'ongoing') {
      activeId = ongoingTournaments[0].id;
    }
    
    // Set active tournament
    if (activeId) {
      await switchPublicTournament(activeId);
    }
  } catch (error) {
    console.error('Error loading tournaments:', error);
  }
}

async function switchPublicTournament(tournamentId) {
  if (!tournamentId) return;
  
  try {
    await tournamentManager.setActiveTournament(tournamentId);
    
    // Update status display
    const tournament = await tournamentManager.getTournament(tournamentId);
    const statusEl = document.getElementById('public-tournament-status');
    if (statusEl && tournament) {
      const statusMap = {
        'upcoming': 'Sắp diễn ra',
        'ongoing': 'Đang diễn ra',
        'completed': 'Đã kết thúc'
      };
      statusEl.textContent = statusMap[tournament.status] || tournament.status;
      
      // Update status color
      statusEl.style.background = tournament.status === 'ongoing' ? '#d4edda' : 
                                  tournament.status === 'upcoming' ? '#fff3cd' : '#d1ecf1';
      statusEl.style.color = tournament.status === 'ongoing' ? '#155724' : 
                            tournament.status === 'upcoming' ? '#856404' : '#0c5460';
    }
    
    // Reload matches for selected tournament
    await fetchMatches();
    
    setStatus('Đã chuyển giải đấu', 'ok');
  } catch (error) {
    setStatus('Lỗi khi chuyển giải đấu: ' + error.message, 'err');
  }
}

// ── Auto Backup Timer ─────────────────────────────────────────
let _autoBackupTimer = null;
let _autoBackupEnabled = false; // Track if auto-backup is enabled
const AUTO_BACKUP_INTERVAL = 30 * 60 * 1000; // 30 minutes in milliseconds
const AUTO_BACKUP_PREF_KEY = "pb_auto_backup_enabled"; // localStorage key

function initAutoBackupToggle() {
  // Load saved preference from localStorage
  const saved = localStorage.getItem(AUTO_BACKUP_PREF_KEY);
  _autoBackupEnabled = saved === "true"; // Default is false
  
  // Update checkbox state
  const toggle = document.getElementById("auto-backup-toggle");
  if (toggle) {
    toggle.checked = _autoBackupEnabled;
  }
  
  // Start timer if enabled
  if (_autoBackupEnabled) {
    startAutoBackup();
  }
}

function toggleAutoBackup(enabled) {
  _autoBackupEnabled = enabled;
  
  // Save preference to localStorage
  localStorage.setItem(AUTO_BACKUP_PREF_KEY, enabled ? "true" : "false");
  
  if (enabled) {
    startAutoBackup();
    setStatus(t("autoBackupOn"), "ok");
  } else {
    stopAutoBackup();
    setStatus(t("autoBackupOff"), "ok");
  }
}

function startAutoBackup() {
  // Clear existing timer if any
  if (_autoBackupTimer) {
    clearInterval(_autoBackupTimer);
  }
  
  // Calculate time until next 30-minute mark (system time)
  const now = new Date();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  const milliseconds = now.getMilliseconds();
  
  // Calculate minutes until next 00 or 30
  let minutesUntilNext;
  if (minutes < 30) {
    minutesUntilNext = 30 - minutes;
  } else {
    minutesUntilNext = 60 - minutes;
  }
  
  // Calculate exact milliseconds until next backup time
  const msUntilNext = (minutesUntilNext * 60 * 1000) - (seconds * 1000) - milliseconds;
  
  // Schedule first backup at next 30-minute mark
  setTimeout(() => {
    exportBackup(true);
    _autoBackupTimer = setInterval(() => {
      exportBackup(true);
    }, AUTO_BACKUP_INTERVAL);
  }, msUntilNext);
}

function stopAutoBackup() {
  if (_autoBackupTimer) {
    clearInterval(_autoBackupTimer);
    _autoBackupTimer = null;
  }
}

// ── Export Backup ─────────────────────────────────────────────
async function exportBackup(silent = false) {
  if (!silent) {
    setStatus("Đang tạo file backup...", "");
  }
  
  // Fetch latest data
  let matches = [];
  if (!db) {
    const stored = localStorage.getItem("pb_matches");
    matches = stored ? JSON.parse(stored) : [];
  } else {
    const { data, error } = await db.from("matches").select("*").order("group_name");
    if (error) {
      if (!silent) {
        setStatus("❌ Không thể tải dữ liệu", "err");
        alert("Không thể tạo backup!\n\nVui lòng thử lại.");
      }
      console.error('Auto-backup: Failed to fetch data', error);
      return;
    }
    matches = data || [];
  }

  // Generate HTML backup file
  const html = generateBackupHTML(matches);
  
  // Create and download file
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  
  // Filename with timestamp
  const now = new Date();
  const timestamp = now.toISOString().slice(0, 19).replace(/:/g, '-');
  a.download = `pickleball-backup-${timestamp}.html`;
  
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  if (!silent) {
    setStatus(t("backupSuccess"), "ok");
  }
}

function generateBackupHTML(matches) {
  const now = new Date();
  const dateStr = now.toLocaleString('vi-VN', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  // Separate matches by stage
  const groupMatches = matches.filter(m => !m.stage || m.stage === "group");
  const semiMatches = matches.filter(m => m.stage === "semi");
  const finalMatches = matches.filter(m => m.stage === "final");

  // Calculate standings
  const standings = calculateStandingsForBackup(groupMatches);

  // Build HTML
  let html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t("backupTitle")} - ${dateStr}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      padding: 20px;
      background: #f5f5f5;
      color: #333;
      line-height: 1.6;
    }
    .container { max-width: 900px; margin: 0 auto; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    h1 { color: #059669; margin-bottom: 8px; font-size: 1.8rem; }
    .backup-date { color: #666; font-size: 0.9rem; margin-bottom: 30px; }
    h2 { color: #047857; margin: 30px 0 15px; font-size: 1.4rem; border-bottom: 2px solid #059669; padding-bottom: 8px; }
    h3 { color: #065f46; margin: 20px 0 10px; font-size: 1.1rem; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f0fdf4; color: #065f46; font-weight: 600; }
    tr:hover { background: #f9fafb; }
    .match-card { background: #f9fafb; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #d1d5db; }
    .match-card.done { border-left-color: #059669; }
    .match-card.playing { border-left-color: #f59e0b; background: #fffbeb; }
    .match-teams { font-weight: 600; font-size: 1.05rem; margin-bottom: 8px; }
    .match-score { font-size: 1.3rem; color: #059669; font-weight: 700; margin: 8px 0; }
    .match-sets { font-size: 0.9rem; color: #666; margin: 5px 0; }
    .match-info { font-size: 0.85rem; color: #666; margin-top: 8px; }
    .status-badge { display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 0.8rem; font-weight: 600; }
    .status-done { background: #d1fae5; color: #065f46; }
    .status-playing { background: #fef3c7; color: #92400e; }
    .status-ns { background: #e5e7eb; color: #6b7280; }
    .winner { color: #059669; font-weight: 700; }
    .rank-1 { background: #fef3c7; }
    .rank-2 { background: #dbeafe; }
    .empty { color: #9ca3af; font-style: italic; padding: 20px; text-align: center; }
    @media print {
      body { background: white; }
      .container { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>${PICKLEBALL_SVG} ${t("backupTitle")}</h1>
    <div class="backup-date">📅 ${t("backupDate")}: ${dateStr}</div>
`;

  // ── STANDINGS ──
  html += `<h2>📊 ${t("backupStandings")}</h2>`;
  if (Object.keys(standings).length === 0) {
    html += `<p class="empty">Chưa có dữ liệu xếp hạng.</p>`;
  } else {
    Object.keys(standings).sort().forEach(group => {
      html += `<h3>${t("groupLabel")} ${esc(group)}</h3>`;
      html += `<table><thead><tr>
        <th>#</th>
        <th>${t("standingsTeam")}</th>
        <th>${t("standingsW")}</th>
        <th>${t("standingsL")}</th>
        <th>${t("standingsDiff")}</th>
      </tr></thead><tbody>`;
      
      standings[group].forEach((team, idx) => {
        const rankClass = idx === 0 ? "rank-1" : idx === 1 ? "rank-2" : "";
        const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : "";
        html += `<tr class="${rankClass}">
          <td>${medal || (idx + 1)}</td>
          <td>${esc(team.name)}</td>
          <td>${team.wins}</td>
          <td>${team.losses}</td>
          <td>${team.diff > 0 ? "+" : ""}${team.diff}</td>
        </tr>`;
      });
      
      html += `</tbody></table>`;
    });
  }

  // ── GROUP MATCHES ──
  html += `<h2>📋 ${t("groupStage")}</h2>`;
  if (groupMatches.length === 0) {
    html += `<p class="empty">Không có trận đấu vòng bảng.</p>`;
  } else {
    const groups = {};
    groupMatches.forEach(m => {
      if (!groups[m.group_name]) groups[m.group_name] = [];
      groups[m.group_name].push(m);
    });
    
    Object.keys(groups).sort().forEach(g => {
      html += `<h3>${t("groupLabel")} ${esc(g)}</h3>`;
      groups[g].forEach(m => {
        html += formatMatchCard(m);
      });
    });
  }

  // ── SEMIFINALS ──
  if (semiMatches.length > 0) {
    html += `<h2>⚡ ${t("semifinals")}</h2>`;
    semiMatches.forEach(m => {
      html += formatMatchCard(m);
    });
  }

  // ── FINAL ──
  if (finalMatches.length > 0) {
    html += `<h2>🏆 ${t("final")}</h2>`;
    finalMatches.forEach(m => {
      html += formatMatchCard(m);
    });
  }

  html += `
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 0.85rem;">
      <p>Backup được tạo tự động từ hệ thống Pickleball Tournament</p>
      <p>${PICKLEBALL_SVG} HTC Pickleball</p>
    </div>
  </div>
</body>
</html>`;

  return html;
}

function formatMatchCard(m) {
  const done = m.status === "done";
  const playing = m.status === "playing";
  const winnerA = done && m.scoreA > m.scoreB;
  const winnerB = done && m.scoreB > m.scoreA;
  
  const cardClass = done ? "done" : playing ? "playing" : "";
  const statusBadge = done 
    ? `<span class="status-badge status-done">✓ ${t("statusDone")}</span>`
    : playing 
    ? `<span class="status-badge status-playing">● ${t("statusPlaying")}</span>`
    : `<span class="status-badge status-ns">◌ ${t("statusNs")}</span>`;

  let setsHTML = "";
  if (m.stage === "semi" || m.stage === "final") {
    const s1a = m.s1A || m.s1a || 0, s1b = m.s1B || m.s1b || 0;
    const s2a = m.s2A || m.s2a || 0, s2b = m.s2B || m.s2b || 0;
    const s3a = m.s3A || m.s3a || 0, s3b = m.s3B || m.s3b || 0;
    
    if (s1a > 0 || s1b > 0 || s2a > 0 || s2b > 0 || s3a > 0 || s3b > 0) {
      const sets = [];
      if (s1a > 0 || s1b > 0) sets.push(`Set 1: ${s1a}-${s1b}`);
      if (s2a > 0 || s2b > 0) sets.push(`Set 2: ${s2a}-${s2b}`);
      if (s3a > 0 || s3b > 0) sets.push(`Set 3: ${s3a}-${s3b}`);
      setsHTML = `<div class="match-sets">${sets.join(" | ")}</div>`;
    }
  }

  let infoHTML = "";
  if (m.match_time || m.court || m.referee) {
    const parts = [];
    if (m.match_time) parts.push(`🕐 ${esc(m.match_time)}`);
    if (m.court) parts.push(`🏟 ${esc(m.court)}`);
    if (m.referee) parts.push(`👤 ${esc(m.referee)}`);
    infoHTML = `<div class="match-info">${parts.join(" · ")}</div>`;
  }

  return `
    <div class="match-card ${cardClass}">
      ${statusBadge}
      <div class="match-teams">
        <span class="${winnerA ? "winner" : ""}">${esc(m.teamA)}</span>
        <span style="color: #9ca3af;"> vs </span>
        <span class="${winnerB ? "winner" : ""}">${esc(m.teamB)}</span>
      </div>
      <div class="match-score">${m.scoreA} : ${m.scoreB}</div>
      ${setsHTML}
      ${infoHTML}
    </div>`;
}

function calculateStandingsForBackup(groupMatches) {
  const groups = {};

  // Register all teams
  groupMatches.forEach(m => {
    if (!groups[m.group_name]) groups[m.group_name] = {};
    [m.teamA, m.teamB].forEach(t => {
      if (!groups[m.group_name][t])
        groups[m.group_name][t] = { wins:0, losses:0, diff:0 };
    });
  });

  // Tally done matches
  const doneMatches = groupMatches.filter(m => m.status === "done");
  doneMatches.forEach(m => {
    const g = m.group_name;
    const a = groups[g][m.teamA], b = groups[g][m.teamB];
    if (m.scoreA > m.scoreB)      { a.wins++; b.losses++; }
    else if (m.scoreB > m.scoreA) { b.wins++; a.losses++; }
    a.diff += (m.scoreA - m.scoreB);
    b.diff += (m.scoreB - m.scoreA);
  });

  // Sort teams
  const sortedGroups = {};
  Object.keys(groups).forEach(g => {
    const teams = Object.entries(groups[g])
      .map(([name, s]) => ({ name, ...s }));
    
    teams.sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.diff !== a.diff) return b.diff - a.diff;
      const h2hA = getH2HWins(a.name, b.name, doneMatches, g);
      const h2hB = getH2HWins(b.name, a.name, doneMatches, g);
      if (h2hA !== h2hB) return h2hB - h2hA;
      const h2hDiffA = getH2HDiff(a.name, b.name, doneMatches, g);
      const h2hDiffB = getH2HDiff(b.name, a.name, doneMatches, g);
      return h2hDiffB - h2hDiffA;
    });

    sortedGroups[g] = teams;
  });

  return sortedGroups;
}
