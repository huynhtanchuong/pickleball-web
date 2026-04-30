/* ============================================================
   animations.js — UI polish layer
   - GSAP-driven tab crossfade for .admin-tab / .tabs .tab
   - Page-leave fade for in-site nav links (free entry via View Transitions)
   - Card stagger via --idx CSS var
   - Click ripple for common buttons
   - Smooth collapsible panels via [data-collapsible]
   ------------------------------------------------------------
   No-op gracefully when GSAP fails to load (CDN block, offline).
   Wraps the existing switchTab() / switchAdminTab() functions
   instead of replacing them, so all original logic still runs.
   ============================================================ */

(function () {
  "use strict";

  // ----- Reduced-motion guard -----
  const RM = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ----- Lazy GSAP loader (CDN, ~70KB cached) -----
  let _gsapPromise = null;
  function loadGsap() {
    if (window.gsap) return Promise.resolve(window.gsap);
    if (_gsapPromise) return _gsapPromise;
    _gsapPromise = new Promise((resolve) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js";
      s.async = true;
      s.onload = () => resolve(window.gsap || null);
      s.onerror = () => resolve(null); // silent fallback
      document.head.appendChild(s);
    });
    return _gsapPromise;
  }

  // Pre-warm GSAP on idle (non-blocking).
  if (!RM && "requestIdleCallback" in window) {
    requestIdleCallback(loadGsap, { timeout: 1500 });
  } else if (!RM) {
    setTimeout(loadGsap, 600);
  }

  // ============================================================
  // 1. TAB SWITCH — crossfade + slight slide
  // ============================================================
  function fadeSwap(prev, next) {
    if (!next) return;
    if (RM || !window.gsap) {
      // No-op: original display toggle already happened upstream.
      return;
    }
    if (prev && prev !== next) {
      window.gsap.fromTo(
        prev,
        { opacity: 1, y: 0 },
        { opacity: 0, y: -6, duration: 0.18, ease: "power2.in" }
      );
    }
    window.gsap.fromTo(
      next,
      { opacity: 0, y: 8 },
      { opacity: 1, y: 0, duration: 0.28, ease: "power2.out", clearProps: "transform" }
    );
  }

  /**
   * Wrap an existing global tab-switch function so we get crossfade
   * without changing the function's contract.
   * @param {string} fnName  global function name (e.g. "switchAdminTab")
   * @param {() => Element} getActiveBefore  reads the currently-visible pane
   * @param {(ret: any) => Element} getActiveAfter  reads the new active pane
   */
  function wrapSwitcher(fnName, getActiveBefore, getActiveAfter) {
    const orig = window[fnName];
    if (typeof orig !== "function" || orig.__animWrapped) return;
    window[fnName] = function () {
      const prev = getActiveBefore();
      const result = orig.apply(this, arguments);
      // Wait for GSAP if not ready yet, but never block the call.
      Promise.resolve(loadGsap()).then(() => {
        const next = getActiveAfter(result, arguments);
        fadeSwap(prev, next);
      });
      return result;
    };
    window[fnName].__animWrapped = true;
  }

  // Admin (admin.html): .admin-tab-content panes, switchAdminTab(name)
  function setupAdminTabs() {
    if (!document.querySelector(".admin-tab-content")) return;
    wrapSwitcher(
      "switchAdminTab",
      () => document.querySelector('.admin-tab-content:not([style*="display: none"]):not([style*="display:none"])'),
      (_ret, args) => document.getElementById("tab-" + (args && args[0]))
    );
  }

  // Tournaments (tournaments.html): renders into #tournaments-grid, no panes;
  // switchTab(tab) just rerenders the grid. Animate the grid wrapper.
  function setupTournamentsTabs() {
    if (typeof window.switchTab !== "function") return;
    if (!document.getElementById("tournaments-grid")) return;
    const orig = window.switchTab;
    if (orig.__animWrapped) return;
    window.switchTab = function () {
      const grid = document.getElementById("tournaments-grid");
      const result = orig.apply(this, arguments);
      Promise.resolve(loadGsap()).then((gsap) => {
        if (!gsap || RM || !grid) return;
        gsap.fromTo(
          grid,
          { opacity: 0, y: 8 },
          { opacity: 1, y: 0, duration: 0.32, ease: "power2.out", clearProps: "transform" }
        );
        // Also stagger newly-rendered children
        const children = grid.children;
        for (let i = 0; i < children.length; i++) {
          children[i].style.setProperty("--idx", i);
        }
      });
      return result;
    };
    window.switchTab.__animWrapped = true;
  }

  // ============================================================
  // 2. CARD STAGGER — set --idx on freshly-rendered match cards
  // ============================================================
  function staggerObserver() {
    const grids = document.querySelectorAll(".match-grid, .tournaments-grid");
    if (!grids.length) return;
    const apply = (grid) => {
      const kids = grid.children;
      for (let i = 0; i < kids.length; i++) {
        if (!kids[i].hasAttribute("data-idx-set")) {
          kids[i].style.setProperty("--idx", i);
          kids[i].setAttribute("data-idx-set", "1");
        }
      }
    };
    grids.forEach((grid) => {
      apply(grid);
      const mo = new MutationObserver(() => apply(grid));
      mo.observe(grid, { childList: true });
    });
  }

  // ============================================================
  // 3. CLICK RIPPLE — for common buttons
  // ============================================================
  function setupRipple() {
    if (RM) return;
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("button, .btn, .adm-btn-sm, .tab, .admin-tab, .header-link");
      if (!btn || btn.disabled) return;
      // Skip ripple if button explicitly opts out
      if (btn.hasAttribute("data-no-ripple")) return;
      const rect = btn.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const ripple = document.createElement("span");
      ripple.className = "anim-ripple";
      ripple.style.width = ripple.style.height = size + "px";
      ripple.style.left = e.clientX - rect.left - size / 2 + "px";
      ripple.style.top = e.clientY - rect.top - size / 2 + "px";
      btn.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    }, { passive: true });
  }

  // ============================================================
  // 4. PAGE NAV — fade out before navigating to another *.html
  // ============================================================
  function setupPageNav() {
    if (RM) return;
    document.addEventListener("click", (e) => {
      const a = e.target.closest("a");
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      if (a.target === "_blank" || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      // Same origin & ends with .html (or no extension to keep simple)
      try {
        const url = new URL(a.href, location.href);
        if (url.origin !== location.origin) return;
        if (!/\.html?$/.test(url.pathname) && url.pathname !== "/") return;
      } catch (_) { return; }
      // If browser supports View Transitions, the browser handles it for us.
      if (document.startViewTransition) return;
      // Else: manual fade out.
      e.preventDefault();
      document.body.classList.add("is-leaving");
      setTimeout(() => { window.location.assign(a.href); }, 220);
    }, true);
  }

  // ============================================================
  // 5. COLLAPSIBLE PANELS — [data-collapsible-trigger] + [data-collapsible]
  // ------------------------------------------------------------
  // Markup:
  //   <button data-collapsible-trigger="filters" aria-expanded="true">
  //     Bộ lọc <span class="anim-chevron"></span>
  //   </button>
  //   <div id="filters" data-collapsible> ... </div>
  // ============================================================
  function setupCollapsibles() {
    document.querySelectorAll("[data-collapsible-trigger]").forEach((trig) => {
      if (trig.__animBound) return;
      const targetId = trig.getAttribute("data-collapsible-trigger");
      const panel = document.getElementById(targetId);
      if (!panel) return;
      // Initial state: read aria-expanded (default true)
      const isOpen = trig.getAttribute("aria-expanded") !== "false";
      panel.setAttribute("aria-hidden", isOpen ? "false" : "true");
      panel.style.maxHeight = isOpen ? panel.scrollHeight + "px" : "0";

      trig.addEventListener("click", async () => {
        const open = trig.getAttribute("aria-expanded") !== "false";
        const next = !open;
        trig.setAttribute("aria-expanded", String(next));
        panel.setAttribute("aria-hidden", next ? "false" : "true");
        const gsap = await loadGsap();
        if (gsap && !RM) {
          if (next) {
            gsap.fromTo(panel,
              { maxHeight: 0,            opacity: 0.4 },
              { maxHeight: panel.scrollHeight, opacity: 1, duration: 0.34, ease: "power2.out",
                onComplete: () => panel.style.maxHeight = "none" });
          } else {
            // Snap to current height first so transition has a starting value.
            panel.style.maxHeight = panel.scrollHeight + "px";
            gsap.to(panel, { maxHeight: 0, opacity: 0.4, duration: 0.28, ease: "power2.in" });
          }
        } else {
          panel.style.maxHeight = next ? "none" : "0";
        }
      });
      trig.__animBound = true;
    });
  }

  // ============================================================
  // 6. MATCH CARD EXPAND — sharpen the existing toggle
  // ------------------------------------------------------------
  // The original handler in app.js toggles `.match-expanded`. We hook
  // *after* it to apply a quick GSAP scale flourish on the new state.
  // ============================================================
  function setupMatchCardEnhance() {
    if (RM) return;
    document.addEventListener("click", async (e) => {
      const card = e.target.closest(".match-card");
      if (!card) return;
      // Defer to next frame so the original handler has toggled the class
      requestAnimationFrame(async () => {
        const gsap = await loadGsap();
        if (!gsap) return;
        if (card.classList.contains("match-expanded")) {
          gsap.fromTo(card,
            { scale: 0.98 },
            { scale: 1.05, duration: 0.32, ease: "back.out(1.4)", clearProps: "scale" });
        }
      });
    }, true);
  }

  // ============================================================
  // BOOT
  // ============================================================
  function init() {
    setupAdminTabs();
    setupTournamentsTabs();
    staggerObserver();
    setupRipple();
    setupPageNav();
    setupCollapsibles();
    setupMatchCardEnhance();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
