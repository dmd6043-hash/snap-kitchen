
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";

import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  serverTimestamp
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
      .map((doc) => ({
        id: doc.id,
        ...doc.data()
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
    await loadSelectedRestaurantMenu();

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

// LOAD MENU FROM FIREBASE
async function loadSelectedRestaurantMenu() {
  const products = $("products");

  if (!selectedRestaurant) return;

  try {
    if (products) products.innerHTML = "<p>Loading menu...</p>";

    const menuRef = collection(
      db,
      "restaurants",
      selectedRestaurant.id,
      "menuItems"
    );

    const snapshot = await getDocs(menuRef);

    menu = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        const isPaneerChilli = doc.id === "paneer-chilli";

        return {
          id: doc.id,
          ...data,
          name: String(data.name || data.Name || "Food Item").trim(),
          price: isPaneerChilli ? 60 : (data.price ?? data.Price ?? 0),
          category: String(data.category || data.Category || "Other").trim(),
          description: data.description || data.Description || "",
          emoji: isPaneerChilli
            ? "🌶️"
            : String(data.emoji || data.Emoji || "🍽️").trim() || "🍽️",
          available: data.available ?? data.Available ?? true
        };
      })
      .filter((item) => item.available === true);

    console.log("Firebase menu loaded:", menu);

    renderCategories();
    renderMenu();

  } catch (error) {
    console.error("Menu loading error:", error);

    if (products) {
      products.innerHTML = `
        <p>Menu load nahi ho paya.</p>
        <button type="button" id="retryMenu">Retry Menu</button>
      `;

      $("retryMenu")?.addEventListener("click", loadSelectedRestaurantMenu);
    }
  }
}

// MENU CATEGORIES
function renderCategories() {
  const cats = $("cats");
  if (!cats) return;

  const categories = [
    "All",
    ...new Set(menu.map((item) => item.category).filter(Boolean))
  ];

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
    <h3>Delivery Details</h3>
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
    createdAt: serverTimestamp()
  };

  try {
    const orderRef = await addDoc(collection(db, "orders"), orderData);

    let message = "*NEW ZAIKABOX ORDER*\n";
    message += `Order ID: ${orderRef.id}\n`;
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

    showToast("Order placed successfully!");

    cart = [];
    renderCart();
    closeCart();

    window.location.href = whatsappURL;

  } catch (error) {
    console.error("Order placement error:", error);
    showToast("Order place nahi hua. Please try again.");

    if (placeButton) {
      placeButton.disabled = false;
      placeButton.textContent = "Place Order";
    }
  }
}

// SEARCH
$("search")?.addEventListener("input", renderMenu);

// BACK TO RESTAURANTS
$("backRestaurants")?.addEventListener("click", () => {
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
