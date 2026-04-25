// ============================================================
//  teams.js — Team Management
// ============================================================

// Check admin auth
if (!isAdmin()) {
  window.location.href = "admin.html";
}

let allMatches = [];
let teamsList = [];

// ── Initialize ────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  initSupabase();
  await loadTeams();
});

// ── Load all teams from matches ──────────────────────────────
async function loadTeams() {
  setStatus("Đang tải danh sách đội...", "");

  const norm = typeof normalizeMatch === 'function' ? normalizeMatch : m => m;

  if (!db) {
    const stored = localStorage.getItem("pb_matches");
    allMatches = stored ? JSON.parse(stored).map(norm) : [];
  } else {
    const { data, error } = await db.from("matches").select("*").order("group_name");
    if (error) {
      setStatus("Lỗi: " + error.message, "err");
      return;
    }
    allMatches = (data || []).map(norm);
  }

  // Extract unique teams
  extractTeams();
  renderTeams();
  setStatus(`Tìm thấy ${teamsList.length} đội`, "ok");
}

// ── Extract unique teams from matches ────────────────────────
function extractTeams() {
  const teamsMap = new Map();

  allMatches.forEach(match => {
    // Only process group stage matches
    if (match.stage && match.stage !== "group") return;

    const group = match.group_name || "?";

    // Add teamA
    if (match.teamA) {
      if (!teamsMap.has(match.teamA)) {
        teamsMap.set(match.teamA, {
          name: match.teamA,
          group: group,
          matches: 0,
          wins: 0,
          losses: 0
        });
      }
      const teamA = teamsMap.get(match.teamA);
      if (match.status === "done") {
        teamA.matches++;
        if (match.scoreA > match.scoreB) teamA.wins++;
        else if (match.scoreA < match.scoreB) teamA.losses++;
      }
    }

    // Add teamB
    if (match.teamB) {
      if (!teamsMap.has(match.teamB)) {
        teamsMap.set(match.teamB, {
          name: match.teamB,
          group: group,
          matches: 0,
          wins: 0,
          losses: 0
        });
      }
      const teamB = teamsMap.get(match.teamB);
      if (match.status === "done") {
        teamB.matches++;
        if (match.scoreB > match.scoreA) teamB.wins++;
        else if (match.scoreB < match.scoreA) teamB.losses++;
      }
    }
  });

  teamsList = Array.from(teamsMap.values()).sort((a, b) => {
    if (a.group !== b.group) return a.group.localeCompare(b.group);
    return a.name.localeCompare(b.name);
  });
}

// ── Render teams grouped by group ────────────────────────────
function renderTeams() {
  const container = document.getElementById("teams-list");
  if (!teamsList.length) {
    container.innerHTML = '<p class="empty-state">Không tìm thấy đội nào.</p>';
    return;
  }

  // Group teams by group_name
  const groups = {};
  teamsList.forEach(team => {
    if (!groups[team.group]) groups[team.group] = [];
    groups[team.group].push(team);
  });

  let html = "";
  Object.keys(groups).sort().forEach(groupName => {
    const teams = groups[groupName];
    html += `
      <div class="group-section">
        <div class="group-header">
          <span class="group-label">Bảng ${esc(groupName)}</span>
          <span class="group-count">${teams.length} đội</span>
        </div>
        <div class="teams-grid">
          ${teams.map(team => teamCardHTML(team)).join("")}
        </div>
      </div>`;
  });

  container.innerHTML = html;
}

