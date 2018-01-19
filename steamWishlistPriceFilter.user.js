// ==UserScript==
// @name        Steam Wishlist Price Filter
// @description Adds price filters your Steam wishlist.
// @namespace   Xiyng
// @include     https://steamcommunity.com/id/*/wishlist
// @include     https://steamcommunity.com/id/*/wishlist/*
// @version     1.2.1
// noframes
// @require     https://ajax.googleapis.com/ajax/libs/jquery/3.1.1/jquery.min.js
// @grant       none
// @run-at      document-start
// ==/UserScript==

let priceInput;
let percentageDiv;
let percentageInput;
let unpricedItems;
let normallyPricedItems;
let discountedItems;
let inputTimer; // for adding a delay to updating the item list when changing minimum discount percentage
let maximumPrice = undefined;
let minimumDiscountPercentage = undefined;

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
        let displayValue = display ? "block" : "none";
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
    const wishlist = document.getElementById("wishlist_items");
    const controls = document.createElement("div");
    controls.style.display = "inline";

    const priceDiv = document.createElement("div");
    priceDiv.style.textAlign = "right";

    const priceLabel = document.createElement("label");
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

    percentageDiv = document.createElement("div");
    percentageDiv.style.textAlign = "right";

    const percentageLabel = document.createElement("label");
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

    controls.appendChild(percentageDiv);

    enableInputElements(false);
    const disabledSaveAction = document.getElementById("save_action_disabled_1");
    disabledSaveAction.parentNode.insertBefore(controls, disabledSaveAction);
}

/**
 * Enables or disables the input elements.
 * @param {Boolean} enable - true enables the elements, false disables them
 */
function enableInputElements(enable) {
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

    const wishlist = document.getElementById("wishlist_items");
    const wishlistItems = wishlist.children;
    for (let i = 0; i < wishlistItems.length; i++) {
        const wishlistItem = wishlistItems[i];
        const priceData = wishlistItem
            .getElementsByClassName("wishlistRowItem")[0]
            .getElementsByClassName("gameListPriceData")[0];
        let discount = priceData
            .getElementsByClassName("discount_block discount_block_inline");
        if (discount.length < 1) {
            const priceElements = priceData.getElementsByClassName("price");
            if (!priceElements || priceElements.length < 1) {
                const item = new itemDetails(wishlistItem);
                unpricedItems.push(item);
            }
            else {
                let priceText = priceElements[0].textContent.trim();
                if (priceText !== '' && isNaN(priceText.charAt(0))) {
                    priceText = priceText.substr(1);
                }
                let price = parseFloat(priceText.replace(",", ".")); // should work in most cases - not all
                if (price !== '' && isNaN(price)) {
                    price = 0; // *probably* a free-to-play title
                }
                const item = new pricedItemDetails(wishlistItem, price);
                normallyPricedItems.push(item);
            }
        }
        else {
            discount = discount[0];
            const discountPercentageText = discount
                .getElementsByClassName("discount_pct")[0]
                .textContent;
            const discountPercentage = -parseFloat(discountPercentageText);
            const priceText = discount
                .getElementsByClassName("discount_prices")[0]
                .getElementsByClassName("discount_final_price")[0]
                .textContent;
            const price = parseFloat(priceText);
            const item = new discountedItemDetails(
                wishlistItem, price, discountPercentage
            );
            discountedItems.push(item);
        }
    }

    enableInputElements(true);
}

/**
 * Handles updating the item list when the maximum price input field is changed.
 */
function maximumPriceChanged() {
    const input = priceInput.value;
    if (input === "") {
        maximumPrice = undefined;
    }

    const inputValue = Number.parseFloat(input);
    maximumPrice = isNaN(inputValue) ? undefined : inputValue;

    if (inputTimer) {
        clearInputTimer();
    }
    const callback = function() {
        updateShownItems();
    };
    inputTimer = setTimeout(callback, 500);
}

/**
 * Handles updating the item list when the minimum discount percentage input
 * field is changed.
 */
function percentageDiscountChanged() {
    const input = percentageInput.value;
    if (input === "") {
        minimumDiscountPercentage = undefined;
    }

    const inputValue = Number.parseFloat(input);
    minimumDiscountPercentage = isNaN(inputValue) ? undefined : inputValue;

    if (inputTimer) {
        clearInputTimer();
    }
    const callback = function() {
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
 * Updates the list of shown items according to the maximum price and minimum
 * discount percentage.
 */
function updateShownItems() {
    const maximumPriceSet = !isNaN(maximumPrice);
    const minimumDiscountPercentageSet = !isNaN(minimumDiscountPercentage);
    const showUndiscountedItems =
        !minimumDiscountPercentageSet || minimumDiscountPercentage === 0;

    unpricedItems.forEach(item => item.display(showUndiscountedItems));

    normallyPricedItems.forEach(function(item) {
        const priceGoodEnough =
            maximumPriceSet ? item.price <= maximumPrice : true;
        item.display(showUndiscountedItems && priceGoodEnough);
    })

    discountedItems.forEach(item => {
        const discountGoodEnough = minimumDiscountPercentageSet ?
            item.discountPercentage >= minimumDiscountPercentage : true;
        const priceGoodEnough = maximumPriceSet ?
            item.price <= maximumPrice : true;
        const showItem = discountGoodEnough && priceGoodEnough;
        item.display(showItem);
    });
}
