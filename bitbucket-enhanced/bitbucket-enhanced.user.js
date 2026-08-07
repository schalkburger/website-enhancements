// ==UserScript==
// @name         Bitbucket PR Enhancer
// @namespace    https://github.com/schalkburger/website-enhancements
// @version      1.1.0
// @author       Schalk Burger <schalkb@gmail.com>
// @description  Auto-reload stale PRs, prefix tab title with PR number, copy branch name on click, sticky editor toolbar
// @match        https://bitbucket.org/*/*/pull-requests/*
// @match        https://bitbucket.org/*/*/branch/*
// @run-at       document-idle
// @grant        none
// @license MIT
// ==/UserScript==

(function () {
  "use strict";
  let version = GM_info.script.version;
  let name = GM_info.script.name;
  console.log(`${name} ${version}`);

  // ---------- (3) Auto-click "reload PR" button ----------
  // Bitbucket shows a banner/button (text varies: "Reload", "Refresh",
  // "This pull request has been updated") when the PR view is stale.
  // We poll via MutationObserver and click it as soon as it appears.
  const RELOAD_BUTTON_TEXT = /reload|refresh/i;

  function findReloadButton() {
    const candidates = document.querySelectorAll('button, a[role="button"], [role="button"]');
    for (const el of candidates) {
      const text = (el.textContent || "").trim();
      if (RELOAD_BUTTON_TEXT.test(text) && text.length < 40) {
        return el;
      }
    }
    return null;
  }

  function clickReloadIfPresent() {
    const btn = findReloadButton();
    if (btn) {
      btn.click();
    }
  }

  const reloadObserver = new MutationObserver(() => clickReloadIfPresent());
  reloadObserver.observe(document.body, { childList: true, subtree: true });
  // Also check periodically in case the button appears without a DOM mutation we catch.
  setInterval(clickReloadIfPresent, 3000);

  // ---------- (2) Prepend PR number to tab title ----------
  function prefixTitle() {
    const match = location.pathname.match(/\/pull-requests\/(\d+)/);
    if (!match) return;
    const prNumber = match[1];
    const prefix = `#${prNumber}: `;
    if (!document.title.startsWith(prefix)) {
      // Strip any previously-applied prefix from a different PR (SPA nav) first.
      const stripped = document.title.replace(/^#\d+:\s*/, "");
      document.title = prefix + stripped;
    }
  }

  prefixTitle();
  // Bitbucket is a SPA; title changes async after navigation/data load.
  const titleObserver = new MutationObserver(prefixTitle);
  const titleEl = document.querySelector("title");
  if (titleEl) {
    titleObserver.observe(titleEl, { childList: true });
  }

  // ---------- (1) Copy branch name on click ----------
  // Bitbucket renders the source branch as a div[role="button"] whose
  // combined textContent repeats the branch name multiple times (visually
  // hidden duplicates for truncation/tooltip) plus a "Branch: " prefix, e.g.
  // "Branch: feat/FD-2532-...feat/FD-2532-...feat/FD-2532-...". Clicking it
  // normally opens Bitbucket's own branch popup. We intercept in the
  // capture phase, read the clean name from the first aria-hidden span
  // inside it, and stop the click before Bitbucket's handler runs.
  function findBranchButton(target) {
    return target.closest('[role="button"]');
  }

  function getBranchName(branchButton) {
    const span = branchButton.querySelector('span[aria-hidden="true"]');
    const text = span ? span.textContent.trim() : "";
    // Branch names look like git refs: no spaces, contains a slash.
    if (text && !text.includes(" ") && text.includes("/")) return text;
    return null;
  }

  document.addEventListener(
    "click",
    (event) => {
      const branchButton = findBranchButton(event.target);
      if (!branchButton) return;

      const branchName = getBranchName(branchButton);
      if (!branchName) return;

      event.preventDefault();
      event.stopPropagation();

      copyToClipboard(branchName, codeMessage("Copied branch name: ", branchName));
    },
    true,
  );

  // Builds a toast message fragment: "<label><code>value</code>". Using
  // real DOM nodes (rather than an HTML string) means the value is set via
  // textContent, so it's rendered literally even if it contains characters
  // that would otherwise be interpreted as markup.
  function codeMessage(label, value) {
    const fragment = document.createDocumentFragment();
    fragment.appendChild(document.createTextNode(label));
    const code = document.createElement("code");
    code.textContent = value;
    code.style.cssText = "background:rgba(255,255,255,0.15);padding:2px 5px;border-radius:3px;font-family:monospace;";
    fragment.appendChild(code);
    return fragment;
  }

  function copyToClipboard(text, successMessage) {
    navigator.clipboard
      .writeText(text)
      .then(() => showToast(successMessage))
      .catch(() => {
        // Clipboard API can fail silently on non-secure contexts; fall back to a hidden textarea.
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        showToast(successMessage);
      });
  }

  // message can be a plain string (set via textContent, safe/escaped) or a
  // DOM Node (e.g. a fragment built with document.createElement so a
  // branch/comment name can render inside a <code> tag without risking
  // HTML injection from unescaped string interpolation).
  function showToast(message) {
    const toast = document.createElement("div");
    if (message instanceof Node) {
      toast.appendChild(message);
    } else {
      toast.textContent = message;
    }
    toast.style.cssText = [
      "position:fixed",
      "bottom:24px",
      "left:50%",
      "transform:translateX(-50%)",
      "background:#174d24",
      "color:#fff",
      "padding:12px 20px",
      "border-radius:4px",
      "font-size:14px",
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif',
      "z-index:99999",
      "box-shadow:0 4px 12px rgba(0,0,0,0.25)",
      "opacity:0",
      "transition:opacity 0.15s ease-in-out",
    ].join(";");
    document.body.appendChild(toast);
    requestAnimationFrame(() => {
      toast.style.opacity = "1";
    });
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 200);
    }, 5000);
  }

  // ---------- (5) Copy comment button ----------
  // Each comment's action row ("Reply · Resolve · Like · Create task ·
  // Create Jira work item · Ask Rovo") sits below the comment body
  // (.ak-renderer-document). We find action rows by their "Reply" link,
  // walk up to the shared comment container, and inject a "Copy" action
  // that copies the comment as markdown, plus (when on a diff/file
  // comment) the file path and a permalink to the comment.
  function findCommentBody(actionRow) {
    // The comment container is the closest ancestor that also contains an
    // .ak-renderer-document — walk up until we find one whose descendant
    // (not itself, and not the action row) is the rendered body.
    let container = actionRow.parentElement;
    for (let i = 0; i < 6 && container; i++) {
      const body = container.querySelector(".ak-renderer-document");
      if (body) return body;
      container = container.parentElement;
    }
    return null;
  }

  // Renders comment body child nodes as Markdown, preserving inline code,
  // bold, italic, links, paragraphs, and list items.
  function nodeToMarkdown(node) {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent;
    if (node.nodeType !== Node.ELEMENT_NODE) return "";
    const inner = [...node.childNodes].map(nodeToMarkdown).join("");
    switch (node.tagName) {
      case "CODE":
        return "`" + node.textContent + "`";
      case "STRONG":
      case "B":
        return "**" + inner + "**";
      case "EM":
      case "I":
        return "*" + inner + "*";
      case "A":
        return "[" + inner + "](" + node.getAttribute("href") + ")";
      case "P":
        return inner + "\n\n";
      case "LI":
        return "- " + inner + "\n";
      case "BR":
        return "\n";
      default:
        return inner;
    }
  }

  function commentToMarkdown(commentBody) {
    return [...commentBody.childNodes].map(nodeToMarkdown).join("").trim();
  }

  // Diff/file comments render inside a <section> that also contains the
  // file's header (data-qa="bk-filepath"). Top-level PR (Overview tab)
  // comments have no such ancestor — filePath comes back null for those.
  function findCommentFilePath(actionRow) {
    const section = actionRow.closest("section");
    const filePathEl = section?.querySelector('[data-qa="bk-filepath"]');
    return filePathEl ? filePathEl.textContent.trim() : null;
  }

  function findCommentUrl(actionRow) {
    const commentContainer = actionRow.closest('[id^="comment-"]');
    if (!commentContainer) return null;
    return `${location.origin}${location.pathname}#${commentContainer.id}`;
  }

  function injectCopyButtons() {
    const candidates = document.querySelectorAll("a, button, span, div");
    for (const el of candidates) {
      const text = (el.textContent || "").trim();
      if (!/^reply$/i.test(text)) continue;
      if (el.children.length > 0) continue; // leaf node only, avoid matching containers

      // "Reply" text sits in a span inside a button (Reply is itself an
      // action). The action row is the button's parent, which also holds
      // the "·" separators and the other actions (Resolve, Like, ...).
      const replyButton = el.closest("button") || el;
      const actionRow = replyButton.parentElement;
      if (!actionRow || actionRow.dataset.copyButtonInjected) continue;

      const commentBody = findCommentBody(actionRow);
      if (!commentBody) continue;

      actionRow.dataset.copyButtonInjected = "true";

      const separator = document.createElement("span");
      separator.textContent = " · ";
      separator.setAttribute("aria-hidden", "true");

      const copyBtn = document.createElement("span");
      copyBtn.textContent = "Copy";
      copyBtn.setAttribute("role", "button");
      copyBtn.tabIndex = 0;
      copyBtn.style.cursor = "pointer";
      copyBtn.style.color = "inherit";
      copyBtn.style.textDecoration = "none";

      copyBtn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();

        const parts = [commentToMarkdown(commentBody)];
        const filePath = findCommentFilePath(actionRow);
        if (filePath) parts.push(`\`${filePath}\``);
        const commentUrl = findCommentUrl(actionRow);
        if (commentUrl) parts.push(commentUrl);

        copyToClipboard(parts.join("\n\n"), "Copied comment");
      });

      actionRow.appendChild(separator);
      actionRow.appendChild(copyBtn);
    }
  }

  const commentObserver = new MutationObserver(injectCopyButtons);
  commentObserver.observe(document.body, { childList: true, subtree: true });
  injectCopyButtons();

  // ---------- (6) Copy branch name on branch pages ----------
  // On /branch/<name> pages, the "Compare" section renders the source
  // branch as a plain (non-interactive) chip — no role="button", no
  // popup, clicking it currently does nothing. It's the first child of
  // the row following the "Compare" heading, before the arrow icon and
  // the destination-branch dropdown.
  function findCompareSourceChip() {
    const compareHeading = [...document.querySelectorAll("*")].find((el) => el.children.length === 0 && el.textContent.trim() === "Compare");
    if (!compareHeading) return null;
    const row = compareHeading.parentElement?.nextElementSibling;
    return row?.children[0] || null;
  }

  document.addEventListener(
    "click",
    (event) => {
      if (!location.pathname.includes("/branch/")) return;

      const chip = findCompareSourceChip();
      if (!chip || !chip.contains(event.target)) return;

      const branchName = [...chip.querySelectorAll("span")].map((s) => s.textContent.trim()).find((text) => text && !text.includes(" ") && text.includes("/"));
      if (!branchName) return;

      event.preventDefault();
      event.stopPropagation();

      copyToClipboard(branchName, codeMessage("Copied branch: ", branchName));
    },
    true,
  );

  // Tag the chip with a data-attribute so CSS can target it (its own
  // classes are build-hashed and unstable across deploys).
  function tagCompareSourceChip() {
    if (!location.pathname.includes("/branch/")) return;
    const chip = findCompareSourceChip();
    if (chip) chip.dataset.branchCopyChip = "true";
  }

  const compareChipObserver = new MutationObserver(tagCompareSourceChip);
  compareChipObserver.observe(document.body, { childList: true, subtree: true });
  tagCompareSourceChip();

  // ---------- (4) Sticky editor toolbar ----------
  const style = document.createElement("style");
  style.textContent = `
    .akEditor {
      position: relative;
    }
    [data-testid="ak-editor-main-toolbar"] {
      position: sticky !important;
      top: 60px;
      z-index: 50;
      border-bottom: 1px solid #696c72;
      padding-bottom: 6px;
    }
    [data-branch-copy-chip="true"] {
      cursor: pointer;
    }
  `;
  document.head.appendChild(style);
})();
