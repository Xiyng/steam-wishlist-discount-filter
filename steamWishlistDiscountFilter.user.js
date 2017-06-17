// ==UserScript==
// @name        Steam Wishlist Discount Filter
// @description Adds the option to show only discounted items in your Steam wishlist.
// @namespace   Xiyng
// @include     https://steamcommunity.com/id/*/wishlist
// @include     https://steamcommunity.com/id/*/wishlist/*
// @version     1.1.2
// noframes
// @require     https://ajax.googleapis.com/ajax/libs/jquery/3.1.1/jquery.min.js
// @grant       none
// @run-at      document-start
// ==/UserScript==

var showOnlyDiscountedItemsCheckbox;
var percentageLabel;
var priceInput;
var percentageInput;
var unpricedItems;
var normallyPricedItems;
var discountedItems;
var inputTimer; // for adding a delay to updating the item list when changing minimum discount percentage
var maximumPrice = undefined;
var showOnlyDiscountedItems = false;
var minimumDiscountPercentage = undefined;

$(document).ready(initialize);

/**
 * Adds the toggle area, and gets the list of normally priced games.
 */
function initialize() {
    addControls();
    updateItemLists();
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
 * Priced wishlist item details
 * @constructs itemDetails
 * @param {HTMLElement} node - Item node
 * @param {Number} price - The price of the item
 */
function pricedItemDetails(node, price) {
    itemDetails.call(this, node);
    this.price = price;
}

/**
 * Discounted wishlist item details
 * @constructs discountedItemDetails
 * @param {HTMLElement} node - Item node
 * @param {Number} price - The price of the item
 * @param {Number} discountPercentage - Discount percentage of the item
 */
function discountedItemDetails(node, price, discountPercentage) {
    pricedItemDetails.call(this, node, price);
    this.normalPrice = price;
    this.discountPercentage = discountPercentage;
}

/**
 * Adds controls for the script.
 */
function addControls() {
    var wishlist = document.getElementById("wishlist_items");
    var controls = document.createElement("div");
    controls.style.display = "inline";

    var priceDiv = document.createElement("div");
    priceDiv.style.textAlign = "right";

    var priceLabel = document.createElement("label");
    priceLabel.setAttribute("for", "maximumPriceInput");
    priceLabel.textContent = "Maximum price";
    priceLabel.style.marginRight = "0.5em";
    priceDiv.appendChild(priceLabel);

    priceInput = document.createElement("input");
    priceInput.id = "maximumPriceInput";
    priceInput.setAttribute("type", "text");
    priceInput.addEventListener("input", maximumPriceChanged);
    priceInput.style.width = "3.5em";
    priceDiv.appendChild(priceInput);

    controls.appendChild(priceDiv);

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
    percentageInput.setAttribute("type", "text");
    if (minimumDiscountPercentage) {
        percentageInput.setAttribute("value", minimumDiscountPercentage);
    }
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
    priceInput.disabled = !enable;
    percentageInput.disabled = !enable;
}

/**
 * Updates normallyPricedItems and discountedItems. Also disables the input
 * elements at start, then re-enables them at end.
 */
function updateItemLists() {
    enableInputElements(false);

    unpricedItems = [];
    normallyPricedItems = [];
    discountedItems = [];

    var wishlist = document.getElementById("wishlist_items");
    var wishlistItems = wishlist.children;
    for (var i = 0; i < wishlistItems.length; i++) {
        var wishlistItem = wishlistItems[i];
        var priceData = wishlistItem
            .getElementsByClassName("wishlistRowItem")[0]
            .getElementsByClassName("gameListPriceData")[0];
        var discount = priceData
            .getElementsByClassName("discount_block discount_block_inline");
        if (discount.length < 1) {
            var priceElements = priceData.getElementsByClassName("price");
            if (!priceElements || priceElements.length < 1) {
                var item = new itemDetails(wishlistItem);
                unpricedItems.push(item);
            }
            else {
                var priceText = priceElements[0].textContent.trim();
                if (priceText !== '' && isNaN(priceText.charAt(0))) {
                    priceText = priceText.substr(1);
                }
                var price = parseFloat(priceText.replace(",", ".")); // should work in most cases - not all
                if (price !== '' && isNaN(price)) {
                    price = 0; // *probably* a free-to-play title
                }
                var item = new pricedItemDetails(wishlistItem, price);
                normallyPricedItems.push(item);
            }
        }
        else {
            discount = discount[0];
            var discountPercentageText = discount
                .getElementsByClassName("discount_pct")[0]
                .textContent;
            var discountPercentage = -parseInt(discountPercentageText);
            var priceText = discount
                .getElementsByClassName("discount_prices")[0]
                .getElementsByClassName("discount_final_price")[0]
                .textContent;
            var price = parseFloat(priceText);
            var item = new discountedItemDetails(
                wishlistItem, price, discountPercentage
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
    updatePercentageDivVisibility();
    updateShownItems();
}

function maximumPriceChanged() {
    var input = priceInput.value;
    if (input === "") {
        maximumPrice = undefined;
    }

    var inputValue = Number.parseInt(input);
    maximumPrice = isNaN(inputValue) ? undefined : inputValue;

    if (inputTimer) {
        clearInputTimer();
    }
    var callback = function() {
        updateShownItems();
    };
    inputTimer = setTimeout(callback, 500);
}

/**
 * Handles updating the item list when the minimum discount percentage input
 * field is changed.
 */
function percentageDiscountChanged() {
    var input = percentageInput.value;
    if (input === "") {
        minimumDiscountPercentage = undefined;
    }

    var inputValue = Number.parseInt(input);
    minimumDiscountPercentage = isNaN(inputValue) ? undefined : inputValue;

    if (inputTimer) {
        clearInputTimer();
    }
    var callback = function() {
        updateShownItems();
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
 */
function updateShownItems() {
    var maximumPriceSet = !isNaN(maximumPrice);
    var minimumDiscountPercentageSet = !isNaN(minimumDiscountPercentage);
    var showUndiscountedItems =
        !showOnlyDiscountedItems ||
        (minimumDiscountPercentageSet && minimumDiscountPercentage === 0);

    for (var i = 0; i < unpricedItems.length; i++) {
        var item = unpricedItems[i];
        item.display(showUndiscountedItems);
    }

    for (var i = 0; i < normallyPricedItems.length; i++) {
        var item = normallyPricedItems[i];
        var priceGoodEnough =
            maximumPriceSet ? item.price <= maximumPrice : true;
        item.display(showUndiscountedItems && priceGoodEnough);
    }

    for (var i = 0; i < discountedItems.length; i++) {
        var item = discountedItems[i];
        var discountGoodEnough = minimumDiscountPercentageSet ?
            item.discountPercentage >= minimumDiscountPercentage : true;
        var priceGoodEnough = maximumPriceSet ?
            item.price <= maximumPrice : true;
        var showItem = discountGoodEnough && priceGoodEnough;
        item.display(showItem);
    }
}
