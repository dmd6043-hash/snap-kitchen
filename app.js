const products=[
 {name:"Veg Momos",price:60,category:"Momos",emoji:"🥟",desc:"Steamed · 6 pieces"},
 {name:"Paneer Momos",price:80,category:"Momos",emoji:"🥟",desc:"Soft & flavourful"},
 {name:"Snap Momo",price:99,category:"Momos",emoji:"🥟",desc:"Our special pick"},
 {name:"Soya Chilli",price:60,category:"Starters",emoji:"🍢",desc:"Spicy & delicious"},
 {name:"Paneer Roll",price:70,category:"Rolls",emoji:"🌯",desc:"Freshly prepared"},
 {name:"French Fries",price:40,category:"Sides",emoji:"🍟",desc:"Crispy & salted"}
];
const categories=[["All","✦"],["Momos","🥟"],["Chaap","🍢"],["Rolls","🌯"],["Chinese","🥡"],["Combos","🍱"]];
let selected="All",cart=[];
const menu=document.querySelector("#menu"),cats=document.querySelector("#categories"),search=document.querySelector("#search");
function renderCats(){cats.innerHTML=categories.map(([name,emoji])=>`<button class="category ${selected===name?"active":""}" data-cat="${name}"><span class="bubble">${emoji}</span>${name}</button>`).join("");cats.querySelectorAll("button").forEach(b=>b.onclick=()=>{selected=b.dataset.cat;renderCats();renderMenu()})}
function renderMenu(){const q=search.value.toLowerCase();const list=products.filter(p=>(selected==="All"||p.category===selected||selected==="Chaap"&&p.name.includes("Soya"))&&p.name.toLowerCase().includes(q));menu.innerHTML=list.length?list.map(p=>`<article class="food-card"><div class="food-art">${p.emoji}</div><h3>${p.name}</h3><p>${p.desc}</p><div class="food-foot"><b>₹${p.price}</b><button class="add" data-name="${p.name}">+ Add</button></div></article>`).join(""):`<p>No matching items yet.</p>`;menu.querySelectorAll(".add").forEach(b=>b.onclick=()=>add(b.dataset.name))}
function add(name){const p=products.find(x=>x.name===name);const found=cart.find(x=>x.name===name);found?found.qty++:cart.push({...p,qty:1});updateCart();toast(`${name} added to cart`)}
function updateCart(){const count=cart.reduce((s,p)=>s+p.qty,0),total=cart.reduce((s,p)=>s+p.price*p.qty,0);document.querySelector("#cartBar").hidden=count===0;document.querySelector("#cartCount").textContent=`${count} item${count===1?"":"s"}`;document.querySelector("#cartTotal").textContent=`₹${total}`}
function toast(msg){const t=document.querySelector("#toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),1700)}
search.addEventListener("input",renderMenu);
document.querySelectorAll("#locationBtn,#profileBtn,#rewardsBtn,#rewardsNav,#ordersNav,#profileNav").forEach(b=>b.addEventListener("click",()=>toast("This screen will be connected in the next build step.")));
document.querySelector("#viewCart").onclick=()=>toast("Cart and checkout are the next screen to build.");
document.querySelector("#menuNav").onclick=()=>{document.querySelector("#menu").scrollIntoView({behavior:"smooth"});toast("Browse the menu")};
document.querySelectorAll("[data-category]").forEach(b=>b.onclick=()=>{selected=b.dataset.category;renderCats();renderMenu();document.querySelector("#menu").scrollIntoView({behavior:"smooth"})});
renderCats();renderMenu();
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));