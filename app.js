
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  getDocs,
  getDoc,
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
const auth = getAuth(app);
const DEFAULT_WHATSAPP_NUMBER = "918319014718";
const DEFAULT_UPI_ID = "8269568200-3@ybl";
let activeUpiId = DEFAULT_UPI_ID;
const TRACKING_STORAGE_KEY = "zaikabox_active_order_v1";

const $ = (id) => document.getElementById(id);
const AUTH_WORKER_URL = "https://little-boat-b4f9.dmd6043.workers.dev";

async function callAuthWorker(path, payload) {
  const response = await fetch(AUTH_WORKER_URL + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result.error || "Request complete nahi ho payi.");
  }
  return result;
}

function normalizeAccountPhone(rawPhone) {
  const phone = String(rawPhone || "").replace(/\D/g, "").replace(/^91/, "");
  if (!/^[6-9]\d{9}$/.test(phone)) {
    throw new Error("Valid 10-digit Indian mobile number daaliye.");
  }
  return phone;
}

function updateAccountUI(user) {
  const status = $("accountStatus");
  const form = $("accountForm");
  const signedIn = $("accountSignedIn");
  const phoneLabel = $("accountPhone");
  if (status) status.textContent = user ? "You are logged in." : "Login karein ya naya account banayein.";
  if (form) form.hidden = !!user;
  if (signedIn) signedIn.hidden = !user;
  if (phoneLabel) phoneLabel.textContent = user?.email || "";
}
onAuthStateChanged(auth, updateAccountUI);
$("accountButton")?.addEventListener("click", () => window.zaikaGo?.("account"));

$("accountRegister")?.addEventListener("click", async () => {
  try {
    const phone = normalizeAccountPhone($("accountMobile")?.value);
    const email = String($("accountEmail")?.value || "").trim().toLowerCase();
    const password = $("accountPassword")?.value || "";
    if (!email) throw new Error("Email address daaliye.");
    if (password.length < 8) throw new Error("Password kam se kam 8 characters ka rakhein.");
    await callAuthWorker("/signup", { phone, email, password });
    await signInWithEmailAndPassword(auth, email, password);
    showToast("ZaikaBox account ban gaya aur login ho gaya.");
  } catch (error) {
    showToast(error.message || "Account nahi ban paya.");
  }
});

$("accountLogin")?.addEventListener("click", async () => {
  try {
    const phone = normalizeAccountPhone($("accountMobile")?.value);
    const password = $("accountPassword")?.value || "";
    if (!password) throw new Error("Password daaliye.");
    const result = await callAuthWorker("/login", { phone, password });
    await signInWithEmailAndPassword(auth, result.email, password);
    showToast("Login successful.");
  } catch (error) {
    showToast(error.message || "Login nahi ho paya.");
  }
});

$("accountForgot")?.addEventListener("click", async () => {
  try {
    const email = String($("accountEmail")?.value || "").trim().toLowerCase();
    if (!email) throw new Error("Pehle registered email daaliye.");
    const result = await callAuthWorker("/forgot-password", { email });
    showToast(result.message || "Agar email registered hai to reset link bhej diya jayega.");
  } catch (error) {
    showToast(error.message || "Password reset request nahi ho payi.");
  }
});

$("accountLogout")?.addEventListener("click", async () => {
  try { await signOut(auth); showToast("Logout ho gaya."); }
  catch (error) { showToast("Logout nahi ho paya."); }
});

let restaurants = [];
let restaurantFilter = "All";
let selectedRestaurant = null;
let menu = [];
let cart = [];
let category = "All";
let userLocation = null;
let isOpeningRestaurant = false;
let isPlacingOrder = false;
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

  setTimeout(() => toast.classList.remove("show"), 3000);
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

function generateTrackingCode() {
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error("Secure code generation is not supported.");
  }

  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(20);

  globalThis.crypto.getRandomValues(bytes);

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

// SAVE TRACKING DETAILS ON THIS DEVICE
function saveTrackingDetails(orderId, trackingCode) {
  const details = {
    orderId: String(orderId),
    trackingCode: normalizeTrackingCode(trackingCode),
    savedAt: Date.now()
  };

  try {
    localStorage.setItem(TRACKING_STORAGE_KEY, JSON.stringify(details));
  } catch (error) {
    console.error("Tracking save error:", error);
    showToast("Tracking device par save nahi ho payi.");
  }

  if ($("trackingOrderId")) {
    $("trackingOrderId").value = details.orderId;
  }

  if ($("trackingCode")) {
    $("trackingCode").value = formatTrackingCode(details.trackingCode);
  }
}

