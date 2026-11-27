/* ============================================================
   minigame.js — Mini-game mode (2 CLB giao lưu)
   ------------------------------------------------------------
   Active when tournament.config.mode === 'minigame'. Replaces the
   default VĐV / Đội / Standings renderers inside admin.html with a
   two-club workflow:
     - VĐV grouped by club_name, admin can add/edit/delete inline
     - Đội are ad-hoc pairs (1 VĐV có thể ở nhiều cặp)
     - Trận are BO1 chạm 11 between 2 pairs
     - Tổng kết aggregates wins per club
   All DB writes go through the same storage/tournamentManager
   helpers used by the default flow — no new API surface.
   ============================================================ */

(function () {
  "use strict";

  // Palette assigned by club INDEX in tournament.config.clubs so any club
  // name (even after a rename) still gets a distinct color.
  const CLUB_PALETTE = [
    { bg: '#3b82f6', fg: '#fff', soft: 'rgba(59,130,246,0.14)' },  // blue  → CLB 1
    { bg: '#ef4444', fg: '#fff', soft: 'rgba(239,68,68,0.14)' },   // red   → CLB 2
    { bg: '#22c55e', fg: '#fff', soft: 'rgba(34,197,94,0.14)' },   // green
    { bg: '#f59e0b', fg: '#fff', soft: 'rgba(245,158,11,0.14)' },  // amber
  ];
  const FALLBACK_COLOR = { bg: '#7c3aed', fg: '#fff', soft: 'rgba(124,58,237,0.14)' };
  function clubColor(name) {
    const t = window._activeTournament || window._publicTournament;
    const clubs = t ? getClubs(t) : [];
    const idx = clubs.indexOf(name);
    if (idx >= 0 && CLUB_PALETTE[idx]) return CLUB_PALETTE[idx];
    return FALLBACK_COLOR;
  }

  function esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ----- Mode detection ------------------------------------------------
  function isMinigame(tournament) {
    return !!(tournament && tournament.config && tournament.config.mode === 'minigame');
  }

  function getClubs(tournament) {
    const c = tournament?.config?.clubs;
    return Array.isArray(c) && c.length ? c : ['Sóc Sơn', 'Đà Nẵng'];
  }

  // ====================================================================
  // 1. TAB VĐV — list per-club + add/edit/delete + club picker
  // ====================================================================
  async function renderMembersTab(tournament) {
    const container = document.getElementById('members-list-container');
    if (!container) return;
    const tid = tournament.id;
    const clubs = getClubs(tournament);

    try {
      const [participants, allMembers] = await Promise.all([
        window.tournamentManager.getParticipantsWithMembers(tid),
        window.storage.read('members')
      ]);

      // Index members by id for quick lookup when adding (search box)
      const byClub = {};
      clubs.forEach(c => { byClub[c] = []; });
      const other = [];
      participants.forEach(p => {
        const name = p.club_name;
        if (byClub[name]) byClub[name].push(p);
        else other.push(p);
      });

      const clubColumn = (clubName) => {
        const color = clubColor(clubName);
        const list = byClub[clubName] || [];
        const rows = list.map(p => {
          const m = p.member || {};
          const memberName = m.name || m.phone || `Thành viên ${p.member_id}`;
          const tier = p.effective_tier || m.tier || 2;
          return `
            <div class="mg-member-row" data-pid="${p.id}" data-mid="${p.member_id}">
              <div class="mg-name-input"
                   contenteditable="true"
                   spellcheck="false"
                   data-original="${esc(memberName)}"
                   onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur();}"
                   onblur="mgEditMemberName('${p.member_id}', this.textContent)">${esc(memberName)}</div>
              <span class="mg-tier-badge mg-tier-${tier}">T${tier}</span>
              <button class="mg-row-del upcoming-only" title="Xóa khỏi giải"
                      onclick="mgRemoveParticipant('${p.id}')">✕</button>
            </div>`;
        }).join('') || '<p class="empty" style="margin:8px 4px;">— Chưa có VĐV —</p>';

        return `
          <div class="mg-club-col" style="--mg-club:${color.bg};--mg-club-soft:${color.soft};">
            <div class="mg-club-head">
              <span class="mg-club-dot"></span>
              <span class="mg-club-name">${esc(clubName)}</span>
              <span class="mg-club-count">${list.length}</span>
            </div>
            <div class="mg-member-list">${rows}</div>
            <div class="mg-add-row upcoming-only">
              <input type="text" placeholder="Tên VĐV mới…"
                     class="mg-add-name" id="mg-add-name-${esc(clubName)}"/>
              <select class="mg-add-tier" id="mg-add-tier-${esc(clubName)}">
                <option value="1">T1</option>
                <option value="2" selected>T2</option>
                <option value="3">T3</option>
              </select>
              <button class="mg-add-btn"
                      onclick="mgAddMember('${esc(clubName)}')">+ Thêm</button>
            </div>
          </div>`;
      };

      const totals = clubs.map(c => `${esc(c)}: <b>${(byClub[c] || []).length}</b>`).join(' · ');

      container.innerHTML = `
        <div class="mg-banner">
          🎯 <b>${esc(tournament.name)}</b> — giao lưu 2 CLB, 25 trận BO1 chạm 11.
          <div class="mg-totals">${totals}</div>
        </div>
        <div class="mg-club-grid">
          ${clubs.map(clubColumn).join('')}
        </div>`;
      if (typeof applyTournamentStatusVisibility === 'function') applyTournamentStatusVisibility();
    } catch (err) {
      console.error('mg renderMembersTab:', err);
      container.innerHTML = '<p class="empty" style="color:#ef4444;">Lỗi khi tải VĐV</p>';
    }
  }

  // Add a new member (creates a row in members + ties to this tournament)
  window.mgAddMember = async function (clubName) {
    const tid = window.tournamentManager.getActiveTournamentId();
    if (!tid) return;
    const nameInput = document.getElementById(`mg-add-name-${clubName}`);
    const tierSel   = document.getElementById(`mg-add-tier-${clubName}`);
    const name = (nameInput?.value || '').trim();
    const tier = parseInt(tierSel?.value || '2', 10);
    if (!name) { nameInput?.focus(); return; }
    try {
      // 1. Create member row
      const member = await window.storage.create('members', { name, tier });
      const newId = Array.isArray(member) ? member[0].id : member.id;
      // 2. Register as participant with club_name
      await window.storage.create('tournament_participants', {
        tournament_id: tid,
        member_id: newId,
        club_name: clubName
      });
      if (nameInput) nameInput.value = '';
      await window.minigame.reload();
    } catch (err) {
      console.error('mgAddMember:', err);
      alert('Không thể thêm VĐV: ' + err.message);
    }
  };

  // Admin-only inline rename. Cascades the new name into every team label
  // and every match's cached team_a / team_b string — otherwise the Trận
  // list would keep showing the old name because those fields are
  // denormalized from members at write-time.
  window.mgEditMemberName = async function (memberId, newName) {
    if (typeof isAdmin === 'function' && !isAdmin()) {
      alert('Chỉ admin mới sửa được tên VĐV.');
      await window.minigame.reload();
      return;
    }
    const name = (newName || '').trim();
    if (!name) return window.minigame.reload();
    try {
      await window.storage.update('members', memberId, { name });
      await cascadeRelabel(window.tournamentManager.getActiveTournamentId());
      await window.minigame.reload();
    } catch (err) {
      console.error('mgEditMemberName:', err);
      alert('Không đổi được tên: ' + err.message);
      await window.minigame.reload();
    }
  };

  /**
   * Rebuild denormalized team.name + match.team_a / match.team_b strings
   * from the current members table. Called after any mutation that could
   * change a displayed player name (rename, pair swap).
   *
   * Writes are issued only when the computed label differs from what's
   * already stored, so rerunning this is cheap when nothing is stale.
   */
  async function cascadeRelabel(tid) {
    if (!tid) return;
    const [members, teams, matches] = await Promise.all([
      window.storage.read('members'),
      window.storage.read('teams',   { tournament_id: tid }),
      window.storage.read('matches', { tournament_id: tid })
    ]);
    const memberById = new Map(members.map(m => [String(m.id), m]));
    const labelFor = (team) => {
      const n1 = memberById.get(String(team.member1_id))?.name || '';
      const n2 = memberById.get(String(team.member2_id))?.name || '';
      return `${n1} + ${n2}`;
    };

    const teamUpdates = [];
    const teamById = new Map();
    for (const t of teams) {
      const newName = labelFor(t);
      if (t.name !== newName) {
        teamUpdates.push(window.storage.update('teams', t.id, { name: newName }));
      }
      teamById.set(String(t.id), { ...t, name: newName });
    }
    await Promise.all(teamUpdates);

    const matchUpdates = [];
    for (const m of matches) {
      const tA = teamById.get(String(m.team_a_id));
      const tB = teamById.get(String(m.team_b_id));
      if (!tA || !tB) continue;
      if (m.team_a !== tA.name || m.team_b !== tB.name) {
        matchUpdates.push(window.storage.update('matches', m.id, {
          team_a: tA.name,
          team_b: tB.name
        }));
      }
    }
    await Promise.all(matchUpdates);
  }

  // Remove from current tournament (participant only — member row is kept
  // so other giải still see them)
  window.mgRemoveParticipant = async function (participantId) {
    if (!confirm('Xóa VĐV khỏi giải này?')) return;
    try {
      await window.storage.delete('tournament_participants', participantId);
      await window.minigame.reload();
    } catch (err) {
      console.error('mgRemoveParticipant:', err);
      alert('Không xóa được: ' + err.message);
    }
  };

  // ====================================================================
  // 2. TAB ĐỘI — create ad-hoc pairs (1 VĐV ở nhiều cặp OK)
  // ====================================================================
  async function renderTeamsTab(tournament) {
    const container = document.getElementById('teams-list-container');
    if (!container) return;
    const tid = tournament.id;

    try {
      const [participants, teams] = await Promise.all([
        window.tournamentManager.getParticipantsWithMembers(tid),
        window.tournamentManager.getTeamsWithMembers(tid)
      ]);

      const byId = new Map();
      participants.forEach(p => byId.set(String(p.member_id), p));

      // Grouped list of existing pairs, per club
      const byClub = {};
      getClubs(tournament).forEach(c => { byClub[c] = []; });
      teams.forEach(t => {
        const c = t.group_name || '—';
        if (!byClub[c]) byClub[c] = [];
        byClub[c].push(t);
      });

      // Pre-build the member-options string once per club so each pair's
      // edit dropdown can reuse it without a per-pair loop.
      const optsForClub = (clubName) => participants
        .filter(p => p.club_name === clubName)
        .map(p => {
          const n = p.member?.name || `#${p.member_id}`;
          return `<option value="${p.member_id}">${esc(n)}</option>`;
        }).join('');

      const pairCard = (t) => {
        const n1 = t.member1?.name || `#${t.member1_id}`;
        const n2 = t.member2?.name || `#${t.member2_id}`;
        const clubOpts = optsForClub(t.group_name);
        return `
          <div class="mg-pair-card" data-pair-id="${t.id}">
            <div class="mg-pair-row-display">
              <span class="mg-pair-names">${esc(n1)} + ${esc(n2)}</span>
              <button class="mg-pair-edit" title="Sửa cặp"
                      onclick="mgTogglePairEdit('${t.id}')">✏️</button>
              <button class="mg-row-del upcoming-only" title="Xóa cặp"
                      onclick="mgDeletePair('${t.id}')">✕</button>
            </div>
            <div class="mg-pair-row-edit" id="mg-pair-edit-${t.id}" hidden>
              <select id="mg-edit1-${t.id}" data-selected="${t.member1_id}">${clubOpts}</select>
              <span class="mg-pair-plus">+</span>
              <select id="mg-edit2-${t.id}" data-selected="${t.member2_id}">${clubOpts}</select>
              <button class="mg-add-btn mg-pair-save"
                      onclick="mgSavePairEdit('${t.id}')">💾 Lưu</button>
              <button class="mg-pair-cancel"
                      onclick="mgTogglePairEdit('${t.id}')" title="Hủy">✕</button>
            </div>
          </div>`;
      };

      // Picker UI: 2 selects per club + "Tạo cặp" button
      const pickerPerClub = (clubName) => {
        const members = participants.filter(p => p.club_name === clubName);
        const opts = members.map(p => {
          const n = p.member?.name || `#${p.member_id}`;
          return `<option value="${p.member_id}">${esc(n)}</option>`;
        }).join('');
        const existing = (byClub[clubName] || []).map(pairCard).join('')
                      || '<p class="empty" style="margin:8px 4px;">— Chưa có cặp —</p>';
        const color = clubColor(clubName);
        return `
          <div class="mg-club-col" style="--mg-club:${color.bg};--mg-club-soft:${color.soft};">
            <div class="mg-club-head">
              <span class="mg-club-dot"></span>
              <span class="mg-club-name">${esc(clubName)}</span>
              <span class="mg-club-count">${(byClub[clubName] || []).length} cặp</span>
            </div>
            <div class="mg-pair-picker upcoming-only">
              <select id="mg-pick1-${esc(clubName)}"><option value="">VĐV 1…</option>${opts}</select>
              <span>+</span>
              <select id="mg-pick2-${esc(clubName)}"><option value="">VĐV 2…</option>${opts}</select>
              <button class="mg-add-btn" onclick="mgCreatePair('${esc(clubName)}')">+ Tạo cặp</button>
            </div>
            <div class="mg-pair-list">${existing}</div>
          </div>`;
      };

      container.innerHTML = `
        <div class="mg-banner small">
          Tạo cặp ad-hoc theo CLB. 1 VĐV có thể xuất hiện ở nhiều cặp — cứ chọn lại.
          <br>Sau khi giải bắt đầu, nút <b>✏️</b> trên mỗi cặp vẫn cho phép sửa.
        </div>
        <div class="mg-club-grid">
          ${getClubs(tournament).map(pickerPerClub).join('')}
        </div>`;
      if (typeof applyTournamentStatusVisibility === 'function') applyTournamentStatusVisibility();
    } catch (err) {
      console.error('mg renderTeamsTab:', err);
      container.innerHTML = '<p class="empty" style="color:#ef4444;">Lỗi khi tải cặp</p>';
    }
  }

  window.mgCreatePair = async function (clubName) {
    const tid = window.tournamentManager.getActiveTournamentId();
    if (!tid) return;
    const s1 = document.getElementById(`mg-pick1-${clubName}`);
    const s2 = document.getElementById(`mg-pick2-${clubName}`);
    const m1 = s1?.value, m2 = s2?.value;
    if (!m1 || !m2) return alert('Chọn đủ 2 VĐV.');
    if (m1 === m2)  return alert('2 VĐV phải khác nhau.');
    try {
      // Pull names for the team display label
      const members = await window.storage.read('members');
      const n1 = members.find(x => x.id == m1)?.name || `#${m1}`;
      const n2 = members.find(x => x.id == m2)?.name || `#${m2}`;
      await window.storage.create('teams', {
        tournament_id: tid,
        name: `${n1} + ${n2}`,
        member1_id: m1,
        member2_id: m2,
        group_name: clubName
      });
      if (s1) s1.value = '';
      if (s2) s2.value = '';
      await window.minigame.reload();
    } catch (err) {
      console.error('mgCreatePair:', err);
      alert('Không tạo được cặp: ' + err.message);
    }
  };

  // Toggle the inline edit row for a pair. Also seeds the two selects
  // with the current members (HTML `selected` can't be set declaratively
  // because the same optgroup is reused across all pairs).
  window.mgTogglePairEdit = function (teamId) {
    const row = document.getElementById(`mg-pair-edit-${teamId}`);
    if (!row) return;
    const nowVisible = row.hasAttribute('hidden');
    if (nowVisible) {
      ['mg-edit1', 'mg-edit2'].forEach(prefix => {
        const sel = document.getElementById(`${prefix}-${teamId}`);
        if (sel) sel.value = sel.dataset.selected || '';
      });
      row.removeAttribute('hidden');
    } else {
      row.setAttribute('hidden', '');
    }
  };

  window.mgSavePairEdit = async function (teamId) {
    const m1 = document.getElementById(`mg-edit1-${teamId}`)?.value;
    const m2 = document.getElementById(`mg-edit2-${teamId}`)?.value;
    if (!m1 || !m2) return alert('Chọn đủ 2 VĐV.');
    if (m1 === m2)   return alert('2 VĐV phải khác nhau.');
    try {
      await window.storage.update('teams', teamId, {
        member1_id: m1,
        member2_id: m2
      });
      // Cascade rebuilds this team's name + any match string that refs it.
      await cascadeRelabel(window.tournamentManager.getActiveTournamentId());
      await window.minigame.reload();
    } catch (err) {
      console.error('mgSavePairEdit:', err);
      alert('Không lưu được: ' + err.message);
    }
  };

  window.mgDeletePair = async function (teamId) {
    if (!confirm('Xóa cặp này?')) return;
    try {
      await window.storage.delete('teams', teamId);
      await window.minigame.reload();
    } catch (err) {
      console.error('mgDeletePair:', err);
      alert('Không xóa được: ' + err.message);
    }
  };

  // ====================================================================
  // 3. TAB TRẬN — categories: đôi nam / đôi nam nữ / đôi nữ
  // ====================================================================
  const CATEGORIES = [
    { key: 'dn',  label: '⚔️ Đôi nam' },
    { key: 'dnn', label: '🤝 Đôi nam nữ' },
    { key: 'nu',  label: '👯 Đôi nữ' }
  ];

  // Persist collapse state across renders (fetchMatches rebuilds the HTML).
  const _collapsedCats = new Set();

  // Render the 25 (or however many) mini-game matches grouped by category
  // under #match-list-group. Delegates each category's card rendering to
  // the existing renderStageList so the tap-to-score UI stays identical.
  function renderMinigameMatches(matches) {
    const host = document.getElementById('match-list-group');
    if (!host) return;
    // Scaffold one sub-container per category. Title is clickable to
    // collapse/expand the body. Chevron reflects state.
    host.innerHTML = CATEGORIES.map(c => {
      const collapsed = _collapsedCats.has(c.key);
      return `
        <div class="mg-match-category">
          <div class="mg-match-category-title" onclick="mgToggleCategory('${c.key}')" role="button">
            <span class="mg-cat-label">${c.label}</span>
            <span class="mg-match-category-count" id="mg-cat-count-${c.key}">0</span>
            <span class="mg-cat-chev" id="mg-cat-chev-${c.key}">${collapsed ? '▶' : '▼'}</span>
          </div>
          <div class="mg-match-category-body" id="mg-cat-${c.key}" ${collapsed ? 'hidden' : ''}></div>
        </div>`;
    }).join('');
    CATEGORIES.forEach(c => {
      const sub = matches.filter(m => (m.group_name || 'dn') === c.key)
                         .sort((a, b) => (a.match_order || 0) - (b.match_order || 0));
      const countEl = document.getElementById(`mg-cat-count-${c.key}`);
      if (countEl) countEl.textContent = sub.length;
      if (typeof renderStageList === 'function') {
        renderStageList(`mg-cat-${c.key}`, sub, 'group');
      }
    });
    // Decorate each .adm-match-card:
    //  1. Match-order badge (#N) in the top-left so the referee can see
    //     the planned order at a glance.
    //  2. 🔀 "Đổi cặp" admin button in the top-right.
    const matchById = new Map(matches.map(m => [String(m.id), m]));
    host.querySelectorAll('.adm-match-card').forEach(card => {
      const id = card.getAttribute('data-id');
      if (!id) return;
      if (!card.querySelector('.mg-match-order')) {
        const m = matchById.get(String(id));
        const ord = m?.match_order;
        if (ord) {
          const tag = document.createElement('span');
          tag.className = 'mg-match-order';
          tag.textContent = `#${ord}`;
          card.appendChild(tag);
        }
      }
      if (!card.querySelector('.mg-match-pair-edit')) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'mg-match-pair-edit admin-only';
        btn.title = 'Đổi cặp cho trận này';
        btn.textContent = '🔀';
        btn.addEventListener('click', (e) => {
          e.stopPropagation(); // don't toggle the card
          window.mgOpenMatchEdit(id);
        });
        card.appendChild(btn);
      }
      if (!card.querySelector('.mg-match-score-entry')) {
        const sbtn = document.createElement('button');
        sbtn.type = 'button';
        sbtn.className = 'mg-match-score-entry admin-only';
        sbtn.title = 'Nhập điểm thủ công & kết thúc';
        sbtn.textContent = '📝';
        sbtn.addEventListener('click', (e) => {
          e.stopPropagation();
          window.mgOpenScoreEntry(id);
        });
        card.appendChild(sbtn);
      }
      if (!card.querySelector('.mg-match-reset')) {
        const rbtn = document.createElement('button');
        rbtn.type = 'button';
        rbtn.className = 'mg-match-reset admin-only';
        rbtn.title = 'Reset trận về "Chưa bắt đầu"';
        rbtn.textContent = '↺';
        rbtn.addEventListener('click', (e) => {
          e.stopPropagation();
          window.mgResetMatch(id);
        });
        card.appendChild(rbtn);
      }
    });
    if (typeof applyRoleVisibility === 'function') applyRoleVisibility();
  }

  // Click the category title to collapse/expand that block. State is
  // remembered in _collapsedCats so a background fetchMatches re-render
  // doesn't snap everything open again.
  window.mgToggleCategory = function (key) {
    const body = document.getElementById(`mg-cat-${key}`);
    const chev = document.getElementById(`mg-cat-chev-${key}`);
    if (!body) return;
    const willHide = !body.hasAttribute('hidden');
    if (willHide) {
      body.setAttribute('hidden', '');
      _collapsedCats.add(key);
    } else {
      body.removeAttribute('hidden');
      _collapsedCats.delete(key);
    }
    if (chev) chev.textContent = willHide ? '▶' : '▼';
  };

  // ----- Edit match pairs (admin swaps which 2 pairs play a given trận) -----
  window.mgOpenMatchEdit = async function (matchId) {
    window.mgCloseMatchEdit();
    const tid = window.tournamentManager.getActiveTournamentId();
    if (!tid) return;
    try {
      const [matches, teams] = await Promise.all([
        window.tournamentManager.getMatches(tid),
        window.tournamentManager.getTeamsWithMembers(tid)
      ]);
      const m = matches.find(x => String(x.id) === String(matchId));
      if (!m) return;
      const tournament = window._activeTournament;
      const clubs = getClubs(tournament);
      const [clubA, clubB] = clubs;
      const teamsA = teams.filter(t => t.group_name === clubA);
      const teamsB = teams.filter(t => t.group_name === clubB);
      const opt = (t, selId) => {
        const n1 = t.member1?.name || '';
        const n2 = t.member2?.name || '';
        const label = n1 && n2 ? `${n1} + ${n2}` : (t.name || `#${t.id}`);
        return `<option value="${t.id}" ${String(t.id) === String(selId) ? 'selected' : ''}>${esc(label)}</option>`;
      };
      const html = `
        <div class="mg-modal-overlay" id="mg-match-edit-overlay"
             onclick="if(event.target===this)mgCloseMatchEdit()">
          <div class="mg-modal">
            <div class="mg-modal-title">🔀 Đổi cặp cho trận #${m.match_order || '?'}</div>
            <div class="mg-modal-note">${esc(CATEGORIES.find(c => c.key === (m.group_name || 'dn'))?.label || '')}</div>
            <div class="mg-modal-row">
              <label>${esc(clubA)}</label>
              <select id="mg-match-edit-a">
                <option value="">— Chọn cặp —</option>
                ${teamsA.map(t => opt(t, m.team_a_id)).join('')}
              </select>
            </div>
            <div class="mg-modal-row">
              <label>${esc(clubB)}</label>
              <select id="mg-match-edit-b">
                <option value="">— Chọn cặp —</option>
                ${teamsB.map(t => opt(t, m.team_b_id)).join('')}
              </select>
            </div>
            <div class="mg-modal-actions">
              <button class="mg-modal-cancel" onclick="mgCloseMatchEdit()">Hủy</button>
              <button class="mg-add-btn" onclick="mgSaveMatchEdit('${matchId}')">💾 Lưu</button>
            </div>
          </div>
        </div>`;
      document.body.insertAdjacentHTML('beforeend', html);
    } catch (err) {
      console.error('mgOpenMatchEdit:', err);
      alert('Không mở được: ' + err.message);
    }
  };

  window.mgCloseMatchEdit = function () {
    document.querySelectorAll('#mg-match-edit-overlay').forEach(el => el.remove());
  };

  window.mgSaveMatchEdit = async function (matchId) {
    const aId = document.getElementById('mg-match-edit-a')?.value;
    const bId = document.getElementById('mg-match-edit-b')?.value;
    if (!aId || !bId) return alert('Chọn đủ 2 cặp.');
    try {
      const tid = window.tournamentManager.getActiveTournamentId();
      const teams = await window.tournamentManager.getTeamsWithMembers(tid);
      const a = teams.find(t => String(t.id) === String(aId));
      const b = teams.find(t => String(t.id) === String(bId));
      const nameOf = (x) => x?.name ||
        `${x?.member1?.name || ''} + ${x?.member2?.name || ''}`;
      await window.storage.update('matches', matchId, {
        team_a_id: aId,
        team_b_id: bId,
        team_a: nameOf(a),
        team_b: nameOf(b)
      });
      window.mgCloseMatchEdit();
      if (typeof fetchMatches === 'function') await fetchMatches();
    } catch (err) {
      console.error('mgSaveMatchEdit:', err);
      alert('Không lưu được: ' + err.message);
    }
  };

  async function renderMatchBuilder(tournament) {
    const host = document.getElementById('tab-matches') || document.getElementById('match-list-group');
    if (!host) return;
    // Remove previous builder if any
    const old = document.getElementById('mg-match-builder');
    if (old) old.remove();

    const tid = tournament.id;
    const [teams, matches] = await Promise.all([
      window.tournamentManager.getTeamsWithMembers(tid),
      window.tournamentManager.getMatches(tid)
    ]);
    const clubs = getClubs(tournament);
    const clubA = clubs[0], clubB = clubs[1];
    const teamsA = teams.filter(t => t.group_name === clubA);
    const teamsB = teams.filter(t => t.group_name === clubB);

    const opt = (t) => {
      const n1 = t.member1?.name || t.name || `#${t.id}`;
      const n2 = t.member2?.name || '';
      const label = n2 ? `${n1} + ${n2}` : n1;
      return `<option value="${t.id}">${esc(label)}</option>`;
    };

    const nextOrder = (matches.filter(m => m.stage === 'minigame').length) + 1;
    const builder = document.createElement('div');
    builder.id = 'mg-match-builder';
    // admin-only: hide the whole creator for referees + viewers.
    // upcoming-only: hide once the giải has started.
    builder.className = 'adm-section admin-only upcoming-only';
    builder.innerHTML = `
      <button type="button" class="mg-add-btn mg-add-match-toggle"
              onclick="mgToggleMatchForm()">
        ➕ Thêm trận đấu
      </button>
      <div class="mg-match-form-wrap" id="mg-match-form-wrap" hidden>
        <div class="adm-section-title">Tạo trận #${nextOrder}</div>
        <div class="mg-match-form">
          <div class="mg-match-side mg-match-cat">
            <label>Thể loại</label>
            <select id="mg-match-cat">
              ${CATEGORIES.map(c => `<option value="${c.key}">${c.label}</option>`).join('')}
            </select>
          </div>
          <div class="mg-match-side">
            <label>${esc(clubA)}</label>
            <input type="text" placeholder="🔍 Lọc cặp…" oninput="mgFilterSelect('mg-match-a', this.value)">
            <select id="mg-match-a"><option value="">— Chọn cặp —</option>${teamsA.map(opt).join('')}</select>
          </div>
          <span class="mg-vs">VS</span>
          <div class="mg-match-side">
            <label>${esc(clubB)}</label>
            <input type="text" placeholder="🔍 Lọc cặp…" oninput="mgFilterSelect('mg-match-b', this.value)">
            <select id="mg-match-b"><option value="">— Chọn cặp —</option>${teamsB.map(opt).join('')}</select>
          </div>
          <button class="mg-add-btn" onclick="mgCreateMatch()">+ Tạo</button>
          <button type="button" class="mg-pair-cancel"
                  onclick="mgToggleMatchForm()" title="Hủy">✕</button>
        </div>
      </div>`;
    host.insertBefore(builder, host.firstChild);
    if (typeof applyTournamentStatusVisibility === 'function') applyTournamentStatusVisibility();
    if (typeof applyRoleVisibility === 'function') applyRoleVisibility();
  }

  // Toggle the match-creation form in/out of view. Default state is
  // collapsed — admin sees just a "Thêm trận đấu" button.
  window.mgToggleMatchForm = function () {
    const wrap = document.getElementById('mg-match-form-wrap');
    const btn  = document.querySelector('.mg-add-match-toggle');
    if (!wrap) return;
    const opening = wrap.hasAttribute('hidden');
    if (opening) {
      wrap.removeAttribute('hidden');
      if (btn) btn.style.display = 'none';
    } else {
      wrap.setAttribute('hidden', '');
      if (btn) btn.style.display = '';
    }
  };

  window.mgFilterSelect = function (selectId, q) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    const ql = q.toLowerCase();
    Array.from(sel.options).forEach(o => {
      if (!o.value) return; // keep placeholder
      o.hidden = ql && !o.textContent.toLowerCase().includes(ql);
    });
  };

  window.mgCreateMatch = async function () {
    const tid = window.tournamentManager.getActiveTournamentId();
    if (!tid) return;
    const aId = document.getElementById('mg-match-a')?.value;
    const bId = document.getElementById('mg-match-b')?.value;
    if (!aId || !bId) return alert('Chọn cặp cho cả 2 CLB.');

    try {
      const teams = await window.tournamentManager.getTeamsWithMembers(tid);
      const a = teams.find(t => t.id == aId);
      const b = teams.find(t => t.id == bId);
      const labelA = a?.name || `${a?.member1?.name || ''} + ${a?.member2?.name || ''}`;
      const labelB = b?.name || `${b?.member1?.name || ''} + ${b?.member2?.name || ''}`;

      const matches = await window.tournamentManager.getMatches(tid);
      const order = matches.filter(m => m.stage === 'minigame').length + 1;

      const cat = document.getElementById('mg-match-cat')?.value || 'dn';
      await window.storage.create('matches', {
        tournament_id: tid,
        team_a: labelA,
        team_b: labelB,
        team_a_id: aId,
        team_b_id: bId,
        stage: 'minigame',
        status: 'not_started',
        match_type: 'exhibition',
        group_name: cat,
        match_order: order,
        s1a: 0, s1b: 0, s2a: 0, s2b: 0, s3a: 0, s3b: 0,
        score_a: 0, score_b: 0,
        match_config: {
          matchFormat: 'BO1',
          targetScore: 11,
          winByMargin: 2,
          firstServeSingle: true,
          enableFaultButtons: false
        }
      });
      await window.minigame.reload();
    } catch (err) {
      console.error('mgCreateMatch:', err);
      alert('Không tạo được trận: ' + err.message);
    }
  };

  // Delete a mini-game match (simple garbage removal)
  window.mgDeleteMatch = async function (matchId) {
    if (!confirm('Xóa trận này?')) return;
    try {
      await window.storage.delete('matches', matchId);
      await window.minigame.reload();
    } catch (err) {
      console.error('mgDeleteMatch:', err);
      alert('Không xóa được: ' + err.message);
    }
  };

  // ====================================================================
  // 4. TAB STANDINGS → tổng kết 2 CLB (win-count per club)
  // ====================================================================
  async function renderStandings(tournament) {
    const container = document.getElementById('standings-container');
    if (!container) return;
    try {
      const matches = await window.tournamentManager.getMatches(tournament.id);
      const teams = await window.tournamentManager.getTeamsWithMembers(tournament.id);
      const clubOf = new Map();
      teams.forEach(t => clubOf.set(String(t.id), t.group_name));

      const clubs = getClubs(tournament);
      const tally = {};
      clubs.forEach(c => { tally[c] = { wins: 0, losses: 0, played: 0, pointsFor: 0, pointsAgainst: 0 }; });

      let total = 0, done = 0;
      matches.forEach(m => {
        if (m.stage !== 'minigame') return;
        total++;
        const clubA = clubOf.get(String(m.team_a_id));
        const clubB = clubOf.get(String(m.team_b_id));
        if (!clubA || !clubB || !tally[clubA] || !tally[clubB]) return;
        if (m.status !== 'done' && m.status !== 'completed') return;
        done++;
        const sa = m.score_a || 0, sb = m.score_b || 0;
        tally[clubA].pointsFor += sa; tally[clubA].pointsAgainst += sb;
        tally[clubB].pointsFor += sb; tally[clubB].pointsAgainst += sa;
        tally[clubA].played++; tally[clubB].played++;
        if (sa > sb)      { tally[clubA].wins++;   tally[clubB].losses++; }
        else if (sb > sa) { tally[clubB].wins++;   tally[clubA].losses++; }
      });

      const ranked = clubs.map(c => ({ club: c, ...tally[c] }))
                          .sort((x, y) => (y.wins - x.wins) || ((y.pointsFor - y.pointsAgainst) - (x.pointsFor - x.pointsAgainst)));

      const leader = ranked[0]?.wins > (ranked[1]?.wins ?? -1)
        ? `🏆 <b>${esc(ranked[0].club)}</b> đang dẫn (${ranked[0].wins} - ${ranked[1]?.wins ?? 0})`
        : done === 0
          ? 'Chưa có trận nào kết thúc.'
          : `Đang hoà: ${ranked.map(r => `${esc(r.club)} ${r.wins}`).join(' - ')}`;

      // Per-player stats table — for each member of every done match,
      // credit/debit wins, losses, pointsFor, pointsAgainst.
      const members = await window.storage.read('members');
      const participants = await window.tournamentManager.getParticipantsWithMembers(tournament.id);
      const memberById = new Map(members.map(m => [String(m.id), m]));
      const partById  = new Map(participants.map(p => [String(p.member_id), p]));
      const teamById  = new Map(teams.map(t => [String(t.id), t]));
      const playerStats = new Map();
      // Seed every participant with 0s so the table lists all VĐV from
      // day 1 — not just the ones who've already played a match.
      participants.forEach(p => {
        playerStats.set(String(p.member_id), {
          memberId: p.member_id,
          name: p.member?.name || `#${p.member_id}`,
          club: p.club_name || '',
          wins: 0, losses: 0, played: 0,
          pointsFor: 0, pointsAgainst: 0
        });
      });
      const bumpPlayer = (mid, winLoss, scored, conceded) => {
        if (!mid) return;
        if (!playerStats.has(mid)) {
          const mem = memberById.get(String(mid));
          const pt  = partById.get(String(mid));
          playerStats.set(mid, {
            memberId: mid,
            name: mem?.name || `#${mid}`,
            club: pt?.club_name || '',
            wins: 0, losses: 0, played: 0,
            pointsFor: 0, pointsAgainst: 0
          });
        }
        const s = playerStats.get(mid);
        s.played++;
        if (winLoss) s[winLoss]++;   // null on the (rare) draw path
        s.pointsFor += scored;
        s.pointsAgainst += conceded;
      };
      matches.forEach(m => {
        if (m.stage !== 'minigame') return;
        if (m.status !== 'done' && m.status !== 'completed') return;
        const tA = teamById.get(String(m.team_a_id));
        const tB = teamById.get(String(m.team_b_id));
        if (!tA || !tB) return;
        const sa = m.score_a || 0, sb = m.score_b || 0;
        const aWon = sa > sb, bWon = sb > sa;
        [tA.member1_id, tA.member2_id].forEach(mid =>
          bumpPlayer(mid, aWon ? 'wins' : bWon ? 'losses' : null, sa, sb));
        [tB.member1_id, tB.member2_id].forEach(mid =>
          bumpPlayer(mid, bWon ? 'wins' : aWon ? 'losses' : null, sb, sa));
      });

      const playerRows = Array.from(playerStats.values())
        .sort((x, y) => (y.wins - x.wins)
                     || ((y.pointsFor - y.pointsAgainst) - (x.pointsFor - x.pointsAgainst))
                     || (y.played - x.played)
                     || x.name.localeCompare(y.name));

      const playedCount = playerRows.filter(p => p.played > 0).length;
      const playerTable = playerRows.length ? `
        <div class="mg-player-stats">
          <div class="mg-player-stats-title">
            👤 Thống kê theo vận động viên
            <span class="mg-player-stats-sub">${playedCount}/${playerRows.length} VĐV đã ra sân</span>
          </div>
          <div class="mg-player-table-wrap">
            <table class="mg-standings-table mg-player-table">
              <thead>
                <tr>
                  <th>#</th><th>VĐV</th><th>CLB</th>
                  <th>T</th><th>T̄</th><th>Trận</th>
                  <th>+</th><th>−</th><th>+/−</th>
                </tr>
              </thead>
              <tbody>
                ${playerRows.map((p, i) => {
                  const c = clubColor(p.club);
                  const diff = p.pointsFor - p.pointsAgainst;
                  return `<tr class="mg-player-row"
                              data-mid="${p.memberId}"
                              onclick="mgOpenPlayerMatches('${p.memberId}')">
                    <td class="mg-rank">${i + 1}</td>
                    <td class="mg-player-name">${esc(p.name)}</td>
                    <td><span class="mg-club-chip" style="background:${c.bg};color:${c.fg};">${esc(p.club)}</span></td>
                    <td><b>${p.wins}</b></td>
                    <td>${p.losses}</td>
                    <td>${p.played}</td>
                    <td>${p.pointsFor}</td>
                    <td>${p.pointsAgainst}</td>
                    <td>${diff > 0 ? '+' : ''}${diff}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>` : '';

      // Make the modal-opening function reachable from the row's onclick.
      window._mgPlayerStatsData = Array.from(playerStats.values());

      container.innerHTML = `
        <div class="mg-standings-top">
          ${leader}
          <span class="mg-standings-progress">${done}/${total} trận xong</span>
        </div>
        <table class="mg-standings-table">
          <thead>
            <tr><th>Hạng</th><th>CLB</th><th>Thắng</th><th>Thua</th><th>Đã chơi</th><th>Điểm +</th><th>Điểm −</th><th>+/−</th></tr>
          </thead>
          <tbody>
            ${ranked.map((r, i) => {
              const c = clubColor(r.club);
              return `<tr>
                <td class="mg-rank mg-rank-${i + 1}">${i + 1}</td>
                <td><span class="mg-club-chip" style="background:${c.bg};color:${c.fg};">${esc(r.club)}</span></td>
                <td><b>${r.wins}</b></td>
                <td>${r.losses}</td>
                <td>${r.played}</td>
                <td>${r.pointsFor}</td>
                <td>${r.pointsAgainst}</td>
                <td>${r.pointsFor - r.pointsAgainst > 0 ? '+' : ''}${r.pointsFor - r.pointsAgainst}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
        ${playerTable}`;
    } catch (err) {
      console.error('mg renderStandings:', err);
      container.innerHTML = '<p class="empty" style="color:#ef4444;">Lỗi khi tải bảng xếp hạng</p>';
    }
  }

  // ====================================================================
  // 5. DISPATCH — hook points called from admin.js when mode === minigame
  // ====================================================================
  async function reload() {
    if (!window._activeTournament || !isMinigame(window._activeTournament)) return;
    const t = window._activeTournament;
    // Only refresh the currently-visible tab to keep things cheap. The
    // tabs can be in display:none, so we check which is rendered.
    const visibleIsMembers  = document.getElementById('tab-members')?.style.display !== 'none';
    const visibleIsTeams    = document.getElementById('tab-teams')?.style.display !== 'none';
    const visibleIsStandings= document.getElementById('tab-standings')?.style.display !== 'none';
    const visibleIsMatches  = document.getElementById('tab-matches')?.style.display !== 'none';

    if (visibleIsMembers)  await renderMembersTab(t);
    if (visibleIsTeams)    await renderTeamsTab(t);
    if (visibleIsStandings)await renderStandings(t);
    if (visibleIsMatches)  { await renderMatchBuilder(t); if (typeof fetchMatches === 'function') await fetchMatches(); }
  }

  // ====================================================================
  // 6. PUBLIC VIEWER (index.html) — minimal layout for spectators
  //    • Live matches on top
  //    • Next ~5 upcoming
  //    • Collapsible full schedule, grouped by category
  //    (Standings/tổng kết is rendered by renderStandings in #standings-container.)
  // ====================================================================
  function renderPublicMinigame(matches, tournament) {
    const host = document.getElementById('match-list-group');
    if (!host) return;

    const mini = matches.filter(m => m.stage === 'minigame')
                        .sort((a, b) => (a.match_order || 0) - (b.match_order || 0));
    const live     = mini.filter(m => m.status === 'playing');
    const upcoming = mini.filter(m => m.status === 'not_started');
    const done     = mini.filter(m => m.status === 'done' || m.status === 'completed');
    const SHOW_NEXT = 5;

    const catOf = (m) => (CATEGORIES.find(c => c.key === (m.group_name || 'dn'))) || CATEGORIES[0];

    const card = (m, opts = {}) => {
      const cat = catOf(m);
      const score = (opts.showScore || m.status !== 'not_started')
        ? `<span class="mg-pub-score ${m.status === 'playing' ? 'live' : ''}">${m.score_a || 0}<span class="mg-pub-score-sep">—</span>${m.score_b || 0}</span>`
        : `<span class="mg-pub-vs">vs</span>`;
      const liveTag = m.status === 'playing'
        ? `<span class="mg-pub-live-dot" title="Đang diễn ra"></span>`
        : '';
      const timeTag = m.match_time ? `<span class="mg-pub-time">🕐 ${esc(m.match_time)}</span>` : '';
      const courtTag = m.court ? `<span class="mg-pub-court">🏟 ${esc(m.court)}</span>` : '';
      return `
        <div class="mg-pub-card ${m.status === 'playing' ? 'is-live' : m.status === 'done' ? 'is-done' : 'is-ns'}">
          <div class="mg-pub-top">
            <span class="mg-pub-order">#${m.match_order || '?'}</span>
            <span class="mg-pub-cat">${cat.label}</span>
            ${liveTag}
            <span class="mg-pub-meta">${timeTag} ${courtTag}</span>
          </div>
          <div class="mg-pub-row">
            <span class="mg-pub-team mg-pub-team-a">${esc(m.team_a || '—')}</span>
            ${score}
            <span class="mg-pub-team mg-pub-team-b">${esc(m.team_b || '—')}</span>
          </div>
        </div>`;
    };

    const nextList = upcoming.slice(0, SHOW_NEXT);
    const remaining = mini.length - live.length - nextList.length;

    const scheduleBlock = (() => {
      // Show every match grouped by category inside the collapsible.
      return CATEGORIES.map(c => {
        const list = mini.filter(m => (m.group_name || 'dn') === c.key);
        if (!list.length) return '';
        return `
          <div class="mg-pub-cat-block">
            <div class="mg-pub-cat-title">${c.label} <span class="mg-pub-cat-n">${list.length}</span></div>
            ${list.map(m => card(m, { showScore: m.status !== 'not_started' })).join('')}
          </div>`;
      }).join('');
    })();

    // Finished matches history — most recent first (by match_order desc).
    const SHOW_DONE = 6;
    const doneList = [...done].reverse().slice(0, SHOW_DONE);
    const doneRemaining = done.length - doneList.length;

    host.innerHTML = `
      ${live.length ? `
        <div class="mg-pub-section mg-pub-section-live">
          <div class="mg-pub-section-title"><span class="mg-pub-live-dot"></span> TRỰC TIẾP</div>
          ${live.map(m => card(m, { showScore: true })).join('')}
        </div>` : ''}
      ${nextList.length ? `
        <div class="mg-pub-section">
          <div class="mg-pub-section-title">⏭️ Sắp tới (${nextList.length}${remaining > 0 ? ' / còn ' + remaining + ' trận' : ''})</div>
          ${nextList.map(m => card(m)).join('')}
        </div>` : ''}
      ${doneList.length ? `
        <div class="mg-pub-section mg-pub-section-done">
          <div class="mg-pub-section-title">✅ Đã kết thúc (${done.length})</div>
          ${doneList.map(m => card(m, { showScore: true })).join('')}
          ${doneRemaining > 0 ? `<p class="mg-pub-more">+ ${doneRemaining} trận nữa — mở lịch đầy đủ bên dưới</p>` : ''}
        </div>` : ''}
      ${mini.length ? `
        <details class="mg-pub-schedule">
          <summary>📅 Xem lịch thi đấu đầy đủ (${mini.length} trận)</summary>
          <div class="mg-pub-schedule-body">${scheduleBlock}</div>
        </details>` : `
        <p class="empty-state">Chưa có trận nào.</p>`}
    `;
  }

  // ====================================================================
  // 7. PLAYER MATCHES MODAL — click VĐV name in standings
  //    Works on every page that renders renderStandings (admin + public).
  // ====================================================================
  window.mgOpenPlayerMatches = async function (memberId) {
    // Idempotent — if the modal is already open (user clicked another row),
    // drop the previous instance so we never stack duplicates in the DOM.
    window.mgClosePlayerMatches();
    const tid = (window.tournamentManager && window.tournamentManager.getActiveTournamentId &&
                 window.tournamentManager.getActiveTournamentId()) || null;
    if (!tid) return;
    try {
      const [members, teams, matches, participants] = await Promise.all([
        window.storage.read('members'),
        window.storage.read('teams',   { tournament_id: tid }),
        window.storage.read('matches', { tournament_id: tid }),
        window.storage.read('tournament_participants', { tournament_id: tid })
      ]);
      const memberById = new Map(members.map(m => [String(m.id), m]));
      const me = memberById.get(String(memberId));
      if (!me) return;
      const myPart = participants.find(p => String(p.member_id) === String(memberId));
      const myClub = myPart?.club_name || '';
      const myColor = clubColor(myClub);

      // Teams this player is in.
      const myTeamIds = new Set(
        teams.filter(t => String(t.member1_id) === String(memberId)
                       || String(t.member2_id) === String(memberId))
             .map(t => String(t.id))
      );
      // Matches involving any of those teams (only mini-game stage)
      const myMatches = matches
        .filter(m => m.stage === 'minigame' &&
          (myTeamIds.has(String(m.team_a_id)) || myTeamIds.has(String(m.team_b_id))))
        .sort((a, b) => (a.match_order || 0) - (b.match_order || 0));

      const played = myMatches.filter(m => m.status === 'done' || m.status === 'completed');
      const upcoming = myMatches.filter(m => m.status !== 'done' && m.status !== 'completed');

      const row = (m) => {
        const cat = CATEGORIES.find(c => c.key === (m.group_name || 'dn')) || CATEGORIES[0];
        const iAmA = myTeamIds.has(String(m.team_a_id));
        const myScore  = iAmA ? (m.score_a || 0) : (m.score_b || 0);
        const oppScore = iAmA ? (m.score_b || 0) : (m.score_a || 0);
        const myLabel  = iAmA ? (m.team_a || '') : (m.team_b || '');
        const oppLabel = iAmA ? (m.team_b || '') : (m.team_a || '');
        const resultTag = (m.status === 'done' || m.status === 'completed')
          ? (myScore > oppScore
              ? '<span class="mg-pm-result mg-pm-win">Thắng</span>'
              : myScore < oppScore
                ? '<span class="mg-pm-result mg-pm-loss">Thua</span>'
                : '<span class="mg-pm-result mg-pm-draw">Hoà</span>')
          : (m.status === 'playing'
              ? '<span class="mg-pm-result mg-pm-live">🔴 Live</span>'
              : '<span class="mg-pm-result mg-pm-ns">Sắp tới</span>');
        const scoreTxt = (m.status === 'done' || m.status === 'completed' || m.status === 'playing')
          ? `${myScore} — ${oppScore}`
          : 'vs';
        return `
          <div class="mg-pm-row">
            <span class="mg-pm-ord">#${m.match_order || '?'}</span>
            <span class="mg-pm-cat">${cat.label}</span>
            <div class="mg-pm-pair">
              <div class="mg-pm-me">${esc(myLabel)}</div>
              <div class="mg-pm-score">${scoreTxt}</div>
              <div class="mg-pm-opp">${esc(oppLabel)}</div>
            </div>
            ${resultTag}
          </div>`;
      };

      // Quick totals
      let w = 0, l = 0, pf = 0, pa = 0;
      played.forEach(m => {
        const iAmA = myTeamIds.has(String(m.team_a_id));
        const my  = iAmA ? (m.score_a || 0) : (m.score_b || 0);
        const opp = iAmA ? (m.score_b || 0) : (m.score_a || 0);
        pf += my; pa += opp;
        if (my > opp) w++; else if (my < opp) l++;
      });

      const html = `
        <div class="mg-modal-overlay" id="mg-player-matches-overlay"
             onclick="if(event.target===this)mgClosePlayerMatches()">
          <div class="mg-modal mg-modal-wide">
            <div class="mg-modal-title">
              👤 ${esc(me.name)}
              <span class="mg-club-chip" style="background:${myColor.bg};color:${myColor.fg};">${esc(myClub)}</span>
            </div>
            <div class="mg-modal-note">
              ${w} Thắng · ${l} Thua · ${played.length}/${myMatches.length} trận ·
              điểm ${pf}–${pa} (${pf - pa >= 0 ? '+' : ''}${pf - pa})
            </div>

            <div class="mg-pm-section">
              <div class="mg-pm-section-title">✅ Đã chơi (${played.length})</div>
              ${played.length ? played.map(row).join('') : '<p class="empty" style="opacity:.6;">Chưa có trận nào kết thúc.</p>'}
            </div>

            <div class="mg-pm-section">
              <div class="mg-pm-section-title">⏭️ Sắp chơi / đang chơi (${upcoming.length})</div>
              ${upcoming.length ? upcoming.map(row).join('') : '<p class="empty" style="opacity:.6;">Không còn trận nào.</p>'}
            </div>

            <div class="mg-modal-actions">
              <button class="mg-modal-cancel" onclick="mgClosePlayerMatches()">Đóng</button>
            </div>
          </div>
        </div>`;
      document.body.insertAdjacentHTML('beforeend', html);
    } catch (err) {
      console.error('mgOpenPlayerMatches:', err);
    }
  };

  window.mgClosePlayerMatches = function () {
    // Remove every stray instance (defensive — handles the pre-fix state
    // where multiple modals could have been appended before this patch).
    document.querySelectorAll('#mg-player-matches-overlay').forEach(el => el.remove());
  };

  // ====================================================================
  // 8. ADMIN MANUAL SCORE ENTRY — set score + finish a match outright
  // ====================================================================
  window.mgOpenScoreEntry = async function (matchId) {
    window.mgCloseScoreEntry();
    if (typeof isAdmin === 'function' && !isAdmin()) {
      alert('Chỉ admin mới nhập điểm thủ công.');
      return;
    }
    const tid = window.tournamentManager.getActiveTournamentId();
    if (!tid) return;
    try {
      const matches = await window.tournamentManager.getMatches(tid);
      const m = matches.find(x => String(x.id) === String(matchId));
      if (!m) return;
      const cat = CATEGORIES.find(c => c.key === (m.group_name || 'dn')) || CATEGORIES[0];
      const sa = m.score_a || 0, sb = m.score_b || 0;
      const html = `
        <div class="mg-modal-overlay" id="mg-score-entry-overlay"
             onclick="if(event.target===this)mgCloseScoreEntry()">
          <div class="mg-modal">
            <div class="mg-modal-title">📝 Nhập điểm trận #${m.match_order || '?'}</div>
            <div class="mg-modal-note">${cat.label}</div>
            <div class="mg-score-entry">
              <div class="mg-score-side">
                <label>${esc(m.team_a)}</label>
                <input type="number" min="0" max="99" value="${sa}" id="mg-se-a">
              </div>
              <span class="mg-vs">–</span>
              <div class="mg-score-side">
                <label>${esc(m.team_b)}</label>
                <input type="number" min="0" max="99" value="${sb}" id="mg-se-b">
              </div>
            </div>
            <div class="mg-score-warn">
              ⚠️ Lưu sẽ đặt trận về trạng thái <b>"Đã kết thúc"</b>. Nếu trọng tài
              muốn chơi tiếp, bắt buộc phải reset trận hoặc chỉnh lại thủ công.
            </div>
            <div class="mg-modal-actions">
              <button class="mg-modal-cancel" onclick="mgCloseScoreEntry()">Hủy</button>
              <button class="mg-add-btn" onclick="mgSaveScoreEntry('${matchId}')">💾 Lưu & Kết thúc</button>
            </div>
          </div>
        </div>`;
      document.body.insertAdjacentHTML('beforeend', html);
    } catch (err) {
      console.error('mgOpenScoreEntry:', err);
      alert('Không mở được: ' + err.message);
    }
  };

  window.mgCloseScoreEntry = function () {
    document.querySelectorAll('#mg-score-entry-overlay').forEach(el => el.remove());
  };

  // Soft-reset a single match: scores → 0, status → not_started, clear
  // serve state. Teams + match order stay intact. Mirrors the full
  // tournament soft reset but for just one row.
  window.mgResetMatch = async function (matchId) {
    if (typeof isAdmin === 'function' && !isAdmin()) {
      alert('Chỉ admin mới reset được trận.');
      return;
    }
    const tid = window.tournamentManager.getActiveTournamentId();
    if (!tid) return;
    let m;
    try {
      const matches = await window.tournamentManager.getMatches(tid);
      m = matches.find(x => String(x.id) === String(matchId));
    } catch (_) { /* ignore — confirm still works without the label */ }
    const label = m ? `trận #${m.match_order || '?'} (${m.team_a || ''} vs ${m.team_b || ''})` : 'trận này';
    if (!confirm(`Reset ${label} về "Chưa bắt đầu"?\n\n` +
                 `• Điểm số → 0-0\n` +
                 `• Serve / set state → xoá\n` +
                 `• Giữ nguyên 2 cặp đã chọn`)) return;
    try {
      await window.storage.update('matches', matchId, {
        status: 'not_started',
        score_a: 0, score_b: 0,
        s1a: 0, s1b: 0, s2a: 0, s2b: 0, s3a: 0, s3b: 0,
        current_set: 1,
        completed_sets: [],
        serving_team: null,
        server_number: null,
        server_slot: 1,
        game_state: null,
        updated_at: null
      });
      // Drop cached scoring state for this match.
      if (typeof matchStates !== 'undefined' && matchStates?.delete) matchStates.delete(matchId);
      if (typeof _matchActionLog !== 'undefined' && _matchActionLog?.delete) _matchActionLog.delete(matchId);
      if (typeof fetchMatches === 'function') await fetchMatches();
    } catch (err) {
      console.error('mgResetMatch:', err);
      alert('Không reset được: ' + err.message);
    }
  };

  window.mgSaveScoreEntry = async function (matchId) {
    const a = parseInt(document.getElementById('mg-se-a')?.value, 10);
    const b = parseInt(document.getElementById('mg-se-b')?.value, 10);
    if (!Number.isFinite(a) || !Number.isFinite(b) || a < 0 || b < 0) {
      return alert('Điểm không hợp lệ.');
    }
    if (a === b) {
      return alert('Chạm 11, không có hoà — một bên phải thắng.');
    }
    const max = Math.max(a, b), diff = Math.abs(a - b);
    const reaches11WinBy2 = max >= 11 && diff >= 2;
    if (!reaches11WinBy2) {
      if (!confirm(`Điểm ${a}-${b} KHÔNG thoả luật chạm 11 win-by-2. Vẫn ghi?`)) return;
    } else {
      if (!confirm(`Kết thúc trận #? với tỉ số ${a}-${b}?`)) return;
    }
    try {
      const winner = a > b ? 'A' : 'B';
      await window.storage.update('matches', matchId, {
        status: 'done',
        score_a: a,
        score_b: b,
        s1a: a, s1b: b,
        s2a: 0, s2b: 0, s3a: 0, s3b: 0,
        current_set: 1,
        completed_sets: [{ set: 1, scoreA: a, scoreB: b, winner }],
        updated_at: new Date().toISOString()
      });
      // Drop admin's cached scoring state for this match so the next render
      // reflects the new DB state instead of an in-memory tap-score copy.
      if (typeof matchStates !== 'undefined' && matchStates?.delete) matchStates.delete(matchId);
      if (typeof _matchActionLog !== 'undefined' && _matchActionLog?.delete) _matchActionLog.delete(matchId);
      window.mgCloseScoreEntry();
      if (typeof fetchMatches === 'function') await fetchMatches();
    } catch (err) {
      console.error('mgSaveScoreEntry:', err);
      alert('Không lưu được: ' + err.message);
    }
  };

  window.minigame = {
    isMinigame,
    renderMembersTab,
    renderTeamsTab,
    renderMatchBuilder,
    renderMinigameMatches,
    renderPublicMinigame,
    renderStandings,
    reload,
    getClubs
  };

  // Global Esc handler to close any open mini-game modal. One listener,
  // delegated across all three modal types to keep it simple.
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (document.getElementById('mg-player-matches-overlay')) window.mgClosePlayerMatches();
    if (document.getElementById('mg-score-entry-overlay'))    window.mgCloseScoreEntry();
    if (document.getElementById('mg-match-edit-overlay'))     window.mgCloseMatchEdit();
  });
})();
