
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  getDocs,
  getDoc,
  setDoc,
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

let customerProfile = { name: "", phone: "", address: "", mapLink: "" };
const CUSTOMER_PROFILE_STORAGE_KEY = "zaikabox_customer_profile_v1";

function readSavedCustomerProfile() {
  try {
    const saved = JSON.parse(localStorage.getItem(CUSTOMER_PROFILE_STORAGE_KEY) || "{}");
    customerProfile = {
      name: String(saved.name || ""),
      phone: String(saved.phone || ""),
      address: String(saved.address || ""),
      mapLink: String(saved.mapLink || "")
    };
  } catch (error) {
    customerProfile = { name: "", phone: "", address: "", mapLink: "" };
  }
}
readSavedCustomerProfile();

function fillProfileFields() {
  if ($("profileName")) $("profileName").value = customerProfile.name;
  if ($("profileMobile")) $("profileMobile").value = customerProfile.phone;
  if ($("profileAddress")) $("profileAddress").value = customerProfile.address;
}

async function updateAccountUI(user) {
  const status = $("accountStatus");
  const form = $("accountForm");
  const signedIn = $("accountSignedIn");
  const phoneLabel = $("accountPhone");
  if (status) status.textContent = user ? "You are logged in." : "Login karein ya naya account banayein.";
  if (form) form.hidden = !!user;
  if (signedIn) {
    signedIn.hidden = !user;
    if (user) {
      signedIn.classList.remove("login-welcome-animation");
      void signedIn.offsetWidth;
      signedIn.classList.add("login-welcome-animation");
    } else {
      signedIn.classList.remove("login-welcome-animation");
    }
  }
  if (phoneLabel) phoneLabel.textContent = user?.email || "";
  if (user) {
    try {
      const profileSnap = await getDoc(doc(db, "customerProfiles", user.uid));
      if (profileSnap.exists()) {
        const data = profileSnap.data();
        customerProfile = {
          name: String(data.name || ""),
          phone: String(data.phone || ""),
          address: String(data.address || ""),
          mapLink: customerProfile.mapLink || ""
        };
        localStorage.setItem(CUSTOMER_PROFILE_STORAGE_KEY, JSON.stringify(customerProfile));
      }
    } catch (error) {
      console.warn("Customer profile cloud load unavailable:", error);
    }
    fillProfileFields();
  }
}
onAuthStateChanged(auth, updateAccountUI);

