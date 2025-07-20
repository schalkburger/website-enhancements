// ==UserScript==
// @name         Instagram Reels Auto Next with Volume and Styles
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Automatically clicks the next reel button, sets video volume to 50%, and applies custom styles to scrollWrapper
// @author       You
// @match        https://www.instagram.com/reels/*
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  // Inject custom CSS styles
  function injectStyles() {
    const style = document.createElement("style");
    style.type = "text/css";
    style.innerHTML = `
            #scrollWrapper {
                bottom: 100px;
                right: 50px;
            }
        `;
    document.head.appendChild(style);
    console.log("Custom styles injected for #scrollWrapper");
  }

  // Function to find and click the button-down element
  function clickNextReelButton() {
    const buttonDown = document.querySelector("#scrollWrapper .button-down");
    if (buttonDown) {
      buttonDown.click();
      console.log("Clicked button-down");
    } else {
      console.warn("button-down element not found");
    }
  }

  // Function to set video volume to 50%
  function setVideoVolume(video) {
    video.volume = 0.5; // Set volume to 50% (range is 0.0 to 1.0)
    console.log("Set video volume to 50%");
  }

  // Function to handle video events
  function handleVideoEvents(video) {
    // Mark video to avoid duplicate listeners
    if (!video.dataset.autoNextListener) {
      video.dataset.autoNextListener = "true";
      // Handle reel end
      video.addEventListener("ended", () => {
        console.log("Reel ended, attempting to click next");
        clickNextReelButton();
      });
      // Handle video play start
      video.addEventListener("play", () => {
        setVideoVolume(video);
      });
    }
  }

  // Observe DOM changes to detect video elements
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length) {
        const videos = document.querySelectorAll("video");
        videos.forEach((video) => {
          handleVideoEvents(video);
        });
      }
    });
  });

  // Start observing the document for video elements
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Initial check for existing video elements
  document.querySelectorAll("video").forEach((video) => {
    handleVideoEvents(video);
  });

  // Inject styles when the script loads
  injectStyles();
})();
