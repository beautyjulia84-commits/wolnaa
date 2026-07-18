/* WOLNAA Veranstalter PWA: absichtlich kein Offline-Cache für geschützte Daten. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));
