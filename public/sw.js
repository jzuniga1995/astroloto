// Service Worker mínimo — solo habilita instalación PWA.
// Sin caché offline para garantizar datos frescos en cada visita.

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

// Sin handler de fetch — todas las peticiones van directo a la red.
