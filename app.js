
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";

import {
  getFirestore,
  collection,
  getDocs,
  doc,
  writeBatch,
  serverTimestamp,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

// FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyCiG0M2iO59aJGUge5SokM8nHkC8k4SByE",
  authDomain: "snap-kitchen-b8a73.firebaseapp.com",
  projectId: "snap-kitchen-b8a73",
  storageBucket: "snap-kitchen-b8a73.firebasestorage.app",
  messagingSenderId: "1060475241392",
  appId: "1:1060475241392:web:c3751859ecb085830b8c75",
  measurementId: "G-KRFFRFJY5X"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const DEFAULT_WHATSAPP_NUMBER = "918319014718";

const $ = (id) => document.getElementById(id);

let restaurants = [];
let selectedRestaurant = null;
let menu = [];
let cart = [];
let category = "All";
let userLocation = null;
let isOpeningRestaurant = false;
let unsubscribeMenu = null;
let unsubscribeTracking = null;

// HELPERS
function showToast(message) {
  const toast = $("toast");

  if (!toast) {
    console.log(message);
    return;
  }

  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => toast.classList.remove("show"), 2500);
}

function money(value) {
  return "₹" + Number(value || 0);
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

// SECURE TRACKING CODE
function generateTrackingCode() {
  if (!crypto || !crypto.getRandomValues) {
    throw new Error("Secure code generation is not supported.");
  }

  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(20);

  crypto.getRandomValues(bytes);

  return Array.from(bytes)
    .map((byte) => alphabet[byte & 31])
    .join("");
}

function formatTrackingCode(code) {
  return String(code).match(/.{1,4}/g)?.join("-") || code;
}

function normalizeTrackingCode(code) {
  return String(code || "")
    .toUpperCase()
    .replace(/[\s-]/g, "");
}

// LOAD RESTAURANTS
async function loadRestaurants() {
  const grid = $("restaurantGrid") || $("restaurants");
  const status = $("restaurantStatus");

  try {
    if (grid) {
      grid.style.display = "grid";
      grid.innerHTML = "<p>Loading restaurants...</p>";
    }

    if (status) status.textContent = "Loading restaurants...";

    const snapshot = await getDocs(collection(db, "restaurants"));

    restaurants = snapshot.docs
      .map((document) => ({
        id: document.id,
        ...document.data()
      }))
      .filter((item) => item.active === true || item.Active === true);

    if (!restaurants.length) {
      if (grid) grid.innerHTML = "<p>Abhi koi active restaurant nahi mila.</p>";
      if (status) status.textContent = "No active restaurants found.";
      return;
    }

    if (status) status.textContent = "";

    renderRestaurants();

  } catch (error) {
    console.error("Restaurant loading error:", error);

    if (status) status.textContent = "Restaurant load nahi ho paya.";

    if (grid) {
      grid.innerHTML = `
        <p>Restaurant load nahi ho paya.</p>
        <button type="button" id="retryRestaurants">Retry</button>
      `;

      $("retryRestaurants")?.addEventListener("click", loadRestaurants);
    }
  }
}

// DISPLAY RESTAURANTS
function renderRestaurants() {
  const grid = $("restaurantGrid") || $("restaurants");
  if (!grid) return;

  grid.innerHTML = "";
  grid.style.display = "grid";

  restaurants.forEach((restaurant) => {
    const card = document.createElement("button");

    card.type = "button";
    card.className = "restaurant-card";
    card.style.display = "flex";
    card.style.width = "100%";
    card.style.textAlign = "left";
    card.style.cursor = "pointer";
    card.style.touchAction = "manipulation";
    card.style.pointerEvents = "auto";
    card.style.position = "relative";

    card.innerHTML = `
      <div class="restaurant-emoji">🍽️</div>
      <div class="restaurant-info">
        <h3>${escapeHTML(restaurant.name || "Restaurant")}</h3>
        <p>${escapeHTML(restaurant.description || "Fresh food and local favourites")}</p>
        <small>${escapeHTML(restaurant.city || "Jagdalpur")}</small>
        ${
          restaurant.isPureVeg
            ? '<span class="veg-label">PURE VEG</span>'
            : ""
        }
      </div>
    `;

    card.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openRestaurant(restaurant);
    });

    grid.appendChild(card);
  });
}

