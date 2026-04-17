// ============================================================
//  admin.js — Admin login + bracket management
//  Loaded AFTER app.js on admin.html only.
// ============================================================

const ADMIN_PASSWORD = "admin123";
const ADMIN_KEY      = "pb_admin_auth";

// ── Auth ──────────────────────────────────────────────────────
function isAdmin() {
  return localStorage.getItem(ADMIN_KEY) === "true";
}

function doLogin() {
  const pw  = document.getElementById("pw-input").value;
  const err = document.getElementById("login-error");
  if (pw === ADMIN_PASSWORD) {
    localStorage.setItem(ADMIN_KEY, "true");
    showAdminPanel();
  } else {
    err.textContent = "Incorrect password. Try again.";
    document.getElementById("pw-input").value = "";
    document.getElementById("pw-input").focus();
  }
}

function doLogout() {
  localStorage.removeItem(ADMIN_KEY);
  location.reload();
}

function showAdminPanel() {
  document.getElementById("login-screen").style.display = "none";
  document.getElementById("admin-panel").style.display  = "block";
  const connected = initSupabase();
  fetchMatches();
  if (connected) subscribeRealtime();
}

// ── Boot: check existing session ─────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  if (isAdmin()) {
    showAdminPanel();
  }
  // login screen is already visible by default
});

// ── Override renderMatches for admin (split by stage) ────────
//  app.js renderMatches is replaced here for admin context.
function renderMatches(matches) {
  const groupMatches = matches.filter(m => !m.stage || m.stage === "group");
  const semiMatches  = matches.filter(m => m.stage === "semi");
  const finalMatches = matches.filter(m => m.stage === "final");

  renderStageList("match-list-group", groupMatches, "group");
  renderStageList("match-list-semi",  semiMatches,  "semi");
  renderStageList("match-list-final", finalMatches, "final");

  // Also update bracket visual if it exists
  updateBracketUI(matches);
}

function renderStageList(containerId, matches, stage) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!matches || matches.length === 0) {
    const msgs = {
      group: "No group matches found.",
      semi:  "No semifinals yet. Generate them above once group stage is complete.",
      final: "No final yet. Generate it once both semifinals are done."
    };
    container.innerHTML = `<p class="empty">${msgs[stage] || "No matches."}</p>`;
    return;
  }

  // For group stage, sub-group by group_name
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
      groups[g].forEach(m => { html += matchHTML(m, stage); });
    });
    container.innerHTML = html;
  } else {
    let html = "";
    matches.forEach(m => { html += matchHTML(m, stage); });
    container.innerHTML = html;
  }
}

function matchHTML(m, stage) {
  const done   = m.status === "done";
  const stageClass = stage === "semi" ? "stage-semi" : stage === "final" ? "stage-final" : "";
  const winnerA = done && m.scoreA > m.scoreB;
  const winnerB = done && m.scoreB > m.scoreA;

  return `
    <div class="match-item ${done ? "done" : "active-match"} ${stageClass}" data-id="${m.id}">
      <span class="team-name ${winnerA ? "winner" : ""}">${esc(m.teamA)}</span>
      <div class="score-display">
        <input class="score-input" type="number" min="0" value="${m.scoreA}"
          data-field="scoreA" data-id="${m.id}" ${done ? "disabled" : ""}>
        <span class="score-sep">:</span>
        <input class="score-input" type="number" min="0" value="${m.scoreB}"
          data-field="scoreB" data-id="${m.id}" ${done ? "disabled" : ""}>
      </div>
      <span class="team-name right ${winnerB ? "winner" : ""}">${esc(m.teamB)}</span>
      <button class="btn btn-save" ${done ? "disabled" : ""}
        onclick="updateScore('${m.id}')">Save</button>
      <button class="btn btn-done ${done ? "done-state" : ""}"
        ${done ? "disabled" : ""} onclick="markDone('${m.id}')">
        ${done ? "✓ Done" : "Mark Done"}
      </button>
    </div>`;
}

