// ==UserScript==
// @name        Steam Wishlist Discount Filter
// @description Adds the option to show only discounted items in your Steam wishlist.
// @namespace   Xiyng
// @include     https://steamcommunity.com/id/*/wishlist
// @include     https://steamcommunity.com/id/*/wishlist/*
// @version     1.1
// @grant       none
// ==/UserScript==

var initialized = false;
var showOnlyDiscountedItemsCheckbox;
var percentageLabel;
var percentageInput;
var normallyPricedItems;
var discountedItems;
var inputTimer; // for adding a delay to updating the item list when changing minimum discount percentage
var showOnlyDiscountedItems = false;
var minimumDiscountPercentage = 1;

document.addEventListener("DOMContentLoaded", initialize);
window.addEventListener("load", initialize); // for problematic browsers

/**
 * Adds the toggle area, and gets the list of normally priced games.
 */
function initialize() {
    if (initialized) {
        return;
    }

    addControls();
    updateItemLists();
    initialized = true;
}

/**
 * Wishlist item details
 * @constructs itemDetails
 * @param {HTMLElement} node - Item node
 */
function itemDetails(node) {
    this.node = node;

    this.display = function(display) {
        var displayValue = display ? "block" : "none";
        this.node.style.display = displayValue;
    };
}

/**
 * Discounted wishlist item details
 * @constructs discountedItemDetails
 * @param {HTMLElement} node - Item node
 * @param {Number} discountPercentage - Discount percentage of the item
 */
function discountedItemDetails(node, discountPercentage) {
    itemDetails.call(this, node);
    this.discountPercentage = discountPercentage;
}

/**
 * Adds controls for the script.
 */
function addControls() {
    var wishlist = document.getElementById("wishlist_items");
    var controls = document.createElement("div");
    controls.style.display = "inline";

    var discountDiv = document.createElement("div");
    discountDiv.style.textAlign = "right";

    showOnlyDiscountedItemsCheckbox = document.createElement("input");
    showOnlyDiscountedItemsCheckbox.id = "showOnlyDiscountedItemsCheckbox";
    showOnlyDiscountedItemsCheckbox.setAttribute("type", "checkbox");
    showOnlyDiscountedItemsCheckbox.addEventListener("change", checkboxChanged);
    discountDiv.appendChild(showOnlyDiscountedItemsCheckbox);

    var checkboxLabel = document.createElement("label");
    checkboxLabel.setAttribute("for", "showOnlyDiscountedItemsCheckbox");
    checkboxLabel.textContent = "Show only discounted items";
    discountDiv.appendChild(checkboxLabel);

    controls.appendChild(discountDiv);

    percentageDiv = document.createElement("div");
    percentageDiv.style.textAlign = "right";

    var percentageLabel = document.createElement("label");
    percentageLabel.setAttribute("for", "discountPercentageInput");
    percentageLabel.textContent = "Minimum discount percentage";
    percentageLabel.style.marginRight = "0.5em";
    percentageDiv.appendChild(percentageLabel);

    percentageInput = document.createElement("input");
    percentageInput.id = "discountPercentageInput";
    percentageInput.setAttribute("type", "number");
    percentageInput.setAttribute("value", minimumDiscountPercentage);
    percentageInput.setAttribute("min", "0");
    percentageInput.setAttribute("max", "100");
    percentageInput.addEventListener("input", percentageDiscountChanged);
    percentageInput.style.width = "3.5em";
    percentageDiv.appendChild(percentageInput);

    updatePercentageDivVisibility();
    controls.appendChild(percentageDiv);

    enableInputElements(false);
    var disabledSaveAction = document.getElementById("save_action_disabled_1");
    disabledSaveAction.parentNode.insertBefore(controls, disabledSaveAction);
}

/**
 * Updates the visibility of the minimum percentage discount div element. The
 * element is visible when the filter is set to show only discounted items, and
 * otherwise it is be hidden.
 */
function updatePercentageDivVisibility() {
    var percentageDivVisibility = showOnlyDiscountedItems ? "visible" : "hidden";
    percentageDiv.style.visibility = percentageDivVisibility;
}

/**
 * Enables or disables the input elements.
 * @param {Boolean} enable - true enables the elements, false disables them
 */
function enableInputElements(enable) {
    showOnlyDiscountedItemsCheckbox.disabled = !enable;
    percentageInput.disabled = !enable;
}

/**
 * Updates normallyPricedItems and discountedItems. Also disables the input
 * elements at start, then re-enables them at end.
 */
function updateItemLists() {
    enableInputElements(false);

    normallyPricedItems = [];
    discountedItems = [];

    var wishlist = document.getElementById("wishlist_items");
    var wishlistItems = wishlist.children;
    for (var i = 0; i < wishlistItems.length; i++) {
        var wishlistItem = wishlistItems[i];
        var discount = wishlistItem
            .getElementsByClassName("wishlistRowItem")[0]
            .getElementsByClassName("gameListPriceData")[0]
            .getElementsByClassName("discount_block discount_block_inline")[0];
        if (!discount) {
            var item = new itemDetails(wishlistItem);
            normallyPricedItems.push(item);
        }
        else {
            var discountPercentageText = discount
                .getElementsByClassName("discount_pct")[0]
                .textContent;
            var discountPercentage = -parseInt(discountPercentageText);
            var item = new discountedItemDetails(
                wishlistItem, discountPercentage
            );
            discountedItems.push(item);
        }
    }

    enableInputElements(true);
}

/**
 * Handles changes in the status of the checkbox. In practice, mainly updates
 * the list of visible items.
 */
function checkboxChanged() {
    showOnlyDiscountedItems = showOnlyDiscountedItemsCheckbox.checked;
    if (showOnlyDiscountedItems && inputTimer) {
        clearInputTimer();
    }
    var show = showOnlyDiscountedItems ? minimumDiscountPercentage : 0;
    updatePercentageDivVisibility();
    updateShownItems(show);
}

/**
 * Handles updating the item list when the minimum discount percentage input
 * field is changed.
 */
function percentageDiscountChanged() {
    var input = percentageInput.value;
    if (input === "") {
        clearInputTimer();
        return;
    }

    var inputValue = Number.parseInt(input);
    if (input < 0 || input > 100) {
        clearInputTimer();
        return;
    }

    minimumDiscountPercentage = input;
    if (inputTimer) {
        clearInputTimer();
    }
    var callback = function() {
        updateShownItems(minimumDiscountPercentage);
    };
    inputTimer = setTimeout(callback, 500);
}

/**
 * Clears the input timer.
 */
function clearInputTimer() {
    if (inputTimer) {
        clearTimeout(inputTimer);
        inputTimer = null;
    }
}

/**
 * Updates the list of shown items according to the minimum discount percentage.
 * @param {Number} minimumDiscountPercentage - Minimum discount percentage
 */
function updateShownItems(minimumDiscountPercentage) {
    var showNormallyPricedItems = minimumDiscountPercentage === 0;
    for (var i = 0; i < normallyPricedItems.length; i++) {
        var item = normallyPricedItems[i];
        item.display(showNormallyPricedItems);
    }

    for (var i = 0; i < discountedItems.length; i++) {
        var item = discountedItems[i];
        var showItem = item.discountPercentage >= minimumDiscountPercentage;
        item.display(showItem);
    }
}
