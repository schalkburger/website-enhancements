(() => {
  "use strict";

  // ================================
  // CSS Injection
  // ================================
  const injectCSS = () => {
    const css = `
      .comments-float {
        position: fixed !important;
        top: 56px !important;
        right: 0 !important;
        width: 24vw !important;
        max-width: 500px !important;
        height: 90vh !important;
        z-index: 2015 !important;
        background: rgba(0, 0, 0, 0.75) !important;
        backdrop-filter: blur(5px) !important;
        padding: 15px 0 0 15px !important;
        margin: 0 !important;
        border-radius: 0 !important;
        overflow-y: auto !important;
        transition: all 350ms ease-in-out;
      }
      .comments-float:hover {
        width: 35vw !important;
      }
      #content-text { padding-bottom: 10px; }
      #expander { --ytd-expander-button-margin: 5px 0 0 0 !important; }
      ytd-comments-header-renderer { margin-top: 0 !important; }
    `;

    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);

    // Modern browsers: Use constructable stylesheets if available
    if ("adoptedStyleSheets" in Document.prototype) {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(css);
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
    }
  };

  // ================================
  // SVG Icons (Reusable)
  // ================================
  const createSVG = (pathD, viewBox = "0 0 24 24") => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", viewBox);
    svg.setAttribute("width", "32");
    svg.setAttribute("height", "32");
    svg.setAttribute("fill", "currentColor");
    svg.style.cssText = "width: 32px; height: auto; pointer-events: none;";

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", pathD);
    svg.appendChild(path);
    return svg;
  };

  const ICONS = {
    backward: createSVG(
      "M8 11.3333L18.2227 4.51823C18.4524 4.36506 18.7628 4.42714 18.916 4.65691C18.9708 4.73904 19 4.83555 19 4.93426V19.0657C19 19.3419 18.7761 19.5657 18.5 19.5657C18.4013 19.5657 18.3048 19.5365 18.2227 19.4818L8 12.6667V19C8 19.5523 7.55228 20 7 20C6.44772 20 6 19.5523 6 19V5C6 4.44772 6.44772 4 7 4C7.55228 4 8 4.44772 8 5V11.3333Z"
    ),
    forward: createSVG(
      "M16 12.6667L5.77735 19.4818C5.54759 19.6349 5.23715 19.5729 5.08397 19.3431C5.02922 19.261 5 19.1645 5 19.0657V4.93426C5 4.65812 5.22386 4.43426 5.5 4.43426C5.59871 4.43426 5.69522 4.46348 5.77735 4.51823L16 11.3333V5C16 4.44772 16.4477 4 17 4C17.5523 4 18 4.44772 18 5V19C18 19.5523 17.5523 20 17 20C16.4477 20 16 19.5523 16 19V12.6667Z"
    ),
    comments: createSVG(
      "M16.8 19L14 22.5L11.2 19H6C5.44772 19 5 18.5523 5 18V7.10256C5 6.55028 5.44772 6.10256 6 6.10256H22C22.5523 6.10256 23 6.55028 23 7.10256V18C23 18.5523 22.5523 19 22 19H16.8ZM2 2H19V4H3V15H1V3C1 2.44772 1.44772 2 2 2Z"
    ),
  };

  // ================================
  // Button Factory
  // ================================
  const createControlButton = (id, svg, title, onClick) => {
    const button = document.createElement("button");
    Object.assign(button, {
      id,
      className: "ytp-button",
      title,
      role: "button",
      onclick: onClick,
    });

    button.style.cssText = `
      display: flex;
      justify-content: center;
      align-items: center;
      width: 45px;
      min-width: 45px;
      height: 100%;
      margin-right: 10px;
      padding: 0;
      border: none;
      background: none;
      cursor: pointer;
    `;

    button.appendChild(svg.cloneNode(true));
    return button;
  };

  // ================================
  // Video Control Helpers
  // ================================
  const getVideo = () => document.querySelector("video");

  const skipBackward = () => {
    const video = getVideo();
    if (video) video.currentTime = Math.max(0, video.currentTime - 5);
  };

  const skipForward = () => {
    const video = getVideo();
    if (video) video.currentTime = Math.min(video.duration || Infinity, video.currentTime + 5);
  };

  // ================================
  // Comments Floating Logic
  // ================================
  class CommentsFloater {
    static SELECTORS = {
      commentsSection: "#sections.ytd-comments:not([static-comments-header])",
      header: "ytd-comments-header-renderer",
      loadMore: "yt-next-continuation.ytd-item-section-renderer",
      primaryInner: "#primary-inner",
    };

    static isFloating = false;

    static toggle() {
      const comments = document.querySelector(this.SELECTORS.commentsSection);
      if (!comments) return;

      this.isFloating = !this.isFloating;

      if (this.isFloating) {
        comments.classList.add("comments-float");
        this.#applyFloatingStyles(comments);
        this.#setupAutoLoadMore(comments);
      } else {
        comments.classList.remove("comments-float");
        comments.style.cssText = ""; // Reset to original
      }
    }

    static #applyFloatingStyles(comments) {
      const container = document.getElementById("primary-inner") || document.querySelector("#columns");
      if (container && !container.contains(comments)) {
        container.appendChild(comments);
      }

      // Force styles (priority over CSS class for reliability)
      Object.assign(comments.style, {
        position: "fixed",
        top: "56px",
        right: "0",
        width: "24vw",
        maxWidth: "500px",
        height: "90vh",
        zIndex: "2015",
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(5px)",
        padding: "15px 0 0 15px",
        margin: "0",
        overflowY: "auto",
        display: "block",
      });
    }

    static #setupAutoLoadMore(comments) {
      comments.addEventListener("scroll", () => {
        if (Math.abs(comments.scrollHeight - comments.scrollTop - comments.clientHeight) < 50) {
          document.querySelector(this.SELECTORS.loadMore)?.click();
        }
      });
    }
  }

  // ================================
  // Main Button Injection
  // ================================
  const addControlButtons = () => {
    const controlBar = document.querySelector(".ytp-left-controls");
    if (!controlBar || document.getElementById("skip-backward")) return;

    const buttons = [
      createControlButton("skip-backward", ICONS.backward, "Rewind 5s", skipBackward),
      createControlButton("skip-forward", ICONS.forward, "Forward 5s", skipForward),
      createControlButton("toggle-comments", ICONS.comments, "Toggle Floating Comments", () => {
        CommentsFloater.toggle();
      }),
    ];

    controlBar.prepend(...buttons);
  };

  // ================================
  // Element Waiter (Simplified & Modernized)
  // ================================
  const waitForElement = (selector, callback, { once = true, timeout = null } = {}) => {
    const element = document.querySelector(selector);
    if (element) {
      callback(element);
      return;
    }

    const observer = new MutationObserver((_, obs) => {
      const el = document.querySelector(selector);
      if (el) {
        obs.disconnect();
        callback(el);
      }
    });

    observer.observe(document, { childList: true, subtree: true });

    if (timeout) {
      setTimeout(() => observer.disconnect(), timeout);
    }
  };

  // ================================
  // Initialization
  // ================================
  const init = () => {
    injectCSS();

    // Add buttons when controls appear
    const observer = new MutationObserver(addControlButtons);
    observer.observe(document.body, { childList: true, subtree: true });

    // Initial attempt
    addControlButtons();
  };

  // Wait for document to be ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
