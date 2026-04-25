// ============================================================
//  Member Management Module
//  Handles CRUD operations for tournament members
// ============================================================

/**
 * MemberManager - Manages member operations
 */
class MemberManager {
  constructor(storage) {
    this.storage = storage;
    this.ERROR_MESSAGES = {
      MEMBER_NAME_REQUIRED: "Tên thành viên không được để trống",
      MEMBER_TIER_INVALID: "Tier phải là 1, 2, hoặc 3",
      MEMBER_EMAIL_INVALID: "Email không hợp lệ",
      MEMBER_PHONE_INVALID: "Số điện thoại không hợp lệ",
      MEMBER_IN_ACTIVE_TOURNAMENT: "Không thể xóa thành viên đang tham gia giải đấu",
      MEMBER_NOT_FOUND: "Không tìm thấy thành viên"
    };
  }

  // ── Validation ───────────────────────────────────────────────

  /**
   * Validate member data
   * @param {object} data - Member data to validate
   * @param {boolean} isUpdate - Whether this is an update operation
   * @returns {object} { valid: boolean, errors: array }
   */
  validate(data, isUpdate = false) {
    const errors = [];

    // Name validation (required for create, optional for update)
    if (!isUpdate || data.name !== undefined) {
      if (!data.name || data.name.trim() === '') {
        errors.push(this.ERROR_MESSAGES.MEMBER_NAME_REQUIRED);
      } else if (data.name.length > 255) {
        errors.push("Tên thành viên không được vượt quá 255 ký tự");
      }
    }

    // Tier validation (required for create, optional for update)
    if (!isUpdate || data.tier !== undefined) {
      if (data.tier === null || data.tier === undefined) {
        errors.push("Tier là bắt buộc");
      } else if (![1, 2, 3].includes(Number(data.tier))) {
        errors.push(this.ERROR_MESSAGES.MEMBER_TIER_INVALID);
      }
    }

    // Email validation (optional, but must be valid if provided)
    if (data.email && data.email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        errors.push(this.ERROR_MESSAGES.MEMBER_EMAIL_INVALID);
      }
    }

