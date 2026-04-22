// ============================================================
//  Referee Scoring System - RefereeUI Component
//  Full-featured scoring interface for referees
// ============================================================

/**
 * RefereeUI - Interactive scoring interface for referees
 * 
 * Provides a complete UI for match scoring with:
 * - Score buttons for both teams
 * - Undo functionality
 * - Set/match completion dialogs
 * - Real-time synchronization
 * - Input validation
 * 
 * @class RefereeUI
 */
class RefereeUI {
  /**
   * Create a new RefereeUI
   * 
   * @param {string} matchId - Match ID to score
   * @param {HTMLElement} container - Container element for UI
   * @param {Object} options - Configuration options
   */
  constructor(matchId, container, options = {}) {
    this.matchId = matchId;
    this.container = container;
    this.options = {
      enableFaultButtons: options.enableFaultButtons || false,
      ...options
    };
    
    this.state = null;
    this.history = new HistoryManager();
    this.sync = new SyncEngine(window.supabase || null);
    this.debounceTimers = {};
    
    this.init();
  }

  /**
   * Initialize the UI
   * 
   * Loads initial state and sets up real-time subscriptions.
   */
  async init() {
    try {
      // Show loading state
      this.showLoading();
      
      // Load initial state
      this.state = await this.sync.loadState(this.matchId);
      
      if (!this.state) {
        // Create new match state if not found
        this.state = await this.createNewMatch();
      }
      
      // Subscribe to real-time updates
      this.channel = this.sync.subscribe(this.matchId, (newState) => {
        this.state = newState;
        this.render();
      });
      
      // Listen for sync conflicts
      window.addEventListener('sync-conflict', (e) => {
        if (e.detail.matchId === this.matchId) {
          this.handleSyncConflict();
        }
      });
      
      // Initial render
      this.render();
      
    } catch (error) {
      console.error('RefereeUI: Initialization error:', error);
      this.showError('Failed to load match. Please refresh the page.');
    }
  }

  /**
   * Create new match state
   * 
   * @returns {Promise<GameState>} New game state
   */
  async createNewMatch() {
    // Get match details from URL or storage
    const urlParams = new URLSearchParams(window.location.search);
    const tournamentId = urlParams.get('tournamentId') || 'default';
    
    // Try to get team names from existing match data
    let teamA = 'Team A';
    let teamB = 'Team B';
    
    if (window.storage) {
      const matches = await window.storage.getMatches(tournamentId);
      const match = matches.find(m => m.id === this.matchId);
      if (match) {
        teamA = match.teamA || match.teama || 'Team A';
        teamB = match.teamB || match.teamb || 'Team B';
      }
    }
    
    return createGameState({
      matchId: this.matchId,
      tournamentId: tournamentId,
      teamA: teamA,
      teamB: teamB,
      config: {
        matchFormat: 'BO3',
        targetScore: 11,
        winByMargin: 2,
        firstServeSingle: true,
        enableFaultButtons: this.options.enableFaultButtons
      }
    });
  }

  /**
   * Render the UI
   * 
   * Updates the DOM with current state.
   */
  render() {
    if (!this.state) return;
    
    const scoreCall = generateScoreCall(this.state);
    const { setsWonA, setsWonB } = getSetsWon(this.state);
    
    this.container.innerHTML = `
      <div class="referee-ui">
        <!-- Header -->
        <div class="match-header">
          <h1>Referee Scoring</h1>
          <div class="match-info">
            <span>Set ${this.state.currentSet}</span>
            <span class="sets-won">Sets: ${setsWonA} - ${setsWonB}</span>
          </div>
        </div>

        <!-- Score Display -->
        <div class="score-display">
          <div class="team team-a ${this.state.servingTeam === 'A' ? 'serving' : ''}">
            <h2>${this.state.teamA}</h2>
            <div class="score">${this.state.scoreA}</div>
            ${this.state.servingTeam === 'A' ? '<div class="serving-indicator">SERVING</div>' : ''}
          </div>
          
          <div class="vs">VS</div>
          
          <div class="team team-b ${this.state.servingTeam === 'B' ? 'serving' : ''}">
            <h2>${this.state.teamB}</h2>
            <div class="score">${this.state.scoreB}</div>
            ${this.state.servingTeam === 'B' ? '<div class="serving-indicator">SERVING</div>' : ''}
          </div>
        </div>

        <!-- Score Call -->
        <div class="score-call">
          <div class="score-call-label">Score Call</div>
          <div class="score-call-value">${scoreCall}</div>
        </div>

        <!-- Server Indicator -->
        <div class="server-indicator">
          Server: Team ${this.state.servingTeam} - Server ${this.state.serverNumber}
        </div>

        <!-- Action Buttons -->
        <div class="action-buttons">
          <button 
            class="btn-score btn-team-a" 
            onclick="window.refereeUI.handleScore('A')"
            ${this.state.status === 'match_complete' ? 'disabled' : ''}>
            ${this.state.teamA} Scores
          </button>
          
          <button 
            class="btn-score btn-team-b" 
            onclick="window.refereeUI.handleScore('B')"
            ${this.state.status === 'match_complete' ? 'disabled' : ''}>
            ${this.state.teamB} Scores
          </button>
          
          ${this.state.config.enableFaultButtons ? `
            <button 
              class="btn-fault" 
              onclick="window.refereeUI.handleFault('A')"
              ${this.state.status === 'match_complete' ? 'disabled' : ''}>
              Fault ${this.state.teamA}
            </button>
            
            <button 
              class="btn-fault" 
              onclick="window.refereeUI.handleFault('B')"
              ${this.state.status === 'match_complete' ? 'disabled' : ''}>
              Fault ${this.state.teamB}
            </button>
          ` : ''}
          
          <button 
            class="btn-fault" 
            onclick="window.refereeUI.handleChangeServe()"
            ${this.state.status === 'match_complete' ? 'disabled' : ''}
            style="background: linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%); color: white; border: none;">
            🔄 Đổi Giao
          </button>
          
          <button 
            class="btn-undo" 
            onclick="window.refereeUI.handleUndo()"
            ${!this.history.canUndo() ? 'disabled' : ''}>
            ↶ Undo
          </button>
        </div>

        <!-- Completed Sets -->
        ${this.renderCompletedSets()}

        <!-- Status Bar -->
        <div class="status-bar">
          <span class="status-text" id="status-text">Ready</span>
        </div>
      </div>
    `;
  }

