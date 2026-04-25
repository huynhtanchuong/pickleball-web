// ============================================================
//  Tournament Management Module
//  Handles tournament lifecycle and operations
// ============================================================

/**
 * TournamentManager - Manages tournament operations
 */
class TournamentManager {
  constructor(storage) {
    this.storage = storage;
    this.ERROR_MESSAGES = {
      TOURNAMENT_NAME_REQUIRED: "Tên giải đấu không được để trống",
      TOURNAMENT_DATE_INVALID: "Ngày bắt đầu không hợp lệ",
      DELETE_ACTIVE_TOURNAMENT: "Không thể xóa giải đấu đang diễn ra",
      TOURNAMENT_NOT_FOUND: "Không tìm thấy giải đấu",
      INSUFFICIENT_PARTICIPANTS: "Cần ít nhất 4 thành viên để tạo giải đấu"
    };
  }

  // ── Validation ───────────────────────────────────────────────

  /**
   * Validate tournament basic info
   */
  validateBasicInfo(data) {
    const errors = [];

    if (!data.name || data.name.trim() === '') {
      errors.push(this.ERROR_MESSAGES.TOURNAMENT_NAME_REQUIRED);
    }

    if (!data.start_date) {
      errors.push(this.ERROR_MESSAGES.TOURNAMENT_DATE_INVALID);
    }

    if (data.numGroups && data.numGroups < 1) {
      errors.push("Số bảng đấu phải >= 1");
    }

    if (data.teamsPerGroup && data.teamsPerGroup < 2) {
      errors.push("Số đội mỗi bảng phải >= 2");
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  // ── CRUD Operations ──────────────────────────────────────────

  /**
   * Create a new tournament (Step 1: Basic Info)
   * @param {object} basicInfo - {name, start_date, numGroups, teamsPerGroup, enableConsolation, enableThirdPlace}
   * @returns {Promise<object>} Created tournament
   */
  async createTournament(basicInfo) {
    // Validate
    const validation = this.validateBasicInfo(basicInfo);
    if (!validation.valid) {
      throw new Error(validation.errors.join(', '));
    }

    // Create tournament record
    const tournament = await this.storage.create('tournaments', {
      name: basicInfo.name.trim(),
      start_date: basicInfo.start_date,
      status: 'upcoming',
      archived: false,
      config: {
        numGroups: basicInfo.numGroups || 2,
        teamsPerGroup: basicInfo.teamsPerGroup || 5,
        enableConsolation: basicInfo.enableConsolation || false,
        enableThirdPlace: basicInfo.enableThirdPlace !== false // default true
      }
    });

    return tournament;
  }

  /**
   * Update tournament basic info
   */
  async updateTournament(id, data) {
    const updateData = {};
    
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.start_date !== undefined) updateData.start_date = data.start_date;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.config !== undefined) updateData.config = data.config;
    if (data.archived !== undefined) updateData.archived = data.archived;

    return await this.storage.update('tournaments', id, updateData);
  }

  /**
   * Delete a tournament
   */
  async deleteTournament(id) {
    const tournament = await this.getTournament(id);
    
    if (tournament.status === 'ongoing') {
      throw new Error(this.ERROR_MESSAGES.DELETE_ACTIVE_TOURNAMENT);
    }

    // Delete all related data
    await this.storage.transaction([
      { action: 'delete', table: 'matches', id: id }, // This won't work directly, need to filter
      { action: 'delete', table: 'teams', id: id },
      { action: 'delete', table: 'tournament_participants', id: id },
      { action: 'delete', table: 'tournaments', id: id }
    ]);

    return true;
  }

  /**
   * Get a single tournament by ID
   */
  async getTournament(id) {
    const tournaments = await this.storage.read('tournaments', { id: id });
    if (tournaments.length === 0) {
      throw new Error(this.ERROR_MESSAGES.TOURNAMENT_NOT_FOUND);
    }
    return tournaments[0];
  }

  /**
   * Get all tournaments
   */
  async getAllTournaments() {
    return await this.storage.read('tournaments');
  }

  /**
   * Get tournaments by status
   */
  async getTournamentsByStatus(status) {
    return await this.storage.read('tournaments', { status: status });
  }

  // ── Participant Management ───────────────────────────────────