$("saveCustomerProfile")?.addEventListener("click", async () => {
  try {
    if (!auth.currentUser) throw new Error("Profile edit karne ke liye login kijiye.");
    const name = $("profileName")?.value.trim() || "";
    const phone = normalizeAccountPhone($("profileMobile")?.value);
    const address = $("profileAddress")?.value.trim() || "";
    if (!name) throw new Error("Apna naam enter kijiye.");
    const profile = { name, phone, address, updatedAt: serverTimestamp() };
    await setDoc(doc(db, "customerProfiles", auth.currentUser.uid), profile, { merge: true });
    customerProfile = { name, phone, address, mapLink: customerProfile.mapLink || "" };
    localStorage.setItem(CUSTOMER_PROFILE_STORAGE_KEY, JSON.stringify(customerProfile));
    fillProfileFields();
    showToast("Profile save ho gayi.");
  } catch (error) {
    showToast(error.message || "Profile save nahi ho payi.");
  }
});
$("profileGetLocation")?.addEventListener("click", () => {
  const button = $("profileGetLocation");
  const addressField = $("profileAddress");

  if (!navigator.geolocation) {
    showToast("Is device par location support nahi hai.");
    return;
  }

  if (button) {
    button.disabled = true;
    button.textContent = "📍 Location mil rahi hai...";
  }
  showToast("Current location mil rahi hai...");

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;
      const mapLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
      let addressText = "Current location";

      try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`;
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          if (data.display_name) addressText = data.display_name;
        }
      } catch (error) {
        console.log("Profile address lookup unavailable:", error);
      }

      customerProfile.mapLink = mapLink;
      if (addressField) addressField.value = addressText;
      if (button) {
        button.disabled = false;
        button.textContent = "📍 Use Current Location";
      }
      showToast("Location address mein add ho gayi. Save Profile dabayein.");
    },
    (error) => {
      console.error("Profile GPS error:", error);
      if (button) {
        button.disabled = false;
        button.textContent = "📍 Use Current Location";
      }
      showToast(error.code === 1
        ? "Location permission allow kijiye."
        : "Location nahi mil paayi. Dobara try kijiye.");
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
  );
});

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
    card.dataset.productId = String(item.id);

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
      animateFoodToCart(card);
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

function animateFoodToCart(productCard) {
  const source = productCard?.querySelector(".product-emoji");
  const target = $("navCart")?.querySelector(".nav-cart-icon") || $("navCart");
  if (!source || !target || !source.textContent.trim()) return;
  const from = source.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  const flyer = document.createElement("div");
  flyer.textContent = source.textContent.trim();
  Object.assign(flyer.style, {
    position: "fixed", left: (from.left + from.width / 2 - 18) + "px",
    top: (from.top + from.height / 2 - 18) + "px", width: "36px", height: "36px",
    display: "grid", placeItems: "center", fontSize: "29px", zIndex: "99999",
    pointerEvents: "none", filter: "drop-shadow(0 5px 8px rgba(255,145,30,.55))",
    willChange: "transform,opacity"
  });
  document.body.appendChild(flyer);
  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  const animation = flyer.animate([
    { transform: "translate(0,0) scale(1) rotate(0deg)", opacity: 1 },
    { transform: "translate(" + (dx * .55) + "px," + (dy * .45 - 42) + "px) scale(1.18) rotate(18deg)", opacity: 1, offset: .55 },
    { transform: "translate(" + dx + "px," + dy + "px) scale(.22) rotate(35deg)", opacity: .12 }
  ], { duration: 720, easing: "cubic-bezier(.18,.78,.25,1)" });
  animation.onfinish = () => flyer.remove();
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

  if (count) {
    count.textContent = totalQuantity;
    count.style.display = totalQuantity > 0 ? "inline-flex" : "none";
  }
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
  // Render checkout immediately; payment settings must not block the checkout screen.
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
    <input id="customerName" type="text" placeholder="Enter your name" autocomplete="name" value="${escapeHTML(customerProfile.name)}">

    <label for="customerPhone">Mobile Number</label>
    <input id="customerPhone" type="tel" inputmode="numeric" maxlength="10" placeholder="10 digit mobile number" autocomplete="tel" value="${escapeHTML(customerProfile.phone)}">

    <label for="orderType">Order Type</label>
    <select id="orderType">
      <option value="Pickup">Pickup</option>
      <option value="Home Delivery">Home Delivery</option>
    </select>

    <button type="button" id="continueToPayment" style="width:100%;min-height:50px;margin:14px 0;background:#ff8a35!important;color:#17110d!important;border:1px solid #ff8a35;border-radius:12px;font-weight:800;font-size:15px;letter-spacing:.4px;box-shadow:0 5px 18px rgba(255,138,53,.22);">CONTINUE TO PAYMENT →</button>

    <div id="paymentSection" hidden style="display:none;background:#211b15;border:1px solid #ff8a35;border-radius:14px;padding:14px;margin:14px 0;">
      <h3 style="margin-top:0;">Choose Payment Method</h3>
      <label for="paymentMethod">Payment Option</label>
      <select id="paymentMethod" style="width:100%;margin:6px 0 14px;">
        <option value="UPI">Pay Online via UPI</option>
        <option value="COD">Cash on Delivery (COD)</option>
      </select>
      <div id="upiPaymentDetails" style="display:block;">
        <p style="margin:6px 0;">UPI ID: <strong id="checkoutUpiId">${escapeHTML(activeUpiId)}</strong></p>
        <div style="position:relative;overflow:hidden;text-align:center;background:linear-gradient(145deg,#342116 0%,#171311 55%,#2b1b12 100%);border:1px solid rgba(255,138,53,.75);border-radius:20px;padding:18px 14px 16px;margin:16px auto;max-width:310px;box-shadow:0 10px 28px rgba(0,0,0,.32),0 0 22px rgba(255,138,53,.12);">
          <div style="font-family:Outfit,sans-serif;font-size:21px;font-weight:900;letter-spacing:.2px;margin-bottom:3px;"><span style="color:#ff8a35;">Zaika</span><span style="color:#fff;">Box</span></div>
          <div style="font-size:10px;letter-spacing:2px;color:#ffc18f;font-weight:800;margin-bottom:13px;">SECURE UPI PAYMENT</div>
          <div style="background:#fff;border:5px solid #fff;border-radius:15px;padding:7px;margin:0 auto;max-width:252px;box-shadow:0 5px 18px rgba(0,0,0,.28);">
            <img id="checkoutUpiQr" src="https://api.qrserver.com/v1/create-qr-code/?size=260x260&amp;margin=10&amp;data=${encodeURIComponent(`upi://pay?pa=${activeUpiId}&pn=MOHAMMAD%20DANISH&am=${Number(getTotal()).toFixed(2)}&cu=INR&tn=ZaikaBox%20Order`)}" alt="Scan to pay ZaikaBox UPI" width="240" height="240" style="display:block;width:100%;max-width:240px;height:auto;margin:auto;" loading="eager">
          </div>
          <div style="display:inline-block;margin-top:13px;padding:7px 15px;border-radius:30px;background:#ff8a35;color:#17110d;font-size:12px;font-weight:900;letter-spacing:1px;">SCAN &amp; PAY</div>
          <p style="color:#f8e9df;font-size:12px;line-height:1.5;margin:10px 0 0;">Apne UPI app se QR scan karke payment karein</p>
        </div>
        <p style="font-size:12px;text-align:center;color:#ffbd87;">QR scan karke exact amount pay karein.</p>
        <p style="margin:6px 0;">Order Amount: <strong>${money(getTotal())}</strong></p>
        <button type="button" id="copyCheckoutUpi" style="display:block;width:100%;min-height:46px;margin:10px 0;background:#ff8a35!important;color:#17110d!important;border:1px solid #ff8a35;border-radius:11px;font-weight:800;font-size:14px;">COPY UPI ID</button>
        <button type="button" id="openUpiApp" style="display:block;width:100%;min-height:46px;margin:10px 0;background:#29211b!important;color:#ffffff!important;border:1px solid #ff8a35;border-radius:11px;font-weight:800;font-size:14px;">PAY</button>
        <label for="paymentUtr" style="display:block;margin-top:12px;">UPI Transaction ID</label>
        <input id="paymentUtr" type="text" maxlength="30" placeholder="Payment ke baad Transaction ID enter karein" autocomplete="off">
        <label style="display:flex;gap:8px;align-items:flex-start;margin-top:10px;font-size:13px;">
          <input id="paymentConfirmed" type="checkbox" style="width:auto;margin-top:3px;">
          Maine UPI app mein payment complete kar diya hai.
        </label>
        <p style="font-size:12px;color:#ffbd87;">Payment Transaction ID admin verify karne ke baad confirm hoga.</p>
      </div>
      <div id="codPaymentDetails" style="display:none;padding:12px;border:1px solid #4b8065;border-radius:10px;margin-top:10px;">
        <strong>Cash on Delivery selected</strong>
        <p style="margin:6px 0 0;">Aap delivery ke waqt cash mein payment kar sakte hain. Abhi online payment ya Transaction ID ki zaroorat nahi hai.</p>
      </div>
      <button type="button" id="placeOrder" style="display:block;width:100%;min-height:50px;margin-top:14px;background:#ff8a35!important;color:#17110d!important;border:1px solid #ff8a35;border-radius:12px;font-weight:900;font-size:15px;">I HAVE PAID</button>
    </div>

    <div id="addressBox" style="display:none;">
      <label for="customerAddress">Delivery Address</label>
      <textarea id="customerAddress" placeholder="Enter your full address">${escapeHTML(customerProfile.address)}</textarea>
      <button type="button" id="getLocation">📍 Use My Current Location</button>
    </div>
  `;

  lines.appendChild(form);

  // Load the restaurant/platform UPI ID in the background after checkout is visible.
  getDoc(doc(db, "platformSettings", "payments")).then((paymentSettings) => {
    if (paymentSettings.exists() && paymentSettings.data().upiId) {
      activeUpiId = String(paymentSettings.data().upiId).trim();
      const upiLabel = $("checkoutUpiId");
      if (upiLabel) upiLabel.textContent = activeUpiId;
      const qr = $("checkoutUpiQr");
      if (qr) {
        const qrPayload = `upi://pay?pa=${activeUpiId}&pn=MOHAMMAD%20DANISH&am=${Number(getTotal()).toFixed(2)}&cu=INR&tn=ZaikaBox%20Order`;
        qr.src = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&data=${encodeURIComponent(qrPayload)}`;
      }
    }
  }).catch((error) => console.warn("Using default UPI ID:", error));

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
    $("paymentSection").style.display = "block";
    $("continueToPayment").hidden = true;
    $("continueToPayment").style.display = "none";
    $("paymentSection").scrollIntoView({ behavior: "smooth", block: "center" });
  });
  $("paymentMethod").addEventListener("change", () => {
    const isUpi = $("paymentMethod").value === "UPI";
    $("upiPaymentDetails").style.display = isUpi ? "block" : "none";
    $("codPaymentDetails").style.display = isUpi ? "none" : "block";
    $("placeOrder").textContent = isUpi ? "I HAVE PAID" : "PLACE COD ORDER";
  });
  $("copyCheckoutUpi").addEventListener("click", () => copyText(activeUpiId));
  $("openUpiApp").addEventListener("click", () => {
    const amount = Number(getTotal()).toFixed(2);
    const upiUrl = `upi://pay?pa=${encodeURIComponent(activeUpiId)}&pn=${encodeURIComponent("MOHAMMAD DANISH")}&am=${amount}&cu=INR&tn=${encodeURIComponent("ZaikaBox Order")}`;
    window.location.href = upiUrl;
  });
  $("placeOrder").addEventListener("click", placeOrder);

  form.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

