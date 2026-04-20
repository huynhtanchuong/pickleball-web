# Implementation Plan: Tournament Member Management System

## Overview

This implementation extends the existing single-tournament Pickleball application into a comprehensive multi-tournament management system. The implementation follows a phased approach: database schema setup, storage abstraction layer, core modules (members, tournaments, pairing), UI pages, integration with existing codebase, and comprehensive testing.

**Key Implementation Strategy:**
- Build storage adapter first to support both localStorage and Supabase
- Create member management module as foundation
- Implement tournament creation workflow (4-step wizard)
- Add pairing algorithm with tier-based logic
- Integrate with existing admin/index pages via tournament selector
- Maintain backward compatibility throughout

## Tasks

- [-] 1. Set up database schema and storage infrastructure
  - [x] 1.1 Create Supabase migration for new tables
    - Create migration file with members, tournaments, tournament_participants, teams tables
    - Add tournament_id and match_type columns to existing matches table
    - Create all necessary indexes for performance
    - Test migration in Supabase dashboard
    - _Requirements: 10.1-10.7, 11.1-11.7, 12.1-12.7, 13.1-13.8, 14.1-14.6_
  
  - [x] 1.2 Implement localStorage schema structure
    - Define JSON structure for pb_members, pb_tournaments, pb_tournament_participants, pb_teams
    - Add active_tournament_id to localStorage keys
    - Ensure backward compatibility with existing pb_matches structure
    - _Requirements: 19.1-19.6_

- [ ] 2. Implement Storage Adapter abstraction layer
  - [x] 2.1 Create StorageAdapter base class with unified interface
    - Implement constructor with mode detection (Supabase vs localStorage)
    - Create CRUD methods: create(), read(), update(), delete()
    - Add transaction support for multi-table operations
    - Add subscription methods for realtime updates
    - _Requirements: 19.1-19.6_
  
  - [ ] 2.2 Implement LocalStorageProvider
    - Implement all CRUD operations using localStorage
    - Add filtering and query support
    - Implement storage event listeners for cross-tab sync
    - Handle JSON serialization/deserialization
    - _Requirements: 19.3, 19.4_
  
  - [ ] 2.3 Implement SupabaseProvider
    - Implement all CRUD operations using Supabase client
    - Add error handling and retry logic
    - Implement realtime subscription setup
    - Handle connection failures gracefully
    - _Requirements: 19.2, 19.5, 20.1-20.5_
  
  - [ ]* 2.4 Write property test for storage backend equivalence
    - **Property 10: Storage Backend Equivalence**
    - **Validates: Requirements 19.5**
    - Generate random CRUD operations and verify identical results in both modes
    - Test create, read, update, delete operations
    - Compare final data state (ignoring auto-generated IDs)

- [ ] 3. Checkpoint - Verify storage layer
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Implement Member Management module
  - [ ] 4.1 Create members.js with MemberManager class
    - Implement createMember() with validation (name required, tier 1-3)
    - Implement updateMember() with validation
    - Implement deleteMember() with active tournament check
    - Implement searchMembers() with name and tier filtering
    - Add exportMembers() for CSV export
    - Add importMembers() for CSV import
    - _Requirements: 1.1-1.10, 21.1-21.7_
  
  - [ ]* 4.2 Write property test for tier filter correctness
    - **Property 1: Tier Filter Correctness**
    - **Validates: Requirements 1.8**
    - Generate random member lists with mixed tiers
    - Apply each tier filter (1, 2, 3)
    - Verify all results match filter value
  
  - [ ]* 4.3 Write property test for search query correctness
    - **Property 2: Search Query Correctness**
    - **Validates: Requirements 1.9**
    - Generate random member lists and search queries
    - Verify all results contain query substring (case-insensitive)
  
  - [ ]* 4.4 Write property test for member name validation
    - **Property 8: Member Name Validation**
    - **Validates: Requirements 10.3**
    - Generate random member data with/without names
    - Verify validation rejects null, empty, or missing names
  
  - [ ]* 4.5 Write property test for tier value validation
    - **Property 9: Tier Value Validation**
    - **Validates: Requirements 10.4**
    - Generate random tier values
    - Verify only {1, 2, 3} are accepted

