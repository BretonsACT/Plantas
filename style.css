// ws.js - Service Worker

const CACHE_NAME = 'plantas-cache-v2'; // Increment cache version
const ASSETS_TO_CACHE = [
    '/',
    'index.html',
    'style.css',
    'app.js',
    'manifest.json',
    'icons/icon-192x192.png',
    'icons/icon-512x512.png',
    'icons/favicon-16x16.png',
    'icons/favicon-32x32.png'
    // Add other critical assets like fonts if locally hosted
];

self.addEventListener('install', event => {
    console.log('Service Worker: Instalado');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Cacheando assets iniciales');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .catch(error => {
                console.error('Service Worker: Fallo al cachear assets iniciales', error);
            })
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    console.log('Service Worker: Activado');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Eliminando caché antigua:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    return self.clients.claim();
});

self.addEventListener('fetch', event => {
    // Estrategia: Network falling back to cache for API calls, Cache first for static assets
    const requestUrl = new URL(event.request.url);

    if (requestUrl.origin === location.origin && ASSETS_TO_CACHE.includes(requestUrl.pathname)) {
        // Cache first for static assets defined in ASSETS_TO_CACHE
        event.respondWith(
            caches.match(event.request)
                .then(cachedResponse => {
                    return cachedResponse || fetch(event.request).then(networkResponse => {
                        // Optionally cache new static assets if they weren't in the initial list
                        // but generally static assets are defined upfront.
                        return networkResponse;
                    });
                })
        );
    } else if (requestUrl.protocol === 'http:' || requestUrl.protocol === 'https:') {
        // Network first for other requests (like API calls)
        event.respondWith(
            fetch(event.request)
                .then(networkResponse => {
                    // Optionally cache API responses if appropriate for offline use
                    // For weather API, freshness is key, so caching might not be ideal
                    // or would need a short expiry.
                    return networkResponse;
                })
                .catch(() => {
                    // Fallback to cache if network fails and a cached response exists
                    return caches.match(event.request);
                })
        );
    }
    // For non-HTTP/HTTPS requests, or if no strategy matches, do default browser handling.
});


self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SCHEDULE_NOTIFICATION') {
        const { reminderDate, title, body, tag } = event.data.payload;
        const delay = new Date(reminderDate).getTime() - Date.now();

        if (delay > 0) {
            // console.log(`SW: Notificación programada para "${title}" con tag "${tag}" en ${Math.round(delay / 1000 / 60)} minutos.`);
            setTimeout(() => {
                self.registration.showNotification(title, {
                    body: body,
                    icon: 'icons/icon-192x192.png',
                    badge: 'icons/badge-72x72.png', // Make sure this icon exists if you use it
                    tag: tag, // Use the tag to allow replacement/closing
                    renotify: true, // If a notification with the same tag is shown again, re-alert the user
                    actions: [ // Example actions
                        // { action: 'open_app', title: 'Abrir App' },
                        // { action: 'dismiss', title: 'Descartar' }
                    ]
                });
            }, delay);
        } else {
            console.log(`SW: La fecha de recordatorio para "${title}" (tag: ${tag}) ya pasó.`);
            // Optionally, show immediately if it's very recently passed and still relevant
            // self.registration.showNotification(title, {
            //     body: body + " (Recordatorio programado para el pasado)",
            //     icon: 'icons/icon-192x192.png',
            //     tag: tag,
            //     renotify: true
            // });
        }
    }
});

// Optional: Handle notification clicks
self.addEventListener('notificationclick', event => {
    console.log('SW: Notificación clickeada. Tag:', event.notification.tag);
    event.notification.close(); // Close the notification

    // Example: Focus an existing window or open a new one
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
            for (let i = 0; i < clientList.length; i++) {
                let client = clientList[i];
                // Check if the client is the app, potentially by URL or more specific checks
                if (client.url === self.registration.scope && 'focus' in client) {
                    return client.focus();
                }
            }
            // If no window is found, open a new one
            if (self.clients.openWindow) {
                return self.clients.openWindow(self.registration.scope); // Opens the app's root URL
            }
        })
    );

    // Handle actions if defined
    // if (event.action === 'open_app') {
    //     self.clients.openWindow('/'); // Adjust URL as needed
    // } else if (event.action === 'dismiss') {
    //     // Notification is already closed by event.notification.close()
    // }
});