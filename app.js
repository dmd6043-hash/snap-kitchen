
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
let category = "All";
let cart = {};
let userLocation = null;

// HELPERS
function field(data, name, fallback = "") {
  return data?.[name] ?? fallback;
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function toast(message) {
  const box = $("toast");
  if (!box) return;

  box.textContent = message;
  box.classList.add("show");

  setTimeout(() => {
    box.classList.remove("show");
  }, 2200);
}

// LOAD ALL ACTIVE RESTAURANTS
async function loadRestaurants() {
  const grid = $("restaurantGrid");
  const status = $("restaurantStatus");

  if (grid) grid.innerHTML = "";
  if (status) status.textContent = "Restaurants loading...";

  try {
    const snapshot = await getDocs(collection(db, "restaurants"));

    restaurants = snapshot.docs
      .map((item) => ({
        ...item.data(),
        id: item.id
      }))
      .filter((restaurant) => {
        return field(
          restaurant,
          "active",
          field(restaurant, "Active", false)
        ) === true;
      });

    renderRestaurantCards();

  } catch (error) {
    console.error("Restaurant loading error:", error);

    if (status) {
      status.textContent = "Restaurants load nahi ho paaye.";
    }

    if (grid) {
      grid.innerHTML = `
        <button class="restaurant-card" id="retryRestaurants">
          🔄 Retry
        </button>
      `;

      $("retryRestaurants")?.addEventListener("click", loadRestaurants);
    }
  }
}

// SHOW RESTAURANT CARDS
function renderRestaurantCards() {
  const grid = $("restaurantGrid");
  const status = $("restaurantStatus");

  if (!grid) return;

  grid.innerHTML = "";

  if (restaurants.length === 0) {
    if (status) {
      status.textContent = "Abhi koi active restaurant available nahi hai.";
    }
    return;
  }

  if (status) {
    status.textContent = `${restaurants.length} restaurants available`;
  }

  restaurants.forEach((restaurant) => {
    const name = field(restaurant, "name", "Restaurant");
    const city = String(field(restaurant, "city", "Jagdalpur")).trim();
    const description = field(
      restaurant,
      "description",
      "Delicious food awaits you"
    );

    const isPureVeg = field(restaurant, "isPureVeg", false);

    const card = document.createElement("button");
    card.className = "restaurant-card";
    card.type = "button";
    card.dataset.restaurant = restaurant.id;

    card.innerHTML = `
      <div class="restaurant-icon">🍽️</div>

      <h3>${escapeHTML(name)}</h3>

      <p>${escapeHTML(description)}</p>

      <span>${escapeHTML(city)}</span>

      <div class="restaurant-tag">
        ${isPureVeg ? "🟢 Pure Veg" : "🍽️ Veg & Non-Veg"}
      </div>
    `;

    grid.appendChild(card);
  });
}

// SELECT RESTAURANT
$("restaurantGrid")?.addEventListener("click", (event) => {
  const card = event.target.closest("[data-restaurant]");
  if (!card) return;

  const restaurant = restaurants.find(
    (item) => item.id === card.dataset.restaurant
  );

  if (!restaurant) return;

  selectedRestaurant = restaurant;

  // Har restaurant ka alag cart
  cart = {};
  menu = [];
  category = "All";
  userLocation = null;

  update();

  if ($("restaurants")) {
    $("restaurants").hidden = true;
  }

  if ($("menu")) {
    $("menu").hidden = false;
  }

  if ($("selectedRestaurantName")) {
    $("selectedRestaurantName").textContent =
      restaurant.name || "Restaurant";
  }

  if ($("search")) {
    $("search").value = "";
  }

  document.querySelectorAll("#cats button").forEach((button) => {
    button.classList.remove("active");

    if (
      (button.dataset.category || button.textContent.trim())
        .toLowerCase() === "all"
    ) {
      button.classList.add("active");
    }
  });

  loadSelectedRestaurantMenu();

  $("menu")?.scrollIntoView({ behavior: "smooth" });
});

// BACK TO RESTAURANTS
$("backRestaurants")?.addEventListener("click", () => {
  if ($("menu")) {
    $("menu").hidden = true;
  }

  if ($("restaurants")) {
    $("restaurants").hidden = false;
  }

  if ($("search")) {
    $("search").value = "";
  }

  $("restaurants")?.scrollIntoView({ behavior: "smooth" });
});

// LOAD SELECTED RESTAURANT MENU
async function loadSelectedRestaurantMenu() {
  if (!selectedRestaurant) return;

  const products = $("products");
  const empty = $("empty");

  if (products) {
    products.innerHTML = "<p>Loading menu...</p>";
  }

  if (empty) {
    empty.hidden = true;
  }

  try {
    const menuRef = collection(
      db,
      "restaurants",
      selectedRestaurant.id,
      "menuItems"
    );

    const snapshot = await getDocs(menuRef);

    menu = snapshot.docs.map((item) => {
      const data = item.data();

      return {
        id: item.id,

        n: field(data, "name", field(data, "Name", "Food Item")),

        c: field(data, "category", field(data, "Category", "Other")),

        p: Number(field(data, "price", field(data, "Price", 0))),

        d: field(data, "description", field(data, "Description", "")),

        e: field(data, "emoji", field(data, "Emoji", "🍽️")),

        foodType: field(
          data,
          "foodType",
          field(data, "FoodType", "Veg")
        ),

        available: field(
          data,
          "available",
          field(data, "Available", false)
        )
      };
    }).filter((item) => {
      return item.available === true && Number.isFinite(item.p);
    });

    render();
    update();

  } catch (error) {
    console.error("Menu loading error:", error);

    if (products) {
      products.innerHTML = `
        <p>Menu load nahi ho paya. Please dobara try karein.</p>
        <button id="retryMenu">Retry</button>
      `;

      $("retryMenu")?.addEventListener(
        "click",
        loadSelectedRestaurantMenu
      );
    }

    toast("Menu loading error");
  }
}

// RENDER MENU
function render() {
  const products = $("products");
  const empty = $("empty");

  if (!products) return;

  const searchText = ($("search")?.value || "").toLowerCase();

  const filtered = menu.filter((item) => {
    const itemCategory = String(item.c || "").toLowerCase();

    const categoryMatch =
      category === "All" ||
      itemCategory === category.toLowerCase();

    const searchMatch =
      String(item.n).toLowerCase().includes(searchText) ||
      itemCategory.includes(searchText);

    return categoryMatch && searchMatch;
  });

  products.innerHTML = "";

  if (filtered.length === 0) {
    if (empty) empty.hidden = false;

    products.innerHTML = "<p>No menu items available.</p>";
    return;
  }

  if (empty) empty.hidden = true;

  filtered.forEach((item) => {
    const quantity = cart[item.id] || 0;

    const card = document.createElement("div");
    card.className = "product-card";

    card.innerHTML = `
      <div class="product-emoji">
        ${escapeHTML(item.e)}
      </div>

      <div class="product-info">
        <h3>${escapeHTML(item.n)}</h3>
        <p>${escapeHTML(item.d)}</p>
        <strong>₹${item.p}</strong>
      </div>

      <button class="add-btn" data-add="${escapeHTML(item.id)}">
        ${quantity > 0 ? quantity + " Added" : "ADD +"}
      </button>
    `;

    products.appendChild(card);
  });
}

// CART HELPERS
function qty() {
  return Object.values(cart).reduce(
    (sum, value) => sum + value,
    0
  );
}

function total() {
  return menu.reduce((sum, item) => {
    return sum + item.p * (cart[item.id] || 0);
  }, 0);
}

function update() {
  const count = qty();

  if ($("count")) {
    $("count").textContent = count;
  }

  if ($("navCart")) {
    $("navCart").textContent = count;
  }

  if ($("total")) {
    $("total").textContent = "₹" + total();
  }

  renderCart();
}

// RENDER CART
function renderCart() {
  const lines = $("cartLines");
  if (!lines) return;

  lines.innerHTML = "";

  const selectedItems = menu.filter(
    (item) => cart[item.id] > 0
  );

  if (selectedItems.length === 0) {
    lines.innerHTML = "<p>Your cart is empty.</p>";
    return;
  }

  selectedItems.forEach((item) => {
    const row = document.createElement("div");
    row.className = "cart-item";

    row.innerHTML = `
      <div>
        <strong>${escapeHTML(item.n)}</strong>
        <p>₹${item.p} × ${cart[item.id]}</p>
      </div>

      <div class="cart-quantity">
        <button data-minus="${escapeHTML(item.id)}">−</button>
        <span>${cart[item.id]}</span>
        <button data-plus="${escapeHTML(item.id)}">+</button>
      </div>
    `;

    lines.appendChild(row);
  });
}

// ADD TO CART
$("products")?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-add]");
  if (!button) return;

  const id = button.dataset.add;

  cart[id] = (cart[id] || 0) + 1;

  update();
  render();

  toast("Added to cart");
});