    // Phone validation (optional, but must be valid if provided)
    if (data.phone && data.phone.trim() !== '') {
      const phoneRegex = /^[0-9+\-\s()]{8,20}$/;
      if (!phoneRegex.test(data.phone)) {
        errors.push(this.ERROR_MESSAGES.MEMBER_PHONE_INVALID);
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  // ── CRUD Operations ──────────────────────────────────────────

  /**
   * Create a new member
   * @param {object} data - Member data {name, tier, email?, phone?}
   * @returns {Promise<object>} Created member
   */
  async createMember(data) {
    // Validate
    const validation = this.validate(data, false);
    if (!validation.valid) {
      throw new Error(validation.errors.join(', '));
    }

    // Sanitize data
    const memberData = {
      name: data.name.trim(),
      tier: Number(data.tier),
      email: data.email ? data.email.trim() : null,
      phone: data.phone ? data.phone.trim() : null
    };

    // Create in storage
    const member = await this.storage.create('members', memberData);
    return member;
  }

  /**
   * Update an existing member
   * @param {string|number} id - Member ID
   * @param {object} data - Fields to update
   * @returns {Promise<object>} Updated member
   */
  async updateMember(id, data) {
    // Validate
    const validation = this.validate(data, true);
    if (!validation.valid) {
      throw new Error(validation.errors.join(', '));
    }

    // Sanitize data
    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.tier !== undefined) updateData.tier = Number(data.tier);
    if (data.email !== undefined) updateData.email = data.email ? data.email.trim() : null;
    if (data.phone !== undefined) updateData.phone = data.phone ? data.phone.trim() : null;

    // Update in storage
    const member = await this.storage.update('members', id, updateData);
    return member;
  }

  /**
   * Delete a member
   * @param {string|number} id - Member ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteMember(id) {
    // Check if member is in any active tournament
    const tournaments = await this.storage.read('tournaments', { status: 'ongoing' });
    
    for (const tournament of tournaments) {
      const participants = await this.storage.read('tournament_participants', {
        tournament_id: tournament.id,
        member_id: id
      });
      
      if (participants.length > 0) {
        throw new Error(this.ERROR_MESSAGES.MEMBER_IN_ACTIVE_TOURNAMENT);
      }
    }

    // Delete from storage
    return await this.storage.delete('members', id);
  }

  /**
   * Get a single member by ID
   * @param {string|number} id - Member ID
   * @returns {Promise<object|null>} Member or null if not found
   */
  async getMember(id) {
    const members = await this.storage.read('members', { id: id });
    return members.length > 0 ? members[0] : null;
  }

  /**
   * Get all members
   * @returns {Promise<array>} Array of all members
   */
  async getAllMembers() {
    return await this.storage.read('members');
  }

  /**
   * Search members with filters
   * @param {string} query - Search query (searches in name)
   * @param {number|null} tierFilter - Tier filter (1, 2, 3, or null for all)
   * @returns {Promise<array>} Filtered members
   */
  async searchMembers(query = '', tierFilter = null) {
    const filters = {};
    
    if (query && query.trim() !== '') {
      filters.query = query.trim();
    }
    
    if (tierFilter !== null && tierFilter !== undefined && tierFilter !== '') {
      filters.tierFilter = Number(tierFilter);
    }

    return await this.storage.read('members', filters);
  }

  // ── Export/Import ────────────────────────────────────────────

  /**
   * Export members to CSV format
   * @returns {Promise<string>} CSV string
   */
  async exportMembers() {
    const members = await this.getAllMembers();
    
    // CSV header
    let csv = 'name,email,phone,tier\n';
    
    // CSV rows
    members.forEach(member => {
      const name = this._escapeCsv(member.name || '');
      const email = this._escapeCsv(member.email || '');
      const phone = this._escapeCsv(member.phone || '');
      const tier = member.tier || '';
      
      csv += `${name},${email},${phone},${tier}\n`;
    });
    
    return csv;
  }

  /**
   * Download members as CSV file
   */
  async downloadMembersCSV() {
    const csv = await this.exportMembers();
    const date = new Date().toISOString().split('T')[0];
    const filename = `members_${date}.csv`;
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Parse CSV string to member objects
   * @param {string} csvString - CSV content
   * @returns {array} Array of member objects
   */
  parseMembersCSV(csvString) {
    const lines = csvString.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV file is empty or invalid');
    }

    // Parse header
    const header = lines[0].toLowerCase().split(',').map(h => h.trim());
    const nameIdx = header.indexOf('name');
    const emailIdx = header.indexOf('email');
    const phoneIdx = header.indexOf('phone');
    const tierIdx = header.indexOf('tier');

    if (nameIdx === -1 || tierIdx === -1) {
      throw new Error('CSV must contain "name" and "tier" columns');
    }

    // Parse rows
    const members = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = this._parseCsvLine(line);
      
      const member = {
        name: values[nameIdx] || '',
        tier: Number(values[tierIdx]) || 1,
        email: emailIdx !== -1 ? (values[emailIdx] || null) : null,
        phone: phoneIdx !== -1 ? (values[phoneIdx] || null) : null
      };

      // Validate
      const validation = this.validate(member, false);
      if (validation.valid) {
        members.push(member);
      } else {
        console.warn(`Skipping invalid row ${i + 1}: ${validation.errors.join(', ')}`);
      }
    }

    return members;
  }

  /**
   * Import members from CSV
   * @param {string} csvString - CSV content
   * @param {string} duplicateStrategy - 'skip' or 'update'
   * @returns {Promise<object>} { imported: number, skipped: number, updated: number }
   */
  async importMembers(csvString, duplicateStrategy = 'skip') {
    const newMembers = this.parseMembersCSV(csvString);
    const existingMembers = await this.getAllMembers();
    
    let imported = 0;
    let skipped = 0;
    let updated = 0;

    for (const newMember of newMembers) {
      // Check for duplicate by email or name
      const duplicate = existingMembers.find(m => 
        (m.email && newMember.email && m.email.toLowerCase() === newMember.email.toLowerCase()) ||
        (m.name.toLowerCase() === newMember.name.toLowerCase())
      );

      if (duplicate) {
        if (duplicateStrategy === 'update') {
          await this.updateMember(duplicate.id, newMember);
          updated++;
        } else {
          skipped++;
        }
      } else {
        await this.createMember(newMember);
        imported++;
      }
    }

    return { imported, skipped, updated };
  }

  // ── Helper Methods ───────────────────────────────────────────

  /**
   * Escape CSV value
   */
  _escapeCsv(value) {
    if (!value) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  /**
   * Parse CSV line handling quoted values
   */
  _parseCsvLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    values.push(current.trim());
    return values;
  }

  /**
   * Get member statistics
   * @returns {Promise<object>} Statistics object
   */
  async getStatistics() {
    const members = await this.getAllMembers();
    
    const stats = {
      total: members.length,
      tier1: members.filter(m => m.tier === 1).length,
      tier2: members.filter(m => m.tier === 2).length,
      tier3: members.filter(m => m.tier === 3).length,
      withEmail: members.filter(m => m.email).length,
      withPhone: members.filter(m => m.phone).length
    };

    return stats;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MemberManager };
}
