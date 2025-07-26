// ==UserScript==
// @name         Redgifs Enhanced
// @namespace    redgifs.com
// @match        *://*redgifs.com/*
// @match        https://www.redgifs.com/*
// @include      *redgifs.com/*
// @version      1.4
// @description  Auto-pause Redgifs & prevent click-through on embedded players
// @author       Schalk Burger <schalkb@gmail.com>
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  const waitTime = 1000;
  const maxAttempts = 6;
  let autoPaused = false;

  /* -------------------------------------------------
   * 1.  Prevent navigation on every .embeddedPlayer
   * ------------------------------------------------- */
  function protectPlayers() {
    document.querySelectorAll(".embeddedPlayer").forEach((player) => {
      // run only once per player
      if (player.dataset.rgFixed) return;
      player.dataset.rgFixed = "1";

      // capture all clicks inside this player
      player.addEventListener(
        "click",
        (evt) => {
          const link = evt.target.closest("a[href]");
          if (link) {
            // let the video receive the click first, then stop the link
            setTimeout(() => link.removeAttribute("href"), 0);
            link.addEventListener("click", (e) => e.preventDefault(), { once: true });
          }
        },
        true
      );
    });
  }

  /* run once on load and whenever new players appear (e.g. Reddit feed) */
  protectPlayers();
  new MutationObserver(protectPlayers).observe(document, { childList: true, subtree: true });

  /* -------------------------------------------------
   * 2.  Auto-pause on first load (unchanged)
   * ------------------------------------------------- */
  function findAndPauseVideo(attempt) {
    const video = document.querySelector("a.videoLink video[src]");
    if (video && !autoPaused) {
      video.pause();
      autoPaused = true;
    }
  }
  for (let i = 0; i < maxAttempts && !autoPaused; i++) {
    setTimeout(findAndPauseVideo.bind(null, i + 1), waitTime * i);
  }
})();
