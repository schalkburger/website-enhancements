// ==UserScript==
// @name         Instagram Enhanced
// @namespace    https://github.com/schalkburger/website-enhancements
// @version      2.5.2
// @description  Volume persists across Reels, menu-adjustable, and RAM cleanup. Includes toggleable options for fixed volume, auto-next, prevent autoplay, native controls, and context menu UI hiding.
// @author       Schalk Burger <schalkb@gmail.com>
// @match        https://www.instagram.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function () {
  "use strict";

  let version = GM_info.script.version;
  console.log(`Instagram Enhanced ${version}`);

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
          // Apply immediately to all videos on screen
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
      // Apply immediately to all videos on screen
      document.querySelectorAll("video").forEach(applyVideoControls);
    });

    GM_registerMenuCommand("👁️ Toggle Hide UI With Controls", () => {
      const newState = !SETTINGS.hideUIWithControls;
      GM_setValue("ig_hideUIWithControls", newState);
      alert(`Hide UI with controls ${newState ? "enabled" : "disabled"}`);
    });
  }

  /**
   * Forces the volume to the saved setting.
   * Uses a slight delay to ensure it overrides Instagram's internal React state.
   */
  function applyVideoSettings(video) {
    if (!video || video.dataset.cleaned === "true" || !SETTINGS.fixedVolumeEnabled) return;

    const targetVol = SETTINGS.volume;

    // Apply multiple times with slight delays to win the "race" against IG scripts
    const forceVolume = () => {
      if (video.volume !== targetVol) {
        video.volume = targetVol;
      }
      if (targetVol > 0 && video.muted) {
        video.muted = false;
      }
    };

    forceVolume();
    setTimeout(forceVolume, 100);
    setTimeout(forceVolume, 500); // Final check after half a second
  }

  /**
   * Advances to the next Reel by scrolling down
   */
  function autoAdvanceReel() {
    // Method 1: Dispatch arrow down key on document body (most reliable)
    const event = new KeyboardEvent("keydown", {
      key: "ArrowDown",
      code: "ArrowDown",
      keyCode: 40,
      which: 40,
      bubbles: true,
      cancelable: true,
    });
    document.body.dispatchEvent(event);

    // Method 2: Also try scrolling down as a fallback
    setTimeout(() => {
      window.scrollBy({ top: window.innerHeight, behavior: "smooth" });
    }, 100);
  }

  /**
   * Applies native HTML5 player controls to videos.
   */
  function applyVideoControls(video) {
    if (!video) return;
    if (SETTINGS.showNativeControls) {
      video.setAttribute("controls", "true");
    } else {
      video.removeAttribute("controls");
    }
  }

  /**
   * Finds the Instagram UI elements related to the video
   */
  function findVideoUIElements(video) {
    // Find the parent div with no class or style attributes
    let videoParent = video.parentElement;
    while (videoParent && (videoParent.className || videoParent.hasAttribute("style"))) {
      videoParent = videoParent.parentElement;
    }

    if (!videoParent) return null;

    // Find the bottom bar (next sibling)
    const bottomBar = videoParent.nextElementSibling;

    // Find the read more button (div with class and role="button")
    const readMoreButton = videoParent.querySelector('div[class][role="button"]');

    return { videoParent, bottomBar, readMoreButton };
  }

  /**
   * Sets up context menu handling for HTML5 controls
   */
  function setupVideoContextMenu(video) {
    if (video.dataset.contextMenuSetup === "true" || !SETTINGS.hideUIWithControls) return;

    const uiElements = findVideoUIElements(video);
    if (!uiElements) return;

    const { videoParent, bottomBar, readMoreButton } = uiElements;

    // Show controls handler (hide Instagram UI)
    const showControlsHandler = (e) => {
      e.preventDefault();
      video.style.zIndex = "2";
      video.setAttribute("controls", "true");
      if (bottomBar) bottomBar.style.display = "none";
      if (readMoreButton) readMoreButton.style.display = "none";
    };

    // Hide controls handler (show Instagram UI)
    const hideControlsHandler = (e) => {
      e.preventDefault();
      video.style.zIndex = "-1";
      video.removeAttribute("controls");
      if (bottomBar) bottomBar.style.display = "";
      if (readMoreButton) readMoreButton.style.display = "";
    };

    // Attach context menu listeners
    const nextDiv = video.parentElement.querySelector("video + div");
    if (nextDiv) nextDiv.addEventListener("contextmenu", showControlsHandler);
    if (readMoreButton) readMoreButton.addEventListener("contextmenu", showControlsHandler);
    if (bottomBar) bottomBar.addEventListener("contextmenu", showControlsHandler);

    video.addEventListener("contextmenu", hideControlsHandler);

    // Sync mute state with Instagram's mute button
    video.addEventListener("volumechange", () => {
      if (!videoParent) return;

      // Find Instagram's mute button (looks for specific SVG paths)
      const muteButton =
        videoParent.parentElement?.querySelector('[role="button"][aria-label*="Mute"]') || videoParent.parentElement?.querySelector('svg path[d*="M1.5 13.3"]')?.closest('[role="button"]');

      if (muteButton) {
        const isMuted = video.muted;
        const buttonHasUnmuteIcon = muteButton.querySelector('svg path[d*="M16.636"]');
        const buttonIsMuted = !buttonHasUnmuteIcon;

        if (isMuted !== buttonIsMuted) {
          video.volume = SETTINGS.volume;
          muteButton.click();
        }
      }

      // Update stored volume
      if (video.dataset.volumeCompleted === "true") {
        GM_setValue("ig_volume", video.volume);
      }

      if (video.volume === SETTINGS.volume) {
        video.dataset.volumeCompleted = "true";
      }
    });

    // Set initial z-index and visibility - start with controls hidden and UI shown
    video.style.position = "absolute";
    video.style.zIndex = "-1";
    // Hide the UI initially to show native controls
    if (bottomBar) bottomBar.style.display = "none";
    if (readMoreButton) readMoreButton.style.display = "none";
    video.dataset.contextMenuSetup = "true";
  }

  function handleVideoEvents(video) {
    if (!video.dataset.enhancedProcessed) {
      video.dataset.enhancedProcessed = "true";

      // Apply volume immediately
      applyVideoSettings(video);

      // Apply native controls
      applyVideoControls(video);

      // Setup context menu for UI hiding
      if (SETTINGS.hideUIWithControls && SETTINGS.showNativeControls) {
        setupVideoContextMenu(video);
      }

      // Re-apply whenever the video starts playing
      video.addEventListener("play", () => applyVideoSettings(video));

      // CRITICAL: Re-apply if Instagram tries to change the volume/mute automatically
      video.addEventListener("volumechange", () => {
        const target = SETTINGS.volume;
        // Only force if it differs significantly to avoid infinite loops
        if (SETTINGS.fixedVolumeEnabled && (Math.abs(video.volume - target) > 0.01 || (target > 0 && video.muted))) {
          applyVideoSettings(video);
        }
      });

      // Prevent autoplay - keep paused unless user interacts
      if (SETTINGS.preventAutoplay) {
        video.dataset.autoplayPrevented = "true";
        video.pause();
        // Re-pause if Instagram tries to play it
        video.addEventListener("play", (e) => {
          const isUser = document.body.dataset.userInteracted === "true";
          if (!isUser) {
            e.preventDefault();
            video.pause();
          }
        });
      }

      if (SETTINGS.autoNext) {
        video.addEventListener("ended", () => {
          autoAdvanceReel();
        });
      }
    }
  }

  // --- RAM SAVER LOGIC ---
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

  // --- INTERACTION TRACKING & OVERRIDE ---
  function setupPlayOverride() {
    ["click", "touchstart", "mousedown", "keypress"].forEach((type) => {
      document.addEventListener(
        type,
        () => {
          document.body.dataset.userInteracted = "true";
        },
        { capture: true },
      );
    });
  }

  // --- INITIALIZATION ---
  function init() {
    const style = document.createElement("style");
    style.innerHTML = `#scrollWrapper { bottom: 100px !important; right: 50px !important; }`;
    document.head.appendChild(style);

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
