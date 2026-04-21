// ==UserScript==
// @name         Instagram Enhanced
// @namespace    https://github.com/schalkburger/website-enhancements
// @version      2.4.2
// @description  Volume persists across Reels, menu-adjustable, and RAM cleanup. Includes toggleable options for fixed volume, auto-next, prevent autoplay, native controls, and context menu UI hiding.
// @author       Schalk Burger <schalkb@gmail.com>
// @match        https://www.instagram.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_info
// ==/UserScript==

(function () {
  "use strict";

  let version = GM_info.script.version;
  console.log(`Instagram Enhanced ${version} - Active`);

  const SETTINGS = {
    get volume() {
      return GM_getValue("ig_volume", 0.5);
    },
    get fixedVolumeEnabled() {
      return GM_getValue("ig_fixedVolumeEnabled", true);
    },
    get preventAutoplay() {
      return GM_getValue("ig_preventAutoplay", true);
    },
    get autoNext() {
      return GM_getValue("ig_autoNext", true);
    },
    get showNativeControls() {
      return GM_getValue("ig_showNativeControls", true);
    },
    get hideUIWithControls() {
      return GM_getValue("ig_hideUIWithControls", true);
    },
    ramSaverEnabled: true,
    checkInterval: 1500,
    distanceThreshold: 1000,
  };

  function registerMenu() {
    GM_registerMenuCommand("🔊 Toggle Fixed Volume", () => {
      const newState = !SETTINGS.fixedVolumeEnabled;
      GM_setValue("ig_fixedVolumeEnabled", newState);
      alert(`Fixed volume ${newState ? "enabled" : "disabled"}`);
    });

    GM_registerMenuCommand("🔊 Set Volume", () => {
      if (!SETTINGS.fixedVolumeEnabled) {
        alert("Fixed volume is disabled. Enable it first via 'Toggle Fixed Volume'.");
        return;
      }
      const currentVol = Math.round(SETTINGS.volume * 100);
      const input = prompt("Enter volume level (0 to 100):", currentVol);
      if (input !== null) {
        const newVol = parseFloat(input);
        if (!isNaN(newVol) && newVol >= 0 && newVol <= 100) {
          GM_setValue("ig_volume", newVol / 100);
          document.querySelectorAll("video").forEach(applyVideoSettings);
        }
      }
    });

    GM_registerMenuCommand("⏭️ Toggle Auto-Next", () => {
      const newState = !SETTINGS.autoNext;
      GM_setValue("ig_autoNext", newState);
      alert(`Auto-next ${newState ? "enabled" : "disabled"}`);
    });

    GM_registerMenuCommand("⏸️ Toggle Prevent Autoplay", () => {
      const newState = !SETTINGS.preventAutoplay;
      GM_setValue("ig_preventAutoplay", newState);
      alert(`Prevent autoplay ${newState ? "enabled" : "disabled"}`);
    });

    GM_registerMenuCommand("🎮 Toggle Native Controls", () => {
      const newState = !SETTINGS.showNativeControls;
      GM_setValue("ig_showNativeControls", newState);
      alert(`Native controls ${newState ? "enabled" : "disabled"}`);
      document.querySelectorAll("video").forEach(applyVideoControls);
    });

    GM_registerMenuCommand("👁️ Toggle Hide UI With Controls", () => {
      const newState = !SETTINGS.hideUIWithControls;
      GM_setValue("ig_hideUIWithControls", newState);
      alert(`Hide UI with controls ${newState ? "enabled" : "disabled"}`);
    });
  }

  function applyVideoSettings(video) {
    if (!video || video.dataset.cleaned === "true" || !SETTINGS.fixedVolumeEnabled) return;
    const targetVol = SETTINGS.volume;
    const forceVolume = () => {
      if (video.volume !== targetVol) video.volume = targetVol;
      if (targetVol > 0 && video.muted) video.muted = false;
    };
    forceVolume();
    setTimeout(forceVolume, 100);
    setTimeout(forceVolume, 500);
  }

  /**
   * Specifically targets the "Next Reel" button based on its ARIA label
   */
  function autoAdvanceReel() {
    if (!SETTINGS.autoNext) return;

    // Target by ARIA label - the most stable selector
    const nextButton = document.querySelector('div[aria-label="Navigate to next Reel"]');

    if (nextButton) {
      nextButton.click();
    } else {
      // Fallback: Keyboard simulation
      const event = new KeyboardEvent("keydown", {
        key: "ArrowDown",
        code: "ArrowDown",
        keyCode: 40,
        which: 40,
        bubbles: true,
      });
      document.dispatchEvent(event);
    }
  }

  function applyVideoControls(video) {
    if (!video) return;
    if (SETTINGS.showNativeControls) {
      video.setAttribute("controls", "true");
    } else {
      video.removeAttribute("controls");
    }
  }

  function findVideoUIElements(video) {
    // Improved discovery using closest()
    const container = video.closest('div[style*="aspect-ratio"]')?.parentElement || video.parentElement;
    if (!container) return null;

    const bottomBar = container.querySelector('div[style*="order: 2"]') || container.nextElementSibling;
    const readMoreButton = container.querySelector('div[role="button"][class*="x1i10hfl"]');

    return { videoParent: container, bottomBar, readMoreButton };
  }

  function setupVideoContextMenu(video) {
    if (video.dataset.contextMenuSetup === "true" || !SETTINGS.hideUIWithControls) return;

    const uiElements = findVideoUIElements(video);
    if (!uiElements) return;

    const { videoParent, bottomBar, readMoreButton } = uiElements;

    const showControlsHandler = (e) => {
      e.preventDefault();
      video.style.zIndex = "2";
      video.setAttribute("controls", "true");
      if (bottomBar) bottomBar.style.opacity = "0";
      if (readMoreButton) readMoreButton.style.opacity = "0";
    };

    const hideControlsHandler = (e) => {
      e.preventDefault();
      video.style.zIndex = "-1";
      video.removeAttribute("controls");
      if (bottomBar) bottomBar.style.opacity = "1";
      if (readMoreButton) readMoreButton.style.opacity = "1";
    };

    const overlay = video.parentElement.querySelector("video + div");
    if (overlay) overlay.addEventListener("contextmenu", showControlsHandler);
    video.addEventListener("contextmenu", hideControlsHandler);

    video.style.position = "absolute";
    video.style.zIndex = "-1";
    video.dataset.contextMenuSetup = "true";
  }

  function handleVideoEvents(video) {
    if (!video.dataset.enhancedProcessed) {
      video.dataset.enhancedProcessed = "true";

      applyVideoSettings(video);
      applyVideoControls(video);

      if (SETTINGS.hideUIWithControls && SETTINGS.showNativeControls) {
        setupVideoContextMenu(video);
      }

      video.addEventListener("play", () => {
        applyVideoSettings(video);
        // Prevent autoplay check
        const isUserInitiated = ["click", "touchstart", "mousedown"].includes(document.body.dataset.lastEvent);
        if (SETTINGS.preventAutoplay && !isUserInitiated && !video.dataset.userPlayed) {
          video.pause();
        }
      });

      video.addEventListener("volumechange", () => {
        const target = SETTINGS.volume;
        if (SETTINGS.fixedVolumeEnabled && (Math.abs(video.volume - target) > 0.01 || (target > 0 && video.muted))) {
          applyVideoSettings(video);
        }
        if (video.dataset.volumeCompleted === "true") {
          GM_setValue("ig_volume", video.volume);
        }
        if (video.volume === SETTINGS.volume) {
          video.dataset.volumeCompleted = "true";
        }
      });

      // Mark video as user-interacted when clicked
      video.addEventListener("mousedown", () => {
        video.dataset.userPlayed = "true";
      });

      video.addEventListener("ended", () => {
        if (SETTINGS.autoNext) {
          autoAdvanceReel();
        }
      });

      // Initial pause if preventAutoplay is on
      if (SETTINGS.preventAutoplay) {
        setTimeout(() => {
          if (!video.dataset.userPlayed) video.pause();
        }, 50);
      }
    }
  }

  function cleanUpReels() {
    if (!SETTINGS.ramSaverEnabled || !window.location.href.includes("/reels/")) return;
    document.querySelectorAll("video").forEach((video) => {
      const rect = video.getBoundingClientRect();
      if (rect.bottom < -SETTINGS.distanceThreshold && (video.src || video.querySelector("source"))) {
        video.pause();
        video.removeAttribute("src");
        video.querySelectorAll("source").forEach((s) => s.remove());
        video.load();
        video.dataset.cleaned = "true";
      }
    });
  }

  function setupPlayOverride() {
    const originalPlay = HTMLVideoElement.prototype.play;
    HTMLVideoElement.prototype.play = function () {
      const isUser = ["click", "touchstart", "mousedown"].includes(document.body.dataset.lastEvent);
      if (SETTINGS.preventAutoplay && !isUser && !this.dataset.userPlayed) {
        return Promise.resolve();
      }
      return originalPlay.apply(this);
    };

    ["click", "touchstart", "mousedown"].forEach((type) => {
      document.addEventListener(
        type,
        () => {
          document.body.dataset.lastEvent = type;
        },
        { capture: true },
      );
    });
  }

  function init() {
    registerMenu();
    setupPlayOverride();

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((m) =>
        m.addedNodes.forEach((node) => {
          if (node.tagName === "VIDEO") handleVideoEvents(node);
          else if (node.querySelectorAll) node.querySelectorAll("video").forEach(handleVideoEvents);
        }),
      );
    });

    observer.observe(document.body, { childList: true, subtree: true });
    document.querySelectorAll("video").forEach(handleVideoEvents);
    setInterval(cleanUpReels, SETTINGS.checkInterval);
  }

  init();
})();
