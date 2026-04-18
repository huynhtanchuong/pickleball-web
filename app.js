// ============================================================
//  Pickleball Tournament — app.js
//  Replace SUPABASE_URL and SUPABASE_ANON_KEY before use.
// ============================================================

const SUPABASE_URL      = "https://negwxhrkdypiopmmrxkf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lZ3d4aHJrZHlwaW9wbW1yeGtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0MzQwMjEsImV4cCI6MjA5MjAxMDAyMX0.5f_1qyXfEvcDxVQAtiaMVBT7K7nz7MtDM8sN50V0O14";

// ── Supabase client ──────────────────────────────────────────
let db = null;
let realtimeChannel = null;

// ── Admin check ───────────────────────────────────────────────
// Inlined string — no const, avoids duplicate-declaration crash
// when admin.js (which owns ADMIN_KEY) is also loaded on admin.html.
function isAdmin() {
  return localStorage.getItem("pb_admin_auth") === "true";
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
    setStatus(t("connected"), "ok");
    return true;
  } catch (e) {
    setStatus("Supabase init failed: " + e.message, "err");
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
  
  el.style.display = "inline-block";
  el.textContent = msg;
  el.className = type;
  if (_statusTimer) clearTimeout(_statusTimer);
  if (type === "ok") {
    _statusTimer = setTimeout(() => {
      el.textContent = db ? t("connected") : t("demoMode");
      el.className = db ? "ok" : "err";
    }, 3000);
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

// ── Fetch matches ─────────────────────────────────────────────
async function fetchMatches() {
  if (!db) {
    // Always re-read from localStorage so cross-tab updates (admin → public) are picked up.
    // The in-memory localMatches is only used as a write buffer; source of truth is localStorage.
    const stored = localStorage.getItem("pb_matches");
    if (stored) {
      localMatches = JSON.parse(stored);
    } else {
      localMatches = JSON.parse(JSON.stringify(SAMPLE_MATCHES));
      saveLocal(localMatches);
    }
    renderMatches(localMatches);
    calculateStandings(localMatches);
    storeUpdatedAt(localMatches);
    return;
  }

  const { data, error } = await db.from("matches").select("*").order("group_name");
  if (error) { setStatus("Fetch error: " + error.message, "err"); return; }

  if (!data || data.length === 0) {
    await seedMatches();
    return;
  }

  renderMatches(data);
  calculateStandings(data);
  storeUpdatedAt(data); // track timestamps for conflict detection
}

async function seedMatches() {
  if (!db) return;
  const rows = SAMPLE_MATCHES.map(({ id, ...rest }) => rest);
  const { error } = await db.from("matches").insert(rows);
  if (error) { setStatus("Seed error: " + error.message, "err"); return; }
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
  const wA = isDone && featured.scoreA > featured.scoreB;
  const wB = isDone && featured.scoreB > featured.scoreA;

  const stageLabel = featured.stage === "final" ? t("champFinal")
                   : featured.stage === "semi"  ? t("semifinal")
                   : t("groupLabel") + " " + (featured.group_name || "");

  box.innerHTML = `
    <div class="feat-team ${wA ? "feat-winner" : ""}">
      <span class="feat-name">${esc(featured.teamA)}</span>
    </div>
    <div class="feat-scores">
      <span class="feat-score ${wA ? "feat-score-win" : ""}">${featured.scoreA}</span>
      <span class="feat-divider">:</span>
      <span class="feat-score ${wB ? "feat-score-win" : ""}">${featured.scoreB}</span>
    </div>
    <div class="feat-team ${wB ? "feat-winner" : ""}">
      <span class="feat-name">${esc(featured.teamB)}</span>
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

  // Match info: time, court, referee
  const infoHtml = (m.match_time||m.court||m.referee) ? `
    <div class="mc-info">
      ${m.match_time ? `<span>🕐 ${esc(m.match_time)}</span>` : ""}
      ${m.court      ? `<span>🏟 ${esc(m.court)}</span>`      : ""}
      ${m.referee    ? `<span>👤 ${esc(m.referee)}</span>`    : ""}
    </div>` : "";

  return `
    <div class="match-card ${cardMod}" data-id="${m.id}">
      <div class="mc-row">
        <span class="mc-team ${winnerA ? "winner" : ""}">${esc(m.teamA)}</span>
        <div class="mc-scores">
          <span class="mc-score ${winnerA ? "winner" : ""}">${m.scoreA}</span>
          <span class="mc-sep">:</span>
          <span class="mc-score ${winnerB ? "winner" : ""}">${m.scoreB}</span>
        </div>
        <span class="mc-team right ${winnerB ? "winner" : ""}">${esc(m.teamB)}</span>
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
  console.log('adjustSetScore called:', { id, field, delta });
  const input = document.querySelector(`input[data-id="${id}"][data-field="${field}"]`);
  if (!input) {
    console.error('adjustSetScore: input not found', { id, field });
    return;
  }
  const oldValue = parseInt(input.value, 10) || 0;
  const newValue = Math.max(0, oldValue + delta);
  console.log('adjustSetScore: updating', { oldValue, newValue });
  input.value = newValue;
  
  // Set editing flag to prevent realtime fetch from interrupting
  _isEditingScore = true;
  
  clearTimeout(_saveDebounce[id]);
  _saveDebounce[id] = setTimeout(() => {
    console.log('adjustSetScore: calling updateScore after debounce');
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
  setStatus("⚠️ Conflict — match updated by another admin", "err");

  // Show inline conflict banner on the card
  const card = document.querySelector(`.adm-match-card[data-id="${id}"]`);
  if (card) {
    // Remove any existing banner
    const old = card.querySelector(".conflict-banner");
    if (old) old.remove();

    const banner = document.createElement("div");
    banner.className = "conflict-banner";
    banner.innerHTML = `
      ⚠️ Updated by another admin.
      <button class="conflict-reload-btn" onclick="reloadMatch('${id}')">↺ Reload</button>`;
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
  // Re-read fresh from localStorage
  const stored = localStorage.getItem("pb_matches");
  localMatches = stored ? JSON.parse(stored) : JSON.parse(JSON.stringify(SAMPLE_MATCHES));
  const m = localMatches ? localMatches.find(x => x.id === id) : null;

  let scoreA, scoreB, payload;

  if (needsSets(m || { stage: "" })) {
    // Best-of-3: read individual set scores
    const s1A = getSetInput(id, "s1A"), s1B = getSetInput(id, "s1B");
    const s2A = getSetInput(id, "s2A"), s2B = getSetInput(id, "s2B");
    const s3A = getSetInput(id, "s3A"), s3B = getSetInput(id, "s3B");
    const tmp = { s1A, s1B, s2A, s2B, s3A, s3B };
    const { winsA, winsB } = computeSetWins(tmp);
    scoreA = winsA;
    scoreB = winsB;
    // Use lowercase for Supabase (DB columns are lowercase)
    payload = { s1a:s1A, s1b:s1B, s2a:s2A, s2b:s2B, s3a:s3A, s3b:s3B, scoreA, scoreB };
  } else {
    scoreA = parseInt(getInput(id, "scoreA"), 10) || 0;
    scoreB = parseInt(getInput(id, "scoreB"), 10) || 0;
    payload = { scoreA, scoreB };
  }

  // Auto-status: not_started → playing when any score > 0
  const hasScore = scoreA > 0 || scoreB > 0 ||
    (payload.s1A > 0 || payload.s1B > 0);
  const autoStatus = hasScore ? "playing" : null;

  if (!db) {
    if (!m) { console.warn("updateScore: match not found", id); return; }
    Object.assign(m, payload);
    if (autoStatus && (m.status === "not_started" || m.status === "pending")) {
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
  if (current && (current.status === "not_started" || current.status === "pending") && autoStatus) {
    payload.status = autoStatus;
  }

  const { error } = await db.from("matches").update(payload).eq("id", id);
  if (error) { setStatus("Update error: " + error.message, "err"); return; }

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
  el.textContent = `Sets: ${winsA} — ${winsB}`;
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
  const stored = localStorage.getItem("pb_matches");
  localMatches = stored ? JSON.parse(stored) : JSON.parse(JSON.stringify(SAMPLE_MATCHES));
  const m = localMatches ? localMatches.find(x => x.id === id) : null;

  let payload = { status: "done", updated_at: new Date().toISOString() };

  if (needsSets(m || { stage: "" })) {
    const s1A = getSetInput(id, "s1A"), s1B = getSetInput(id, "s1B");
    const s2A = getSetInput(id, "s2A"), s2B = getSetInput(id, "s2B");
    const s3A = getSetInput(id, "s3A"), s3B = getSetInput(id, "s3B");
    const { winsA, winsB } = computeSetWins({ s1A, s1B, s2A, s2B, s3A, s3B });
    Object.assign(payload, { s1a:s1A, s1b:s1B, s2a:s2A, s2b:s2B, s3a:s3A, s3b:s3B, scoreA:winsA, scoreB:winsB });
  } else {
    payload.scoreA = parseInt(getInput(id, "scoreA"), 10) || 0;
    payload.scoreB = parseInt(getInput(id, "scoreB"), 10) || 0;
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
  if (error) { setStatus("Finish error: " + error.message, "err"); return; }

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
// Ranking rules (FIXED):
// 1. Wins (DESC)
// 2. Point Difference (DESC)
// 3. Head-to-head wins
// 4. Head-to-head point diff
function calculateStandings(matches) {
  const groupMatches = matches.filter(m => !m.stage || m.stage === "group");
  const groups = {};

  // Register all teams
  groupMatches.forEach(m => {
    if (!groups[m.group_name]) groups[m.group_name] = {};
    [m.teamA, m.teamB].forEach(t => {
      if (!groups[m.group_name][t])
        groups[m.group_name][t] = { wins:0, losses:0, diff:0, played:0 };
    });
  });

  // Tally done matches
  const doneMatches = groupMatches.filter(m => m.status === "done");
  doneMatches.forEach(m => {
    const g = m.group_name;
    const a = groups[g][m.teamA], b = groups[g][m.teamB];
    a.played++; b.played++;
    if (m.scoreA > m.scoreB)      { a.wins++; b.losses++; }
    else if (m.scoreB > m.scoreA) { b.wins++; a.losses++; }
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
      // 1. Wins DESC (PRIMARY)
      if (b.wins !== a.wins) return b.wins - a.wins;

      // Teams are tied on wins — apply tiebreakers
      // 2. Point Difference DESC (SECONDARY)
      if (b.diff !== a.diff) {
        // Don't record tie-break for point diff (obvious from standings)
        return b.diff - a.diff;
      }

      // 3. H2H wins between tied teams (TERTIARY)
      const h2hA = getH2HWins(a.name, b.name, doneMatches, g);
      const h2hB = getH2HWins(b.name, a.name, doneMatches, g);
      if (h2hA !== h2hB) {
        // Record tie-break reason ONLY when wins AND diff are equal
        if (a.wins === b.wins && a.diff === b.diff) {
          tieBreakInfo[g].push({
            team1: h2hB > h2hA ? b.name : a.name,
            team2: h2hB > h2hA ? a.name : b.name,
            reason: 'head-to-head',
            value: Math.abs(h2hB - h2hA)
          });
        }
        return h2hB - h2hA;
      }

      // 4. H2H point diff (QUATERNARY)
      const h2hDiffA = getH2HDiff(a.name, b.name, doneMatches, g);
      const h2hDiffB = getH2HDiff(b.name, a.name, doneMatches, g);
      return h2hDiffB - h2hDiffA;
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
            <th>${t("standingsPts")}</th>
            <th>${t("standingsW")}</th>
            <th>${t("standingsL")}</th>
            <th>${t("standingsDiff")}</th>
          </tr></thead>
          <tbody>`;

    teams.forEach((t, i) => {
      const rankCls = i === 0 ? "rank-1" : i === 1 ? "rank-2" : "";
      const medal   = medals[i]
        ? `<span class="rank-medal">${medals[i]}</span>`
        : `<span class="rank-medal" style="opacity:0">·</span>`;
      html += `<tr class="${rankCls}">
        <td>${medal}${esc(t.name)}</td>
        <td style="font-weight:800;color:var(--green)">${t.wins}</td>
        <td>${t.wins}</td>
        <td>${t.losses}</td>
        <td>${t.diff > 0 ? "+" : ""}${t.diff}</td>
      </tr>`;
    });

    html += `</tbody></table>`;
    
    // Show tie-break explanation if any
    if (tieBreakInfo[g] && tieBreakInfo[g].length > 0) {
      html += `<div class="tie-break-info">`;
      tieBreakInfo[g].forEach(tb => {
        if (tb.reason === 'point-diff') {
          html += `<div class="tie-break-line">ℹ️ ${esc(tb.team1)} xếp trên ${esc(tb.team2)} do hiệu số tốt hơn (+${tb.value})</div>`;
        } else if (tb.reason === 'head-to-head') {
          html += `<div class="tie-break-line">ℹ️ ${esc(tb.team1)} xếp trên ${esc(tb.team2)} do thắng đối đầu</div>`;
        }
      });
      html += `</div>`;
    }
    
    html += `<div class="standings-note">${t("standingsNote")}</div>
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
        if (_isEditingScore) {
          console.log('Realtime: skipping fetch (admin is editing)');
          return;
        }
        // Debounce fetchMatches to avoid interrupting admin edits
        clearTimeout(_realtimeFetchDebounce);
        _realtimeFetchDebounce = setTimeout(() => {
          console.log('Realtime: fetching matches after debounce');
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
    scoreA: 0, scoreB: 0, status: "not_started",
    s1a: 0, s1b: 0, s2a: 0, s2b: 0, s3a: 0, s3b: 0,
    updated_at: new Date().toISOString()
  }).eq("stage", "group");

  if (error) { setStatus("Reset error: " + error.message, "err"); return; }

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
    fetchMatches();
    subscribeRealtime(); // always — handles both realtime + polling fallback
    
    // Setup click handlers after initial render
    setTimeout(setupMatchCardHandlers, 500);
  });
}
