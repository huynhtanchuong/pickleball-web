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
    viewPublic:       "Xem",
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
    servePicking:     "Đang chọn ngẫu nhiên...",
    serveWinner:      "🎉 {team} giao trước",
    btnStart:         "▶ Bắt đầu",
    lineupBeforeMatch:"📋 Đội hình (vị trí 1 / 2) — chỉ chỉnh trước khi vào trận",
    lineupSetTitle:   "📋 Đội hình Set {set} — chỉnh vị trí trước khi bắt đầu set",
    lineupLocked:     "🔒 Đội hình Set {set} (đã khoá — chờ hết set để đổi)",
    swap:             "Đổi",
    swapLocked:       "Chỉ đổi được khi set chưa có điểm",

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

    // ── Action log (referee scoring history strip) ──
    logStartedTeam:   "Bắt đầu — {team} giao trước",
    logScore:         "{team}: {a}-{b}-{n}",
    logServerLabel:   "Phát: {name}",
    logReceiverLabel: "Đỡ: {name}",
    logSideOut:       "Đổi giao → {team}",
    logFaultPartner:  "Đổi server trong đội {team} (Server {from}→{to})",
    logSetEnd:        "Hết Set {set} ({a}-{b}) → Set {next}",
    logMatchEnd:      "Hết trận ({a}-{b} sets)",
    logUndo:          "Hoàn tác",

    // ── Match-card actions / confirms / statuses ──
    scoreUpdated:     "✓ Đã cập nhật điểm",
    undone:           "↶ Đã hoàn tác",
    noUndo:           "⚠️ Không có action nào để undo",
    matchStateMissing:"❌ Không tìm thấy trạng thái trận đấu",
    serveTeamPicked:  "✓ Đã chọn Team {team} giao bóng",
    tmNotInit:        "❌ Tournament manager chưa được khởi tạo",
    storageNotInit:   "❌ Storage chưa được khởi tạo",
    thirdPlaceExists: "⚠️ Trận tranh giải ba đã tồn tại",
    thirdPlaceCreated:"✓ Đã tạo trận tranh giải ba",
    consolationExists:"⚠️ Trận khuyến khích đã tồn tại",
    consolationCreated:"✓ Đã tạo trận khuyến khích",
    showMatchCreated: "✓ Đã tạo trận biểu diễn",
    needFourMembersTour:"❌ Cần ít nhất 4 thành viên để tạo giải đấu",
    needFourMembersTeam:"❌ Cần ít nhất 4 thành viên để tạo đội",
    onlyBeforeStartTeam:"❌ Chỉ có thể tạo đội khi giải đấu chưa bắt đầu",
    needMembersFirst: "Vui lòng tạo đội trước khi tạo trận đấu",
    onlyBeforeStartMatch:"Chỉ có thể tạo trận đấu khi giải đấu chưa bắt đầu",
    tournamentStartedAlready:"Giải đấu đã bắt đầu",
    needFourToStart:  "Cần ít nhất 4 thành viên để bắt đầu giải đấu",
    needTeamsToStart: "Vui lòng tạo đội trước khi bắt đầu giải đấu",
    needMatchesToStart:"Vui lòng tạo trận đấu trước khi bắt đầu giải đấu",
    notStartedNoReset:"Giải đấu chưa bắt đầu, không cần reset",
    confirmDeleteAllTeams:"Bạn có chắc muốn xóa tất cả đội?\n\nHành động này không thể hoàn tác!",
    noMembersYet:     "❌ Chưa có thành viên nào. Vui lòng thêm thành viên trước.",
    tournamentStartedOk:"✓ Giải đấu đã bắt đầu!",
    tournamentResetting:"🔄 Đang reset giải đấu...",
    tournamentResetOk:"✓ Giải đấu đã được reset",
    teamsDeletingMsg: "🔄 Đang xóa đội...",
    teamsDeletedOk:   "✓ Đã xóa tất cả đội",
    teamsDeleteErr:   "❌ Lỗi khi xóa đội",
    migrating:        "🔄 Đang di chuyển dữ liệu cũ...",
    confirmDeleteTournament:"Bạn có chắc chắn muốn xóa giải đấu này?",
    confirmEndSet:    "Kết thúc Set {set} với tỉ số {a}-{b}?\n\n{winner} thắng set này.",
    confirmEndMatch:  "Kết thúc trận đấu?\n\nKhông thể thay đổi sau khi xác nhận.",
    confirmEndMatchSets:"Kết thúc trận đấu với tỉ số sets {a}-{b}?\n\nKhông thể thay đổi sau khi xác nhận.",
    setEndedOk:       "✓ Hết Set {cs} — bắt đầu Set {next}",
    matchEndedOk:     "🏆 Trận đấu kết thúc",
    setTied:          "Set đang hòa — chưa có người thắng",
    teamNotFound:     "Không tìm thấy đội",
    matchSwitched:    "Đã chuyển giải đấu",
    matchSwitchErr:   "Lỗi khi chuyển giải đấu: {msg}",
    migrateErr:       "⚠️ Lỗi di chuyển dữ liệu: {msg}",
    swapped:          "✓ Đã đổi vị trí",
    pickServeFirst:   "⚠️ Vui lòng chọn đội giao bóng trước",
    matchEnded:       "⚠️ Trận đấu đã kết thúc",
    finishTitleSets:  "Cần ít nhất 1 đội thắng 2 sets",
    finishTitleTied:  "Không thể kết thúc khi tỉ số đang hòa",
    swapHint:         "Đổi vị trí 1 ↔ 2",
    setLockClick:     "Bấm để khóa set này",
    setUnlockClick:   "Bấm để mở khóa set này",
    cantUpdateLock:   "❌ Không thể cập nhật khóa",
    cantSaveMatchInfo:"❌ Không thể lưu thông tin trận đấu",
    confirmResetMatchLong:"Bạn có chắc muốn đặt lại trận này?\n\n• Điểm số sẽ về 0-0\n• Trạng thái về chưa bắt đầu\n• Nếu là trận vòng bảng, bán kết và chung kết sẽ bị xóa để tạo lại\n\nHành động này không thể hoàn tác!",
    matchResetOk:     "✓ Đã đặt lại trận đấu",
    matchUpdatedOther:"⚠️ Trận đấu đã được cập nhật bởi admin khác!\n\nVui lòng bấm Reload để xem dữ liệu mới nhất trước khi reset.",
    cantResetMatch:   "❌ Không thể đặt lại trận đấu",
    confirmRegenSemi: "Xóa bán kết cũ và gen lại?",
    confirmRegenFinal:"Xóa chung kết cũ và gen lại?",
    cantDeleteSemi:   "❌ Không thể xóa bán kết cũ",
    cantDeleteFinal:  "❌ Không thể xóa chung kết cũ",
    semiExists:       "Bán kết đã tồn tại! Dùng nút Re-gen.",
    needTwoGroups:    "Cần ít nhất 2 bảng.",
    finalExists:      "Chung kết đã tồn tại! Dùng nút Re-gen.",
    needTwoSemiDone:  "Cần hoàn thành cả 2 bán kết.",
    cantCreateSemi:   "❌ Không thể tạo bán kết",
    cantCreateFinal:  "❌ Không thể tạo chung kết",

    // ── Special matches ──
    pickMember:       "Chọn thành viên...",
    needFourMembers:  "❌ Vui lòng chọn đủ 4 thành viên",
    noDuplicateMember:"❌ Không được chọn trùng thành viên",
    noSpecialYet:     "Chưa có trận đặc biệt nào.",

    // ── Errors (continued) ──
    genericErr:       "❌ Lỗi: {msg}",

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
    viewPublic:       "View",
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
    servePicking:     "Picking randomly...",
    serveWinner:      "🎉 {team} serves first",
    btnStart:         "▶ Start",
    lineupBeforeMatch:"📋 Lineup (positions 1 / 2) — adjust before the match starts",
    lineupSetTitle:   "📋 Set {set} lineup — adjust positions before the set starts",
    lineupLocked:     "🔒 Set {set} lineup (locked — wait until set ends)",
    swap:             "Swap",
    swapLocked:       "Can only swap when the set has no points yet",

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

    // Action log (referee scoring history strip)
    logStartedTeam:   "Match start — {team} serves first",
    logScore:         "{team}: {a}-{b}-{n}",
    logServerLabel:   "Server: {name}",
    logReceiverLabel: "Receiver: {name}",
    logSideOut:       "Side-out → {team}",
    logFaultPartner:  "Server change within {team} ({from}→{to})",
    logSetEnd:        "End of Set {set} ({a}-{b}) → Set {next}",
    logMatchEnd:      "Match ended ({a}-{b} sets)",
    logUndo:          "Undo",

    // Match-card actions / confirms / statuses
    scoreUpdated:     "✓ Score updated",
    undone:           "↶ Undone",
    noUndo:           "⚠️ Nothing to undo",
    matchStateMissing:"❌ Match state not found",
    serveTeamPicked:  "✓ Team {team} will serve first",
    tmNotInit:        "❌ Tournament manager not initialized",
    storageNotInit:   "❌ Storage not initialized",
    thirdPlaceExists: "⚠️ Third-place match already exists",
    thirdPlaceCreated:"✓ Third-place match created",
    consolationExists:"⚠️ Consolation match already exists",
    consolationCreated:"✓ Consolation match created",
    showMatchCreated: "✓ Show match created",
    needFourMembersTour:"❌ Need at least 4 members to create a tournament",
    needFourMembersTeam:"❌ Need at least 4 members to create a team",
    onlyBeforeStartTeam:"❌ Teams can only be created before the tournament starts",
    needMembersFirst: "Please create teams before creating matches",
    onlyBeforeStartMatch:"Matches can only be created before the tournament starts",
    tournamentStartedAlready:"Tournament has already started",
    needFourToStart:  "Need at least 4 members to start the tournament",
    needTeamsToStart: "Please create teams before starting the tournament",
    needMatchesToStart:"Please create matches before starting the tournament",
    notStartedNoReset:"Tournament hasn't started — no reset needed",
    confirmDeleteAllTeams:"Are you sure you want to delete all teams?\n\nThis cannot be undone!",
    noMembersYet:     "❌ No members yet. Please add members first.",
    tournamentStartedOk:"✓ Tournament started!",
    tournamentResetting:"🔄 Resetting tournament...",
    tournamentResetOk:"✓ Tournament has been reset",
    teamsDeletingMsg: "🔄 Deleting teams...",
    teamsDeletedOk:   "✓ All teams deleted",
    teamsDeleteErr:   "❌ Error deleting teams",
    migrating:        "🔄 Migrating legacy data...",
    confirmDeleteTournament:"Are you sure you want to delete this tournament?",
    confirmEndSet:    "End Set {set} with score {a}-{b}?\n\n{winner} wins the set.",
    confirmEndMatch:  "End the match?\n\nThis cannot be changed afterwards.",
    confirmEndMatchSets:"End match with sets score {a}-{b}?\n\nThis cannot be changed afterwards.",
    setEndedOk:       "✓ Set {cs} ended — Set {next} starting",
    matchEndedOk:     "🏆 Match ended",
    setTied:          "Set is tied — no winner yet",
    teamNotFound:     "Team not found",
    matchSwitched:    "Switched tournament",
    matchSwitchErr:   "Could not switch tournament: {msg}",
    migrateErr:       "⚠️ Migration error: {msg}",
    swapped:          "✓ Positions swapped",
    pickServeFirst:   "⚠️ Please pick the serving team first",
    matchEnded:       "⚠️ Match has ended",
    finishTitleSets:  "Need at least 1 team to win 2 sets",
    finishTitleTied:  "Cannot finish — score is tied",
    swapHint:         "Swap positions 1 ↔ 2",
    setLockClick:     "Click to lock this set",
    setUnlockClick:   "Click to unlock this set",
    cantUpdateLock:   "❌ Could not update lock",
    cantSaveMatchInfo:"❌ Could not save match info",
    confirmResetMatchLong:"Are you sure you want to reset this match?\n\n• Scores back to 0-0\n• Status back to not started\n• If it's a group match, semis and final will be cleared to regenerate\n\nThis cannot be undone!",
    matchResetOk:     "✓ Match reset",
    matchUpdatedOther:"⚠️ This match was updated by another admin!\n\nPlease press Reload to see the latest data before resetting.",
    cantResetMatch:   "❌ Could not reset match",
    confirmRegenSemi: "Delete old semis and regenerate?",
    confirmRegenFinal:"Delete old final and regenerate?",
    cantDeleteSemi:   "❌ Could not delete old semis",
    cantDeleteFinal:  "❌ Could not delete old final",
    semiExists:       "Semis already exist! Use Re-gen.",
    needTwoGroups:    "Need at least 2 groups.",
    finalExists:      "Final already exists! Use Re-gen.",
    needTwoSemiDone:  "Both semis must be finished.",
    cantCreateSemi:   "❌ Could not create semis",
    cantCreateFinal:  "❌ Could not create final",

    // Special matches
    pickMember:       "Pick member...",
    needFourMembers:  "❌ Please pick all 4 members",
    noDuplicateMember:"❌ Cannot pick the same member twice",
    noSpecialYet:     "No special matches yet.",

    // Errors (continued)
    genericErr:       "❌ Error: {msg}",

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
