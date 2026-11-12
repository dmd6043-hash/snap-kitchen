
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";

import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
  query,
  where
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

let restaurants = [];
let selectedRestaurant = null;
let menu = [];
let category = "All";
let cart = {};

const $ = id => document.getElementById(id);

// ERROR DISPLAY
function showError(message) {
  const products = $("products");

  if (products) {
    products.innerHTML = `
      <div style="padding:18px;color:#ffb18a;text-align:center;">
        <h3>ZaikaBox</h3>
        <p>${message}</p>
        <button onclick="location.reload()"
          style="padding:12px 22px;border:0;border-radius:10px;">
          Retry
        </button>
      </div>
    `;
  }

  if ($("empty")) $("empty").hidden = true;
}

// RESTAURANT PICKER
function renderRestaurantPicker() {
  let picker = $("restaurantPicker");

  if (!picker) {
    picker = document.createElement("div");
    picker.id = "restaurantPicker";
    picker.style.cssText = "padding:12px 16px;margin:12px 0;";

    const cats = $("cats");

    if (!cats || !cats.parentNode) {
      throw new Error("Category section not found in index.html");
    }

    cats.parentNode.insertBefore(picker, cats);
  }

  picker.innerHTML = `
    <label for="restaurantSelect"
      style="display:block;margin-bottom:8px;font-weight:bold;color:white;">
      Choose restaurant
    </label>

    <select id="restaurantSelect"
      style="width:100%;padding:14px;border-radius:12px;
      border:1px solid #8e45d9;background:#241331;
      color:white;font-size:16px;">

      ${restaurants.map(r => `
        <option value="${r.id}">
          ${r.name || "Restaurant"}
        </option>
      `).join("")}

    </select>
  `;

  $("restaurantSelect").value = selectedRestaurant.id;

  $("restaurantSelect").addEventListener("change", async e => {
    const next = restaurants.find(r => r.id === e.target.value);

    if (!next) return;

    selectedRestaurant = next;
    menu = [];
    cart = {};
    category = "All";

    update();

    $("products").innerHTML = "<p>Loading menu...</p>";

    await loadSelectedRestaurantMenu();
  });
}

// LOAD RESTAURANT MENU
async function loadSelectedRestaurantMenu() {
  if (!selectedRestaurant) return;

  try {
    console.log("Loading menu for:", selectedRestaurant.id);

    const menuRef = collection(
      db,
      "restaurants",
      selectedRestaurant.id,
      "menuItems"
    );

    const snapshot = await getDocs(menuRef);

    console.log("Menu documents found:", snapshot.size);

    menu = snapshot.docs.map(itemDoc => {
      const data = itemDoc.data();

      return {
        id: itemDoc.id,
        n: data.name || "Unnamed item",
        c: data.category || "Other",
        p: Number(data.price || 0),
        d: data.description || "",
        e: data.emoji || "🍽️",
        foodType: data.foodType || "veg",
        available: data.available === true
      };
    }).filter(item => item.available);

    render();
    update();

    if (!menu.length) {
      $("products").innerHTML =
        "<p>No menu items available in this restaurant.</p>";
      $("empty").hidden = true;
    }

  } catch (error) {
    console.error("MENU ERROR:", error);

    showError("Menu load nahi hua. Error: " + error.message);
  }
}

// LOAD ACTIVE RESTAURANTS
async function loadRestaurants() {
  try {
    $("products").innerHTML = "<p>Loading restaurants...</p>";

    console.log("Firebase project:", firebaseConfig.projectId);
    console.log("Checking active restaurants...");

    const restaurantQuery = query(
      collection(db, "restaurants"),
      where("active", "==", true)
    );

    const snapshot = await getDocs(restaurantQuery);

    console.log("Restaurant documents found:", snapshot.size);

    console.log(
      "Restaurant IDs:",
      snapshot.docs.map(doc => doc.id)
    );

    console.log(
      "Restaurant data:",
      snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        active: doc.data().active,
        city: doc.data().city
      }))
    );

    restaurants = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    if (restaurants.length === 0) {
      showError(
        "Abhi koi active restaurant nahi mila. Firebase project: " +
        firebaseConfig.projectId
      );
      return;
    }

    selectedRestaurant = restaurants[0];

    console.log("Selected restaurant:", selectedRestaurant);

    renderRestaurantPicker();

    await loadSelectedRestaurantMenu();

  } catch (error) {
    console.error("RESTAURANT ERROR:", error);
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);

    showError(
      "Restaurant load nahi hua. " +
      "Error code: " + (error.code || "Unknown") +
      " | " + error.message
    );
  }
}

// DISPLAY MENU
function render() {
  const q = $("search").value.toLowerCase();

  const list = menu.filter(x =>
    (category === "All" || x.c === category) &&
    (x.n + " " + x.d).toLowerCase().includes(q)
  );

  $("products").innerHTML = list.map(x => `
    <article class="product">
      <div class="art">${x.e}</div>

      <div class="details">
        <h3>${x.n}</h3>
        <p>${x.d}</p>

        <div class="row">
          <span>₹${x.p}</span>

          <button class="add" data-add="${x.id}">
            + ADD
          </button>
        </div>
      </div>
    </article>
  `).join("");

  $("empty").hidden = list.length > 0;
}

