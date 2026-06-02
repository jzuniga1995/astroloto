// Service Worker mínimo — solo habilita instalación PWA.
// Sin caché offline para garantizar carga de anuncios y datos frescos.

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

// Sin handler de fetch — todas las peticiones van directo a la red.
