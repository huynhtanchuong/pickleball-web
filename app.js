// ============================================================
//  Pickleball Tournament — app.js
//  Replace SUPABASE_URL and SUPABASE_ANON_KEY before use.
// ============================================================

const SUPABASE_URL      = "REPLACE_ME";
const SUPABASE_ANON_KEY = "REPLACE_ME";

// ── Supabase client ──────────────────────────────────────────
let db = null;
let realtimeChannel = null;

// ── Admin check (used by public page to enforce read-only) ───
const ADMIN_KEY = "pb_admin_auth";
function isAdmin() {
  return localStorage.getItem(ADMIN_KEY) === "true";
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
function setStatus(msg, type = "") {
  const el = document.getElementById("status-bar");
  if (!el) return;
  el.textContent = msg;
  el.className = type;
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

// ── Seed sample matches ───────────────────────────────────────
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

  // Update bracket UI hook (used by admin.js if loaded)
  if (typeof updateBracketUI === "function") updateBracketUI(matches);
}

function renderPublicStage(containerId, matches, stage) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!matches || matches.length === 0) {
    container.innerHTML = '<p class="empty">No matches.</p>';
    return;
  }

  // Determine if we're on admin page (admin.js loaded) — if so, skip public render
  // admin.js overrides renderMatches entirely, so this only runs on index.html
  const admin = isAdmin() && window.location.pathname.includes("admin");

  if (stage === "group") {
    const groups = {};
    matches.forEach(m => {
      if (!groups[m.group_name]) groups[m.group_name] = [];
      groups[m.group_name].push(m);
    });
    let html = "";
    Object.keys(groups).sort().forEach(g => {
      html += `<div class="stage-header">
        <span class="stage-label group">Group ${esc(g)}</span>
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
  const stageClass = stage === "semi" ? "stage-semi" : stage === "final" ? "stage-final" : "";
  const winnerA = done && m.scoreA > m.scoreB;
  const winnerB = done && m.scoreB > m.scoreA;

  return `
    <div class="match-item ${done ? "done" : "active-match"} ${stageClass}" data-id="${m.id}">
      <span class="team-name ${winnerA ? "winner" : ""}">${esc(m.teamA)}</span>
      <div class="score-display">
        <span class="score-readonly">${m.scoreA}</span>
        <span class="score-sep">:</span>
        <span class="score-readonly">${m.scoreB}</span>
      </div>
      <span class="team-name right ${winnerB ? "winner" : ""}">${esc(m.teamB)}</span>
      ${done ? '<span class="group-badge">✓ Final</span>' : '<span class="group-badge" style="background:#14532d;color:#86efac;">Live</span>'}
    </div>`;
}

// ── Update score ──────────────────────────────────────────────
async function updateScore(id) {
  const scoreA = parseInt(getInput(id, "scoreA"), 10) || 0;
  const scoreB = parseInt(getInput(id, "scoreB"), 10) || 0;

  if (!db) {
    const m = localMatches.find(x => x.id === id);
    if (m) { m.scoreA = scoreA; m.scoreB = scoreB; }
    saveLocal(localMatches);
    renderMatches(localMatches);
    calculateStandings(localMatches);
    flashSaved(id);
    return;
  }

  const { error } = await db.from("matches").update({ scoreA, scoreB }).eq("id", id);
  if (error) { setStatus("Update error: " + error.message, "err"); return; }
  flashSaved(id);
}

// ── Mark done ─────────────────────────────────────────────────
async function markDone(id) {
  const scoreA = parseInt(getInput(id, "scoreA"), 10) || 0;
  const scoreB = parseInt(getInput(id, "scoreB"), 10) || 0;

  if (!db) {
    const m = localMatches.find(x => x.id === id);
    if (m) { m.scoreA = scoreA; m.scoreB = scoreB; m.status = "done"; }
    saveLocal(localMatches);
    renderMatches(localMatches);
    calculateStandings(localMatches);
    return;
  }

  const { error } = await db.from("matches")
    .update({ scoreA, scoreB, status: "done" }).eq("id", id);
  if (error) { setStatus("Mark done error: " + error.message, "err"); return; }
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
    container.innerHTML = '<p class="empty">No standings yet.</p>';
    return;
  }

  let html = '<div class="standings-grid">';
  Object.keys(groups).sort().forEach(g => {
    const teams = Object.entries(groups[g])
      .map(([name, s]) => ({ name, ...s }))
      .sort((a, b) => b.wins - a.wins || b.diff - a.diff);

    html += `
      <div>
        <h3 style="color:#7dd3fc;margin-bottom:10px;font-size:0.9rem;">Group ${esc(g)}</h3>
        <table class="standings-table">
          <thead><tr><th>Team</th><th>W</th><th>L</th><th>+/-</th></tr></thead>
          <tbody>`;

    teams.forEach((t, i) => {
      const cls = i === 0 ? "top-1 top-2" : i === 1 ? "top-2" : "";
      html += `<tr class="${cls}">
        <td>${esc(t.name)}</td>
        <td>${t.wins}</td><td>${t.losses}</td>
        <td>${t.diff > 0 ? "+" : ""}${t.diff}</td>
      </tr>`;
    });

    html += `</tbody></table></div>`;
  });

  html += "</div>";
  container.innerHTML = html;
}

// ── Realtime subscription ─────────────────────────────────────
function subscribeRealtime() {
  if (!db) return;

  realtimeChannel = db
    .channel("matches-changes")
    .on("postgres_changes",
      { event: "*", schema: "public", table: "matches" },
      () => { fetchMatches(); }
    )
    .subscribe(status => {
      if (status === "SUBSCRIBED") {
        const ri = document.getElementById("realtime-indicator");
        if (ri) ri.style.display = "inline-block";
        setStatus("🟢 Realtime active", "ok");
      }
    });
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
  const row = document.querySelector(`.match-item[data-id="${id}"]`);
  if (!row) return;
  row.style.outline = "2px solid #22c55e";
  setTimeout(() => row.style.outline = "", 800);
}

// ── Reset demo data ───────────────────────────────────────────
function resetDemo() {
  localStorage.removeItem("pb_matches");
  localMatches = null;
  fetchMatches();
}

// ── Boot (public page) ────────────────────────────────────────
// admin.html boots via admin.js instead.
if (!document.getElementById("admin-panel")) {
  document.addEventListener("DOMContentLoaded", () => {
    const connected = initSupabase();
    fetchMatches();
    if (connected) subscribeRealtime();
  });
}
