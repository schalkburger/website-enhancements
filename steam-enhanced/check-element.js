(function () {
    "use strict";
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
    // Check if
    checkElement("body").then((element) => {
        console.log("body exists");
    });
})();