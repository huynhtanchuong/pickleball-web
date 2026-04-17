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
  { id:"s1", teamA:"Dink Masters",  teamB:"Net Ninjas",    scoreA:0, scoreB:0, group_name:"A", stage:"group", status:"pending" },
  { id:"s2", teamA:"Smash Bros",    teamB:"Lob Stars",     scoreA:0, scoreB:0, group_name:"A", stage:"group", status:"pending" },
  { id:"s3", teamA:"Dink Masters",  teamB:"Lob Stars",     scoreA:0, scoreB:0, group_name:"A", stage:"group", status:"pending" },
  { id:"s4", teamA:"Smash Bros",    teamB:"Net Ninjas",    scoreA:0, scoreB:0, group_name:"A", stage:"group", status:"pending" },
  { id:"s5", teamA:"Spin Doctors",  teamB:"Drop Shots",    scoreA:0, scoreB:0, group_name:"B", stage:"group", status:"pending" },
  { id:"s6", teamA:"Ace Patrol",    teamB:"Kitchen Kings", scoreA:0, scoreB:0, group_name:"B", stage:"group", status:"pending" },
  { id:"s7", teamA:"Spin Doctors",  teamB:"Kitchen Kings", scoreA:0, scoreB:0, group_name:"B", stage:"group", status:"pending" },
  { id:"s8", teamA:"Ace Patrol",    teamB:"Drop Shots",    scoreA:0, scoreB:0, group_name:"B", stage:"group", status:"pending" },
];

// In-memory store (demo mode)
let localMatches = JSON.parse(localStorage.getItem("pb_matches") || "null");

function saveLocal(matches) {
  localStorage.setItem("pb_matches", JSON.stringify(matches));
}

// ── Fetch matches ─────────────────────────────────────────────
async function fetchMatches() {
  if (!db) {
    if (!localMatches) {
      localMatches = JSON.parse(JSON.stringify(SAMPLE_MATCHES));
      saveLocal(localMatches);
    }
    renderMatches(localMatches);
    calculateStandings(localMatches);
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
  const priority = ["final", "semi", "group"];
  let featured = null;
  for (const stage of priority) {
    featured = matches.find(m => m.status === "pending" && m.stage === stage);
    if (featured) break;
  }
  // Fallback: most recently completed match
  if (!featured) {
    const done = matches.filter(m => m.status === "done");
    featured = done[done.length - 1] || null;
  }

  if (!featured) { sec.style.display = "none"; return; }

  sec.style.display = "block";
  const isLive = featured.status === "pending";
  const wA = featured.status === "done" && featured.scoreA > featured.scoreB;
  const wB = featured.status === "done" && featured.scoreB > featured.scoreA;

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
      ${isLive
        ? '<span class="badge-live">● LIVE</span>'
        : '<span class="badge-done">✓ FINAL</span>'}
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
  const done    = m.status === "done";
  const winnerA = done && m.scoreA > m.scoreB;
  const winnerB = done && m.scoreB > m.scoreA;

  // Card modifier classes
  let cardMod = done ? "card-done" : "card-live";
  if (stage === "semi")  cardMod += " card-semi";
  if (stage === "final") cardMod += " card-final";

  const groupTag = stage === "group"
    ? `Group ${esc(m.group_name)}`
    : stage === "semi" ? "Semifinal" : "Final";

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
      <div class="mc-footer">
        <span class="mc-group-tag">${groupTag}</span>
        ${done
          ? '<span class="badge-done">✓ Final Score</span>'
          : '<span class="badge-live">● Live</span>'}
      </div>
    </div>`;
}

// ── Update score ──────────────────────────────────────────────
async function updateScore(id) {
  const scoreA = parseInt(getInput(id, "scoreA"), 10) || 0;
  const scoreB = parseInt(getInput(id, "scoreB"), 10) || 0;

  if (!db) {
    // Demo mode: update in-memory, persist, refresh UI
    if (!localMatches) localMatches = JSON.parse(localStorage.getItem("pb_matches") || "[]");
    const m = localMatches.find(x => x.id === id);
    if (!m) { console.warn("updateScore: match not found", id); return; }
    m.scoreA = scoreA;
    m.scoreB = scoreB;
    saveLocal(localMatches);
    // Re-render then flash (row is recreated so query after render)
    renderMatches(localMatches);
    calculateStandings(localMatches);
    flashSaved(id);
    setStatus("Score saved ✓", "ok");
    return;
  }

  const { error } = await db.from("matches").update({ scoreA, scoreB }).eq("id", id);
  if (error) { setStatus("Update error: " + error.message, "err"); return; }
  setStatus("Score saved ✓", "ok");
  flashSaved(id);
}

// ── Mark done ─────────────────────────────────────────────────
async function markDone(id) {
  const scoreA = parseInt(getInput(id, "scoreA"), 10) || 0;
  const scoreB = parseInt(getInput(id, "scoreB"), 10) || 0;

  if (!db) {
    if (!localMatches) localMatches = JSON.parse(localStorage.getItem("pb_matches") || "[]");
    const m = localMatches.find(x => x.id === id);
    if (!m) { console.warn("markDone: match not found", id); return; }
    m.scoreA = scoreA;
    m.scoreB = scoreB;
    m.status = "done";
    saveLocal(localMatches);
    renderMatches(localMatches);
    calculateStandings(localMatches);
    setStatus("Match marked done ✓", "ok");
    return;
  }

  const { error } = await db.from("matches")
    .update({ scoreA, scoreB, status: "done" }).eq("id", id);
  if (error) { setStatus("Mark done error: " + error.message, "err"); return; }
  setStatus("Match marked done ✓", "ok");
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
const POLL_MS     = 5000; // fallback poll every 5s

function subscribeRealtime() {
  if (!db) {
    // No Supabase — start polling demo mode (localStorage changes from admin tab)
    startPolling();
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
        stopPolling(); // realtime is live — no need to poll
        const ri = document.getElementById("realtime-indicator");
        if (ri) ri.style.display = "inline-block";
        setStatus("🟢 Realtime active", "ok");
      }
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        _rtConnected = false;
        const ri = document.getElementById("realtime-indicator");
        if (ri) ri.style.display = "none";
        setStatus("⚠️ Realtime lost — polling", "err");
        startPolling(); // fallback: poll until reconnected
      }
    });
}

function startPolling() {
  if (_pollTimer) return; // already running
  _pollTimer = setInterval(() => {
    fetchMatches();
    // If realtime reconnects, stop polling
    if (_rtConnected) stopPolling();
  }, POLL_MS);
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
