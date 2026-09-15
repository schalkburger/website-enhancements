// ==UserScript==
// @name        Jira New Tab Flow
// @namespace   https://github.com/schalkburger/website-enhancements
// @version     2.7.0
// @author      Schalk Burger <schalkb@gmail.com>
// @description Open clicked Jira issues in a new tab instead of the sidebar popup, quick links to the Bitbucket branch/PR
// @match       https://*.atlassian.net/jira/*
// @match       https://*.atlassian.com/jira/*
// @match       https://*.atlassian.net/browse/*
// @match       https://*.atlassian.com/browse/*
// @run-at      document-idle
// @grant       none
// @license     MIT
// ==/UserScript==

(function () {
  "use strict";
  let version = GM_info.script.version;
  let name = GM_info.script.name;
  console.log(`${name} ${version}`);

  // Variables to store state information
  let lastSelectedIssue = null; // The last issue that was selected
  let isActive = true; // Whether the script is currently active
  let justActivated = true; // Flag to indicate that the script was just activated
  let switchTrack = null; // Switch track element, for reflecting toggle state
  let isOpeningIssue = false; // Re-entrancy guard: blocks duplicate opens from a burst of mutation events

  const DEV_INFO_POPUP_SELECTOR = '[data-testid="development-board-dev-info-icon.popup"]';
  const DEV_LINKS_MAX_ATTEMPTS = 20; // Give up after this many mutations if no dev info ever appears
  let devLinks = null; // { branchLink, prLink } elements, for updating href/visibility
  let devLinksState = { issueKey: null, resolved: false, attempts: 0 }; // Tracks what's currently rendered, so we don't re-scan the DOM every mutation

  // Get the current issue key from the URL, whether on a standalone /browse/KEY page or a board with ?selectedIssue=
  const getIssueKeyFromLocation = () => {
    const browseMatch = window.location.pathname.match(/\/browse\/([A-Z][A-Z0-9]*-\d+)/);
    if (browseMatch) {
      return browseMatch[1];
    }
    return new URLSearchParams(window.location.search).get("selectedIssue");
  };

  // Jira's own "Development" panel already has the real branch/PR links, but its content is
  // hidden and lazy-rendered on hover. Nudge it open with synthetic hover events, read the
  // links out, then close it back so we don't leave a stray tooltip open on screen.
  const getDevLinksFromJiraPanel = () => {
    const popup = document.querySelector(DEV_INFO_POPUP_SELECTOR);
    if (!popup) {
      return null; // No dev info icon on screen yet (or this issue has none)
    }

    const anchors = Array.from(popup.querySelectorAll("a[href]"));
    if (anchors.length === 0) {
      // Popup content only mounts once hovered, force it open and retry on the next mutation
      const trigger = popup.closest('[role="button"], button') || popup.parentElement;
      ["pointerover", "mouseover", "mouseenter"].forEach((type) =>
        trigger?.dispatchEvent(new MouseEvent(type, { bubbles: true }))
      );
      return null;
    }

    const branchHref = anchors.find((a) => /\/branch\//.test(a.href))?.href;
    const prHref = anchors.find((a) => /\/pull-requests?\//.test(a.href))?.href;

    const trigger = popup.closest('[role="button"], button') || popup.parentElement;
    ["pointerout", "mouseout", "mouseleave"].forEach((type) => trigger?.dispatchEvent(new MouseEvent(type, { bubbles: true })));

    return { branchHref, prHref };
  };

  // Refresh the Branch/PR buttons for the current issue. Cheap no-op once resolved for this
  // issue key; retries on subsequent mutations until Jira's dev info panel has rendered.
  const maybeUpdateDevLinks = () => {
    if (!devLinks) {
      return;
    }

    const issueKey = getIssueKeyFromLocation();
    if (issueKey !== devLinksState.issueKey) {
      devLinksState = { issueKey, resolved: false, attempts: 0 };
    }
    if (devLinksState.resolved) {
      return;
    }

    if (!issueKey) {
      devLinksState.resolved = true;
      devLinks.branchLink.style.display = "none";
      devLinks.prLink.style.display = "none";
      return;
    }

    devLinksState.attempts += 1;
    const result = getDevLinksFromJiraPanel();
    const hasLinks = result && (result.branchHref || result.prHref);

    if (!hasLinks) {
      if (devLinksState.attempts >= DEV_LINKS_MAX_ATTEMPTS) {
        devLinksState.resolved = true; // Give up, e.g. this issue has no linked branch/PR
        devLinks.branchLink.style.display = "none";
        devLinks.prLink.style.display = "none";
      }
      return; // Not ready yet, retry on next mutation
    }

    devLinksState.resolved = true;
    devLinks.branchLink.href = result.branchHref || "#";
    devLinks.branchLink.style.display = result.branchHref ? "" : "none";
    devLinks.prLink.href = result.prHref || "#";
    devLinks.prLink.style.display = result.prHref ? "" : "none";
  };

  // Function to toggle the active state of the script
  const toggleActiveState = () => {
    isActive = !isActive; // Toggle active state
    if (isActive) {
      justActivated = true;
    } else {
      lastSelectedIssue = null;
    }

    // Reflect the new state on the switch
    if (switchTrack) {
      switchTrack.setAttribute("data-state", isActive ? "checked" : "unchecked");
      switchTrack.querySelector("[data-thumb]").setAttribute("data-state", isActive ? "checked" : "unchecked");
    }
  };

  // Function to check if a new issue is selected
  const checkForSelectedIssue = () => {
    if (!isActive) {
      // Skip if the script is not active
      return;
    }

    // Get the currently selected issue
    const urlParams = new URLSearchParams(window.location.search);
    const urlDomain = window.location.hostname;
    const selectedIssue = urlParams.get("selectedIssue");

    // Open the selected issue in a new tab if it's different from the last one
    if (selectedIssue && selectedIssue !== lastSelectedIssue && !justActivated && !isOpeningIssue) {
      isOpeningIssue = true;
      console.log("Open selected issue");
      window.open(`https://${urlDomain}/browse/${selectedIssue}`, "_blank");

      // Close Jira's own modal the way a user would (Escape), so its router
      // unmounts it and cleans up the URL itself. Directly rewriting the URL
      // via history.replaceState leaves the modal mounted since Jira's router
      // never observes the change.
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true }));

      // Release the guard on the next tick, after the DOM settles
      setTimeout(() => {
        isOpeningIssue = false;
      }, 0);
    }

    lastSelectedIssue = selectedIssue;
    justActivated = false;
  };

  // Create a mutation observer to detect DOM changes
  const observer = new MutationObserver(() => {
    checkForSelectedIssue();
    maybeUpdateDevLinks();
  });

  // Start observing the body of the page for changes in the child list and the subtree
  observer.observe(document.querySelector("body"), {
    childList: true,
    subtree: true,
  });

  // shadcn-style switch CSS (https://ui.shadcn.com/docs/components/base/switch), injected once
  const style = document.createElement("style");
  style.textContent = `
    .jira-new-tab-switch-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 9999;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: #1D2125;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 13px;
    }
    .jira-new-tab-switch-container label {
      color: white;
      cursor: pointer;
      user-select: none;
    }
    .jira-new-tab-switch-track {
      width: 36px;
      height: 20px;
      border-radius: 999px;
      background: #3A3F45;
      cursor: pointer;
      padding: 2px;
      box-sizing: border-box;
      transition: background 0.15s ease;
    }
    .jira-new-tab-switch-track[data-state="checked"] {
      background: #1F875A;
    }
    .jira-new-tab-switch-thumb {
      display: flex;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: white;
      transition: transform 0.15s ease;
    }
    .jira-new-tab-switch-thumb[data-state="checked"] {
      transform: translateX(16px);
    }
    .jira-new-tab-dev-link {
      color: #579DFF;
      text-decoration: none;
      padding: 4px 8px;
      border-radius: 6px;
      background: #22272B;
      white-space: nowrap;
    }
    .jira-new-tab-dev-link:hover {
      background: #2C333A;
    }
  `;
  document.head.appendChild(style);

  // Function to create the switch for toggling script activation
  const createSwitch = () => {
    const container = document.createElement("div");
    container.className = "jira-new-tab-switch-container";

    const label = document.createElement("label");
    label.textContent = "New tab";

    switchTrack = document.createElement("span");
    switchTrack.className = "jira-new-tab-switch-track";
    switchTrack.setAttribute("role", "switch");
    switchTrack.setAttribute("data-state", isActive ? "checked" : "unchecked");

    const thumb = document.createElement("span");
    thumb.className = "jira-new-tab-switch-thumb";
    thumb.setAttribute("data-thumb", "");
    thumb.setAttribute("data-state", isActive ? "checked" : "unchecked");
    switchTrack.appendChild(thumb);

    label.addEventListener("click", toggleActiveState);
    switchTrack.addEventListener("click", toggleActiveState);

    const branchLink = document.createElement("a");
    branchLink.className = "jira-new-tab-dev-link";
    branchLink.textContent = "Branch";
    branchLink.target = "_blank";
    branchLink.rel = "noopener noreferrer";
    branchLink.style.display = "none"; // Hidden until we resolve an issue key + repo

    const prLink = document.createElement("a");
    prLink.className = "jira-new-tab-dev-link";
    prLink.textContent = "PR";
    prLink.target = "_blank";
    prLink.rel = "noopener noreferrer";
    prLink.style.display = "none";

    devLinks = { branchLink, prLink };

    container.appendChild(branchLink);
    container.appendChild(prLink);
    container.appendChild(label);
    container.appendChild(switchTrack);

    return container;
  };

  document.body.appendChild(createSwitch()); // Add our custom fixed-position toggle switch once on load
  maybeUpdateDevLinks(); // Resolve dev links for the issue already on screen, if any
})();