- [ ] 5. Create members.html UI page
  - [ ] 5.1 Build HTML structure for member management page
    - Create page header with title and action buttons
    - Add filter section (search input, tier dropdown)
    - Create container for member cards/list
    - Add modal for add/edit member form
    - Include export/import buttons
    - _Requirements: 15.1-15.7_
  
  - [ ] 5.2 Implement member list rendering and interactions
    - Render member cards with name, tier, email, phone
    - Add tier badge with color coding (Tier 1: gold, Tier 2: silver, Tier 3: bronze)
    - Implement real-time search filtering
    - Implement tier filter dropdown
    - Add click handlers for edit and delete buttons
    - Show confirmation dialog for delete
    - _Requirements: 1.1-1.9, 15.1-15.7_
  
  - [ ] 5.3 Implement add/edit member modal
    - Create modal with form fields (name, tier, email, phone)
    - Add validation for required fields
    - Implement save handler calling MemberManager
    - Show success/error messages
    - Close modal on successful save
    - _Requirements: 1.2-1.5_
  
  - [ ] 5.4 Implement CSV export/import functionality
    - Add export button handler to generate CSV file
    - Format CSV with headers: name, email, phone, tier
    - Add import button with file picker
    - Parse CSV and show preview
    - Handle duplicate detection (by email or name)
    - Show import confirmation with options (skip/update)
    - _Requirements: 21.1-21.7_

- [ ] 6. Checkpoint - Verify member management
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Implement Tournament Management module
  - [ ] 7.1 Create tournaments.js with TournamentManager class
    - Implement createTournament() for basic info
    - Implement addParticipants() with tier overrides and seeding
    - Implement generateTeams() calling pairing algorithm
    - Implement generateSchedule() for round-robin matches
    - Add setActiveTournament() and getActiveTournament()
    - Add tournament status management (upcoming, ongoing, completed)
    - Add archive/unarchive functionality
    - _Requirements: 2.1-2.9, 3.1-3.6, 4.1-4.9, 5.1-5.10, 6.1-6.8_
  
  - [ ] 7.2 Implement round-robin schedule generation
    - Create createRoundRobinSchedule() method
    - Group teams by group_name
    - Generate all pairwise matches within each group
    - Calculate correct match count (N × (N-1) / 2)
    - Set match_type to 'group'
    - _Requirements: 6.1-6.3_
  
  - [ ]* 7.3 Write property test for round-robin completeness
    - **Property 7: Round-Robin Completeness and Count**
    - **Validates: Requirements 6.1, 6.3**
    - Generate random team counts
    - Verify every pair appears exactly once
    - Verify total matches = N × (N-1) / 2

