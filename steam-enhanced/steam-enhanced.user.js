// ==UserScript==
// @name        Steam Enhanced
// @namespace   https://greasyfork.org/en/users/961305-darkharden
// @match       https://steamcommunity.com/*
// @include     /^https?:\/\/steamcommunity.com\/(id\/+[A-Za-z0-9$-_.+!*'(),]+|profiles\/7656119[0-9]{10})\/friends\/?$/
// @version     1.1.2
// @author      Schalk Burger <schalkb@gmail.com>
// @description A collection of tools to enhance Steam.
// @license     MIT
// ==/UserScript==

// 1. Upload Artwork & Enable Custom Uploads Buttons
// 2. Symbols & Characters
// 3. Steam Profile Artwork Tool Buttons
// 4. Steam Mass Comments Poster Vanilla
// 5. Steam Copy Avatar Frame Source
// 6. Steam Replace Avatar Frame Source
// 7. Reload Steam market function
// 8. Auto Claim stickers
// 9. Steam Comments Deleter
// 10. Steam Screenshots Middle Click

//* ========================================================================== //
//* GLOBAL UTILITIES
//* ========================================================================== //

function rafAsync() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

async function checkElement(selector) {
  let querySelector = null;
  while (querySelector === null) {
    await rafAsync();
    querySelector = document.querySelector(selector);
  }
  return querySelector;
}

//* ========================================================================== //
//* CONFIG & MANAGERS
//* ========================================================================== //

const STEAM_ENHANCED_CONFIG = {
  THEMES: {
    list: [
      "DefaultTheme",
      "SummerTheme",
      "MidnightTheme",
      "SteelTheme",
      "CosmicTheme",
      "DarkModeTheme",
      "Steam3000Theme",
      "GameProfileTheme",
      "SteamDeckTheme",
    ],
    display: {
      DefaultTheme: "Default Theme",
      SummerTheme: "Summer",
      MidnightTheme: "Midnight",
      SteelTheme: "Steel",
      CosmicTheme: "Cosmic",
      DarkModeTheme: "DarkMode",
      Steam3000Theme: "Steam3000Theme",
      GameProfileTheme: "GameProfileTheme",
      SteamDeckTheme: "SteamDeckTheme",
    },
  },
  SELECTORS: {
    body: "body.profile_page",
    themeButton: ".change-theme",
    themeDetails: ".change-profile-theme details",
  },
};

/**
 * Manages theme switching for Steam profile
 */
class ThemeManager {
  constructor(config) {
    this.config = config;
    this.body = null;
    this.themeDetails = null;
  }

  async init() {
    try {
      await checkElement(this.config.SELECTORS.themeButton);
      this.body = document.querySelector(this.config.SELECTORS.body);
      this.themeDetails = document.querySelector(
        this.config.SELECTORS.themeDetails,
      );

      if (!this.body) {
        console.error("❌ ThemeManager: Body element not found");
        return;
      }

      this.attachListeners();
      console.log(
        `✅ ThemeManager initialized (${this.getButtonCount()} themes)`,
      );
    } catch (err) {
      console.error("❌ ThemeManager init error:", err);
    }
  }

  getButtonCount() {
    return document.querySelectorAll(this.config.SELECTORS.themeButton).length;
  }

  attachListeners() {
    const buttons = document.querySelectorAll(
      this.config.SELECTORS.themeButton,
    );
    if (buttons.length === 0) {
      console.error("❌ ThemeManager: No theme buttons found");
      return;
    }

    buttons.forEach((button) => {
      button.addEventListener("click", (e) => this.switchTheme(e, button));
    });
  }

  switchTheme(e, button) {
    e.stopPropagation();
    const themeId = button.id;
    this.body.classList.remove(...this.config.THEMES.list);
    this.body.classList.add(themeId);

    // Close dropdown after selection
    if (this.themeDetails) {
      this.themeDetails.removeAttribute("open");
    }

    console.log(`✨ Theme changed to: ${themeId}`);
  }
}

