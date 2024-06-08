const open = require("open");

// node pomofocus-popup.js
// Opens the URL in the default web browser
open("https://pomofocus.io/app", {
  app: {
    arguments: ["--new-window", "--width=440", "--height=375"],
  },
});