// ── Team card HTML ───────────────────────────────────────────
function teamCardHTML(team) {
  const teamId = sanitizeId(team.name);
  return `
    <div class="team-card" id="card-${teamId}">
      <div class="team-card-header">
        <div class="team-name" id="name-${teamId}">${esc(team.name)}</div>
        <div class="team-group">Bảng ${esc(team.group)}</div>
      </div>

      <div class="team-stats">
        <div class="team-stat">
          <span>🎮</span>
          <span>${team.matches} trận</span>
        </div>
        <div class="team-stat">
          <span>✅</span>
          <span>${team.wins} thắng</span>
        </div>
        <div class="team-stat">
          <span>❌</span>
          <span>${team.losses} thua</span>
        </div>
      </div>

      <div class="team-actions">
        <button class="btn-edit" onclick="toggleEdit('${teamId}')">
          ✏️ Sửa tên
        </button>
      </div>

      <div class="team-edit-form" id="edit-${teamId}" data-original-name="${esc(team.name)}">
        <input
          type="text"
          class="team-input"
          id="input-${teamId}"
          value="${esc(team.name)}"
          placeholder="Nhập tên đội mới"
        />
        <div style="display: flex; gap: 8px;">
          <button class="btn-edit btn-save" onclick="saveTeamName('${teamId}')">
            💾 Lưu
          </button>
          <button class="btn-edit btn-cancel" onclick="cancelEdit('${teamId}')">
            ✖️ Hủy
          </button>
        </div>
      </div>
    </div>`;
}

// ── Toggle edit form ──────────────────────────────────────────
function toggleEdit(teamId) {
  // Close all other edit forms
  document.querySelectorAll(".team-edit-form").forEach(form => {
    form.classList.remove("active");
  });

  // Open this edit form
  const form = document.getElementById(`edit-${teamId}`);
  if (form) {
    form.classList.add("active");
    const input = document.getElementById(`input-${teamId}`);
    if (input) {
      input.focus();
      input.select();
    }
  }
}

// ── Cancel edit ───────────────────────────────────────────────
function cancelEdit(teamId) {
  const form = document.getElementById(`edit-${teamId}`);
  if (form) form.classList.remove("active");
}

// ── Save team name ────────────────────────────────────────────
async function saveTeamName(teamId) {
  const form = document.getElementById(`edit-${teamId}`);
  const input = document.getElementById(`input-${teamId}`);
  if (!input || !form) return;

  const oldName = form.dataset.originalName || '';
  const newName = input.value.trim();
  if (!newName) {
    alert("Tên đội không được để trống!");
    return;
  }

  if (newName === oldName) {
    cancelEdit(teamId);
    return;
  }

  // Confirm change
  if (!confirm(`Đổi tên đội:\n"${oldName}" → "${newName}"\n\nTất cả trận đấu sẽ được cập nhật. Tiếp tục?`)) {
    return;
  }

  setStatus("Đang cập nhật...", "");

  // Update all matches with this team name
  const matchesToUpdate = allMatches.filter(m => 
    m.teamA === oldName || m.teamB === oldName
  );

  if (!db) {
    // Demo mode - update localStorage
    matchesToUpdate.forEach(match => {
      if (match.teamA === oldName) match.teamA = newName;
      if (match.teamB === oldName) match.teamB = newName;
    });
    localStorage.setItem("pb_matches", JSON.stringify(allMatches));
    setStatus(`Đã đổi tên ${matchesToUpdate.length} trận đấu ✓`, "ok");
    await loadTeams();
    return;
  }

  // Supabase - update each match
  let successCount = 0;
  let errorCount = 0;

  for (const match of matchesToUpdate) {
    const updates = {};
    if (match.teamA === oldName) updates.teamA = newName;
    if (match.teamB === oldName) updates.teamB = newName;

    const { error } = await db
      .from("matches")
      .update(updates)
      .eq("id", match.id);

    if (error) {
      console.error("Update error:", error);
      errorCount++;
    } else {
      successCount++;
    }
  }

  if (errorCount > 0) {
    setStatus(`Cập nhật: ${successCount} thành công, ${errorCount} lỗi`, "err");
  } else {
    setStatus(`Đã cập nhật ${successCount} trận đấu ✓`, "ok");
  }

  await loadTeams();
}

// ── Sanitize ID for HTML ──────────────────────────────────────
function sanitizeId(str) {
  return str.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
}

// ── Escape HTML ───────────────────────────────────────────────
function esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ── Status bar ────────────────────────────────────────────────
function setStatus(msg, type = "") {
  const el = document.getElementById("status-bar");
  if (!el) return;
  el.textContent = msg;
  el.className = "status-chip " + type;
}
