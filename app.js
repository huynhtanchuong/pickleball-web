// ============================================================
//  Pickleball Tournament — app.js
//  Replace SUPABASE_URL and SUPABASE_ANON_KEY before use.
// ============================================================

const SUPABASE_URL      = "REPLACE_ME";
const SUPABASE_ANON_KEY = "REPLACE_ME";

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
    setStatus("⚠️ Demo mode — Supabase not configured", "err");
    // Show demo controls on public page
    const dc = document.getElementById("demo-controls");
    if (dc) dc.style.display = "block";
    return false;
  }
  try {
    db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    setStatus("Connected to Supabase", "ok");
    return true;
  } catch (e) {
    setStatus("Supabase init failed: " + e.message, "err");
    return false;
  }
}

// ── Status bar ───────────────────────────────────────────────
let _statusTimer = null;
function setStatus(msg, type = "") {
  const el = document.getElementById("status-bar");
  if (!el) return;
  el.textContent = msg;
  el.className = type;
  // Auto-clear success messages after 3s
  if (_statusTimer) clearTimeout(_statusTimer);
  if (type === "ok") {
    _statusTimer = setTimeout(() => {
      el.textContent = db ? "🟢 Connected" : "⚠️ Demo mode";
      el.className = db ? "ok" : "err";
    }, 3000);
  }
}

// ── Sample data ───────────────────────────────────────────────
const SAMPLE_MATCHES = [
  { id:"s1", teamA:"Dink Masters",  teamB:"Net Ninjas",    scoreA:0, scoreB:0, group_name:"A", stage:"group", status:"not_started", updated_at: null },
  { id:"s2", teamA:"Smash Bros",    teamB:"Lob Stars",     scoreA:0, scoreB:0, group_name:"A", stage:"group", status:"not_started", updated_at: null },
  { id:"s3", teamA:"Dink Masters",  teamB:"Lob Stars",     scoreA:0, scoreB:0, group_name:"A", stage:"group", status:"not_started", updated_at: null },
  { id:"s4", teamA:"Smash Bros",    teamB:"Net Ninjas",    scoreA:0, scoreB:0, group_name:"A", stage:"group", status:"not_started", updated_at: null },
  { id:"s5", teamA:"Spin Doctors",  teamB:"Drop Shots",    scoreA:0, scoreB:0, group_name:"B", stage:"group", status:"not_started", updated_at: null },
  { id:"s6", teamA:"Ace Patrol",    teamB:"Kitchen Kings", scoreA:0, scoreB:0, group_name:"B", stage:"group", status:"not_started", updated_at: null },
  { id:"s7", teamA:"Spin Doctors",  teamB:"Kitchen Kings", scoreA:0, scoreB:0, group_name:"B", stage:"group", status:"not_started", updated_at: null },
  { id:"s8", teamA:"Ace Patrol",    teamB:"Drop Shots",    scoreA:0, scoreB:0, group_name:"B", stage:"group", status:"not_started", updated_at: null },
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

  // Bracket visual
  const bracketSec = document.getElementById("section-bracket");
  if (bracketSec) {
    const hasBracket = semiMatches.length > 0 || finalMatches.length > 0;
    bracketSec.style.display = hasBracket ? "block" : "none";
    const bc = document.getElementById("bracket-container");
    if (bc && typeof renderBracketVisual === "function") {
      renderBracketVisual(bc, matches);
    }
  }

  // Featured match (public scoreboard only)
  updateFeatured(matches);

  // Update bracket UI hook (used by admin.js if loaded)
  if (typeof updateBracketUI === "function") updateBracketUI(matches);
}

