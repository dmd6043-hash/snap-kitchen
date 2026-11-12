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

// FIREBASE
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

// RESTAURANT AND MENU
let restaurants = [];
let selectedRestaurant = null;
let menu = [];
let category = "All";
let cart = {};

const $ = id => document.getElementById(id);

// RESTAURANT PICKER
function renderRestaurantPicker() {
  let picker = $("restaurantPicker");

  if (!picker) {
    picker = document.createElement("div");
    picker.id = "restaurantPicker";
    picker.style.cssText = "padding:12px 16px;margin:8px 0;";
    $("cats").parentNode.insertBefore(picker, $("cats"));
  }

  picker.innerHTML = `
    <label for="restaurantSelect" style="display:block;margin-bottom:7px;font-weight:bold;">
      Choose restaurant
    </label>

    <select id="restaurantSelect"
      style="width:100%;padding:12px;border-radius:10px;border:1px solid #777;background:#202a20;color:white;font-size:16px;">

      ${restaurants.map(r => `
        <option value="${r.id}" ${selectedRestaurant?.id === r.id ? "selected" : ""}>
          ${r.name}
        </option>
      `).join("")}

    </select>
  `;

  $("restaurantSelect").addEventListener("change", async e => {
    const next = restaurants.find(r => r.id === e.target.value);

    if (!next || next.id === selectedRestaurant?.id) return;

    selectedRestaurant = next;
    menu = [];
    cart = {};
    category = "All";

    update();

    $("products").innerHTML = "<p>Loading menu...</p>";

    await loadSelectedRestaurantMenu();
  });
}

// LOAD SELECTED RESTAURANT MENU
async function loadSelectedRestaurantMenu() {
  if (!selectedRestaurant) return;

  try {
    const menuRef = collection(
      db,
      "restaurants",
      selectedRestaurant.id,
      "menuItems"
    );

    const snapshot = await getDocs(menuRef);

    menu = snapshot.docs
      .map(itemDoc => {
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
      })
      .filter(item => item.available && item.p >= 0);

    render();
    update();

  } catch (error) {
    console.error("Menu load error:", error);

    $("products").innerHTML =
      "<p>Menu load nahi ho paya. Internet aur Firestore Rules check karein.</p>";

    $("empty").hidden = true;
  }
}