  /**
   * Add participants to tournament (Step 2)
   * @param {string|number} tournamentId - Tournament ID
   * @param {array} participants - Array of {member_id, tier_override?, is_seeded?}
   * @returns {Promise<array>} Created participant records
   */
  async addParticipants(tournamentId, participants) {
    if (participants.length < 4) {
      throw new Error(this.ERROR_MESSAGES.INSUFFICIENT_PARTICIPANTS);
    }

    const records = participants.map(p => ({
      tournament_id: tournamentId,
      member_id: p.member_id,
      tier_override: p.tier_override || null,
      is_seeded: p.is_seeded || false
    }));

    return await this.storage.create('tournament_participants', records);
  }

  /**
   * Get participants for a tournament
   */
  async getParticipants(tournamentId) {
    return await this.storage.read('tournament_participants', {
      tournament_id: tournamentId
    });
  }

  /**
   * Get participants with member details
   */
  async getParticipantsWithMembers(tournamentId) {
    const participants = await this.getParticipants(tournamentId);
    const members = await this.storage.read('members');
    
    return participants.map(p => {
      const member = members.find(m => m.id == p.member_id);
      return {
        ...p,
        member: member,
        effective_tier: p.tier_override || (member ? member.tier : null)
      };
    });
  }

  // ── Team Management ──────────────────────────────────────────

  /**
   * Generate teams using pairing algorithm (Step 3)
   * @param {string|number} tournamentId - Tournament ID
   * @returns {Promise<array>} Created teams
   */
  async generateTeams(tournamentId) {
    const participants = await this.getParticipantsWithMembers(tournamentId);
    const tournament = await this.getTournament(tournamentId);
    
    // Use PairingAlgorithm (will be implemented in pairing.js)
    if (typeof PairingAlgorithm === 'undefined') {
      throw new Error('PairingAlgorithm not loaded');
    }

    const pairing = new PairingAlgorithm(participants, tournament.config);
    const teams = pairing.generateTeams();
    
    // Get all members to populate tier calculation
    const allMembers = await this.storage.read('members');
    
    // Add tournament_id and tier to each team
    const teamsWithDetails = teams.map(team => {
      const member1 = allMembers.find(m => m.id == team.member1_id);
      const member2 = allMembers.find(m => m.id == team.member2_id);
      
      return {
        ...team,
        tournament_id: tournamentId,
        tier: this.calculateTeamTier(member1, member2)
      };
    });

    return await this.storage.create('teams', teamsWithDetails);
  }
  
  /**
   * Calculate team tier based on member tiers
   */
  calculateTeamTier(member1, member2) {
    if (!member1 || !member2) return null;
    
    // Use helper function if available
    if (typeof getTierNumber === 'function') {
      const tier1 = getTierNumber(member1.tier);
      const tier2 = getTierNumber(member2.tier);
      const avgTier = Math.round((tier1 + tier2) / 2);
      return `T${avgTier}`;
    }
    
    // Fallback logic - handle both string and number formats
    const getTier = (tier) => {
      if (tier === null || tier === undefined) return 2;
      if (typeof tier === 'string') return parseInt(tier.replace('T', ''));
      return tier;
    };
    
    const tier1 = getTier(member1.tier);
    const tier2 = getTier(member2.tier);
    
    // Average tier, rounded
    const avgTier = Math.round((tier1 + tier2) / 2);
    return `T${avgTier}`;
  }

  /**
   * Get teams for a tournament
   */
  async getTeams(tournamentId) {
    return await this.storage.read('teams', { tournament_id: tournamentId });
  }

  /**
   * Get teams with member details
   */
  async getTeamsWithMembers(tournamentId) {
    const teams = await this.getTeams(tournamentId);
    const members = await this.storage.read('members');
    
    return teams.map(team => {
      const member1 = members.find(m => m.id == team.member1_id);
      const member2 = members.find(m => m.id == team.member2_id);
      
      return {
        ...team,
        member1: member1,
        member2: member2,
        display_name: team.name || this.getTeamName(member1, member2)
      };
    });
  }

  /**
   * Generate team name from members
   */
  getTeamName(member1, member2) {
    if (!member1 || !member2) return 'Unknown Team';
    
    // Use helper function if available, otherwise fallback
    if (typeof getMemberDisplayName === 'function') {
      const name1 = getMemberDisplayName(member1);
      const name2 = getMemberDisplayName(member2);
      return `${name1} & ${name2}`;
    }
    
    // Fallback logic
    const name1 = member1.name || member1.phone || `Thành viên ${member1.id}`;
    const name2 = member2.name || member2.phone || `Thành viên ${member2.id}`;
    return `${name1} & ${name2}`;
  }

