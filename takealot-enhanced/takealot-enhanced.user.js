// ==UserScript==
// @name         Takealot Enhanced
// @namespace    https://github.com/schalkburger/website-enhancements
// @include      https://*.takealot.com/*
// @match        https://*.takealot.com/*
// @version      1.1.1
// @author       Schalk Burger <schalkb@gmail.com>
// @description  Takealot Enhanced
// @license MIT
// ==/UserScript==

;(function () {
    'use strict'
    // Init script
    let version = GM_info.script.version
    console.log(`Takealot Enhanced ${version}`)

    // Remove annoying Takealot donation requests

    function removeDonationModal() {
        // Find the element with the specified class names
        const closeButton = document.querySelector(
            '[data-ref="modal-primary-button"]'
        )

        // Check if the element was found
        if (closeButton) {
            // Remove the element from the DOM
            closeButton.click()
            console.log(
                '%c Fuck off with your donation shit Takealot',
                'color: red; font-family:monospace; font-size: 20px'
            )
        } else {
            console.log('Element not found. Retrying in 500ms.')
            setTimeout(removeDonationModal, 500) // Retry after 500 milliseconds
        }
    }

    // Start the process
    removeDonationModal()
})()
