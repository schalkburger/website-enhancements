// ==UserScript==
// @name         Know Your Meme Enhanced
// @namespace    https://github.com/schalkburger/website-enhancements
// @include      https://knowyourmeme.com/memes/*
// @match        https://knowyourmeme.com/memes/*
// @version      1.0.0
// @author       Schalk Burger <schalkb@gmail.com>
// @description  Know Your Meme Enhanced
// @license MIT
// ==/UserScript==

(function () {
  "use strict";
  // Init script
  let version = GM_info.script.version;
  console.log(`Know Your Meme Enhanced ${version}`);

  // Get all the <img> elements with the class "img-nsfw"
  let imgElements = document.querySelectorAll("img.img-nsfw");

  // Loop through each <img> element and replace the src attribute
  imgElements.forEach(function (imgElement) {
    imgElement.src = imgElement.getAttribute("data-original-image-url");
  });
})();
