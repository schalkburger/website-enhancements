// ==UserScript==
// @name         YouTube Enhanced
// @namespace    https://greasyfork.org/
// @version      1.0.3
// @description  YouTube Enhanced UserScript
// @author       Schalk Burger <schalkb@gmail.com>
// @license      MIT
// @match        *://www.youtube.com/*
// @icon         https://www.google.com/s2/favicons?domain=youtube.com
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  /**
   * Adds two buttons to the YouTube video control bar. The buttons, when clicked, skip the video 5 seconds backward or forward.
   * The buttons are added when the page is loaded and when the video control bar is updated.
   * The buttons are not added if the buttons with the same IDs already exist in the control bar.
   * The buttons are inserted at the beginning of the control bar.
   */
  function addSkipButtons() {
    const controlBar = document.querySelector(".ytp-volume-area");
    if (!controlBar || document.querySelector("#skip-backward, #skip-forward, #toggle-comments")) return;

    const createButton = (id, svg, title, onClick) => {
      const button = document.createElement("button");
      button.id = id;
      button.role = "button";
      button.className = "ytp-button";
      button.appendChild(svg);
      button.style.cssText = `
        display: flex;
        justify-content: center;
        align-items: center;
        width: 48px;
        height: 48px;
        margin: 0 auto;
      `;
      button.title = title;
      button.onclick = onClick;
      return button;
    };

    const backwardSVG = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    backwardSVG.setAttribute("viewBox", "0 0 24 24");
    backwardSVG.setAttribute("width", "16");
    backwardSVG.setAttribute("height", "16");
    backwardSVG.setAttribute("fill", "currentColor");
    backwardSVG.style.cssText = `width:36px; height: auto`;
    const backwardPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    backwardPath.setAttribute(
      "d",
      "M4.83582 12L11.0429 18.2071L12.4571 16.7929L7.66424 12L12.4571 7.20712L11.0429 5.79291L4.83582 12ZM10.4857 12L16.6928 18.2071L18.107 16.7929L13.3141 12L18.107 7.20712L16.6928 5.79291L10.4857 12Z"
    );
    backwardSVG.appendChild(backwardPath);

    const backwardButton = createButton("skip-backward", backwardSVG, "Skip backward 5 seconds", () => {
      const video = document.querySelector("video");
      if (video) video.currentTime = Math.max(0, video.currentTime - 5);
    });

    const forwardSVG = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    forwardSVG.setAttribute("viewBox", "0 0 24 24");
    forwardSVG.setAttribute("width", "16");
    forwardSVG.setAttribute("height", "16");
    forwardSVG.setAttribute("fill", "currentColor");
    forwardSVG.style.cssText = `width:36px; height: auto`;
    const forwardPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    forwardPath.setAttribute(
      "d",
      "M19.1642 12L12.9571 5.79291L11.5429 7.20712L16.3358 12L11.5429 16.7929L12.9571 18.2071L19.1642 12ZM13.5143 12L7.30722 5.79291L5.89301 7.20712L10.6859 12L5.89301 16.7929L7.30722 18.2071L13.5143 12Z"
    );
    forwardSVG.appendChild(forwardPath);

    const forwardButton = createButton("skip-forward", forwardSVG, "Skip forward 5 seconds", () => {
      const video = document.querySelector("video");
      if (video) video.currentTime = Math.min(video.duration, video.currentTime + 5);
    });

    const toggleCommentsSVG = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    toggleCommentsSVG.setAttribute("viewBox", "0 0 24 24");
    toggleCommentsSVG.setAttribute("width", "16");
    toggleCommentsSVG.setAttribute("height", "16");
    toggleCommentsSVG.setAttribute("fill", "currentColor");
    toggleCommentsSVG.style.cssText = `width:36px; height: auto`;
    const toggleCommentsPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    toggleCommentsPath.setAttribute("d", "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z");
    toggleCommentsSVG.appendChild(toggleCommentsPath);

    const toggleCommentsButton = createButton("toggle-comments", toggleCommentsSVG, "Toggle Comments", () => {
      const commentsElement = document.querySelector("#comments");
      if (commentsElement) {
        if (commentsElement.style.position === "fixed") {
          commentsElement.style.cssText = ""; // Reset styles
        } else {
          commentsElement.style.cssText = `position: fixed; top: 0; right: 0; max-width: 20vw; max-height: 100vh; height: 100%;overflow: auto; top: 55px;background: rgb(0 0 0 / 75%); padding: 0 0 0 20px;backdrop-filter: blur(15px);`;
        }
      }
    });

    controlBar.prepend(backwardButton, forwardButton, toggleCommentsButton);
  }

  const observer = new MutationObserver(addSkipButtons);
  observer.observe(document, { childList: true, subtree: true });
})();
