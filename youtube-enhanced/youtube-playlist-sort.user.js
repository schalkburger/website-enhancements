// ==UserScript==
// @name         YouTube Playlist Sort by Views
// @namespace    http://tampermonkey.net/
// @version      1.7
// @description  Adds a sort button using safe DOM methods to bypass Trusted Types security.
// @author       Gemini Expert Programmer
// @match        https://www.youtube.com/*
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  let version = GM_info.script.version;
  console.log(`YouTube Playlist Sort by Views ${version}`);

  function parseViews(viewStr) {
    if (!viewStr) return 0;
    const match = viewStr.match(/([\d.]+)([MKBy]|$)/i);
    if (!match) return 0;

    const number = parseFloat(match[1]);
    const multiplier = match[2].toUpperCase();

    if (multiplier === "M") return number * 1000000;
    if (multiplier === "K") return number * 1000;
    if (multiplier === "B") return number * 1000000000;
    return number || 0;
  }

  function sortPlaylist() {
    const container = document.querySelector("#contents.ytd-playlist-video-list-renderer");
    if (!container) return;

    const items = Array.from(container.querySelectorAll("ytd-playlist-video-renderer"));
    if (items.length === 0) return;

    items.sort((a, b) => {
      const getV = (el) => {
        const spans = el.querySelectorAll("#video-info span");
        for (let span of spans) {
          if (span.textContent.includes("view")) return span.textContent;
        }
        return "0";
      };
      return parseViews(getV(b)) - parseViews(getV(a));
    });

    items.forEach((item) => container.appendChild(item));
  }

  function injectSortButton() {
    if (document.getElementById("sort-by-views-wrapper")) return;

    const actionRow = document.querySelector(".ytFlexibleActionsViewModelActionRow");
    if (!actionRow) return;

    // Create elements manually to bypass TrustedHTML requirements
    const wrapper = document.createElement("div");
    wrapper.id = "sort-by-views-wrapper";
    wrapper.className = "ytFlexibleActionsViewModelAction ytFlexibleActionsViewModelActionRowAction";

    const btn = document.createElement("button");
    // Applying YouTube's native classes
    btn.className =
      "yt-spec-button-shape-next yt-spec-button-shape-next--tonal yt-spec-button-shape-next--overlay yt-spec-button-shape-next--size-m yt-spec-button-shape-next--enable-backdrop-filter-experiment";
    btn.style.marginLeft = "2px";
    btn.style.padding = "0 14px";

    const textDiv = document.createElement("div");
    textDiv.className = "yt-spec-button-shape-next__button-text-content";
    btn.title = "Sort by Views";
    btn.textContent = "￬";
    wrapper.appendChild(btn);

    btn.onclick = (e) => {
      e.preventDefault();
      sortPlaylist();
    };

    actionRow.appendChild(wrapper);
  }

  const observer = new MutationObserver(() => {
    // Only run injection logic if we are on a playlist page
    if (window.location.href.includes("list=")) {
      injectSortButton();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();
