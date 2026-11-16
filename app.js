
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<meta name="theme-color" content="#09070f">
<meta name="description" content="ZaikaBox - Har Craving Ka Apna Box!">
<title>ZaikaBox | Food Delivery</title>

<link rel="manifest" href="manifest.webmanifest">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Outfit:wght@500;600;700;800;900&display=swap" rel="stylesheet">

<style>
:root {
  --bg:#09070f;
  --surface:#15111f;
  --surface2:#20182e;
  --purple:#9b5cff;
  --violet:#7138d8;
  --orange:#ff914d;
  --white:#fff;
  --muted:#aaa0b9;
  --border:rgba(255,255,255,.09);
}
* {box-sizing:border-box}
html {scroll-behavior:smooth;background:var(--bg)}
body {
  margin:0;min-height:100vh;padding-bottom:95px;
  background:
    radial-gradient(ellipse at 10% 0%,rgba(111,48,180,.16),transparent 35%),
    radial-gradient(ellipse at 100% 35%,rgba(255,116,54,.07),transparent 30%),
    var(--bg);
  color:var(--white);font-family:'DM Sans',sans-serif;
}
[hidden] {display:none !important}
button,input,textarea,select {font:inherit}
button {cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
button:active {transform:scale(.97)}
header {
  position:sticky;top:0;z-index:20;display:flex;align-items:center;
  justify-content:space-between;padding:13px 5%;
  background:rgba(9,7,15,.92);backdrop-filter:blur(18px);
  border-bottom:1px solid var(--border);
}
.brand {display:flex;align-items:center;gap:11px;color:white;text-decoration:none}
.logo {
  width:46px;height:46px;display:grid;place-items:center;border-radius:15px;
  background:linear-gradient(140deg,#c18aff,#7138d8 65%,#ff914d);
  color:#fff;font-family:Outfit,sans-serif;font-size:19px;font-weight:900;
  box-shadow:0 5px 24px #8b4be755;
}
.brand strong {display:block;font-family:Outfit,sans-serif;font-size:21px;letter-spacing:.5px;line-height:1.1}
.brand small {display:block;margin-top:4px;color:var(--orange);font-size:9px;font-weight:800;letter-spacing:1.4px}
#openCart {
  border:1px solid #a66aff55;border-radius:14px;padding:11px 15px;
  background:linear-gradient(135deg,#26183a,#171020);color:white;
  font-weight:800;box-shadow:0 5px 18px #0005;
}
main {width:min(1100px,92%);margin:auto}
section {margin:30px 0}
h1,h2,h3 {font-family:Outfit,sans-serif}
.eyebrow {color:#c49aff;font-size:10px;font-weight:800;letter-spacing:2px}
.hero {
  position:relative;display:flex;align-items:center;justify-content:space-between;
  gap:15px;min-height:245px;margin-top:20px;padding:27px 23px;overflow:hidden;
  border:1px solid #a56aff35;border-radius:25px;
  background:
    radial-gradient(circle at 82% 40%,#a75bff42,transparent 36%),
    radial-gradient(circle at 100% 100%,#ff914d30,transparent 35%),
    linear-gradient(125deg,#28153f,#140e20 60%,#241331);
  box-shadow:0 15px 45px #0005;
}
.hero:after {
  content:"";position:absolute;width:190px;height:190px;right:-80px;top:-90px;
  border:1px solid #ffffff18;border-radius:50%;
  box-shadow:0 0 0 22px #ffffff08,0 0 0 45px #ffffff05;
}
.hero > div:first-child {position:relative;z-index:1;max-width:70%}
.hero label {color:#ffb47f;font-size:10px;font-weight:800;letter-spacing:1.6px}
.hero .eyebrow {margin:12px 0 0;color:#c6a1ff}
.hero h1 {margin:10px 0;font-size:clamp(36px,7vw,62px);line-height:1;letter-spacing:-1.5px}
.hero h1 em {color:var(--orange);font-style:normal}
.hero p:not(.eyebrow) {color:#d0c5dc;font-size:13px;line-height:1.6}
.food {
  position:relative;z-index:1;flex-shrink:0;width:125px;height:125px;
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  border:1px solid #ffffff25;border-radius:50%;
  background:linear-gradient(145deg,#ffffff1c,#ffffff08);
  font-size:65px;box-shadow:0 0 40px #a75bff35,inset 0 0 25px #ffffff0a;
}
.food small {margin-top:-2px;color:#ffc18f;font-size:9px;font-weight:800;letter-spacing:2px}
.btn {
  display:inline-block;border:0;border-radius:13px;padding:13px 18px;
  background:linear-gradient(110deg,#c69aff,#9250ef 65%,#ff914d);
  color:#160d20;font-weight:900;text-decoration:none;box-shadow:0 7px 20px #8e4ce744;
}
.info {display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin:16px 0 35px}
.info span {
  min-width:0;padding:14px 9px;border:1px solid var(--border);border-radius:15px;
  background:linear-gradient(145deg,#1d1629,#120e19);font-size:12px;font-weight:800;text-align:center;
}
.info small {display:block;margin-top:5px;color:var(--muted);font-size:9px;font-weight:500}
h2 {margin:7px 0 15px;font-size:27px;letter-spacing:-.5px}
#restaurants > p:not(.eyebrow) {color:var(--muted);font-size:13px}
#restaurantStatus {padding:12px 0;color:var(--muted);font-size:13px}
.restaurant-grid {display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px;margin-top:15px}
.restaurant-card {
  width:100%;min-width:0;min-height:175px;padding:17px;
  border:1px solid #a66aff30;border-radius:19px;
  background:radial-gradient(circle at 100% 0%,#a75bff1c,transparent 50%),linear-gradient(145deg,#21172f,#15101e);
  color:white;text-align:left;box-shadow:0 8px 22px #0003;
}
.restaurant-card:active {border-color:var(--orange)}
.restaurant-emoji {margin-bottom:10px;font-size:37px}
.restaurant-card h3 {margin:5px 0;font-size:18px}
.restaurant-card p {margin:6px 0;color:var(--muted);font-size:11px}
.veg-label {
  display:inline-block;margin-top:8px;padding:5px 9px;border:1px solid #7de69b66;
  border-radius:20px;color:#9af0ad;font-size:9px;font-weight:800;
}
#backRestaurants {
  margin-bottom:15px;padding:11px 15px;border:1px solid #a66aff66;
  border-radius:12px;background:#21152f;color:white;
}
#search {
  width:100%;margin:5px 0 14px;padding:15px;border:1px solid var(--border);
  border-radius:13px;outline:none;background:#17111f;color:white;font-size:14px;
}
#search:focus {border-color:var(--purple);box-shadow:0 0 0 3px #9b5cff20}
.cats {display:flex;gap:9px;overflow-x:auto;padding:2px 0 12px;scrollbar-width:none}
.cats::-webkit-scrollbar {display:none}
.cats button {
  flex-shrink:0;padding:10px 15px;border:1px solid var(--border);
  border-radius:30px;background:#1b1425;color:#e9e0f1;font-size:12px;font-weight:700;
}
.cats button.active {border-color:transparent;background:linear-gradient(100deg,#9b5cff,#7138d8);color:white;box-shadow:0 5px 16px #8c4ce744}
.products {display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px;margin-top:13px}
.product-card {min-width:0;overflow:hidden;border:1px solid var(--border);border-radius:17px;background:linear-gradient(145deg,#21182d,#15101d);box-shadow:0 7px 20px #0003}
.product-emoji {padding:19px 10px;background:radial-gradient(circle at 50% 40%,#a75bff35,transparent 65%),linear-gradient(135deg,#302044,#1b1426);font-size:43px;text-align:center}
.product-info {padding:12px 12px 5px}
.product-info h3 {margin:0 0 6px;font-size:16px}
.product-info p {min-height:18px;margin:0;color:var(--muted);font-size:11px}
.product-info strong {font-weight:900}
.add-button {margin:10px 12px 13px;padding:9px 14px;border:0;border-radius:9px;background:linear-gradient(110deg,#a96aff,#783cdb);color:white;font-size:12px;font-weight:800}
#empty {color:var(--muted);text-align:center}
.promo,.reward,.offer {border:1px solid #a66aff30;border-radius:20px;background:radial-gradient(circle at 100% 0%,#a75bff20,transparent 50%),linear-gradient(130deg,#251637,#17101f)}
.promo {display:flex;align-items:center;justify-content:space-between;gap:12px;padding:21px}
.promo label {color:var(--orange);font-size:11px;font-weight:900;letter-spacing:1px}
.promo h2 {font-size:25px}
.promo p,.reward p {color:var(--muted);font-size:12px;line-height:1.6}
.seal {flex-shrink:0;width:88px;height:88px;display:grid;place-items:center;align-content:center;border:2px dashed #c69bff;border-radius:50%;color:var(--orange);font-size:23px;text-align:center}
.seal b {font-size:10px;line-height:1.3}
.outline {padding:10px 14px;border:1px solid #c69bff;border-radius:11px;background:#ffffff08;color:white;font-size:12px;font-weight:800}
.reward {padding:18px}
.reward h3 {margin:10px 0 15px;font-size:18px}
.reward h3 b {color:var(--orange)}
.stamps {display:flex;flex-wrap:wrap;gap:8px}
.stamps i {width:36px;height:36px;display:grid;place-items:center;border:1px dashed #b68aff;border-radius:50%;background:#ffffff0b;color:#e4d2ff;font-size:12px;font-style:normal}
.offer {display:flex;align-items:center;gap:12px;margin-top:12px;padding:16px}
.offer small {display:block;margin-top:4px;color:var(--muted);font-size:11px}
.last {display:flex;align-items:center;justify-content:space-between;gap:12px;padding:20px 0}
.last h2 {font-size:23px}

/* ORDER TRACKING */
#trackOrder {scroll-margin-top:85px}
.tracking-form {
  padding:18px;border:1px solid #a66aff35;border-radius:19px;
  background:radial-gradient(circle at 100% 0%,#a75bff18,transparent 45%),linear-gradient(145deg,#21172f,#15101e);
  box-shadow:0 8px 22px #0003;
}
.tracking-form label {display:block;margin:14px 0 7px;color:#e8d9fa;font-size:13px;font-weight:700}
.tracking-form input {
  display:block;width:100%;min-height:49px;padding:13px;border:1px solid #ffffff25;
  border-radius:11px;outline:none;background:#100b18;color:white;font-size:16px;
}
.tracking-form input:focus {border-color:var(--purple);box-shadow:0 0 0 3px #9b5cff20}
.tracking-form button {width:100%;margin-top:17px}
.tracking-help {margin-top:12px;color:var(--muted);font-size:11px;line-height:1.6}
#trackingResult {margin-top:16px;padding:18px;border:1px solid #a66aff45;border-radius:17px;background:#1d1529}
.tracking-status {margin-top:13px;padding:14px;border:1px solid #a66aff35;border-radius:12px;background:#302044;color:#d7baff;font-weight:800}
.tracking-step {position:relative;padding:12px 10px;border-bottom:1px solid var(--border);color:#81788e;font-size:13px}
.tracking-step.active {color:#9af0ad;font-weight:800}
.tracking-order-items {margin-top:12px;color:#ded3e8;font-size:12px;line-height:1.8}

/* BOTTOM NAV */
nav {
  position:fixed;z-index:30;right:0;bottom:0;left:0;display:flex;
  align-items:center;justify-content:space-around;padding:11px 3% calc(11px + env(safe-area-inset-bottom));
  border-top:1px solid #ffffff14;background:rgba(17,12,25,.96);backdrop-filter:blur(18px);
}
nav a,nav button {min-width:45px;border:0;background:none;color:#cfc3dc;text-align:center;text-decoration:none;font-size:19px}
nav small {display:block;margin-top:4px;font-size:9px}

/* CART */
.shade {position:fixed;z-index:50;inset:0;display:none;align-items:flex-end;justify-content:center;background:#000b;backdrop-filter:blur(4px)}
.shade.show {display:flex}
.sheet {width:min(550px,100%);max-height:88vh;overflow-y:auto;padding:24px;border:1px solid #a66aff35;border-bottom:0;border-radius:25px 25px 0 0;background:linear-gradient(145deg,#241832,#120d1b);box-shadow:0 -15px 50px #0008;overscroll-behavior:contain}
.close {float:right;padding:10px 12px;border:1px solid var(--border);border-radius:10px;background:#ffffff10;color:white}
#cartLines {color:#e6dcef;font-size:14px;line-height:1.8}
.sheet h3 {padding-top:10px}
#total {color:var(--orange)}
#checkout {width:100%;text-align:center}
#toast {position:fixed;z-index:100;bottom:100px;left:50%;display:none;max-width:90%;padding:12px 18px;transform:translateX(-50%);border:1px solid #ffffff20;border-radius:12px;background:linear-gradient(110deg,#8e4be8,#5524a8);color:white;font-size:13px;font-weight:700;box-shadow:0 8px 25px #0008;text-align:center}
#toast.show {display:block}

/* CHECKOUT */
#checkoutForm {display:block;width:100%;margin-top:22px;padding:16px;border:1px solid var(--border);border-radius:16px;background:#1d1529;scroll-margin-top:20px}
#checkoutForm h3 {margin-top:0}
#checkoutForm label {display:block;margin:14px 0 7px;color:#e8d9fa;font-size:13px;font-weight:700}
#checkoutForm input,#checkoutForm textarea,#checkoutForm select {display:block;width:100%;min-height:48px;padding:13px;border:1px solid #ffffff25;border-radius:11px;outline:none;background:#100b18;color:white;font-size:16px}
#checkoutForm textarea {min-height:90px}
#checkoutForm button {display:block;width:100%;min-height:50px;margin-top:14px;padding:13px 16px;border:0;border-radius:12px;background:linear-gradient(110deg,#c69aff,#9250ef 65%,#ff914d);color:#160d20;font-size:15px;font-weight:900}
#checkoutForm button:disabled {opacity:.6;cursor:wait}
@media(min-width:700px) {
  .products {grid-template-columns:repeat(3,minmax(0,1fr))}
  .restaurant-grid {grid-template-columns:repeat(3,minmax(0,1fr))}
  .hero {min-height:290px;padding:40px}
}
@media(max-width:480px) {
  .hero {min-height:210px;padding:21px 16px}
  .hero > div:first-child {max-width:72%}
  .hero h1 {font-size:37px}
  .food {width:90px;height:90px;font-size:47px}
  .info span {padding:12px 5px;font-size:10px}
  .info small {font-size:8px}
  .restaurant-card {padding:14px}
  .restaurant-card h3 {font-size:16px}
  .promo {padding:16px}
  .promo h2 {font-size:22px}
  .seal {width:72px;height:72px}
  .last {align-items:flex-start;flex-direction:column}
}
</style>
</head>

<body>
<header>
  <a class="brand" href="#">
    <b class="logo">ZB</b>
    <span>
      <strong>ZAIKABOX</strong>
      <small>HAR CRAVING KA APNA BOX!</small>
    </span>
  </a>
  <button id="openCart">🛒 <b id="count">0</b></button>
</header>

<main>
  <section class="hero">
    <div>
      <label>✦ FOOD • MOOD • MAGIC</label>
      <p class="eyebrow">JAGDALPUR, GET READY!</p>
      <h1>Good food.<br><em>Good mood.</em></h1>
      <p>Your favourite food, from your favourite places.</p>
      <a class="btn" href="#restaurants">Explore restaurants ↗</a>
    </div>
    <div class="food">🍔<small>YUMMY!</small></div>
  </section>

  <div class="info">
    <span>🍽️ <b>Local food</b><small>Discover favourites</small></span>
    <span>🛵 <b>Home delivery</b><small>Order from home</small></span>
    <span>💜 <b>Made with love</b><small>For every craving</small></span>
  </div>

  <section id="restaurants">
    <p class="eyebrow">DISCOVER JAGDALPUR</p>
    <h2>Choose your restaurant</h2>
    <p>Your city. Your food. Your favourites. 💜</p>
    <div id="restaurantStatus">Loading restaurants...</div>
    <div id="restaurantGrid" class="restaurant-grid"></div>
  </section>

  <section id="menu" hidden>
    <button id="backRestaurants">← All Restaurants</button>
    <p class="eyebrow">EXPLORE THE MENU</p>
    <h2 id="selectedRestaurantName">Restaurant Menu</h2>
    <input id="search" placeholder="Search momos, rolls, fries...">
    <div class="cats" id="cats">
      <button class="active" data-cat="All">✨ All</button>
      <button data-cat="Momos">🥟 Momos</button>
      <button data-cat="Chinese">🍜 Chinese</button>
      <button data-cat="Rolls">🌯 Rolls</button>
      <button data-cat="Snacks">🍟 Snacks</button>
    </div>
    <div id="products" class="products"></div>
    <p id="empty" hidden>No items found.</p>
  </section>

  <section id="trackOrder">
    <p class="eyebrow">ORDER UPDATES</p>
    <h2>Track your order</h2>
    <p style="color:var(--muted);font-size:13px;line-height:1.6;">
      Apna Order ID aur secret Tracking Code daalkar order status dekhein.
    </p>
    <div class="tracking-form">
      <label for="trackingOrderId">Order ID</label>
      <input id="trackingOrderId" type="text" placeholder="Enter your Order ID" autocomplete="off">
      <label for="trackingCode">Tracking Code</label>
      <input id="trackingCode" type="text" placeholder="Enter your Tracking Code" autocomplete="off">
      <button class="btn" id="trackOrderBtn" type="button">Track Order →</button>
      <p class="tracking-help">
        Order ID aur Tracking Code order place hone ke baad milenge.
        Tracking Code ko kisi ke saath share na karein.
      </p>
    </div>
    <div id="trackingResult" hidden></div>
  </section>

  <section class="promo">
    <div>
      <label>💜 ZAIKABOX REWARDS</label>
      <h2>Every order<br>brings a surprise.</h2>
      <p>Order, collect stamps and unlock exciting rewards.</p>
      <button class="outline" id="rewardJump">View rewards ↗</button>
    </div>
    <div class="seal">✦<b>ZAIKA<br>REWARDS</b>♡</div>
  </section>

  <section id="rewards">
    <p class="eyebrow">A LITTLE EXTRA LOVE</p>
    <h2>Your rewards</h2>
    <div class="reward">
      <small>YOUR STAMP CARD</small>
      <h3>Order & Collect <b>0 / 6</b></h3>
      <div class="stamps">
        <i>1</i><i>2</i><i>3</i><i>4</i><i>5</i><i>6</i>
      </div>
      <p>Rewards will be managed by ZaikaBox.</p>
    </div>
    <div class="offer">
      🎁
      <span><b>Offers & updates</b><small>Exciting deals coming soon.</small></span>
      →
    </div>
  </section>

  <section class="last">
    <div>
      <p class="eyebrow">READY WHEN YOU ARE</p>
      <h2>Your next favourite<br>is one tap away.</h2>
    </div>
    <button class="btn" id="viewCart">View cart →</button>
  </section>
</main>

<nav>
  <a href="#">⌂<small>Home</small></a>
  <a href="#restaurants">▦<small>Explore</small></a>
  <a href="#trackOrder">📦<small>Track</small></a>
  <a href="#rewards">✦<small>Rewards</small></a>
  <button id="navCart">🛒<small>Cart</small></button>
</nav>

<div class="shade" id="shade">
  <div class="sheet">
    <button class="close" id="close">✕</button>
    <p class="eyebrow">YOUR SELECTION</p>
    <h2>Your cart</h2>
    <div id="cartLines">Your cart is empty.</div>
    <h3>Total: <b id="total">₹0</b></h3>
    <button class="btn" id="checkout">Continue →</button>
    <small>Review your items and enter your order details.</small>
  </div>
</div>

<div id="toast"></div>

<script type="module" src="app.js?v=202"></script>
</body>
</html>
