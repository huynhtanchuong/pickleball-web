// ============================================================
//  i18n.js — Internationalization (VI / EN)
//  Default: Vietnamese. Persisted in localStorage.
// ============================================================

const TRANSLATIONS = {
  vi: {
    // Site
    siteTitle:        "HTC Pickleball",
    liveSub:          "Bảng Điểm Trực Tiếp",
    adminLink:        "Trọng tài ›",

    // Status
    initializing:     "Đang khởi động…",
    connected:        "🟢 Đã kết nối",
    demoMode:         "⚠️ Demo — chưa cấu hình Supabase",
    realtimeActive:   "🟢 Realtime đang hoạt động",
    realtimeLost:     "⚠️ Mất kết nối — đang polling",
    matchFinished:    "Trận đấu đã kết thúc ✓",
    scoreSaved:       "Đã lưu điểm số ✓",
    infoSaved:        "Đã lưu thông tin ✓",
    matchReset:       "Đã reset trận đấu ✓",
    bracketCleared:   "Đã reset trận đấu ✓ — bracket đã xóa",
    semiCreated:      "Bán kết đã tạo!",
    finalCreated:     "Chung kết đã tạo!",

    // Featured
    featuredLabel:    "Trận Nổi Bật",
    liveBadge:        "● TRỰC TIẾP",
    badgeLive:        "● Đang đấu",
    badgeDone:        "✓ Kết thúc",
    badgeNs:          "◌ Chưa bắt đầu",
    badgePlaying:     "● ĐANG ĐẤU",
    badgeNotStarted:  "◌ CHƯA BẮT ĐẦU",
    badgeFinal:       "✓ KẾT THÚC",

    // Sections
    groupStage:       "Vòng Bảng",
    semifinals:       "Bán Kết",
    final:            "Chung Kết",
    bracket:          "Bracket",
    standings:        "Bảng Xếp Hạng",
    knockout:         "Loại Trực Tiếp",
    championship:     "Chung Kết",

    // Match info
    semifinal:        "Bán Kết",
    groupLabel:       "Bảng",
    champFinal:       "Chung Kết",

    // Standings table
    standingsTeam:    "Đội",
    standingsPts:     "Đ",
    standingsW:       "T",
    standingsL:       "B",
    standingsDiff:    "+/-",
    standingsNote:    "Đ=Điểm · T=Thắng · B=Thua · +/-=Hiệu số",

    // Bracket
    bracketSemi:      "Bán Kết",
    bracketFinal:     "Chung Kết",
    bracketChamp:     "🏆 Vô Địch",
    bracketTbd:       "Chờ kết quả",
    bracketNone:      "Bracket chưa có.",
    bracketPlaceholder1A: "Nhất Bảng A",
    bracketPlaceholder2B: "Nhì Bảng B",
    bracketPlaceholder1B: "Nhất Bảng B",
    bracketPlaceholder2A: "Nhì Bảng A",
    bracketWinnerSF1: "Thắng BK1",
    bracketWinnerSF2: "Thắng BK2",
    matchWaiting:     "⏳ Chờ kết quả vòng trước",

    // Empty states
    loadingMatches:   "Đang tải trận đấu…",
    loadingStandings: "Đang tải bảng xếp hạng…",
    noMatches:        "Không có trận đấu.",
    noStandings:      "Chưa có dữ liệu.",
    autoSemi:         "⏳ Bán kết tự động tạo khi vòng bảng xong.",
    autoFinal:        "⏳ Chung kết tự động tạo khi bán kết xong.",

    // Demo
    demoNote:         "⚠️ Demo — dữ liệu lưu cục bộ. Kết nối Supabase để đồng bộ realtime.",
    resetDemo:        "↺ Reset Demo",

    // Footer
    footerSub:        "Bảng Điểm Trực Tiếp",

    // Admin
    adminTitle:       "Đăng Nhập Trọng Tài",
    adminSub:         "HTC Pickleball",
    passwordLabel:    "Mật khẩu",
    passwordPlaceholder: "Nhập mật khẩu",
    signIn:           "Đăng Nhập",
    backToPublic:     "← Xem bảng điểm",
    wrongPassword:    "Sai mật khẩu. Thử lại.",

    // Admin panel
    adminPanelTitle:  "Bảng Điều Khiển Trọng Tài",
    adminMode:        "Trọng tài mode",
    viewerMode:       "Người xem mode",
    viewPublic:       "👁 Xem",
    logout:           "Đăng xuất",
    bracketSection:   "⚙️ Bracket",
    bracketNote:      "⏳ Bán kết & chung kết tự động tạo khi trận cuối hoàn thành.",
    bracketResetNote: "Reset 1 trận sẽ tự xóa bán kết/chung kết để tạo lại đúng cặp đấu.",
    groupStageSection:"📋 Vòng Bảng",
    semiSection:      "⚡ Bán Kết",
    finalSection:     "🏆 Chung Kết",
    bracketVisual:    "🗂 Bracket",
    standingsSection: "📊 Bảng Xếp Hạng",
    loading:          "Đang tải…",

    // Match card admin
    save:             "💾 Lưu",
    finish:           "🏁 Kết thúc",
    finished:         "✓ Đã xong",
    resetMatch:       "↺ Reset",
    saveInfo:         "Lưu thông tin",
    timePlaceholder:  "🕐 Giờ (vd: 7h20)",
    courtPlaceholder: "🏟 Sân (vd: Sân 1)",
    refPlaceholder:   "👤 Trọng tài",
    addSet3:          "+ Set 3",
    sets:             "Sets:",

    // Status badges
    statusDone:       "✓ XONG",
    statusPlaying:    "● ĐANG ĐẤU",
    statusNs:         "◌ CHƯA BẮT ĐẦU",

    // Confirms
    confirmResetMatch:"Reset trận này về not_started?\nBán kết và chung kết sẽ bị xóa để tạo lại.",
    confirmResetAll:  "Reset toàn bộ dữ liệu? Tất cả điểm số và bán kết/chung kết sẽ bị xóa.",

    // Progress
    done:             "xong",
    playing:          "đang đấu",

    // Language switcher
    langLabel:        "Ngôn ngữ",
    
    // Teams & Backup
    teamsLink:        "Quản lý đội",
    backupLink:       "Backup Now",
    backupTitle:      "Backup Kết Quả Giải Đấu",
    backupDate:       "Ngày backup",
    backupMatches:    "Danh Sách Trận Đấu",
    backupStandings:  "Bảng Xếp Hạng",
    backupSuccess:    "✓ Đã tải file backup",
    autoBackupActive: "🔄 Auto-backup: mỗi 30 phút",
    autoBackupToggle: "Auto BU",
    autoBackupOn:     "✓ Auto-backup đã bật",
    autoBackupOff:    "Auto-backup đã tắt",
    
    // Set Lock
    setLocked:        "🔒 Set đã khóa",
    setUnlocked:      "🔓 Set đã mở",

    // ── Roles & Auth ──
    roleAdmin:        "Admin",
    roleReferee:      "Trọng Tài",
    roleView:         "Xem",
    pwReferee:        "Mật khẩu Trọng Tài:",
    pwAdmin:          "Mật khẩu Admin:",
    pwWrong:          "Mật khẩu không đúng.",
    onlyAdminMatchInfo: "Chỉ admin mới được sửa thông tin trận",
    onlyAdminSpecial: "Chỉ admin mới được tạo trận đặc biệt",
    onlyAdminSchedule: "Chỉ admin mới được xếp lịch",

    // ── Setup wizard / steps ──
    setupMembers:     "Thành viên",
    setupTeams:       "Đội",
    setupMatches:     "Trận đấu",
    setupSchedule:    "Lịch đấu",
    setupStart:       "Bắt đầu",
    ctaAddMembers:    "👥 Thêm Thành viên",
    ctaGenTeams:      "🎲 Tạo Đội Ngẫu nhiên",
    ctaGenMatches:    "📅 Tạo Trận Đấu",
    ctaSchedule:      "🤖 Set Lịch Đấu",
    ctaStartTournament: "▶️ Bắt Đầu Giải Đấu",
    ctaResetTournament: "↺ Reset giải đấu",
    moreOptions:      "Tùy chọn khác",
    editMembers:      "👥 Sửa thành viên",
    repairTeams:      "🎲 Ghép lại đội",
    regenMatches:     "📅 Tạo lại trận đấu",

    // ── Tournament selector ──
    tournamentLabel:  "Giải đấu",
    manageTournament: "Quản lý giải đấu",
    manageMembers:    "Quản lý thành viên",
    noTournament:     "Chưa có giải đấu nào",
    noTournamentSelected: "Chưa chọn giải đấu",
    statusUpcoming:   "Sắp diễn ra",
    statusOngoing:    "Đang diễn ra",
    statusCompleted:  "Đã kết thúc",

    // ── Auto-schedule ──
    scheduleHeader:   "📅 Lịch thi đấu:",
    scheduleHint:     "Bảng A → Sân 1, Bảng B → Sân 2, mỗi trận cách 15 phút",
    scheduleConfirm:  "Sẽ ghi đè giờ, sân, trọng tài của TẤT CẢ trận vòng bảng?\nGiờ bắt đầu: {time} — mỗi trận cách 15 phút.\nBảng A → Sân 1, Bảng B → Sân 2.\nTrọng tài: chọn từ thành viên cùng bảng, không đang thi đấu.",
    scheduling:       "Đang xếp lịch {n} trận…",
    scheduleSaved:    "✓ Đã xếp lịch {n} trận",
    scheduleNoMatch:  "Không có trận vòng bảng để xếp lịch",
    scheduleFail:     "Không thể xếp lịch. Vui lòng thử lại.",

    // ── Match info form ──
    matchTimeLabel:   "🕐 Giờ",
    matchCourtLabel:  "🏟 Sân",
    matchRefLabel:    "👤 Trọng tài",
    matchRefSelect:   "— Chọn trọng tài —",

    // ── Scoring hint ──
    hintTapWinner:    "💡 Bấm vào tên đội <strong>vừa thắng pha bóng</strong> để +1.",
    hintPickServe:    "Trước hết hãy <strong>Chọn Giao Bóng</strong> bên dưới.",
    hintNonServerTap: "Bấm đội <strong>không giao</strong> sẽ đổi giao.",

    // ── Serve dialog ──
    serveDialogTitle: "Chọn Đội Giao Bóng Đầu Tiên",
    serveBefore:      "Giao Bóng Trước",
    serveRandom:      "🎲 Random",
    serveRandomSub:   "Hệ thống chọn ngẫu nhiên",
    serveDefault:     "Mặc định: Server 2",
    cancel:           "Hủy",

    // ── Special matches ──
    specialSection:   "⭐ Trận Đấu Đặc Biệt",
    createThirdPlace: "🥉 Tạo Trận Tranh Giải Ba",
    createConsolation:"🎖️ Tạo Trận Khuyến Khích",
    createShowMatch:  "🎪 Tạo Trận Biểu Diễn",
    noSpecial:        "Chưa có trận đặc biệt nào.",
    thirdPlaceCreated:"✓ Đã tạo trận tranh giải ba",
    consolationCreated:"✓ Đã tạo trận khuyến khích",
    showMatchCreated: "✓ Đã tạo trận biểu diễn",
    thirdPlaceExists: "⚠️ Trận tranh giải ba đã tồn tại",
    consolationExists:"⚠️ Trận khuyến khích đã tồn tại",
    needSemiDone:     "Cần cả 2 trận bán kết kết thúc trước khi tạo trận tranh giải ba",

    // ── Tabs ──
    tabMatches:       "⚽ Trận đấu",
    tabMembers:       "👥 Vận động viên",
    tabTeams:         "🏆 Đội",
    tabStandings:     "📊 Bảng xếp hạng",

    // ── Errors (friendly) ──
    errGeneric:       "Có lỗi xảy ra. Vui lòng thử lại.",
    errNetwork:       "Mất kết nối mạng. Kiểm tra internet rồi thử lại.",
    errAuth:          "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.",
    errSchema:        "Cơ sở dữ liệu chưa được cập nhật cấu trúc. Liên hệ admin.",
    errDuplicate:     "Đã tồn tại bản ghi giống. Vui lòng kiểm tra lại.",
    errForeignKey:    "Không thể thao tác — dữ liệu đang được tham chiếu ở nơi khác.",
    errNotNull:       "Thiếu thông tin bắt buộc. Vui lòng điền đầy đủ.",
    errCheck:         "Giá trị không hợp lệ. Vui lòng kiểm tra lại.",
    errPermission:    "Bạn không có quyền thực hiện thao tác này.",
    errSaveScore:     "Không thể lưu điểm. Vui lòng thử lại.",
    errFinishMatch:   "Không thể kết thúc trận đấu. Vui lòng thử lại.",
    errMatchNotFound: "Không tìm thấy trận đấu",
    errPickServerFirst: "⚠️ Vui lòng chọn đội giao bóng trước",
    errMatchEnded:    "⚠️ Trận đấu đã kết thúc",
    errTournamentNotStarted: "⚠️ Giải đấu chưa bắt đầu — admin chưa \"Bắt Đầu Giải Đấu\"",
    errOnlyReferee:   "⚠️ Chỉ trọng tài mới được chấm điểm",

    // ── Standings tie-break ──
    ptsTooltip:       "1 điểm cho mỗi trận thắng",
    standingsSortHint:"Sắp xếp: Điểm → Hiệu số → Đối đầu",
    tbH2H:            "thắng đối đầu",
    tbH2HDiff:        "hiệu số đối đầu tốt hơn",
    tbDiff:           "hiệu số tốt hơn",
    tbRanksAbove:     "{a} xếp trên {b} do {reason}",

    // ── Misc ──
    reload:           "Reload",
    backupNow:        "Backup Now",
    pointsUpdated:    "✓ Đã cập nhật điểm",
  },

  en: {
    siteTitle:        "HTC Pickleball",
    liveSub:          "Live Scoreboard",
    adminLink:        "Referee ›",

    initializing:     "Initializing…",
    connected:        "🟢 Connected",
    demoMode:         "⚠️ Demo — Supabase not configured",
    realtimeActive:   "🟢 Realtime active",
    realtimeLost:     "⚠️ Realtime lost — polling",
    matchFinished:    "Match finished ✓",
    scoreSaved:       "Score saved ✓",
    infoSaved:        "Info saved ✓",
    matchReset:       "Match reset ✓",
    bracketCleared:   "Match reset ✓ — bracket cleared",
    semiCreated:      "Semifinals created!",
    finalCreated:     "Final created!",

    featuredLabel:    "Featured Match",
    liveBadge:        "● LIVE",
    badgeLive:        "● Playing",
    badgeDone:        "✓ Final",
    badgeNs:          "◌ Not Started",
    badgePlaying:     "● PLAYING",
    badgeNotStarted:  "◌ NOT STARTED",
    badgeFinal:       "✓ FINAL",

    groupStage:       "Group Stage",
    semifinals:       "Semifinals",
    final:            "Final",
    bracket:          "Bracket",
    standings:        "Standings",
    knockout:         "Knockout",
    championship:     "Championship",

    semifinal:        "Semifinal",
    groupLabel:       "Group",
    champFinal:       "Championship Final",

    standingsTeam:    "Team",
    standingsPts:     "Pts",
    standingsW:       "W",
    standingsL:       "L",
    standingsDiff:    "+/-",
    standingsNote:    "Pts=Points · W=Wins · L=Losses · +/-=Diff",

    bracketSemi:      "Semifinals",
    bracketFinal:     "Final",
    bracketChamp:     "🏆 Champion",
    bracketTbd:       "TBD",
    bracketNone:      "Bracket not yet generated.",
    bracketPlaceholder1A: "1st Group A",
    bracketPlaceholder2B: "2nd Group B",
    bracketPlaceholder1B: "1st Group B",
    bracketPlaceholder2A: "2nd Group A",
    bracketWinnerSF1: "Winner SF1",
    bracketWinnerSF2: "Winner SF2",
    matchWaiting:     "⏳ Waiting for previous round",

    loadingMatches:   "Loading matches…",
    loadingStandings: "Loading standings…",
    noMatches:        "No matches.",
    noStandings:      "No standings yet.",
    autoSemi:         "⏳ Semifinals auto-generate when group stage finishes.",
    autoFinal:        "⏳ Final auto-generates when both semifinals finish.",

    demoNote:         "⚠️ Demo mode — data stored locally. Connect Supabase for realtime sync.",
    resetDemo:        "↺ Reset Demo",

    footerSub:        "Live Scoreboard",

    adminTitle:       "Referee Login",
    adminSub:         "HTC Pickleball",
    passwordLabel:    "Password",
    passwordPlaceholder: "Enter password",
    signIn:           "Sign In",
    backToPublic:     "← Public scoreboard",
    wrongPassword:    "Incorrect password. Try again.",

    adminPanelTitle:  "Referee Control Panel",
    adminMode:        "Referee mode",
    viewerMode:       "Viewer mode",
    viewPublic:       "👁 View",
    logout:           "Logout",
    bracketSection:   "⚙️ Bracket",
    bracketNote:      "⏳ Semifinals & final auto-generate when the last match finishes.",
    bracketResetNote: "Resetting a match will clear the bracket so it regenerates with correct pairings.",
    groupStageSection:"📋 Group Stage",
    semiSection:      "⚡ Semifinals",
    finalSection:     "🏆 Final",
    bracketVisual:    "🗂 Bracket",
    standingsSection: "📊 Standings",
    loading:          "Loading…",

    save:             "💾 Save",
    finish:           "🏁 Finish",
    finished:         "✓ Finished",
    resetMatch:       "↺ Reset",
    saveInfo:         "Save info",
    timePlaceholder:  "🕐 Time (e.g. 7:20am)",
    courtPlaceholder: "🏟 Court (e.g. Court 1)",
    refPlaceholder:   "👤 Referee",
    addSet3:          "+ Set 3",
    sets:             "Sets:",

    statusDone:       "✓ DONE",
    statusPlaying:    "● PLAYING",
    statusNs:         "◌ NOT STARTED",

    confirmResetMatch:"Reset this match to not_started?\nSemifinals and final will be cleared and regenerated.",
    confirmResetAll:  "Reset all data? All scores, semifinals and final will be deleted.",

    done:             "done",
    playing:          "playing",

    langLabel:        "Language",
    
    // Teams & Backup
    teamsLink:        "Manage Teams",
    backupLink:       "Backup Now",
    backupTitle:      "Tournament Results Backup",
    backupDate:       "Backup date",
    backupMatches:    "Match List",
    backupStandings:  "Standings",
    backupSuccess:    "✓ Backup file downloaded",
    autoBackupActive: "🔄 Auto-backup: every 30 min",
    autoBackupToggle: "Auto BU",
    autoBackupOn:     "✓ Auto-backup enabled",
    autoBackupOff:    "Auto-backup disabled",
    
    // Set Lock
    setLocked:        "🔒 Set locked",
    setUnlocked:      "🔓 Set unlocked",

    // Roles & Auth
    roleAdmin:        "Admin",
    roleReferee:      "Referee",
    roleView:         "View",
    pwReferee:        "Referee password:",
    pwAdmin:          "Admin password:",
    pwWrong:          "Wrong password.",
    onlyAdminMatchInfo: "Only admin can edit match info",
    onlyAdminSpecial: "Only admin can create special matches",
    onlyAdminSchedule: "Only admin can run auto-schedule",

    // Setup wizard / steps
    setupMembers:     "Members",
    setupTeams:       "Teams",
    setupMatches:     "Matches",
    setupSchedule:    "Schedule",
    setupStart:       "Start",
    ctaAddMembers:    "👥 Add Members",
    ctaGenTeams:      "🎲 Generate Random Teams",
    ctaGenMatches:    "📅 Generate Matches",
    ctaSchedule:      "🤖 Auto Schedule",
    ctaStartTournament: "▶️ Start Tournament",
    ctaResetTournament: "↺ Reset tournament",
    moreOptions:      "More options",
    editMembers:      "👥 Edit members",
    repairTeams:      "🎲 Re-pair teams",
    regenMatches:     "📅 Re-generate matches",

    // Tournament selector
    tournamentLabel:  "Tournament",
    manageTournament: "Manage tournaments",
    manageMembers:    "Manage members",
    noTournament:     "No tournaments yet",
    noTournamentSelected: "No tournament selected",
    statusUpcoming:   "Upcoming",
    statusOngoing:    "Ongoing",
    statusCompleted:  "Completed",

    // Auto-schedule
    scheduleHeader:   "📅 Schedule:",
    scheduleHint:     "Group A → Court 1, Group B → Court 2, 15-minute slots",
    scheduleConfirm:  "Overwrite time, court, referee for ALL group matches?\nStart time: {time} — 15 min between matches.\nGroup A → Court 1, Group B → Court 2.\nReferee: picked from same group, not currently playing.",
    scheduling:       "Scheduling {n} matches…",
    scheduleSaved:    "✓ Scheduled {n} matches",
    scheduleNoMatch:  "No group matches to schedule",
    scheduleFail:     "Could not schedule. Please try again.",

    // Match info form
    matchTimeLabel:   "🕐 Time",
    matchCourtLabel:  "🏟 Court",
    matchRefLabel:    "👤 Referee",
    matchRefSelect:   "— Pick referee —",

    // Scoring hint
    hintTapWinner:    "💡 Tap the team that <strong>just won the rally</strong> to +1.",
    hintPickServe:    "First, <strong>pick the serving team</strong> below.",
    hintNonServerTap: "Tap the <strong>non-serving</strong> team to switch serve.",

    // Serve dialog
    serveDialogTitle: "Pick First Serving Team",
    serveBefore:      "Serves First",
    serveRandom:      "🎲 Random",
    serveRandomSub:   "System picks randomly",
    serveDefault:     "Default: Server 2",
    cancel:           "Cancel",

    // Special matches
    specialSection:   "⭐ Special Matches",
    createThirdPlace: "🥉 Create 3rd Place Match",
    createConsolation:"🎖️ Create Consolation Match",
    createShowMatch:  "🎪 Create Exhibition Match",
    noSpecial:        "No special matches yet.",
    thirdPlaceCreated:"✓ 3rd-place match created",
    consolationCreated:"✓ Consolation match created",
    showMatchCreated: "✓ Exhibition match created",
    thirdPlaceExists: "⚠️ 3rd-place match already exists",
    consolationExists:"⚠️ Consolation match already exists",
    needSemiDone:     "Both semifinals must finish before creating the 3rd-place match",

    // Tabs
    tabMatches:       "⚽ Matches",
    tabMembers:       "👥 Players",
    tabTeams:         "🏆 Teams",
    tabStandings:     "📊 Standings",

    // Errors (friendly)
    errGeneric:       "Something went wrong. Please try again.",
    errNetwork:       "Network connection lost. Check internet and retry.",
    errAuth:          "Session expired. Please sign in again.",
    errSchema:        "Database schema is out of date. Contact admin.",
    errDuplicate:     "Duplicate record. Please check.",
    errForeignKey:    "Cannot continue — record is referenced elsewhere.",
    errNotNull:       "Missing required field.",
    errCheck:         "Invalid value. Please check.",
    errPermission:    "You don't have permission for this action.",
    errSaveScore:     "Could not save score. Please try again.",
    errFinishMatch:   "Could not finish the match. Please try again.",
    errMatchNotFound: "Match not found",
    errPickServerFirst: "⚠️ Please pick the serving team first",
    errMatchEnded:    "⚠️ Match has ended",
    errTournamentNotStarted: "⚠️ Tournament not started yet — admin hasn't pressed \"Start Tournament\"",
    errOnlyReferee:   "⚠️ Only referees can score",

    // Standings tie-break
    ptsTooltip:       "1 point per win",
    standingsSortHint:"Sort: Points → Diff → Head-to-head",
    tbH2H:            "head-to-head win",
    tbH2HDiff:        "better head-to-head diff",
    tbDiff:           "better point diff",
    tbRanksAbove:     "{a} ranks above {b} due to {reason}",

    // Misc
    reload:           "Reload",
    backupNow:        "Backup Now",
    pointsUpdated:    "✓ Points updated",
  }
};

