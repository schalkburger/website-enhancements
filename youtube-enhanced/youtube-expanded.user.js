// ==UserScript==
// @name         YouTube Auto Expanded
// @namespace    https://greasyfork.org/
// @version      1.0
// @description  Auto expands the YouTube video player.
// @author       ezzdev
// @license      MIT
// @match        *://www.youtube.com/*
// @icon         https://www.google.com/s2/favicons?domain=youtube.com
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  function autoExpand() {
    document.addEventListener("DOMContentLoaded", function () {
      document.body.classList.add("efyt-wide-player");
    });
  }

  const observer = new MutationObserver(autoExpand);
  observer.observe(document, { childList: true, subtree: true });
})();
