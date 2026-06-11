// ==UserScript==
// @name                Instahancer
// @namespace           https://github.com/schalkburger/instahancer
// @version             1.10.4
// @description         Instagram Reels Enhancements: HTML5 controller, volume control, RAM saver, and more. Designed for a smoother, more customizable viewing experience. Open-source on GitHub!
// @author              Schalk Burger <schalkb@gmail.com>
// @match               https://*.instagram.com/*
// @exclude             https://*.instagram.com/stories/*/*/
// @grant               GM_info
// @grant               GM_setValue
// @grant               GM_getValue
// @grant               GM_addStyle
// @grant               GM_deleteValue
// @grant               GM_registerMenuCommand
// @grant               GM_unregisterMenuCommand
// @grant               GM_addValueChangeListener
// @require             https://github.com/PRO-2684/GM_config/releases/download/v1.2.2/config.min.js
// @icon                https://www.google.com/s2/favicons?domain=www.instagram.com&sz=32
// @license             MIT
// @run-at              document-idle
// ==/UserScript==

(function () {
  "use strict";

  let version = GM_info.script.version;
  let name = GM_info.script.name;
  console.log(`[IH] ${name} ${version} initializing`);

  // ========== HARDCODED SETTINGS ==========
  const SETTINGS = {
    DISABLE_VIDEO_LOOPING: true,
    HTML5_VIDEO_CONTROL: true,
    MODIFY_VIDEO_VOLUME: true,
    SCROLL_BUTTON: true,
    PREVENT_AUTOPLAY: true,
  };

  const configDesc = {
    videoVolume: {
      name: "Default Video Volume",
      type: "float", // Allows decimal values for volume levels (0.0 to 1.0)
      value: 0.5, // Default to 50%
    },
    preventAutoplay: {
      name: "Prevent Video Autoplay",
      type: "bool", // Toggle switch
      value: true, // Enabled by default
    },
  };

  const config = new GM_config(configDesc); // Register menu

  // ========== STATE MANAGEMENT ==========
  const state = {
    videoVolume: GM_getValue("IG_VIDEO_VOLUME") ?? 0.5,
    currentPage: location.pathname,
    processedVideos: new WeakSet(),
  };

  // ========== UTILITIES ==========
  function logger(...args) {
    console.log("[IH]", ...args);
  }

  function saveVolume(volume) {
    state.videoVolume = volume;
    GM_setValue("IG_VIDEO_VOLUME", volume);
  }

  function getVolume() {
    return state.videoVolume;
  }

  function debounce(func, wait) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  // ========== INLINE STYLES ==========
  const styles = `
    [aria-label="Video player"] {
      display: none;
    }

    .ig-scroll-button {
      position: fixed;
      right: 20px;
      width: 50px;
      height: 50px;
      background: rgba(0, 0, 0, 0.6);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 1000;
      transition: background 0.3s ease;
      border: none;
      color: white;
      font-size: 24px;
      font-weight: bold;
      display: none;
    }

    .ig-scroll-button:hover {
      background: rgba(0, 0, 0, 0.8);
    }

    .ig-scroll-up {
      top: 20px;
    }

    .ig-scroll-down {
      bottom: 20px;
    }

    .ig-volume-slider {
      position: fixed;
      bottom: 80px;
      right: 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      background: rgba(0, 0, 0, 0.7);
      padding: 10px;
      border-radius: 8px;
      z-index: 999;
      width: 50px;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s ease;
    }

    .ig-volume-slider.show {
      opacity: 1;
      pointer-events: auto;
    }

    .ig-volume-slider input {
      width: 30px;
      height: 100px;
      writing-mode: vertical-lr;
      direction: rtl;
      cursor: pointer;
    }

    .ig-volume-label {
      color: white;
      font-size: 12px;
      text-align: center;
    }
  `;

  GM_addStyle(styles);
  logger("Styles loaded");

  // ========== VIDEO VOLUME & PLAYBACK CONTROL ==========
  function setupVideoEventListeners(video) {
    if (state.processedVideos.has(video)) return;
    state.processedVideos.add(video);

    // Prevent Auto-play of the current reel
    if (config.get("preventAutoplay")) {
      video.removeAttribute("autoplay");

      const handleAutoPlayBlock = (e) => {
        // Only block if we haven't already blocked this specific video
        if (!video.dataset.autoplayPrevented) {
          e.preventDefault();
          e.stopImmediatePropagation();

          video.pause();
          video.dataset.autoplayPrevented = "true";

          logger("Initial auto-play prevented. Listeners removed.");

          // CRITICAL: Remove the listeners immediately after the first block.
          // This allows subsequent manual clicks to work perfectly.
          video.removeEventListener("play", handleAutoPlayBlock, true);
          video.removeEventListener("playing", handleAutoPlayBlock, true);
        }
      };

      // Use the capture phase (true) to beat Instagram's own scripts
      video.addEventListener("play", handleAutoPlayBlock, true);
      video.addEventListener("playing", handleAutoPlayBlock, true);
    }

    // Enable HTML5 video controls
    if (SETTINGS.HTML5_VIDEO_CONTROL) {
      video.controls = true;
      video.controlsList.add("nodownload");
      logger("HTML5 video controls enabled");
    }

    // Disable video looping
    if (SETTINGS.DISABLE_VIDEO_LOOPING) {
      video.addEventListener("ended", (e) => {
        if (!video.dataset.loopDisabled) {
          video.dataset.loopDisabled = "true";
          video.pause();
          logger("Video loop disabled");
        }
      });
    }

    // Set initial volume and overrides
    if (SETTINGS.MODIFY_VIDEO_VOLUME) {
      const enforceVolumeAndMute = () => {
        video.volume = config.get("videoVolume");
        video.muted = false;
      };

      enforceVolumeAndMute();

      video.addEventListener("play", enforceVolumeAndMute);
      video.addEventListener("playing", enforceVolumeAndMute);

      video.addEventListener("volumechange", () => {
        if (!video.dataset.volumeSet && !video.muted) {
          video.dataset.volumeSet = "true";
          saveVolume(video.volume);

          setTimeout(() => {
            video.dataset.volumeSet = "";
          }, 100);
        }
      });
    }
  }

  // ========== VIDEO OBSERVER ==========
  function observeVideos() {
    const videos = document.querySelectorAll("video");
    videos.forEach(setupVideoEventListeners);
  }

  const debouncedObserveVideos = debounce(observeVideos, 150);

  const videoObserver = new MutationObserver(() => {
    debouncedObserveVideos();
  });

  videoObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });

  observeVideos();

  // ========== REELS RAM SAVER ==========
  function cleanupOffscreenReels() {
    if (!location.pathname.startsWith("/reels/")) return;

    const videos = document.querySelectorAll("video");
    const DISTANCE_THRESHOLD = 1000;

    videos.forEach((video) => {
      const rect = video.getBoundingClientRect();

      if (rect.bottom < -DISTANCE_THRESHOLD) {
        if (video.src || video.querySelector("source")) {
          video.pause();
          video.removeAttribute("src");
          video.querySelectorAll("source").forEach((source) => source.remove());
          video.load();
          logger("Cleaned up off-screen Reel from memory");
        }
      }
    });
  }

  let reelsCleanupInterval = null;

  const checkReelsCleanup = debounce(() => {
    if (location.pathname.startsWith("/reels/") && !reelsCleanupInterval) {
      reelsCleanupInterval = setInterval(cleanupOffscreenReels, 2000);
      logger("Started Reels RAM cleanup");
    } else if (!location.pathname.startsWith("/reels/") && reelsCleanupInterval) {
      clearInterval(reelsCleanupInterval);
      reelsCleanupInterval = null;
      logger("Stopped Reels RAM cleanup");
    }
  }, 200);

  const reelsCleanupObserver = new MutationObserver(() => {
    checkReelsCleanup();
  });

  reelsCleanupObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });

  if (location.pathname.startsWith("/reels/")) {
    reelsCleanupInterval = setInterval(cleanupOffscreenReels, 2000);
  }

  // ========== REEL CLICK HANDLER ==========
  function setupReelClickInterception() {
    document.removeEventListener("click", handleReelClick, true);
    document.addEventListener(
      "click",
      handleReelClick,
      true
    );
  }

  function handleReelClick(e) {
    const link = e.target.closest("a");
    if (!link) return;

    // Check if link is a reel (Instagram reel links typically contain /reels/)
    const href = link.getAttribute("href") || "";
    if (!href.includes("/reels/")) return;

    // Don't intercept if clicking certain interactive elements
    // if (
    //   e.target.closest("button") ||
    //   e.target.closest("[role='button']") ||
    //   e.target.closest(".x1iyjqo2") ||
    //   e.target.closest("[aria-label*='Comment']") ||
    //   e.target.closest("[aria-label*='Like']") ||
    //   e.target.closest("[aria-label*='Share']")
    // ) {
    //   return;
    // }

    // Prevent default link behavior for all reel clicks
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    // Find video in this reel container
    const reelContainer = link.closest("article") || link.closest("div[role='presentation']") || link;
    const video = reelContainer.querySelector("video");

    if (video) {
      // Toggle play/pause
      if (video.paused) {
        video.play();
      } else {
        video.pause();
      }

      logger("Reel click intercepted: play/pause toggled");
    } else {
      logger("Reel clicked but no video found");
    }
  }

  function checkPageAndSetupReels() {
    state.currentPage = location.pathname;
    setupReelClickInterception();
    logger("Reel click interception enabled");
  }

  window.addEventListener("popstate", checkPageAndSetupReels);

  const debouncedCheckPage = debounce(checkPageAndSetupReels, 150);
  const navigationObserver = new MutationObserver(() => {
    if (location.pathname !== state.currentPage) {
      debouncedCheckPage();
    }
  });

  navigationObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });

  if (SETTINGS.SCROLL_BUTTON) {
    checkPageAndSetupReels();
  }

  logger("Script initialization complete");
})();
