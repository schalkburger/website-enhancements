// ==UserScript==
// @name         Move YouTube Comments
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Move YouTube Comments to where live chat would be and put them in an infinite scroll box
// @author       votqanh
// @match        *://*.youtube.com/*
// @exclude      *://*.youtube.com/playlist*
// @grant        GM_addStyle
// ==/UserScript==

(function () {
  "use strict";

  var comments = "#sections.ytd-comments:not([static-comments-header])";

  window.addEventListener("load", () => {
    waitForKeyElements(comments, () => {
      comments = document.querySelector(comments);
      var container = document.getElementById("primary-inner");

      container.prepend(comments);

      const styles = {
        display: "block",
        padding: "5px",
        width: "100%",
        height: "470px",
        overflowY: "scroll",
        marginBottom: "20px",
        position: "absolute",
        top: "0",
        right: "0",
        zIndex: "400",
        background: "rgb(0 0 0 / 75%)",
        backdropFilter: "blur(15px);z-index",
        maxWidth: "25vw",
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
  });

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
})();