// OPEN RESTAURANT
async function openRestaurant(restaurant) {
  if (isOpeningRestaurant) return;

  isOpeningRestaurant = true;

  if (unsubscribeMenu) {
    unsubscribeMenu();
    unsubscribeMenu = null;
  }

  selectedRestaurant = restaurant;
  menu = [];
  cart = [];
  category = "All";

  const restaurantSection = $("restaurantGrid") || $("restaurants");
  const menuSection = $("menu");

  if (restaurantSection) restaurantSection.style.display = "none";

  if (menuSection) {
    menuSection.hidden = false;
    menuSection.style.display = "block";
  }

  if ($("selectedRestaurantName")) {
    $("selectedRestaurantName").textContent = restaurant.name || "Restaurant";
  }

  if ($("backRestaurants")) {
    $("backRestaurants").style.display = "inline-flex";
  }

  if ($("search")) $("search").value = "";

  renderCart();

  try {
    loadSelectedRestaurantMenu();

    if (menuSection) {
      menuSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  } finally {
    isOpeningRestaurant = false;
  }
}

// LOAD LIVE MENU FROM FIREBASE
function loadSelectedRestaurantMenu() {
  const products = $("products");

  if (!selectedRestaurant) return;

  if (unsubscribeMenu) {
    unsubscribeMenu();
    unsubscribeMenu = null;
  }

  if (products) products.innerHTML = "<p>Loading menu...</p>";

  const menuRef = collection(
    db,
    "restaurants",
    selectedRestaurant.id,
    "menuItems"
  );

  unsubscribeMenu = onSnapshot(
    menuRef,

    (snapshot) => {
      menu = snapshot.docs
        .map((document) => {
          const data = document.data();

          return {
            id: document.id,
            ...data,
            name: String(data.name || data.Name || "Food Item").trim(),
            price: Number(data.price ?? data.Price ?? 0),
            category: String(data.category || data.Category || "Other").trim(),
            description: data.description || data.Description || "",
            emoji: String(data.emoji || data.Emoji || "🍽️").trim() || "🍽️",
            available: data.available ?? data.Available ?? true
          };
        })
        .filter((item) => item.available === true);

      cart = cart.filter((cartItem) =>
        menu.some((menuItem) => menuItem.id === cartItem.id)
      );

      cart = cart.map((cartItem) => {
        const updatedItem = menu.find(
          (menuItem) => menuItem.id === cartItem.id
        );

        return updatedItem
          ? {
              ...cartItem,
              name: updatedItem.name,
              price: updatedItem.price
            }
          : cartItem;
      });

      console.log("Live Firebase menu:", menu);

      renderCategories();
      renderMenu();
      renderCart();
    },

    (error) => {
      console.error("Menu loading error:", error);

      if (products) {
        products.innerHTML = `
          <p>Menu load nahi ho paya.</p>
          <button type="button" id="retryMenu">Retry Menu</button>
        `;

        $("retryMenu")?.addEventListener("click", loadSelectedRestaurantMenu);
      }
    }
  );
}

// MENU CATEGORIES
function renderCategories() {
  const cats = $("cats");
  if (!cats) return;

  const categories = [
    "All",
    ...new Set(menu.map((item) => item.category).filter(Boolean))
  ];

  if (!categories.includes(category)) {
    category = "All";
  }

  cats.innerHTML = "";

  categories.forEach((cat) => {
    const button = document.createElement("button");

    button.type = "button";
    button.textContent = cat;
    button.className = category === cat ? "active" : "";
    button.style.touchAction = "manipulation";

    button.addEventListener("click", () => {
      category = cat;
      renderCategories();
      renderMenu();
    });

    cats.appendChild(button);
  });
}

// DISPLAY MENU
function renderMenu() {
  const products = $("products");
  const empty = $("empty");

  if (!products) return;

  products.innerHTML = "";

  const searchText = ($("search")?.value || "").toLowerCase();

  const filtered = menu.filter((item) => {
    const matchesCategory =
      category === "All" || item.category === category;

    const matchesSearch =
      (item.name || "").toLowerCase().includes(searchText);

    return matchesCategory && matchesSearch;
  });

  if (!filtered.length) {
    if (empty) {
      empty.hidden = false;
      empty.style.display = "block";
    } else {
      products.innerHTML = "<p>No menu items available.</p>";
    }
    return;
  }

  if (empty) {
    empty.hidden = true;
    empty.style.display = "none";
  }

  filtered.forEach((item) => {
    const card = document.createElement("div");
    card.className = "product-card";

    const quantity = getQuantity(item.id);
    const foodEmoji = item.emoji || "🍽️";

    card.innerHTML = `
      <div class="product-emoji">${escapeHTML(foodEmoji)}</div>
      <div class="product-info">
        <h3>${escapeHTML(item.name)}</h3>
        <p>${escapeHTML(item.description)}</p>
        <strong>${money(item.price)}</strong>
      </div>
      <button type="button" class="add-button">
        ${quantity > 0 ? "Added " + quantity : "ADD +"}
      </button>
    `;

    card.querySelector(".add-button").addEventListener("click", (event) => {
      event.stopPropagation();
      addToCart(item);
    });

    products.appendChild(card);
  });
}

// CART FUNCTIONS
function getQuantity(id) {
  const item = cart.find((product) => product.id === id);
  return item ? item.quantity : 0;
}

function addToCart(item) {
  const existing = cart.find((product) => product.id === item.id);

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({
      id: item.id,
      name: item.name,
      price: Number(item.price) || 0,
      quantity: 1
    });
  }

  renderMenu();
  renderCart();
  showToast("Item added to cart");
}