// ── Bracket logic ─────────────────────────────────────────────

function getTopTeamsByGroup(matches) {
  // Only group-stage done matches
  const groupDone = matches.filter(m => (!m.stage || m.stage === "group") && m.status === "done");
  const groups = {};

  // Register all group teams
  matches.filter(m => !m.stage || m.stage === "group").forEach(m => {
    ["A","B"].includes(m.group_name) || true; // accept any group
    if (!groups[m.group_name]) groups[m.group_name] = {};
    [m.teamA, m.teamB].forEach(t => {
      if (!groups[m.group_name][t]) groups[m.group_name][t] = { wins:0, losses:0, diff:0 };
    });
  });

  groupDone.forEach(m => {
    const g = m.group_name;
    if (!groups[g]) groups[g] = {};
    [m.teamA, m.teamB].forEach(t => {
      if (!groups[g][t]) groups[g][t] = { wins:0, losses:0, diff:0 };
    });
    const a = groups[g][m.teamA], b = groups[g][m.teamB];
    if (m.scoreA > m.scoreB)      { a.wins++; b.losses++; }
    else if (m.scoreB > m.scoreA) { b.wins++; a.losses++; }
    a.diff += (m.scoreA - m.scoreB);
    b.diff += (m.scoreB - m.scoreA);
  });

  const result = {};
  Object.keys(groups).forEach(g => {
    result[g] = Object.entries(groups[g])
      .map(([name, s]) => ({ name, ...s }))
      .sort((a, b) => b.wins - a.wins || b.diff - a.diff);
  });
  return result;
}

async function generateSemifinals() {
  const matches = db ? await fetchAllMatches() : (localMatches || []);
  const existing = matches.filter(m => m.stage === "semi");
  if (existing.length > 0) {
    alert("Semifinals already exist!");
    return;
  }

  const tops = getTopTeamsByGroup(matches);
  const groupKeys = Object.keys(tops).sort();
  if (groupKeys.length < 2) {
    alert("Need at least 2 groups to generate semifinals.");
    return;
  }

  const [g1, g2] = groupKeys;
  const A1 = tops[g1][0]?.name || "TBD";
  const A2 = tops[g1][1]?.name || "TBD";
  const B1 = tops[g2][0]?.name || "TBD";
  const B2 = tops[g2][1]?.name || "TBD";

  const semis = [
    { teamA: A1, teamB: B2, scoreA: 0, scoreB: 0, group_name: "SF", stage: "semi", status: "pending" },
    { teamA: B1, teamB: A2, scoreA: 0, scoreB: 0, group_name: "SF", stage: "semi", status: "pending" },
  ];

  if (!db) {
    const ids = ["semi1", "semi2"];
    semis.forEach((s, i) => { s.id = ids[i]; });
    localMatches = [...(localMatches || []), ...semis];
    saveLocal(localMatches);
    fetchMatches();
    return;
  }

  const { error } = await db.from("matches").insert(semis);
  if (error) { setStatus("Semifinal error: " + error.message, "err"); return; }
  setStatus("Semifinals generated!", "ok");
  fetchMatches();
}

async function generateFinal() {
  const matches = db ? await fetchAllMatches() : (localMatches || []);
  const semis   = matches.filter(m => m.stage === "semi" && m.status === "done");
  const finals  = matches.filter(m => m.stage === "final");

  if (finals.length > 0) { alert("Final already exists!"); return; }
  if (semis.length < 2)  { alert("Both semifinals must be completed first."); return; }

  const getWinner = m => m.scoreA >= m.scoreB ? m.teamA : m.teamB;
  const w1 = getWinner(semis[0]);
  const w2 = getWinner(semis[1]);

  const finalMatch = {
    teamA: w1, teamB: w2, scoreA: 0, scoreB: 0,
    group_name: "F", stage: "final", status: "pending"
  };

  if (!db) {
    finalMatch.id = "final1";
    localMatches = [...(localMatches || []), finalMatch];
    saveLocal(localMatches);
    fetchMatches();
    return;
  }

  const { error } = await db.from("matches").insert([finalMatch]);
  if (error) { setStatus("Final error: " + error.message, "err"); return; }
  setStatus("Final generated!", "ok");
  fetchMatches();
}