// CART QUANTITY
$("cartLines")?.addEventListener("click", (event) => {
  const plus = event.target.closest("[data-plus]");
  const minus = event.target.closest("[data-minus]");

  if (plus) {
    const id = plus.dataset.plus;
    cart[id] = (cart[id] || 0) + 1;
  }

  if (minus) {
    const id = minus.dataset.minus;
    cart[id] = (cart[id] || 0) - 1;

    if (cart[id] <= 0) {
      delete cart[id];
    }
  }

  update();
  render();
});

// SEARCH
$("search")?.addEventListener("input", render);

// CATEGORY FILTER
$("cats")?.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  category = button.dataset.category || button.textContent.trim();

  document.querySelectorAll("#cats button").forEach((item) => {
    item.classList.remove("active");
  });

  button.classList.add("active");

  render();
});

// OPEN / CLOSE CART
function openCart() {
  $("shade")?.classList.add("show");
  $("cart")?.classList.add("show");
}

$("openCart")?.addEventListener("click", openCart);

$("viewCart")?.addEventListener("click", openCart);

$("close")?.addEventListener("click", () => {
  $("shade")?.classList.remove("show");
  $("cart")?.classList.remove("show");
});

$("shade")?.addEventListener("click", () => {
  $("shade")?.classList.remove("show");
  $("cart")?.classList.remove("show");
});