function changeQuantity(id, amount) {
  const item = cart.find((product) => product.id === id);
  if (!item) return;

  item.quantity += amount;

  if (item.quantity <= 0) {
    cart = cart.filter((product) => product.id !== id);
  }

  renderCart();
  renderMenu();
}

function getTotal() {
  return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

// DISPLAY CART
function renderCart() {
  const lines = $("cartLines");
  const count = $("count");
  const total = $("total");

  const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (count) count.textContent = totalQuantity;
  if (total) total.textContent = money(getTotal());

  if (!lines) return;

  lines.innerHTML = "";

  if (!cart.length) {
    lines.innerHTML = "<p>Your cart is empty.</p>";
    return;
  }

  cart.forEach((item) => {
    const row = document.createElement("div");
    row.className = "cart-item";

    row.innerHTML = `
      <div>
        <strong>${escapeHTML(item.name)}</strong>
        <p>${money(item.price)} × ${item.quantity}</p>
      </div>
      <div class="quantity-controls">
        <button type="button" class="minus">−</button>
        <span>${item.quantity}</span>
        <button type="button" class="plus">+</button>
      </div>
    `;

    row.querySelector(".minus").addEventListener("click", () => changeQuantity(item.id, -1));
    row.querySelector(".plus").addEventListener("click", () => changeQuantity(item.id, 1));

    lines.appendChild(row);
  });
}

// CART OPEN / CLOSE
function openCart() {
  if (!$("shade")) return;

  $("shade").classList.add("show");
  $("cart")?.classList.add("show");
}

function closeCart() {
  $("shade")?.classList.remove("show");
  $("cart")?.classList.remove("show");
}

$("openCart")?.addEventListener("click", openCart);
$("viewCart")?.addEventListener("click", openCart);
$("navCart")?.addEventListener("click", openCart);
$("close")?.addEventListener("click", closeCart);

$("shade")?.addEventListener("click", (event) => {
  if (event.target === $("shade")) closeCart();
});

// CHECKOUT FORM
function createCheckoutForm() {
  if ($("checkoutForm")) {
    $("checkoutForm").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
    return;
  }

  const lines = $("cartLines");
  if (!lines) return;

  const form = document.createElement("div");
  form.id = "checkoutForm";
  form.className = "checkout-form";

  form.innerHTML = `
    <h3>Order Details</h3>
    <label for="customerName">Your Name</label>
    <input id="customerName" type="text" placeholder="Enter your name" autocomplete="name">

    <label for="customerPhone">Mobile Number</label>
    <input id="customerPhone" type="tel" inputmode="numeric" maxlength="10" placeholder="10 digit mobile number" autocomplete="tel">

    <label for="orderType">Order Type</label>
    <select id="orderType">
      <option value="Pickup">Pickup</option>
      <option value="Home Delivery">Home Delivery</option>
    </select>

    <div id="addressBox" style="display:none;">
      <label for="customerAddress">Delivery Address</label>
      <textarea id="customerAddress" placeholder="Enter your full address"></textarea>
      <button type="button" id="getLocation">📍 Use My Current Location</button>
    </div>

    <button type="button" id="placeOrder">Place Order</button>
  `;

  lines.appendChild(form);

  $("orderType").addEventListener("change", () => {
    $("addressBox").style.display =
      $("orderType").value === "Home Delivery" ? "block" : "none";
  });

  $("getLocation").addEventListener("click", getCurrentLocation);
  $("placeOrder").addEventListener("click", placeOrder);

  form.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

$("checkout")?.addEventListener("click", () => {
  if (!selectedRestaurant) {
    showToast("Please select a restaurant first");
    return;
  }

  if (!cart.length) {
    showToast("Your cart is empty");
    return;
  }

  createCheckoutForm();
});

// GPS LOCATION
async function getCurrentLocation() {
  if (!navigator.geolocation) {
    showToast("Location is not supported on this device");
    return;
  }

  showToast("Getting your location...");

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;

      userLocation = { latitude, longitude };

      const addressField = $("customerAddress");

      if (addressField) {
        addressField.value =
          `https://www.google.com/maps?q=${latitude},${longitude}`;
      }

      try {
        const url =
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.display_name && addressField) {
          addressField.value =
            data.display_name +
            `\nhttps://www.google.com/maps?q=${latitude},${longitude}`;
        }
      } catch (error) {
        console.log("Address lookup unavailable:", error);
      }

      showToast("Location added");
    },

    (error) => {
      console.error("GPS error:", error);
      showToast("Location permission allow kijiye");
    },

    {
      enableHighAccuracy: true,
      timeout: 15000
    }
  );
}

