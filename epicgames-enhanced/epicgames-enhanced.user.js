// ==UserScript==
// @name         Epic Games Auto Claim Free Games
// @namespace    https://github.com/schalkburger/website-enhancements
// @include      https://store.epicgames.com/*
// @match        https://store.epicgames.com/*
// @version      1.0.1
// @author       Schalk Burger <schalkb@gmail.com>
// @description  Automatically claims free games on Epic Games Store: clicks Get → Place Order → Continue Browsing
// @license      MIT
// ==/UserScript==

(function () {
  "use strict";

  const SCRIPT_NAME = "Epic Games Auto Claim Free Games";
  const VERSION = GM_info.script.version;
  console.log(`[${SCRIPT_NAME}] v${VERSION} started`);

  // Config — set to false if you want to manually click "Get" yourself
  const AUTO_CLICK_GET_BUTTON = false;

  // Helper: click an element safely (with visual feedback)
  const safeClick = (el) => {
    if (!el) return false;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    el.focus();
    el.click();
    console.log(`[${SCRIPT_NAME}] Clicked:`, el);
    return true;
  };

  // 1. Find and click the "Get" button on the product page
  const clickGetButton = () => {
    // Multiple selectors to survive Epic's hashed classes
    const selectors = [
      'button[data-testid="purchase-cta-button"] span span:contains("Get")',
      'button[data-testid="purchase-cta-button"]:contains("Get")',
      'button:contains("Get"):not(:contains("Get Later"))',
    ];

    for (const selector of selectors) {
      // Special handling for :contains() pseudo (not native in querySelector)
      if (selector.includes(":contains")) {
        const text = selector.match(/:contains\(["'](.*?)["']\)/)[1];
        const base = selector.split(":contains")[0];
        const candidates = document.querySelectorAll(base);
        for (const cand of candidates) {
          if (cand.textContent.trim().includes(text)) {
            const button = cand.closest("button") || cand;
            return safeClick(button);
          }
        }
      } else {
        const btn = document.querySelector(selector);
        if (btn && btn.textContent.trim().includes("Get")) {
          return safeClick(btn);
        }
      }
    }
    return false;
  };

  // 2. Click "Place Order" in checkout modal
  const clickPlaceOrder = () => {
    const selectors = [
      ".payment-order-confirm__btn span:contains('Place Order')",
      ".payment-order-confirm button:contains('Place Order')",
      "button.payment-btn--primary span:contains('Place Order')",
      "div.payment-order-confirm button span:contains('Place Order')",
    ];

    for (const selector of selectors) {
      if (selector.includes(":contains")) {
        const text = selector.match(/:contains\(['"](.*?)['"]\)/)[1];
        const base = selector.split(":contains")[0];
        const els = document.querySelectorAll(base);
        for (const el of els) {
          if (el.textContent.trim() === text || el.textContent.trim().includes(text)) {
            const button = el.closest("button");
            if (button) return safeClick(button);
          }
        }
      } else {
        const btn = document.querySelector(selector);
        if (btn) return safeClick(btn);
      }
    }

    // Fallback: any primary-looking button with "Place Order"
    const fallback = Array.from(document.querySelectorAll("button")).find((b) => b.textContent.trim().includes("Place Order") && !b.disabled);
    if (fallback) return safeClick(fallback);

    return false;
  };

  // 3. Click "Continue Browsing" in final modal
  const clickContinueBrowsing = () => {
    const selectors = ['button span span:contains("Continue Browsing")', 'button:contains("Continue Browsing")', 'button:contains("Continue")'];

    for (const selector of selectors) {
      if (selector.includes(":contains")) {
        const text = selector.match(/:contains\(["'](.*?)["']\)/)[1];
        const base = selector.split(":contains")[0];
        const els = document.querySelectorAll(base);
        for (const el of els) {
          if (el.textContent.trim().includes(text)) {
            const btn = el.closest("button");
            if (btn) return safeClick(btn);
          }
        }
      } else {
        const btn = document.querySelector(selector);
        if (btn && btn.textContent.trim().includes("Continue")) {
          return safeClick(btn);
        }
      }
    }
    return false;
  };

  // Main observer: watches for modal changes
  const observer = new MutationObserver((mutations, obs) => {
    // Step 2: Place Order modal
    if (document.querySelector(".payment-order-confirm") || document.body.textContent.includes("Place Order")) {
      if (clickPlaceOrder()) {
        console.log(`[${SCRIPT_NAME}] Placed order automatically`);
      }
    }

    // Step 3: Thank you / Continue Browsing modal
    if (document.body.textContent.includes("Thank you") || document.body.textContent.includes("Continue Browsing")) {
      if (clickContinueBrowsing()) {
        console.log(`[${SCRIPT_NAME}] Clicked Continue Browsing — done!`);
        // Optional: stop observing after success
        // obs.disconnect();
      }
    }
  });

  // Start observing
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  // Initial check + periodic fallback (in case observer misses fast modals)
  const tryAutoClaim = () => {
    if (AUTO_CLICK_GET_BUTTON && clickGetButton()) {
      console.log(`[${SCRIPT_NAME}] Auto-clicked 'Get' button`);
    }
  };

  // Run once on load
  tryAutoClaim();

  // Run again every 2s for 30s (covers slow loading or navigation)
  let attempts = 0;
  const interval = setInterval(() => {
    tryAutoClaim();
    attempts++;
    if (attempts > 15) clearInterval(interval);
  }, 2000);

  console.log(`[${SCRIPT_NAME}] Ready — auto-claim active on free games`);
})();