// CHECKOUT FORM
$("checkout")?.addEventListener("click", () => {
  if (!selectedRestaurant) {
    toast("Please select a restaurant");
    return;
  }

  if (qty() === 0) {
    toast("Your cart is empty");
    return;
  }

  if ($("checkoutForm")) {
    $("checkoutForm").scrollIntoView({ behavior: "smooth" });
    return;
  }

  const form = document.createElement("div");
  form.id = "checkoutForm";

  form.innerHTML = `
    <h3>Order Details</h3>

    <input
      id="customerName"
      type="text"
      placeholder="Your name"
      required
    >

    <input
      id="customerPhone"
      type="tel"
      placeholder="Mobile number"
      maxlength="10"
      required
    >

    <select id="orderType">
      <option value="Pickup">Pickup</option>
      <option value="Home Delivery">Home Delivery</option>
    </select>

    <textarea
      id="customerAddress"
      placeholder="Delivery address"
    ></textarea>

    <button type="button" id="getLocation">
      📍 Use my current location
    </button>

    <p id="locationStatus"></p>

    <button type="button" id="placeOrder">
      Place Order
    </button>
  `;

  $("cartLines")?.appendChild(form);

  $("getLocation")?.addEventListener(
    "click",
    getCurrentLocation
  );

  $("orderType")?.addEventListener("change", () => {
    const address = $("customerAddress");

    if (address) {
      address.required =
        $("orderType").value === "Home Delivery";
    }
  });

  $("placeOrder")?.addEventListener("click", placeOrder);

  form.scrollIntoView({ behavior: "smooth" });
});