// ── Current language ──────────────────────────────────────────
let _lang = localStorage.getItem("pb_lang") || "vi";

function t(key, vars) {
  let s = (TRANSLATIONS[_lang] && TRANSLATIONS[_lang][key]) ||
          (TRANSLATIONS["vi"][key]) || key;
  if (vars && typeof s === 'string') {
    s = s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : `{${k}}`));
  }
  return s;
}

function setLang(lang) {
  _lang = lang;
  localStorage.setItem("pb_lang", lang);
  applyTranslations();
  // Re-render dynamic content if fetchMatches is available
  if (typeof fetchMatches === "function") fetchMatches();
}

// ── Apply static translations (data-i18n attributes) ─────────
function applyTranslations() {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    const attr = el.getAttribute("data-i18n-attr");
    const val = t(key);
    if (attr) {
      el.setAttribute(attr, val);
    } else {
      el.textContent = val;
    }
  });

  // Update lang switcher active state
  document.querySelectorAll(".lang-btn").forEach(btn => {
    btn.classList.toggle("lang-btn-active", btn.dataset.lang === _lang);
  });

  // Update html lang attribute
  document.documentElement.lang = _lang === "vi" ? "vi" : "en";
}

// ── Boot: apply on load ───────────────────────────────────────
document.addEventListener("DOMContentLoaded", applyTranslations);
