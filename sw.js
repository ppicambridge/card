// PPI Cambridge Card: keeps the card page available offline after the first visit.
// Only handles the card page itself plus its fonts and QR library. Everything else
// (the PPI server, partner list, registrations) always goes straight to the network.
const CACHE = 'ppi-card-v1';
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(
    ['./', 'icon-192.png', 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js']
      .map(u => c.add(u).catch(() => {}))
  )).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const u = new URL(e.request.url);
  const page = u.origin === location.origin && /\/card\/(index\.html|test\.html)?$/.test(u.pathname);
  const asset = u.href.indexOf('qrcode.min.js') > -1 || /fonts\.(googleapis|gstatic)\.com$/.test(u.hostname);
  if (!page && !asset) return;
  e.respondWith(fetch(e.request).then(r => {   // network first: members always get the newest page
    if (r.ok || r.type === 'opaque') { const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); }
    return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true })
    .then(m => m || (page ? caches.match('./', { ignoreSearch: true }) : undefined))));
});
