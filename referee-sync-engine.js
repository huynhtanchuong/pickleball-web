// ============================================================
//  Referee Scoring System - SyncEngine
//  Real-time synchronization with Supabase
// ============================================================

/**
 * SyncEngine - Handles real-time synchronization with Supabase
 * 
 * Manages real-time subscriptions, debounced writes, conflict detection,
 * and state serialization for the referee scoring system.
 * 
 * Features:
 * - Subscribe to match updates via Supabase realtime
 * - Publish state changes with 300ms debouncing
 * - Detect conflicts using updated_at timestamps
 * - Serialize/deserialize state for database storage
 * 
 * @class SyncEngine
 */
class SyncEngine {
  /**
   * Create a new SyncEngine
   * 
   * @param {Object} supabaseClient - Supabase client instance (or null for demo mode)
   * @param {StorageAdapter} [storageAdapter] - Optional storage adapter for unified access
   */
  constructor(supabaseClient, storageAdapter = null) {
    this.supabase = supabaseClient;
    this.storage = storageAdapter;
    this.channel = null;
    this.debounceTimer = null;
    this.debounceDelay = 300; // milliseconds
    this.isDemo = !supabaseClient;
  }

  /**
   * Subscribe to match updates
   * 
   * Creates a Supabase realtime channel to listen for changes to a specific match.
   * When updates occur, deserializes the state and calls the callback.
   * 
   * @param {string} matchId - Match ID to subscribe to
   * @param {function} callback - Callback function(state: GameState) called on updates
   * @returns {Object|null} Channel object for cleanup, or null if demo mode
   */
  subscribe(matchId, callback) {
    // Demo mode: use localStorage events for cross-tab sync
    if (this.isDemo) {
      return this._subscribeLocalStorage(matchId, callback);
    }

    // Supabase mode: use realtime subscriptions
    const channelName = `match:${matchId}`;
    
    this.channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'matches', 
          filter: `id=eq.${matchId}` 
        },
        (payload) => {
          // Deserialize and call callback
          const state = this.deserializeState(payload.new);
          callback(state);
        }
      )
      .subscribe();

    return this.channel;
  }

  /**
   * Subscribe to match updates in demo mode (localStorage)
   * 
   * @private
   * @param {string} matchId - Match ID to subscribe to
   * @param {function} callback - Callback function
   * @returns {Object} Subscription object with unsubscribe method
   */
  _subscribeLocalStorage(matchId, callback) {
    const handler = (event) => {
      if (event.key === 'pb_matches' && event.storageArea === localStorage) {
        const matches = event.newValue ? JSON.parse(event.newValue) : [];
        const match = matches.find(m => m.id === matchId);
        if (match) {
          const state = this.deserializeState(match);
          callback(state);
        }
      }
    };

    window.addEventListener('storage', handler);
    
    return {
      handler,
      unsubscribe: () => {
        window.removeEventListener('storage', handler);
      }
    };
  }

  /**
   * Unsubscribe from match updates
   * 
   * Cleans up the realtime channel subscription.
   * 
   * @param {Object} channel - Channel object returned from subscribe()
   */
  unsubscribe(channel) {
    if (!channel) return;

    if (this.isDemo) {
      // Demo mode: remove storage event listener
      if (channel.unsubscribe) {
        channel.unsubscribe();
      }
    } else {
      // Supabase mode: remove channel
      if (this.supabase && channel) {
        this.supabase.removeChannel(channel);
      }
    }
  }

  /**
   * Publish state changes (debounced)
   * 
   * Publishes state changes to the database with debouncing to prevent
   * excessive writes. Checks for conflicts before writing.
   * 
   * @param {GameState} state - Game state to publish
   * @returns {Promise<boolean>} True if published successfully, false if conflict detected
   */
  async publish(state) {
    // Clear existing debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Debounce the write
    return new Promise((resolve) => {
      this.debounceTimer = setTimeout(async () => {
        try {
          // Check for conflicts
          const conflict = await this.checkConflict(state.matchId, state.updatedAt);
          if (conflict) {
            this.handleConflict(state.matchId);
            resolve(false);
            return;
          }

          // Update timestamp
          state.updatedAt = new Date().toISOString();

          // Publish to database
          if (this.isDemo) {
            await this._publishLocalStorage(state);
          } else {
            await this._publishSupabase(state);
          }

          resolve(true);
        } catch (error) {
          console.error('SyncEngine: Publish error:', error);
          resolve(false);
        }
      }, this.debounceDelay);
    });
  }

  /**
   * Publish state to localStorage (demo mode)
   * 
   * @private
   * @param {GameState} state - Game state to publish
   */
  async _publishLocalStorage(state) {
    const stored = localStorage.getItem('pb_matches');
    const matches = stored ? JSON.parse(stored) : [];
    
    const index = matches.findIndex(m => m.id === state.matchId);
    const serialized = this.serializeState(state);
    
    if (index !== -1) {
      matches[index] = serialized;
    } else {
      matches.push(serialized);
    }
    
    localStorage.setItem('pb_matches', JSON.stringify(matches));
    
    // Trigger storage event for cross-tab sync
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'pb_matches',
      newValue: JSON.stringify(matches),
      storageArea: localStorage
    }));
  }

  /**
   * Publish state to Supabase
   * 
   * @private
   * @param {GameState} state - Game state to publish
   */
  async _publishSupabase(state) {
    const serialized = this.serializeState(state);
    
    const { error } = await this.supabase
      .from('matches')
      .update(serialized)
      .eq('id', state.matchId);

    if (error) {
      throw new Error(`Failed to publish state: ${error.message}`);
    }
  }

  /**
   * Check for conflicts
   * 
   * Compares the known timestamp with the database timestamp to detect
   * if another user has modified the match since we last loaded it.
   * 
   * @param {string} matchId - Match ID to check
   * @param {string} knownTimestamp - ISO timestamp of our current state
   * @returns {Promise<boolean>} True if conflict detected, false otherwise
   */
  async checkConflict(matchId, knownTimestamp) {
    // Demo mode: no conflicts possible (single localStorage)
    if (this.isDemo) {
      return false;
    }

    try {
      const { data, error } = await this.supabase
        .from('matches')
        .select('updated_at')
        .eq('id', matchId)
        .single();

      if (error || !data) {
        // Can't check for conflict, allow save
        return false;
      }

      // Conflict if database timestamp differs from known timestamp
      return data.updated_at !== knownTimestamp;
    } catch (error) {
      console.error('SyncEngine: Conflict check error:', error);
      return false; // Allow save on error
    }
  }

  /**
   * Handle conflict
   * 
   * Called when a conflict is detected. Displays a warning to the user
   * and offers to reload the current state.
   * 
   * @param {string} matchId - Match ID with conflict
   */
  handleConflict(matchId) {
    console.warn(`SyncEngine: Conflict detected for match ${matchId}`);
    
    // Dispatch custom event for UI to handle
    const event = new CustomEvent('sync-conflict', {
      detail: { matchId }
    });
    window.dispatchEvent(event);

    // Show user-friendly message
    if (typeof setStatus === 'function') {
      setStatus('⚠️ Match updated by another user. Please reload.', 'err');
    }
  }

  /**
   * Serialize GameState to database format
   * 
   * Converts GameState object to format suitable for database storage.
   * Handles field name mapping (camelCase → snake_case) and JSONB fields.
   * 
   * @param {GameState} state - Game state to serialize
   * @returns {Object} Database-compatible object
   */
  serializeState(state) {
    return {
      id: state.matchId,
      tournament_id: state.tournamentId,
      teamA: state.teamA,
      teamB: state.teamB,
      scoreA: state.scoreA,
      scoreB: state.scoreB,
      serving_team: state.servingTeam,
      server_number: state.serverNumber,
      current_set: state.currentSet,
      completed_sets: JSON.stringify(state.completedSets),
      match_config: JSON.stringify(state.config),
      status: state.status,
      updated_at: state.updatedAt,
      updated_by: state.updatedBy || ''
    };
  }

  /**
   * Deserialize database record to GameState
   * 
   * Converts database record to GameState object.
   * Handles field name mapping (snake_case → camelCase) and JSONB parsing.
   * 
   * @param {Object} record - Database record
   * @returns {GameState} Game state object
   */
  deserializeState(record) {
    // Parse JSONB fields if they're strings
    const completedSets = typeof record.completed_sets === 'string'
      ? JSON.parse(record.completed_sets)
      : (record.completed_sets || []);
    
    const config = typeof record.match_config === 'string'
      ? JSON.parse(record.match_config)
      : (record.match_config || {
          matchFormat: 'BO3',
          targetScore: 11,
          winByMargin: 2,
          firstServeSingle: true,
          enableFaultButtons: false
        });

    return {
      matchId: record.id,
      tournamentId: record.tournament_id,
      teamA: record.teamA || record.teama,
      teamB: record.teamB || record.teamb,
      scoreA: record.scoreA || record.scorea || 0,
      scoreB: record.scoreB || record.scoreb || 0,
      servingTeam: record.serving_team || 'A',
      serverNumber: record.server_number || 1,
      currentSet: record.current_set || 1,
      completedSets,
      config,
      status: record.status || 'not_started',
      updatedAt: record.updated_at || new Date().toISOString(),
      updatedBy: record.updated_by || ''
    };
  }

  /**
   * Load initial state from database
   * 
   * Fetches the current state of a match from the database.
   * 
   * @param {string} matchId - Match ID to load
   * @returns {Promise<GameState|null>} Game state or null if not found
   */
  async loadState(matchId) {
    if (this.isDemo) {
      const stored = localStorage.getItem('pb_matches');
      const matches = stored ? JSON.parse(stored) : [];
      const match = matches.find(m => m.id === matchId);
      return match ? this.deserializeState(match) : null;
    }

    try {
      const { data, error } = await this.supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single();

      if (error || !data) {
        console.error('SyncEngine: Load state error:', error);
        return null;
      }

      return this.deserializeState(data);
    } catch (error) {
      console.error('SyncEngine: Load state error:', error);
      return null;
    }
  }

  /**
   * Clean up resources
   * 
   * Unsubscribes from channels and clears timers.
   */
  cleanup() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    if (this.channel) {
      this.unsubscribe(this.channel);
      this.channel = null;
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SyncEngine };
}

// Export to window for browser environment
if (typeof window !== 'undefined') {
  window.SyncEngine = SyncEngine;
}
