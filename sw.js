const CACHE = "zaikabox-v65-install-v3";
const FILES = ["./","./index.html","./styles.css","./app.js","./manifest.webmanifest","./zaikabox-final-icon-v2.svg"];
self.addEventListener("install",event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith("zaikabox-")&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",event=>{
 if(event.request.method!=="GET")return;
 event.respondWith(fetch(event.request).then(response=>{
  if(response.ok&&event.request.url.startsWith(self.location.origin)){const copy=response.clone();caches.open(CACHE).then(c=>c.put(event.request,copy));}
  return response;
 }).catch(()=>caches.match(event.request)));
});
