// ==UserScript==
// @name        Bitbucket Enhanced 1.7.3
// @namespace   https://github.com/schalkburger/website-enhancements
// @version     1.7.3
// @author      Schalk Burger <schalkb@gmail.com>
// @description Auto-reload stale PRs, prefix tab title with PR number, Copy Branch/Copy PR buttons, sticky editor toolbar, copy comment permalink, pipeline finish notifications
// @match       https://bitbucket.org/*/*/pull-requests/*
// @match       https://bitbucket.org/*/*/branch/*
// @match       https://bitbucket.org/*/*/pipelines/results/*
// @run-at      document-idle
// @grant       none
// @license     MIT
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
      showToast("Automatically reloading stale PR");
      btn.click();
    }
  }

  const reloadObserver = new MutationObserver(() => clickReloadIfPresent());
  reloadObserver.observe(document.body, { childList: true, subtree: true });
  // Also check periodically in case the button appears without a DOM mutation we catch.
  setInterval(clickReloadIfPresent, 1500);

  // ---------- (9) Notify when pipeline finishes ----------
  // On a pipeline results page, the header button reads "Stop" while the
  // pipeline is running and switches to "Rerun" (or similar) once it
  // reaches a terminal state — the same discriminator Bitbucket itself
  // uses to decide whether the pipeline can still be cancelled. We watch
  // for that transition rather than the status icon, since icon classes
  // are build-hashed and unstable.
  const PIPELINE_RUNNING_BUTTON_TEXT = /^stop$/i;
  const PIPELINE_TERMINAL_BUTTON_TEXT = /^(rerun|run again)$/i;

  // Pure classifier: given the set of header button labels on a pipeline
  // results page, decide whether the pipeline is running, finished, or
  // indeterminate (e.g. page still loading, no matching button yet).
  // Exported on window for unit testing outside the userscript sandbox.
  function classifyPipelineState(buttonLabels) {
    const labels = buttonLabels.map((l) => (l || "").trim());
    if (labels.some((l) => PIPELINE_RUNNING_BUTTON_TEXT.test(l))) return "running";
    if (labels.some((l) => PIPELINE_TERMINAL_BUTTON_TEXT.test(l))) return "finished";
    return "unknown";
  }

  function getPipelineResultId() {
    const match = location.pathname.match(/\/pipelines\/results\/(\d+)/);
    return match ? match[1] : null;
  }

  function notifyPipelineFinished(resultId) {
    const body = `Pipeline #${resultId} finished`;
    if (typeof Notification !== "undefined" && Notification.permission === "granted" && document.hidden) {
      const notification = new Notification("Bitbucket pipeline finished", { body });
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } else {
      showToast(body);
    }
  }

  const pipelineNotifiedIds = new Set();
  let pipelineTrackedId = null;
  let pipelineWasRunning = false;

  function ensureNotifyToggle() {
    if (document.querySelector('[data-bb-enhanced-pipeline-notify-toggle="true"]')) return;
    const header = [...document.querySelectorAll("button")].find(
      (b) => PIPELINE_RUNNING_BUTTON_TEXT.test((b.textContent || "").trim()) || PIPELINE_TERMINAL_BUTTON_TEXT.test((b.textContent || "").trim()),
    );
    if (!header || !header.parentElement) return;

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.textContent = "🔔 Notify on finish";
    toggle.title = "Show a browser notification when this pipeline finishes";
    toggle.dataset.bbEnhancedPipelineNotifyToggle = "true";
    toggle.dataset.bbEnhancedActionBtn = "true";
    toggle.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (typeof Notification === "undefined") {
        showToast("Notifications not supported in this browser");
        return;
      }
      Notification.requestPermission().then((permission) => {
        showToast(permission === "granted" ? "Will notify when this pipeline finishes" : "Notification permission denied — falling back to on-page toast");
      });
    });

    header.parentElement.appendChild(toggle);
  }

  function checkPipelineFinished() {
    const resultId = getPipelineResultId();
    if (!resultId) return;

    if (resultId !== pipelineTrackedId) {
      // Navigated to a different pipeline result (SPA nav) — reset the
      // running flag for the new id, but keep pipelineNotifiedIds so a
      // pipeline that already notified once doesn't notify again if the
      // user navigates back to it while it's still in the same terminal state.
      pipelineTrackedId = resultId;
      pipelineWasRunning = false;
    }

    const buttonLabels = [...document.querySelectorAll("button")].map((b) => b.textContent);
    const state = classifyPipelineState(buttonLabels);

    if (state === "running") {
      pipelineWasRunning = true;
      return;
    }

    if (state === "finished" && pipelineWasRunning && !pipelineNotifiedIds.has(resultId)) {
      pipelineNotifiedIds.add(resultId);
      notifyPipelineFinished(resultId);
    }
  }

  if (location.pathname.includes("/pipelines/results/")) {
    const pipelineObserver = new MutationObserver(() => {
      ensureNotifyToggle();
      checkPipelineFinished();
    });
    // The Stop->Rerun button swap may happen as a characterData mutation
    // (React updating the text node in place) rather than a childList
    // change, so watch both. Also poll on an interval as a backstop, same
    // belt-and-braces approach as the reload-button watcher above.
    pipelineObserver.observe(document.body, { childList: true, subtree: true, characterData: true });
    setInterval(checkPipelineFinished, 2000);
    ensureNotifyToggle();
    checkPipelineFinished();
  }

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
      "align-items: center",
      "background: #3F5224",
      "border-radius: var(--ds-radius-large,8px)",
      "border: 1px solid #ffffff1a",
      "bottom:50px",
      "box-shadow: var(--ds-shadow-overlay)",
      "color: #fff",
      "color:#fff",
      "display: flex",
      "font: var(--ds-font-heading-xsmall)",
      "gap: 6px",
      "justify-content: center",
      "left:50%",
      "transform:translateX(-50%)",
      "padding: 16px",
      "position:fixed",
      "text-align: center",
      "transition:opacity 0.15s ease-in-out",
      "z-index: 1000",
    ].join(";");
    document.body.appendChild(toast);
    requestAnimationFrame(() => {
      toast.style.opacity = "1";
    });
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 200);
    }, 6000);
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
      copyBtn.textContent = "Copy comment";
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

        copyToClipboard(parts.join("\n\n"), "Comment copied to clipboard");
      });

      actionRow.appendChild(separator);
      actionRow.appendChild(copyBtn);
    }
  }

  const commentObserver = new MutationObserver(injectCopyButtons);
  commentObserver.observe(document.body, { childList: true, subtree: true });
  injectCopyButtons();

  // ---------- (7) Copy comment permalink on "commented on <file>" click ----------
  // Each comment's header line ("<Author> commented on <file>.tsx <time>")
  // has an <a href="/…/diff#comment-<id>"> around the filename that
  // normally navigates to that comment. We intercept it and copy the
  // absolute permalink instead.
  function findCommentFileLink(target) {
    const link = target.closest('a[href*="#comment-"]');
    return link;
  }

  document.addEventListener(
    "click",
    (event) => {
      const link = findCommentFileLink(event.target);
      if (!link) return;

      event.preventDefault();
      event.stopPropagation();

      const commentUrl = new URL(link.getAttribute("href"), location.origin).href;
      copyToClipboard(commentUrl, "Comment link copied to clipboard");
    },
    true,
  );

  // ---------- (8) Copy Branch / Copy PR buttons ----------
  // Injected next to the Approve / More-actions row on a PR page. Anchor on
  // the Approve button (aria-label is stable; classNames are build-hashed)
  // and walk up to the nearest role="group" ancestor that holds exactly the
  // Approve + More-actions pair — that's the row shown in the reference
  // screenshot. Bitbucket relabels Approve to "Unapprove"/"Approved" once
  // clicked, so we key off "approve" appearing anywhere in the label, and
  // re-run on every mutation since the row is torn down/rebuilt on
  // approve/unapprove.
  function canonicalPrUrl() {
    const match = location.pathname.match(/^(.*\/pull-requests\/\d+)/);
    if (!match) return null;
    return `${location.origin}${match[1]}`;
  }

  function findActionButtonRow() {
    const approveBtn = [...document.querySelectorAll("button")].find((b) => /approv/i.test(b.getAttribute("aria-label") || ""));
    if (!approveBtn) return null;

    let el = approveBtn.parentElement;
    for (let i = 0; i < 10 && el; i++) {
      if (el.getAttribute && el.getAttribute("role") === "group" && el.querySelectorAll("button").length >= 2) {
        return el;
      }
      el = el.parentElement;
    }
    return null;
  }

  function findSourceBranchName() {
    // The branch chip pair ("source -> destination") sits above the action
    // row, but not inside a <header> tag (that's an unrelated page-level
    // header) and not within a fixed number of parentElement hops either —
    // Bitbucket's layout has shifted this before. Walk up from the action
    // row until we hit an ancestor that actually contains a branch chip,
    // capped so we can't runaway to document and false-match unrelated
    // role="button" elements elsewhere on the page. role="button" also
    // wraps things like avatar images (aria-hidden img, not span), so
    // filter matches to branch-shaped text ("a/b", no spaces) rather than
    // taking the first hit blindly. Source is the first matching chip in
    // DOM order; its clean text lives in an aria-hidden span (visible text
    // is duplicated for truncation/tooltip rendering).
    const row = findActionButtonRow();
    if (!row) return null;
    const isBranchLike = (t) => t && !t.includes(" ") && t.includes("/");
    let scope = row;
    for (let i = 0; i < 15 && scope; i++) {
      const chip = [...scope.querySelectorAll('[role="button"] span[aria-hidden="true"]')].find((s) => isBranchLike(s.textContent.trim()));
      if (chip) return chip.textContent.trim();
      scope = scope.parentElement;
    }
    return null;
  }

  function makeActionButton(label, title, onClick) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = label;
    btn.title = title;
    btn.dataset.bbEnhancedActionBtn = "true";
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      onClick();
    });
    return btn;
  }

  function injectActionButtons() {
    const row = findActionButtonRow();
    if (!row || row.dataset.bbEnhancedButtonsInjected) return;
    row.dataset.bbEnhancedButtonsInjected = "true";

    const copyBranchBtn = makeActionButton("Copy Branch", "Copy source branch name", () => {
      const branchName = findSourceBranchName();
      if (!branchName) {
        showToast("Could not find branch name");
        return;
      }
      copyToClipboard(branchName, "Branch copied to clipboard");
    });

    const copyPrBtn = makeActionButton("Copy PR", "Copy PR link", () => {
      const prUrl = canonicalPrUrl();
      if (!prUrl) {
        showToast("Could not find PR link");
        return;
      }
      copyToClipboard(prUrl, "PR link copied to clipboard");
    });

    row.prepend(copyBranchBtn, copyPrBtn);
  }

  const actionButtonObserver = new MutationObserver(injectActionButtons);
  actionButtonObserver.observe(document.body, { childList: true, subtree: true });
  injectActionButtons();

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

      copyToClipboard(branchName, "Branch copied to clipboard");
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
     top: 104px;
     z-index: 185;
     border-bottom: 1px solid #696c72;
     padding-bottom: 6px !important;
   }

   [data-branch-copy-chip="true"] {
     cursor: pointer;
   }

   [data-bb-enhanced-action-btn="true"] {
     font-size: 12px;
     font-weight: 500;
     background: transparent;
     border: 1px solid rgb(169, 171, 175);
     padding: 6px 12px;
     border-radius: var(--ds-radius-large, 8px);
     display: inline-flex;
     justify-content: center;
     align-items: center;
     margin-right: 8px;
     color: white;
     cursor: pointer;
     line-height: 1.45;
   }

   [data-bb-enhanced-action-btn="true"]:hover {
     background: var(--ds-background-neutral-subtle-hovered,#0515240f);
   }
  `;
  document.head.appendChild(style);
})();