  // ── Schedule Generation ──────────────────────────────────────

  /**
   * Generate round-robin schedule (Step 4)
   * @param {string|number} tournamentId - Tournament ID
   * @returns {Promise<array>} Created matches
   */
  async generateSchedule(tournamentId) {
    const teams = await this.getTeamsWithMembers(tournamentId);
    const matches = this.createRoundRobinSchedule(teams, tournamentId);
    
    return await this.storage.create('matches', matches);
  }

  /**
   * Create round-robin schedule for all groups
   */
  createRoundRobinSchedule(teams, tournamentId) {
    const matches = [];
    
    // Group teams by group_name
    const groups = {};
    teams.forEach(team => {
      if (!groups[team.group_name]) {
        groups[team.group_name] = [];
      }
      groups[team.group_name].push(team);
    });

    // Generate round-robin for each group
    Object.entries(groups).forEach(([groupName, groupTeams]) => {
      for (let i = 0; i < groupTeams.length; i++) {
        for (let j = i + 1; j < groupTeams.length; j++) {
          matches.push({
            tournament_id: tournamentId,
            team_a:    groupTeams[i].display_name,
            team_b:    groupTeams[j].display_name,
            team_a_id: groupTeams[i].id,
            team_b_id: groupTeams[j].id,
            score_a: 0,
            score_b: 0,
            group_name: groupName,
            stage: 'group',
            status: 'not_started',
            // Set scores
            s1a: 0, s1b: 0,
            s2a: 0, s2b: 0,
            s3a: 0, s3b: 0,
            // Optional fields
            match_time: null,
            court: null,
            referee_name: null,
            updated_at: null
          });
        }
      }
    });

    return matches;
  }

  /**
   * Get matches for a tournament
   */
  async getMatches(tournamentId) {
    return await this.storage.read('matches', { tournament_id: tournamentId });
  }

  // ── Active Tournament Management ─────────────────────────────

  /**
   * Set active tournament
   */
  async setActiveTournament(tournamentId) {
    localStorage.setItem('active_tournament_id', tournamentId);
  }

  /**
   * Get active tournament ID
   */
  getActiveTournamentId() {
    return localStorage.getItem('active_tournament_id');
  }

  /**
   * Get active tournament
   */
  async getActiveTournament() {
    const id = this.getActiveTournamentId();
    if (!id) return null;
    
    try {
      return await this.getTournament(id);
    } catch (error) {
      return null;
    }
  }

  // ── Status Management ────────────────────────────────────────

  /**
   * Update tournament status
   */
  async updateStatus(tournamentId, status) {
    if (!['upcoming', 'ongoing', 'completed'].includes(status)) {
      throw new Error('Invalid status');
    }

    return await this.updateTournament(tournamentId, { status: status });
  }

  /**
   * Archive tournament
   */
  async archiveTournament(tournamentId) {
    return await this.updateTournament(tournamentId, { archived: true });
  }

  /**
   * Unarchive tournament
   */
  async unarchiveTournament(tournamentId) {
    return await this.updateTournament(tournamentId, { archived: false });
  }

  // ── Special Match Types ──────────────────────────────────────

  /**
   * Generate third-place match
   */
  async generateThirdPlaceMatch(tournamentId) {
    const matches = await this.getMatches(tournamentId);
    const semifinals = matches.filter(m => m.match_type === 'semi' && m.status === 'completed');
    
    if (semifinals.length !== 2) {
      throw new Error('Both semifinals must be completed');
    }

    // Identify losing teams (handle both snake_case from DB and legacy camelCase)
    const sfA = m => m.score_a !== undefined ? m.score_a : (m.scoreA || 0);
    const sfB = m => m.score_b !== undefined ? m.score_b : (m.scoreB || 0);
    const tA  = m => m.team_a || m.teamA;
    const tB  = m => m.team_b || m.teamB;
    const loser1 = sfA(semifinals[0]) < sfB(semifinals[0]) ? tA(semifinals[0]) : tB(semifinals[0]);
    const loser2 = sfA(semifinals[1]) < sfB(semifinals[1]) ? tA(semifinals[1]) : tB(semifinals[1]);

    const thirdPlaceMatch = {
      tournament_id: tournamentId,
      team_a: loser1,
      team_b: loser2,
      score_a: 0,
      score_b: 0,
      stage: 'third_place',
      status: 'not_started',
      s1a: 0, s1b: 0,
      s2a: 0, s2b: 0,
      s3a: 0, s3b: 0,
      updated_at: null
    };

    return await this.storage.create('matches', thirdPlaceMatch);
  }