// CART COUNT
function qty() {
  return Object.values(cart).reduce((a, b) => a + b, 0);
}

// CART TOTAL
function total() {
  return menu.reduce(
    (sum, item) => sum + (cart[item.id] || 0) * item.p,
    0
  );
}

// UPDATE CART
function update() {
  $("count").textContent = qty();

  $("navCart").innerHTML = `🛒<small>Cart (${qty()})</small>`;
}

// OPEN CART
function openCart() {
  const chosen = menu.filter(x => cart[x.id]);

  $("cartLines").innerHTML = chosen.length
    ? chosen.map(x => `
      <div class="cartline">
        <span>
          ${x.n}<br>
          <small>₹${x.p} each</small>
        </span>

        <span class="qty">
          <button data-minus="${x.id}">−</button>
          ${cart[x.id]}
          <button data-plus="${x.id}">+</button>
        </span>
      </div>
    `).join("")
    : "Your cart is empty.";

  $("total").textContent = "₹" + total();
  $("checkout").hidden = !chosen.length;
  $("shade").classList.add("show");
}

// TOAST
function toast(message) {
  $("toast").textContent = message;
  $("toast").classList.add("show");

  setTimeout(() => {
    $("toast").classList.remove("show");
  }, 2500);
}

// CATEGORY
$("cats").addEventListener("click", e => {
  const button = e.target.closest("[data-cat]");
  if (!button) return;

  category = button.dataset.cat;

  document.querySelectorAll("[data-cat]").forEach(x => {
    x.classList.toggle("active", x === button);
  });

  render();
});

// SEARCH
$("search").addEventListener("input", render);

// ADD TO CART
$("products").addEventListener("click", e => {
  const button = e.target.closest("[data-add]");
  if (!button) return;

  const id = button.dataset.add;
  cart[id] = (cart[id] || 0) + 1;

  update();
  toast("Added to cart!");
});

// CART BUTTONS
["openCart", "navCart", "viewCart"].forEach(id => {
  $(id).addEventListener("click", openCart);
});

// CLOSE CART
$("close").addEventListener("click", () => {
  $("shade").classList.remove("show");
});

$("shade").addEventListener("click", e => {
  if (e.target === $("shade")) {
    $("shade").classList.remove("show");
  }
});

// CART QUANTITY
$("cartLines").addEventListener("click", e => {
  const plus = e.target.closest("[data-plus]");
  const minus = e.target.closest("[data-minus]");

  if (!plus && !minus) return;

  if (plus) {
    cart[plus.dataset.plus]++;
  }

  if (minus) {
    const id = minus.dataset.minus;
    cart[id]--;

    if (cart[id] <= 0) delete cart[id];
  }

  update();
  openCart();
});