// LOAD RESTAURANTS
async function loadRestaurants() {
  try {
    const activeRestaurants = query(
      collection(db, "restaurants"),
      where("active", "==", true)
    );

    const snapshot = await getDocs(activeRestaurants);

    restaurants = snapshot.docs.map(restaurantDoc => ({
      id: restaurantDoc.id,
      ...restaurantDoc.data()
    }));

    if (!restaurants.length) {
      $("products").innerHTML =
        "<p>Abhi koi restaurant available nahi hai.</p>";

      $("empty").hidden = true;
      return;
    }

    selectedRestaurant = restaurants[0];

    renderRestaurantPicker();

    await loadSelectedRestaurantMenu();

  } catch (error) {
    console.error("Restaurant load error:", error);

    $("products").innerHTML =
      "<p>Restaurants load nahi hue. Firestore Rules aur internet check karein.</p>";

    $("empty").hidden = true;
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

// CART QUANTITY
function qty() {
  return Object.values(cart).reduce((a, b) => a + b, 0);
}

// CART TOTAL
function total() {
  return menu.reduce(
    (s, x) => s + (cart[x.id] || 0) * x.p,
    0
  );
}

// UPDATE CART
function update() {
  $("count").textContent = qty();

  $("navCart").innerHTML =
    `🛒<small>Cart (${qty()})</small>`;
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
function toast(t) {
  $("toast").textContent = t;

  $("toast").classList.add("show");

  setTimeout(
    () => $("toast").classList.remove("show"),
    2500
  );
}

// CATEGORY
$("cats").addEventListener("click", e => {
  const b = e.target.closest("[data-cat]");

  if (!b) return;

  category = b.dataset.cat;

  document.querySelectorAll("[data-cat]").forEach(x =>
    x.classList.toggle("active", x === b)
  );

  render();
});

// SEARCH
$("search").addEventListener("input", render);

// ADD TO CART
$("products").addEventListener("click", e => {
  const b = e.target.closest("[data-add]");

  if (!b) return;

  const id = b.dataset.add;

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

// CART QUANTITY BUTTONS
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

    if (cart[id] <= 0) {
      delete cart[id];
    }
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

      <input name="customerName"
        required maxlength="60"
        placeholder="Enter your name">

      <label>Mobile number</label>

      <input name="phone"
        type="tel"
        required
        pattern="[6-9][0-9]{9}"
        maxlength="10"
        inputmode="numeric"
        placeholder="10 digit mobile number">

      <label>Choose order type</label>

      <input type="hidden"
        name="orderType"
        id="orderType"
        value="Pickup">

      <div style="display:flex;gap:10px;margin:12px 0 18px;">

        <button type="button"
          data-order-type="Pickup"
          style="flex:1;min-height:50px;border:2px solid #c5ff36;
          border-radius:10px;background:#c5ff36;color:#172017;
          font-size:16px;font-weight:bold;">

          ✓ Pickup

        </button>

        <button type="button"
          data-order-type="Home Delivery"
          style="flex:1;min-height:50px;border:2px solid #65745c;
          border-radius:10px;background:#202a20;color:white;
          font-size:16px;font-weight:bold;">

          Home Delivery

        </button>

      </div>

      <div id="addressBox" hidden>

        <label>Delivery Address</label>

        <button type="button"
          id="getLocation"
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

      <p>
        <b>Payment: Cash on Delivery / Pay at pickup</b>
      </p>

      <button class="btn"
        type="submit"
        id="placeOrder">

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

  // PICKUP / HOME DELIVERY
  form.querySelectorAll("[data-order-type]").forEach(button => {

    button.addEventListener("click", () => {

      const selected = button.dataset.orderType;

      typeField.value = selected;

      form.querySelectorAll("[data-order-type]").forEach(btn => {

        const active = btn === button;

        btn.style.background =
          active ? "#c5ff36" : "#202a20";

        btn.style.color =
          active ? "#172017" : "#ffffff";

        btn.style.borderColor =
          active ? "#c5ff36" : "#65745c";

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

        locationButton.textContent =
          "📍 Use Current Location";

        locationButton.disabled = false;

        locationStatus.textContent =
          "Tap to share your current location.";
      }

    });

  });

  // GPS + AUTOMATIC ADDRESS
  locationButton.addEventListener("click", () => {

    if (!navigator.geolocation) {

      locationStatus.textContent =
        "Your browser does not support GPS.";

      return;
    }

    locationButton.disabled = true;

    locationButton.textContent =
      "Getting location...";

    locationStatus.textContent =
      "Please allow location permission.";

    navigator.geolocation.getCurrentPosition(

      async position => {

        latitude = position.coords.latitude;

        longitude = position.coords.longitude;

        mapLink =
          `https://www.google.com/maps?q=${latitude},${longitude}`;

        locationStatus.textContent =
          "GPS found! Getting your address...";

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
              "✓ Address automatically added! You can edit it.";

          } else {

            locationStatus.textContent =
              "GPS found, but address not found. Please enter manually.";

          }

        } catch (error) {

          console.error("Address error:", error);

          locationStatus.textContent =
            "GPS found, but address could not load. Please enter manually.";

        }

        locationButton.textContent =
          "✓ Location Added";

        locationButton.disabled = false;

      },

      error => {

        console.error(error);

        let message =
          "Could not get location. Please try again.";

        if (error.code === 1) {

          message =
            "Location permission denied. Allow location access.";

        } else if (error.code === 2) {

          message =
            "Location unavailable. Please turn on GPS.";

        } else if (error.code === 3) {

          message =
            "Location request timed out. Try again.";

        }

        locationStatus.textContent = message;

        locationButton.textContent =
          "📍 Try Again";

        locationButton.disabled = false;

      },

      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }

    );

  });

  // SAVE ORDER TO FIREBASE
  form.addEventListener("submit", async e => {

    e.preventDefault();

    const data = new FormData(form);

    const customerName =
      data.get("customerName").trim();

    const phone =
      data.get("phone").trim();

    const orderType =
      data.get("orderType");

    const address =
      (data.get("address") || "").trim();

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

      const orderRef = await addDoc(
        collection(db, "orders"),
        {

          customerName,

          phone,

          orderType,

          address,

          latitude,

          longitude,

          mapLink,

          items,

          total: amount,

          restaurantId:
            selectedRestaurant?.id || "snap-kitchen",

          restaurantName:
            selectedRestaurant?.name || "Snap Kitchen",

          paymentMethod: "Cash",

          status: "New",

          createdAt: serverTimestamp()

        }
      );

      const orderId = orderRef.id;

      // WHATSAPP MESSAGE
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
  : "Pickup from Snap Kitchen"}

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

      toast("Order saved successfully!");

      window.location.href = whatsappURL;

    } catch (error) {

      console.error("Order error:", error);

      button.disabled = false;

      button.textContent = "Try Again";

      toast("Order could not be saved. Please try again.");

    }

  });

});

// INITIALIZE
update();

$("products").innerHTML =
  "<p>Loading restaurants...</p>";

loadRestaurants();
