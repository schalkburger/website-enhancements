// ==UserScript==
// @name         YouTube Skip 5 Seconds Forward/Backward Buttons
// @namespace    https://greasyfork.org/
// @version      1.4
// @description  Adds skip forward and backward 15 seconds buttons to the YouTube player
// @author       ezzdev
// @license      MIT
// @match        *://www.youtube.com/*
// @icon         https://www.google.com/s2/favicons?domain=youtube.com
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  function addSkipButtons() {
    if (document.querySelector("#skip-backward") && document.querySelector("#skip-forward")) return;

    const controlBar = document.querySelector(".ytp-volume-area");
    if (!controlBar) return;

    const backwardButton = document.createElement("button");
    backwardButton.id = "skip-backward";
    backwardButton.className = "ytp-button";
    backwardButton.appendChild(document.createTextNode("⏪"));
    backwardButton.style.fontSize = "23px";
    backwardButton.style.textAlign = "center";
    backwardButton.style.fontWeight = "bold";
    backwardButton.style.filter = "grayscale(100%) brightness(100%)";
    backwardButton.title = "Skip backward 5 seconds";
    backwardButton.style.marginTop = "1px";
    backwardButton.onclick = () => {
      const video = document.querySelector("video");
      if (video) video.currentTime = Math.max(0, video.currentTime - 5);
    };

    const forwardButton = document.createElement("button");
    forwardButton.id = "skip-forward";
    forwardButton.className = "ytp-button";
    forwardButton.appendChild(document.createTextNode("⏩"));
    forwardButton.style.fontSize = "23px";
    forwardButton.style.textAlign = "center";
    forwardButton.style.fontWeight = "bold";
    forwardButton.style.filter = "grayscale(100%) brightness(100%)";
    forwardButton.title = "Skip forward 5 seconds";
    forwardButton.style.marginTop = "1px";
    forwardButton.onclick = () => {
      const video = document.querySelector("video");
      if (video) video.currentTime = Math.min(video.duration, video.currentTime + 5);
    };

    controlBar.insertBefore(forwardButton, controlBar.firstChild);
    controlBar.insertBefore(backwardButton, controlBar.firstChild);
  }

  const observer = new MutationObserver(addSkipButtons);
  observer.observe(document, { childList: true, subtree: true });
})();