// Helper: fetch all matches from Supabase
async function fetchAllMatches() {
  if (!db) return localMatches || [];
  const { data } = await db.from("matches").select("*");
  return data || [];
}

// ── Bracket visual ────────────────────────────────────────────
function updateBracketUI(matches) {
  // No separate bracket container on admin page — bracket is shown inline per stage.
  // This function is a hook for index.html's bracket section if present.
  const bc = document.getElementById("bracket-container");
  if (!bc) return;
  renderBracketVisual(bc, matches);
}

function renderBracketVisual(container, matches) {
  const semis  = matches.filter(m => m.stage === "semi");
  const finals = matches.filter(m => m.stage === "final");

  if (!semis.length && !finals.length) {
    container.innerHTML = '<p class="empty">Bracket not yet generated.</p>';
    return;
  }

  const getWinner = m => m.status === "done"
    ? (m.scoreA >= m.scoreB ? m.teamA : m.teamB) : null;

  let html = '<div class="bracket-container">';

  // Semis column
  html += '<div class="bracket-round"><div class="bracket-round-title">Semifinals</div>';
  semis.forEach(m => {
    const wA = m.status === "done" && m.scoreA > m.scoreB;
    const wB = m.status === "done" && m.scoreB > m.scoreA;
    html += `
      <div class="bracket-match">
        <div class="bracket-team ${wA ? "winner" : ""}">
          <span>${esc(m.teamA)}</span>
          <span class="bracket-score">${m.status === "done" ? m.scoreA : "-"}</span>
        </div>
        <div class="bracket-team ${wB ? "winner" : ""}">
          <span>${esc(m.teamB)}</span>
          <span class="bracket-score">${m.status === "done" ? m.scoreB : "-"}</span>
        </div>
      </div>`;
  });
  html += '</div>';

  // Arrow
  html += '<div class="bracket-connector">→</div>';

  // Final column
  html += '<div class="bracket-round"><div class="bracket-round-title">Final</div>';
  if (finals.length) {
    finals.forEach(m => {
      const wA = m.status === "done" && m.scoreA > m.scoreB;
      const wB = m.status === "done" && m.scoreB > m.scoreA;
      html += `
        <div class="bracket-match">
          <div class="bracket-team ${wA ? "winner" : ""}">
            <span>${esc(m.teamA)}</span>
            <span class="bracket-score">${m.status === "done" ? m.scoreA : "-"}</span>
          </div>
          <div class="bracket-team ${wB ? "winner" : ""}">
            <span>${esc(m.teamB)}</span>
            <span class="bracket-score">${m.status === "done" ? m.scoreB : "-"}</span>
          </div>
        </div>`;
    });
  } else {
    const w1 = semis[0] ? getWinner(semis[0]) : null;
    const w2 = semis[1] ? getWinner(semis[1]) : null;
    html += `
      <div class="bracket-match">
        <div class="bracket-team ${w1 ? "" : "tbd"}"><span>${w1 || "Winner SF1"}</span></div>
        <div class="bracket-team ${w2 ? "" : "tbd"}"><span>${w2 || "Winner SF2"}</span></div>
      </div>`;
  }
  html += '</div>';

  // Champion
  if (finals.length && finals[0].status === "done") {
    const champ = finals[0].scoreA >= finals[0].scoreB ? finals[0].teamA : finals[0].teamB;
    html += `
      <div class="bracket-connector">→</div>
      <div class="bracket-round">
        <div class="bracket-round-title">Champion</div>
        <div class="bracket-match">
          <div class="bracket-team winner" style="font-size:1rem;padding:16px 14px;">
            🏆 ${esc(champ)}
          </div>
        </div>
      </div>`;
  }

  html += '</div>';
  container.innerHTML = html;
}
