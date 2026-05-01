// ==UserScript==
// @name                Instagram Enhanced
// @namespace           https://github.com/schalkburger/website-enhancements
// @version             3.0.1
// @description         Instagram video controls: looping, HTML5 controller, volume control, and Reels scroll buttons
// @author              Schalk Burger <schalkb@gmail.com>
// @match               https://*.instagram.com/*
// @grant               GM_info
// @grant               GM_setValue
// @grant               GM_getValue
// @grant               GM_addStyle
// @icon                https://www.google.com/s2/favicons?domain=www.instagram.com&sz=32
// @compatible          firefox >= 100
// @compatible          chrome >= 100
// @compatible          edge >= 100
// @license             GPL-3.0-only
// @run-at              document-idle
// ==/UserScript==

(function () {
  "use strict";

  let version = GM_info.script.version;
  let name = GM_info.script.name;
  console.log(`${name} ${version} - Active`);

  // ========== HARDCODED SETTINGS ==========
  const SETTINGS = {
    DISABLE_VIDEO_LOOPING: true,
    HTML5_VIDEO_CONTROL: true,
    MODIFY_VIDEO_VOLUME: true,
    SCROLL_BUTTON: true,
    PREVENT_AUTOPLAY: true, // New Setting added
  };

  // ========== STATE MANAGEMENT ==========
  const state = {
    videoVolume: GM_getValue("IG_VIDEO_VOLUME") ?? 0.5,
    currentPage: location.pathname,
    processedVideos: new WeakSet(),
  };

  // ========== UTILITIES ==========
  function logger(...args) {
    console.log("[IG Helper]", ...args);
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
  logger("Script loaded - Video controls enabled");

  // ========== VIDEO VOLUME & PLAYBACK CONTROL ==========
  function setupVideoEventListeners(video) {
    if (state.processedVideos.has(video)) return;
    state.processedVideos.add(video);

    // Prevent Auto-play of the current reel
    if (SETTINGS.PREVENT_AUTOPLAY) {
      video.removeAttribute("autoplay");

      const preventInitialPlay = () => {
        if (!video.dataset.autoplayPrevented) {
          video.pause();
          video.dataset.autoplayPrevented = "true";
          logger("Initial auto-play prevented");
        }
      };
      video.addEventListener("playing", preventInitialPlay);
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
        video.volume = getVolume();
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

  // ========== REELS SCROLL BUTTONS ==========
  function setupReelsScrollButtons() {
    if (!location.pathname.startsWith("/reels/")) return;

    if (document.querySelector(".ig-scroll-up")) return;

    logger("Setting up Reels scroll buttons");

    const upButton = document.createElement("button");
    upButton.className = "ig-scroll-button ig-scroll-up";
    upButton.textContent = "⬆";
    upButton.title = "Scroll up";

    const downButton = document.createElement("button");
    downButton.className = "ig-scroll-button ig-scroll-down";
    downButton.textContent = "⬇";
    downButton.title = "Scroll down";

    const volumeSlider = document.createElement("div");
    volumeSlider.className = "ig-volume-slider";

    const volumeInput = document.createElement("input");
    volumeInput.type = "range";
    volumeInput.min = "0";
    volumeInput.max = "1";
    volumeInput.step = "0.1";
    volumeInput.value = getVolume();
    volumeInput.title = "Volume";

    const volumeLabel = document.createElement("div");
    volumeLabel.className = "ig-volume-label";
    volumeLabel.textContent = Math.round(getVolume() * 100) + "%";

    volumeSlider.appendChild(volumeInput);
    volumeSlider.appendChild(volumeLabel);

    upButton.addEventListener("click", () => {
      window.scrollBy({ top: -window.innerHeight, behavior: "smooth" });
    });

    downButton.addEventListener("click", () => {
      window.scrollBy({ top: window.innerHeight, behavior: "smooth" });
    });

    volumeInput.addEventListener("mouseover", () => {
      volumeSlider.classList.add("show");
    });

    volumeInput.addEventListener("input", (e) => {
      const vol = parseFloat(e.target.value);
      saveVolume(vol);
      volumeLabel.textContent = Math.round(vol * 100) + "%";

      document.querySelectorAll("video").forEach((video) => {
        video.volume = vol;
        video.muted = false;
      });
    });

    volumeSlider.addEventListener("mouseleave", () => {
      volumeSlider.classList.remove("show");
    });

    document.body.appendChild(upButton);
    document.body.appendChild(downButton);
    document.body.appendChild(volumeSlider);
  }

  // ========== NAVIGATION LOGIC ==========
  function checkPageAndSetupReels() {
    if (location.pathname !== state.currentPage) {
      state.currentPage = location.pathname;

      // FIX: WeakSet does not have a .clear() method.
      // We reassign it to a new WeakSet to flush old video references.
      state.processedVideos = new WeakSet();

      if (SETTINGS.SCROLL_BUTTON) {
        const oldButtons = document.querySelectorAll(".ig-scroll-button, .ig-volume-slider");
        oldButtons.forEach((btn) => btn.remove());

        if (location.pathname.startsWith("/reels/")) {
          setupReelsScrollButtons();
        }
      }
    }
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