// SHOW ORDER SUCCESS CARD
function showOrderSuccess(orderId, trackingCode, whatsappURL) {
  const trackSection = $("trackOrder");

  if (!trackSection) {
    showToast("Order placed! Order ID: " + orderId);
    window.location.href = whatsappURL;
    return;
  }

  let successCard = $("orderSuccess");

  if (!successCard) {
    successCard = document.createElement("div");
    successCard.id = "orderSuccess";
    successCard.style.cssText = `
      background:#211538;
      border:1px solid #7650a8;
      border-radius:18px;
      padding:18px;
      margin:16px 0;
      color:white;
    `;

    const trackingForm = trackSection.querySelector(".tracking-form");

    if (trackingForm) {
      trackSection.insertBefore(successCard, trackingForm);
    } else {
      trackSection.prepend(successCard);
    }
  }

  successCard.innerHTML = `
    <div style="font-size:30px;text-align:center;">🎉</div>
    <h3 style="text-align:center;">Order Placed Successfully!</h3>
    <p style="text-align:center;">Aapka order restaurant ko bhejne ke liye ready hai.</p>

    <div style="background:#160e25;padding:12px;border-radius:12px;margin:12px 0;">
      <small>YOUR ORDER ID</small>
      <h3 style="margin:6px 0;word-break:break-all;">${escapeHTML(orderId)}</h3>
      <button type="button" id="copyOrderId">Copy Order ID</button>
    </div>

    <div style="background:#160e25;padding:12px;border-radius:12px;margin:12px 0;">
      <small>YOUR SECRET TRACKING CODE</small>
      <h3 style="margin:6px 0;letter-spacing:2px;word-break:break-word;">${escapeHTML(formatTrackingCode(trackingCode))}</h3>
      <button type="button" id="copyTrackingCode">Copy Tracking Code</button>
    </div>

    <p style="font-size:13px;">Tracking Code ko sambhal kar rakhein. Iske bina order status nahi dekh paayenge.</p>

    <button type="button" id="trackThisOrder" style="width:100%;margin:6px 0;">
      📦 Track This Order
    </button>

    <button type="button" id="sendWhatsAppOrder" style="width:100%;margin:6px 0;">
      Send Order on WhatsApp
    </button>
  `;

  successCard.hidden = false;

  $("copyOrderId")?.addEventListener("click", () => {
    copyText(orderId);
  });

  $("copyTrackingCode")?.addEventListener("click", () => {
    copyText(formatTrackingCode(trackingCode));
  });

  $("trackThisOrder")?.addEventListener("click", () => {
    if ($("trackingOrderId")) $("trackingOrderId").value = orderId;
    if ($("trackingCode")) $("trackingCode").value = formatTrackingCode(trackingCode);

    trackSection.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

    trackOrder();
  });

  $("sendWhatsAppOrder")?.addEventListener("click", () => {
    window.location.href = whatsappURL;
  });

  successCard.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

// COPY TEXT
async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value);
    showToast("Copied successfully!");
  } catch (error) {
    showToast("Copy nahi hua. Text manually copy kijiye.");
  }
}

