// ==UserScript==
// @name         Scroll Buttons
// @namespace    https://github.com/schalkburger/website-enhancements
// @include      http://*
// @include      https://*
// @version      1.0.2
// @description  Add Scroll to Top/Bottom Buttons Globally
// @author       Schalk Burger <schalkb@gmail.com>
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  // Function to check if dark mode is enabled
  function isDarkMode() {
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  // Function to check if user is near the top of the page
  function isNearTop() {
    return window.scrollY < 400; // Adjust the value as needed
  }

  // Create scroll to top button
  var scrollToTopBtn = document.createElement("button");
  scrollToTopBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 8L18 14H6L12 8Z"></path></svg>';
  scrollToTopBtn.style.border = "none";
  scrollToTopBtn.style.padding = "0";
  scrollToTopBtn.style.margin = "0";
  scrollToTopBtn.style.width = "30px";
  scrollToTopBtn.style.height = "30px";
  scrollToTopBtn.style.display = "flex";
  scrollToTopBtn.style.justifyContent = "center";
  scrollToTopBtn.style.alignItems = "center";
  scrollToTopBtn.style.position = "fixed";
  scrollToTopBtn.style.bottom = "60px";
  scrollToTopBtn.style.right = "20px";
  scrollToTopBtn.style.zIndex = "9999";
  scrollToTopBtn.style.borderRadius = "4px";
  scrollToTopBtn.style.background = "rgb(255 255 255 / 25%)";
  scrollToTopBtn.style.cursor = "pointer";
  scrollToTopBtn.style.color = "rgb(255 255 255 / 75%)";
  scrollToTopBtn.style.opacity = "0.5";
  scrollToTopBtn.style.visibility = "hidden"; // Initially hidden
  scrollToTopBtn.onclick = function () {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };
  document.body.appendChild(scrollToTopBtn);

  // Create scroll to bottom button
  var scrollToBottomBtn = document.createElement("button");
  scrollToBottomBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 16L6 10H18L12 16Z"></path></svg>';
  scrollToBottomBtn.style.border = "none";
  scrollToBottomBtn.style.padding = "0";
  scrollToBottomBtn.style.margin = "0";
  scrollToBottomBtn.style.width = "30px";
  scrollToBottomBtn.style.height = "30px";
  scrollToBottomBtn.style.display = "flex";
  scrollToBottomBtn.style.justifyContent = "center";
  scrollToBottomBtn.style.alignItems = "center";
  scrollToBottomBtn.style.position = "fixed";
  scrollToBottomBtn.style.bottom = "20px";
  scrollToBottomBtn.style.right = "20px";
  scrollToBottomBtn.style.zIndex = "9999";
  scrollToBottomBtn.style.borderRadius = "4px";
  scrollToBottomBtn.style.background = "rgb(255 255 255 / 25%)";
  scrollToBottomBtn.style.cursor = "pointer";
  scrollToBottomBtn.style.color = "rgb(255 255 255 / 75%)";
  scrollToBottomBtn.style.opacity = "0.5";
  scrollToBottomBtn.style.visibility = "hidden"; // Initially hidden
  scrollToBottomBtn.onclick = function () {
    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: "smooth",
    });
  };
  document.body.appendChild(scrollToBottomBtn);

  // Apply different background color based on dark mode preference
  if (isDarkMode()) {
    scrollToTopBtn.style.background = "rgba(255, 255, 255, 0.25)";
    scrollToBottomBtn.style.background = "rgba(255, 255, 255, 0.25)";
  } else {
    scrollToTopBtn.style.background = "rgba(0, 0, 0, 0.25)";
    scrollToBottomBtn.style.background = "rgba(0, 0, 0, 0.25)";
  }

  // Function to toggle the visibility of the buttons
  function toggleButtonVisibility() {
    if (isNearTop()) {
      scrollToTopBtn.style.visibility = "hidden";
      scrollToBottomBtn.style.visibility = "hidden";
    } else {
      scrollToTopBtn.style.visibility = "visible";
      scrollToBottomBtn.style.visibility = "visible";
    }
  }

  // Add scroll event listener to track scroll position
  window.addEventListener("scroll", toggleButtonVisibility);

  // Initial check on page load
  toggleButtonVisibility();
})();
