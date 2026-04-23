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
// @grant        GM_info
// ==/UserScript==

(function () {
  "use strict";

  let version = GM_info.script.version;
  console.log(`Instagram Enhanced ${version} - Active`);

  const SETTINGS = {
    get volume() {
      return GM_getValue("ig_volume", 0.25);
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

  // Helper to prevent recursive volume saving
  let isInternalChange = false;

  function registerMenu() {
    GM_registerMenuCommand("🔊 Toggle Fixed Volume", () => {
      const newState = !SETTINGS.fixedVolumeEnabled;
      GM_setValue("ig_fixedVolumeEnabled", newState);
      alert(`Fixed volume ${newState ? "enabled (enforced)" : "disabled (persistent only)"}`);
    });

    GM_registerMenuCommand("🔊 Set Volume", () => {
      const currentVol = Math.round(SETTINGS.volume * 100);
      const input = prompt("Enter volume level (0 to 100):", currentVol);
      if (input !== null) {
        const newVol = parseFloat(input);
        if (!isNaN(newVol) && newVol >= 0 && newVol <= 100) {
          isInternalChange = true;
          GM_setValue("ig_volume", newVol / 100);
          document.querySelectorAll("video").forEach((v) => forceVideoVolume(v, true));
          isInternalChange = false;
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
  }

  function forceVideoVolume(video, userAction = false) {
    if (!video || video.dataset.cleaned === "true") return;

    const targetVol = SETTINGS.volume;

    if (SETTINGS.fixedVolumeEnabled || userAction || !video.dataset.initialVolumeApplied) {
      isInternalChange = true;
      if (video.volume !== targetVol) video.volume = targetVol;
      if (video.muted) video.muted = false;
      video.dataset.initialVolumeApplied = "true";
      isInternalChange = false;
    }
  }

  function autoAdvanceReel() {
    if (!SETTINGS.autoNext) return;
    const nextButton = document.querySelector('div[aria-label="Navigate to next Reel"]');
    if (nextButton) {
      nextButton.click();
    } else {
      const event = new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true });
      document.dispatchEvent(event);
    }
  }

  function findVideoUIElements(video) {
    const container = video.closest('div[style*="aspect-ratio"]')?.parentElement || video.parentElement;
    if (!container) return null;
    const bottomBar = container.querySelector('div[style*="order: 2"]') || container.nextElementSibling;
    return { videoParent: container, bottomBar };
  }

  function handleVideoEvents(video) {
    if (!video.dataset.enhancedProcessed) {
      video.dataset.enhancedProcessed = "true";

      // Apply settings immediately
      forceVideoVolume(video);

      video.addEventListener("loadedmetadata", () => forceVideoVolume(video));

      video.addEventListener("play", () => {
        forceVideoVolume(video);
        // Secondary check to beat React's deferred volume reset
        setTimeout(() => forceVideoVolume(video), 150);

        const isUser = ["click", "touchstart", "mousedown"].includes(document.body.dataset.lastEvent);
        if (SETTINGS.preventAutoplay && !isUser && !video.dataset.userPlayed) {
          video.pause();
        }
      });

      video.addEventListener("volumechange", () => {
        if (isInternalChange) return;

        // If the change was significant, assume user interaction via native controls or IG UI
        const currentVol = video.volume;
        const savedVol = SETTINGS.volume;

        if (SETTINGS.fixedVolumeEnabled) {
          // In Fixed mode, if it's not our volume, force it back
          if (Math.abs(currentVol - savedVol) > 0.01 || video.muted) {
            forceVideoVolume(video);
          }
        } else {
          // In Persistent mode, save the new volume as the future default
          if (currentVol > 0 && Math.abs(currentVol - savedVol) > 0.01) {
            GM_setValue("ig_volume", currentVol);
          }
        }
      });

      video.addEventListener("mousedown", () => {
        video.dataset.userPlayed = "true";
      });

      video.addEventListener("ended", () => {
        if (SETTINGS.autoNext) autoAdvanceReel();
      });
    }
  }

  function setupPlayOverride() {
    // 1. Play Override
    const originalPlay = HTMLVideoElement.prototype.play;
    HTMLVideoElement.prototype.play = function () {
      const isUser = ["click", "touchstart", "mousedown"].includes(document.body.dataset.lastEvent);
      if (SETTINGS.preventAutoplay && !isUser && !this.dataset.userPlayed) {
        return Promise.resolve();
      }
      return originalPlay.apply(this);
    };

    // 2. Volume Setter Override - The most robust way to stop Instagram's reset
    const descriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "volume");
    Object.defineProperty(HTMLMediaElement.prototype, "volume", {
      get() {
        return descriptor.get.call(this);
      },
      set(v) {
        if (SETTINGS.fixedVolumeEnabled && !isInternalChange) {
          // Block Instagram from setting anything other than our saved volume
          return descriptor.set.call(this, SETTINGS.volume);
        }
        return descriptor.set.call(this, v);
      },
    });

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

  function cleanUpReels() {
    if (!SETTINGS.ramSaverEnabled || !window.location.href.includes("/reels/")) return;
    document.querySelectorAll("video").forEach((video) => {
      const rect = video.getBoundingClientRect();
      if (rect.bottom < -SETTINGS.distanceThreshold) {
        video.pause();
        video.src = "";
        video.load();
        video.remove();
      }
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