- [ ] 8. Implement Pairing Algorithm module
  - [ ] 8.1 Create pairing.js with PairingAlgorithm class
    - Implement constructor accepting participants array
    - Implement generateTeams() main method
    - Separate participants by tier (using tier_override if present)
    - Separate seeded players
    - Implement Fisher-Yates shuffle for randomization
    - _Requirements: 5.1-5.10_
  
  - [ ] 8.2 Implement tier-based pairing logic
    - Implement pairTiers() method for pairing two tier lists
    - Shuffle both lists for randomness
    - Pair Tier 1 with Tier 3 members
    - Pair Tier 2 with Tier 2 members
    - Handle odd numbers gracefully
    - _Requirements: 5.2, 5.3_
  
  - [ ] 8.3 Implement seeded player distribution
    - Implement distributeToGroups() method
    - Distribute seeded teams evenly across groups
    - Distribute non-seeded teams evenly
    - Assign group names (A, B, C, etc.)
    - _Requirements: 5.4, 5.5_
  
  - [ ]* 8.4 Write property test for Tier 1 + Tier 3 pairing
    - **Property 3: Tier 1 + Tier 3 Pairing Rule**
    - **Validates: Requirements 5.2**
    - Generate random sets of T1 and T3 members
    - Run pairing algorithm
    - Verify all teams consist of one T1 and one T3 member
  
  - [ ]* 8.5 Write property test for Tier 2 + Tier 2 pairing
    - **Property 4: Tier 2 + Tier 2 Pairing Rule**
    - **Validates: Requirements 5.3**
    - Generate random sets of T2 members (even count)
    - Run pairing algorithm
    - Verify all teams consist of two T2 members
  
  - [ ]* 8.6 Write property test for seeded player distribution
    - **Property 5: Seeded Player Distribution**
    - **Validates: Requirements 5.4**
    - Generate random seeded player counts and group counts
    - Verify distribution difference between groups <= 1
  
  - [ ]* 8.7 Write property test for pairing randomness
    - **Property 6: Pairing Randomness**
    - **Validates: Requirements 5.7**
    - Run pairing twice with same input
    - Verify results differ with high probability (statistical test)

- [ ] 9. Checkpoint - Verify pairing algorithm
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Create tournaments.html UI page
  - [ ] 10.1 Build HTML structure for tournament management page
    - Create page header with title and "Create Tournament" button
    - Add tabs for tournament status (Upcoming, Ongoing, Completed, Archived)
    - Create container for tournament cards
    - Add tournament creation wizard modal (4 steps)
    - _Requirements: 16.1-16.7_
  
  - [ ] 10.2 Implement tournament list rendering
    - Render tournament cards with name, date, status
    - Show participant count and group count
    - Add action buttons (View, Edit, Delete, Archive)
    - Filter tournaments by status tabs
    - Show/hide archived tournaments
    - _Requirements: 2.1-2.9, 16.1-16.7_
  
  - [ ] 10.3 Implement tournament creation wizard - Step 1 (Basic Info)
    - Create modal with form for tournament name, start date
    - Add inputs for number of groups (default 2) and teams per group (default 5)
    - Add validation for required fields
    - Implement "Next" button to proceed to Step 2
    - _Requirements: 3.1-3.6_
  
  - [ ] 10.4 Implement tournament creation wizard - Step 2 (Select Participants)
    - Display list of all members with checkboxes
    - Show tier badge for each member
    - Add search and tier filter
    - Allow tier override for each selected member
    - Add "Seeded" checkbox for each selected member
    - Show selected count
    - Implement "Back" and "Next" buttons
    - _Requirements: 4.1-4.9_
  
  - [ ] 10.5 Implement tournament creation wizard - Step 3 (Team Pairing)
    - Add "Auto Pair" button to trigger pairing algorithm
    - Display generated teams grouped by group name
    - Show tier and seeded status for each member
    - Add "Re-pair" button to regenerate with new randomization
    - Allow manual swap of members between teams
    - Allow swap of teams between groups
    - Implement "Back" and "Next" buttons
    - _Requirements: 5.1-5.10_
  
  - [ ] 10.6 Implement tournament creation wizard - Step 4 (Schedule)
    - Add "Generate Schedule" button to create round-robin matches
    - Display all matches grouped by group
    - Show match count per group
    - Allow editing match order
    - Add optional fields for time, court, referee per match
    - Add checkboxes for third-place match and consolation match
    - Implement "Back" and "Create Tournament" buttons
    - Save all data and close wizard on completion
    - _Requirements: 6.1-6.8_

