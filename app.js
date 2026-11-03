const menu=[
{id:1,n:"Veg Steam Momos",c:"Momos",p:30,d:"8 pieces • Fresh & soft",e:"🥟"},
{id:2,n:"Paneer Steam Momos",c:"Momos",p:50,d:"6 pieces • Paneer filling",e:"🥟"},
{id:3,n:"Veg Chilli Momos",c:"Chinese",p:60,d:"Spicy tossed momos",e:"🥡"},
{id:4,n:"Soya Chilli",c:"Chinese",p:40,d:"Half portion",e:"🍲"},
{id:5,n:"Paneer Chilli",c:"Chinese",p:60,d:"Half portion",e:"🍛"},
{id:6,n:"Soya Kathi Roll",c:"Rolls",p:40,d:"Desi street-style roll",e:"🌯"},
{id:7,n:"Paneer Kathi Roll",c:"Rolls",p:70,d:"Loaded paneer filling",e:"🌯"},
{id:8,n:"Peri Peri Fries",c:"Snacks",p:50,d:"Crispy & spicy",e:"🍟"},
{id:9,n:"Alu Tikki Chaat",c:"Snacks",p:30,d:"Tangy street-style chaat",e:"🥗"}];
let category="All",cart={};const $=id=>document.getElementById(id);
function render(){let q=$("search").value.toLowerCase();let list=menu.filter(x=>(category==="All"||x.c===category)&&(x.n+" "+x.d).toLowerCase().includes(q));$("products").innerHTML=list.map(x=>`<article class="product"><div class="art">${x.e}</div><div class="details"><h3>${x.n}</h3><p>${x.d}</p><div class="row"><span>₹${x.p}</span><button class="add" data-add="${x.id}">+ ADD</button></div></div></article>`).join("");$("empty").hidden=list.length>0}
function qty(){return Object.values(cart).reduce((a,b)=>a+b,0)}function total(){return menu.reduce((s,x)=>s+(cart[x.id]||0)*x.p,0)}
function update(){ $("count").textContent=qty();$("navCart").innerHTML=`🛒<small>Cart (${qty()})</small>`}
function openCart(){let chosen=menu.filter(x=>cart[x.id]);$("cartLines").innerHTML=chosen.length?chosen.map(x=>`<div class="cartline"><span>${x.n}<br><small>₹${x.p} each</small></span><span class="qty"><button data-minus="${x.id}">−</button> ${cart[x.id]} <button data-plus="${x.id}">+</button></span></div>`).join(""):"Your cart is empty."; $("total").textContent="₹"+total();$("shade").classList.add("show")}
function toast(t){$("toast").textContent=t;$("toast").classList.add("show");setTimeout(()=>$("toast").classList.remove("show"),1500)}
$("cats").addEventListener("click",e=>{let b=e.target.closest("[data-cat]");if(!b)return;category=b.dataset.cat;document.querySelectorAll("[data-cat]").forEach(x=>x.classList.toggle("active",x===b));render()});
$("search").addEventListener("input",render);$("products").addEventListener("click",e=>{let b=e.target.closest("[data-add]");if(!b)return;let id=+b.dataset.add;cart[id]=(cart[id]||0)+1;update();toast("Added to cart!")});
["openCart","navCart","viewCart"].forEach(id=>$(id).addEventListener("click",openCart));$("close").addEventListener("click",()=>$("shade").classList.remove("show"));$("shade").addEventListener("click",e=>{if(e.target===$("shade"))$("shade").classList.remove("show")});
$("cartLines").addEventListener("click",e=>{let p=e.target.closest("[data-plus]"),m=e.target.closest("[data-minus]");if(p)cart[+p.dataset.plus]++;if(m){let id=+m.dataset.minus;cart[id]--;if(cart[id]<=0)delete cart[id]}update();openCart()});
$("checkout").addEventListener("click",()=>toast("Checkout will be connected in the next build."));function rewards(){$("rewards").scrollIntoView({behavior:"smooth"})}$("rewardJump").addEventListener("click",rewards);render();update();
if("serviceWorker"in navigator&&location.protocol.startsWith("http"))addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));