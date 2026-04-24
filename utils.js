// ============================================================
//  Utility Functions
//  Common helper functions used across the application
// ============================================================

/**
 * Get member display name with fallback
 * Priority: name -> phone -> "Thành viên {id}"
 * @param {object} member - Member object
 * @returns {string} Display name
 */
function getMemberDisplayName(member) {
  if (!member) return 'Không xác định';
  return member.name || member.phone || `Thành viên ${member.id || 'N/A'}`;
}

/**
 * Get team display name from two members
 * @param {object} member1 - First member
 * @param {object} member2 - Second member
 * @returns {string} Team display name
 */
function getTeamDisplayName(member1, member2) {
  const name1 = getMemberDisplayName(member1);
  const name2 = getMemberDisplayName(member2);
  return `${name1} & ${name2}`;
}

/**
 * Normalize tier format to string (T1, T2, T3)
 * Handles both string ('T1', 'T2', 'T3') and number (1, 2, 3) formats
 * @param {string|number} tier - Tier value
 * @returns {string} Normalized tier string (T1, T2, or T3)
 */
function normalizeTier(tier) {
  if (tier === null || tier === undefined) return 'T2'; // default
  
  if (typeof tier === 'string') {
    // Already in format 'T1', 'T2', 'T3'
    if (tier.startsWith('T')) return tier;
    // Convert '1', '2', '3' to 'T1', 'T2', 'T3'
    return `T${tier}`;
  }
  
  // Convert number 1, 2, 3 to 'T1', 'T2', 'T3'
  return `T${tier}`;
}

/**
 * Get tier number from tier value
 * @param {string|number} tier - Tier value
 * @returns {number} Tier number (1, 2, or 3)
 */
function getTierNumber(tier) {
  if (tier === null || tier === undefined) return 2; // default
  
  if (typeof tier === 'string') {
    return parseInt(tier.replace('T', ''));
  }
  
  return tier;
}

/**
 * Get tier badge HTML
 * @param {string|number} tier - Tier value
 * @returns {string} HTML for tier badge
 */
function getTierBadgeHTML(tier) {
  const tierNum = getTierNumber(tier);
  const tierStr = normalizeTier(tier);
  
  const colors = {
    1: '#ffd700', // gold
    2: '#c0c0c0', // silver
    3: '#cd7f32'  // bronze
  };
  
  return `<span class="tier-badge tier-${tierNum}" style="background: ${colors[tierNum]}; color: #333; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700;">${tierStr}</span>`;
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Format date to Vietnamese locale
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date string
 */
function formatDate(date) {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('vi-VN');
}

/**
 * Format datetime to Vietnamese locale
 * @param {string|Date} datetime - Datetime to format
 * @returns {string} Formatted datetime string
 */
function formatDateTime(datetime) {
  if (!datetime) return '';
  const d = typeof datetime === 'string' ? new Date(datetime) : datetime;
  return d.toLocaleString('vi-VN');
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getMemberDisplayName,
    getTeamDisplayName,
    normalizeTier,
    getTierNumber,
    getTierBadgeHTML,
    escapeHtml,
    formatDate,
    formatDateTime
  };
}