- [ ] 11. Implement special match types
  - [ ] 11.1 Implement third-place match generation
    - Detect when both semifinals are completed
    - Identify two losing teams from semifinals
    - Auto-create third-place match with match_type='third_place'
    - Set status to 'not_started'
    - _Requirements: 7.1-7.4_
  
  - [ ] 11.2 Implement consolation match generation
    - Add toggle for enabling consolation match feature
    - Detect when group stage is completed
    - Identify 3rd place teams from each group
    - Auto-create consolation match with match_type='consolation'
    - Only create if feature is enabled
    - _Requirements: 8.1-8.5_
  
  - [ ] 11.3 Implement show match (exhibition match) creation
    - Add "Create Show Match" button in tournament view
    - Display list of all tournament participants
    - Allow selection of any 4 members
    - Allow manual pairing into 2 teams
    - Create match with match_type='exhibition'
    - Set status to 'not_started'
    - Save result without affecting official standings
    - _Requirements: 9.1-9.7_

- [ ] 12. Update admin.html with tournament selector
  - [ ] 12.1 Add tournament selector dropdown to admin.html
    - Create dropdown element at top of admin panel
    - Populate with all tournaments (show name and status)
    - Add onChange handler to switch active tournament
    - Display current tournament name prominently
    - Save selected tournament to localStorage
    - _Requirements: 17.1-17.5_
  
  - [ ] 12.2 Implement tournament switching logic in admin.js
    - Create switchTournament() function
    - Filter all data by selected tournament_id
    - Reload matches, teams, standings for selected tournament
    - Update all UI components to show selected tournament data
    - Persist selection across page reloads
    - _Requirements: 17.1-17.5_
  
  - [ ] 12.3 Handle empty tournament state
    - Show message when no tournaments exist
    - Provide link to create first tournament
    - Handle case when selected tournament is deleted
    - _Requirements: 17.5_

- [ ] 13. Update index.html with tournament selector
  - [ ] 13.1 Add tournament selector dropdown to index.html
    - Create dropdown element at top of public view
    - Populate with all tournaments
    - Add onChange handler to switch displayed tournament
    - Display current tournament name
    - Save selected tournament to localStorage
    - _Requirements: 18.1-18.5_
  
  - [ ] 13.2 Implement tournament switching logic in app.js
    - Create switchPublicTournament() function
    - Filter matches by selected tournament_id
    - Reload all public view components
    - Default to ongoing tournament, then upcoming if none
    - Persist selection across page reloads
    - _Requirements: 18.1-18.5_

- [ ] 14. Checkpoint - Verify UI integration
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 15. Implement backward compatibility and migration
  - [ ] 15.1 Create data migration script for existing matches
    - Create default tournament for existing data
    - Assign all existing matches to default tournament
    - Preserve all existing match data (scores, status, etc.)
    - Test migration with sample data
    - _Requirements: 14.6_
  
  - [ ] 15.2 Update existing functions to support tournament_id
    - Modify fetchMatches() to filter by active tournament
    - Update updateScore() to include tournament context
    - Modify generateSemifinals() and generateFinal() to use tournament_id
    - Update calculateStandings() to filter by tournament
    - Ensure all existing admin.js functions work with tournament context
    - _Requirements: 14.1-14.6_
  
  - [ ] 15.3 Test backward compatibility
    - Verify existing matches display correctly
    - Test score updates on existing matches
    - Verify bracket generation works with migrated data
    - Test realtime sync with existing data
    - _Requirements: 14.6_

- [ ] 16. Implement realtime synchronization
  - [ ] 16.1 Set up Supabase realtime subscriptions
    - Subscribe to changes on members table
    - Subscribe to changes on tournaments table
    - Subscribe to changes on teams table
    - Subscribe to changes on matches table
    - Handle INSERT, UPDATE, DELETE events
    - _Requirements: 20.1-20.5_
  
  - [ ] 16.2 Implement UI update handlers for realtime events
    - Update member list when members change
    - Update tournament list when tournaments change
    - Update match display when matches change
    - Show indicator when realtime is active
    - Handle concurrent edits gracefully
    - _Requirements: 20.1-20.5_
  
  - [ ] 16.3 Implement localStorage cross-tab sync
    - Listen to storage events in demo mode
    - Update UI when other tabs make changes
    - Avoid infinite update loops
    - _Requirements: 20.4_