// ── Featured match ────────────────────────────────────────────
function updateFeatured(matches) {
  const sec = document.getElementById("featured-section");
  const box = document.getElementById("featured-match");
  if (!sec || !box) return; // not on public page

  // Pick highest-priority active match: final > semi > group
  // "playing" first, then "not_started", then fallback to last done
  const priority = ["final", "semi", "group"];
  let featured = null;
  for (const stage of priority) {
    featured = matches.find(m => m.status === "playing" && m.stage === stage);
    if (featured) break;
  }
  if (!featured) {
    for (const stage of priority) {
      featured = matches.find(m => m.status === "not_started" && m.stage === stage);
      if (featured) break;
    }
  }
  // legacy "pending" support
  if (!featured) {
    for (const stage of priority) {
      featured = matches.find(m => m.status === "pending" && m.stage === stage);
      if (featured) break;
    }
  }
  // Fallback: most recently completed match
  if (!featured) {
    const done = matches.filter(m => m.status === "done");
    featured = done[done.length - 1] || null;
  }

  if (!featured) { sec.style.display = "none"; return; }

  sec.style.display = "block";
  const isPlaying    = featured.status === "playing";
  const isNotStarted = featured.status === "not_started" || featured.status === "pending";
  const isDone       = featured.status === "done";
  const wA = isDone && featured.scoreA > featured.scoreB;
  const wB = isDone && featured.scoreB > featured.scoreA;

  const stageLabel = featured.stage === "final" ? "Championship Final"
                   : featured.stage === "semi"  ? "Semifinal"
                   : "Group " + (featured.group_name || "");

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
      ${isPlaying    ? '<span class="badge-live">● PLAYING</span>'
      : isNotStarted ? '<span class="badge-ns">◌ NOT STARTED</span>'
      :                '<span class="badge-done">✓ FINAL</span>'}
      <span class="feat-stage-label">${esc(stageLabel)}</span>
    </div>`;
}

function renderPublicStage(containerId, matches, stage) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!matches || matches.length === 0) {
    container.innerHTML = '<p class="empty-state">No matches.</p>';
    return;
  }

  if (stage === "group") {
    // Sub-group by group_name with divider headers
    const groups = {};
    matches.forEach(m => {
      if (!groups[m.group_name]) groups[m.group_name] = [];
      groups[m.group_name].push(m);
    });
    let html = "";
    Object.keys(groups).sort().forEach(g => {
      html += `<div class="group-divider" style="grid-column:1/-1;">
        <span class="group-divider-label">Group ${esc(g)}</span>
        <span class="group-divider-line"></span>
      </div>`;
      groups[g].forEach(m => { html += publicMatchHTML(m, stage); });
    });
    container.innerHTML = html;
  } else {
    container.innerHTML = matches.map(m => publicMatchHTML(m, stage)).join("");
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
    ? `Group ${esc(m.group_name)}`
    : stage === "semi" ? "Semifinal" : "Final";

  const badge = done    ? '<span class="badge-done">✓ Final</span>'
              : playing ? '<span class="badge-live">● Playing</span>'
              :           '<span class="badge-ns">◌ Not Started</span>';

  // For semi/final: show set scores
  let setsHtml = "";
  if (needsSets(m)) {
    const sets = [
      { a: m.s1A || 0, b: m.s1B || 0, label: "S1" },
      { a: m.s2A || 0, b: m.s2B || 0, label: "S2" },
      { a: m.s3A || 0, b: m.s3B || 0, label: "S3" },
    ];
    const activeSets = sets.filter((s, i) => i === 0 || s.a > 0 || s.b > 0 || (i === 2 && m.scoreA === 1 && m.scoreB === 1));
    setsHtml = `<div class="mc-sets">` +
      activeSets.map(s => {
        const wA = s.a > s.b, wB = s.b > s.a;
        return `<div class="mc-set-item">
          <span class="mc-set-label">${s.label}</span>
          <span class="mc-set-score ${wA ? "winner" : ""}">${s.a}</span>
          <span class="mc-set-sep">-</span>
          <span class="mc-set-score ${wB ? "winner" : ""}">${s.b}</span>
        </div>`;
      }).join("") + `</div>`;
  }

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
      <div class="mc-footer">
        <span class="mc-group-tag">${groupTag}</span>
        ${badge}
      </div>
    </div>`;
}

// ── Set score helpers (semi + final only) ────────────────────
// Sets: s1A/s1B, s2A/s2B, s3A/s3B (scores per set)
// scoreA/scoreB = sets won (computed, not manually entered)

function needsSets(m) {
  return m.stage === "semi" || m.stage === "final";
}

function computeSetWins(m) {
  // Returns { winsA, winsB } based on individual set scores
  let wA = 0, wB = 0;
  const sets = [
    [m.s1A || 0, m.s1B || 0],
    [m.s2A || 0, m.s2B || 0],
    [m.s3A || 0, m.s3B || 0],
  ];
  sets.forEach(([a, b]) => {
    if (a > 0 || b > 0) { // only count sets that have been played
      if (a > b) wA++;
      else if (b > a) wB++;
    }
  });
  return { winsA: wA, winsB: wB };
}

function getSetInput(id, field) {
  const el = document.querySelector(`input[data-id="${id}"][data-field="${field}"]`);
  return el ? (parseInt(el.value, 10) || 0) : 0;
}