// READ SAVED TRACKING DETAILS
function getSavedTrackingDetails() {
  try {
    const saved = localStorage.getItem(TRACKING_STORAGE_KEY);

    if (!saved) return null;

    const details = JSON.parse(saved);

    if (
      !details ||
      !details.orderId ||
      !/^[A-Z2-9]{20}$/.test(details.trackingCode || "")
    ) {
      return null;
    }

    return details;
  } catch (error) {
    console.error("Tracking restore error:", error);
    return null;
  }
}

// CLEAR SAVED TRACKING IF USER WANTS TO
function clearSavedTracking() {
  try {
    localStorage.removeItem(TRACKING_STORAGE_KEY);
  } catch (error) {
    console.error("Tracking clear error:", error);
  }
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

  const searchQuery = ($("restaurantSearch")?.value || "").toLowerCase().trim();
  const visibleRestaurants = restaurants.filter((restaurant) => {
    const foodType = String(restaurant.foodCategory || "").toLowerCase();
    const legacyVeg = restaurant.isPureVeg === true || restaurant.isPureVeg === "true";
    const isVeg = foodType === "veg only" || foodType === "veg + non-veg" || (!foodType && legacyVeg);
    const isNonVeg = foodType === "non-veg only" || foodType === "veg + non-veg" || (!foodType && !legacyVeg);
    const matchesType = restaurantFilter === "All"
      || (restaurantFilter === "Veg" && isVeg)
      || (restaurantFilter === "Non-Veg" && isNonVeg);
    const searchable = [restaurant.name, restaurant.Name, restaurant.description, restaurant.Description, restaurant.city, restaurant.City, restaurant.foodCategory]
      .filter(Boolean).join(" ").toLowerCase();
    return matchesType && searchable.includes(searchQuery);
  });

  if (!visibleRestaurants.length) {
    grid.innerHTML = '<p class="restaurant-empty">Is filter mein abhi koi restaurant nahi mila.</p>';
    return;
  }

  visibleRestaurants.forEach((restaurant) => {
    const card = document.createElement("button");

    card.type = "button";
    card.className = "restaurant-card";
    card.style.display = "flex";
    card.style.width = "100%";
    card.style.textAlign = "left";
    card.style.cursor = "pointer";
    card.style.touchAction = "manipulation";

    card.innerHTML = `
      <div class="restaurant-emoji">🍽️</div>
      <div class="restaurant-info">
        <h3>${escapeHTML(restaurant.name || restaurant.Name || "Restaurant")}</h3>
        <p>${escapeHTML(restaurant.description || restaurant.Description || "Fresh food and local favourites")}</p>
        <small>${escapeHTML(restaurant.city || restaurant.City || "Jagdalpur")}</small>
        ${
          (restaurant.foodCategory || (restaurant.isPureVeg === true || restaurant.isPureVeg === "true" ? "Veg Only" : ""))
            ? '<span class="veg-label">' + escapeHTML(restaurant.foodCategory || "PURE VEG").toUpperCase() + '</span>'
            : ""
        }
      </div>
    `;

    card.addEventListener("click", () => openRestaurant(restaurant));
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

  if (typeof window.zaikaGo === "function") window.zaikaGo("explore");

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
    $("selectedRestaurantName").textContent =
      restaurant.name || restaurant.Name || "Restaurant";
  }

  if ($("backRestaurants")) {
    $("backRestaurants").style.display = "inline-flex";
  }

  if ($("search")) $("search").value = "";

  renderCart();

  try {
    loadSelectedRestaurantMenu();

    menuSection?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  } finally {
    isOpeningRestaurant = false;
  }
}

// MENU AVAILABILITY
function isMenuItemVisible(data) {
  const available = data.available ?? data.Available;
  const active = data.active ?? data.Active;

  if (available === false || active === false) return false;
  if (String(available).toLowerCase() === "false") return false;
  if (String(active).toLowerCase() === "false") return false;

  return true;
}

// LOAD LIVE MENU
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
            name: String(
              data.name || data.Name || data.title || data.Title || document.id
            ).trim(),
            price: Number(data.price ?? data.Price ?? 0),
            category: String(data.category || data.Category || "Other").trim(),
            description: data.description || data.Description || "",
            emoji: String(data.emoji || data.Emoji || "🍽️").trim(),
            available: isMenuItemVisible(data)
          };
        })
        .filter((item) => item.available);

      cart = cart
        .filter((cartItem) => menu.some((menuItem) => menuItem.id === cartItem.id))
        .map((cartItem) => {
          const updatedItem = menu.find(
            (menuItem) => menuItem.id === cartItem.id
          );

          return {
            ...cartItem,
            name: updatedItem.name,
            price: updatedItem.price
          };
        });

      renderCategories();
      renderMenu();
      renderCart();

      if (!snapshot.size) {
        console.warn("Menu subcollection is empty.");
      }
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

