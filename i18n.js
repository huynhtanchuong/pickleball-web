// ============================================================
//  i18n.js — Internationalization (VI / EN)
//  Default: Vietnamese. Persisted in localStorage.
// ============================================================

const TRANSLATIONS = {
  vi: {
    // Site
    siteTitle:        "Giải Pickleball Tolo Pikaboo lần 3 - 2026",
    liveSub:          "Bảng Điểm Trực Tiếp",
    adminLink:        "Quản trị ›",

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

    // Admin login
    adminTitle:       "Đăng Nhập Admin",
    adminSub:         "Giải Pickleball",
    passwordLabel:    "Mật khẩu",
    passwordPlaceholder: "Nhập mật khẩu",
    signIn:           "Đăng Nhập",
    backToPublic:     "← Xem bảng điểm",
    wrongPassword:    "Sai mật khẩu. Thử lại.",

    // Admin panel
    adminPanelTitle:  "Quản Trị",
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
  },

  en: {
    siteTitle:        "Tolo Pikaboo Pickleball Tournament #3 - 2026",
    liveSub:          "Live Scoreboard",
    adminLink:        "Admin ›",

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

    loadingMatches:   "Loading matches…",
    loadingStandings: "Loading standings…",
    noMatches:        "No matches.",
    noStandings:      "No standings yet.",
    autoSemi:         "⏳ Semifinals auto-generate when group stage finishes.",
    autoFinal:        "⏳ Final auto-generates when both semifinals finish.",

    demoNote:         "⚠️ Demo mode — data stored locally. Connect Supabase for realtime sync.",
    resetDemo:        "↺ Reset Demo",

    footerSub:        "Live Scoreboard",

    adminTitle:       "Admin Login",
    adminSub:         "Pickleball Tournament",
    passwordLabel:    "Password",
    passwordPlaceholder: "Enter password",
    signIn:           "Sign In",
    backToPublic:     "← Public scoreboard",
    wrongPassword:    "Incorrect password. Try again.",

    adminPanelTitle:  "Admin Panel",
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
  }
};

// ── Current language ──────────────────────────────────────────
let _lang = localStorage.getItem("pb_lang") || "vi";

function t(key) {
  return (TRANSLATIONS[_lang] && TRANSLATIONS[_lang][key]) ||
         (TRANSLATIONS["vi"][key]) || key;
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
