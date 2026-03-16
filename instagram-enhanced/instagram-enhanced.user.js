// ==UserScript==
// @name         Instagram Enhanced
// @namespace    http://tampermonkey.net/
// @version      2.1.1
// @description  Volume persists across Reels, menu-adjustable, and RAM cleanup.
// @author       Schalk Burger <schalkb@gmail.com>
// @match        https://www.instagram.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function () {
  "use strict";

  const SETTINGS = {
    get volume() {
      return GM_getValue("ig_volume", 0.5);
    },
    preventAutoplay: true,
    autoNext: true,
    ramSaverEnabled: true,
    checkInterval: 1500,
    distanceThreshold: 1000,
  };

  function registerMenu() {
    GM_registerMenuCommand("🔊 Set Volume", () => {
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
  }

  /**
   * Forces the volume to the saved setting.
   * Uses a slight delay to ensure it overrides Instagram's internal React state.
   */
  function applyVideoSettings(video) {
    if (!video || video.dataset.cleaned === "true") return;

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

  function handleVideoEvents(video) {
    if (!video.dataset.enhancedProcessed) {
      video.dataset.enhancedProcessed = "true";

      // Apply volume immediately
      applyVideoSettings(video);

      // Re-apply whenever the video starts playing
      video.addEventListener("play", () => applyVideoSettings(video));

      // CRITICAL: Re-apply if Instagram tries to change the volume/mute automatically
      video.addEventListener("volumechange", () => {
        const target = SETTINGS.volume;
        // Only force if it differs significantly to avoid infinite loops
        if (Math.abs(video.volume - target) > 0.01 || (target > 0 && video.muted)) {
          applyVideoSettings(video);
        }
      });

      if (SETTINGS.autoNext) {
        video.addEventListener("ended", () => {
          const buttonDown = document.querySelector("#scrollWrapper .button-down");
          if (buttonDown) buttonDown.click();
        });
      }

      if (SETTINGS.preventAutoplay && !video.paused) {
        video.pause();
      }
      video.dataset.autoplayPrevented = "true";
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
    const originalPlay = HTMLVideoElement.prototype.play;
    HTMLVideoElement.prototype.play = function () {
      const isUser = ["click", "touchstart", "mousedown"].includes(document.body.dataset.lastEvent);
      if (SETTINGS.preventAutoplay && this.dataset.autoplayPrevented && !isUser) {
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