  /**
   * Generate consolation match
   */
  async generateConsolationMatch(tournamentId) {
    const tournament = await this.getTournament(tournamentId);
    
    if (!tournament.config.enableConsolation) {
      throw new Error('Consolation match is not enabled for this tournament');
    }

    const matches = await this.getMatches(tournamentId);
    const teams = await this.getTeamsWithMembers(tournamentId);
    
    // Calculate standings to find 3rd place teams from each group
    const standings = this.calculateStandings(matches, teams);
    
    // Get 3rd place team from each group
    const thirdPlaceTeams = [];
    Object.values(standings).forEach(groupStandings => {
      if (groupStandings.length >= 3) {
        thirdPlaceTeams.push(groupStandings[2].team);
      }
    });

    if (thirdPlaceTeams.length !== 2) {
      throw new Error('Need exactly 2 groups with at least 3 teams each');
    }

    const consolationMatch = {
      tournament_id: tournamentId,
      team_a: thirdPlaceTeams[0],
      team_b: thirdPlaceTeams[1],
      score_a: 0,
      score_b: 0,
      stage: 'consolation',
      status: 'not_started',
      s1a: 0, s1b: 0,
      s2a: 0, s2b: 0,
      s3a: 0, s3b: 0,
      updated_at: null
    };

    return await this.storage.create('matches', consolationMatch);
  }

  /**
   * Create show match (exhibition)
   */
  async createShowMatch(tournamentId, team1Members, team2Members, customNames = {}) {
    const members = await this.storage.read('members');
    
    const member1 = members.find(m => m.id == team1Members[0]);
    const member2 = members.find(m => m.id == team1Members[1]);
    const member3 = members.find(m => m.id == team2Members[0]);
    const member4 = members.find(m => m.id == team2Members[1]);

    if (!member1 || !member2 || !member3 || !member4) {
      throw new Error('All 4 members must be valid');
    }

    const teamAName = customNames.teamA || this.getTeamName(member1, member2);
    const teamBName = customNames.teamB || this.getTeamName(member3, member4);

    const showMatch = {
      tournament_id: tournamentId,
      team_a: teamAName,
      team_b: teamBName,
      score_a: 0,
      score_b: 0,
      stage: 'exhibition',
      status: 'not_started',
      s1a: 0, s1b: 0,
      s2a: 0, s2b: 0,
      s3a: 0, s3b: 0,
      updated_at: null
    };

    return await this.storage.create('matches', showMatch);
  }

  // ── Helper Methods ───────────────────────────────────────────

  /**
   * Calculate standings from matches
   */
  calculateStandings(matches, teams) {
    const standings = {};
    
    // Initialize standings for each group
    teams.forEach(team => {
      if (!standings[team.group_name]) {
        standings[team.group_name] = [];
      }
      
      const existing = standings[team.group_name].find(s => s.team === team.display_name);
      if (!existing) {
        standings[team.group_name].push({
          team: team.display_name,
          played: 0,
          won: 0,
          lost: 0,
          points: 0,
          scoreDiff: 0
        });
      }
    });

    // Calculate from completed group matches
    matches
      .filter(m => m.match_type === 'group' && m.status === 'completed')
      .forEach(match => {
        const groupStandings = standings[match.group_name];
        if (!groupStandings) return;

        const nameA  = match.team_a  || match.teamA;
        const nameB  = match.team_b  || match.teamB;
        const scoreA = match.score_a !== undefined ? match.score_a : (match.scoreA || 0);
        const scoreB = match.score_b !== undefined ? match.score_b : (match.scoreB || 0);

        const teamA = groupStandings.find(s => s.team === nameA);
        const teamB = groupStandings.find(s => s.team === nameB);

        if (teamA && teamB) {
          teamA.played++;
          teamB.played++;

          if (scoreA > scoreB) {
            teamA.won++;
            teamA.points += 3;
            teamB.lost++;
          } else if (scoreB > scoreA) {
            teamB.won++;
            teamB.points += 3;
            teamA.lost++;
          }

          teamA.scoreDiff += (scoreA - scoreB);
          teamB.scoreDiff += (scoreB - scoreA);
        }
      });

    // Sort each group
    Object.keys(standings).forEach(group => {
      standings[group].sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.scoreDiff !== a.scoreDiff) return b.scoreDiff - a.scoreDiff;
        return b.won - a.won;
      });
    });

    return standings;
  }

  /**
   * Get tournament statistics
   */
  async getStatistics(tournamentId) {
    const participants = await this.getParticipants(tournamentId);
    const teams = await this.getTeams(tournamentId);
    const matches = await this.getMatches(tournamentId);

    return {
      participants: participants.length,
      teams: teams.length,
      matches: matches.length,
      completedMatches: matches.filter(m => m.status === 'completed').length,
      groups: [...new Set(teams.map(t => t.group_name))].length
    };
  }
}

