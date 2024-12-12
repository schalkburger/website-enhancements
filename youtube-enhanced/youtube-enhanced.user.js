// ==UserScript==
// @name         YouTube Enhanced
// @namespace    https://greasyfork.org/
// @version      1.0.8
// @description  YouTube Enhanced UserScript
// @author       Schalk Burger <schalkb@gmail.com>
// @license      MIT
// @match        *://www.youtube.com/*
// @icon         https://www.google.com/s2/favicons?domain=youtube.com
// @grant        none
// ==/UserScript==

(function () {
  "use strict";
  let version = GM_info.script.version;
  let name = GM_info.script.name;
  console.log(`${name} ${version}`);

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
    toggleCommentsSVG.style.cssText = `width: 24px; height: auto`;
    const toggleCommentsPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    toggleCommentsPath.setAttribute(
      "d",
      "M16.8 19L14 22.5L11.2 19H6C5.44772 19 5 18.5523 5 18V7.10256C5 6.55028 5.44772 6.10256 6 6.10256H22C22.5523 6.10256 23 6.55028 23 7.10256V18C23 18.5523 22.5523 19 22 19H16.8ZM2 2H19V4H3V15H1V3C1 2.44772 1.44772 2 2 2Z"
    );
    toggleCommentsSVG.appendChild(toggleCommentsPath);

    const moveComments = () => {
      var comments = "#sections.ytd-comments:not([static-comments-header])";

      waitForKeyElements(comments, () => {
        comments = document.querySelector(comments);
        var container = document.getElementById("primary-inner");

        container.append(comments);

        const styles = {
          display: "block",
          padding: "5px",
          width: "100%",
          height: "90vh",
          overflowY: "scroll",
          marginBottom: "20px",
          position: "absolute",
          top: "56px",
          right: "0",
          zIndex: "2015",
          background: "rgb(0 0 0 / 75%)",
          backdropFilter: "blur(5px)",
          maxWidth: "24vw",
          padding: "15px 0 0 15px",
        };

        Object.assign(comments.style, styles);

        var header = "ytd-comments-header-renderer";

        waitForKeyElements(header, () => {
          document.querySelector(header).style.marginTop = "0px";
        });

        var loadCmt = "yt-next-continuation.ytd-item-section-renderer";

        comments.addEventListener("scroll", () => {
          if (comments.scrollHeight - comments.scrollTop === comments.clientHeight) {
            document.querySelector(loadCmt).click();
          }
        });
      });
    };

    const toggleCommentsButton = createButton("toggle-comments", toggleCommentsSVG, "Toggle Comments", () => {
      const commentsElement = document.querySelector("#sections:nth-of-type(1)");
      if (commentsElement) {
        if (commentsElement.style.position === "absolute") {
          commentsElement.style.cssText =
            "position: relative;display: block;padding: 5px;width: 100%;height: 100%;overflow-y: scroll;margin-bottom: 20px;top: 0px;right: 0px;z-index: 400;background: transparent;max-width: max-content;"; // Reset styles
        } else {
          commentsElement.style.cssText = `position: absolute;display: block;padding: 5px;width: 100%;height: 90vh;overflow-y: scroll;margin-bottom: 20px;top: 56px;right: 0px;z-index: 2015;background: rgba(0, 0, 0, 0.75);backdrop-filter: blur(5px);max-width: 24vw;padding: 15px 0 0 15px`;
          moveComments(); // Call the moveComments function when the button is clicked
        }
      }
      // Select all elements with the ID #content-text
      const commentsContentTextElements = document.querySelectorAll("#content-text");

      // Iterate over each element and apply the style
      commentsContentTextElements.forEach((element) => {
        element.style.cssText = "padding-bottom: 20px;";
      });

      // Select all elements with the ID #expander
      const commentsExpanderElements = document.querySelectorAll("#expander");

      // Iterate over each element and apply the style
      commentsExpanderElements.forEach((element) => {
        element.style.setProperty("--ytd-expander-button-margin", "10px 0 0 0");
      });
    });

    controlBar.prepend(backwardButton, forwardButton, toggleCommentsButton);

    function waitForKeyElements(selectorTxt, actionFunction, bWaitOnce = true, iframeSelector) {
      var targetNodes, btargetsFound;

      if (typeof iframeSelector == "undefined") {
        targetNodes = document.querySelectorAll(selectorTxt);
      } else {
        targetNodes = document.querySelector(iframeSelector).contentDocument.querySelectorAll(selectorTxt);
      }

      if (targetNodes && targetNodes.length > 0) {
        btargetsFound = true;
        targetNodes.forEach(function (node) {
          var alreadyFound = node.dataset.alreadyFound || false;

          if (!alreadyFound) {
            var cancelFound = actionFunction(node);
            if (cancelFound) {
              btargetsFound = false;
            } else {
              node.dataset.alreadyFound = true;
            }
          }
        });
      } else {
        btargetsFound = false;
      }

      var controlObj = waitForKeyElements.controlObj || {};
      var controlKey = selectorTxt.replace(/[^\w]/g, "_");
      var timeControl = controlObj[controlKey];

      if (btargetsFound && bWaitOnce && timeControl) {
        clearInterval(timeControl);
        delete controlObj[controlKey];
      } else {
        if (!timeControl) {
          timeControl = setInterval(function () {
            waitForKeyElements(selectorTxt, actionFunction, bWaitOnce, iframeSelector);
          }, 300);
          controlObj[controlKey] = timeControl;
        }
      }
      waitForKeyElements.controlObj = controlObj;
    }
  }

  const observer = new MutationObserver(addSkipButtons);
  observer.observe(document, { childList: true, subtree: true });
})();
