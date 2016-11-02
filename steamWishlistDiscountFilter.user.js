// ==UserScript==
// @name        Steam Wishlist Discount Filter
// @description Adds the option to show only discounted items in your Steam wishlist.
// @namespace   Xiyng
// @include     https://steamcommunity.com/id/*/wishlist
// @include     https://steamcommunity.com/id/*/wishlist/*
// @version     1.0
// @grant       none
// ==/UserScript==

var checkbox;
var normallyPricedGames;

document.addEventListener("DOMContentLoaded", initialize);

/**
 * Adds the toggle area, and gets the list of normally priced games.
 */
function initialize() {
    addToggleArea();
    normallyPricedGames = getNormallyPricedGames();
    checkbox.disabled = false;
}

/**
 * Adds the area for toggling whether normally priced games are shown.
 */
function addToggleArea() {
    var wishlist = document.getElementById("wishlist_items");
    var toggleArea = document.createElement("div");
    toggleArea.style.marginBottom = "1em";

    checkbox = document.createElement("input");
    checkbox.id = "wishlistToggleCheckbox";
    checkbox.setAttribute("type", "checkbox");
    checkbox.addEventListener("change", updateShownGames);
    checkbox.disabled = true;
    toggleArea.appendChild(checkbox);

    var label = document.createElement("label");
    label.setAttribute("for", "wishlistToggleCheckbox");
    label.textContent = "Show only discounted items";
    toggleArea.appendChild(label);

    wishlist.parentNode.insertBefore(toggleArea, wishlist);
}

/**
 * Gets the list of normally priced games.
 * @returns {HTMLElement[]} List of normally priced games
 */
function getNormallyPricedGames() {
    var normallyPricedGames = [];
    var wishlist = document.getElementById("wishlist_items");
    var wishlistItems = wishlist.children;
    for (var i = 0; i < wishlistItems.length; i++) {
        var wishlistItem = wishlistItems[i];
        var discount = wishlistItem
            .getElementsByClassName("wishlistRowItem")[0]
            .getElementsByClassName("gameListPriceData")[0]
            .getElementsByClassName("discount_block discount_block_inline")[0];
        if (!discount) {
            normallyPricedGames.push(wishlistItem);
        }
    }
    return normallyPricedGames;
}

/**
 * Shows or hides the specified nodes.
 * @param {HTMLElement} nodes - Nodes to manipulate
 * @param {Boolean} show - true shows the nodes, false hides them
 */
function displayNodes(nodes, show) {
    var display = show ? "block" : "none";
    for (var i = 0; i < nodes.length; i++) {
        nodes[i].style.display = display;
    }
}

/**
 * Updates the list of shown games according to status of the checkbox.
 */
function updateShownGames() {
    displayNodes(normallyPricedGames, !checkbox.checked);
}