- [ ] 17. Implement backup and restore functionality
  - [ ] 17.1 Implement tournament backup export
    - Add "Backup Tournament" button in tournament detail view
    - Collect all tournament data (info, participants, teams, matches, results)
    - Generate JSON file with complete tournament data
    - Name file as tournament_[name]_YYYY-MM-DD.json
    - Trigger download
    - _Requirements: 22.1-22.4_
  
  - [ ] 17.2 Implement tournament restore from backup
    - Add "Restore Tournament" button with file picker
    - Parse and validate backup JSON file
    - Show preview of tournament info
    - Create new tournament with all data from backup
    - Handle errors gracefully
    - _Requirements: 22.5-22.7_

- [ ] 18. Add navigation and polish
  - [ ] 18.1 Create navigation menu for admin pages
    - Add navigation bar with links to admin.html, members.html, tournaments.html, teams.html
    - Highlight active page
    - Ensure consistent styling across all pages
    - Make navigation responsive for mobile
  
  - [ ] 18.2 Add loading states and error handling
    - Show loading spinners during data fetch
    - Display user-friendly error messages
    - Add retry buttons for failed operations
    - Implement toast notifications for success/error
  
  - [ ] 18.3 Ensure mobile responsiveness
    - Test all pages on mobile devices
    - Adjust card layouts for small screens
    - Make modals mobile-friendly
    - Test tournament creation wizard on mobile
    - Verify dropdowns work on touch devices

- [ ] 19. Checkpoint - Final integration test
  - Ensure all tests pass, ask the user if questions arise.

- [ ]* 20. Write integration tests
  - [ ]* 20.1 Test complete tournament creation flow
    - Test all 4 steps of tournament creation wizard
    - Verify data is saved correctly at each step
    - Test navigation between steps (Back/Next)
    - Verify final tournament is created with all data
  
  - [ ]* 20.2 Test tournament switching in admin panel
    - Create multiple tournaments
    - Switch between tournaments
    - Verify correct data is displayed for each tournament
    - Test persistence across page reloads
  
  - [ ]* 20.3 Test realtime sync between admin and public view
    - Open admin panel and public view in separate tabs
    - Make changes in admin panel
    - Verify changes appear in public view
    - Test with both Supabase and localStorage modes
  
  - [ ]* 20.4 Test backward compatibility with existing matches
    - Load existing match data
    - Verify migration to default tournament
    - Test all existing functionality (score updates, bracket generation)
    - Verify no data loss

- [ ] 21. Final checkpoint - Complete verification
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties from design
- Unit and integration tests validate specific examples and workflows
- Implementation uses JavaScript throughout (matching existing codebase)
- Storage adapter pattern enables dual-mode operation (localStorage + Supabase)
- Backward compatibility is maintained by migrating existing matches to default tournament
- Realtime sync works in both modes (Supabase subscriptions + localStorage events)

## Implementation Order Rationale

1. **Database & Storage First**: Foundation for all data operations
2. **Member Management**: Core entity needed for tournaments
3. **Tournament & Pairing**: Core business logic
4. **UI Pages**: User-facing interfaces
5. **Integration**: Connect new features with existing codebase
6. **Polish & Testing**: Ensure quality and reliability

## Testing Strategy

- **Property-Based Tests**: Validate algorithmic correctness (pairing, filtering, scheduling)
- **Unit Tests**: Test individual functions and components
- **Integration Tests**: Test complete workflows end-to-end
- **Manual Testing**: Verify UI/UX and edge cases

## Success Criteria

- All core features implemented and working
- Backward compatibility maintained
- Both storage modes (localStorage + Supabase) functional
- Responsive UI on desktop and mobile
- Property tests passing for all correctness properties
- No data loss during migration
