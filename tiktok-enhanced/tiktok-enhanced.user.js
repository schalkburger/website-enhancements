// ==UserScript==
// @name         TikTok Auto Pause Videos
// @namespace    https://github.com/schalkburger/website-enhancements
// @version      1.0.2
// @description  Automatically pauses TikTok videos when they come into view.
// @author       Schalk Burger <schalkb@gmail.com>
// @match        https://www.tiktok.com/*
// @grant        none
// ==/UserScript==

(function () {
  "use strict";
  console.log("TikTok Auto Pause Videos");
  // Function to pause the video
  function pauseVideo(video) {
    if (!video.paused) {
      video.pause();
      video.setAttribute("z-index", 1000);
      video.style.zIndex = 1000;
      video.setAttribute("controls", "");
    }
  }

  // Set up an IntersectionObserver to detect when videos come into view
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const video = entry.target;
          pauseVideo(video);
        }
      });
    },
    {
      threshold: 1, // Adjust this value to control when the video should be paused (0.5 means 50% of the video is in view)
    }
  );

  // Function to observe all video elements on the page
  function observeVideos() {
    const videos = document.querySelectorAll("video");
    videos.forEach((video) => {
      observer.observe(video);
    });
  }

  // Observe videos when the page loads
  observeVideos();

  // Observe videos dynamically as new content is loaded (e.g., when scrolling)
  const targetNode = document.body;
  const config = { childList: true, subtree: true };

  const callback = function (mutationsList, observer) {
    for (const mutation of mutationsList) {
      if (mutation.type === "childList") {
        observeVideos();
      }
    }
  };

  const mutationObserver = new MutationObserver(callback);
  mutationObserver.observe(targetNode, config);
})();
