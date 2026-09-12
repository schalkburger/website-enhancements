// ==UserScript==
// @name         Kill DevToolGuard
// @namespace    http://tampermonkey.net/
// @version      0.1
// @match        *://*/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    // Deep-freeze or stub hooks commonly targeted by anti-devtools scripts
    const noop = () => {};
    
    // Prevent code from wiping the DOM or redirecting to blank tabs
    const originalReplace = window.location.replace;
    window.location.replace = function(url) {
        if (url === 'about:blank') {
            console.warn('Blocked anti-devtools redirection attempt.');
            return;
        }
        return originalReplace.apply(this, arguments);
    };
})();