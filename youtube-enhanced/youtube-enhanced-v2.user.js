// ==UserScript==
// @name         YouTube Comments Overlay
// @namespace    http://tampermonkey.net/
// @version      0.9
// @description  Adds a button to show comments on top of the video player on the right side.
// @author       Your Name
// @match        https://www.youtube.com/watch*
// @grant        none
// ==/UserScript==

(function () {
  "use strict";
  let version = GM_info.script.version;
  let name = GM_info.script.name;
  console.log(`${name} ${version}`);

  // Function to create the button
  function createButton() {
    const button = document.createElement("button");
    button.innerText = "Show Comments";
    button.style.position = "fixed";
    button.style.top = "10px";
    button.style.right = "10px";
    button.style.zIndex = "10000";
    button.style.backgroundColor = "#f00";
    button.style.color = "#fff";
    button.style.border = "none";
    button.style.padding = "10px";
    button.style.cursor = "pointer";
    button.style.borderRadius = "5px";

    button.addEventListener("click", showComments);

    document.body.appendChild(button);
  }

  // Function to show comments on top of the video player
  function showComments() {
    const commentsElement = document.querySelector("#sections.ytd-comments:not([static-comments-header])");
    if (!commentsElement) return;

    // Wait for the comments to be fully loaded
    waitForComments(commentsElement).then(() => {
      const commentsClone = document.createElement("div");
      commentsClone.id = "comments-overlay";
      commentsClone.style.position = "fixed";
      commentsClone.style.top = "10px";
      commentsClone.style.right = "10px";
      commentsClone.style.width = "300px";
      commentsClone.style.height = "calc(100% - 20px)";
      commentsClone.style.overflowY = "auto";
      commentsClone.style.backgroundColor = "#fff";
      commentsClone.style.zIndex = "1000";
      commentsClone.style.borderRadius = "5px";
      commentsClone.style.boxShadow = "0 0 10px rgba(0, 0, 0, 0.5)";

      // Extract and append the contents of the comments section
      const contents = commentsElement.querySelector("#contents");
      if (contents) {
        const fragment = document.createDocumentFragment();
        Array.from(contents.children).forEach((child) => {
          fragment.appendChild(child.cloneNode(true));
        });
        commentsClone.appendChild(fragment);
      }

      document.body.appendChild(commentsClone);
    });
  }

  // Function to wait for the comments to be fully loaded
  function waitForComments(commentsElement) {
    return new Promise((resolve) => {
      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
            const contents = commentsElement.querySelector("#contents");
            if (contents && contents.children.length > 0) {
              observer.disconnect();
              resolve();
              return;
            }
          }
        }
      });

      observer.observe(commentsElement, { childList: true, subtree: true });
    });
  }

  // Create the button after the page has loaded
  window.addEventListener("load", createButton);
})();
