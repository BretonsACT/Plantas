// Contenido básico para sw.js

self.addEventListener('install', event => {
    console.log('Service Worker: Instalado');
    // Opcional: Precaching de assets básicos
    // event.waitUntil(
    //   caches.open('plantas-cache-v1').then(cache => {
    //     return cache.addAll([
    //       '/',
    //       'index.html',
    //       'style.css',
    //       'app.js',
    //       'manifest.json',
    //       'icons/icon-192x192.png' // Añade tus iconos aquí
    //       // Añade otros assets importantes aquí
    //     ]);
    //   })
    // );
    self.skipWaiting(); // Fuerza al nuevo SW a activarse inmediatamente
});

self.addEventListener('activate', event => {
    console.log('Service Worker: Activado');
    // Opcional: Limpiar cachés antiguas
    // event.waitUntil(
    //   caches.keys().then(cacheNames => {
    //     return Promise.all(
    //       cacheNames.map(cacheName => {
    //         if (cacheName !== 'plantas-cache-v1') { // Asegúrate que coincida con el nombre de tu caché actual
    //           return caches.delete(cacheName);
    //         }
    //       })
    //     );
    //   })
    // );
    return self.clients.claim(); // Permite que el SW controle clientes abiertos inmediatamente
});

self.addEventListener('fetch', event => {
    console.log('Service Worker: Fetching', event.request.url);
    // Estrategia Cache-First (ejemplo, puedes cambiarla)
    // event.respondWith(
    //   caches.match(event.request).then(response => {
    //     return response || fetch(event.request);
    //   })
    // );
});

// Para las notificaciones programadas desde app.js
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SCHEDULE_NOTIFICATION') {
        const { reminderDate, title, body } = event.data.payload;
        const delay = new Date(reminderDate).getTime() - Date.now();

        if (delay > 0) {
            console.log(`SW: Notificación programada para "${title}" en ${delay / 1000 / 60} minutos.`);
            setTimeout(() => {
                self.registration.showNotification(title, {
                    body: body,
                    icon: 'icons/icon-192x192.png', // Asegúrate que este icono exista
                    badge: 'icons/badge-72x72.png', // Opcional, asegúrate que exista
                    tag: event.data.payload.tag
                });
            }, delay);
        } else {
            console.log(`SW: La fecha de recordatorio para "${title}" ya pasó.`);
            // Opcionalmente, mostrarla inmediatamente si aún es relevante
            // self.registration.showNotification(title, {
            //     body: body + " (Recordatorio pasado)",
            //     icon: 'icons/icon-192x192.png'
            // });
        }
    }
});