  /**
   * Render completed sets display
   * 
   * @returns {string} HTML for completed sets
   */
  renderCompletedSets() {
    if (this.state.completedSets.length === 0) {
      return '';
    }
    
    return `
      <div class="completed-sets">
        <h3>Completed Sets</h3>
        <div class="sets-list">
          ${this.state.completedSets.map(set => `
            <div class="set-result">
              <span>Set ${set.setNumber}:</span>
              <span class="${set.winner === 'A' ? 'winner' : ''}">${set.scoreA}</span>
              <span>-</span>
              <span class="${set.winner === 'B' ? 'winner' : ''}">${set.scoreB}</span>
              <span class="set-winner">(${set.winner === 'A' ? this.state.teamA : this.state.teamB})</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Handle score button click
   * 
   * @param {'A'|'B'} team - Team that scored
   */
  handleScore(team) {
    // Debounce to prevent double-clicks
    if (this.debounceTimers[`score_${team}`]) {
      return;
    }
    
    this.debounceTimers[`score_${team}`] = setTimeout(() => {
      delete this.debounceTimers[`score_${team}`];
    }, 300);
    
    // Validate action
    const action = { 
      type: team === 'A' ? ActionTypes.SCORE_TEAM_A : ActionTypes.SCORE_TEAM_B 
    };
    const validation = validateAction(this.state, action);
    
    if (!validation.valid) {
      this.showStatus(validation.error, 'error');
      return;
    }
    
    // Save to history
    this.history.push(this.state);
    
    // Apply action
    this.state = gameStateReducer(this.state, action);
    
    // Publish to sync
    this.sync.publish(this.state);
    
    // Re-render
    this.render();
    
    // Check for completion
    if (this.state.status === 'set_complete') {
      this.showSetCompleteDialog();
    } else if (this.state.status === 'match_complete') {
      this.showMatchCompleteDialog();
    } else {
      this.showStatus('Score updated', 'success');
    }
  }

  /**
   * Handle fault button click
   * 
   * @param {'A'|'B'} team - Team that committed fault
   */
  handleFault(team) {
    // Debounce
    if (this.debounceTimers[`fault_${team}`]) {
      return;
    }
    
    this.debounceTimers[`fault_${team}`] = setTimeout(() => {
      delete this.debounceTimers[`fault_${team}`];
    }, 300);
    
    // Validate action
    const action = { 
      type: team === 'A' ? ActionTypes.FAULT_TEAM_A : ActionTypes.FAULT_TEAM_B 
    };
    const validation = validateAction(this.state, action);
    
    if (!validation.valid) {
      this.showStatus(validation.error, 'error');
      return;
    }
    
    // Save to history
    this.history.push(this.state);
    
    // Apply action
    this.state = gameStateReducer(this.state, action);
    
    // Publish to sync
    this.sync.publish(this.state);
    
    // Re-render
    this.render();
    
    this.showStatus('Fault recorded', 'success');
  }

  /**
   * Handle change serve button click
   * 
   * Manually rotate the server without scoring
   */
  handleChangeServe() {
    // Debounce
    if (this.debounceTimers['change_serve']) {
      return;
    }
    
    this.debounceTimers['change_serve'] = setTimeout(() => {
      delete this.debounceTimers['change_serve'];
    }, 300);
    
    // Check if match is complete
    if (this.state.status === 'match_complete') {
      this.showStatus('Cannot change serve after match is complete', 'error');
      return;
    }
    
    // Save to history
    this.history.push(this.state);
    
    // Apply action
    const action = { type: ActionTypes.CHANGE_SERVE };
    this.state = gameStateReducer(this.state, action);
    
    // Publish to sync
    this.sync.publish(this.state);
    
    // Re-render
    this.render();
    
    this.showStatus('Serve changed', 'success');
  }

  /**
   * Handle undo button click
   */
  handleUndo() {
    const previousState = this.history.pop();
    
    if (!previousState) {
      this.showStatus('Nothing to undo', 'warning');
      return;
    }
    
    this.state = previousState;
    this.sync.publish(this.state);
    this.render();
    
    this.showStatus('Action undone', 'success');
  }

  /**
   * Show set complete dialog
   */
  showSetCompleteDialog() {
    const lastSet = this.state.completedSets[this.state.completedSets.length - 1];
    const winner = lastSet.winner === 'A' ? this.state.teamA : this.state.teamB;
    
    const dialog = document.createElement('div');
    dialog.className = 'dialog-overlay';
    dialog.innerHTML = `
      <div class="dialog">
        <h2>Set Complete!</h2>
        <p class="dialog-message">${winner} wins Set ${lastSet.setNumber}</p>
        <p class="dialog-score">${lastSet.scoreA} - ${lastSet.scoreB}</p>
        <div class="dialog-buttons">
          <button class="btn-primary" onclick="window.refereeUI.startNextSet()">
            Next Set
          </button>
          <button class="btn-secondary" onclick="window.refereeUI.endMatch()">
            End Match
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(dialog);
  }

  /**
   * Show match complete dialog
   */
  showMatchCompleteDialog() {
    const { setsWonA, setsWonB } = getSetsWon(this.state);
    const winner = setsWonA > setsWonB ? this.state.teamA : this.state.teamB;
    
    const dialog = document.createElement('div');
    dialog.className = 'dialog-overlay';
    dialog.innerHTML = `
      <div class="dialog">
        <h2>Match Complete!</h2>
        <p class="dialog-message">${winner} wins the match</p>
        <p class="dialog-score">Sets: ${setsWonA} - ${setsWonB}</p>
        <div class="dialog-buttons">
          <button class="btn-primary" onclick="window.location.href='admin.html'">
            Back to Admin
          </button>
          <button class="btn-secondary" onclick="window.location.href='viewer.html?matchId=${this.matchId}'">
            View Results
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(dialog);
  }

  /**
   * Start next set
   */
  startNextSet() {
    // Remove dialog
    const dialog = document.querySelector('.dialog-overlay');
    if (dialog) {
      dialog.remove();
    }
    
    // Clear history for new set
    this.history.clear();
    
    // Apply NEXT_SET action
    this.state = gameStateReducer(this.state, { type: ActionTypes.NEXT_SET });
    this.sync.publish(this.state);
    this.render();
    
    this.showStatus(`Starting Set ${this.state.currentSet}`, 'success');
  }

  /**
   * End match
   */
  endMatch() {
    // Remove dialog
    const dialog = document.querySelector('.dialog-overlay');
    if (dialog) {
      dialog.remove();
    }
    
    // Apply END_MATCH action
    this.state = gameStateReducer(this.state, { type: ActionTypes.END_MATCH });
    this.sync.publish(this.state);
    this.render();
    
    this.showMatchCompleteDialog();
  }

  /**
   * Show status message
   * 
   * @param {string} message - Status message
   * @param {'success'|'error'|'warning'} type - Message type
   */
  showStatus(message, type = 'info') {
    const statusText = document.getElementById('status-text');
    if (statusText) {
      statusText.textContent = message;
      statusText.className = `status-text status-${type}`;
      
      // Clear after 3 seconds
      setTimeout(() => {
        statusText.textContent = 'Ready';
        statusText.className = 'status-text';
      }, 3000);
    }
  }

  /**
   * Show loading state
   */
  showLoading() {
    this.container.innerHTML = `
      <div class="loading">
        <div class="spinner"></div>
        <p>Loading match...</p>
      </div>
    `;
  }

  /**
   * Show error message
   * 
   * @param {string} message - Error message
   */
  showError(message) {
    this.container.innerHTML = `
      <div class="error">
        <h2>Error</h2>
        <p>${message}</p>
        <button onclick="window.location.reload()">Reload</button>
      </div>
    `;
  }

  /**
   * Handle sync conflict
   */
  handleSyncConflict() {
    const reload = confirm('This match has been updated by another user. Reload to see latest changes?');
    if (reload) {
      window.location.reload();
    }
  }

  /**
   * Clean up resources
   */
  cleanup() {
    if (this.channel) {
      this.sync.unsubscribe(this.channel);
    }
    this.sync.cleanup();
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { RefereeUI };
}

// Export to window for browser environment
if (typeof window !== 'undefined') {
  window.RefereeUI = RefereeUI;
}