// CATEGORIES
function renderCategories() {
  const cats = $("cats");
  if (!cats) return;

  const categories = [
    "All",
    ...new Set(menu.map((item) => item.category).filter(Boolean))
  ];

  if (!categories.includes(category)) category = "All";

  cats.innerHTML = "";

  categories.forEach((cat) => {
    const button = document.createElement("button");

    button.type = "button";
    button.textContent = cat;
    button.className = category === cat ? "active" : "";

    button.addEventListener("click", () => {
      category = cat;
      renderCategories();
      renderMenu();
    });

    cats.appendChild(button);
  });
}

// MENU DISPLAY
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
      item.name.toLowerCase().includes(searchText);

    return matchesCategory && matchesSearch;
  });

  if (!filtered.length) {
    if (empty) {
      empty.hidden = false;
      empty.style.display = "block";
      empty.textContent = "No items found. Try another category.";
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

    card.innerHTML = `
      <div class="product-emoji">${escapeHTML(item.emoji || "🍽️")}</div>
      <div class="product-info">
        <h3>${escapeHTML(item.name)}</h3>
        <p>${escapeHTML(item.description)}</p>
        <strong>${money(item.price)}</strong>
      </div>
      <button type="button" class="add-button">
        ${quantity > 0 ? "Added " + quantity : "ADD +"}
      </button>
    `;

    card.querySelector(".add-button").addEventListener("click", () => {
      addToCart(item);
    });

    products.appendChild(card);
  });
}

// CART DATA
function getQuantity(id) {
  const item = cart.find((product) => product.id === id);
  return item ? item.quantity : 0;
}

function addToCart(item) {
  if (!selectedRestaurant) {
    showToast("Please select a restaurant first");
    return;
  }

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

  renderCart();
  renderMenu();

  showToast(item.name + " added to cart");
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
  return cart.reduce(
    (sum, item) => sum + Number(item.price) * Number(item.quantity),
    0
  );
}

// CART DISPLAY
function renderCart() {
  const lines = $("cartLines");
  const count = $("count");
  const total = $("total");

  const totalQuantity = cart.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0
  );

  if (count) count.textContent = totalQuantity;
  if (total) total.textContent = money(getTotal());

  if (!lines) {
    console.error("Cart element #cartLines not found in index.html");
    return;
  }

  lines.innerHTML = "";

  if (!cart.length) {
    lines.innerHTML = `
      <div class="cart-empty">
        <div style="font-size:40px;text-align:center;">🛒</div>
        <p style="text-align:center;">Your cart is empty.</p>
        <p style="text-align:center;">Add something delicious!</p>
      </div>
    `;
    return;
  }

  cart.forEach((item) => {
    const row = document.createElement("div");
    row.className = "cart-item";

    row.innerHTML = `
      <div class="cart-item-info">
        <strong>${escapeHTML(item.name)}</strong>
        <p>${money(item.price)} × ${item.quantity}</p>
        <strong>${money(item.price * item.quantity)}</strong>
      </div>

      <div class="quantity-controls">
        <button type="button" class="minus" aria-label="Decrease quantity">−</button>
        <span>${item.quantity}</span>
        <button type="button" class="plus" aria-label="Increase quantity">+</button>
      </div>
    `;

    row.querySelector(".minus").addEventListener("click", () => {
      changeQuantity(item.id, -1);
    });

    row.querySelector(".plus").addEventListener("click", () => {
      changeQuantity(item.id, 1);
    });

    lines.appendChild(row);
  });
}

