// Telepítés esemény
self.addEventListener('install', (e) => {
  console.log('[Service Worker] Telepítve');
  self.skipWaiting();
});

// Aktiválás esemény
self.addEventListener('activate', (e) => {
  console.log('[Service Worker] Aktiválva');
  return self.clients.claim();
});

// A PWA telepítéséhez kötelező egy 'fetch' eseményfigyelő
self.addEventListener('fetch', (e) => {
  // Jelenleg mindent átengedünk a webre, de a PWA követelményt ezzel kipipáltuk
});