// ── Backward Compatibility & Migration ──────────────────────

/**
 * Ensure default tournament exists for backward compatibility
 * Creates a default tournament if none exists
 */
async function ensureDefaultTournament() {
  const tournaments = await this.storage.read('tournaments');
  
  // Check if default tournament exists
  let defaultTournament = tournaments.find(t => t.name === 'Giải Đấu Mặc Định');
  
  if (!defaultTournament) {
    // Create default tournament
    defaultTournament = await this.storage.create('tournaments', {
      name: 'Giải Đấu Mặc Định',
      start_date: new Date().toISOString().split('T')[0],
      status: 'ongoing',
      archived: false,
      config: {
        numGroups: 2,
        teamsPerGroup: 5,
        enableConsolation: false,
        enableThirdPlace: true
      }
    });
  }
  
  return defaultTournament;
}

/**
 * Migrate existing matches to default tournament
 * Assigns tournament_id to all matches that don't have one
 */
async function migrateExistingMatches() {
  try {
    // Ensure default tournament exists
    const defaultTournament = await this.ensureDefaultTournament();
    
    // Get all matches
    const allMatches = await this.storage.read('matches');
    
    // Find matches without tournament_id
    const matchesWithoutTournament = allMatches.filter(m => !m.tournament_id);
    
    if (matchesWithoutTournament.length === 0) {
      return { migrated: 0, message: 'No matches to migrate' };
    }

    // Update each match with default tournament_id
    const updates = matchesWithoutTournament.map(match => ({
      action: 'update',
      table: 'matches',
      id: match.id,
      data: { tournament_id: defaultTournament.id }
    }));

    await this.storage.transaction(updates);

    return {
      migrated: matchesWithoutTournament.length,
      message: `Migrated ${matchesWithoutTournament.length} matches to default tournament`
    };
  } catch (error) {
    throw new Error(`Migration failed: ${error.message}`);
  }
}

/**
 * Check if migration is needed
 */
async function needsMigration() {
  const allMatches = await this.storage.read('matches');
  return allMatches.some(m => !m.tournament_id);
}

// Add methods to prototype
TournamentManager.prototype.ensureDefaultTournament = ensureDefaultTournament;
TournamentManager.prototype.migrateExistingMatches = migrateExistingMatches;
TournamentManager.prototype.needsMigration = needsMigration;

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TournamentManager };
}

// ── Backup & Restore ─────────────────────────────────────────

/**
 * Export tournament data as JSON backup
 * @param {string|number} tournamentId - Tournament ID to backup
 * @returns {Promise<object>} Backup data object
 */
async function exportTournamentBackup(tournamentId) {
  try {
    // Get tournament info
    const tournament = await this.getTournament(tournamentId);
    
    // Get all related data
    const participants = await this.getParticipantsWithMembers(tournamentId);
    const teams = await this.getTeamsWithMembers(tournamentId);
    const matches = await this.getMatches(tournamentId);
    
    // Create backup object
    const backup = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      tournament: tournament,
      participants: participants,
      teams: teams,
      matches: matches
    };
    
    return backup;
  } catch (error) {
    throw new Error(`Backup failed: ${error.message}`);
  }
}

/**
 * Download tournament backup as JSON file
 * @param {string|number} tournamentId - Tournament ID to backup
 */
async function downloadTournamentBackup(tournamentId) {
  try {
    const backup = await this.exportTournamentBackup(tournamentId);
    
    // Generate filename
    const tournament = backup.tournament;
    const date = new Date().toISOString().split('T')[0];
    const filename = `tournament_backup_${tournament.name.replace(/[^a-z0-9]/gi, '_')}_${date}.json`;
    
    // Create download
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    return { success: true, filename: filename };
  } catch (error) {
    throw new Error(`Download failed: ${error.message}`);
  }
}

