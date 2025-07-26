// ==UserScript==
// @name         Instagram Enhanced
// @namespace    http://tampermonkey.net/
// @version      1.6
// @description  Automatically clicks the next reel button, sets video volume to 50%, applies custom styles to scrollWrapper, and prevents videos from auto-playing
// @author       You
// @match        https://www.instagram.com/*
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

  // // Function to set video volume to 50%
  // function setVideoVolume(video) {
  //   video.volume = 0.5; // Set volume to 50% (range is 0.0 to 1.0)
  //   console.log("Set video volume to 50%");
  // }

  // Function to prevent video autoplay
  function preventVideoAutoplay(video) {
    // Ensure video is paused
    if (!video.paused) {
      video.pause();
      console.log("Paused video to prevent autoplay");
    }
    // Mark video as processed to avoid redundant pausing
    video.dataset.autoplayPrevented = "true";
  }

  // Override video play method to prevent programmatic autoplay
  function overridePlayMethod() {
    const originalPlay = HTMLVideoElement.prototype.play;
    HTMLVideoElement.prototype.play = function () {
      // Only allow play if triggered by user interaction
      if (this.dataset.autoplayPrevented && !isUserInteraction()) {
        console.log("Blocked programmatic play attempt");
        return Promise.resolve(); // Return resolved promise to avoid breaking code expecting a promise
      }
      return originalPlay.apply(this);
    };

    // Helper function to detect user interaction
    function isUserInteraction() {
      const userEvents = ["click", "touchstart", "mousedown"];
      // Check if the last event was a user interaction
      return userEvents.some((eventType) => {
        const lastEvent = document.querySelector("body").dataset.lastEvent;
        return lastEvent === eventType;
      });
    }

    // Track user interaction events
    ["click", "touchstart", "mousedown"].forEach((eventType) => {
      document.addEventListener(
        eventType,
        () => {
          document.querySelector("body").dataset.lastEvent = eventType;
        },
        { capture: true }
      );
    });
  }

  // Function to handle video events
  function handleVideoEvents(video) {
    // Mark video to avoid duplicate processing
    if (!video.dataset.autoNextListener) {
      video.dataset.autoNextListener = "true";
      // Prevent autoplay
      preventVideoAutoplay(video);
      // Handle reel end
      video.addEventListener("ended", () => {
        console.log("Reel ended, attempting to click next");
        clickNextReelButton();
      });
      // Handle video play start
      // video.addEventListener("play", () => {
      //   setVideoVolume(video);
      // });
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

  // Inject styles and override play method when the script loads
  injectStyles();
  overridePlayMethod();
})();