window.zaikaCheckoutClick = async function () {
  const checkoutButton = $("checkout");
  try {
    showToast("Checkout open ho raha hai...");
    if (!selectedRestaurant) {
      showToast("Restaurant select nahi hua. Restaurant page par wapas jaakar item add karein.");
      console.error("Checkout blocked: selectedRestaurant is missing.");
      return;
    }
    if (!cart.length) {
      showToast("Your cart is empty");
      return;
    }
    if (!auth.currentUser) {
      closeCart();
      window.zaikaGo?.("account");
      showToast("Order place karne ke liye pehle login ya sign up karein.");
      return;
    }
    if (checkoutButton) {
      checkoutButton.disabled = true;
      checkoutButton.textContent = "Opening Checkout...";
    }
    await createCheckoutForm();
    const checkoutForm = $("checkoutForm");
    if (!checkoutForm) throw new Error("Checkout form create nahi hua.");
    checkoutForm.hidden = false;
    checkoutForm.style.display = "block";
    checkoutForm.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    console.error("Proceed to Checkout error:", error);
    showToast("Checkout open nahi hua: " + (error?.message || "Please refresh and try again."));
  } finally {
    if (checkoutButton) {
      checkoutButton.disabled = false;
      checkoutButton.textContent = "Proceed to Checkout →";
    }
  }
};

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
        addressField.value = "Current location";
      }

      try {
        const url =
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.display_name && addressField) {
          addressField.value = data.display_name;
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
        <p>${status === "Payment Pending" ? "Aapka UPI payment reference admin verify kar raha hai. Payment confirm hone ke baad restaurant ko order milega." : "Payment verify nahi ho paaya. Transaction ID aur payment details check karke support se sampark karein."}</p>
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

  const paymentMethod = $("paymentMethod")?.value || "UPI";
  const utr = $("paymentUtr")?.value.trim() || "";
  if (paymentMethod === "UPI" && !/^[A-Za-z0-9]{6,30}$/.test(utr)) {
    showToast("Valid Transaction ID enter kijiye (6–30 characters).");
    $("paymentUtr")?.focus();
    return;
  }
  if (paymentMethod === "UPI" && !$("paymentConfirmed")?.checked) {
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
      customerUid: auth.currentUser?.uid || null,
      orderType,
      address: orderType === "Home Delivery" ? address : "",
      mapLink: orderType === "Home Delivery"
        ? (userLocation ? `https://www.google.com/maps?q=${userLocation.latitude},${userLocation.longitude}` : (customerProfile.mapLink || ""))
        : "",
      restaurantId: selectedRestaurant.id,
      restaurantName: selectedRestaurant.name || selectedRestaurant.Name || "Restaurant",
      items: orderItems,
      total: orderTotal,
      paymentMethod,
      paymentStatus: "Pending",
      utr: paymentMethod === "UPI" ? utr : "",
      status: paymentMethod === "UPI" ? "Payment Pending" : "New",
      trackingCode,
      createdAt: serverTimestamp()
    };

    const trackingData = {
      orderId: orderRef.id,
      restaurantId: selectedRestaurant.id,
      restaurantName: orderData.restaurantName,
      orderType,
      status: paymentMethod === "UPI" ? "Payment Pending" : "New",
      createdAt: serverTimestamp()
    };

    const batch = writeBatch(db);
    batch.set(orderRef, orderData);
    batch.set(trackingRef, trackingData);

    await batch.commit();

    // SAVE CUSTOMER DETAILS FOR THE NEXT CHECKOUT
    customerProfile = { name, phone, address, mapLink: userLocation ? `https://www.google.com/maps?q=${userLocation.latitude},${userLocation.longitude}` : (customerProfile.mapLink || "") };
    localStorage.setItem(CUSTOMER_PROFILE_STORAGE_KEY, JSON.stringify(customerProfile));
    try {
      await setDoc(doc(db, "customerProfiles", auth.currentUser.uid), {
        name, phone, address, updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (profileError) {
      console.warn("Profile cloud save unavailable:", profileError);
    }

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
    message += paymentMethod === "UPI"
      ? "Payment: UPI — Pending Verification\n"
      : "Payment: Cash on Delivery (COD)\n";
    if (paymentMethod === "UPI") message += `Transaction ID: ${utr}\n`;

    if (orderType === "Home Delivery") {
      message += `Address: ${address}\n`;
    }

    message += "\n*ITEMS*\n";

    orderItems.forEach((item) => {
      message += `${item.name} × ${item.quantity} = ₹${item.subtotal}\n`;
    });

    message += `\n*TOTAL: ₹${orderTotal}*\n`;
    message += paymentMethod === "UPI"
      ? "*STATUS: PAYMENT PENDING — ADMIN VERIFICATION REQUIRED*"
      : "*STATUS: NEW — CASH ON DELIVERY*";

    const whatsappURL =
      `https://wa.me/${DEFAULT_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

    cart = [];
    renderCart();
    renderMenu();
    closeCart();

    $("checkoutForm")?.remove();

    showOrderSuccess(orderRef.id, trackingCode, whatsappURL);
    showToast(paymentMethod === "UPI"
      ? "Order submitted. Payment verification pending."
      : "COD order successfully placed.");

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
