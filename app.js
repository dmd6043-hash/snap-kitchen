import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCiG0M2i59aJGUge5SokM8nHkC8k4SByE",
  authDomain: "snap-kitchen-b8a73.firebaseapp.com",
  projectId: "snap-kitchen-b8a73",
  storageBucket: "snap-kitchen-b8a73.firebasestorage.app",
  messagingSenderId: "1060475241392",
  appId: "1:1060475241392:web:c3751859ecb085830b8c75",
  measurementId: "G-KRFFRFJY5X"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const menu = [
  {id:1,n:"Veg Steam Momos",c:"Momos",p:30,d:"8 pieces • Fresh & soft",e:"🥟"},
  {id:2,n:"Paneer Steam Momos",c:"Momos",p:50,d:"6 pieces • Paneer filling",e:"🥟"},
  {id:3,n:"Veg Chilli Momos",c:"Chinese",p:60,d:"Spicy tossed momos",e:"🥡"},
  {id:4,n:"Soya Chilli",c:"Chinese",p:40,d:"Half portion",e:"🍲"},
  {id:5,n:"Paneer Chilli",c:"Chinese",p:60,d:"Half portion",e:"🍛"},
  {id:6,n:"Soya Kathi Roll",c:"Rolls",p:40,d:"Desi street-style roll",e:"🌯"},
  {id:7,n:"Paneer Kathi Roll",c:"Rolls",p:70,d:"Loaded paneer filling",e:"🌯"},
  {id:8,n:"Peri Peri Fries",c:"Snacks",p:50,d:"Crispy & spicy",e:"🍟"},
  {id:9,n:"Alu Tikki Chaat",c:"Snacks",p:30,d:"Tangy street-style chaat",e:"🥗"}
];

let category = "All", cart = {};
const $ = id => document.getElementById(id);

function render() {
  let q = $("search").value.toLowerCase();

  let list = menu.filter(x =>
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
          <button class="add" data-add="${x.id}">+ ADD</button>
        </div>
      </div>
    </article>
  `).join("");

  $("empty").hidden = list.length > 0;
}

function qty() {
  return Object.values(cart).reduce((a,b) => a+b, 0);
}

function total() {
  return menu.reduce((s,x) => s+(cart[x.id]||0)*x.p, 0);
}

function update() {
  $("count").textContent = qty();
  $("navCart").innerHTML = `🛒<small>Cart (${qty()})</small>`;
}

function openCart() {
  let chosen = menu.filter(x => cart[x.id]);

  $("cartLines").innerHTML = chosen.length
    ? chosen.map(x => `
      <div class="cartline">
        <span>${x.n}<br><small>₹${x.p} each</small></span>
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

function toast(t) {
  $("toast").textContent = t;
  $("toast").classList.add("show");
  setTimeout(() => $("toast").classList.remove("show"), 2500);
}

$("cats").addEventListener("click", e => {
  let b = e.target.closest("[data-cat]");
  if (!b) return;

  category = b.dataset.cat;

  document.querySelectorAll("[data-cat]").forEach(x =>
    x.classList.toggle("active", x === b)
  );

  render();
});

$("search").addEventListener("input", render);

$("products").addEventListener("click", e => {
  let b = e.target.closest("[data-add]");
  if (!b) return;

  let id = +b.dataset.add;
  cart[id] = (cart[id] || 0) + 1;

  update();
  toast("Added to cart!");
});

["openCart","navCart","viewCart"].forEach(id =>
  $(id).addEventListener("click", openCart)
);

$("close").addEventListener("click", () =>
  $("shade").classList.remove("show")
);

$("shade").addEventListener("click", e => {
  if (e.target === $("shade")) {
    $("shade").classList.remove("show");
  }
});

/* CART QUANTITY BUTTON FIXED */

$("cartLines").addEventListener("click", e => {
  let p = e.target.closest("[data-plus]");
  let m = e.target.closest("[data-minus]");

  // Important: checkout form ke doosre buttons par cart reload nahi hoga
  if (!p && !m) return;

  if (p) cart[+p.dataset.plus]++;

  if (m) {
    let id = +m.dataset.minus;
    cart[id]--;

    if (cart[id] <= 0) delete cart[id];
  }

  update();
  openCart();
});

/* CHECKOUT FORM */

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
        placeholder="10 digit mobile number">

      <label>Choose order type</label>

      <input type="hidden" name="orderType"
        id="orderType" value="Pickup">

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
        <label>Delivery address</label>
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
      addressField.required = selected === "Home Delivery";
    });
  });

  form.addEventListener("submit", async e => {
    e.preventDefault();

    const data = new FormData(form);

    const customerName = data.get("customerName").trim();
    const phone = data.get("phone").trim();
    const orderType = data.get("orderType");
    const address = (data.get("address") || "").trim();

    const items = menu.filter(x => cart[x.id]).map(x => ({
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
        items,
        total: amount,
        paymentMethod: "Cash",
        status: "New",
        createdAt: serverTimestamp()
      });

      const orderId = orderRef.id;

      const itemText = items.map(x =>
        `${x.name} x ${x.quantity} = Rs.${x.subtotal}`
      ).join("\n");

      const message =
`NEW SNAP KITCHEN ORDER
Order ID: ${orderId}
Name: ${customerName}
Phone: ${phone}
Type: ${orderType}
${address ? "Address: " + address : ""}
Items:
${itemText}
Total: Rs.${amount}
Payment: Cash`;

      cart = {};
      update();

      $("shade").classList.remove("show");

      toast("Order saved successfully! Order ID: " + orderId);

      window.open(
        "https://wa.me/918319014718?text=" +
        encodeURIComponent(message),
        "_blank"
      );

    } catch (error) {
      console.error(error);

      toast("Order save nahi hua: " + error.message);

      button.disabled = false;
      button.textContent = "Try again";
    }
  });
});

function rewards() {
  $("rewards").scrollIntoView({behavior:"smooth"});
}

$("rewardJump").addEventListener("click", rewards);

render();
update();

if ("serviceWorker" in navigator &&
    location.protocol.startsWith("http")) {
  addEventListener("load", () =>
    navigator.serviceWorker.register("./sw.js").catch(console.error)
  );
}

console.log("SNAP KITCHEN NEW APP LOADED");
