// ==UserScript==
// @name         Photopea - Remove Ads Sidebar & Full Width Editor
// @namespace    https://github.com/schalkburger/website-enhancements
// @version      1.2
// @description  Hides the right ad column and makes the main Photopea workspace full-width
// @author       Schalk Burger <schalkb@gmail.com>
// @match        https://www.photopea.com/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
  "use strict";

  const css = `
        /* Completely hide the ad column (the second child of .flexrow.app) */
        .flexrow.app > div:nth-child(2) {
            display: none !important;
        }

        /* Make the main container take 100% width */
        .flexrow.app > div:first-child {
            width: 100% !important;
            flex: 1 !important;
        }

        /* Force the whole app row to be full width */
        .flexrow.app {
            width: 100% !important;
            display: flex !important;
        }

        /* Expand the main editor area */
        .panelblock.mainblock,
        .flexrow > .panelblock.mainblock > .block > .body,
        .flexrow > .panelblock.mainblock > .block > .panelhead {
            max-width: none !important;
            width: 100% !important;
        }

        /* Optional: also hide the small top-right ad banner if present */
        div[style*="z-index: 1"][style*="width: 600px"] {
            display: none !important;
        }
    `;

  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  // In case Photopea recalculates sizes later, force a resize after load
  window.addEventListener("load", () => {
    setTimeout(() => window.dispatchEvent(new Event("resize")), 500);
    setTimeout(() => window.dispatchEvent(new Event("resize")), 1500);
  });
})();