// CHECKOUT
$("checkout").addEventListener("click", () => {
  if (!qty()) return toast("Your cart is empty!");

  $("cartLines").innerHTML = `
    <form id="orderForm">
      <label>Your name</label>
      <input name="customerName" required maxlength="60"
        placeholder="Enter your name">

      <label>Mobile number</label>
      <input name="phone" type="tel" required
        pattern="[6-9][0-9]{9}" maxlength="10"
        inputmode="numeric" placeholder="10 digit mobile number">

      <label>Choose order type</label>
      <input type="hidden" name="orderType" id="orderType" value="Pickup">

      <div style="display:flex;gap:10px;margin:12px 0 18px;">
        <button type="button" data-order-type="Pickup"
          style="flex:1;min-height:50px;border:2px solid #c5ff36;
          border-radius:10px;background:#c5ff36;color:#172017;
          font-size:16px;font-weight:bold;">
          ✓ Pickup
        </button>

        <button type="button" data-order-type="Home Delivery"
          style="flex:1;min-height:50px;border:2px solid #65745c;
          border-radius:10px;background:#202a20;color:white;
          font-size:16px;font-weight:bold;">
          Home Delivery
        </button>
      </div>

      <div id="addressBox" hidden>
        <label>Delivery Address</label>

        <button type="button" id="getLocation"
          style="width:100%;min-height:48px;margin:8px 0;
          border:2px solid #c5ff36;border-radius:10px;
          background:#202a20;color:#c5ff36;
          font-size:15px;font-weight:bold;">
          📍 Use Current Location
        </button>

        <p id="locationStatus"
          style="font-size:13px;color:#777;margin:5px 0 10px;">
          Tap to share your current location.
        </p>

        <textarea name="address"
          placeholder="House number, area, landmark"></textarea>
      </div>

      <p><b>Payment: Cash on Delivery / Pay at pickup</b></p>

      <button class="btn" type="submit" id="placeOrder">
        Place order →
      </button>
    </form>
  `;

  $("checkout").hidden = true;

  const form = $("orderForm");
  const addressBox = $("addressBox");
  const addressField = form.elements.address;
  const typeField = $("orderType");
  const locationButton = $("getLocation");
  const locationStatus = $("locationStatus");

  let latitude = null;
  let longitude = null;
  let mapLink = "";

  // PICKUP / DELIVERY
  form.querySelectorAll("[data-order-type]").forEach(button => {
    button.addEventListener("click", () => {
      const selected = button.dataset.orderType;
      typeField.value = selected;

      form.querySelectorAll("[data-order-type]").forEach(btn => {
        const active = btn === button;

        btn.style.background = active ? "#c5ff36" : "#202a20";
        btn.style.color = active ? "#172017" : "#ffffff";
        btn.style.borderColor = active ? "#c5ff36" : "#65745c";

        btn.textContent = active
          ? "✓ " + btn.dataset.orderType
          : btn.dataset.orderType;
      });

      addressBox.hidden = selected !== "Home Delivery";

      if (selected !== "Home Delivery") {
        addressField.value = "";
        latitude = null;
        longitude = null;
        mapLink = "";

        locationButton.textContent = "📍 Use Current Location";
        locationButton.disabled = false;

        locationStatus.textContent =
          "Tap to share your current location.";
      }
    });
  });

  // GPS LOCATION
  locationButton.addEventListener("click", () => {
    if (!navigator.geolocation) {
      locationStatus.textContent =
        "Your browser does not support GPS.";
      return;
    }

    locationButton.disabled = true;
    locationButton.textContent = "Getting location...";

    navigator.geolocation.getCurrentPosition(
      async position => {
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;

        mapLink =
          `https://www.google.com/maps?q=${latitude},${longitude}`;

        locationStatus.textContent =
          "GPS found! Getting address...";

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
          );

          if (!response.ok) {
            throw new Error("Address service unavailable");
          }

          const result = await response.json();

          if (result.display_name) {
            addressField.value = result.display_name;
            locationStatus.textContent =
              "✓ Address added! You can edit it.";
          } else {
            locationStatus.textContent =
              "GPS found. Please enter address manually.";
          }

        } catch (error) {
          console.error(error);

          locationStatus.textContent =
            "GPS found, but address could not load. Enter manually.";
        }

        locationButton.textContent = "✓ Location Added";
        locationButton.disabled = false;
      },

      error => {
        console.error(error);

        locationStatus.textContent =
          error.code === 1
            ? "Location permission denied. Allow location access."
            : "Could not get location. Please try again.";

        locationButton.textContent = "📍 Try Again";
        locationButton.disabled = false;
      },

      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  });

  // SAVE ORDER
  form.addEventListener("submit", async e => {
    e.preventDefault();

    const data = new FormData(form);

    const customerName = data.get("customerName").trim();
    const phone = data.get("phone").trim();
    const orderType = data.get("orderType");
    const address = (data.get("address") || "").trim();

    if (
      orderType === "Home Delivery" &&
      !address &&
      latitude === null
    ) {
      toast("Please enter address or use current location.");
      return;
    }

    const items = menu
      .filter(x => cart[x.id])
      .map(x => ({
        name: x.n,
        price: x.p,
        quantity: cart[x.id],
        subtotal: x.p * cart[x.id]
      }));

    const amount = total();
    const button = $("placeOrder");

    button.disabled = true;
    button.textContent = "Saving order...";

    try {
      const orderRef = await addDoc(collection(db, "orders"), {
        customerName,
        phone,
        orderType,
        address,
        latitude,
        longitude,
        mapLink,
        items,
        total: amount,

        restaurantId: selectedRestaurant?.id || "snap-kitchen",
        restaurantName: selectedRestaurant?.name || "Snap Kitchen",

        paymentMethod: "Cash",
        status: "New",
        createdAt: serverTimestamp()
      });

      const orderId = orderRef.id;

      const itemText = items.map(x =>
        `${x.name} x ${x.quantity} = Rs.${x.subtotal}`
      ).join("\n");

      const message =
`🍽️ NEW ${selectedRestaurant?.name || "SNAP KITCHEN"} ORDER

Order ID: ${orderId}

Name: ${customerName}
Phone: ${phone}
Order Type: ${orderType}

${orderType === "Home Delivery"
  ? `Address: ${address || "Current location shared"}\n${mapLink ? "Google Maps: " + mapLink : ""}`
  : "Pickup"}

ITEMS:
${itemText}

Total: Rs.${amount}
Payment: Cash

Thank you!`;

      const whatsappNumber =
        selectedRestaurant?.whatsappNumber ||
        DEFAULT_WHATSAPP_NUMBER;

      const whatsappURL =
        `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

      cart = {};
      update();

      window.location.href = whatsappURL;

    } catch (error) {
      console.error("ORDER ERROR:", error);

      button.disabled = false;
      button.textContent = "Try Again";

      toast("Order could not be saved. Please try again.");
    }
  });
});

// START APP
update();

$("products").innerHTML = "<p>Loading restaurants...</p>";

loadRestaurants();
