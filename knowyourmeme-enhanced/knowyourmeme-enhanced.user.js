// ==UserScript==
// @name         Know Your Meme Enhanced
// @namespace    https://github.com/schalkburger/website-enhancements
// @include      https://knowyourmeme.com/memes/*
// @match        https://knowyourmeme.com/memes/*
// @version      1.3.0
// @author       Schalk Burger <schalkb@gmail.com>
// @description  Know Your Meme Enhanced
// @license MIT
// ==/UserScript==

(function () {
  "use strict";
  // Init script
  let version = GM_info.script.version;
  console.log(`Know Your Meme Enhanced ${version}`);

  // Function to handle lazy loading images
  function lazyLoadImages() {
    // Get all the <img> elements with the class "img-nsfw"
    let imgElements = document.querySelectorAll("img.img-nsfw");

    // Loop through each <img> element and check if it's in the viewport
    imgElements.forEach(function (imgElement) {
      if (isElementInViewport(imgElement)) {
        imgElement.src = imgElement.getAttribute("data-original-image-url");
      }
    });
  }

  // Function to check if an element is in the viewport
  function isElementInViewport(el) {
    let rect = el.getBoundingClientRect();
    return rect.bottom >= 0 && rect.right >= 0 && rect.top <= (window.innerHeight || document.documentElement.clientHeight) && rect.left <= (window.innerWidth || document.documentElement.clientWidth);
  }

  // Initial lazy load
  lazyLoadImages();

  // Listen for the "scroll" event and lazy load images as the user scrolls
  window.addEventListener("scroll", lazyLoadImages);
})();
