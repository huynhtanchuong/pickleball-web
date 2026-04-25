// ============================================================
//  auth.js — Role-based Authentication
//
//  Three roles (shared passwords — suitable for a club app):
//    admin    → password "admin123"    — full access
//    referee  → password "trongtai123" — score + end + reset matches only
//    view     → no login required      — read-only public viewer
//
//  Role is stored in localStorage as "pb_role".
//  Pages that require auth should call requireRole() on load.
// ============================================================

const AUTH_KEY = 'pb_role';

const ROLE_PASSWORDS = {
  admin:   'admin123',
  referee: 'trongtai123'
};

// ── Read / write role ─────────────────────────────────────────

function getRole() {
  return localStorage.getItem(AUTH_KEY) || 'view';
}

function _setRole(role) {
  localStorage.setItem(AUTH_KEY, role);
}

function clearRole() {
  localStorage.removeItem(AUTH_KEY);
}

// ── Role predicates ───────────────────────────────────────────

function isAdmin()   { return getRole() === 'admin'; }
function isReferee() { const r = getRole(); return r === 'referee' || r === 'admin'; }
function isView()    { return getRole() === 'view'; }

// canScore: referee can enter scores and finish/reset matches
function canScore()  { return isReferee(); }

// canManage: admin-only (tournaments, members, teams, bracket gen)
function canManage() { return isAdmin(); }

// ── Login / logout ────────────────────────────────────────────

/**
 * Attempt login with a password.
 * Returns the matched role name ('admin' | 'referee') or null on failure.
 */
function doLogin(password) {
  const pw = (password || '').trim();
  if (pw === ROLE_PASSWORDS.admin) {
    _setRole('admin');
    return 'admin';
  }
  if (pw === ROLE_PASSWORDS.referee) {
    _setRole('referee');
    return 'referee';
  }
  return null;
}

function doLogout() {
  clearRole();
  location.reload();
}

// ── Page-level guards ─────────────────────────────────────────

/**
 * Redirect to admin.html if the current role is not sufficient.
 * Call on protected pages (members.html, teams.html, tournaments.html).
 *   requireRole('admin')   — admin only
 *   requireRole('referee') — referee or admin
 */
function requireRole(minRole) {
  const role = getRole();
  if (minRole === 'admin' && !isAdmin()) {
    window.location.href = 'admin.html';
  }
  if (minRole === 'referee' && !isReferee()) {
    window.location.href = 'admin.html';
  }
}

// ── UI helpers ────────────────────────────────────────────────

/**
 * Hide all elements with class "admin-only" when current role is not admin.
 * Hide all elements with class "referee-only" when current role cannot score.
 * Call after DOMContentLoaded.
 */
function applyRoleVisibility() {
  const role = getRole();

  // Elements visible only to admin
  document.querySelectorAll('.admin-only').forEach(el => {
    el.style.display = isAdmin() ? '' : 'none';
  });

  // Elements visible to referee + admin
  document.querySelectorAll('.scorer-only').forEach(el => {
    el.style.display = canScore() ? '' : 'none';
  });

  // Elements visible to all logged-in users (referee or admin)
  document.querySelectorAll('.auth-only').forEach(el => {
    el.style.display = isReferee() ? '' : 'none';
  });

  // Role badge in header
  const badge = document.getElementById('role-badge');
  if (badge) {
    const labels = { admin: '👑 Admin', referee: '🏓 Trọng Tài', view: '' };
    badge.textContent = labels[role] || '';
    badge.style.display = role !== 'view' ? 'inline-block' : 'none';
  }
}

/**
 * Show a login error message in the element with id "login-error".
 */
function showLoginError(msg) {
  const el = document.getElementById('login-error');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}

function hideLoginError() {
  const el = document.getElementById('login-error');
  if (el) { el.textContent = ''; el.style.display = 'none'; }
}

// ── Backward-compat shim (old admin.js called isAdmin() directly) ──
// isAdmin() is already defined above — no shim needed.