/**
 * Restore tournament from backup JSON
 * @param {object} backupData - Backup data object
 * @param {object} options - Restore options {newName?, skipMatches?}
 * @returns {Promise<object>} Restored tournament
 */
async function restoreTournamentFromBackup(backupData, options = {}) {
  try {
    // Validate backup format
    if (!backupData.version || !backupData.tournament) {
      throw new Error('Invalid backup format');
    }

    // Create new tournament with optional new name
    const tournamentData = {
      ...backupData.tournament,
      name: options.newName || `${backupData.tournament.name} (Restored)`,
      status: 'upcoming',
      archived: false
    };
    delete tournamentData.id;
    delete tournamentData.created_at;
    
    const newTournament = await this.storage.create('tournaments', tournamentData);

    // Restore participants (need to map member IDs)
    const participantMap = new Map();
    if (backupData.participants && backupData.participants.length > 0) {
      const participantsToCreate = backupData.participants.map(p => {
        const oldId = p.id;
        const newParticipant = {
          tournament_id: newTournament.id,
          member_id: p.member_id,
          tier_override: p.tier_override,
          is_seeded: p.is_seeded
        };
        return { oldId, data: newParticipant };
      });

      const createdParticipants = await this.storage.create(
        'tournament_participants',
        participantsToCreate.map(p => p.data)
      );

      // Map old IDs to new IDs
      participantsToCreate.forEach((p, idx) => {
        participantMap.set(p.oldId, createdParticipants[idx].id);
      });
    }

    // Restore teams (need to map team IDs)
    const teamMap = new Map();
    if (backupData.teams && backupData.teams.length > 0) {
      const teamsToCreate = backupData.teams.map(t => {
        const oldId = t.id;
        const newTeam = {
          tournament_id: newTournament.id,
          name: t.name,
          member1_id: t.member1_id,
          member2_id: t.member2_id,
          group_name: t.group_name,
          is_seeded: t.is_seeded
        };
        return { oldId, data: newTeam };
      });

      const createdTeams = await this.storage.create(
        'teams',
        teamsToCreate.map(t => t.data)
      );

      // Map old IDs to new IDs
      teamsToCreate.forEach((t, idx) => {
        teamMap.set(t.oldId, createdTeams[idx].id);
      });
    }

    // Restore matches (unless skipMatches is true)
    if (!options.skipMatches && backupData.matches && backupData.matches.length > 0) {
      const matchesToCreate = backupData.matches.map(m => {
        const newMatch = {
          tournament_id: newTournament.id,
          team_a: m.team_a || m.teamA,
          team_b: m.team_b || m.teamB,
          score_a: m.score_a !== undefined ? m.score_a : (m.scoreA || 0),
          score_b: m.score_b !== undefined ? m.score_b : (m.scoreB || 0),
          group_name: m.group_name,
          stage: m.stage,
          status: m.status || 'not_started',
          s1a: m.s1a || 0,
          s1b: m.s1b || 0,
          s2a: m.s2a || 0,
          s2b: m.s2b || 0,
          s3a: m.s3a || 0,
          s3b: m.s3b || 0,
          match_time: m.match_time,
          court: m.court,
          referee_name: m.referee_name || m.referee
        };
        return newMatch;
      });

      await this.storage.create('matches', matchesToCreate);
    }

    return {
      success: true,
      tournament: newTournament,
      stats: {
        participants: backupData.participants?.length || 0,
        teams: backupData.teams?.length || 0,
        matches: options.skipMatches ? 0 : (backupData.matches?.length || 0)
      }
    };
  } catch (error) {
    throw new Error(`Restore failed: ${error.message}`);
  }
}

/**
 * Parse and restore tournament from JSON file
 * @param {File} file - JSON file to restore from
 * @param {object} options - Restore options
 * @returns {Promise<object>} Restored tournament
 */
async function restoreTournamentFromFile(file, options = {}) {
  try {
    const text = await file.text();
    const backupData = JSON.parse(text);
    
    return await this.restoreTournamentFromBackup(backupData, options);
  } catch (error) {
    throw new Error(`File restore failed: ${error.message}`);
  }
}

// Add methods to prototype
TournamentManager.prototype.exportTournamentBackup = exportTournamentBackup;
TournamentManager.prototype.downloadTournamentBackup = downloadTournamentBackup;
TournamentManager.prototype.restoreTournamentFromBackup = restoreTournamentFromBackup;
TournamentManager.prototype.restoreTournamentFromFile = restoreTournamentFromFile;
