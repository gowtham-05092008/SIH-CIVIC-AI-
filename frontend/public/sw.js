self.addEventListener("install", event => self.skipWaiting());
self.addEventListener("activate", event => self.clients.claim());
self.addEventListener("push", event => {
  const data = event.data ? event.data.json() : {title:"CivicConnect",body:"You have a civic update."};
  event.waitUntil(self.registration.showNotification(data.title,{body:data.body,icon:"/icon-192.png"}));
});