function adjustSetScore(id, field, delta) {
  const input = document.querySelector(`input[data-id="${id}"][data-field="${field}"]`);
  if (!input) return;
  input.value = Math.max(0, (parseInt(input.value, 10) || 0) + delta);
  clearTimeout(_saveDebounce[id]);
  _saveDebounce[id] = setTimeout(() => { updateScore(id); }, 800);
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
    payload = { s1A, s1B, s2A, s2B, s3A, s3B, scoreA, scoreB };
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
    setStatus("Score saved ✓", "ok");
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
  setStatus("Score saved ✓", "ok");
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
    Object.assign(payload, { s1A, s1B, s2A, s2B, s3A, s3B, scoreA: winsA, scoreB: winsB });
  } else {
    payload.scoreA = parseInt(getInput(id, "scoreA"), 10) || 0;
    payload.scoreB = parseInt(getInput(id, "scoreB"), 10) || 0;
  }

  if (!db) {
    if (!m) return;
    Object.assign(m, payload);
    saveLocal(localMatches);
    renderMatches(localMatches);
    calculateStandings(localMatches);
    setStatus("Match finished ✓", "ok");
    return;
  }

  const conflict = await checkConflict(id);
  if (conflict) { handleConflict(id); return; }

  const { error } = await db.from("matches").update(payload).eq("id", id);
  if (error) { setStatus("Finish error: " + error.message, "err"); return; }

  _knownUpdatedAt[id] = payload.updated_at;
  setStatus("Match finished ✓", "ok");
}

// ── Mark done (legacy alias → finishMatch) ────────────────────
async function markDone(id) {
  return finishMatch(id);
}

// ── Calculate standings (group stage only) ────────────────────
function calculateStandings(matches) {
  const groupMatches = matches.filter(m => !m.stage || m.stage === "group");
  const groups = {};

  // Register all teams
  groupMatches.forEach(m => {
    if (!groups[m.group_name]) groups[m.group_name] = {};
    [m.teamA, m.teamB].forEach(t => {
      if (!groups[m.group_name][t]) groups[m.group_name][t] = { wins:0, losses:0, diff:0 };
    });
  });

  // Tally done matches
  groupMatches.filter(m => m.status === "done").forEach(m => {
    const g = m.group_name;
    const a = groups[g][m.teamA], b = groups[g][m.teamB];
    if (m.scoreA > m.scoreB)      { a.wins++; b.losses++; }
    else if (m.scoreB > m.scoreA) { b.wins++; a.losses++; }
    a.diff += (m.scoreA - m.scoreB);
    b.diff += (m.scoreB - m.scoreA);
  });

  renderStandings(groups);
}

// ── Render standings ──────────────────────────────────────────
function renderStandings(groups) {
  const container = document.getElementById("standings-container");
  if (!container) return;

  if (!Object.keys(groups).length) {
    container.innerHTML = '<p class="empty-state">No standings yet.</p>';
    return;
  }

  const medals = ["🥇","🥈","🥉"];

  let html = '<div class="standings-grid">';
  Object.keys(groups).sort().forEach(g => {
    const teams = Object.entries(groups[g])
      .map(([name, s]) => ({ name, ...s }))
      .sort((a, b) => b.wins - a.wins || b.diff - a.diff);

    html += `
      <div class="standings-group-card">
        <div class="standings-group-title">Group ${esc(g)}</div>
        <table class="standings-table">
          <thead><tr>
            <th>Team</th><th>W</th><th>L</th><th>+/-</th>
          </tr></thead>
          <tbody>`;

    teams.forEach((t, i) => {
      const rankCls = i === 0 ? "rank-1" : i === 1 ? "rank-2" : "";
      const medal   = medals[i] ? `<span class="rank-medal">${medals[i]}</span>` : `<span class="rank-medal" style="opacity:0">·</span>`;
      html += `<tr class="${rankCls}">
        <td>${medal}${esc(t.name)}</td>
        <td>${t.wins}</td>
        <td>${t.losses}</td>
        <td>${t.diff > 0 ? "+" : ""}${t.diff}</td>
      </tr>`;
    });

    html += `</tbody></table></div>`;
  });

  html += "</div>";
  container.innerHTML = html;
}

// ── Realtime subscription + polling fallback ─────────────────
let _pollTimer    = null;
let _rtConnected  = false;
const POLL_MS_DEMO = 1000; // demo mode: poll every 1s (cross-tab localStorage sync)
const POLL_MS_RT   = 5000; // realtime fallback: poll every 5s

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
      () => { fetchMatches(); }
    )
    .subscribe(status => {
      if (status === "SUBSCRIBED") {
        _rtConnected = true;
        stopPolling();
        const ri = document.getElementById("realtime-indicator");
        if (ri) ri.style.display = "inline-block";
        setStatus("🟢 Realtime active", "ok");
      }
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        _rtConnected = false;
        const ri = document.getElementById("realtime-indicator");
        if (ri) ri.style.display = "none";
        setStatus("⚠️ Realtime lost — polling", "err");
        startPolling(POLL_MS_RT);
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

// ── Reset demo data ───────────────────────────────────────────
function resetDemo() {
  localStorage.removeItem("pb_matches");
  localMatches = null;
  fetchMatches();
}

// ── Boot (public page only) ───────────────────────────────────
// admin.html boots via admin.js instead — we detect by filename.
if (!window.location.pathname.includes("admin")) {
  document.addEventListener("DOMContentLoaded", () => {
    const connected = initSupabase();
    fetchMatches();
    subscribeRealtime(); // always — handles both realtime + polling fallback
  });
}