(function () {
  "use strict";
  let version = GM_info.script.version;
  console.log(`Steam Enhanced Version ${version}`);
  // Inject Steam Profile Artwork Tool styles
  let css = `
  .steam-enhanced {
    box-shadow: rgba(0, 0, 0, 0.16) 0px 3px 6px, rgba(0, 0, 0, 0.23) 0px 3px 6px;
    position: absolute;
    z-index: 500;
    top: 20px;
    right: 20px;
    opacity: 1;
    width: 100%;
    max-width: 175px;
    margin-bottom: 10px;
    padding: 0;
    background: #171d25;
    border-radius: 4px;
  }
  .steam-enhanced.pinned {
    position: fixed;
  }
  .steam-enhanced:hover {
    opacity: 1;
  }
  .steam-enhanced header {
    padding: 5px 5px 5px 10px;
  }
  .steam-enhanced h4 {
    display: flex;
    justify-content: space-between;
    width: 100%;
    font-size: 12px;
    font-weight: 500;
    color: #b8b6b4;
    padding-top: 4px;
  }
  .steam-enhanced h4 span {
    display: flex;
    width: 100%;
    max-width: 50px;
    justify-content: space-around;
  }
  .steam-enhanced h4 i#steamEnhancedToggle {
    display: inline-block;
    width: 20px;
    height: 20px;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='18' height='18' fill='rgba(255,255,255,1)'%3E%3Cpath d='M12 8L18 14H6L12 8Z'%3E%3C/path%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right center;
    background-size: contain;
    cursor: pointer;
  }
  .steam-enhanced.expanded h4 i#steamEnhancedToggle {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='18' height='18' fill='rgba(255,255,255,1)'%3E%3Cpath d='M12 16L6 10H18L12 16Z'%3E%3C/path%3E%3C/svg%3E");
  }
  .steam-enhanced h4 i#steamEnhancedPin {
    display: inline-block;
    width: 20px;
    height: 20px;
    background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAALtJREFUOE/Vk9ERwiAMhv+og3QPBDsKTGKdhG5SBXuO4SaNV671CPXqQ1+UJ46QL8n/A2Hjoo35WAD6GHgNqrQROUvAPXgwLBhOgAgehFYdjThfAkKwIPiyUuqM4ZQxbQ7+RUCMZ4CbjyN80+DRddVw2D8BapTWl3zWfgQT24HJaa2vc0xo0M8OEIRQ42ViVAzUpRMSMDqwwymrXE/7d0UMuOVOrL7E1BGA0vtVG8Xc/w+IMSYRc9vKj/YChYhmESTC7boAAAAASUVORK5CYII=);
    background-repeat: no-repeat;
    background-position: right center;
    cursor: pointer;
    background-size: 12px 12px;
  }
  .steam-enhanced h4 i#steamEnhancedPin.toggle {
    background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAKdJREFUOE9jZKAQMFKonwHDgCuXLv7HZ6iOnj6KHiwGXJjPwMCYgN2Q/wt09AwSkeUwDLh66VLCf4b/87EZwMjAmKitp7dgsBtw+WL9//8MDWSFwfXz5xX+MjPdxxMLD/4z/kvU1TU8AFODEohXLuGLAZgW1JhAMQASA//sES5gdICw/yPZyHQQOSbwpkSIixgY0OMebzQiSw4DAy5fPg8ORORoQ49iAFq1UxFzHZ4rAAAAAElFTkSuQmCC);
  }
  .steam-enhanced a:hover {
    text-decoration: none;
    color: #66C0F4;
  }
  .steam-enhanced-container {
    padding: 5px 5px 5px 15px;
    margin: 5px 0 5px 0;
    // box-shadow: 0 1px 0px 0px inset #4f5660;
    user-select: none;
  }
  .steam-enhanced-container.hide {
    display: none;
  }
  .upload-artwork-link,
  .change-profile-theme {
    position: relative;
  }
  .upload-artwork-link:hover {
    text-decoration: underline;
  }
  .change-profile-theme-container {
    display: flex;
    flex-direction: column;
  }
  .change-profile-theme {
    z-index: 400;
    overflow: visible;
    min-width: 150px;
    min-height: 20px;
    cursor: pointer;
    color: #fff;
  }
  details>summary {
    list-style: none;
    display: flex;
  }
  summary::-webkit-details-marker {
    display: none
  }
  summary::after {
    content: "";
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='16' height='16' fill='rgba(255,255,255,1)'%3E%3Cpath d='M11.9999 13.1714L16.9497 8.22168L18.3639 9.63589L11.9999 15.9999L5.63599 9.63589L7.0502 8.22168L11.9999 13.1714Z'%3E%3C/path%3E%3C/svg%3E");
    width: 20px;
    height: 20px;
    display: inline-block;
    background-repeat: no-repeat;
    background-position: right center;
  }
  details[open] summary:after {
    content: "";
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='16' height='16' fill='rgba(255,255,255,1)'%3E%3Cpath d='M11.9999 10.8284L7.0502 15.7782L5.63599 14.364L11.9999 8L18.3639 14.364L16.9497 15.7782L11.9999 10.8284Z'%3E%3C/path%3E%3C/svg%3E");
  }
  .quick-links.hide {
    display: none;
  }
  .quick-links-toggle, .quick-links-toggle span {
    display: flex;
  }
  .quick-links-toggle i {
    content: "";
    background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABMAAAAMAQMAAAC6HhTBAAAAAXNSR0IB2cksfwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAZQTFRFAAAAxcPCp77KdQAAAAJ0Uk5TAP9bkSK1AAAAGklEQVR4nGNgQAPMfxgYGH8AGR+AOAFdlgEAUsADSd64CbwAAAAASUVORK5CYII=);
    width: 20px;
    height: 20px;
    display: inline-block;
    background-repeat: no-repeat;
    background-position: right center;
  }
  .change-profile-theme details {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
  }
  .change-profile-theme details summary {
    user-select: none;
  }
  .change-profile-theme details summary:hover {
    color: #66C0F4;
  }
  .preview-background {
    z-index: 300;
  }
  .preview-avatar-frame {
    z-index: 200;
  }
  .quick-navigation {
    z-index: 500;
  }
  .useful-links {
    z-index: 100;
  }
  .change-profile-theme .color-themes,
  .change-profile-theme .quick-navigation,
  .change-profile-theme .useful-links {
    box-shadow: 0px 1px 2px 2px rgb(8 17 30 / 75%);
    display: flex;
    flex-direction: column;
    min-width: 130px;
    margin-top: 5px;
    margin-left: -5px;
    padding: 15px;
    padding-top: 10px;
    padding-left: 15px;
    background-color: #171d25;
    border-top: 1px solid rgb(255 255 255 / 25%);
    border-radius: 4px;
    color: #fff;
  }
  .change-profile-theme .quick-navigation span, .change-profile-theme .useful-links span {
    display: block;
    margin: 6px 0 4px 0;
  }
  .change-profile-theme .color-themes span {
    display: block;
    margin: 6px 0 4px 0;
  }
  .change-profile-theme .color-themes span:hover {
    text-decoration: none;
    color: #66C0F4;
  }
  #manage_friends .friends-comments-textarea {
    width: 100%;
  }
  #manage_friends.manage_friends_panel.manage {
    padding-bottom: 20px;
  }
  .friend_block_v2 .indicator {
    background-color: #1c4057;
  }
  #showSymbols {
    margin-left: 0;
  }
  .commentthread_entry_quotebox .commentthread_textarea {
    resize: vertical;
    min-height: 80px;
    padding: 5px;
  }
  .symbolsDialog {
    box-shadow: 0 0 12px #000000;
    width: 500px;
    height: calc(50vh);
    padding: 15px;
    padding-top: 0;
    background-color: #3b3938;
    border: none;
    color: #fff;
  }
  .subSectionTitle {
    margin-bottom: 10px;
    padding-top: 10px;
    padding-bottom: 0px;
    font-size: 18px;
    color: #fff;
  }
  .symbols-container {
    position: relative;
    top: 0;
    overflow: auto;
    max-width: 590px;
    max-height: 500px;
    background: none;
  }
  .symbols-container details {
    padding: 15px;
    transition: all 0.3s ease-out;
  }
  .symbols-container details[open] {
    padding: 15px;
    background: #171d25;
  }
  .symbols-container summary {
    cursor: pointer;
  }
  .profileedit_ProfileBoxContent_3s6BB .symbols-container {
    top: -32px;
    left: 0;
  }
  .profileedit_ProfileBoxContent_3s6BB .symbols-container details[open] {
    background-color: rgba(0, 0, 0, 0.25);
  }
  .customtext_showcase + .symbols-container {
    top: 10px;
    left: 0;
  }
  .customtext_showcase + .symbols-container details[open] {
    background-color: transparent;
  }
  .profile_content.has_profile_background {
    overflow: visible;
  }
  .profile_count_link {
    min-height: 20px;
    margin-top: 4px;
    margin-bottom: 8px;
    font-size: 12px;
  }
  .profile_count_link a {
    display: block;
    width: 100%;
  }
  .quick-icon-container {
    margin-top: 0;
  }
  .active-theme span {
    color: #2e83c9;
  }
  .steamProfileArtworkContainer {
    display: block;
    width: 100%;
    height: auto;
    background: #17222f;
  }
  .steamProfileArtworkContainer > div {
    padding-left: 20px;
  }
  .buttonsContainer {
    display: flex;
    align-items: center;
    width: 100%;
    height: 60px;
  }
  input[type="text"].fieldInputSuccess {
    position: relative;
  }
  .alertBlankTitleSet,
  .alertCustomArtworkEnabled {
    display: flex;
    justify-content: flex-start;
    align-items: center;
    position: relative;
    top: 0;
    left: 0;
    opacity: 1;
    width: auto;
    height: 37px;
    margin: 15px 0 0 0px;
    background: transparent;
    font-size: 16px;
    line-height: 1;
    color: #22830f;
  }
  .alertBlankTitleSet,
  .alertCustomArtworkEnabled.longWorkshopGuideEnabled {
    margin-top: 0;
  }
  .modifyArtworkInstructions blockquote {
    font-size: 14px;
    line-height: 1.6;
  }
  .modifyArtworkInstructions blockquote ol {
    font-size: 16px;
  }
  .modifyArtworkInstructions blockquote ol li {
    margin-bottom: 10px;
  }
  .modifyArtworkInstructions blockquote code {
    padding: 2px 4px;
    background: #1a1a1a;
  }
  .hexEditInstructionsVideo {
    display: flex;
    flex-direction: column;
    margin-top: 20px;
    padding-top: 10px;
    background-image: url(https://store.akamai.steamstatic.com/public/images/v6/maincol_gradient_rule.png);
    background-repeat: no-repeat;
    background-position: top left;
  }
  .hexEditInstructionsVideo details {
    margin-left: 5px;
    cursor: pointer;
  }
  .hexEditInstructionsVideo {
    font-size: 16px;
  }
  .embed-container {
    position: relative;
    overflow: hidden;
    max-width: 100%;
    height: 0;
    padding-bottom: 56.25%;
  }
  .embed-container iframe,
  .embed-container object,
  .embed-container embed {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }
  .customArtworkButtons {
    display: flex;
    justify-content: center;
    align-items: center;
    height: auto;
    min-height: 32px;
    padding: 0 5px;
    font-size: 15px;
  }
  .customArtworkButtons details {
    font-size: 16px;
  }
  .customArtworkButtons details[open] {
    position: relative;
    top: 0;
  }
  .customArtworkButtons details[open] summary {
    position: relative;
    top: 0;
  }
  .customArtworkButtonsWrapper {
    display: flex;
    flex-direction: column;
    position: absolute;
    z-index: 400;
    top: calc(100% + 2px);
    left: 0;
    width: 100%;
    padding-bottom: 10px;
    background: rgb(29 77 104);
  }
  .customArtworkButtonsWrapper a {
    position: relative;
    z-index: 400;
    min-width: 140px;
    padding: 2px 0;
  }
  .enable-custom-artwork-button {
    padding: 0 15px;
    line-height: 30px;
    display: flex;
    align-items: center;
  }
  #mainContents .pageTitle {
    margin-bottom: 10px;
  }
  .blank-title-added {
    pointer-events: none;
    opacity: 0.5;
  }
  .profile-autoreload-market {
    display: flex;
    line-height: normal;
    align-items: center;
  }
  .toggle-switch {
    display: block;
    position: relative;
    top: 1px;
    left: -8px;
  }
  .toggle-switch input {
    display: none;
  }
  .toggle-switch label {
    display: block;
    width: 20px;
    height: 7px;
    padding: 3px;
    transition: 0.3s;
    cursor: pointer;
    border: 1px solid #ffffff;
    border-radius: 15px;
  }
  .toggle-switch label::after {
    content: "";
    display: inherit;
    width: 6px;
    height: 6px;
    transition: 0.3s;
    background: #ffffff;
    border-radius: 12px;
  }
  .toggle-switch input:checked ~ label {
    background: #2b475e;
    border-color: #ffffff;
  }
  .toggle-switch input:checked ~ label::after {
    translate: 14px 0;
    background: #ffffff;
  }
  .toggle-switch input:disabled ~ label {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .detailBox {
    background: transparent;
  }
  .divider {
    margin: 10px 0 10px 0;
    display: block;
    width: 100%;
    height: 1px;
    background: transparent;
    box-shadow: 1px 1px 0px 0px #293942;
    max-width: 95%;
  }
  .quick-icons-container {
    display: flex;
    margin-bottom: 10px;
  }
  .quick-icon {
    background: #242c36;
    color: #fff;
    margin: 0 8px 0 0;
    width: 24px;
    height: 24px;
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 4px;
    padding: 3px;
    cursor: pointer;
  }
  .quick-icon:hover {
    background: #3b4858;
  }
  .blotter_userstatus {
  max-height: 500px;
  overflow: hidden;
  overflow-y: scroll;
  }

  `,
    head = document.head || document.getElementsByTagName("head")[0],
    style = document.createElement("style");

  head.appendChild(style);
  style.type = "text/css";
  if (style.styleSheet) {
    // This is required for IE8 and below.
    style.styleSheet.cssText = css;
  } else {
    style.appendChild(document.createTextNode(css));
  }

  //* 1. Upload Artwork & Enable Custom Uploads Buttons
  //* ==========================================================================
  //* Upload custom artwork button to profile

  (function () {
    "use strict";
    // Check if on profile page
    checkElement("#global_header").then((element) => {
      // console.log("global_header");
      function setUploadArtworkButton() {
        const uploadArtworkURL = `https://steamcommunity.com/sharedfiles/edititem/767/3/`;
        const uploadCustomArtworkButtonContainer =
          document.createElement("div");
        uploadCustomArtworkButtonContainer.id = "steamEnhanced";
        uploadCustomArtworkButtonContainer.className = "steam-enhanced";
        // Get body classes
        const bodyClasses = Array.from(document.querySelectorAll("body"));
        let bodyClassesOutput = bodyClasses.flatMap((div, idx) => {
          let bodyClassesList = div.classList.value.split(" ");
          // console.log(bodyClassesList);
          let matches = bodyClassesList.filter((cls) => cls.includes("Theme"));
          return [matches];
        });
        // console.log("Body class array bodyClassesOutput:", bodyClassesOutput);
        const currentTheme = bodyClassesOutput[0].toString();
        // console.log("Body class theme:", bodyClassesOutput[0].toString());
        uploadCustomArtworkButtonContainer.setAttribute(
          "data-panel",
          "{'maintainX':true,'bFocusRingRoot':true,'flow-children':'row'}",
        );
        // Create Buttons
        uploadCustomArtworkButtonContainer.innerHTML = `

        <header><h4>Steam Enhanced <span><i id="steamEnhancedPin"></i> <i id="steamEnhancedToggle"></i></span></h4></header>
         <div id="steamEnhancedContainer" class="steam-enhanced-container hide">
         <div class="quick-icons-container">
            <div class="quick-icon-container profile_count_link">
              <span id="reloadPage" title="Reload Page" class="quick-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-arrow-clockwise" viewBox="0 0 16 16">
                <path fill-rule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2z"/>
                <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466"/>
                </svg>
              </span>
            </div>

            <div class="quick-icon-container profile_count_link">
              <span id="backToTop" title="Back To Top" class="quick-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="rgba(255,255,255,1)"><path d="M13.0001 7.82843V20H11.0001V7.82843L5.63614 13.1924L4.22192 11.7782L12.0001 4L19.7783 11.7782L18.3641 13.1924L13.0001 7.82843Z"></path></svg>
              </span>
            </div>
            <div class="quick-icon-container profile_count_link">
              <span id="goToBottom" title="Go To Bottom" class="quick-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="rgba(255,255,255,1)"><path d="M13.0001 16.1716L18.3641 10.8076L19.7783 12.2218L12.0001 20L4.22192 12.2218L5.63614 10.8076L11.0001 16.1716V4H13.0001V16.1716Z"></path></svg>
              </span>
            </div>
          </div>

          <div class="profile_count_link">
            <div class="change-profile-theme quick-navigation">
              <details>
                <summary>Quick Navigation</summary>
                <div class="quick-navigation">
                  <div class="profile_count_link">
                    <a href="https://steamcommunity.com/my/">Profile</a>
                  </div>
                  <div class="profile_count_link">
                  <a id="steamIDLink" target="_blank">SteamID</a>
                  </div>
                  <div class="profile_count_link">
                    <a href="https://steamcommunity.com/my/friends">Friends</a>
                  </div>
                  <div class="profile_count_link">
                    <a href="https://steamcommunity.com/my/friends/add">Add Friend</a>
                  </div>
                  <div class="profile_count_link">
                    <a href="https://steamcommunity.com/my/inventory">Inventory</a>
                  </div>
                  <div class="profile_count_link">
                    <a href="https://steamcommunity.com/my/tradeoffers">Trade Offers</a>
                  </div>
                  <div class="profile_count_link">
                    <a id="steamChatLink">Chat</a>
                  </div>
                </div>
              </details>
            </div>
          </div>
          <div class="divider"></div>
          <div class="profile_count_link">
            <a class="upload-artwork-link" href="https://steamcommunity.com/sharedfiles/edititem/767/3/"><span>Upload Artwork</span></a>
          </div>
          <div class="profile_count_link">
            <div class="change-profile-theme">
              <details>
                <summary>Preview Theme</summary>
                <div class="active-theme" style="display:none"><span>(${currentTheme})</span></div>
                <div class="color-themes">
                  <span class="change-theme" id="DefaultTheme">Default Theme</span>
                  <span class="change-theme" id="SummerTheme">Summer</span>
                  <span class="change-theme" id="MidnightTheme">Midnight</span>
                  <span class="change-theme" id="SteelTheme">Steel</span>
                  <span class="change-theme" id="CosmicTheme">Cosmic</span>
                  <span class="change-theme" id="DarkModeTheme">DarkMode</span>
                  <span class="change-theme" id="Steam3000Theme">Steam3000Theme</span>
                  <span class="change-theme" id="GameProfileTheme">GameProfileTheme</span>
                  <span class="change-theme" id="SteamDeckTheme">SteamDeckTheme</span>
                </div>
              </details>
            </div>
          </div>
          
          <div class="profile_count_link">
          <div class="change-profile-theme useful-links">
            <details>
              <summary>Useful Links</summary>
              <div class="useful-links">
                <div class="profile_count_link">
                  <a href="https://steamstat.us/" target="_blank">Steam Status</a>
                </div>
                <div class="profile_count_link">
                  <a href="https://steamdb.info/sales/history/" target="_blank">Steam Sale Dates</a>
                </div>
                <div class="profile_count_link">
                  <a href="https://steamrep.com/" target="_blank">SteamRep</a>
                </div>
                <div class="profile_count_link">
                  <a href="https://steamid.io/" target="_blank">Steam ID Lookup</a>
                </div>
                <div class="profile_count_link">
                  <a href="https://backgrounds.gallery/" target="_blank">Backgrounds.Gallery</a>
                </div>
                <div class="profile_count_link">
                  <a href="https://steam.tools/backgrounds/#/" target="_blank">Steam Tools Backgrounds</a>
                </div>
                <div class="profile_count_link">
                  <a href="https://www.steamcardexchange.net/index.php?backgroundviewer" target="_blank">Background Viewer</a>
                </div>
                <div class="profile_count_link">
                  <a href="https://steambackgrounds.com/" target="_blank">Steam Backgrounds</a>
                </div>
                <div class="profile_count_link">
                  <a href="https://csrep.gg/" target="_blank">CS Rep</a>
                </div>
                <div class="profile_count_link">
                  <a href="https://cstracker.gg/" target="_blank">CS Tracker</a>
                </div>
                <div class="profile_count_link">
                  <a href="https://leetify.com/" target="_blank">Leetify</a>
                </div>
                <div class="profile_count_link">
                  <a href="https://steamhistory.net/" target="_blank">Steam History</a>
                </div>
              </div>
            </details>
          </div>
        </div>
        </div>
        `;

        // #mainContents
        // const steamEnhancedContainer = document.getElementById("responsive_page_template_content");
        const steamEnhancedWrapper =
          document.getElementById("responsive_page_template_content") ||
          document.getElementById("mainContents");
        if (steamEnhancedWrapper) {
          steamEnhancedWrapper.appendChild(uploadCustomArtworkButtonContainer);
        }

        const backToTopButton = document.getElementById("backToTop");
        // Add a click event listener to the element
        if (backToTopButton) {
          // FIX: Add null check
          backToTopButton.addEventListener("click", function () {
            // Scroll to the top of the page
            window.scrollTo({
              top: 0,
              behavior: "smooth", // You can use 'auto' or 'smooth' for smooth scrolling
            });
          });
        }
        const goToBottomButton = document.getElementById("goToBottom");
        // Add a click event listener to the element
        if (goToBottomButton) {
          goToBottomButton.addEventListener("click", function () {
            // Scroll to the bottom of the page
            window.scrollTo({
              top: document.documentElement.scrollHeight,
              behavior: "smooth", // You can use 'auto' or 'smooth' for smooth scrolling
            });
          });
        }

        // Reload Page Functionality
        const reloadPageButton = document.getElementById("reloadPage");
        reloadPageButton.addEventListener("click", function () {
          location.reload();
        });

        // Steam Enhanced Toggle
        const steamEnhancedToggle = document.getElementById(
          "steamEnhancedToggle",
        );
        const steamEnhancedContainer = document.getElementById(
          "steamEnhancedContainer",
        );
        const steamEnhanced = document.getElementById("steamEnhanced");
        const isExpanded =
          localStorage.getItem("steamEnhancedExpanded") === "true";
        if (isExpanded) {
          steamEnhanced.classList.add("expanded");
          steamEnhancedToggle.classList.toggle("toggle");
          steamEnhancedContainer.classList.toggle("hide");
        }

        steamEnhancedToggle.addEventListener("click", function () {
          // console.log("steamEnhancedToggle clicked");
          steamEnhanced.classList.toggle("expanded");
          steamEnhancedToggle.classList.toggle("toggle");
          steamEnhancedContainer.classList.toggle("hide");

          // Save 'pinned' class state to local storage
          const isCurrentlyExpanded =
            steamEnhanced.classList.contains("expanded");
          localStorage.setItem("steamEnhancedExpanded", isCurrentlyExpanded);

          // Toggle 'toggle' class on steamEnhancedPin
          steamEnhancedToggle.classList.toggle("toggle");
        });

        // Steam Enhanced Pin
        const steamEnhancedPin = document.getElementById("steamEnhancedPin");
        const isPinned = localStorage.getItem("steamEnhancedPinned") === "true";
        if (isPinned) {
          steamEnhanced.classList.add("pinned");
          steamEnhancedPin.classList.add("toggle");
        }

        steamEnhancedPin.addEventListener("click", function () {
          // console.log("steamEnhancedPin clicked");
          steamEnhanced.classList.toggle("pinned");

          // Save 'pinned' class state to local storage
          const isCurrentlyPinned = steamEnhanced.classList.contains("pinned");
          localStorage.setItem("steamEnhancedPinned", isCurrentlyPinned);

          // Toggle 'toggle' class on steamEnhancedPin
          steamEnhancedPin.classList.toggle("toggle");
        });

        // Steam Chat Popup
        function openSteamChat() {
          // URL to open in the popup window
          const url = "https://steamcommunity.com/chat/";

          // Define the properties of the popup window
          const popupWidth = 1035;
          const popupHeight = 800;
          const popupOptions = `width=${popupWidth},height=${popupHeight},top=${(window.innerHeight - popupHeight) / 2},left=${
            (window.innerWidth - popupWidth) / 2
          },resizable=yes,scrollbars=yes,status=yes`;

          // Open the popup window
          const popupWindow = window.open(url, "SteamChatPopup", popupOptions);

          // Focus the popup window (optional)
          if (popupWindow) {
            popupWindow.focus();
          }
        }

        const steamChatLink = document.getElementById("steamChatLink"); // Replace with the actual ID or selector of your link
        if (steamChatLink) {
          steamChatLink.addEventListener("click", function (event) {
            event.preventDefault(); // Prevent the default link behavior
            openSteamChat(); // Call the function to open the popup window
          });
        }

        // SteamID Lookup
        function getSteamIDFromCookie() {
          const match = document.cookie.match(
            /(?:^|;\s*)steamLoginSecure=([^;]*)/,
          );
          if (!match) {
            return null;
          }
          try {
            const decoded = decodeURIComponent(match[1]);
            const steamID = decoded.split("||")[0];
            return /^\d{17}$/.test(steamID) ? steamID : null;
          } catch (e) {
            console.warn("SteamID cookie decode failed:", e);
            return null;
          }
        }

        function getSteamID() {
          const pageWin =
            typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
          const gID = pageWin.g_steamID || window.g_steamID;
          if (typeof gID === "string" && /^\d{17}$/.test(gID)) {
            return gID;
          }
          try {
            const configEl = document.querySelector("#application_config");
            const raw = configEl?.dataset?.userinfo;
            if (raw) {
              const userinfo = JSON.parse(raw);
              const candidate =
                userinfo.steamid ||
                userinfo.steamID ||
                userinfo.steamid64 ||
                userinfo.ulSteamID;
              if (candidate) {
                return candidate;
              }
              console.warn(
                "SteamID keys found:",
                Object.keys(userinfo).join(","),
              );
            } else {
              console.warn("SteamID debug:", {
                gType: typeof gID,
                configFound: !!configEl,
              });
            }
          } catch (e) {
            console.warn("SteamID config parse failed:", e);
          }
          const fromCookie = getSteamIDFromCookie();
          if (fromCookie) {
            return fromCookie;
          }
          const urlMatch = window.location.href.match(/\/profiles\/(\d{17})/);
          if (urlMatch) {
            return urlMatch[1];
          }
          return null;
        }

        const steamID = getSteamID();
        console.log("SteamID:", steamID);
        const steamIDLink = document.getElementById("steamIDLink");
        if (steamIDLink) {
          steamIDLink.addEventListener("click", function (event) {
            event.preventDefault();
            if (!steamID) {
              console.warn("No valid SteamID found, are you logged in?");
              return;
            }
            const steamIDURL = "https://steamid.io/lookup/" + steamID;
            openInNewTab(steamIDURL);
          });
        } else if (!steamID) {
          console.log("No valid userinfo found, are you logged in?");
        }

        function openInNewTab(url) {
          const newTab = window.open(url, "_blank");
          if (newTab) {
            newTab.focus();
          }
        }

        // Toggle details elements to close
        // Get all details elements
        const detailsElements = document.querySelectorAll("details");

        // Add event listener to each details element
        detailsElements.forEach((detailsElement) => {
          detailsElement.addEventListener("click", () => {
            // Close all other details elements
            detailsElements.forEach((otherDetails) => {
              if (otherDetails !== detailsElement) {
                otherDetails.removeAttribute("open");
              }
            });
          });
        });
      }
      setTimeout(setUploadArtworkButton, 0);
    });
  })();

  //* ========================================================================== //
  //* 2. Symbols & Characters
  //* =======================================================================

  //* ========================================================================== //
  //* 3. Steam Profile Artwork Tool Buttons
  //* =======================================================================

  (function () {
    "use strict";
    // Check if
    checkElement(".createCollectionArrow").then((element) => {
      console.log(".createCollectionArrow exists");
      function setMainContents() {
        // Create Steam Profile Artwork Tool Buttons Container
        const steamProfileArtworkContainer = document.createElement("div");
        steamProfileArtworkContainer.className = "steamProfileArtworkContainer";
        // Create Buttons
        steamProfileArtworkContainer.innerHTML = `
  <div class="pageTitle">Steam Profile Artwork Tool</div>
  <div class="buttonsContainer">
    <a id="blankTitleButton" class="btn_darkblue_white_innerfade btn_medium" style="margin: 2px">
      <span style="padding-left: 16px; padding-right: 16px;">Set Blank Title</span>
    </a>
    <div class="customArtworkButtons">
    <details>
        <summary class="btn_darkblue_white_innerfade btn_medium enable-custom-artwork-button">Enable Custom Uploads</summary>
        <div class="customArtworkButtonsWrapper">
          <a id="customArtworkButton" class="btn_medium" style="margin: 2px;">
          <span style="padding-left: 16px; padding-right: 16px;">Custom Artwork</span>
          </a>
          <a id="longScreenshotButton" class="btn_medium" style="margin: 2px;">
          <span style="padding-left: 16px; padding-right: 16px;">Screenshot</span>
          </a>
          <a id="longWorkshopButton" class="btn_medium" style="margin: 2px;">
          <span style="padding-left: 16px; padding-right: 16px;">Long Workshop</span>
          </a>
          <a id="longGuideButton" class="btn_medium" style="margin: 2px;">
          <span style="padding-left: 16px; padding-right: 16px;">Long Guide</span>
          </a>
        </div>
    </details>
  </div>
    <a id="resetButton" class="btn_darkblue_white_innerfade btn_medium" style="margin: 0 0 0 5px;background:#171a21">
    <span style="padding-left: 16px; padding-right: 14px;background:#171a21">Reset</span>
    </a>
  </div>`;
        // Grab mainContentsDiv element reference
        const mainContentsDiv = document.querySelector("#mainContents");
        // Insert the Buttons
        mainContentsDiv.parentNode.insertBefore(
          steamProfileArtworkContainer,
          mainContentsDiv,
        );
      }
      setTimeout(setMainContents, 0);
    });
  })();

  (function () {
    "use strict";
    // Check if
    checkElement(".apphub_HomeHeader").then((element) => {
      // console.log("apphub_HomeHeader exists");
      function setBlankTitleButton() {
        // ----------------------------
        // Fill Blank Title Button
        // ----------------------------
        const blankTitleCharacter = "⠀";
        const alertBlankTitleSet = document.createElement("div");
        alertBlankTitleSet.className = "alertBlankTitleSet";
        alertBlankTitleSet.innerHTML = `<span><i>✔</i> Blank Title Set</span>`;
        const titleFieldInput = document.querySelector(".titleField");
        const blankTitleButton = document.querySelector("#blankTitleButton");
        const titleFieldParent = titleFieldInput.parentNode;
        blankTitleButton.addEventListener("click", () => {
          // console.log("#blankTitleButton clicked");
          blankTitleButton.classList.add("blank-title-added");
          titleFieldInput.value = blankTitleCharacter;
          titleFieldInput.classList.add("fieldInputSuccess");
          alertBlankTitleSet.classList.add("fadeIn");
          titleFieldParent.insertBefore(
            alertBlankTitleSet,
            titleFieldInput.nextSibling,
          );
        });
      }
      setTimeout(setBlankTitleButton, 0);
    });
  })();

  // Custom artwork enabled notification
  const alertCustomArtworkEnabled = document.createElement("div");
  alertCustomArtworkEnabled.className = "alertCustomArtworkEnabled";
  alertCustomArtworkEnabled.innerHTML = `<span><i>✔</i> Upload Custom Artwork Enabled</span>`;
  // Long workshop enabled notification
  const alertLongWorkshopEnabled = document.createElement("div");
  alertLongWorkshopEnabled.className =
    "alertCustomArtworkEnabled longWorkshopEnabled";
  alertCustomArtworkEnabled.classList.add("longWorkshopEnabled");
  alertLongWorkshopEnabled.innerHTML = `<span><i>✔</i> Upload Long Workshop Enabled</span>`;
  // Long guide enabled notification
  const alertLongGuideEnabled = document.createElement("div");
  alertLongGuideEnabled.className =
    "alertCustomArtworkEnabled longGuideEnabled";
  alertCustomArtworkEnabled.classList.add("longGuideEnabled");
  alertLongGuideEnabled.innerHTML = `<span><i>✔</i> Upload Long Guide Enabled</span>`;
  // Long guide enabled notification
  const hexEditWebsite = document.createElement("div");
  hexEditWebsite.className = "modifyArtworkInstructions";
  hexEditWebsite.innerHTML = `<blockquote class="bb_blockquote">This method allows you to upload long workshop images without faking the heights.
  <br />This method works with all supported file types independently of size and frame count. <br />You are expected
  to apply the instructions below for all workshop images separately. <div class="description">
      <ol>
          <li>Visit this site: <a href="https://hexed.it" target="_blank">https://hexed.it</a></li>
          <li>Click <b>"Open File"</b> and select your image</li>
          <li>Scroll to the very bottom of the page</li>
          <li>Replace the last byte of your file with <code>21</code></li>
          <li>Click <b>"Export"</b> and save your modified image</li>
          <li>Upload your artwork via the <b>"Choose File"</b> button below</li>
      </ol>
  </div>
  <div class="hexEditInstructionsVideo">
      <details>
          <summary>Video instructions</summary>
          <div class="embed-container"><iframe
                  src="https://www.dropbox.com/s/6ilvut3br5dnks3/HexEdit-Instructions.mp4?raw=1" allowfullscreen
                  style="border:0"></iframe></div>
      </details>
</blockquote>
</div>`;

  (function () {
    "use strict";
    // Check if
    checkElement("#file").then((element) => {
      // console.log("#file exists");
      function setFileUpload() {
        // Buttons selectors
        const fileUploadButton = document.querySelector("#file");
        const customArtworkButton = document.querySelector(
          "#customArtworkButton",
        );
        const longScreenshotButton = document.querySelector(
          "#longScreenshotButton",
        );
        const longWorkshopButton = document.querySelector(
          "#longWorkshopButton",
        );
        const longGuideButton = document.querySelector("#longGuideButton");
        const resetButton = document.querySelector("#resetButton");
        const selectArtworkTitle = document.querySelector(
          ".detailBox:nth-of-type(2) .title",
        );
        const fileUploadParent = fileUploadButton.parentNode;
        let details = [...document.querySelectorAll("details")];

        // Scroll functions
        function scrollToChooseFileButton() {
          document
            .querySelectorAll(".detailBox")[1]
            .scrollIntoView({ behavior: "smooth", block: "start" });
        }
        function customArtworkUploadEnable() {
          console.log("Custom Artwork Upload Enabled");
          ($J("#image_width").val(1000).attr("id", ""),
            $J("#image_height").val(1).attr("id", ""));
          setTimeout(scrollToChooseFileButton, 0);
        }
        function customWorkshopUploadEnable() {
          console.log("Workshop Upload Enabled");
          $J("[name=consumer_app_id]").val(480);
          $J("[name=file_type]").val(0);
          $J("[name=visibility]").val(0);
          setTimeout(scrollToChooseFileButton, 0);
        }
        function longGuideUploadEnable() {
          console.log("Long guide Upload Enabled");
          $J("[name=consumer_app_id]").val(767);
          $J("[name=file_type]").val(9);
          $J("[name=visibility]").val(0);
          setTimeout(scrollToChooseFileButton, 0);
        }
        function longScreenshotUploadEnable() {
          console.log("Long screenshot Upload Enabled");
          $J("#image_width").val("1000");
          $J("#image_height").val("1");
          $J('[name="file_type"]').val("5");
          setTimeout(scrollToChooseFileButton, 0);
        }
        function resetUploads() {
          console.log("Resetting uploads");
          location.reload();
        }
        const agreeTermsInput = document.querySelector("#agree_terms");
        // Buttons event listeners
        customArtworkButton.addEventListener("click", () => {
          customArtworkUploadEnable();
          agreeTermsInput.checked = true;
          fileUploadParent.insertBefore(
            alertCustomArtworkEnabled,
            fileUploadButton.nextSibling,
          );
          details[0].removeAttribute("open");
        });
        longScreenshotButton.addEventListener("click", () => {
          longScreenshotUploadEnable();
          agreeTermsInput.checked = true;
          fileUploadParent.insertBefore(
            alertCustomArtworkEnabled,
            fileUploadButton.nextSibling,
          );
          details[0].removeAttribute("open");
        });
        longWorkshopButton.addEventListener("click", () => {
          customWorkshopUploadEnable();
          agreeTermsInput.checked = true;
          selectArtworkTitle.textContent = "Modify your artwork";
          fileUploadParent.insertBefore(
            alertLongWorkshopEnabled,
            fileUploadButton,
          );
          fileUploadParent.insertBefore(hexEditWebsite, fileUploadButton);
          details[0].removeAttribute("open");
        });
        longGuideButton.addEventListener("click", () => {
          longGuideUploadEnable();
          agreeTermsInput.checked = true;
          selectArtworkTitle.textContent = "Modify your artwork";
          fileUploadParent.insertBefore(
            alertLongGuideEnabled,
            fileUploadButton,
          );
          fileUploadParent.insertBefore(hexEditWebsite, fileUploadButton);
          details[0].removeAttribute("open");
        });
        resetButton.addEventListener("click", () => {
          resetUploads();
        });
        // Details open close functionality
        document.addEventListener("click", function (e) {
          if (!details.some((f) => f.contains(e.target))) {
            details.forEach((f) => f.removeAttribute("open"));
          } else {
            details.forEach((f) =>
              !f.contains(e.target) ? f.removeAttribute("open") : "",
            );
          }
        });
      }
      setTimeout(setFileUpload, 0);
    });
  })();

  //* ==========================================================================
  //* 4. Steam Mass Comments Poster Vanilla
  //* ==========================================================================

  (function () {
    "use strict";
    // Check if
    checkElement("#manage_friends").then((element) => {
      console.log("#manage_friends exists");

      const postingDelay = 7; // Seconds in between posting profile comments
      const manageFriendsSelector = document.querySelector(
        "#manage_friends > .row",
      );
      const manageFriendsSelectorParent =
        document.querySelector("#manage_friends");

      const manageFriendsComments = document.createElement("div");
      manageFriendsComments.className = "friends-comments-textarea";
      manageFriendsComments.innerHTML = `<div class="row commentthread_entry" style="background-color: initial; padding-right: 24px;">
    <div class="commentthread_entry_quotebox">
        <textarea rows="3" class="commentthread_textarea" id="comment_textarea" placeholder="Add a comment" style="overflow: hidden; height: 20px;"></textarea>
    </div>
    <div class="commentthread_entry_submitlink" style="">
        <a class="btn_grey_black btn_small_thin" href="javascript:CCommentThread.FormattingHelpPopup('Profile');">
        <span>Formatting help</span>
        </a>
        <span class="emoticon_container">
        <span class="emoticon_button small" id="emoticonbtn">
        </span>
        </span>
        <span class="btn_green_white_innerfade btn_small" id="comment_submit">
        <span>Post Comments to Selected Friends</span>
        </span>
    </div>
  </div>
  <div class="row" id="log">
    <span id="log_head"></span>
    <span id="log_body"></span>
  </div>`;

      // ToggleManageFriends();

      manageFriendsSelectorParent.parentNode.appendChild(
        manageFriendsComments,
        manageFriendsSelectorParent,
      );

      manageFriendsSelectorParent.insertBefore(
        manageFriendsComments,
        manageFriendsSelector,
      );

      const commentSubmitButton = document.querySelector("#comment_submit");
      const commentTextarea = document.querySelector("#comment_textarea");
      const commentLogHead = document.querySelector("#log_head");
      const commentLogBody = document.querySelector("#log_body");

      commentSubmitButton.addEventListener("click", (e) => {
        // e.preventDefault();
        const selectedCheckbox = document.querySelector(".selected");
        const totalSelected = selectedCheckbox?.length;
        const commentMessage = commentTextarea.value;
        if (totalSelected === 0 || commentMessage.length === 0) {
          alert(
            "Please make sure you entered a message and selected 1 or more friends.",
          );
          return;
        }

        commentLogHead.innerHTML = "";
        commentLogBody.innerHTML = "";

        document.querySelectorAll(".selected").forEach((elem, i) => {
          let profileID = elem.dataset.steamid;
          setTimeout(
            () => {
              let xhr = new XMLHttpRequest();
              xhr.open(
                "POST",
                `//steamcommunity.com/comment/Profile/post/${profileID}/-1/`,
                true,
              );
              xhr.setRequestHeader(
                "Content-Type",
                "application/x-www-form-urlencoded; charset=UTF-8",
              );
              xhr.onloadend = (response) => {
                // let logBody = document.querySelector('#log_body')[0];
                commentLogBody.innerHTML += `<br>${
                  response.success === false
                    ? response.error
                    : 'Successfully posted comment on <a href="https://steamcommunity.com/profiles/${profileID}/#commentthread_Profile_${profileID}_0_area">' +
                      profileID +
                      "</a>"
                }`;
                document
                  .querySelector(
                    `.friend_block_v2[data-steamid="${profileID}"]`,
                  )
                  .classList.remove("selected");
                document.querySelector(
                  `.friend_block_v2[data-steamid="${profileID}"] .select_friend_checkbox`,
                ).checked = false;
                UpdateSelection();
              };
              xhr.send(
                `comment=${commentMessage}&count=6&sessionid=${g_sessionID}`,
              );
            },
            postingDelay * i * 1000,
          );
        });
      });
    });
  })();

  //* ==========================================================================
  //* 5. Steam Copy Avatar Frame Source
  //* ==========================================================================

  function copySrcValueToClipboard() {
    // Get the div element with the class "avatarFrame"
    var avatarFrame = document.querySelector(".avatarFrame");

    // Check if the div element exists
    if (avatarFrame) {
      // Get the img element inside the div
      var imgElement = avatarFrame.querySelector("img");

      // Check if the img element exists
      if (imgElement) {
        // Get the src attribute value
        var srcValue = imgElement.src;

        // Display the src value in a prompt for manual copying
        prompt("Copy the src value:", srcValue);
      } else {
        console.error("No img element found inside the avatarFrame div.");
      }
    } else {
      console.error('No element found with the class "avatarFrame".');
    }
  }

  // Call the function to copy the src value to the clipboard
  // copySrcValueToClipboard();

  //* ==========================================================================
  //* 6. Steam Replace Avatar Frame Source
  //* ==========================================================================

  function replaceSrcValue() {
    // Get the div element with the class "profile_avatar_frame"
    var avatarFrame = document.querySelector(".profile_avatar_frame");

    // Check if the div element exists
    if (avatarFrame) {
      // Get the img element inside the div
      var imgElement = avatarFrame.querySelector("img");

      // Check if the img element exists
      if (imgElement) {
        // Prompt the user to enter the new src value
        var newSrcValue = prompt("Enter the new src value:");

        // Check if the user entered a value
        if (newSrcValue !== null) {
          // Update the src attribute of the img element
          imgElement.src = newSrcValue;
          console.log("Src value updated successfully:", newSrcValue);
        } else {
          console.log("Operation canceled by user.");
        }
      } else {
        console.error(
          "No img element found inside the profile_avatar_frame div.",
        );
      }
    } else {
      console.error('No element found with the class "profile_avatar_frame".');
    }
  }

  // Call the function to replace the src value
  // replaceSrcValue();

  //* ==========================================================================
  //* 7. Reload Steam market function
  //* ==========================================================================

  //

  // (function () {
  //   "use strict";

  //   // Reload page button if Steam encountered an error or auto reload is enabled.
  //   // console.log("Reload Steam market function");
  //   const targetNode = document.body;

  //   const config = { childList: true, subtree: true };
  //   let reloadInProgress = false;

  //   const createReloadText = function () {
  //     const reloadText = document.createElement("div");
  //     reloadText.textContent = "Auto Reload Errors is enabled. Reloading page in 5 seconds";
  //     reloadText.style.position = "fixed";
  //     reloadText.style.bottom = "10px";
  //     reloadText.style.right = "50%";
  //     reloadText.style.transform = "translateX(-50%)";
  //     reloadText.style.zIndex = "9999";
  //     reloadText.style.color = "#ffffff";
  //     reloadText.style.backgroundColor = "#171d25";
  //     reloadText.style.padding = "10px 15px";
  //     reloadText.style.borderRadius = "5px";
  //     reloadText.classList.add("auto-reload-text");

  //     document.body.appendChild(reloadText);

  //     return reloadText;
  //   };

  //   const createRefreshButton = function () {
  //     const refreshButton = document.createElement("button");
  //     refreshButton.textContent = "Reload Page";
  //     refreshButton.style.position = "fixed";
  //     refreshButton.style.top = "10px";
  //     refreshButton.style.right = "10px";
  //     refreshButton.style.zIndex = "9999";
  //     refreshButton.style.minWidth = "auto";
  //     refreshButton.style.padding = "10px";
  //     refreshButton.style.margin = "10px 0 0 0";
  //     refreshButton.classList.add("btn_blue_white_innerfade", "btn_medium");
  //     refreshButton.addEventListener("click", function () {
  //       location.reload();
  //     });

  //     // document.body.appendChild(refreshButton);

  //     return refreshButton;
  //   };

  //   const autoReload = function () {
  //     const autoReloadErrors = localStorage.getItem("autoReloadErrors");
  //     if (autoReloadErrors === "true") {
  //       console.log("Auto Reload Errors enabled. Reloading page in 5 seconds...");
  //       const reloadText = createReloadText();
  //       reloadInProgress = true;
  //       // Reload the page every 5 seconds if autoReloadErrors is enabled
  //       setTimeout(() => {
  //         if (reloadInProgress) {
  //           console.log("Reloading page due to error...");
  //           location.reload();
  //         }
  //       }, 5000);
  //     } else {
  //       console.log("Auto Reload Errors not enabled. Creating reload button.");
  //       // Create reload button if auto reload is not enabled
  //       createRefreshButton();
  //       // Disconnect the observer to stop further checks
  //       observer.disconnect();
  //     }
  //   };

  //   const callback = function (mutationsList, observer) {
  //     if (reloadInProgress) return; // If reload in progress, do nothing
  //     for (const mutation of mutationsList) {
  //       if (mutation.type === "childList") {
  //         // Check if the added node is the desired div element
  //         const errorDiv = document.querySelector(".market_listing_table_message");
  //         if (
  //           errorDiv &&
  //           (errorDiv.textContent.trim() === "There was an error performing your search. Please try again later." ||
  //             errorDiv.textContent.trim() === "There was an error getting listings for this item. Please try again later.")
  //         ) {
  //           autoReload();
  //           break;
  //         }
  //       }
  //     }
  //   };

  //   const observer = new MutationObserver(callback);

  //   // Start observing the target node for configured mutations
  //   observer.observe(targetNode, config);
  // })();

  //* ==========================================================================
  //* 9. Steam Comments Deleter
  //* ==========================================================================

  (function () {
    // Define the interval in milliseconds
    var interval = 1000;

    // Check if elements with href containing 'CCommentThread.DeleteComment' exist
    if (document.querySelector("[href*='CCommentThread.DeleteComment']")) {
      // Get all elements with href containing 'CCommentThread.DeleteComment'
      var deleteLinks = document.querySelectorAll(
        "[href*='CCommentThread.DeleteComment']",
      );
      deleteLinks.forEach(function (link) {
        // Insert the custom action links after each found element
        link.insertAdjacentHTML(
          "afterend",
          '<a class="actionlink"> | </a><a class="actionlink delAllComments">Delete Everything</a><a class="actionlink"> | </a><a class="actionlink delAuthorComments">Delete Everything From This Author</a>',
        );
      });

      // Add event listener to "Delete Everything" link
      document.querySelectorAll(".delAllComments").forEach(function (btn) {
        btn.addEventListener("click", function () {
          if (confirm("Are you sure you want to delete all comments?")) {
            var delComments = setInterval(function () {
              var deleteLink = document.querySelector(
                "[href*='CCommentThread.DeleteComment']",
              );
              if (deleteLink) {
                // Using eval is not recommended. Replace this with safer code if possible.
                eval(deleteLink.getAttribute("href"));
              } else {
                clearInterval(delComments);
              }
            }, interval);
          }
        });
      });

      // Add event listener to "Delete Everything From This Author" link
      document.querySelectorAll(".delAuthorComments").forEach(function (btn) {
        btn.addEventListener("click", function () {
          if (
            confirm(
              "Are you sure you want to delete all comments from this author?",
            )
          ) {
            var author = btn.parentElement
              .querySelector(".commentthread_author_link")
              .getAttribute("data-miniprofile");
            var delComments = setInterval(function () {
              var authorComments = document.querySelectorAll(
                ".commentthread_comment_author [data-miniprofile='" +
                  author +
                  "']",
              );
              if (authorComments.length > 0) {
                authorComments.forEach(function (comment) {
                  var deleteLink = comment
                    .closest(".comment")
                    .querySelector("[href*='CCommentThread.DeleteComment']");
                  if (deleteLink) {
                    // Using eval is not recommended. Replace this with safer code if possible.
                    eval(deleteLink.getAttribute("href"));
                  }
                });
              } else if (
                document.querySelector(".commentthread_pagelinks .active + *")
              ) {
                // Click the next page link if it exists
                document
                  .querySelector(".commentthread_pagelinks .active + *")
                  .click();
              } else {
                clearInterval(delComments);
              }
            }, interval);
          }
        });
      });
    }
  })();

  //* ==========================================================================
  //* 10. Steam Screenshots Middle Click
  //* ==========================================================================

  (function () {
    "use strict";

    function wrapScreenshotCards() {
      // Find all screenshot cards that haven't been wrapped yet
      const cards = document.querySelectorAll(
        ".apphub_Card.modalContentLink[data-modal-content-url]:not([data-enhanced-wrapped])",
      );

      cards.forEach((card) => {
        // Mark as wrapped to avoid duplicates
        card.setAttribute("data-enhanced-wrapped", "true");

        // Get the URL
        const url = card.getAttribute("data-modal-content-url");

        // Create wrapper anchor
        const wrapper = document.createElement("a");
        wrapper.href = url;
        wrapper.target = "_blank";
        wrapper.rel = "noopener noreferrer";
        wrapper.style.cssText =
          "position: relative; display: block; text-decoration: none; z-index: 1;";

        // Move card into wrapper
        card.parentNode.insertBefore(wrapper, card);
        wrapper.appendChild(card);

        // Ensure card has pointer-events for left-click modal
        card.style.pointerEvents = "auto";
      });
    }

    // Initial wrap
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", wrapScreenshotCards);
    } else {
      setTimeout(wrapScreenshotCards, 100);
    }

    // Re-wrap for dynamic content (pagination/infinite scroll)
    const observer = new MutationObserver(() => {
      setTimeout(wrapScreenshotCards, 50);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  })();

  //* ========================================================================== //
  //* Initialize Theme Manager
  //* ========================================================================== //
  new ThemeManager(STEAM_ENHANCED_CONFIG).init();
})();