// CART OPEN / CLOSE
function openCart() {
  const shade = $("shade");
  const cartElement = $("cart");

  if (!shade || !cartElement) {
    showToast("Cart display issue. Please refresh.");
    return;
  }

  renderCart();

  shade.classList.add("show");
  cartElement.classList.add("show");
  document.body.classList.add("cart-open");
}

function closeCart() {
  $("shade")?.classList.remove("show");
  $("cart")?.classList.remove("show");
  document.body.classList.remove("cart-open");
}

$("openCart")?.addEventListener("click", openCart);
$("viewCart")?.addEventListener("click", openCart);
$("navCart")?.addEventListener("click", openCart);
$("close")?.addEventListener("click", closeCart);

$("shade")?.addEventListener("click", (event) => {
  if (event.target === $("shade")) closeCart();
});

// CHECKOUT FORM
async function createCheckoutForm() {
  try {
    const paymentSettings = await getDoc(doc(db, "platformSettings", "payments"));
    if (paymentSettings.exists() && paymentSettings.data().upiId) {
      activeUpiId = String(paymentSettings.data().upiId).trim();
    }
  } catch (error) {
    console.warn("Using temporary default UPI ID:", error);
    activeUpiId = DEFAULT_UPI_ID;
  }
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

    <button type="button" id="continueToPayment" style="width:100%;margin:14px 0;">CONTINUE TO PAYMENT</button>

    <div id="paymentSection" hidden style="background:#211b15;border:1px solid #ff8a35;border-radius:14px;padding:14px;margin:14px 0;">
      <h3 style="margin-top:0;">Pay Online via UPI</h3>
      <p style="margin:6px 0;">UPI ID: <strong id="checkoutUpiId">${escapeHTML(activeUpiId)}</strong></p>
      <div style="text-align:center;background:#fff;border-radius:12px;padding:12px;margin:12px auto;max-width:280px;">
        <img id="checkoutUpiQr" src="https://api.qrserver.com/v1/create-qr-code/?size=260x260&amp;margin=10&amp;data=${encodeURIComponent(`upi://pay?pa=${activeUpiId}&pn=ZaikaBox&am=${Number(getTotal()).toFixed(2)}&cu=INR&tn=ZaikaBox%20Order`)}" alt="Scan to pay ZaikaBox UPI" width="240" height="240" style="display:block;width:100%;max-width:240px;height:auto;margin:auto;" loading="lazy">
        <p style="color:#111;margin:8px 0 0;font-weight:600;">SCAN &amp; PAY</p>
      </div>
      <p style="font-size:12px;text-align:center;color:#ffbd87;">QR scan karte hi order ka exact amount UPI app mein aana chahiye.</p>
      <p style="margin:6px 0;">Order Amount: <strong>${money(getTotal())}</strong></p>
      <button type="button" id="copyCheckoutUpi">COPY UPI ID</button>
      <button type="button" id="openUpiApp">PAY VIA UPI APP</button>
      <label for="paymentUtr" style="display:block;margin-top:12px;">UPI UTR / Transaction ID</label>
      <input id="paymentUtr" type="text" maxlength="30" placeholder="Payment ke baad UTR enter karein" autocomplete="off">
      <label style="display:flex;gap:8px;align-items:flex-start;margin-top:10px;font-size:13px;">
        <input id="paymentConfirmed" type="checkbox" style="width:auto;margin-top:3px;">
        Maine UPI app mein payment complete kar diya hai.
      </label>
      <p style="font-size:12px;color:#ffbd87;">Payment aapke UTR ko admin verify karne ke baad hi confirm hoga.</p>
    </div>

    <div id="addressBox" style="display:none;">
      <label for="customerAddress">Delivery Address</label>
      <textarea id="customerAddress" placeholder="Enter your full address"></textarea>
      <button type="button" id="getLocation">📍 Use My Current Location</button>
    </div>

    <button type="button" id="placeOrder">I HAVE PAID</button>
  `;

  lines.appendChild(form);

  $("orderType").addEventListener("change", () => {
    $("addressBox").style.display =
      $("orderType").value === "Home Delivery" ? "block" : "none";
  });

  $("getLocation").addEventListener("click", getCurrentLocation);
  $("continueToPayment").addEventListener("click", () => {
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
    $("paymentSection").hidden = false;
    $("continueToPayment").hidden = true;
    $("paymentSection").scrollIntoView({ behavior: "smooth", block: "center" });
  });
  $("copyCheckoutUpi").addEventListener("click", () => copyText(activeUpiId));
  $("openUpiApp").addEventListener("click", () => {
    const amount = Number(getTotal()).toFixed(2);
    const upiUrl = `upi://pay?pa=${encodeURIComponent(activeUpiId)}&pn=${encodeURIComponent("ZaikaBox")}&am=${amount}&cu=INR&tn=${encodeURIComponent("ZaikaBox Order")}`;
    window.location.href = upiUrl;
  });
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