// PLACE ORDER
async function placeOrder() {
  const name = $("customerName")?.value.trim() || "";
  const phone = $("customerPhone")?.value.trim() || "";
  const orderType = $("orderType")?.value || "Pickup";
  const address = $("customerAddress")?.value.trim() || "";

  if (!name) {
    showToast("Please enter your name");
    $("customerName")?.focus();
    return;
  }

  if (!/^[6-9]\d{9}$/.test(phone)) {
    showToast("Please enter a valid 10 digit mobile number");
    $("customerPhone")?.focus();
    return;
  }

  if (orderType === "Home Delivery" && !address) {
    showToast("Please enter your delivery address");
    $("customerAddress")?.focus();
    return;
  }

  if (!selectedRestaurant || !cart.length) {
    showToast("Your cart is empty");
    return;
  }

  const placeButton = $("placeOrder");

  if (placeButton) {
    placeButton.disabled = true;
    placeButton.textContent = "Placing Order...";
  }

  const orderItems = cart.map((item) => ({
    id: item.id,
    name: item.name,
    price: item.price,
    quantity: item.quantity,
    subtotal: item.price * item.quantity
  }));

  const orderTotal = getTotal();

  try {
    const trackingCode = generateTrackingCode();

    const orderRef = doc(collection(db, "orders"));
    const trackingRef = doc(db, "orderTracking", trackingCode);

    const orderData = {
      customerName: name,
      customerPhone: phone,
      orderType,
      address: orderType === "Home Delivery" ? address : "",
      restaurantId: selectedRestaurant.id,
      restaurantName: selectedRestaurant.name,
      items: orderItems,
      total: orderTotal,
      status: "New",
      trackingCode,
      createdAt: serverTimestamp()
    };

    // Tracking record now also stores orderType
    const trackingData = {
      orderId: orderRef.id,
      restaurantId: selectedRestaurant.id,
      restaurantName: selectedRestaurant.name,
      orderType: orderType,
      status: "New",
      createdAt: serverTimestamp()
    };

    const batch = writeBatch(db);
    batch.set(orderRef, orderData);
    batch.set(trackingRef, trackingData);

    await batch.commit();

    let message = "*NEW ZAIKABOX ORDER*\n";
    message += `Order ID: ${orderRef.id}\n`;
    message += `Tracking Code: ${formatTrackingCode(trackingCode)}\n`;
    message += `Restaurant: ${selectedRestaurant.name}\n`;
    message += `Name: ${name}\n`;
    message += `Mobile: ${phone}\n`;
    message += `Order Type: ${orderType}\n`;

    if (orderType === "Home Delivery") {
      message += `Address: ${address}\n`;
    }

    message += "\n*ITEMS*\n";

    orderItems.forEach((item) => {
      message += `${item.name} × ${item.quantity} = ₹${item.subtotal}\n`;
    });

    message += `\n*TOTAL: ₹${orderTotal}*`;

    const whatsappURL =
      `https://wa.me/${DEFAULT_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

    cart = [];
    renderCart();
    renderMenu();
    closeCart();

    $("checkoutForm")?.remove();

    showOrderSuccess(orderRef.id, trackingCode, whatsappURL);
    showToast("Order placed successfully!");

  } catch (error) {
    console.error("Order placement error:", error);
    showToast("Order place nahi hua. Please try again.");

    if (placeButton) {
      placeButton.disabled = false;
      placeButton.textContent = "Place Order";
    }
  }
}

// DISPLAY TRACKING STATUS
function renderTrackingStatus(data) {
  const result = $("trackingResult");
  if (!result) return;

  result.hidden = false;

  const status = String(data.status || "New");

  if (status === "Rejected") {
    result.innerHTML = `
      <div class="tracking-status">
        <h3>❌ Order Rejected</h3>
        <p>Restaurant ne is order ko reject kar diya hai. Details ke liye restaurant se contact karein.</p>
        <p><strong>Restaurant:</strong> ${escapeHTML(data.restaurantName)}</p>
      </div>
    `;
    return;
  }

  // Identify Pickup or Home Delivery
  const isPickup =
    data.orderType === "Pickup" ||
    status === "Ready for Pickup" ||
    status === "Picked Up";

  const steps = isPickup
    ? [
        "New",
        "Accepted",
        "Preparing",
        "Ready for Pickup",
        "Picked Up"
      ]
    : [
        "New",
        "Accepted",
        "Preparing",
        "Out for Delivery",
        "Delivered"
      ];

  const labels = {
    "New": "Order Received",
    "Accepted": "Order Accepted",
    "Preparing": "Food is Being Prepared",
    "Ready for Pickup": "Ready for Pickup",
    "Picked Up": "Order Picked Up",
    "Out for Delivery": "Out for Delivery",
    "Delivered": "Delivered"
  };

  const currentIndex = steps.indexOf(status);

  const timeline = steps.map((step, index) => {
    const completed = currentIndex >= index;

    return `
      <div class="tracking-step" style="
        padding:10px;
        margin:6px 0;
        border-left:4px solid ${completed ? "#a879ed" : "#554766"};
        opacity:${completed ? "1" : "0.5"};
      ">
        ${completed ? "✅" : "○"}
        <strong>${labels[step]}</strong>
      </div>
    `;
  }).join("");

  const currentLabel = labels[status] || status;

  result.innerHTML = `
    <div class="tracking-status">
      <h3>📦 Your ${isPickup ? "Pickup" : "Delivery"} Order Status</h3>
      <p><strong>Restaurant:</strong> ${escapeHTML(data.restaurantName)}</p>
      <p><strong>Current Status:</strong> ${escapeHTML(currentLabel)}</p>
      <div class="tracking-order-items">${timeline}</div>
      <p style="font-size:12px;">Status automatically refresh hota rahega.</p>
    </div>
  `;
}

// TRACK ORDER
function trackOrder() {
  const orderId = $("trackingOrderId")?.value.trim() || "";
  const trackingCode = normalizeTrackingCode($("trackingCode")?.value || "");
  const result = $("trackingResult");

  if (!orderId || !trackingCode) {
    showToast("Order ID aur Tracking Code dono enter kijiye.");
    return;
  }

  if (!/^[A-Z2-9]{20}$/.test(trackingCode)) {
    showToast("Tracking Code sahi format mein enter kijiye.");
    return;
  }

  if (unsubscribeTracking) {
    unsubscribeTracking();
    unsubscribeTracking = null;
  }

  if (result) {
    result.hidden = false;
    result.innerHTML = "<p>Checking your order...</p>";
  }

  const trackingRef = doc(db, "orderTracking", trackingCode);

  unsubscribeTracking = onSnapshot(
    trackingRef,

    (snapshot) => {
      if (!snapshot.exists()) {
        if (result) {
          result.hidden = false;
          result.innerHTML = "<p>Order nahi mila. Order ID aur Tracking Code check kijiye.</p>";
        }

        if (unsubscribeTracking) {
          unsubscribeTracking();
          unsubscribeTracking = null;
        }

        return;
      }

      const data = snapshot.data();

      if (data.orderId !== orderId) {
        if (result) {
          result.hidden = false;
          result.innerHTML = "<p>Order nahi mila. Details dobara check kijiye.</p>";
        }

        if (unsubscribeTracking) {
          unsubscribeTracking();
          unsubscribeTracking = null;
        }

        return;
      }

      renderTrackingStatus(data);
    },

    (error) => {
      console.error("Tracking error:", error);

      if (result) {
        result.hidden = false;
        result.innerHTML = "<p>Tracking load nahi ho paayi. Dobara try kijiye.</p>";
      }

      if (unsubscribeTracking) {
        unsubscribeTracking();
        unsubscribeTracking = null;
      }
    }
  );
}

$("trackOrderBtn")?.addEventListener("click", trackOrder);

// SEARCH
$("search")?.addEventListener("input", renderMenu);

// BACK TO RESTAURANTS
$("backRestaurants")?.addEventListener("click", () => {
  if (unsubscribeMenu) {
    unsubscribeMenu();
    unsubscribeMenu = null;
  }

  selectedRestaurant = null;
  menu = [];
  cart = [];
  category = "All";

  const restaurantSection = $("restaurantGrid") || $("restaurants");
  const menuSection = $("menu");

  if (menuSection) {
    menuSection.hidden = true;
    menuSection.style.display = "none";
  }

  if (restaurantSection) restaurantSection.style.display = "grid";

  if ($("backRestaurants")) {
    $("backRestaurants").style.display = "none";
  }

  renderCart();
  renderRestaurants();
});

// START APP
renderCart();
loadRestaurants();
