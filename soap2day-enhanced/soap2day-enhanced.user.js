// ==UserScript==
// @name           Soap2Day Enhanced
// @version        1.0.0
// @description    Soap2Day - Various functions to enhance Soap2Day like autoplay, fullscreen mode and semantic titles.
// @author         Schalk Burger
// @include        https://soap2day.to/*
// @include        https://soap2day.im/*
// @include        https://soap2day.ac/*
// @include        https://soap2day.se/*
// @include        https://s2dfree.to/*
// @include        https://s2dfree.cc/*
// @include        https://s2dfree.de/*
// @include        https://s2dfree.is/*
// @include        https://s2dfree.in/*
// @include        https://s2dfree.nl/*
// @run-at         document-idle
// @namespace https://greasyfork.org/users/776541
// ==/UserScript==

(function () {
  "use strict";
  function rafAsync() {
    return new Promise((resolve) => requestAnimationFrame(resolve));
  }
  async function checkElement(selector) {
    let querySelector = null;
    while (querySelector === null) {
      await rafAsync();
      querySelector = document.querySelector(selector);
    }
    return querySelector;
  }
  checkElement("video").then((element) => {
    const newScript = document.createElement("script");
    const inlineScript = document.createTextNode("jwplayer().play();jwplayer().setFullscreen(true);");
    newScript.appendChild(inlineScript);
    const target = document.body;
    target.appendChild(newScript);
  });
})();

window.addEventListener("load", (event) => {
  console.log("SOAP2DAY Scripts Loaded");
  // Auto click Home button
  const homeButton = document.getElementById("btnhome");
  if (typeof homeButton != "undefined" && homeButton != null) {
    // Exists.
    console.log("Home button exists");
    homeButton.classList.add("focus");
    setTimeout(() => {
      document.dispatchEvent(new Event("click"));
      document.querySelector("#btnhome").dispatchEvent(new Event("click"));
    }, "2000");
  }
  // Set episode title
  const episodeTitleSelector = document.querySelector(".col-sm-12.col-lg-12 > .alert.alert-info");
  const episodeTitleSelectorContent = episodeTitleSelector.textContent;
  if (typeof episodeTitleSelector != "undefined" && episodeTitleSelector != null) {
    // Exists.
    console.log("Episode title exists");
    const episodeArray = episodeTitleSelectorContent.split(">>");
    let showName = episodeArray[2];
    let episodeTitle = episodeArray[episodeArray.length - 1];
    console.log("Episode title:", episodeTitle);

    setTimeout(() => {
      document.title = showName + ":" + episodeTitle;
    }, "500");
  }
});
