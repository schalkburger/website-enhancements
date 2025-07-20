// ==UserScript==
// @name         CSNades No Autoplay
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Prevents videos from auto-playing on csnades.gg
// @author         Schalk Burger
// @match        https://csnades.gg/*
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  // Function to disable autoplay and pause videos
  function disableVideoAutoplay() {
    // Select all video elements
    const videos = document.querySelectorAll("video[autoplay]");

    videos.forEach((video) => {
      // Remove autoplay attribute
      video.removeAttribute("autoplay");
      // Pause video if it's playing
      if (!video.paused) {
        video.pause();
      }
    });
  }

  // Run on page load
  window.addEventListener("load", disableVideoAutoplay);

  // Handle dynamic content by observing DOM changes
  const observer = new MutationObserver((mutations) => {
    mutations.forEach(() => {
      disableVideoAutoplay();
    });
  });

  // Observe the document body for added nodes
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
})();
