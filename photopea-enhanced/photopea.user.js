// ==UserScript==
// @name         Photopea - Hide Ad Sidebar + Full Width Editor
// @namespace    https://greasyfork.org
// @version      1.5
// @description  Removes only the ad column on the far right. Keeps Layers, History, etc. Full width editor.
// @author       Grok
// @match        https://www.photopea.com/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    const css = `
        /* Hide ONLY the outer ad sidebar */
        .flexrow.app > div:nth-child(2),
        div[style*="padding-left: 19px"][style*="width: 600px"],
        div[style*="z-index: 1"][style*="width: 600px"] {
            display: none !important;
            width: 0 !important;
            min-width: 0 !important;
        }

        /* Make the main app area full width */
        .flexrow.app > div:first-child,
        .flexrow.app {
            width: 100% !important;
            max-width: 100% !important;
        }

        /* Expand the editor area */
        .panelblock.mainblock,
        .panelblock.mainblock .block,
        .panelblock.mainblock .body,
        .panelhead {
            width: 100% !important;
            max-width: none !important;
        }

        .pbody, canvas {
            max-width: none !important;
        }
    `;

    const style = document.createElement('style');
    style.textContent = css;
    (document.head || document.documentElement).appendChild(style);

    // Force layout update
    function forceResize() {
        window.dispatchEvent(new Event('resize'));
    }

    window.addEventListener('load', () => {
        setTimeout(forceResize, 300);
        setTimeout(forceResize, 900);
    });

    // Safety observer
    new MutationObserver(() => {
        const ads = document.querySelectorAll('.flexrow.app > div:nth-child(2)');
        ads.forEach(ad => ad.style.display = 'none');
    }).observe(document.body, { childList: true, subtree: true });
})();