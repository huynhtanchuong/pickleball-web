// ============================================================
//  Pairing Algorithm Module
//  Implements tier-based team pairing with seeded player distribution
// ============================================================

/**
 * PairingAlgorithm - Generates balanced teams based on tier and seeding
 */
class PairingAlgorithm {
  constructor(participants, config = {}) {
    this.participants = participants; // Array of participant objects with member and tier info
    this.config = {
      numGroups: config.numGroups || 2,
      teamsPerGroup: config.teamsPerGroup || 5,
      ...config
    };
  }

  /**
   * Main method to generate teams
   * @returns {array} Array of team objects with member1_id, member2_id, group_name, is_seeded
   */
  generateTeams() {
    // 1. Separate participants by tier (using tier_override if present, else member.tier)
    const tier1 = this.participants.filter(p => this.getTier(p) === 1);
    const tier2 = this.participants.filter(p => this.getTier(p) === 2);
    const tier3 = this.participants.filter(p => this.getTier(p) === 3);

    console.log(`Pairing: T1=${tier1.length}, T2=${tier2.length}, T3=${tier3.length}`);

    // 2. Pair Tier 1 + Tier 3
    const teams13 = this.pairTiers(tier1, tier3);

    // 3. Pair Tier 2 + Tier 2 (split into two halves)
    const teams22 = this.pairSameTier(tier2);

    // 4. Combine all teams
    const allTeams = [...teams13, ...teams22];

    console.log(`Generated ${allTeams.length} teams (T1+T3: ${teams13.length}, T2+T2: ${teams22.length})`);

    // 5. Distribute teams to groups with seeded player balancing
    const teamsWithGroups = this.distributeToGroups(allTeams);

    return teamsWithGroups;
  }

  /**
   * Get effective tier for a participant
   */
  getTier(participant) {
    return participant.tier_override || (participant.member ? participant.member.tier : null);
  }

  /**
   * Pair two lists of participants
   * @param {array} listA - First list of participants
   * @param {array} listB - Second list of participants
   * @returns {array} Array of team objects
   */
  pairTiers(listA, listB) {
    // Shuffle both lists for randomness
    const shuffledA = this.shuffle([...listA]);
    const shuffledB = this.shuffle([...listB]);

    const teams = [];
    const maxPairs = Math.min(shuffledA.length, shuffledB.length);

    for (let i = 0; i < maxPairs; i++) {
      const team = {
        member1_id: shuffledA[i].member_id,
        member2_id: shuffledB[i].member_id,
        is_seeded: shuffledA[i].is_seeded || shuffledB[i].is_seeded,
        name: null // Will be auto-generated
      };
      teams.push(team);
    }

    // Handle odd numbers (remaining unpaired participants)
    // For now, we just log a warning. In production, you might want to handle this differently
    if (shuffledA.length > maxPairs) {
      console.warn(`${shuffledA.length - maxPairs} participants from listA remain unpaired`);
    }
    if (shuffledB.length > maxPairs) {
      console.warn(`${shuffledB.length - maxPairs} participants from listB remain unpaired`);
    }

    return teams;
  }

  /**
   * Pair participants from the same tier
   * Splits the list in half and pairs them
   * @param {array} list - List of participants from same tier
   * @returns {array} Array of team objects
   */
  pairSameTier(list) {
    if (list.length < 2) {
      console.warn('Not enough participants to form teams');
      return [];
    }

    // Shuffle for randomness
    const shuffled = this.shuffle([...list]);
    
    // Split into two halves
    const halfPoint = Math.floor(shuffled.length / 2);
    const firstHalf = shuffled.slice(0, halfPoint);
    const secondHalf = shuffled.slice(halfPoint, halfPoint * 2);
    
    // Pair the two halves
    const teams = [];
    for (let i = 0; i < firstHalf.length; i++) {
      const team = {
        member1_id: firstHalf[i].member_id,
        member2_id: secondHalf[i].member_id,
        is_seeded: firstHalf[i].is_seeded || secondHalf[i].is_seeded,
        name: null // Will be auto-generated
      };
      teams.push(team);
    }
    
    // Handle odd number (one person left unpaired)
    if (shuffled.length % 2 === 1) {
      console.warn(`1 participant from same tier remains unpaired (odd number: ${shuffled.length})`);
    }
    
    return teams;
  }