// GET GPS LOCATION
function getCurrentLocation() {
  const status = $("locationStatus");

  if (!navigator.geolocation) {
    if (status) {
      status.textContent = "Location support nahi hai.";
    }
    return;
  }

  if (status) {
    status.textContent = "Location mil rahi hai...";
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      userLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };

      const mapLink =
        `https://www.google.com/maps?q=${userLocation.latitude},${userLocation.longitude}`;

      if (status) {
        status.innerHTML =
          `<a href="${mapLink}" target="_blank" rel="noopener">Location captured</a>`;
      }

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${userLocation.latitude}&lon=${userLocation.longitude}`
        );

        const data = await response.json();

        if (data.display_name && $("customerAddress")) {
          $("customerAddress").value = data.display_name;
        }

      } catch (error) {
        console.log("Address lookup unavailable:", error);
      }
    },

    (error) => {
      console.error(error);

      if (status) {
        status.textContent =
          "Location nahi mil paayi. Address manually likhein.";
      }
    },

    {
      enableHighAccuracy: true,
      timeout: 15000
    }
  );
}

// PLACE ORDER
async function placeOrder() {
  const name = $("customerName")?.value.trim();
  const phone = $("customerPhone")?.value.trim();
  const orderType = $("orderType")?.value;
  const address = $("customerAddress")?.value.trim();

  if (!name || !phone) {
    toast("Name aur mobile number bhariye");
    return;
  }

  if (!/^[6-9]\d{9}$/.test(phone)) {
    toast("Valid 10 digit mobile number bhariye");
    return;
  }

  if (orderType === "Home Delivery" && !address) {
    toast("Delivery address bhariye");
    return;
  }

  if (!selectedRestaurant || qty() === 0) {
    toast("Cart empty hai ya restaurant select nahi hai");
    return;
  }

  const orderItems = menu
    .filter((item) => cart[item.id] > 0)
    .map((item) => ({
      id: item.id,
      name: item.n,
      price: item.p,
      quantity: cart[item.id],
      subtotal: item.p * cart[item.id]
    }));

  const orderTotal = total();

  const mapLink = userLocation
    ? `https://www.google.com/maps?q=${userLocation.latitude},${userLocation.longitude}`
    : "";

  const button = $("placeOrder");

  if (button) {
    button.disabled = true;
    button.textContent = "Placing Order...";
  }

  try {
    const orderData = {
      customerName: name,
      phone: phone,
      orderType: orderType,
      address: address,

      latitude: userLocation?.latitude ?? null,
      longitude: userLocation?.longitude ?? null,
      mapLink: mapLink,

      items: orderItems,
      total: orderTotal,

      restaurantId: selectedRestaurant.id,
      restaurantName: selectedRestaurant.name || "Restaurant",

      paymentMethod: "Cash",
      status: "New",
      createdAt: serverTimestamp()
    };

    await addDoc(collection(db, "orders"), orderData);

    const whatsappNumber =
      selectedRestaurant.whatsappNumber ||
      DEFAULT_WHATSAPP_NUMBER;

    let message = `*NEW ORDER - ZAIKABOX*\n\n`;

    message += `Restaurant: ${selectedRestaurant.name}\n`;
    message += `Customer: ${name}\n`;
    message += `Phone: ${phone}\n`;
    message += `Order Type: ${orderType}\n`;
    message += `Address: ${address || "Pickup"}\n\n`;

    message += `*ORDER ITEMS*\n`;

    orderItems.forEach((item) => {
      message +=
        `${item.name} × ${item.quantity} = ₹${item.subtotal}\n`;
    });

    message += `\n*TOTAL: ₹${orderTotal}*\n`;
    message += `Payment: Cash`;

    if (mapLink) {
      message += `\nLocation: ${mapLink}`;
    }

    cart = {};
    update();

    toast("Order saved successfully!");

    $("checkoutForm")?.remove();

    const whatsappURL =
      `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

    window.open(whatsappURL, "_blank");

  } catch (error) {
    console.error("Order error:", error);

    toast("Order place nahi hua. Please dobara try karein.");

    if (button) {
      button.disabled = false;
      button.textContent = "Place Order";
    }
  }
}

// START APP
update();

if ($("restaurantStatus")) {
  $("restaurantStatus").textContent = "Restaurants loading...";
}

loadRestaurants();