// GPS
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

// TRACKING STATUS DISPLAY
function renderTrackingStatus(data) {
  const result = $("trackingResult");
  if (!result) return;

  result.hidden = false;

  const status = String(data.status || "New");

  if (status === "Payment Pending" || status === "Payment Failed") {
    result.innerHTML = `
      <div class="tracking-status">
        <h3>${status === "Payment Pending" ? "⏳ Payment Verification Pending" : "❌ Payment Verification Failed"}</h3>
        <p>${status === "Payment Pending" ? "Aapka UPI payment reference admin verify kar raha hai. Payment confirm hone ke baad restaurant ko order milega." : "Payment verify nahi ho paaya. UTR aur payment details check karke support se sampark karein."}</p>
        <p><strong>Restaurant:</strong> ${escapeHTML(data.restaurantName)}</p>
        <p><strong>Status:</strong> ${escapeHTML(status)}</p>
      </div>
    `;
    return;
  }

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

  const isPickup =
    data.orderType === "Pickup" ||
    status === "Ready for Pickup" ||
    status === "Picked Up";

  const steps = isPickup
    ? ["New", "Accepted", "Preparing", "Ready for Pickup", "Picked Up"]
    : ["New", "Accepted", "Preparing", "Out for Delivery", "Delivered"];

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
        border-left:4px solid ${completed ? "#ff8a35" : "#554766"};
        opacity:${completed ? "1" : "0.5"};
      ">
        ${completed ? "✅" : "○"}
        <strong>${labels[step]}</strong>
      </div>
    `;
  }).join("");

  result.innerHTML = `
    <div class="tracking-status">
      <h3>📦 Your ${isPickup ? "Pickup" : "Delivery"} Order Status</h3>
      <p><strong>Restaurant:</strong> ${escapeHTML(data.restaurantName)}</p>
      <p><strong>Current Status:</strong> ${escapeHTML(labels[status] || status)}</p>
      ${!isPickup ? `
        <div class="zb-scooter-track ${status === "Out for Delivery" ? "is-moving" : status === "Delivered" ? "is-done" : ""}">
          <div class="zb-track-caption">${status === "Out for Delivery" ? "🛵 Your order is on the way!" : status === "Delivered" ? "🏁 Order reached you!" : "🍳 Your order is getting ready"}</div>
          <div class="zb-road"><span class="zb-scooter" aria-label="Delivery scooter">🛵</span></div>
          <div class="zb-track-label"><span>Restaurant</span><span>Your location</span></div>
        </div>
      ` : ""}
      <div class="tracking-order-items">${timeline}</div>
      <p style="font-size:12px;">Order status automatically updates from the server.</p>
      ${
        status === "Delivered"
          ? "<p>🎉 Your order has been delivered. Thank you for choosing ZaikaBox!</p>"
          : ""
      }
    </div>
  `;
}

// START LIVE TRACKING LISTENER
function startTracking(orderId, trackingCode) {
  const cleanOrderId = String(orderId || "").trim();
  const cleanCode = normalizeTrackingCode(trackingCode);

  const result = $("trackingResult");

  if (!cleanOrderId || !/^[A-Z2-9]{20}$/.test(cleanCode)) {
    if (result) {
      result.hidden = false;
      result.innerHTML = "<p>Order ID ya Tracking Code sahi nahi hai.</p>";
    }
    return;
  }

  if (unsubscribeTracking) {
    unsubscribeTracking();
    unsubscribeTracking = null;
  }

  if (result) {
    result.hidden = false;
    result.innerHTML = "<p>Loading your order tracking...</p>";
  }

  const trackingRef = doc(db, "orderTracking", cleanCode);

  unsubscribeTracking = onSnapshot(
    trackingRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        if (result) {
          result.hidden = false;
          result.innerHTML = "<p>Order nahi mila. Order ID aur Tracking Code check kijiye.</p>";
        }

        unsubscribeTracking?.();
        unsubscribeTracking = null;
        return;
      }

      const data = snapshot.data();

      if (data.orderId !== cleanOrderId) {
        if (result) {
          result.hidden = false;
          result.innerHTML = "<p>Order details match nahi hui. Dobara check kijiye.</p>";
        }

        unsubscribeTracking?.();
        unsubscribeTracking = null;
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

      unsubscribeTracking?.();
      unsubscribeTracking = null;
    }
  );
}

// AUTOMATICALLY RESTORE SAVED ORDER
function restoreSavedTracking() {
  const saved = getSavedTrackingDetails();
  const result = $("trackingResult");

  if (!saved) {
    if (result) {
      result.hidden = false;
      result.innerHTML = `
        <div class="tracking-status">
          <p>Abhi is device par koi saved order nahi hai.</p>
          <p>Order place karne ke baad tracking yahan automatically dikhegi.</p>
        </div>
      `;
    }
    return;
  }

  if ($("trackingOrderId")) {
    $("trackingOrderId").value = saved.orderId;
  }

  if ($("trackingCode")) {
    $("trackingCode").value = formatTrackingCode(saved.trackingCode);
  }

  startTracking(saved.orderId, saved.trackingCode);
}

// TRACK FORM BUTTON
function trackOrder() {
  const orderId = $("trackingOrderId")?.value.trim() || "";
  const trackingCode = normalizeTrackingCode($("trackingCode")?.value || "");

  if (!orderId || !trackingCode) {
    const saved = getSavedTrackingDetails();

    if (saved) {
      restoreSavedTracking();
      return;
    }

    showToast("Order ID aur Tracking Code dono enter kijiye.");
    return;
  }

  if (!/^[A-Z2-9]{20}$/.test(trackingCode)) {
    showToast("Tracking Code sahi format mein enter kijiye.");
    return;
  }

  saveTrackingDetails(orderId, trackingCode);
  startTracking(orderId, trackingCode);
}

$("trackOrderBtn")?.addEventListener("click", trackOrder);

// TRACK TAB AUTO LOAD
document.querySelectorAll('.nav-item[data-screen="track"]').forEach((item) => {
  item.addEventListener("click", () => {
    restoreSavedTracking();
  });
});

// ALSO RESTORE WHEN TRACK SCREEN IS OPENED DIRECTLY
function setupTrackScreenObserver() {
  const trackScreen = $("trackScreen");
  if (!trackScreen) return;

  const observer = new MutationObserver(() => {
    if (trackScreen.classList.contains("active")) {
      restoreSavedTracking();
    }
  });

  observer.observe(trackScreen, {
    attributes: true,
    attributeFilter: ["class"]
  });
}

// ORDER SUCCESS
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
      background:#211b15;
      border:1px solid #ff8a35;
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
    <h3 style="text-align:center;">Order Submitted — Payment Pending</h3>
    <p style="text-align:center;">Aapka UPI reference admin verify karega. Verification ke baad hi restaurant order accept kar payega.</p>

    <div style="background:#160f0a;padding:12px;border-radius:12px;margin:12px 0;">
      <small>YOUR ORDER ID</small>
      <h3 style="margin:6px 0;word-break:break-all;">${escapeHTML(orderId)}</h3>
      <button type="button" id="copyOrderId">Copy Order ID</button>
    </div>

    <div style="background:#160f0a;padding:12px;border-radius:12px;margin:12px 0;">
      <small>YOUR SECRET TRACKING CODE</small>
      <h3 style="margin:6px 0;letter-spacing:2px;word-break:break-word;">${escapeHTML(formatTrackingCode(trackingCode))}</h3>
      <button type="button" id="copyTrackingCode">Copy Tracking Code</button>
    </div>

    <p style="font-size:13px;">Your order tracking is now automatically saved on this device.</p>

    <button type="button" id="trackThisOrder" style="width:100%;margin:6px 0;">
      📦 View Live Order Tracking
    </button>

    <button type="button" id="sendWhatsAppOrder" style="width:100%;margin:6px 0;">
      Send Order on WhatsApp
    </button>
  `;

  successCard.hidden = false;

  $("copyOrderId")?.addEventListener("click", () => copyText(orderId));

  $("copyTrackingCode")?.addEventListener("click", () => {
    copyText(formatTrackingCode(trackingCode));
  });

  $("trackThisOrder")?.addEventListener("click", () => {
    if (typeof window.zaikaGo === "function") {
      window.zaikaGo("track");
    }

    restoreSavedTracking();

    trackSection.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  });

  $("sendWhatsAppOrder")?.addEventListener("click", () => {
    window.location.href = whatsappURL;
  });

  successCard.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

// COPY
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
  if (isPlacingOrder) return;

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

  const utr = $("paymentUtr")?.value.trim() || "";
  if (!/^[A-Za-z0-9]{6,30}$/.test(utr)) {
    showToast("Valid UTR / Transaction ID enter kijiye (6–30 characters).");
    $("paymentUtr")?.focus();
    return;
  }
  if (!$("paymentConfirmed")?.checked) {
    showToast("Pehle UPI payment complete karke confirmation tick kijiye.");
    return;
  }

  isPlacingOrder = true;

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
      restaurantName: selectedRestaurant.name || selectedRestaurant.Name || "Restaurant",
      items: orderItems,
      total: orderTotal,
      paymentMethod: "UPI",
      paymentStatus: "Pending",
      utr,
      status: "Payment Pending",
      trackingCode,
      createdAt: serverTimestamp()
    };

    const trackingData = {
      orderId: orderRef.id,
      restaurantId: selectedRestaurant.id,
      restaurantName: orderData.restaurantName,
      orderType,
      status: "Payment Pending",
      createdAt: serverTimestamp()
    };

    const batch = writeBatch(db);
    batch.set(orderRef, orderData);
    batch.set(trackingRef, trackingData);

    await batch.commit();

    // SAVE TRACKING IMMEDIATELY AFTER SUCCESSFUL ORDER
    saveTrackingDetails(orderRef.id, trackingCode);

    // START AUTOMATIC FIREBASE TRACKING
    startTracking(orderRef.id, trackingCode);

    let message = "*NEW ZAIKABOX ORDER*\n";
    message += `Order ID: ${orderRef.id}\n`;
    message += `Tracking Code: ${formatTrackingCode(trackingCode)}\n`;
    message += `Restaurant: ${orderData.restaurantName}\n`;
    message += `Name: ${name}\n`;
    message += `Mobile: ${phone}\n`;
    message += `Order Type: ${orderType}\n`;
    message += `Payment: UPI — Pending Verification\n`;
    message += `UTR: ${utr}\n`;

    if (orderType === "Home Delivery") {
      message += `Address: ${address}\n`;
    }

    message += "\n*ITEMS*\n";

    orderItems.forEach((item) => {
      message += `${item.name} × ${item.quantity} = ₹${item.subtotal}\n`;
    });

    message += `\n*TOTAL: ₹${orderTotal}*\n`;
    message += "*STATUS: PAYMENT PENDING — ADMIN VERIFICATION REQUIRED*";

    const whatsappURL =
      `https://wa.me/${DEFAULT_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

    cart = [];
    renderCart();
    renderMenu();
    closeCart();

    $("checkoutForm")?.remove();

    showOrderSuccess(orderRef.id, trackingCode, whatsappURL);
    showToast("Order submitted. Payment verification pending.");

  } catch (error) {
    console.error("Order placement error:", error);

    const errorMessage = error.code
      ? `${error.code}: ${error.message}`
      : error.message || "Unknown error";

    showToast("Order Failed: " + errorMessage);

    if (placeButton) {
      placeButton.disabled = false;
      placeButton.textContent = "Place Order";
    }
  } finally {
    isPlacingOrder = false;
  }
}

// RESTAURANT VEG / NON-VEG FILTERS
document.querySelectorAll("[data-restaurant-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    restaurantFilter = button.dataset.restaurantFilter || "All";
    document.querySelectorAll("[data-restaurant-filter]").forEach((item) => {
      const active = item === button;
      item.classList.toggle("active", active);
      item.setAttribute("aria-pressed", active ? "true" : "false");
    });
    renderRestaurants();
  });
});

// SEARCH
$("restaurantSearch")?.addEventListener("input", renderRestaurants);
$("search")?.addEventListener("input", renderMenu);

// BACK TO RESTAURANTS
$("backRestaurants")?.addEventListener("click", () => {
  if (typeof window.zaikaGo === "function") window.zaikaGo("home");
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
setupTrackScreenObserver();

// RESTORE TRACKING AFTER PAGE LOAD
restoreSavedTracking();