  /**
   * Distribute teams to groups with balanced seeded player distribution
   * @param {array} teams - Array of team objects
   * @returns {array} Teams with group_name assigned
   */
  distributeToGroups(teams) {
    const numGroups = this.config.numGroups;
    const groups = Array.from({ length: numGroups }, () => []);

    // Separate seeded and non-seeded teams
    const seededTeams = teams.filter(t => t.is_seeded);
    const nonSeededTeams = teams.filter(t => !t.is_seeded);

    console.log(`Distributing: ${seededTeams.length} seeded, ${nonSeededTeams.length} non-seeded`);

    // First, distribute seeded teams evenly across groups (round-robin)
    seededTeams.forEach((team, idx) => {
      const groupIdx = idx % numGroups;
      groups[groupIdx].push(team);
    });

    // Then, distribute non-seeded teams evenly
    nonSeededTeams.forEach((team, idx) => {
      const groupIdx = idx % numGroups;
      groups[groupIdx].push(team);
    });

    // Assign group names (A, B, C, ...)
    const result = [];
    groups.forEach((group, idx) => {
      const groupName = String.fromCharCode(65 + idx); // A, B, C...
      group.forEach(team => {
        result.push({
          ...team,
          group_name: groupName
        });
      });
    });

    // Log distribution
    groups.forEach((group, idx) => {
      const groupName = String.fromCharCode(65 + idx);
      const seededCount = group.filter(t => t.is_seeded).length;
      console.log(`Group ${groupName}: ${group.length} teams (${seededCount} seeded)`);
    });

    return result;
  }

  /**
   * Fisher-Yates shuffle algorithm
   * @param {array} array - Array to shuffle
   * @returns {array} Shuffled array
   */
  shuffle(array) {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  /**
   * Validate pairing configuration
   * @returns {object} { valid: boolean, errors: array }
   */
  validate() {
    const errors = [];

    // Check minimum participants
    if (this.participants.length < 4) {
      errors.push('Cần ít nhất 4 thành viên để tạo đội');
    }

    // Check Tier 2 count (must be even for T2+T2 pairing)
    const tier2Count = this.participants.filter(p => this.getTier(p) === 2).length;
    if (tier2Count % 2 !== 0) {
      errors.push('Số thành viên Tier 2 phải là số chẵn');
    }

    // Check if we can form enough teams
    const tier1 = this.participants.filter(p => this.getTier(p) === 1).length;
    const tier3 = this.participants.filter(p => this.getTier(p) === 3).length;
    const possibleT13Teams = Math.min(tier1, tier3);
    const possibleT22Teams = Math.floor(tier2Count / 2);
    const totalTeams = possibleT13Teams + possibleT22Teams;

    if (totalTeams < 2) {
      errors.push('Không đủ thành viên để tạo ít nhất 2 đội');
    }

    // Check seeded players vs groups
    const seededCount = this.participants.filter(p => p.is_seeded).length;
    if (seededCount > this.config.numGroups * 2) {
      console.warn(`Có ${seededCount} hạt giống nhưng chỉ ${this.config.numGroups} bảng. Phân bổ có thể không đều.`);
    }

    return {
      valid: errors.length === 0,
      errors: errors,
      warnings: [],
      stats: {
        totalParticipants: this.participants.length,
        tier1: tier1,
        tier2: tier2Count,
        tier3: tier3,
        seeded: seededCount,
        possibleTeams: totalTeams
      }
    };
  }

  /**
   * Get pairing statistics
   */
  getStats() {
    const validation = this.validate();
    return validation.stats;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PairingAlgorithm };
}
