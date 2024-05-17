// ==UserScript==
// @name         Skribblio Enhanced
// @namespace    https://github.com/schalkburger/website-enhancements
// @match        *://skribbl.io/*
// @include      *://skribbl.io/*
// @version      1.0.2
// @author       Schalk Burger <schalkb@gmail.com>
// @description  Skribblio Enhanced
// @license MIT
// ==/UserScript==

(function () {
  "use strict";

  // Function to scroll to the bottom of the chat content
  function scrollToBottom() {
    var chatContent = document.querySelector(".chat-content");
    chatContent.scrollTop = chatContent.scrollHeight;
  }

  // Observer callback function
  function handleMutation(mutations) {
    mutations.forEach(function (mutation) {
      if (mutation.addedNodes.length > 0) {
        // New node added, scroll to the bottom
        scrollToBottom();
      }
    });
  }

  // Create a MutationObserver
  var observer = new MutationObserver(handleMutation);

  // Target node to observe
  var targetNode = document.querySelector(".chat-content");

  // Configuration of the observer
  var config = { childList: true, subtree: true };

  // Start observing the target node
  observer.observe(targetNode, config);

  // // Simulate adding a new message
  // function addMessage(message) {
  //   var chatContent = document.querySelector(".chat-content");
  //   var newMessage = document.createElement("p");
  //   newMessage.textContent = message;
  //   chatContent.appendChild(newMessage);
  //   // No need to manually scroll here; the observer will handle it
  // }

  // // Example of adding a message
  // addMessage("Hello, this is a new message!");
})();
